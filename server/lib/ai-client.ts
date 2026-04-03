/**
 * Unified AI Client — supports both OpenAI and Anthropic Claude.
 * 
 * Provider selection (based on env vars):
 * - ANTHROPIC_API_KEY set → Claude (preferred for Swedish text quality)
 * - OPENAI_API_KEY set → OpenAI GPT
 * - Both set → Claude preferred
 * 
 * Claude model used: claude-sonnet-4-20250514 (Sonnet 4.6)
 *   - $3/M input, $15/M output
 *   - Supports adaptive thinking for complex tasks
 *   - Best writing quality for non-English languages
 * 
 * For comparison, GPT-5.2: $1.75/M input, $14/M output
 * Claude is ~70% more on input, ~7% more on output — worth it for text quality.
 * 
 * OpenAI is always kept available for vision (GPT-4o image analysis).
 */

import OpenAI from "openai";

export type AIProvider = "claude" | "openai";

export function getActiveProvider(): AIProvider {
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  return "openai";
}

export function getProviderName(): string {
  return getActiveProvider() === "claude" ? "Claude Sonnet 4.6" : "OpenAI GPT-5.2";
}

// Lazy OpenAI client
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
    });
  }
  return _openai;
}

/** Get raw OpenAI client (for vision/images that only OpenAI supports) */
export function getOpenAIClient(): OpenAI {
  return getOpenAI();
}

export function isAIConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
}

// ─── Unified interface ───

export interface AIChatMessage {
  role: "system" | "user" | "assistant" | "developer";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }>;
}

export interface AIChatOptions {
  model: string;
  messages: AIChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" | "text" };
  /** Maps to OpenAI reasoning_effort and Claude adaptive thinking */
  reasoning_effort?: "low" | "medium" | "high";
}

export interface AIChatResult {
  content: string;
  model: string;
  provider: AIProvider;
  tokensUsed?: number;
}

/**
 * Main function — call this for all text generation.
 * Automatically routes to Claude or OpenAI based on env config.
 */
export async function chatCompletion(options: AIChatOptions): Promise<AIChatResult> {
  const provider = getActiveProvider();
  if (provider === "claude") {
    return claudeChat(options);
  }
  return openaiChat(options);
}

// ─── OpenAI implementation ───

async function openaiChat(options: AIChatOptions): Promise<AIChatResult> {
  const openai = getOpenAI();

  const messages = options.messages.map(m => ({
    role: m.role === "developer" ? "system" as const : m.role as "system" | "user" | "assistant",
    content: m.content as any,
  }));

  const params: any = {
    model: options.model,
    messages,
    max_completion_tokens: options.max_tokens || 4000,
  };

  // reasoning_effort and temperature are mutually exclusive on OpenAI
  if (options.reasoning_effort) {
    params.reasoning_effort = options.reasoning_effort;
    // DO NOT set temperature when reasoning_effort is used
  } else if (options.temperature !== undefined) {
    params.temperature = options.temperature;
  }

  if (options.response_format) {
    params.response_format = options.response_format;
  }

  const response = await openai.chat.completions.create(params);

  const choice = response.choices[0];
  const content = choice?.message?.content || "";

  if (!content) {
    console.error("[AI_CLIENT] Empty OpenAI response:", JSON.stringify({
      finishReason: choice?.finish_reason,
      refusal: (choice?.message as any)?.refusal,
      usage: response.usage,
      model: response.model,
    }));
  }

  return {
    content,
    model: options.model,
    provider: "openai",
    tokensUsed: response.usage?.total_tokens,
  };
}

// ─── Claude implementation ───

// Claude Sonnet 4.6 — best balance of quality and cost for Swedish text
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

async function claudeChat(options: AIChatOptions): Promise<AIChatResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  // Separate system prompt from messages (Claude API requirement)
  let systemPrompt = "";
  const claudeMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const msg of options.messages) {
    if (msg.role === "system" || msg.role === "developer") {
      const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      systemPrompt += (systemPrompt ? "\n\n" : "") + text;
    } else if (msg.role === "user" || msg.role === "assistant") {
      claudeMessages.push({
        role: msg.role,
        content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      });
    }
  }

  // Claude requires messages to start with "user" role
  if (claudeMessages.length === 0 || claudeMessages[0].role !== "user") {
    claudeMessages.unshift({ role: "user", content: systemPrompt || "Generate the requested content." });
    systemPrompt = "";
  }

  const body: any = {
    model: CLAUDE_MODEL,
    max_tokens: options.max_tokens || 4000,
    messages: claudeMessages,
  };

  if (systemPrompt) body.system = systemPrompt;
  if (options.temperature !== undefined) body.temperature = options.temperature;

  // ─── Adaptive thinking (Claude's equivalent of reasoning_effort) ───
  // Uses adaptive thinking which lets Claude decide how much to think.
  // "high" → full adaptive thinking (best quality, costs more thinking tokens)
  // "medium" → adaptive thinking enabled (good balance)
  // "low" → no thinking (fastest, cheapest)
  if (options.reasoning_effort === "high" || options.reasoning_effort === "medium") {
    body.thinking = { type: "adaptive" };
    // When thinking is enabled, temperature must be 1 (Claude requirement)
    body.temperature = 1;
    // Increase max_tokens to account for thinking tokens
    body.max_tokens = Math.max(body.max_tokens, 8000);
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Claude API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json() as any;

  // Extract text content (skip thinking blocks)
  let content = "";
  if (Array.isArray(data.content)) {
    for (const block of data.content) {
      if (block.type === "text") {
        content += block.text;
      }
      // thinking blocks are ignored — they're internal reasoning
    }
  }

  return {
    content,
    model: CLAUDE_MODEL,
    provider: "claude",
    tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
}
