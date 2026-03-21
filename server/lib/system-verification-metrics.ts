/**
 * System Verification Metrics
 * 
 * Tracks violations and quality metrics for all 6 generated text fields.
 * Used for monitoring platform compliance, forbidden phrases, and field quality.
 */

export interface SystemVerificationMetrics {
  // Platform violations (Hemnet price/fee/energiklass)
  hemnetViolations: {
    total: number;
    byField: Record<string, number>;
    byPattern: Record<string, number>; // price, fee, energiklass
  };

  // Forbidden phrases
  forbiddenPhraseOccurrences: {
    total: number;
    byField: Record<string, number>;
    byPhrase: Record<string, number>;
  };

  // Field quality violations
  fieldQualityViolations: {
    headline: {
      tooLong: number;
      hasTrailingPunctuation: number;
      hasEmojis: number;
    };
    socialCopy: {
      tooManySentences: number;
      missingPeriod: number;
    };
    instagramCaption: {
      tooManyEmojis: number;
      tooLong: number;
    };
    showingInvitation: {
      missingVisning: number;
    };
    shortAd: {
      tooLong: number;
      missingPropertyType: number;
      missingArea: number;
    };
  };

  // Pipeline health
  generatorValidationFailures: number;
  postProcessorErrors: number;
  analyzerTimeouts: number;
}

export interface AlertThresholds {
  hemnetViolationsPerHour: number;
  generatorFailuresPerHour: number;
  forbiddenPhrasesPerHour: number;
  analyzerTimeoutsPerHour: number;
}

export const ALERT_THRESHOLDS: AlertThresholds = {
  hemnetViolationsPerHour: 10,
  generatorFailuresPerHour: 5,
  forbiddenPhrasesPerHour: 20,
  analyzerTimeoutsPerHour: 3
};

// Global metrics instance
let metrics: SystemVerificationMetrics = {
  hemnetViolations: {
    total: 0,
    byField: {},
    byPattern: {}
  },
  forbiddenPhraseOccurrences: {
    total: 0,
    byField: {},
    byPhrase: {}
  },
  fieldQualityViolations: {
    headline: {
      tooLong: 0,
      hasTrailingPunctuation: 0,
      hasEmojis: 0
    },
    socialCopy: {
      tooManySentences: 0,
      missingPeriod: 0
    },
    instagramCaption: {
      tooManyEmojis: 0,
      tooLong: 0
    },
    showingInvitation: {
      missingVisning: 0
    },
    shortAd: {
      tooLong: 0,
      missingPropertyType: 0,
      missingArea: 0
    }
  },
  generatorValidationFailures: 0,
  postProcessorErrors: 0,
  analyzerTimeouts: 0
};

/**
 * Get current metrics snapshot
 */
export function getMetrics(): SystemVerificationMetrics {
  return { ...metrics };
}

/**
 * Reset all metrics (useful for testing or hourly resets)
 */
export function resetMetrics(): void {
  metrics = {
    hemnetViolations: {
      total: 0,
      byField: {},
      byPattern: {}
    },
    forbiddenPhraseOccurrences: {
      total: 0,
      byField: {},
      byPhrase: {}
    },
    fieldQualityViolations: {
      headline: {
        tooLong: 0,
        hasTrailingPunctuation: 0,
        hasEmojis: 0
      },
      socialCopy: {
        tooManySentences: 0,
        missingPeriod: 0
      },
      instagramCaption: {
        tooManyEmojis: 0,
        tooLong: 0
      },
      showingInvitation: {
        missingVisning: 0
      },
      shortAd: {
        tooLong: 0,
        missingPropertyType: 0,
        missingArea: 0
      }
    },
    generatorValidationFailures: 0,
    postProcessorErrors: 0,
    analyzerTimeouts: 0
  };
}

/**
 * Increment Hemnet violation counter
 */
export function incrementHemnetViolation(field: string, pattern: string): void {
  metrics.hemnetViolations.total++;
  metrics.hemnetViolations.byField[field] = (metrics.hemnetViolations.byField[field] || 0) + 1;
  metrics.hemnetViolations.byPattern[pattern] = (metrics.hemnetViolations.byPattern[pattern] || 0) + 1;
}

/**
 * Increment forbidden phrase counter
 */
export function incrementForbiddenPhrase(field: string, phrase: string): void {
  metrics.forbiddenPhraseOccurrences.total++;
  metrics.forbiddenPhraseOccurrences.byField[field] = (metrics.forbiddenPhraseOccurrences.byField[field] || 0) + 1;
  metrics.forbiddenPhraseOccurrences.byPhrase[phrase] = (metrics.forbiddenPhraseOccurrences.byPhrase[phrase] || 0) + 1;
}

/**
 * Increment field quality violation counter
 */
