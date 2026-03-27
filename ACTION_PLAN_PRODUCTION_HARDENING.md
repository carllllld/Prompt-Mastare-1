# Action Plan: Production Hardening for Image Integration

**Status:** Ready for implementation  
**Total Estimated Effort:** 12-15 hours  
**Priority:** Critical before production deployment

---

## Phase 1: Critical Fixes (Must Do)

### 1.1 Add Timeout Protection to Image Analysis
**File:** `server/lib/image-analyzer.ts`  
**Issue:** Image analysis can hang indefinitely  
**Impact:** User requests could timeout, poor UX  
**Effort:** 1 hour

**Changes:**
- Add timeout wrapper to `analyzePropertyImage()`
- Add timeout wrapper to `analyzePropertyImages()`
- Return graceful error if timeout exceeded
- Log timeout events to Sentry

**Code Pattern:**
```typescript
async function analyzePropertyImageWithTimeout(
  imageUrl: string,
  timeoutMs = 15_000
): Promise<ImageAnalysisResult> {
  return Promise.race([
    analyzePropertyImage(imageUrl),
    new Promise<ImageAnalysisResult>((_, reject) =>
      setTimeout(() => reject(new Error("Image analysis timeout")), timeoutMs)
    )
  ]).catch(err => ({
    imageUrl,
    analysis: { features: [], observations: "" },
    confidence: 0,
    error: err instanceof Error ? err.message : "Unknown error"
  }));
}
```

---

### 1.2 Implement Rate Limiting for Image Analysis
**File:** `server/lib/image-analyzer.ts` + `server/routes.ts`  
**Issue:** No protection against quota exhaustion  
**Impact:** Unexpected costs, service degradation  
**Effort:** 2 hours

**Changes:**
- Create rate limiter for vision API calls
- Track per-user analysis quota
- Return error if quota exceeded
- Log quota violations

**Implementation:**
```typescript
// server/lib/rate-limiter.ts (new)
export class VisionRateLimiter {
  private userLimits = new Map<string, { count: number; resetAt: number }>();
  
  async checkLimit(userId: string, maxPerMinute = 10): Promise<boolean> {
    const now = Date.now();
    const limit = this.userLimits.get(userId);
    
    if (!limit || now > limit.resetAt) {
      this.userLimits.set(userId, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    
    if (limit.count >= maxPerMinute) return false;
    limit.count++;
    return true;
  }
}

// In routes.ts optimize endpoint:
const visionLimiter = new VisionRateLimiter();
if (!(await visionLimiter.checkLimit(user.id))) {
  return res.status(429).json({
    message: "Bildanalys-gränsen nådd. Försök igen senare.",
    retryAfter: 60
  });
}
```

---

### 1.3 Add SSRF Protection for URL Validation
**File:** `server/lib/image-downloader.ts` + `server/lib/hemnet-integration.ts`  
**Issue:** No validation of URLs before downloading  
**Impact:** Potential SSRF attacks  
**Effort:** 1 hour

**Changes:**
- Validate URLs before downloading
- Block private IP ranges
- Block localhost and internal services
- Log suspicious URLs

**Implementation:**
```typescript
// server/lib/url-validator.ts (new)
export function isValidPublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    
    // Block private IPs
    const hostname = parsed.hostname;
    const privateRanges = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ];
    
    if (privateRanges.some(range => range.test(hostname))) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// Usage in image-downloader.ts:
export async function downloadImages(urls: string[] | undefined): Promise<string[]> {
  if (!urls) return [];
  
  const validUrls = urls.filter(url => {
    if (!isValidPublicUrl(url)) {
      Sentry.captureMessage(`Blocked invalid URL: ${url}`, 'warning');
      return false;
    }
    return true;
  });
  
  // ... rest of download logic
}
```

---

### 1.4 Fix Image URL Handling in Analyzer
**File:** `server/lib/image-analyzer.ts`  
**Issue:** Cached images won't work with OpenAI  
**Impact:** Image analysis fails for cached images  
**Effort:** 1 hour

**Changes:**
- Convert cached images to base64
- Handle both external and cached URLs
- Add proper error handling

