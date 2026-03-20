import { SmartGenerationEngine, GenerationRequest, GenerationResult } from './perfect-swedish-generator';
import { DeterministicPostProcessor, PostProcessRequest, PostProcessResult } from './perfect-swedish-post-processor';
import { ExpertAIAnalyzer, AnalysisRequest, ExpertAnalysis } from './perfect-swedish-analyzer';
import { WritingStyle } from './text-rules';
import pRetry from 'p-retry';
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
  forceVariant?: 'control' | 'treatment';
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
  variant: 'control' | 'treatment';
  fallbackUsed: boolean;
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
  type: 'progress' | 'completion' | 'fallback';
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
          onFailedAttempt: (error: any) => {
            retryCount = error.attemptNumber - 1;
            console.log(`Pipeline attempt ${error.attemptNumber} failed:`, error.message);
            
            // Log retry to Sentry
            Sentry.captureMessage('Pipeline retry attempt', {
              level: 'warning',
              tags: {
                component: 'perfect-swedish-orchestrator',
                pipeline_step: 'retry',
                attempt: error.attemptNumber.toString()
              },
              extra: {
                userId: request.userId,
                sessionId: request.sessionId,
                errorMessage: error.message,
                retryable: this.isRetryableError(error)
              }
            });
            
            // Only retry on retryable errors
            if (!this.isRetryableError(error)) {
              throw error;
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
        },
        variant: 'treatment',
        fallbackUsed: false
      };
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      
      console.error('Pipeline failed after retries, falling back to old pipeline:', {
        error: error instanceof Error ? error.message : String(error),
        retryCount,
        duration: totalDuration
      });

      // Capture error in Sentry
      Sentry.captureException(error, {
        tags: {
          component: 'perfect-swedish-orchestrator',
          pipeline_step: 'execute',
          fallback_triggered: 'true'
        },
        extra: {
          userId: request.userId,
          sessionId: request.sessionId,
          retryCount,
          totalDuration,
          style: request.style,
          platform: request.platform
        }
      });

      // Emit fallback event
      this.emitProgress(request.sessionId, {
        type: 'fallback',
        message: 'Använder alternativ metod för att säkerställa resultat',
        timestamp: new Date()
      });

      // Fall back to old pipeline
      const fallbackResult = await this.fallbackToOldPipeline(request);

      return {
        ...fallbackResult,
        metrics: {
          totalDuration,
          retryCount,
          success: false,
          errorType: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        },
        variant: 'control',
        fallbackUsed: true
      };
    }
  }

  private async executeNewPipeline(request: PipelineRequest): Promise<Omit<PipelineResult, 'variant' | 'fallbackUsed'>> {
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
    const errorMessage = error.message || String(error);

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

  private async fallbackToOldPipeline(request: PipelineRequest): Promise<Omit<PipelineResult, 'metrics' | 'variant' | 'fallbackUsed'>> {
    // This would call the existing 7-step pipeline
    // For now, return a placeholder that indicates fallback was used
    // In production, this would integrate with the existing listing-orchestrator.ts
    
    console.log('Fallback to old pipeline not yet implemented, returning error state');
    
    throw new Error('Fallback to old pipeline not yet implemented');
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
