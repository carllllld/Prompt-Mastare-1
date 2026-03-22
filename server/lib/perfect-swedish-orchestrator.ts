import { SmartGenerationEngine, GenerationResult } from './perfect-swedish-generator';
import { DeterministicPostProcessor, PostProcessResult } from './perfect-swedish-post-processor';
import { ExpertAIAnalyzer, ExpertAnalysis } from './perfect-swedish-analyzer';
import { PerfectSwedishFallback, FallbackResult } from './perfect-swedish-fallback';
import { WritingStyle } from './text-rules';
import pRetry, { AbortError } from 'p-retry';
import * as Sentry from '@sentry/node';

export interface PipelineRequest {
  disposition: any;
  style: WritingStyle;
  platform: string;
  personalStylePrompt?: string;
  targetWordMin: number;
  targetWordMax: number;
  userId: string;
  sessionId: string;
}

export interface PipelineResult {
  improvedPrompt: string;
  headline: string;
  socialCopy: string;
  instagramCaption: string;
  showingInvitation: string;
  shortAd: string;
  expertAnalysis?: ExpertAnalysis;
  metrics: PipelineMetrics;
}

export interface PipelineMetrics {
  totalDuration: number;
  step1Duration?: number;
  step2Duration?: number;
  step3Duration?: number;
  retryCount: number;
  success: boolean;
  errorType?: string;
  timestamp: Date;
}

// WebSocket event emitter type (will be injected)
export type ProgressEmitter = (sessionId: string, event: ProgressEvent) => void;

export interface ProgressEvent {
  type: 'progress' | 'completion';
  step?: 'smart_generation' | 'post_processing' | 'expert_analysis';
  progress?: number;
  message: string;
  timestamp: Date;
}

export class PerfectSwedishOrchestrator {
  private smartGenerator: SmartGenerationEngine;
  private postProcessor: DeterministicPostProcessor;
  private expertAnalyzer: ExpertAIAnalyzer;
  private fallbackGenerator: PerfectSwedishFallback;
  private progressEmitter?: ProgressEmitter;

  constructor(progressEmitter?: ProgressEmitter) {
    this.smartGenerator = new SmartGenerationEngine();
    this.postProcessor = new DeterministicPostProcessor();
    this.expertAnalyzer = new ExpertAIAnalyzer();
    this.fallbackGenerator = new PerfectSwedishFallback();
    this.progressEmitter = progressEmitter;
  }