export function incrementFieldQualityViolation(
  field: 'headline' | 'socialCopy' | 'instagramCaption' | 'showingInvitation' | 'shortAd',
  violation: string
): void {
  if (field === 'headline') {
    if (violation === 'tooLong') metrics.fieldQualityViolations.headline.tooLong++;
    if (violation === 'hasTrailingPunctuation') metrics.fieldQualityViolations.headline.hasTrailingPunctuation++;
    if (violation === 'hasEmojis') metrics.fieldQualityViolations.headline.hasEmojis++;
  } else if (field === 'socialCopy') {
    if (violation === 'tooManySentences') metrics.fieldQualityViolations.socialCopy.tooManySentences++;
    if (violation === 'missingPeriod') metrics.fieldQualityViolations.socialCopy.missingPeriod++;
  } else if (field === 'instagramCaption') {
    if (violation === 'tooManyEmojis') metrics.fieldQualityViolations.instagramCaption.tooManyEmojis++;
    if (violation === 'tooLong') metrics.fieldQualityViolations.instagramCaption.tooLong++;
  } else if (field === 'showingInvitation') {
    if (violation === 'missingVisning') metrics.fieldQualityViolations.showingInvitation.missingVisning++;
  } else if (field === 'shortAd') {
    if (violation === 'tooLong') metrics.fieldQualityViolations.shortAd.tooLong++;
    if (violation === 'missingPropertyType') metrics.fieldQualityViolations.shortAd.missingPropertyType++;
    if (violation === 'missingArea') metrics.fieldQualityViolations.shortAd.missingArea++;
  }
}

/**
 * Increment generator validation failure counter
 */
export function incrementGeneratorValidationFailure(): void {
  metrics.generatorValidationFailures++;
}

/**
 * Increment post-processor error counter
 */
export function incrementPostProcessorError(): void {
  metrics.postProcessorErrors++;
}

/**
 * Increment analyzer timeout counter
 */
export function incrementAnalyzerTimeout(): void {
  metrics.analyzerTimeouts++;
}

/**
 * Check if any alert thresholds have been exceeded
 * Returns array of alerts that should be triggered
 */
export function checkAlertThresholds(hourlyMetrics: SystemVerificationMetrics): Array<{
  severity: 'critical' | 'high' | 'medium';
  title: string;
  message: string;
  details: any;
}> {
  const alerts: Array<{
    severity: 'critical' | 'high' | 'medium';
    title: string;
    message: string;
    details: any;
  }> = [];

  // Check Hemnet violations
  if (hourlyMetrics.hemnetViolations.total > ALERT_THRESHOLDS.hemnetViolationsPerHour) {
    alerts.push({
      severity: 'critical',
      title: 'High Hemnet Violation Rate',
      message: `${hourlyMetrics.hemnetViolations.total} violations in last hour`,
      details: {
        byField: hourlyMetrics.hemnetViolations.byField,
        byPattern: hourlyMetrics.hemnetViolations.byPattern
      }
    });
  }

  // Check generator failures
  if (hourlyMetrics.generatorValidationFailures > ALERT_THRESHOLDS.generatorFailuresPerHour) {
    alerts.push({
      severity: 'high',
      title: 'Generator Validation Failures',
      message: `${hourlyMetrics.generatorValidationFailures} failures in last hour`,
      details: {}
    });
  }

  // Check forbidden phrases
  if (hourlyMetrics.forbiddenPhraseOccurrences.total > ALERT_THRESHOLDS.forbiddenPhrasesPerHour) {
    alerts.push({
      severity: 'medium',
      title: 'High Forbidden Phrase Rate',
      message: `${hourlyMetrics.forbiddenPhraseOccurrences.total} occurrences in last hour`,
      details: {
        byField: hourlyMetrics.forbiddenPhraseOccurrences.byField,
        topPhrases: Object.entries(hourlyMetrics.forbiddenPhraseOccurrences.byPhrase)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
      }
    });
  }

  // Check analyzer timeouts
  if (hourlyMetrics.analyzerTimeouts > ALERT_THRESHOLDS.analyzerTimeoutsPerHour) {
    alerts.push({
      severity: 'high',
      title: 'Analyzer Timeouts',
      message: `${hourlyMetrics.analyzerTimeouts} timeouts in last hour`,
      details: {}
    });
  }

  return alerts;
}

/**
 * Get metrics summary for dashboard
 */
export function getMetricsSummary(): {
  platformCompliance: number;
  forbiddenPhraseRate: number;
  fieldQualityScore: number;
  pipelineHealth: number;
} {
  const totalGenerations = metrics.generatorValidationFailures + 100; // Approximate
  const platformCompliance = totalGenerations > 0
    ? ((totalGenerations - metrics.hemnetViolations.total) / totalGenerations) * 100
    : 100;

  const forbiddenPhraseRate = totalGenerations > 0
    ? ((totalGenerations - metrics.forbiddenPhraseOccurrences.total) / totalGenerations) * 100
    : 100;

  const totalFieldViolations = Object.values(metrics.fieldQualityViolations).reduce(
    (sum, field) => sum + Object.values(field).reduce((s, v) => s + v, 0),
    0
  );
  const fieldQualityScore = totalGenerations > 0
    ? ((totalGenerations - totalFieldViolations) / totalGenerations) * 100
    : 100;

  const totalErrors = metrics.generatorValidationFailures + metrics.postProcessorErrors + metrics.analyzerTimeouts;
  const pipelineHealth = totalGenerations > 0
    ? ((totalGenerations - totalErrors) / totalGenerations) * 100
    : 100;

  return {
    platformCompliance,
    forbiddenPhraseRate,
    fieldQualityScore,
    pipelineHealth
  };
}
