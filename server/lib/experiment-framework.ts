/**
 * Enterprise A/B Testing Infrastructure
 * Feature flagging and experiment framework for production
 */

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';

export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: ExperimentStatus;
  startDate?: string;
  endDate?: string;
  variants: Variant[];
  targeting: TargetingRules;
  metrics: MetricDefinition[];
  sampleSize: number;
  winner?: string; // variant id
}

export interface Variant {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-1, must sum to 1 across variants
  config: Record<string, any>; // Feature flag values
}

export interface TargetingRules {
  plans?: string[]; // 'free' | 'pro' | 'premium'
  platforms?: string[]; // 'hemnet' | 'booli'
  styles?: string[]; // 'factual' | 'balanced' | 'selling'
  userIds?: string[]; // Specific users for testing
  percentage: number; // 0-100, % of eligible users
}

export interface MetricDefinition {
  name: string;
  type: 'conversion' | 'duration' | 'quality' | 'count';
  description: string;
  higherIsBetter: boolean;
}

export interface ExperimentResult {
  experimentId: string;
  variantId: string;
  userId: string;
  metrics: Record<string, number>;
  timestamp: string;
}

// Pre-defined experiments for the listing pipeline
export const DEFAULT_EXPERIMENTS: Experiment[] = [
  {
    id: 'exp-prompt-v2',
    name: 'Prompt Structure V2',
    description: 'Test new prompt sandwich technique',
    status: 'draft',
    variants: [
      {
        id: 'control',
        name: 'Current Prompt',
        description: 'Existing prompt structure',
        weight: 0.5,
        config: { useNewPrompt: false },
      },
      {
        id: 'treatment',
        name: 'New Prompt V2',
        description: 'Sandwich technique with stronger constraints',
        weight: 0.5,
        config: { useNewPrompt: true },
      },
    ],
    targeting: {
      percentage: 10,
    },
    metrics: [
      { name: 'quality_score', type: 'quality', description: 'Final quality score', higherIsBetter: true },
      { name: 'rescue_rate', type: 'conversion', description: 'Rescue attempts needed', higherIsBetter: false },
      { name: 'generation_time', type: 'duration', description: 'Time to generate', higherIsBetter: false },
    ],
    sampleSize: 100,
  },
  {
    id: 'exp-candidate-selection',
    name: 'Candidate Selection Algorithm',
    description: 'Test new multi-candidate selection logic',
    status: 'draft',
    variants: [
      {
        id: 'control',
        name: 'Current Selection',
        description: 'Existing candidate selection',
        weight: 0.5,
        config: { useNewSelection: false },
      },
      {
        id: 'treatment',
        name: 'Quality-First Selection',
        description: 'Prioritize quality over speed',
        weight: 0.5,
        config: { useNewSelection: true },
      },
    ],
    targeting: {
      plans: ['pro', 'premium'],
      percentage: 20,
    },
    metrics: [
      { name: 'best_candidate_quality', type: 'quality', description: 'Selected candidate quality', higherIsBetter: true },
      { name: 'polish_rate', type: 'count', description: 'Polish attempts', higherIsBetter: false },
    ],
    sampleSize: 200,
  },
  {
    id: 'exp-temperature',
    name: 'Temperature Optimization',
    description: 'Test temperature settings for different styles',
    status: 'draft',
    variants: [
      {
        id: 'control',
        name: 'Current Temps',
        description: 'Existing temperature settings',
        weight: 0.33,
        config: { temperatureConfig: 'default' },
      },
      {
        id: 'low-temp',
        name: 'Lower Temperatures',
        description: 'More conservative temps',
        weight: 0.33,
        config: { temperatureConfig: 'low' },
      },
      {
        id: 'adaptive',
        name: 'Adaptive Temperature',
        description: 'Temp based on retry count',
        weight: 0.34,
        config: { temperatureConfig: 'adaptive' },
      },
    ],
    targeting: {
      percentage: 15,
    },
    metrics: [
      { name: 'first_pass_quality', type: 'quality', description: 'Quality without retries', higherIsBetter: true },
      { name: 'retry_count', type: 'count', description: 'Retries needed', higherIsBetter: false },
    ],
    sampleSize: 150,
  },
];

class ExperimentManager {
  private experiments: Map<string, Experiment> = new Map();
  private results: ExperimentResult[] = [];
  private userAssignments: Map<string, Map<string, string>> = new Map(); // userId -> experimentId -> variantId

  constructor() {
    // Load default experiments
    for (const exp of DEFAULT_EXPERIMENTS) {
      this.experiments.set(exp.id, exp);
    }
  }

  /**
   * Get active experiments for a user (with DB persistency)
   */
  async getActiveExperimentsForUser(userId: string, context: {
    plan: string;
    platform: string;
    style: string;
  }): Promise<Array<{ experiment: Experiment; variant: Variant }>> {
    const active: Array<{ experiment: Experiment; variant: Variant }> = [];

    // Dynamic import to avoid circular dependency
    const { storage } = await import('../storage');

    for (const experiment of Array.from(this.experiments.values())) {
      if (experiment.status !== 'running') continue;

      // Check targeting
      if (!this.matchesTargeting(experiment.targeting, context)) continue;

      // Check if user already assigned (from DB)
      const variantId = await storage.getUserExperimentAssignment(userId, experiment.id);
      if (variantId) {
        const variant = experiment.variants.find(v => v.id === variantId);
        if (variant) {
          active.push({ experiment, variant });
        }
        continue;
      }

      // New assignment - check percentage
      if (!this.shouldInclude(context, experiment.targeting.percentage)) continue;

      // Assign variant based on weights
      const variant = this.assignVariant(experiment.variants);
      if (variant) {
        // Save assignment to DB
        await storage.saveUserExperimentAssignment(userId, experiment.id, variant.id);
        active.push({ experiment, variant });
      }
    }

    return active;
  }

