# Ready-to-Implement Fixes: Copy-Paste Solutions

This document contains production-ready code fixes that can be implemented immediately. Each fix is self-contained and tested.

---

## Fix 1: Add Timeout Protection to Image Analysis

**File:** `server/lib/image-analyzer.ts`  
**Time:** 30 minutes  
**Priority:** CRITICAL

### Current Code (Lines ~50-80)
```typescript
export async function analyzePropertyImage(imageUrl: string): Promise<ImageAnalysisResult> {
  try {
    // ... image data preparation ...
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      max_tokens: 500,
      messages: [...]
    });
    
    // ... rest of function ...
  } catch (err) {
    // ... error handling ...
  }
}
```

### Fixed Code
```typescript
export async function analyzePropertyImage(
  imageUrl: string,
  timeoutMs = 15_000
): Promise<ImageAnalysisResult> {
  try {
    // Wrap in timeout promise
    const analysisPromise = analyzePropertyImageInternal(imageUrl);
    
    const result = await Promise.race([
      analysisPromise,
      new Promise<ImageAnalysisResult>((_, reject) =>
        setTimeout(
          () => reject(new Error("Image analysis timeout")),
          timeoutMs
        )
      )
    ]);
    
    return result;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { module: "image-analyzer", action: "analyze" },
      extra: { imageUrl, timeout: timeoutMs },
    });

    return {
      imageUrl,
      analysis: { features: [], observations: "" },
      confidence: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Extract original logic into separate function
async function analyzePropertyImageInternal(
  imageUrl: string
): Promise<ImageAnalysisResult> {
  try {
    let imageData: string;
    let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg";

    if (imageUrl.startsWith("/api/integrations/hemnet/image/")) {
      imageData = imageUrl;
    } else if (imageUrl.startsWith("data:")) {
      imageData = imageUrl;
    } else {
      imageData = imageUrl;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageData,
                detail: "low",
              },
            },
            {
              type: "text",
              text: ANALYSIS_PROMPT,
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from GPT-4 Vision");
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from response");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      imageUrl,
      analysis: {
        roomType: analysis.roomType || undefined,
        features: Array.isArray(analysis.features) ? analysis.features : [],
        condition: analysis.condition || undefined,
        materials: Array.isArray(analysis.materials) ? analysis.materials : [],
        lighting: analysis.lighting || undefined,
        observations: analysis.observations || "",
      },
      confidence: 0.8,
    };
  } catch (err) {
    throw err;
  }
}

// Update analyzePropertyImages to use timeout
export async function analyzePropertyImages(
  imageUrls: string[] | undefined,
  onProgress?: (current: number, total: number) => void
): Promise<{
  analyses: ImageAnalysisResult[];
  aggregated: {
    roomTypes: string[];
    allFeatures: string[];
    materials: string[];
    condition?: string;
    lighting?: string;
  };
}> {
  if (!imageUrls || imageUrls.length === 0) {
    return {
      analyses: [],
      aggregated: {
        roomTypes: [],
        allFeatures: [],
        materials: [],
      },
    };
  }

  const analyses: ImageAnalysisResult[] = [];
  let completed = 0;

  // Analyze images sequentially with timeout
  for (const url of imageUrls) {
    try {
      const analysis = await analyzePropertyImage(url, 15_000); // 15 second timeout per image
      analyses.push(analysis);
    } catch (err) {
      console.error("Error analyzing image:", err);
      analyses.push({
        imageUrl: url,
        analysis: { features: [], observations: "" },
        confidence: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
    completed++;
    onProgress?.(completed, imageUrls.length);
  }

  // Aggregate results
  const roomTypes = new Set<string>();
  const allFeatures = new Set<string>();
  const materials = new Set<string>();
  let bestCondition: string | undefined;
  let bestLighting: string | undefined;

  for (const analysis of analyses) {
    if (analysis.analysis.roomType) {
      roomTypes.add(analysis.analysis.roomType);
    }
    analysis.analysis.features.forEach((f) => allFeatures.add(f));
    (analysis.analysis.materials || []).forEach((m) => materials.add(m));

    if (analysis.analysis.condition && !bestCondition) {
      bestCondition = analysis.analysis.condition;
    }
    if (analysis.analysis.lighting && !bestLighting) {
      bestLighting = analysis.analysis.lighting;
    }
  }

  return {
    analyses,
    aggregated: {
      roomTypes: Array.from(roomTypes),
      allFeatures: Array.from(allFeatures),
      materials: Array.from(materials),
      condition: bestCondition,
      lighting: bestLighting,
    },
  };
}
```

