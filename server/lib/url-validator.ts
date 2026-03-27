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