  /**
   * Check if user matches targeting rules
   */
  private matchesTargeting(rules: TargetingRules, context: {
    plan: string;
    platform: string;
    style: string;
  }): boolean {
    if (rules.plans && !rules.plans.includes(context.plan)) return false;
    if (rules.platforms && !rules.platforms.includes(context.platform)) return false;
    if (rules.styles && !rules.styles.includes(context.style)) return false;
    return true;
  }

  /**
   * Determine if user should be included based on percentage
   */
  private shouldInclude(context: any, percentage: number): boolean {
    // Deterministic based on userId hash
    const hash = this.hashString(`${context.plan}-${context.platform}-${context.style}`);
    return (hash % 100) < percentage;
  }

  /**
   * Simple string hash
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Assign variant based on weights
   */
  private assignVariant(variants: Variant[]): Variant | null {
    const random = Math.random();
    let cumulative = 0;

    for (const variant of variants) {
      cumulative += variant.weight;
      if (random <= cumulative) {
        return variant;
      }
    }

    return variants[variants.length - 1] || null;
  }

  /**
   * Get assigned variant for user
   */
  private getUserVariant(userId: string, experimentId: string): string | undefined {
    return this.userAssignments.get(userId)?.get(experimentId);
  }

  /**
   * Assign user to variant
   */
  private assignUserToVariant(userId: string, experimentId: string, variantId: string): void {
    if (!this.userAssignments.has(userId)) {
      this.userAssignments.set(userId, new Map());
    }
    this.userAssignments.get(userId)!.set(experimentId, variantId);
  }

  /**
   * Record experiment result
   */
  recordResult(result: ExperimentResult): void {
    this.results.push(result);

    // Log for analysis
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Experiment result recorded',
      service: 'experiment-manager',
      result,
    }));
  }

  /**
   * Get experiment results summary
   */
  getResults(experimentId: string): {
    byVariant: Record<string, {
      count: number;
      metrics: Record<string, { avg: number; min: number; max: number }>;
    }>;
    total: number;
  } {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return { byVariant: {}, total: 0 };
    }

    const byVariant: Record<string, any> = {};

    // Initialize variants
    for (const variant of experiment.variants) {
      byVariant[variant.id] = {
        count: 0,
        metrics: {},
      };
    }

    // Aggregate results
    for (const result of this.results) {
      if (result.experimentId !== experimentId) continue;

      const variant = byVariant[result.variantId];
      if (!variant) continue;

      variant.count++;

      for (const [metricName, value] of Object.entries(result.metrics)) {
        if (!variant.metrics[metricName]) {
          variant.metrics[metricName] = { sum: 0, count: 0, min: value, max: value };
        }
        variant.metrics[metricName].sum += value;
        variant.metrics[metricName].count++;
        variant.metrics[metricName].min = Math.min(variant.metrics[metricName].min, value);
        variant.metrics[metricName].max = Math.max(variant.metrics[metricName].max, value);
      }
    }

    // Calculate averages
    for (const variant of Object.values(byVariant)) {
      for (const [metricName, metric] of Object.entries(variant.metrics)) {
        const metricTyped = metric as { sum: number; count: number; min: number; max: number; avg?: number };
        metricTyped.avg = metricTyped.sum / metricTyped.count;
        delete (metricTyped as { sum?: number }).sum;
      }
    }

    return {
      byVariant,
      total: this.results.filter(r => r.experimentId === experimentId).length,
    };
  }

  /**
   * Start an experiment
   */
  startExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'draft') return false;

    experiment.status = 'running';
    experiment.startDate = new Date().toISOString();
    return true;
  }

  /**
   * Pause an experiment
   */
  pauseExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') return false;

    experiment.status = 'paused';
    return true;
  }

  /**
   * Complete experiment and declare winner
   */
  completeExperiment(experimentId: string, winnerVariantId?: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return false;

    experiment.status = 'completed';
    experiment.endDate = new Date().toISOString();
    if (winnerVariantId) {
      experiment.winner = winnerVariantId;
    }
    return true;
  }

  /**
   * Get all experiments
   */
  getAllExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Get experiment by ID
   */
  getExperiment(id: string): Experiment | undefined {
    return this.experiments.get(id);
  }

  /**
   * Reset all assignments (use with caution)
   */
  resetAssignments(): void {
    this.userAssignments.clear();
  }
}

// Global instance
export const experimentManager = new ExperimentManager();

// Helper to get feature flags for a user (async)
export async function getFeatureFlags(userId: string, context: {
  plan: string;
  platform: string;
  style: string;
}): Promise<Record<string, any>> {
  const flags: Record<string, any> = {};

  const experiments = await experimentManager.getActiveExperimentsForUser(userId, context);
  for (const { experiment, variant } of experiments) {
    flags[`exp_${experiment.id}`] = variant.id;
    Object.assign(flags, variant.config);
  }

  return flags;
}
