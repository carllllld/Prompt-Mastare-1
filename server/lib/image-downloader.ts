/**
 * Image Downloader
 *
 * Optimized image downloading with:
 * - Parallel downloads with concurrency control
 * - Caching to avoid re-downloading
 * - Timeout and retry logic
 * - Size optimization
 * - Progress tracking
 * - SSRF protection
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as Sentry from "@sentry/node";
import { validateUrls } from "./url-validator";

const CACHE_DIR = process.env.IMAGE_CACHE_DIR || 
  path.join(process.env.HOME || "/tmp", ".optiprompt-cache");
const MAX_CONCURRENT_DOWNLOADS = 3;
const DOWNLOAD_TIMEOUT = 15_000; // 15 seconds per image
const MAX_RETRIES = 2;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure cache directory exists
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

// Generate cache key from URL
export function getCacheKey(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex");
}

// Get cached image path
export function getCachePath(url: string): string {
  const key = getCacheKey(url);
  return path.join(CACHE_DIR, key);
}

// Check if image is cached and valid
function isCached(url: string): boolean {
  const cachePath = getCachePath(url);
  if (!fs.existsSync(cachePath)) return false;
  
  const stats = fs.statSync(cachePath);
  // Cache for 7 days
  const cacheAge = Date.now() - stats.mtimeMs;
  return cacheAge < 7 * 24 * 60 * 60 * 1000;
}

// Download single image with retry logic
async function downloadImageWithRetry(
  url: string,
  retries = MAX_RETRIES
): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/*",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      // Handle rate limiting with longer backoff
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") || "60");
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
          return downloadImageWithRetry(url, retries - 1);
        }
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const contentType = res.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      throw new Error("Not an image");
    }

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_SIZE) {
      throw new Error(`Image too large: ${buffer.byteLength} bytes`);
    }

    return Buffer.from(buffer);
  } catch (err) {
    if (retries > 0 && !(err instanceof Error && err.message.includes("HTTP 429"))) {
      // Exponential backoff: 100ms, 200ms, 400ms
      const delay = 100 * Math.pow(2, MAX_RETRIES - retries);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return downloadImageWithRetry(url, retries - 1);
    }
    return null;
  }
}

// Cache image to disk
function cacheImage(url: string, buffer: Buffer): void {
  try {
    ensureCacheDir();
    const cachePath = getCachePath(url);
    fs.writeFileSync(cachePath, buffer);
  } catch (err) {
    Sentry.captureException(err, { tags: { module: "image-downloader", action: "cache" } });
  }
}

// Download image and cache it
async function downloadImage(url: string): Promise<boolean> {
  // Check cache first
  if (isCached(url)) return true;

  // Download
  const buffer = await downloadImageWithRetry(url);
  if (!buffer) return false;

  // Cache for future use
  cacheImage(url, buffer);
  return true;
}

// Download multiple images with concurrency control
export async function downloadImages(
  urls: string[] | undefined,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  if (!urls || urls.length === 0) return [];

  // Validate URLs first (SSRF protection)
  const { valid: validUrls, invalid: invalidUrls } = validateUrls(urls);
  
  if (invalidUrls.length > 0) {
    console.warn(`[Image Downloader] Blocked ${invalidUrls.length} invalid URLs`);
    Sentry.captureMessage(
      `Blocked ${invalidUrls.length} invalid URLs in image download`,
      "warning"
    );
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

// Get cached image as buffer (for serving)
export function getCachedImageBuffer(url: string): Buffer | null {
  if (!isCached(url)) return null;
  try {
    const cachePath = getCachePath(url);
    return fs.readFileSync(cachePath);
  } catch (err) {
    Sentry.captureException(err, { tags: { module: "image-downloader", action: "getCached" } });
    return null;
  }
}

// Clear old cache entries (older than 7 days)
export function cleanupCache(): void {
  try {
    ensureCacheDir();
    const files = fs.readdirSync(CACHE_DIR);
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { module: "image-downloader", action: "cleanup" } });
  }
}
