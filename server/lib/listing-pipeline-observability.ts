/**
 * Enterprise-grade pipeline observability
 * Comprehensive metrics, timing, and structured logging for production
 */

export interface PipelineStepMetrics {
  stepName: string;
  stage: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  success: boolean;
  error?: string;
  aiCalls: number;
  tokensUsed?: number;
  inputSize?: number;
  outputSize?: number;
  retryCount: number;
  cacheHit: boolean;

  // Quality metrics
  qualityScoreBefore?: number;
  qualityScoreAfter?: number;
  wordCountBefore?: number;
  wordCountAfter?: number;
  violationsBefore?: number;
  violationsAfter?: number;

  // Decision tracking
  decisionReason?: string;
  actionTaken: string;

  // Context
  plan: string;
  style: string;
  platform: string;
  propertyType?: string;
}

export interface PipelineRunMetrics {
  runId: string;
  userId: string;
  plan: string;
  startTime: number;
  endTime: number;
  totalDurationMs: number;
  success: boolean;
  steps: PipelineStepMetrics[];
  finalQualityScore?: number;
  finalWordCount?: number;
  totalAiCalls: number;
  totalTokensUsed?: number;
  rescueAttempts: number;
  polishAttempts: number;
  fastPathTaken: boolean;
  structuredDataUsed: boolean;

  // Error tracking
  errors: Array<{
    step: string;
    error: string;
    recoverable: boolean;
    recoveryAction?: string;
  }>;

  // Feature flags used
  featuresUsed: string[];
}

export interface StepTiming {
  step: string;
  stage: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
}

export interface ObservabilityConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  sampleRate: number; // 0-1, for high-volume sampling
  maxMetricsHistory: number;
  alertThresholds: {
    maxDurationMs: number;
    maxErrorRate: number;
    maxAiCalls: number;
    minQualityScore: number;
  };
}

const DEFAULT_CONFIG: ObservabilityConfig = {
  enabled: true,
  logLevel: 'info',
  sampleRate: 1.0,
  maxMetricsHistory: 10000,
  alertThresholds: {
    maxDurationMs: 30000, // 30 seconds
    maxErrorRate: 0.05, // 5%
    maxAiCalls: 10,
    minQualityScore: 0.7,
  },
};

class PipelineObservability {
  private config: ObservabilityConfig;
  private currentRun: PipelineRunMetrics | null = null;
  private currentStep: StepTiming | null = null;
  private runHistory: PipelineRunMetrics[] = [];
  private stepStats: Map<string, {
    count: number;
    totalDuration: number;
    errors: number;
    avgQualityImprovement: number;
  }> = new Map();

