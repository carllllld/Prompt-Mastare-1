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
