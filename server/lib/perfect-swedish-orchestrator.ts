import { SmartGenerationEngine, GenerationResult } from './perfect-swedish-generator';
import { DeterministicPostProcessor, PostProcessResult } from './perfect-swedish-post-processor';
import { ExpertAIAnalyzer, ExpertAnalysis } from './perfect-swedish-analyzer';
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
  private progressEmitter?: ProgressEmitter;

  constructor(progressEmitter?: ProgressEmitter) {
    this.smartGenerator = new SmartGenerationEngine();
    this.postProcessor = new DeterministicPostProcessor();
    this.expertAnalyzer = new ExpertAIAnalyzer();
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
      
      console.error('Pipeline execution failed after all retries:', {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        retryCount,
        duration: totalDuration,
        userId: request.userId,
        sessionId: request.sessionId,
        style: request.style,
        platform: request.platform
      });

      // Capture error in Sentry with detailed context
      Sentry.captureException(error, {
        tags: {
          component: 'perfect-swedish-orchestrator',
          pipeline_step: 'execute',
          user_plan: 'unknown', // Could be enriched with actual plan
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

      // Re-throw with user-friendly message
      const msg = (() => {
        if (error instanceof Error) return error.message;
        if (error && typeof (error as any).message === 'string') return (error as any).message;
        // p-retry FailedAttemptError wraps the original — try to unwrap it
        const original = (error as any)?.originalError ?? (error as any)?.cause;
        if (original instanceof Error) return original.message;
        if (original && typeof original.message === 'string') return original.message;
        return String(error);
      })();
      throw new Error(
        `Textgenerering misslyckades: ${msg}. ` +
        `Försök igen om en stund eller kontakta support om problemet kvarstår.`
      );
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
