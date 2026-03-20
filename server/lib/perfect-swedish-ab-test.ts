import { pool } from '../db';
import { getCachedABTestAssignment, cacheABTestAssignment, getCachedFeatureFlag, cacheFeatureFlag } from './redis-cache';
import crypto from 'crypto';

export interface ABTestConfig {
  enabled: boolean;
  treatmentPercentage: number; // 0-100
  sessionConsistency: boolean;
  allowManualOverride: boolean;
}

export interface ABTestAssignment {
  userId: string;
  sessionId: string;
  variant: 'control' | 'treatment';
  assignedAt: Date;
  manualOverride: boolean;
}

export interface ABTestMetrics {
  variant: 'control' | 'treatment';
  successRate: number;
  avgGenerationTime: number;
  avgUserSatisfaction: number;
  regenerationRate: number;
  sampleSize: number;
}

export class ABTestManager {
  private readonly FEATURE_FLAG_NAME = 'perfect-swedish-pipeline';
  private readonly DEFAULT_CONFIG: ABTestConfig = {
    enabled: false, // Disabled by default, enable via environment variable
    treatmentPercentage: 50, // 50/50 split
    sessionConsistency: true,
    allowManualOverride: true
  };

  async assignVariant(
    userId: string,
    sessionId: string,
    forceVariant?: 'control' | 'treatment'
  ): Promise<'control' | 'treatment'> {
    // Check if feature is enabled
    const config = await this.getConfig();
    if (!config.enabled) {
      return 'control'; // Use old pipeline if feature is disabled
    }

    // Check for manual override
    if (forceVariant && config.allowManualOverride) {
      await this.saveAssignment(userId, sessionId, forceVariant, true);
      return forceVariant;
    }

    // Check for existing assignment (session consistency)
    const existingAssignment = await this.getAssignment(userId, sessionId);
    if (existingAssignment) {
      return existingAssignment.variant;
    }

    // Assign new variant based on hash
    const hash = this.hashAssignment(userId, sessionId);
    const variant = this.shouldAssignTreatment(hash, config.treatmentPercentage) ? 'treatment' : 'control';

    // Save assignment
    await this.saveAssignment(userId, sessionId, variant, false);

    return variant;
  }

  async getAssignment(userId: string, sessionId: string): Promise<ABTestAssignment | null> {
    // Try cache first
    const cached = await getCachedABTestAssignment(sessionId);
    if (cached && cached.userId === userId) {
      return {
        userId: cached.userId,
        sessionId,
        variant: cached.variant,
        assignedAt: new Date(cached.assignedAt),
        manualOverride: false
      };
    }

    // Query database
    try {
      const result = await pool.query(
        `SELECT user_id, session_id, variant, manual_override, assigned_at
         FROM ab_test_assignments
         WHERE user_id = $1 AND session_id = $2`,
        [userId, sessionId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        userId: row.user_id,
        sessionId: row.session_id,
        variant: row.variant,
        assignedAt: row.assigned_at,
        manualOverride: row.manual_override
      };
    } catch (error) {
      console.error('Failed to get A/B test assignment:', error);
      return null;
    }
  }

  async trackMetric(
    variant: 'control' | 'treatment',
    generationId: number,
    metrics: {
      success: boolean;
      duration: number;
      satisfaction?: number;
      regenerated?: boolean;
    }
  ): Promise<void> {
    // Metrics are tracked via the pipeline_generations table
    // This method is for future real-time metric tracking if needed
    console.log('Tracking metric:', { variant, generationId, metrics });
  }

  async getMetrics(variant: 'control' | 'treatment'): Promise<ABTestMetrics> {
    try {
      const result = await pool.query(
        `SELECT 
          COUNT(*) as total_generations,
          COUNT(*) FILTER (WHERE success = true) as successful_generations,
          AVG(total_duration) as avg_duration,
          COUNT(*) FILTER (WHERE generation_id IN (
            SELECT generation_id FROM user_feedback WHERE regenerated = true
          )) as regeneration_count
         FROM pipeline_generations
         WHERE variant = $1
           AND created_at > NOW() - INTERVAL '7 days'`,
        [variant]
      );

      const row = result.rows[0];
      const totalGenerations = parseInt(row.total_generations) || 0;
      const successfulGenerations = parseInt(row.successful_generations) || 0;
      const regenerationCount = parseInt(row.regeneration_count) || 0;

      // Get user satisfaction from feedback
      const satisfactionResult = await pool.query(
        `SELECT AVG(satisfaction_score) as avg_satisfaction
         FROM user_feedback uf
         JOIN pipeline_generations pg ON uf.generation_id = pg.id
         WHERE pg.variant = $1
           AND pg.created_at > NOW() - INTERVAL '7 days'
           AND uf.satisfaction_score IS NOT NULL`,
        [variant]
      );

      const avgSatisfaction = parseFloat(satisfactionResult.rows[0]?.avg_satisfaction) || 0;

      return {
        variant,
        successRate: totalGenerations > 0 ? (successfulGenerations / totalGenerations) * 100 : 0,
        avgGenerationTime: parseFloat(row.avg_duration) || 0,
        avgUserSatisfaction: avgSatisfaction,
        regenerationRate: totalGenerations > 0 ? (regenerationCount / totalGenerations) * 100 : 0,
        sampleSize: totalGenerations
      };
    } catch (error) {
      console.error('Failed to get A/B test metrics:', error);
      return {
        variant,
        successRate: 0,
        avgGenerationTime: 0,
        avgUserSatisfaction: 0,
        regenerationRate: 0,
        sampleSize: 0
      };
    }
  }

  async isEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.enabled;
  }

  private async getConfig(): Promise<ABTestConfig> {
    // Try cache first
    const cached = await getCachedFeatureFlag(this.FEATURE_FLAG_NAME);
    if (cached) {
      return cached as ABTestConfig;
    }

    // Get from environment variable or use default
    const config: ABTestConfig = {
      enabled: process.env.PERFECT_SWEDISH_PIPELINE_ENABLED === 'true',
      treatmentPercentage: parseInt(process.env.PERFECT_SWEDISH_PIPELINE_PERCENTAGE || '50'),
      sessionConsistency: true,
      allowManualOverride: true
    };

    // Cache the config
    await cacheFeatureFlag(this.FEATURE_FLAG_NAME, config);

    return config;
  }

  private async saveAssignment(
    userId: string,
    sessionId: string,
    variant: 'control' | 'treatment',
    manualOverride: boolean
  ): Promise<void> {
    try {
      // Save to database
      await pool.query(
        `INSERT INTO ab_test_assignments (user_id, session_id, variant, manual_override)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, session_id) 
         DO UPDATE SET variant = $3, manual_override = $4, assigned_at = NOW()`,
        [userId, sessionId, variant, manualOverride]
      );

      // Cache the assignment
      await cacheABTestAssignment(sessionId, {
        userId,
        variant,
        assignedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to save A/B test assignment:', error);
    }
  }

  private hashAssignment(userId: string, sessionId: string): number {
    // Create a deterministic hash from userId and sessionId
    const hash = crypto
      .createHash('sha256')
      .update(`${userId}:${sessionId}`)
      .digest('hex');

    // Convert first 8 characters to a number between 0 and 1
    const hashValue = parseInt(hash.substring(0, 8), 16);
    return hashValue / 0xffffffff; // Normalize to 0-1
  }

  private shouldAssignTreatment(hash: number, treatmentPercentage: number): boolean {
    // Assign to treatment if hash is less than the treatment percentage
    return hash < (treatmentPercentage / 100);
  }
}