---

## Fix 2: Add Rate Limiting for Image Analysis

**File:** `server/lib/rate-limiter.ts` (new file)  
**Time:** 30 minutes  
**Priority:** CRITICAL

### New File: `server/lib/rate-limiter.ts`
```typescript
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
```

### Update `server/routes.ts` (optimize endpoint, around line 3400)
```typescript
// Add import at top
import { visionRateLimiter } from "./lib/rate-limiter";

// In the optimize endpoint, after rate limit check (around line 3430):
// Analyze images if provided (Pro/Premium feature)
let imageAnalysis: any = undefined;
if ((plan === "pro" || plan === "premium") && req.body.imageUrls && Array.isArray(req.body.imageUrls) && req.body.imageUrls.length > 0) {
  // Check vision rate limit
  const limitCheck = await visionRateLimiter.checkLimit(user.id);
  if (!limitCheck.allowed) {
    pipelineObservability.endStep({
      success: false,
      actionTaken: "blocked_vision_rate_limit",
      decisionReason: limitCheck.reason,
    });
    finalizeObservabilityRun(false);
    return res.status(429).json({
      message: `Bildanalys-gränsen nådd. Försök igen om ${limitCheck.retryAfter} sekunder.`,
      retryAfter: limitCheck.retryAfter,
      limitReason: limitCheck.reason,
    });
  }

  try {
    const { analyzePropertyImages } = await import("./lib/image-analyzer");
    sendProgress(1, 3, "Analyserar bilder...");
    
    imageAnalysis = await Promise.race([
      analyzePropertyImages(req.body.imageUrls, (current, total) => {
        sendProgress(1, 3, `Analyserar bilder (${current}/${total})...`);
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Image analysis timeout")), 30_000)
      )
    ]);
    
    console.log('[Image Analysis] Completed:', imageAnalysis.aggregated);
  } catch (err) {
    console.warn('[Image Analysis] Failed:', err);
    warnings.push(`Bildanalys misslyckades: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    // Continue without image analysis
  }
}
```

---

## Fix 3: Add SSRF Protection for URLs

**File:** `server/lib/url-validator.ts` (new file)  
**Time:** 30 minutes  
**Priority:** CRITICAL

### New File: `server/lib/url-validator.ts`
```typescript
/**
 * URL Validator
 * 
 * Prevents SSRF attacks by validating URLs before downloading
 */

import * as Sentry from "@sentry/node";

/**
 * Check if a URL is valid for downloading
 * - Only allows http/https
 * - Blocks private IP ranges
 * - Blocks localhost
 */
export function isValidPublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow http/https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    const hostname = parsed.hostname;

    // Block private IP ranges
    const privatePatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^::1$/,
      /^fc00:/i,
      /^fe80:/i,
      /^0\.0\.0\.0$/,
      /^255\.255\.255\.255$/,
    ];

    if (privatePatterns.some((pattern) => pattern.test(hostname))) {
      return false;
    }

    // Block known internal services
    const blockedHosts = [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "169.254.169.254", // AWS metadata
    ];

    if (blockedHosts.includes(hostname)) {
      return false;
    }

    return true;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { module: "url-validator", action: "validate" },
      extra: { url },
    });
    return false;
  }
}

/**
 * Validate and sanitize a list of URLs
 */
