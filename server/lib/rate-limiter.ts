import { createClient, type RedisClientType } from "redis";

const OPTIMIZE_RATE_LIMIT = (() => {
  const n = Number.parseInt(process.env.OPTIMIZE_RATE_LIMIT || "", 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
})(); // max requests per minute
const OPTIMIZE_RATE_WINDOW = (() => {
  const n = Number.parseInt(process.env.OPTIMIZE_RATE_WINDOW_MS || "", 10);
  return Number.isFinite(n) && n > 0 ? n : 60 * 1000;
})(); // 1 minute
const REDIS_CONNECT_COOLDOWN_MS = (() => {
  const n = Number.parseInt(process.env.REDIS_CONNECT_COOLDOWN_MS || "", 10);
  return Number.isFinite(n) && n >= 0 ? n : 30_000;
})();

const optimizeRateMap = new Map<string, { count: number; resetAt: number }>();

function checkOptimizeRateLimitInMemory(userId: string): boolean {
  const now = Date.now();
  const entry = optimizeRateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    optimizeRateMap.set(userId, { count: 1, resetAt: now + OPTIMIZE_RATE_WINDOW });
    return true;
  }
  if (entry.count >= OPTIMIZE_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const optimizeRateLuaScript =
  "local current = redis.call('INCR', KEYS[1])\n" +
  "if current == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end\n" +
  "return current";

let redisClient: RedisClientType | null = null;
let redisInitPromise: Promise<RedisClientType | null> | null = null;
let redisDisabledUntil = 0;

async function getRedisClient(): Promise<RedisClientType | null> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  if (Date.now() < redisDisabledUntil) return null;
  if (redisClient?.isReady) return redisClient;
  if (redisInitPromise) return redisInitPromise;

  redisInitPromise = (async () => {
    let client: RedisClientType | null = null;
    try {
      client = createClient({ url: redisUrl });
      client.on("error", (err: unknown) => {
        console.warn("[Redis] error:", err);
      });

      await client.connect();
      redisClient = client;
      console.log("[Redis] connected");
      return client;
    } catch (err) {
      console.warn("[Redis] connect failed, falling back to in-memory rate limiting:", err);
      redisDisabledUntil = Date.now() + REDIS_CONNECT_COOLDOWN_MS;
      try {
        await client?.disconnect();
      } catch {
      }
      redisClient = null;
      return null;
    } finally {
      redisInitPromise = null;
    }
  })();

  return redisInitPromise;
}

export async function checkOptimizeRateLimit(userId: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return checkOptimizeRateLimitInMemory(userId);

  const key = `rl:optimize:${userId}`;
  try {
    const count = (await client.eval(optimizeRateLuaScript, {
      keys: [key],
      arguments: [String(OPTIMIZE_RATE_WINDOW)],
    })) as number;

    return count <= OPTIMIZE_RATE_LIMIT;
  } catch (err) {
    console.warn("[Rate Limit] Redis error, falling back to in-memory:", err);
    return checkOptimizeRateLimitInMemory(userId);
  }
}

// Cleanup stale rate limit entries every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of Array.from(optimizeRateMap)) {
    if (now > entry.resetAt) optimizeRateMap.delete(key);
  }
}, 5 * 60 * 1000);

// Unref to prevent blocking process exit
cleanupInterval.unref();
