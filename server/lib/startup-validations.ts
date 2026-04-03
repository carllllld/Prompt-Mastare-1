/**
 * Startup Validations
 * 
 * Validates critical integrations on server startup to catch configuration
 * errors early before they cause runtime failures.
 */

import OpenAI from "openai";
import { isAIConfigured, getActiveProvider, getProviderName } from "./ai-client";
import Stripe from "stripe";
import * as Sentry from "@sentry/node";

interface ValidationResult {
  service: string;
  valid: boolean;
  error?: string;
  latencyMs?: number;
}

/**
 * Validate OpenAI API key on startup
 */
export async function validateOpenAIKey(): Promise<ValidationResult> {
  const start = Date.now();
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return {
      service: "OpenAI",
      valid: false,
      error: "OPENAI_API_KEY not configured",
    };
  }
  
  try {
    const openai = new OpenAI({ apiKey });
    await openai.models.list();
    
    return {
      service: "OpenAI",
      valid: true,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      service: "OpenAI",
      valid: false,
      error: errorMessage,
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Validate Stripe price IDs on startup
 */
export async function validateStripePriceIds(): Promise<ValidationResult> {
  const start = Date.now();
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID;
  
  if (!secretKey) {
    return {
      service: "Stripe",
      valid: false,
      error: "STRIPE_SECRET_KEY not configured",
    };
  }
  
  if (!proPriceId || !premiumPriceId) {
    return {
      service: "Stripe",
      valid: false,
      error: "STRIPE_PRO_PRICE_ID or STRIPE_PREMIUM_PRICE_ID not configured",
    };
  }
  
  try {
    const stripe = new Stripe(secretKey, { apiVersion: "2023-10-16" });
    
    // Validate Pro price ID
    await stripe.prices.retrieve(proPriceId);
    
    // Validate Premium price ID
    await stripe.prices.retrieve(premiumPriceId);
    
    return {
      service: "Stripe",
      valid: true,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      service: "Stripe",
      valid: false,
      error: errorMessage,
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Run all startup validations
 */
export async function runStartupValidations(): Promise<{
  allValid: boolean;
  results: ValidationResult[];
}> {
  console.log("[Startup] Running integration validations...");
  
  const results: ValidationResult[] = [];
  
  // Validate OpenAI
  const openaiResult = await validateOpenAIKey();
  results.push(openaiResult);
  
  if (openaiResult.valid) {
    console.log(`✅ OpenAI API key valid (${openaiResult.latencyMs}ms)`);
  } else {
    console.error(`❌ OpenAI API key invalid: ${openaiResult.error}`);
    Sentry.captureMessage(`OpenAI API key validation failed: ${openaiResult.error}`, "error");
  }
  
  // Validate Stripe
  const stripeResult = await validateStripePriceIds();
  results.push(stripeResult);
  
  if (stripeResult.valid) {
    console.log(`✅ Stripe price IDs valid (${stripeResult.latencyMs}ms)`);
  } else {
    console.error(`❌ Stripe price IDs invalid: ${stripeResult.error}`);
    Sentry.captureMessage(`Stripe price ID validation failed: ${stripeResult.error}`, "error");
  }
  
  const allValid = results.every(r => r.valid);
  
  if (!allValid) {
    console.error("[Startup] ⚠️  Some integrations failed validation. Server will continue but features may not work.");
  } else {
    console.log("[Startup] ✅ All integrations validated successfully");
  }
  
  return { allValid, results };
}