**Implementation:**
```typescript
import { getCachedImageBuffer } from "./image-downloader";

export async function analyzePropertyImage(imageUrl: string): Promise<ImageAnalysisResult> {
  try {
    let imageData: string;
    let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg";

    if (imageUrl.startsWith("/api/integrations/hemnet/image/")) {
      // Extract hash from URL and get cached image
      const hash = imageUrl.split('/').pop();
      if (!hash) throw new Error("Invalid cache URL");
      
      // Reconstruct original URL from cache (need to store mapping)
      // For now, fetch from cache endpoint
      const response = await fetch(`http://localhost:3000${imageUrl}`);
      const buffer = await response.arrayBuffer();
      imageData = `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`;
    } else if (imageUrl.startsWith("data:")) {
      imageData = imageUrl;
    } else {
      imageData = imageUrl;
    }

    // ... rest of analysis
  } catch (err) {
    // ... error handling
  }
}
```

---

### 1.5 Add Retry Logic to Hemnet Integration
**File:** `server/lib/hemnet-integration.ts`  
**Issue:** No retry on rate limiting  
**Impact:** Failures when Hemnet is busy  
**Effort:** 2 hours

**Changes:**
- Implement exponential backoff for 429 responses
- Respect Retry-After header
- Add max retry attempts
- Log retry attempts

**Implementation:**
```typescript
async function fetchHemnetPropertyWithRetry(
  url: string,
  maxRetries = 3,
  baseDelay = 1000
): Promise<HemnetProperty> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchHemnetProperty(url);
    } catch (err) {
      if (err instanceof HemnetRateLimitError && attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[Hemnet] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

// In fetchHemnetProperty:
if (res.status === 429) {
  const retryAfter = parseInt(res.headers.get("retry-after") || "60");
  throw new HemnetRateLimitError(`Rate limited. Retry after ${retryAfter}s`);
}
```

---

## Phase 2: Important Improvements (Do Soon After)

### 2.1 Implement Comprehensive Error Recovery
**File:** `server/routes.ts` (optimize endpoint)  
**Issue:** Limited fallback strategies  
**Impact:** Better user experience on failures  
**Effort:** 3 hours

**Changes:**
- Add fallback for failed image downloads
- Add fallback for failed image analysis
- Provide partial results when possible
- Clear error messages to users

**Implementation:**
```typescript
// In optimize endpoint:
let imageAnalysis: any = undefined;
if ((plan === "pro" || plan === "premium") && req.body.imageUrls?.length > 0) {
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
  } catch (err) {
    console.warn('[Image Analysis] Failed:', err);
    // Continue without image analysis - don't fail the whole request
    warnings.push(`Bildanalys misslyckades: ${err instanceof Error ? err.message : 'Okänt fel'}`);
  }
}

// Return warnings to user
return res.json({
  ...result,
  warnings: warnings.length > 0 ? warnings : undefined
});
```

---

### 2.2 Add Metrics Collection
**File:** New `server/lib/metrics.ts`  
**Issue:** No visibility into system performance  
**Impact:** Better monitoring and debugging  
**Effort:** 2 hours

**Changes:**
- Track image download success rate
- Track image analysis success rate
- Track cache hit rate
- Track average timings

**Implementation:**
```typescript
// server/lib/metrics.ts (new)
export class MetricsCollector {
  private metrics = {
    imageDownloads: { success: 0, failed: 0, totalTime: 0 },
    imageAnalysis: { success: 0, failed: 0, totalTime: 0 },
    cacheHits: 0,
    cacheMisses: 0,
  };

  recordImageDownload(success: boolean, timeMs: number) {
    if (success) {
      this.metrics.imageDownloads.success++;
    } else {
      this.metrics.imageDownloads.failed++;
    }
    this.metrics.imageDownloads.totalTime += timeMs;
  }

  recordCacheHit(hit: boolean) {
    if (hit) this.metrics.cacheHits++;
    else this.metrics.cacheMisses++;
  }

  getMetrics() {
    return {
      ...this.metrics,
      downloadSuccessRate: this.metrics.imageDownloads.success / 
        (this.metrics.imageDownloads.success + this.metrics.imageDownloads.failed),
      cacheHitRate: this.metrics.cacheHits / 
        (this.metrics.cacheHits + this.metrics.cacheMisses),
      avgDownloadTime: this.metrics.imageDownloads.totalTime / 
        this.metrics.imageDownloads.success,
    };
  }
}

export const metrics = new MetricsCollector();
```

---

### 2.3 Optimize Image Compression
**File:** New `server/lib/image-optimizer.ts`  
**Issue:** Large images slow down downloads  
**Impact:** Faster downloads, reduced bandwidth  
**Effort:** 2 hours

**Changes:**
- Compress images before caching
- Support multiple formats (JPEG, WebP)
- Maintain quality while reducing size
- Add compression metrics

**Implementation:**
```typescript
// server/lib/image-optimizer.ts (new)
import sharp from 'sharp';

export async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .resize(1920, 1440, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();
  } catch (err) {
    console.warn('Image optimization failed, using original:', err);
    return buffer;
  }
}

