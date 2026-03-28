import { createClient } from 'redis';

// Redis client for caching
let redisClient: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  // Only use Redis if REDIS_URL is configured
  if (!process.env.REDIS_URL) {
    console.log('Redis not configured, caching disabled');
    return null;
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis client connected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    redisClient = null;
    return null;
  }
}

// Cache A/B test assignments for fast lookup
export async function cacheABTestAssignment(
  sessionId: string,
  assignment: { userId: string; variant: 'control' | 'treatment'; assignedAt: Date }
): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;

  try {
    const key = `ab_test:session:${sessionId}`;
    await client.setEx(key, 86400, JSON.stringify(assignment)); // 24 hour TTL
  } catch (error) {
    console.error('Failed to cache A/B test assignment:', error);
  }
}

export async function getCachedABTestAssignment(
  sessionId: string
): Promise<{ userId: string; variant: 'control' | 'treatment'; assignedAt: Date } | null> {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    const key = `ab_test:session:${sessionId}`;
    const cached = await client.get(key);
    if (!cached) return null;
    
    return JSON.parse(cached);
  } catch (error) {
    console.error('Failed to get cached A/B test assignment:', error);
    return null;
  }
}

// Cache prompt templates to avoid rebuilding
export async function cachePromptTemplate(
  templateName: string,
  version: string,
  template: string
): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;

  try {
    const key = `prompt:template:${templateName}:${version}`;
    await client.setEx(key, 3600, JSON.stringify({ template, compiledAt: new Date() })); // 1 hour TTL
  } catch (error) {
    console.error('Failed to cache prompt template:', error);
  }
}

export async function getCachedPromptTemplate(
  templateName: string,
  version: string
): Promise<string | null> {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    const key = `prompt:template:${templateName}:${version}`;
    const cached = await client.get(key);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    return data.template;
  } catch (error) {
    console.error('Failed to get cached prompt template:', error);
    return null;
  }
}

// Cache feature flags for fast access
export async function cacheFeatureFlag(
  flagName: string,
  config: { enabled: boolean; [key: string]: any }
): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;

  try {
    const key = `feature:flag:${flagName}`;
    await client.setEx(key, 300, JSON.stringify(config)); // 5 minute TTL
  } catch (error) {
    console.error('Failed to cache feature flag:', error);
  }
}

export async function getCachedFeatureFlag(
  flagName: string
): Promise<{ enabled: boolean; [key: string]: any } | null> {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    const key = `feature:flag:${flagName}`;
    const cached = await client.get(key);
    if (!cached) return null;
    
    return JSON.parse(cached);
  } catch (error) {
    console.error('Failed to get cached feature flag:', error);
    return null;
  }
}

// Cache user plans for faster auth
export async function cacheUserPlan(
  userId: string,
  plan: string
): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;

  try {
    const key = `user:${userId}:plan`;
    await client.setEx(key, 3600, plan); // 1 hour TTL
  } catch (error) {
    console.error('Failed to cache user plan:', error);
  }
}

export async function getCachedUserPlan(
  userId: string
): Promise<string | null> {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    const key = `user:${userId}:plan`;
    return await client.get(key);
  } catch (error) {
    console.error('Failed to get cached user plan:', error);
    return null;
  }
}

// Cache integration settings
export async function cacheIntegrationSettings(
  userId: string,
  settings: any
): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;

  try {
    const key = `user:${userId}:integrations`;
    await client.setEx(key, 1800, JSON.stringify(settings)); // 30 minute TTL
  } catch (error) {
    console.error('Failed to cache integration settings:', error);
  }
}

export async function getCachedIntegrationSettings(
  userId: string
): Promise<any | null> {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    const key = `user:${userId}:integrations`;
    const cached = await client.get(key);
    if (!cached) return null;
    
    return JSON.parse(cached);
  } catch (error) {
    console.error('Failed to get cached integration settings:', error);
    return null;
  }
}

// Cache generated texts for regeneration
export async function cacheGeneratedText(
  userId: string,
  text: string,
  metadata?: any
): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;

  try {
    const key = `user:${userId}:last_text`;
    const data = { text, metadata, cachedAt: new Date().toISOString() };
    await client.setEx(key, 7200, JSON.stringify(data)); // 2 hour TTL
  } catch (error) {
    console.error('Failed to cache generated text:', error);
  }
}

export async function getCachedGeneratedText(
  userId: string
): Promise<{ text: string; metadata?: any; cachedAt: string } | null> {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    const key = `user:${userId}:last_text`;
    const cached = await client.get(key);
    if (!cached) return null;
    
    return JSON.parse(cached);
  } catch (error) {
    console.error('Failed to get cached generated text:', error);
    return null;
  }
}

// Cache invalidation
export async function invalidateUserCache(userId: string): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;

  try {
    const keys = await client.keys(`user:${userId}:*`);
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`[Redis] Invalidated ${keys.length} cache entries for user ${userId}`);
    }
  } catch (error) {
    console.error('Failed to invalidate user cache:', error);
  }
}

// Cache metrics
let cacheHits = 0;
let cacheMisses = 0;

export function recordCacheHit(): void {
  cacheHits++;
}

export function recordCacheMiss(): void {
  cacheMisses++;
}

export function getCacheMetrics(): {
  hits: number;
  misses: number;
  hitRate: number;
  total: number;
} {
  const total = cacheHits + cacheMisses;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: total > 0 ? cacheHits / total : 0,
    total,
  };
}

export function resetCacheMetrics(): void {
  cacheHits = 0;
  cacheMisses = 0;
}

// Graceful shutdown
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      console.log('Redis client closed');
    } catch (error) {
      console.error('Error closing Redis client:', error);
    }
  }
}
