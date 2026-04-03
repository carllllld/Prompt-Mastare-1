/**
 * Unified AI Client — supports both OpenAI and Anthropic Claude.
 * 
 * Automatically selects provider based on environment variables:
 * - If ANTHROPIC_API_KEY is set → uses Claude
 * - If OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY is set → uses OpenAI
 * - If both are set → prefers Claude (better writing quality for Swedish text)
 * 
 * Provides a unified interface so the rest of the codebase doesn't need to know
 * which provider is being used.
 */

import OpenAI from "openai";

// Provider detection
export type AIProvider = "claude" | "openai";

export function getActiveProvider(): AIProvider {
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  return "openai";
}

export function getProviderName(): string {
  return getActiveProvider() === "claude" ? "Claude (Anthropic)" : "OpenAI GPT";
}

// Lazy-initialized clients
let _openai: OpenAI | null = null;
let _anthropicFetch: typeof fetch | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

// Claude model mapping
function getClaudeModel(openaiModel: string): string {
  // Map OpenAI models to Claude equivalents
  if (openaiModel.startsWith("gpt-5")) return "claude-sonnet-4-20250514";
  if (openaiModel.startsWith("gpt-4o")) return "claude-sonnet-4-20250514";
  if (openaiModel === "gpt-4") return "claude-sonnet-4-20250514";
  return "claude-sonnet-4-20250514";
}

// ─── Unified chat completion interface ───

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
  reasoning_effort?: "low" | "medium" | "high";
}

export interface AIChatResult {
  content: string;
  model: string;
  provider: AIProvider;
  tokensUsed?: number;
}

/**
 * Unified chat completion — works with both OpenAI and Claude.
 * This is the main function to use for all text generation.
 */
export async function chatCompletion(options: AIChatOptions): Promise<AIChatResult> {
  const provider = getActiveProvider();

  if (provider === "claude") {
    return claudeChatCompletion(options);
  } else {
    return openaiChatCompletion(options);
  }
}

async function openaiChatCompletion(options: AIChatOptions): Promise<AIChatResult> {
  const openai = getOpenAI();

  // If reasoning_effort is set, use responses API
  if (options.reasoning_effort) {
    const input = options.messages.map(m => ({
      role: m.role === "system" ? "developer" as const : m.role as "user" | "assistant" | "developer",
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    }));

    const response = await openai.responses.create({
      model: options.model,
      input,
      reasoning: { effort: options.reasoning_effort },
      max_output_tokens: options.max_tokens || 4000,
      ...(options.response_format?.type === "json_object" ? { text: { format: { type: "json_object" } } } : {}),
    });

    return {
      content: response.output_text || "",
      model: options.model,
      provider: "openai",
    };
  }

  // Standard chat completion
  const messages = options.messages.map(m => ({
    role: m.role === "developer" ? "system" as const : m.role as "system" | "user" | "assistant",
    content: m.content as any,
  }));

  const response = await openai.chat.completions.create({
    model: options.model,
    messages,
    temperature: options.temperature,
    max_completion_tokens: options.max_tokens || 4000,
    ...(options.reasoning_effort ? { reasoning_effort: options.reasoning_effort } : {}),
    ...(options.response_format ? { response_format: options.response_format } : {}),
  });

  const choice = response.choices[0];
  return {
    content: choice?.message?.content || "",
    model: options.model,
    provider: "openai",
    tokensUsed: response.usage?.total_tokens,
  };
}

async function claudeChatCompletion(options: AIChatOptions): Promise<AIChatResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const model = getClaudeModel(options.model);

  // Convert messages: Claude uses "system" as a top-level param, not in messages
  let systemPrompt = "";
  const claudeMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const msg of options.messages) {
    if (msg.role === "system" || msg.role === "developer") {
      systemPrompt += (systemPrompt ? "\n\n" : "") + (typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content));
    } else if (msg.role === "user" || msg.role === "assistant") {
      claudeMessages.push({
        role: msg.role,
        content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      });
    }
  }

  // Ensure messages alternate user/assistant and start with user
  if (claudeMessages.length === 0 || claudeMessages[0].role !== "user") {
    claudeMessages.unshift({ role: "user", content: systemPrompt || "Generate the requested content." });
    systemPrompt = "";
  }

  const body: any = {
    model,
    max_tokens: options.max_tokens || 4000,
    messages: claudeMessages,
  };

  if (systemPrompt) {
    body.system = systemPrompt;
  }

  if (options.temperature !== undefined) {
    body.temperature = options.temperature;
  }

  // Claude doesn't have reasoning_effort but we can use extended thinking for high effort
  if (options.reasoning_effort === "high") {
    body.thinking = { type: "enabled", budget_tokens: 2000 };
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

  // Extract text from Claude response
  let content = "";
  if (Array.isArray(data.content)) {
    for (const block of data.content) {
      if (block.type === "text") {
        content += block.text;
      }
    }
  }

  return {
    content,
    model,
    provider: "claude",
    tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
}

// ─── OpenAI-only functions (for vision, images, etc.) ───

/**
 * Get the raw OpenAI client for features that only OpenAI supports (vision, images).
 * Falls back to OpenAI even if Claude is the primary provider.
 */
export function getOpenAIClient(): OpenAI {
  return getOpenAI();
}

/**
 * Check if the primary provider is available.
 */
export function isAIConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
}
