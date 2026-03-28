/**
 * Hemnet Health Monitor
 * 
 * Periodically checks if Hemnet's HTML structure has changed.
 * Alerts via Sentry if parsing fails, allowing proactive fixes.
 */

import * as Sentry from "@sentry/node";
import { fetchHemnetProperty } from "./hemnet-integration";

// Test URL - a stable Hemnet listing (update if this listing is removed)
const TEST_URL = "https://www.hemnet.se/bostad/lagenhet-2rum-sodermalm-stockholm-nytorgsgatan-38-19281849";

interface HealthCheckResult {
  healthy: boolean;
  timestamp: Date;
  error?: string;
  details?: {
    hasAddress: boolean;
    hasPrice: boolean;
    hasArea: boolean;
    hasImages: boolean;
    imageCount: number;
  };
}

let lastHealthCheck: HealthCheckResult | null = null;
let consecutiveFailures = 0;

/**
 * Check if Hemnet structure is still parseable
 */
export async function checkHemnetStructure(): Promise<HealthCheckResult> {
  const timestamp = new Date();
  
  try {
    // Try to fetch and parse a known Hemnet listing
    const property = await fetchHemnetProperty(TEST_URL);
    
    // Verify critical fields are present
    const hasAddress = Boolean(property.address);
    const hasPrice = Boolean(property.askingPrice);
    const hasArea = Boolean(property.livingArea);
    const hasImages = Boolean(property.imageUrls && property.imageUrls.length > 0);
    const imageCount = property.imageUrls?.length || 0;
    
    const healthy = hasAddress && hasPrice && hasArea;
    
    const result: HealthCheckResult = {
      healthy,
      timestamp,
      details: {
        hasAddress,
        hasPrice,
        hasArea,
        hasImages,
        imageCount,
      },
    };
    
    if (!healthy) {
      result.error = "Missing critical fields";
      consecutiveFailures++;
      
      // Alert after 2 consecutive failures
      if (consecutiveFailures >= 2) {
        Sentry.captureMessage(
          `Hemnet structure may have changed: ${result.error}`,
          {
            level: "warning",
            tags: { integration: "hemnet", component: "health-monitor" },
            extra: result.details,
          }
        );
      }
    } else {
      consecutiveFailures = 0;
    }
    
    lastHealthCheck = result;
    return result;
    
  } catch (error) {
    consecutiveFailures++;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    const result: HealthCheckResult = {
      healthy: false,
      timestamp,
      error: errorMessage,
    };
    
    // Alert after 2 consecutive failures
    if (consecutiveFailures >= 2) {
      Sentry.captureException(error, {
        tags: { integration: "hemnet", component: "health-monitor" },
        extra: { consecutiveFailures, testUrl: TEST_URL },
      });
    }
    
    lastHealthCheck = result;
    return result;
  }
}

/**
 * Get last health check result
 */
export function getLastHealthCheck(): HealthCheckResult | null {
  return lastHealthCheck;
}

/**
 * Get consecutive failure count
 */
export function getConsecutiveFailures(): number {
  return consecutiveFailures;
}

/**
 * Reset consecutive failures (for testing)
 */
export function resetConsecutiveFailures(): void {
  consecutiveFailures = 0;
}

/**
 * Start periodic health checks
 */
export function startHemnetHealthMonitor(intervalMs = 86400000): NodeJS.Timeout {
  console.log('[Hemnet Health Monitor] Starting periodic checks (every 24h)');
  
  // Run initial check
  checkHemnetStructure().then(result => {
    if (result.healthy) {
      console.log('[Hemnet Health Monitor] ✅ Initial check passed');
    } else {
      console.warn('[Hemnet Health Monitor] ⚠️  Initial check failed:', result.error);
    }
  });
  
  // Run periodic checks
  return setInterval(async () => {
    const result = await checkHemnetStructure();
    
    if (result.healthy) {
      console.log('[Hemnet Health Monitor] ✅ Health check passed');
    } else {
      console.warn('[Hemnet Health Monitor] ⚠️  Health check failed:', result.error);
    }
  }, intervalMs);
}