  async execute(request: PipelineRequest): Promise<PipelineResult> {
    const startTime = Date.now();
    let retryCount = 0;

    try {
      // Execute the 3-step pipeline with retry logic
      const result = await pRetry(
        async () => {
          return await this.executeNewPipeline(request);
        },
        {
          retries: 2,
          onFailedAttempt: (context: any) => {
            // p-retry v6: onFailedAttempt receives {error, attemptNumber, retriesLeft, retriesConsumed}
            const originalError = context.error ?? context;
            const attemptNumber = context.attemptNumber ?? 1;
            retryCount = attemptNumber;
            const errMsg = originalError instanceof Error ? originalError.message : String(originalError);
            console.log(`Pipeline attempt ${attemptNumber} failed:`, errMsg);
            
            // Log retry to Sentry
            Sentry.captureMessage('Pipeline retry attempt', {
              level: 'warning',
              tags: {
                component: 'perfect-swedish-orchestrator',
                pipeline_step: 'retry',
                attempt: attemptNumber.toString()
              },
              extra: {
                userId: request.userId,
                sessionId: request.sessionId,
                errorMessage: errMsg,
                retryable: this.isRetryableError(originalError)
              }
            });
            
            // Use AbortError to stop retrying on non-retryable errors
            if (!this.isRetryableError(originalError)) {
              throw new AbortError(originalError instanceof Error ? originalError : new Error(errMsg));
            }
          },
          minTimeout: 1000, // 1 second
          maxTimeout: 4000, // 4 seconds
          factor: 2 // Exponential backoff
        }
      );

      const totalDuration = Date.now() - startTime;

      return {
        ...result,
        metrics: {
          ...result.metrics,
          totalDuration,
          retryCount,
          success: true,
          timestamp: new Date()
        }
      };
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      
      // Check if this is a non-retryable error (AbortError from p-retry)
      const isAbortError = error instanceof AbortError;
      const isNonRetryable = isAbortError || !this.isRetryableError(error);
      
      console.error('Pipeline execution failed after all retries:', {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        retryCount,
        duration: totalDuration,
        isNonRetryable,
        userId: request.userId,
        sessionId: request.sessionId,
        style: request.style,
        platform: request.platform
      });

      // For non-retryable errors (like invalid API key), throw immediately without fallback
      if (isNonRetryable) {
        Sentry.captureException(error, {
          level: 'error',
          tags: {
            component: 'perfect-swedish-orchestrator',
            pipeline_step: 'execute',
            error_type: 'non_retryable',
            style: request.style,
            platform: request.platform
          },
          extra: {
            userId: request.userId,
            sessionId: request.sessionId,
            retryCount,
            totalDuration
          }
        });
        
        throw new Error(
          'Textgenerering misslyckades: ' + 
          (error instanceof Error ? error.message : String(error))
        );
      }

      // For retryable errors that exhausted retries, activate emergency fallback
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          component: 'perfect-swedish-orchestrator',
          pipeline_step: 'execute',
          fallback_triggered: 'true',
          style: request.style,
          platform: request.platform
        },
        extra: {
          userId: request.userId,
          sessionId: request.sessionId,
          retryCount,
          totalDuration,
          targetWordMin: request.targetWordMin,
          targetWordMax: request.targetWordMax,
          hasPersonalStyle: !!request.personalStylePrompt
        }
      });

      // Activate emergency fallback
      try {
        const fallbackResult = this.fallbackGenerator.generate({
          disposition: request.disposition,
          style: request.style,
          platform: request.platform,
          userId: request.userId,
          sessionId: request.sessionId,
          originalError: error instanceof Error ? error : new Error(String(error))
        });

        // Convert FallbackResult to PipelineResult format
        return {
          improvedPrompt: fallbackResult.improvedPrompt,
          headline: fallbackResult.headline,
          socialCopy: fallbackResult.socialCopy,
          instagramCaption: fallbackResult.instagramCaption,
          showingInvitation: fallbackResult.showingInvitation,
          shortAd: fallbackResult.shortAd,
          expertAnalysis: undefined, // No expert analysis in fallback
          metrics: {
            totalDuration: Date.now() - startTime,
            retryCount,
            success: true, // Fallback succeeded
            errorType: 'pipeline_failure_fallback_activated',
            timestamp: new Date()
          }
        };
      } catch (fallbackError) {
        // Even fallback failed - this is critical
        console.error('Emergency fallback also failed:', fallbackError);
        
        Sentry.captureException(fallbackError, {
          level: 'fatal',
          tags: {
            component: 'perfect-swedish-orchestrator',
            pipeline_step: 'fallback',
            fallback_failed: 'true'
          },
          extra: {
            userId: request.userId,
            sessionId: request.sessionId,
            originalError: error instanceof Error ? error.message : String(error),
            fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          }
        });

        // Re-throw with user-friendly message
        throw new Error(
          'Textgenerering misslyckades och reservsystemet kunde inte aktiveras. ' +
          'Kontakta support omedelbart.'
        );
      }
    }
  }

  private async executeNewPipeline(request: PipelineRequest): Promise<PipelineResult> {
    // Step 1: Smart Generation
    this.emitProgress(request.sessionId, {
      type: 'progress',
      step: 'smart_generation',
      progress: 0,
      message: 'Genererar text med AI...',
      timestamp: new Date()
    });

    let generationResult: GenerationResult;
    try {
      generationResult = await this.smartGenerator.generate({
        disposition: request.disposition,
        style: request.style,
        platform: request.platform,
        personalStylePrompt: request.personalStylePrompt,
        targetWordMin: request.targetWordMin,
        targetWordMax: request.targetWordMax
      });
    } catch (error) {
      // Capture generation error in Sentry
      Sentry.captureException(error, {
        tags: {
          component: 'perfect-swedish-orchestrator',
          pipeline_step: 'smart_generation',
          step_number: '1'
        },
        extra: {
          userId: request.userId,
          sessionId: request.sessionId,
          style: request.style,
          platform: request.platform
        }
      });
      throw error; // Re-throw to trigger retry logic
    }

    this.emitProgress(request.sessionId, {
      type: 'progress',
      step: 'smart_generation',
      progress: 100,
      message: 'Text genererad',
      timestamp: new Date()
    });

    // Step 2: Post-Processing
    this.emitProgress(request.sessionId, {
      type: 'progress',
      step: 'post_processing',
      progress: 0,
      message: 'Bearbetar text...',
      timestamp: new Date()
    });

    let postProcessResult: PostProcessResult;
    try {
      postProcessResult = await this.postProcessor.process({
        ...generationResult,
        disposition: request.disposition,
        style: request.style,
        platform: request.platform
      });
    } catch (error) {
      // Graceful degradation: continue with unprocessed text
      console.error('Post-processing failed, continuing with unprocessed text:', error);
      
      Sentry.captureException(error, {
        level: 'warning',
        tags: {
          component: 'perfect-swedish-orchestrator',
          pipeline_step: 'post_processing',
          step_number: '2',
          graceful_degradation: 'true'
        },
        extra: {
          userId: request.userId,
          sessionId: request.sessionId,
          generationId: generationResult.duration
        }
      });
      
      postProcessResult = {
        ...generationResult,
        transformations: [],
        duration: 0
      };
    }

    this.emitProgress(request.sessionId, {
      type: 'progress',
      step: 'post_processing',
      progress: 100,
      message: 'Text bearbetad',
      timestamp: new Date()
    });

    // Step 3: Expert Analysis
    this.emitProgress(request.sessionId, {
      type: 'progress',
      step: 'expert_analysis',
      progress: 0,
      message: 'Analyserar kvalitet...',
      timestamp: new Date()
    });

    let expertAnalysis: ExpertAnalysis | undefined;
    try {
      expertAnalysis = await this.expertAnalyzer.analyze({
        improvedPrompt: postProcessResult.improvedPrompt,
        headline: postProcessResult.headline,
        socialCopy: postProcessResult.socialCopy,
        instagramCaption: postProcessResult.instagramCaption,
        showingInvitation: postProcessResult.showingInvitation,
        shortAd: postProcessResult.shortAd,
        disposition: request.disposition,
        style: request.style,
        platform: request.platform
      });
    } catch (error) {
      // Graceful degradation: continue without analysis
      console.error('Expert analysis failed, continuing without analysis:', error);
      
      Sentry.captureException(error, {
        level: 'warning',
        tags: {
          component: 'perfect-swedish-orchestrator',
          pipeline_step: 'expert_analysis',
          step_number: '3',
          graceful_degradation: 'true'
        },
        extra: {
          userId: request.userId,
          sessionId: request.sessionId,
          textLength: postProcessResult.socialCopy?.length || 0
        }
      });
      
      expertAnalysis = undefined;
    }

    this.emitProgress(request.sessionId, {
      type: 'progress',
      step: 'expert_analysis',
      progress: 100,
      message: 'Analys klar',
      timestamp: new Date()
    });

    // Emit completion event
    this.emitProgress(request.sessionId, {
      type: 'completion',
      message: 'Pipeline klar',
      timestamp: new Date()
    });

    return {
      improvedPrompt: postProcessResult.improvedPrompt,
      headline: postProcessResult.headline,
      socialCopy: postProcessResult.socialCopy,
      instagramCaption: postProcessResult.instagramCaption,
      showingInvitation: postProcessResult.showingInvitation,
      shortAd: postProcessResult.shortAd,
      expertAnalysis,
      metrics: {
        totalDuration: 0, // Will be set by caller
        step1Duration: generationResult.duration,
        step2Duration: postProcessResult.duration,
        step3Duration: expertAnalysis?.duration,
        retryCount: 0, // Will be set by caller
        success: true,
        timestamp: new Date()
      }
    };
  }

  private isRetryableError(error: any): boolean {
    const errorMessage = (error instanceof Error ? error.message : null) 
      ?? (typeof error?.message === 'string' ? error.message : null)
      ?? String(error);

    // Network errors
    if (errorMessage.includes('ECONNREFUSED') || 
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ENOTFOUND')) {
      return true;
    }

    // OpenAI rate limits
    if (errorMessage.includes('rate_limit_exceeded') ||
        errorMessage.includes('429')) {
      return true;
    }

    // Temporary service errors
    if (errorMessage.includes('503') || 
        errorMessage.includes('502') ||
        errorMessage.includes('504')) {
      return true;
    }

    return false;
  }

  private emitProgress(sessionId: string, event: ProgressEvent): void {
    if (this.progressEmitter) {
      try {
        this.progressEmitter(sessionId, event);
      } catch (error) {
        console.error('Failed to emit progress event:', error);
      }
    }
  }
}
