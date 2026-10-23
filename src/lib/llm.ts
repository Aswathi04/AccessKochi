// OpenAI-compatible chat client for Neysa (Gemma) with OpenAI as fallback.
// Server-only: reads keys from .env.local. Never import this from a client component.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];
}

interface Provider {
  name: "neysa" | "openai";
  baseUrl: string;
  apiKey: string;
  model: string;
}

function providers(): Provider[] {
  const neysa: Provider | null =
    process.env.NEYSA_API_KEY && process.env.NEYSA_BASE_URL
      ? {
          name: "neysa",
          baseUrl: process.env.NEYSA_BASE_URL.replace(/\/+$/, ""),
          apiKey: process.env.NEYSA_API_KEY,
          model: process.env.NEYSA_MODEL || "gemma-4-26-b-a4-b-it",
        }
      : null;
  const openai: Provider | null = process.env.OPENAI_API_KEY
    ? {
        name: "openai",
        baseUrl: "https://api.openai.com",
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      }
    : null;
  const order = (process.env.LLM || "neysa") === "openai" ? [openai, neysa] : [neysa, openai];
  return order.filter((p): p is Provider => !!p);
}

export function llmConfigured(): boolean {
  return providers().length > 0;
}

export interface ChatResult {
  text: string;
  provider: Provider["name"];
  model: string;
}

/** Sends a chat request, trying each configured provider in order. Throws if all fail. */
export async function chat(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
): Promise<ChatResult> {
  const errors: string[] = [];
  for (const p of providers()) {
    try {
      const res = await fetch(`${p.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${p.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: p.model,
          messages,
          max_tokens: opts.maxTokens ?? 800,
          temperature: opts.temperature ?? 0.1,
        }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
      });
      if (!res.ok) {
        errors.push(`${p.name}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
        continue;
      }
      const data = await res.json();
      const text: unknown = data?.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text.trim()) {
        errors.push(`${p.name}: empty response`);
        continue;
      }
      return { text: stripThinking(text), provider: p.name, model: p.model };
    } catch (e) {
      errors.push(`${p.name}: ${(e as Error).message}`);
    }
  }
  throw new Error(errors.length ? errors.join(" | ") : "No LLM configured (set NEYSA_API_KEY or OPENAI_API_KEY)");
}

function stripThinking(t: string): string {
  return t.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/** Pulls the first JSON object out of a model reply (handles ```json fences and stray text). */
export function extractJson<T = unknown>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < body.length; i++) {
    const ch = body[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) {
      try { return JSON.parse(body.slice(start, i + 1)) as T; } catch { return null; }
    }
  }
  return null;
}

/** Chat and parse JSON. Returns null (never throws) so callers can fall back. */
export async function chatJson<T>(messages: ChatMessage[], opts?: Parameters<typeof chat>[1]): Promise<{ data: T; provider: string } | null> {
  try {
    const r = await chat(messages, opts);
    const data = extractJson<T>(r.text);
    return data ? { data, provider: `${r.provider}:${r.model}` } : null;
  } catch (e) {
    console.warn("[llm]", (e as Error).message);
    return null;
  }
}
