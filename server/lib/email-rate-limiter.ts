// In-memory rate limiting (upgrade to Redis for production)
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();

  async checkLimit(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      // New window
      this.limits.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  async getRemainingRequests(key: string, maxRequests: number, windowMs: number): Promise<number> {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      return maxRequests;
    }

    return Math.max(0, maxRequests - entry.count);
  }

  async resetLimit(key: string): Promise<void> {
    this.limits.delete(key);
  }

  // Cleanup old entries
  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [key, entry] of this.limits.entries()) {
      if (now - entry.windowStart > maxAge) {
        this.limits.delete(key);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

// Email-specific rate limits
export const EMAIL_LIMITS = {
  verification: { max: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  team_invite: { max: 10, windowMs: 24 * 60 * 60 * 1000 }, // 10 per day
  password_reset: { max: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  welcome: { max: 1, windowMs: 24 * 60 * 60 * 1000 }, // 1 per day per user
  general: { max: 20, windowMs: 60 * 60 * 1000 } // 20 per hour total
};

export async function checkEmailRateLimit(
  email: string, 
  type: keyof typeof EMAIL_LIMITS, 
  ip?: string
): Promise<{ allowed: boolean; remaining: number; resetTime?: number }> {
  const limit = EMAIL_LIMITS[type];
  
  // Check per-email limit
  const emailKey = `email_${type}_${email}`;
  const emailAllowed = await rateLimiter.checkLimit(emailKey, limit.max, limit.windowMs);
  const emailRemaining = await rateLimiter.getRemainingRequests(emailKey, limit.max, limit.windowMs);

  // Check per-IP limit if provided
  if (ip) {
    const ipKey = `ip_${type}_${ip}`;
    const ipAllowed = await rateLimiter.checkLimit(ipKey, limit.max, limit.windowMs);
    
    if (!ipAllowed) {
      return { allowed: false, remaining: 0 };
    }
  }

  // Check general rate limit
  const generalKey = `email_general_${email}`;
  const generalAllowed = await rateLimiter.checkLimit(generalKey, EMAIL_LIMITS.general.max, EMAIL_LIMITS.general.windowMs);

  const allowed = emailAllowed && generalAllowed;
  const remaining = Math.min(emailRemaining, await rateLimiter.getRemainingRequests(generalKey, EMAIL_LIMITS.general.max, EMAIL_LIMITS.general.windowMs));

  return { allowed, remaining };
}

// Cleanup every hour
setInterval(() => rateLimiter.cleanup(), 60 * 60 * 1000);
