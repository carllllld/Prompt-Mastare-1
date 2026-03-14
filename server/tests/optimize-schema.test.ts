import { describe, expect, it } from "vitest";
import { optimizeRequestSchema } from "@shared/schema";

describe("optimizeRequestSchema hardening", () => {
  it("normalizes platform casing and accepts a valid request", () => {
    const parsed = optimizeRequestSchema.parse({
      prompt: "  Testprompt  ",
      type: "listing",
      platform: "HEMNET",
      writingStyle: "balanced",
      wordCountMin: 180,
      wordCountMax: 320,
      imageUrls: ["https://example.com/image-1.jpg"],
    });

    expect(parsed.platform).toBe("hemnet");
    expect(parsed.prompt).toBe("Testprompt");
  });

  it("rejects invalid platform", () => {
    const result = optimizeRequestSchema.safeParse({
      prompt: "x",
      type: "listing",
      platform: "blocket",
      writingStyle: "balanced",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid image urls and too many images", () => {
    const badUrl = optimizeRequestSchema.safeParse({
      prompt: "x",
      type: "listing",
      platform: "hemnet",
      writingStyle: "balanced",
      imageUrls: ["notaurl"],
    });
    expect(badUrl.success).toBe(false);

    const tooMany = optimizeRequestSchema.safeParse({
      prompt: "x",
      type: "listing",
      platform: "hemnet",
      writingStyle: "balanced",
      imageUrls: [
        "https://example.com/1.jpg",
        "https://example.com/2.jpg",
        "https://example.com/3.jpg",
        "https://example.com/4.jpg",
        "https://example.com/5.jpg",
        "https://example.com/6.jpg",
      ],
    });
    expect(tooMany.success).toBe(false);
  });

  it("rejects reversed word interval", () => {
    const result = optimizeRequestSchema.safeParse({
      prompt: "x",
      type: "listing",
      platform: "hemnet",
      writingStyle: "balanced",
      wordCountMin: 500,
      wordCountMax: 300,
    });

    expect(result.success).toBe(false);
  });

  it("rejects oversized propertyData payload", () => {
    const propertyData = Object.fromEntries(Array.from({ length: 121 }, (_, index) => [`k${index}`, index]));
    const result = optimizeRequestSchema.safeParse({
      prompt: "x",
      type: "listing",
      platform: "hemnet",
      writingStyle: "balanced",
      propertyData,
    });

    expect(result.success).toBe(false);
  });
});