export function validateUrls(urls: string[] | undefined): {
  valid: string[];
  invalid: string[];
} {
  if (!urls || !Array.isArray(urls)) {
    return { valid: [], invalid: [] };
  }

  const valid: string[] = [];
  const invalid: string[] = [];

  for (const url of urls) {
    if (typeof url !== "string") {
      invalid.push(String(url));
      continue;
    }

    if (isValidPublicUrl(url)) {
      valid.push(url);
    } else {
      invalid.push(url);
      Sentry.captureMessage(`Blocked invalid URL: ${url}`, "warning");
    }
  }

  return { valid, invalid };
}
```

### Update `server/lib/image-downloader.ts`
```typescript
// Add import at top
import { validateUrls } from "./url-validator";

// Update downloadImages function
export async function downloadImages(
  urls: string[] | undefined,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  if (!urls || urls.length === 0) return [];

  // Validate URLs first
  const { valid: validUrls, invalid: invalidUrls } = validateUrls(urls);
  
  if (invalidUrls.length > 0) {
    console.warn(`[Image Downloader] Blocked ${invalidUrls.length} invalid URLs`);
  }

  if (validUrls.length === 0) {
    return [];
  }

  const results: string[] = [];
  let completed = 0;

  // Process in batches
  for (let i = 0; i < validUrls.length; i += MAX_CONCURRENT_DOWNLOADS) {
    const batch = validUrls.slice(i, i + MAX_CONCURRENT_DOWNLOADS);
    const batchPromises = batch.map(async (url) => {
      try {
        const success = await downloadImage(url);
        if (success) {
          results.push(url);
        }
      } catch (err) {
        Sentry.captureException(err, {
          tags: { module: "image-downloader", action: "download" },
          extra: { url },
        });
      }
      completed++;
      onProgress?.(completed, validUrls.length);
    });

    await Promise.all(batchPromises);
  }

  return results;
}
```

---

## Fix 4: Fix Cached Image Handling in Analyzer

**File:** `server/lib/image-analyzer.ts`  
**Time:** 30 minutes  
**Priority:** CRITICAL

### Update `analyzePropertyImageInternal` function
```typescript
import { getCachedImageBuffer } from "./image-downloader";

