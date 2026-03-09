/**
 * OpenAI Client med Enterprise Resilience
 * Circuit breaker + retry + observability integration
 */

import { openAICircuitBreaker } from "./circuit-breaker";
import { withRetry, RetryConfigs, resilientAPICall, type RetryResult } from "./retry-utils";
import { pipelineObservability } from "./listing-pipeline-observability";
import OpenAI from "openai";

// Global OpenAI instance
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface OpenAICallOptions {
  operation: string;
  timeoutMs?: number;
  maxRetries?: number;
  trackTokens?: boolean;
}

export interface OpenAIResult<T> extends RetryResult<T> {
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  costUsd?: number;
}

// Token cost per 1K tokens (GPT-4.1 pricing approximation)
const TOKEN_COSTS = {
  "gpt-4.1": { input: 0.002, output: 0.008 },
  "gpt-4.1-mini": { input: 0.0005, output: 0.002 },
  "gpt-5.2": { input: 0.001, output: 0.004 }, // Approximate
};

/**
 * Make resilient OpenAI API call with full enterprise protection
 */
export async function makeOpenAICall<T>(
  fn: () => Promise<T>,
  options: OpenAICallOptions
): Promise<OpenAIResult<T>> {
  const startTime = Date.now();
  const { operation, timeoutMs = 30000, maxRetries, trackTokens = true } = options;

  // Track in observability
  pipelineObservability.startStep(operation, "ai-call");

  try {
    // Use circuit breaker + retry
    const result = await openAICircuitBreaker.execute(async () => {
      return await withRetry(
        async () => {
          // Add timeout
          const timeoutPromise = new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error(`OpenAI timeout after ${timeoutMs}ms`)), timeoutMs);
          });

          return await Promise.race([fn(), timeoutPromise]);
        },
        {
          ...RetryConfigs.openai,
          maxRetries: maxRetries ?? RetryConfigs.openai.maxRetries,
          retryableErrors: [...RetryConfigs.openai.retryableErrors],
        }
      );
    });

    // Calculate cost if we have usage data
    let tokensUsed: { prompt: number; completion: number; total: number } | undefined;
    let costUsd: number | undefined;

    if (trackTokens && result.result && typeof result.result === "object") {
      const anyResult = result.result as any;
      if (anyResult.usage) {
        tokensUsed = {
          prompt: anyResult.usage.prompt_tokens || 0,
          completion: anyResult.usage.completion_tokens || 0,
          total: anyResult.usage.total_tokens || 0,
        };

        // Estimate cost (using gpt-5.2 pricing as default)
        const pricing = TOKEN_COSTS["gpt-5.2"];
        costUsd = (tokensUsed.prompt / 1000) * pricing.input +
          (tokensUsed.completion / 1000) * pricing.output;
      }
    }

    // Record success in observability
    pipelineObservability.endStep({
      stepName: operation,
      stage: "ai-call",
      success: true,
      durationMs: Date.now() - startTime,
      aiCalls: result.attempts,
      retryCount: result.retried ? result.attempts - 1 : 0,
      tokensUsed: tokensUsed?.total,
    });

    // Record AI call for the current run
    pipelineObservability.recordAiCall(tokensUsed?.total);

    return {
      ...result,
      tokensUsed,
      costUsd,
    };
  } catch (error) {
    // Record failure in observability
    pipelineObservability.endStep({
      stepName: operation,
      stage: "ai-call",
      success: false,
      durationMs: Date.now() - startTime,
      aiCalls: 0,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      attempts: 0,
      totalDurationMs: Date.now() - startTime,
      retried: false,
    };
  }
}

/**
 * Convenience: OpenAI responses.create med full resilience
 */
export async function createResilientResponse(
  params: OpenAI.Responses.ResponseCreateParamsNonStreaming,
  options: Omit<OpenAICallOptions, "operation">
): Promise<OpenAIResult<OpenAI.Responses.Response>> {
  return makeOpenAICall(
    () => openai.responses.create(params),
    { operation: "responses.create", ...options }
  );
}

/**
 * Convenience: OpenAI chat.completions.create med full resilience
 */
export async function createResilientChatCompletion(
  params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
  options: Omit<OpenAICallOptions, "operation">
): Promise<OpenAIResult<OpenAI.Chat.ChatCompletion>> {
  return makeOpenAICall(
    () => openai.chat.completions.create(params),
    { operation: "chat.completions.create", ...options }
  );
}

/**
 * Check OpenAI API health
 */
export async function checkOpenAIHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    // Simple models list call - lightweight
    await openai.models.list();
    return {
      healthy: true,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