// In image-downloader.ts:
function cacheImage(url: string, buffer: Buffer): void {
  try {
    ensureCacheDir();
    const optimized = await optimizeImage(buffer);
    const cachePath = getCachePath(url);
    fs.writeFileSync(cachePath, optimized);
  } catch (err) {
    Sentry.captureException(err);
  }
}
```

---

### 2.4 Add Integration Tests
**File:** New `server/tests/integrations.test.ts`  
**Issue:** No automated testing of integration flows  
**Impact:** Catch regressions early  
**Effort:** 4 hours

**Changes:**
- Test Hemnet URL parsing
- Test image download flow
- Test image analysis flow
- Test error handling

**Implementation:**
```typescript
// server/tests/integrations.test.ts (new)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fetchHemnetProperty } from '../lib/hemnet-integration';
import { downloadImages } from '../lib/image-downloader';
import { analyzePropertyImages } from '../lib/image-analyzer';

describe('Hemnet Integration', () => {
  it('should parse valid Hemnet URL', async () => {
    const property = await fetchHemnetProperty('https://www.hemnet.se/...');
    expect(property.address).toBeDefined();
    expect(property.images).toBeInstanceOf(Array);
  });

  it('should handle 404 gracefully', async () => {
    expect(() => fetchHemnetProperty('https://www.hemnet.se/invalid')).rejects.toThrow();
  });
});

describe('Image Downloader', () => {
  it('should download images in parallel', async () => {
    const urls = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'];
    const results = await downloadImages(urls);
    expect(results.length).toBe(2);
  });

  it('should use cache for repeated downloads', async () => {
    const url = 'https://example.com/image.jpg';
    await downloadImages([url]);
    const start = Date.now();
    await downloadImages([url]);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100); // Should be instant from cache
  });
});

describe('Image Analyzer', () => {
  it('should analyze property images', async () => {
    const result = await analyzePropertyImages(['https://example.com/kitchen.jpg']);
    expect(result.aggregated.roomTypes).toContain('kök');
  });

  it('should timeout after 30 seconds', async () => {
    // Mock slow API
    expect(() => analyzePropertyImages(['https://slow-api.example.com/image.jpg'])).rejects.toThrow('timeout');
  });
});
```

---

### 2.5 Improve Observability
**File:** `server/lib/image-downloader.ts`, `server/lib/image-analyzer.ts`  
**Issue:** Limited logging and tracing  
**Impact:** Better debugging and monitoring  
**Effort:** 2 hours

**Changes:**
- Add structured logging
- Add performance tracing
- Add user journey tracking
- Add error context

**Implementation:**
```typescript
// Add to image-downloader.ts:
import * as Sentry from "@sentry/node";

