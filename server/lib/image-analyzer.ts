/**
 * Image Analyzer
 *
 * Uses GPT-4 Vision to analyze property images and extract relevant
 * real estate information that can be used in property descriptions.
 *
 * Focus: Only extract information that is:
 * - Relevant to Swedish real estate descriptions
 * - Legally appropriate (no personal items, decorations, etc.)
 * - Factual and observable (not subjective impressions)
 */

import { getOpenAIClient } from "./ai-client";
import * as Sentry from "@sentry/node";
import * as fs from "fs";
import * as path from "path";

// Vision requires OpenAI (GPT-4o) — Claude doesn't have equivalent vision API
const openai = getOpenAIClient();

export interface ImageAnalysisResult {
  imageUrl: string;
  analysis: {
    roomType?: string; // "kök", "badrum", "sovrum", etc.
    features: string[]; // Observable features relevant to real estate
    condition?: string; // "bra", "mycket bra", "utmärkt", etc.
    materials?: string[]; // "parkett", "klinker", "marmor", etc.
    lighting?: string; // "naturligt ljus", "väl belyst", etc.
    observations: string; // Free-form observations
  };
  confidence: number; // 0-1 score for how confident the analysis is
  error?: string;
}

// Prompt for GPT-4 Vision to analyze property images
const ANALYSIS_PROMPT = `Du är en expert på svenska fastighetsannonser. Analysera denna bild från en fastighet och extrahera ENDAST information som är relevant för en professionell mäklarbeskrivning.

VIKTIGT: Fokusera ENDAST på:
- Rumstyp (kök, badrum, sovrum, vardagsrum, etc.)
- Observerbara arkitektoniska/konstruktiva detaljer (högt i tak, öppen planlösning, etc.)
- Material och ytskikt (parkett, klinker, marmor, etc.)
- Ljusförhållanden (naturligt ljus, väl belyst, etc.)
- Allmän skick/tillstånd (renoverat, väl underhållet, etc.)
- Utsikt eller läge (om relevant)

IGNORERA HELT:
- Möbler, inredning, dekoration
- Personliga föremål
- Människor eller husdjur
- Växter eller blommor
- Bilder på väggarna
- Något som är tillfälligt eller inte permanent

Svara på JSON-format:
{
  "roomType": "typ av rum eller null",
  "features": ["feature1", "feature2"],
  "condition": "skick eller null",
  "materials": ["material1", "material2"],
  "lighting": "ljusförhållanden eller null",
  "observations": "kort sammanfattning av vad som är relevant för mäklarbeskrivningen"
}`;

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

    if (imageUrl.startsWith("/api/integrations/hemnet/image/")) {
      // This is a cached image - fetch and convert to base64
      try {
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
      model: "gpt-4o",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageData,
                detail: "auto",
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
      confidence: analysis.features && analysis.features.length > 0 ? 0.85 : 0.5,
    };
  } catch (err) {
    throw err;
  }
}

// Analyze multiple images and aggregate results
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

  // Analyze images sequentially with timeout to avoid rate limits
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

    // Keep the best condition/lighting descriptions
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
