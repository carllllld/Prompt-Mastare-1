/**
 * Rate Limiter for Vision API
 * 
 * Prevents quota exhaustion by limiting image analysis requests per user
 */

import * as Sentry from "@sentry/node";

export interface RateLimitConfig {
  maxRequestsPerMinute?: number;
  maxRequestsPerHour?: number;
  maxRequestsPerDay?: number;
}

interface UserLimit {
  minute: { count: number; resetAt: number };
  hour: { count: number; resetAt: number };
  day: { count: number; resetAt: number };
}

export class VisionRateLimiter {
  private userLimits = new Map<string, UserLimit>();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig = {}) {
    this.config = {
      maxRequestsPerMinute: config.maxRequestsPerMinute ?? 10,
      maxRequestsPerHour: config.maxRequestsPerHour ?? 50,
      maxRequestsPerDay: config.maxRequestsPerDay ?? 100,
    };
  }

  async checkLimit(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
  }> {
    const now = Date.now();
    let limit = this.userLimits.get(userId);

    if (!limit) {
      limit = {
        minute: { count: 1, resetAt: now + 60_000 },
        hour: { count: 1, resetAt: now + 3600_000 },
        day: { count: 1, resetAt: now + 86400_000 },
      };
      this.userLimits.set(userId, limit);
      return { allowed: true };
    }

    // Check minute limit
    if (now > limit.minute.resetAt) {
      limit.minute = { count: 1, resetAt: now + 60_000 };
    } else if (limit.minute.count >= this.config.maxRequestsPerMinute) {
      const retryAfter = Math.ceil((limit.minute.resetAt - now) / 1000);
      Sentry.captureMessage(
        `Vision rate limit exceeded for user ${userId} (minute)`,
        "warning"
      );
      return {
        allowed: false,
        reason: "Minute limit exceeded",
        retryAfter,
      };
    } else {
      limit.minute.count++;
    }

    // Check hour limit
    if (now > limit.hour.resetAt) {
      limit.hour = { count: 1, resetAt: now + 3600_000 };
    } else if (limit.hour.count >= this.config.maxRequestsPerHour) {
      const retryAfter = Math.ceil((limit.hour.resetAt - now) / 1000);
      Sentry.captureMessage(
        `Vision rate limit exceeded for user ${userId} (hour)`,
        "warning"
      );
      return {
        allowed: false,
        reason: "Hour limit exceeded",
        retryAfter,
      };
    } else {
      limit.hour.count++;
    }

    // Check day limit
    if (now > limit.day.resetAt) {
      limit.day = { count: 1, resetAt: now + 86400_000 };
    } else if (limit.day.count >= this.config.maxRequestsPerDay) {
      const retryAfter = Math.ceil((limit.day.resetAt - now) / 1000);
      Sentry.captureMessage(
        `Vision rate limit exceeded for user ${userId} (day)`,
        "warning"
      );
      return {
        allowed: false,
        reason: "Day limit exceeded",
        retryAfter,
      };
    } else {
      limit.day.count++;
    }

    return { allowed: true };
  }

  reset(userId: string): void {
    this.userLimits.delete(userId);
  }

  resetAll(): void {
    this.userLimits.clear();
  }

  getStatus(userId: string): UserLimit | null {
    return this.userLimits.get(userId) || null;
  }
}

// Export singleton instance
export const visionRateLimiter = new VisionRateLimiter({
  maxRequestsPerMinute: 10,
  maxRequestsPerHour: 50,
  maxRequestsPerDay: 100,
});