export async function downloadImages(urls: string[]): Promise<string[]> {
  const transaction = Sentry.startTransaction({
    op: "image.download",
    name: "Download property images",
    data: { imageCount: urls.length }
  });

  try {
    const startTime = Date.now();
    const results = await downloadImagesInternal(urls);
    const duration = Date.now() - startTime;
    
    transaction.setData("success_count", results.length);
    transaction.setData("duration_ms", duration);
    transaction.setStatus("ok");
    
    Sentry.captureMessage(
      `Downloaded ${results.length}/${urls.length} images in ${duration}ms`,
      'info'
    );
    
    return results;
  } catch (err) {
    transaction.setStatus("error");
    Sentry.captureException(err, { contexts: { transaction } });
    throw err;
  } finally {
    transaction.finish();
  }
}
```

---

## Phase 3: Nice to Have (Future)

### 3.1 Implement Image CDN Caching
- Use Cloudflare or S3 for cached images
- Reduce server load
- Faster delivery to users

### 3.2 Add Parallel Image Analysis with Rate Limiting
- Batch images for analysis
- Reduce total analysis time
- Maintain rate limit compliance

### 3.3 Create Admin Dashboard
- Monitor system health
- View metrics and alerts
- Manage user quotas

### 3.4 Implement Image Optimization Pipeline
- Automatic format selection (JPEG vs WebP)
- Adaptive quality based on network
- Progressive image loading

---

## Implementation Timeline

### Week 1: Critical Fixes
- Day 1-2: Timeout protection + Rate limiting (3 hours)
- Day 3: SSRF protection + URL handling (2 hours)
- Day 4: Retry logic (2 hours)
- Day 5: Testing and integration (2 hours)

### Week 2: Important Improvements
- Day 1-2: Error recovery (3 hours)
- Day 3: Metrics collection (2 hours)
- Day 4: Image compression (2 hours)
- Day 5: Integration tests (4 hours)

### Week 3: Polish
- Day 1-2: Observability improvements (2 hours)
- Day 3-5: Testing, documentation, deployment prep

---

## Success Criteria

### Phase 1 Complete When:
- [ ] All image analysis requests have timeout protection
- [ ] Rate limiting prevents quota exhaustion
- [ ] SSRF protection blocks private IPs
- [ ] Cached images work with OpenAI
- [ ] Hemnet rate limiting is handled gracefully

### Phase 2 Complete When:
- [ ] Failed image downloads don't block text generation
- [ ] Metrics are collected and visible
- [ ] Images are compressed before caching
- [ ] Integration tests pass
- [ ] Observability is improved

### Production Ready When:
- [ ] All Phase 1 items complete
- [ ] All Phase 2 items complete
- [ ] Load testing passes (100+ concurrent users)
- [ ] Error rate < 1%
- [ ] Average response time < 5 seconds

---

## Risk Mitigation

### Risk: Image Analysis Quota Exhaustion
- **Mitigation:** Rate limiting + quota tracking
- **Fallback:** Disable image analysis if quota exceeded

### Risk: Hemnet Rate Limiting
- **Mitigation:** Exponential backoff + retry logic
- **Fallback:** Use cached data if available

### Risk: SSRF Attacks
- **Mitigation:** URL validation + private IP blocking
- **Fallback:** Whitelist known image hosts

### Risk: Performance Degradation
- **Mitigation:** Metrics collection + monitoring
- **Fallback:** Disable image features if performance drops

---

## Rollout Strategy

### Stage 1: Internal Testing (1 week)
- Deploy to staging environment
- Run integration tests
- Load test with 50 concurrent users

### Stage 2: Beta Users (1 week)
- Deploy to production with feature flag
- Enable for 10% of Pro/Premium users
- Monitor error rates and performance

### Stage 3: Full Rollout (1 week)
- Enable for all Pro/Premium users
- Monitor for 1 week
- Gather user feedback

### Stage 4: Optimization (Ongoing)
- Implement Phase 3 improvements
- Optimize based on metrics
- Continuous monitoring

---

## Conclusion

This action plan provides a clear path to production-ready image integration. The critical fixes (Phase 1) address security, reliability, and performance concerns. The important improvements (Phase 2) add robustness and observability. Together, they transform the current implementation from "good foundation" to "production-ready system."

**Estimated Total Effort:** 12-15 hours  
**Recommended Start:** Immediately  
**Target Completion:** 2-3 weeks