  constructor(config: Partial<ObservabilityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start a new pipeline run tracking
   */
  startRun(params: {
    runId: string;
    userId: string;
    plan: string;
    style: string;
    platform: string;
    propertyType?: string;
    structuredData: boolean;
  }): void {
    if (!this.config.enabled) return;

    this.currentRun = {
      runId: params.runId,
      userId: params.userId,
      plan: params.plan,
      startTime: Date.now(),
      endTime: 0,
      totalDurationMs: 0,
      success: false,
      steps: [],
      totalAiCalls: 0,
      rescueAttempts: 0,
      polishAttempts: 0,
      fastPathTaken: false,
      structuredDataUsed: params.structuredData,
      errors: [],
      featuresUsed: [],
    };

    this.log('info', 'Pipeline run started', {
      runId: params.runId,
      plan: params.plan,
      style: params.style,
      platform: params.platform,
    });
  }

  /**
   * Start timing a pipeline step
   */
  startStep(stepName: string, stage: string): void {
    if (!this.config.enabled) return;

    // End previous step if exists
    if (this.currentStep) {
      this.endStep();
    }

    this.currentStep = {
      step: stepName,
      stage,
      startTime: Date.now(),
    };
  }

  /**
   * End current step timing and record metrics
   */
  endStep(metrics?: Partial<PipelineStepMetrics>): PipelineStepMetrics | null {
    if (!this.config.enabled || !this.currentStep) return null;

    const endTime = Date.now();
    const durationMs = endTime - this.currentStep.startTime;

    const stepMetrics: PipelineStepMetrics = {
      stepName: this.currentStep.step,
      stage: this.currentStep.stage,
      startTime: this.currentStep.startTime,
      endTime,
      durationMs,
      success: true,
      aiCalls: 0,
      retryCount: 0,
      cacheHit: false,
      plan: this.currentRun?.plan || 'unknown',
      style: 'unknown',
      platform: 'unknown',
      actionTaken: 'none',
      ...metrics,
    };

    // Update step stats
    const key = `${stepMetrics.stage}.${stepMetrics.stepName}`;
    const stats = this.stepStats.get(key) || {
      count: 0,
      totalDuration: 0,
      errors: 0,
      avgQualityImprovement: 0,
    };
    stats.count++;
    stats.totalDuration += durationMs;
    if (!stepMetrics.success) stats.errors++;
    if (stepMetrics.qualityScoreBefore && stepMetrics.qualityScoreAfter) {
      const improvement = stepMetrics.qualityScoreAfter - stepMetrics.qualityScoreBefore;
      stats.avgQualityImprovement = (stats.avgQualityImprovement * (stats.count - 1) + improvement) / stats.count;
    }
    this.stepStats.set(key, stats);

    // Add to current run
    if (this.currentRun) {
      this.currentRun.steps.push(stepMetrics);
      this.currentRun.totalAiCalls += stepMetrics.aiCalls;
      if (stepMetrics.tokensUsed) {
        this.currentRun.totalTokensUsed = (this.currentRun.totalTokensUsed || 0) + stepMetrics.tokensUsed;
      }
    }

    // Check alerts
    this.checkStepAlerts(stepMetrics);

    this.currentStep = null;
    return stepMetrics;
  }

  /**
   * Record an AI call within current step
   */
  recordAiCall(tokensUsed?: number, cacheHit: boolean = false): void {
    if (!this.config.enabled || !this.currentRun) return;

    this.currentRun.totalAiCalls++;
    if (tokensUsed) {
      this.currentRun.totalTokensUsed = (this.currentRun.totalTokensUsed || 0) + tokensUsed;
    }
  }

  /**
   * Record a feature usage
   */
  recordFeature(feature: string): void {
    if (!this.config.enabled || !this.currentRun) return;

    if (!this.currentRun.featuresUsed.includes(feature)) {
      this.currentRun.featuresUsed.push(feature);
    }
  }

  /**
   * Record an error with context
   */
  recordError(step: string, error: Error | string, recoverable: boolean = false, recoveryAction?: string): void {
    if (!this.config.enabled || !this.currentRun) return;

    const errorMessage = error instanceof Error ? error.message : String(error);

    this.currentRun.errors.push({
      step,
      error: errorMessage,
      recoverable,
      recoveryAction,
    });

    this.log('error', 'Pipeline error', {
      step,
      error: errorMessage,
      recoverable,
      recoveryAction,
      runId: this.currentRun.runId,
    });

    // Mark current step as failed if matches
    const currentStepMetrics = this.currentRun.steps[this.currentRun.steps.length - 1];
    if (currentStepMetrics && currentStepMetrics.stepName === step) {
      currentStepMetrics.success = false;
      currentStepMetrics.error = errorMessage;
    }
  }

  /**
   * Record rescue attempt
   */
  recordRescueAttempt(): void {
    if (!this.config.enabled || !this.currentRun) return;
    this.currentRun.rescueAttempts++;
    this.recordFeature('rescue');
  }

  /**
   * Record polish attempt
   */
  recordPolishAttempt(): void {
    if (!this.config.enabled || !this.currentRun) return;
    this.currentRun.polishAttempts++;
    this.recordFeature('polish');
  }

  /**
   * Record fast path taken
   */
  recordFastPath(): void {
    if (!this.config.enabled || !this.currentRun) return;
    this.currentRun.fastPathTaken = true;
    this.recordFeature('fast-path');
  }

  /**
   * End current pipeline run
   */
  endRun(success: boolean, finalMetrics?: {
    qualityScore?: number;
    wordCount?: number;
  }): PipelineRunMetrics | null {
    if (!this.config.enabled || !this.currentRun) return null;

    // End any ongoing step
    if (this.currentStep) {
      this.endStep({ success });
    }

    const endTime = Date.now();
    this.currentRun.endTime = endTime;
    this.currentRun.totalDurationMs = endTime - this.currentRun.startTime;
    this.currentRun.success = success;

    if (finalMetrics) {
      this.currentRun.finalQualityScore = finalMetrics.qualityScore;
      this.currentRun.finalWordCount = finalMetrics.wordCount;
    }

    // Store in history
    this.runHistory.push({ ...this.currentRun });
    if (this.runHistory.length > this.config.maxMetricsHistory) {
      this.runHistory.shift();
    }

    // Check run-level alerts
    this.checkRunAlerts(this.currentRun);

    // Log completion
    this.log('info', 'Pipeline run completed', {
      runId: this.currentRun.runId,
      success,
      durationMs: this.currentRun.totalDurationMs,
      totalAiCalls: this.currentRun.totalAiCalls,
      steps: this.currentRun.steps.length,
    });

    const completedRun = { ...this.currentRun };

    // Persist to database (async, don't block)
    this.persistRun(completedRun).catch(err => {
      this.log('error', 'Failed to persist metrics', { error: err.message });
    });

    this.currentRun = null;
    return completedRun;
  }

  /**
   * Persist run to database
   */
  private async persistRun(run: PipelineRunMetrics): Promise<void> {
    // Dynamic import to avoid circular dependency
    const { storage } = await import('../storage');

    await storage.savePipelineMetrics({
      runId: run.runId,
      userId: run.userId,
      plan: run.plan,
      success: run.success,
      totalDurationMs: run.totalDurationMs,
      totalAiCalls: run.totalAiCalls,
      totalTokensUsed: run.totalTokensUsed,
      rescueAttempts: run.rescueAttempts,
      polishAttempts: run.polishAttempts,
      fastPathTaken: run.fastPathTaken,
      structuredDataUsed: run.structuredDataUsed,
      featuresUsed: run.featuresUsed,
      errorCount: run.errors.length,
      steps: run.steps,
      createdAt: new Date(run.startTime),
    });
  }

  /**
   * Get step performance statistics
   */
  getStepStats(): Map<string, { count: number; avgDurationMs: number; errorRate: number; avgQualityImprovement: number }> {
    const result = new Map();

    for (const [key, stats] of Array.from(this.stepStats.entries())) {
      result.set(key, {
        count: stats.count,
        avgDurationMs: stats.totalDuration / stats.count,
        errorRate: stats.errors / stats.count,
        avgQualityImprovement: stats.avgQualityImprovement,
      });
    }

    return result;
  }

  /**
   * Get run history
   */
  getRunHistory(limit?: number): PipelineRunMetrics[] {
    const history = [...this.runHistory];
    if (limit) {
      return history.slice(-limit);
    }
    return history;
  }

  /**
   * Get current run (if active)
   */
  getCurrentRun(): PipelineRunMetrics | null {
    return this.currentRun ? { ...this.currentRun } : null;
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    totalRuns: number;
    successRate: number;
    avgDurationMs: number;
    avgAiCalls: number;
    stepPerformance: Array<{
      step: string;
      avgDurationMs: number;
      errorRate: number;
      qualityImprovement: number;
    }>;
    featureUsage: Record<string, number>;
  } {
    const totalRuns = this.runHistory.length;
    if (totalRuns === 0) {
      return {
        totalRuns: 0,
        successRate: 0,
        avgDurationMs: 0,
        avgAiCalls: 0,
        stepPerformance: [],
        featureUsage: {},
      };
    }

    const successfulRuns = this.runHistory.filter(r => r.success).length;
    const totalDuration = this.runHistory.reduce((sum, r) => sum + r.totalDurationMs, 0);
    const totalAiCalls = this.runHistory.reduce((sum, r) => sum + r.totalAiCalls, 0);

    // Feature usage stats
    const featureUsage: Record<string, number> = {};
    for (const run of this.runHistory) {
      for (const feature of run.featuresUsed) {
        featureUsage[feature] = (featureUsage[feature] || 0) + 1;
      }
    }

    return {
      totalRuns,
      successRate: successfulRuns / totalRuns,
      avgDurationMs: totalDuration / totalRuns,
      avgAiCalls: totalAiCalls / totalRuns,
      stepPerformance: Array.from(this.getStepStats().entries()).map(([step, stats]) => ({
        step,
        avgDurationMs: stats.avgDurationMs,
        errorRate: stats.errorRate,
        qualityImprovement: stats.avgQualityImprovement,
      })),
      featureUsage,
    };
  }

  /**
   * Check step-level alerts
   */
  private checkStepAlerts(metrics: PipelineStepMetrics): void {
    if (metrics.durationMs > this.config.alertThresholds.maxDurationMs) {
      this.log('warn', 'Step exceeded duration threshold', {
        step: metrics.stepName,
        durationMs: metrics.durationMs,
        threshold: this.config.alertThresholds.maxDurationMs,
      });
    }

    if (!metrics.success) {
      this.log('error', 'Step failed', {
        step: metrics.stepName,
        error: metrics.error,
      });
    }
  }

  /**
   * Check run-level alerts
   */
  private checkRunAlerts(run: PipelineRunMetrics): void {
    if (run.totalDurationMs > this.config.alertThresholds.maxDurationMs) {
      this.log('warn', 'Run exceeded duration threshold', {
        runId: run.runId,
        durationMs: run.totalDurationMs,
        threshold: this.config.alertThresholds.maxDurationMs,
      });
    }

    if (run.totalAiCalls > this.config.alertThresholds.maxAiCalls) {
      this.log('warn', 'Run exceeded AI call threshold', {
        runId: run.runId,
        aiCalls: run.totalAiCalls,
        threshold: this.config.alertThresholds.maxAiCalls,
      });
    }

    if (run.finalQualityScore !== undefined && run.finalQualityScore < this.config.alertThresholds.minQualityScore) {
      this.log('warn', 'Run quality below threshold', {
        runId: run.runId,
        qualityScore: run.finalQualityScore,
        threshold: this.config.alertThresholds.minQualityScore,
      });
    }
  }

  /**
   * Structured logging
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'listing-pipeline',
      ...data,
    };

    // In production, this would go to structured logging system
    // For now, use console with proper formatting
    const logFn = level === 'error' ? console.error :
      level === 'warn' ? console.warn :
        level === 'debug' ? console.debug : console.log;

    logFn(JSON.stringify(logEntry));
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.config.logLevel);
  }

  /**
   * Reset all metrics (use with caution)
   */
  reset(): void {
    this.runHistory = [];
    this.stepStats.clear();
    this.currentRun = null;
    this.currentStep = null;
  }
}

// Global observability instance
export const pipelineObservability = new PipelineObservability();

// Helper for wrapping async functions with observability
export async function withObservability<T>(
  stepName: string,
  stage: string,
  fn: () => Promise<T>,
  metricsCallback?: (result: T, durationMs: number) => Partial<PipelineStepMetrics>
): Promise<T> {
  pipelineObservability.startStep(stepName, stage);

  try {
    const startTime = Date.now();
    const result = await fn();
    const durationMs = Date.now() - startTime;

    const additionalMetrics = metricsCallback ? metricsCallback(result, durationMs) : {};
    pipelineObservability.endStep({
      stepName,
      stage,
      success: true,
      durationMs,
      ...additionalMetrics,
    });

    return result;
  } catch (error) {
    pipelineObservability.endStep({
      stepName,
      stage,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