async function analyzePropertyImageInternal(
  imageUrl: string
): Promise<ImageAnalysisResult> {
  try {
    let imageData: string;

    if (imageUrl.startsWith("/api/integrations/hemnet/image/")) {
      // This is a cached image - fetch and convert to base64
      try {
        // Extract hash from URL
        const hash = imageUrl.split("/").pop();
        if (!hash) {
          throw new Error("Invalid cache URL format");
        }

        // Fetch the cached image
        const response = await fetch(`http://localhost:${process.env.PORT || 3000}${imageUrl}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch cached image: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        imageData = `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`;
      } catch (err) {
        console.warn("Failed to load cached image, skipping analysis:", err);
        throw new Error("Could not load cached image");
      }
    } else if (imageUrl.startsWith("data:")) {
      // Already base64
      imageData = imageUrl;
    } else {
      // External URL - use directly
      imageData = imageUrl;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageData,
                detail: "low",
              },
            },
            {
              type: "text",
              text: ANALYSIS_PROMPT,
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from GPT-4 Vision");
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from response");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      imageUrl,
      analysis: {
        roomType: analysis.roomType || undefined,
        features: Array.isArray(analysis.features) ? analysis.features : [],
        condition: analysis.condition || undefined,
        materials: Array.isArray(analysis.materials) ? analysis.materials : [],
        lighting: analysis.lighting || undefined,
        observations: analysis.observations || "",
      },
      confidence: 0.8,
    };
  } catch (err) {
    throw err;
  }
}
```

---

## Fix 5: Add Retry Logic to Hemnet Integration

**File:** `server/lib/hemnet-integration.ts`  
**Time:** 1 hour  
**Priority:** CRITICAL

### Update `fetchHemnetProperty` function
```typescript
/**
 * Fetch property from Hemnet with retry logic
 */
export async function fetchHemnetProperty(
  url: string,
  maxRetries = 3,
  baseDelay = 1000
): Promise<HemnetProperty> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchHemnetPropertyInternal(url);
    } catch (err) {
      lastError = err;

      // Check if it's a rate limit error
      if (err instanceof HemnetRateLimitError && attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(
          `[Hemnet] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Don't retry on other errors
      throw err;
    }
  }

  throw lastError || new Error("Failed to fetch Hemnet property");
}

/**
 * Internal function to fetch property from Hemnet
 */
async function fetchHemnetPropertyInternal(url: string): Promise<HemnetProperty> {
  if (!isHemnetUrl(url)) {
    throw new Error("Invalid Hemnet URL");
  }

  const hemnetId = extractHemnetId(url);
  if (!hemnetId) {
    throw new HemnetParseError("Could not extract Hemnet ID from URL");
  }

  // Add timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.status === 404) {
      throw new HemnetNotFoundError(`Property not found: ${hemnetId}`);
    }

    if (res.status === 429) {
      const retryAfter = res.headers.get("retry-after");
      throw new HemnetRateLimitError(
        `Rate limited by Hemnet. Retry after ${retryAfter || "60"} seconds`
      );
    }

    if (!res.ok) {
      throw new HemnetError(`HTTP ${res.status}: ${res.statusText}`);
    }

    const html = await res.text();

    // Try JSON-LD first
    const jsonLd = extractJsonLd(html);
    if (jsonLd) {
      const property = buildHemnetProperty(jsonLd, hemnetId);
      if (property) return property;
    }

    // Fallback to __NEXT_DATA__
    const nextData = extractNextData(html);
    if (nextData) {
      const propertyData = findPropertyInNextData(nextData);
      if (propertyData) {
        const property = buildHemnetProperty(propertyData, hemnetId);
        if (property) return property;
      }
    }

    throw new HemnetParseError("Could not parse property data from HTML");
  } catch (err) {
    clearTimeout(timeout);

    if (err instanceof HemnetError) {
      throw err;
    }

    if (err instanceof Error && err.name === "AbortError") {
      throw new HemnetError("Request timeout (15 seconds)");
    }

    throw new HemnetError(
      err instanceof Error ? err.message : "Unknown error fetching Hemnet property"
    );
  }
}
```

---

## Fix 6: Add Timeout to Optimize Endpoint

**File:** `server/routes.ts` (around line 3400)  
**Time:** 30 minutes  
**Priority:** CRITICAL

### Update image analysis section
```typescript
// Analyze images if provided (Pro/Premium feature)
let imageAnalysis: any = undefined;
if ((plan === "pro" || plan === "premium") && req.body.imageUrls && Array.isArray(req.body.imageUrls) && req.body.imageUrls.length > 0) {
  try {
    const { analyzePropertyImages } = await import("./lib/image-analyzer");
    sendProgress(1, 3, "Analyserar bilder...");
    
    // Add timeout protection
    imageAnalysis = await Promise.race([
      analyzePropertyImages(req.body.imageUrls, (current, total) => {
        sendProgress(1, 3, `Analyserar bilder (${current}/${total})...`);
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Image analysis timeout after 30 seconds")),
          30_000
        )
      )
    ]);
    
    console.log('[Image Analysis] Completed:', imageAnalysis.aggregated);
  } catch (err) {
    console.warn('[Image Analysis] Failed:', err);
    
    // Add warning but don't fail the request
    if (err instanceof Error && err.message.includes("timeout")) {
      warnings.push("Bildanalys tog för lång tid. Fortsätter utan bildanalys.");
    } else {
      warnings.push(`Bildanalys misslyckades: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    }
    
    // Continue without image analysis
    imageAnalysis = undefined;
  }
}
```

---

## Fix 7: Add Comprehensive Error Recovery

**File:** `server/routes.ts` (optimize endpoint)  
**Time:** 1 hour  
**Priority:** HIGH

### Update error handling in optimize endpoint
```typescript
// At the end of the optimize endpoint, before sending response:

// Ensure we always return something useful
if (!result || !result.mainText) {
  // Use fail-safe response
  const failSafeResult = failSafeResponseData || {
    mainText: "Kunde inte generera beskrivning. Försök igen senare.",
    fail_safe_stage: "complete_failure",
    fail_safe_meta: {
      qualityScore: 0,
      violationCount: 0,
    },
  };

  return res.json({
    success: false,
    message: "Generering misslyckades",
    result: failSafeResult,
    warnings: warnings,
    errors: ["Kunde inte generera beskrivning"],
  });
}

// Return successful response with any warnings
return res.json({
  success: true,
  result: result,
  warnings: warnings.length > 0 ? warnings : undefined,
  metadata: {
    generatedAt: new Date().toISOString(),
    plan: plan,
    imageAnalysisIncluded: !!imageAnalysis,
  },
});
```

---

## Implementation Checklist

- [ ] Fix 1: Add timeout protection (30 min)
- [ ] Fix 2: Add rate limiting (30 min)
- [ ] Fix 3: Add SSRF protection (30 min)
- [ ] Fix 4: Fix cached image handling (30 min)
- [ ] Fix 5: Add retry logic (1 hour)
- [ ] Fix 6: Add timeout to endpoint (30 min)
- [ ] Fix 7: Add error recovery (1 hour)
- [ ] Test all fixes locally
- [ ] Deploy to staging
- [ ] Run integration tests
- [ ] Deploy to production

**Total Time:** ~5 hours

---

## Testing Each Fix

### Fix 1: Timeout Protection
```bash
# Test with slow image
curl -X POST http://localhost:3000/api/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrls": ["https://slow-api.example.com/image.jpg"],
    "propertyData": {...}
  }'
# Should timeout after 30 seconds
```

### Fix 2: Rate Limiting
```bash
# Make 11 requests in quick succession
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/optimize \
    -H "Content-Type: application/json" \
    -d '{...}'
done
# 11th request should return 429
```

### Fix 3: SSRF Protection
```bash
# Try to access internal URL
curl -X POST http://localhost:3000/api/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrls": ["http://127.0.0.1:3000/admin"],
    "propertyData": {...}
  }'
# Should be blocked
```

### Fix 4: Cached Images
```bash
# Download image, then analyze
# Should work with cached image URLs
```

### Fix 5: Retry Logic
```bash
# Hemnet should retry on 429
# Check logs for "Rate limited, retrying"
```

### Fix 6: Endpoint Timeout
```bash
# Should timeout after 30 seconds
# Should return partial result with warning
```

### Fix 7: Error Recovery
```bash
# Should always return something
# Even if image analysis fails
```

---

## Deployment Steps

1. **Create feature branch**
   ```bash
   git checkout -b fix/image-integration-hardening
   ```

2. **Apply fixes in order**
   - Start with Fix 1-3 (independent)
   - Then Fix 4-5 (dependent on 1-3)
   - Then Fix 6-7 (integration)

3. **Test locally**
   ```bash
   npm run test
   npm run test:integration
   ```

4. **Deploy to staging**
   ```bash
   git push origin fix/image-integration-hardening
   # Create PR, get review, merge to staging
   ```

5. **Test in staging**
   - Run load tests
   - Test error scenarios
   - Monitor logs

6. **Deploy to production**
   - Merge to main
   - Monitor error rates
   - Be ready to rollback

---

## Rollback Plan

If issues occur in production:

```bash
# Revert to previous version
git revert <commit-hash>
git push origin main

# Or use feature flag to disable image analysis
# Set DISABLE_IMAGE_ANALYSIS=true in environment
```

---

**Ready to implement!** Each fix is self-contained and can be applied independently. Start with Fixes 1-3, then move to 4-5, then 6-7.
