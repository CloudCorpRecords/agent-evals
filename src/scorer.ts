import type { EvalCase, AgentOutput } from "./types.js";

/**
 * Scorers: exact-match, keyword, and LLM-judge.
 * Each returns { score (0..1), detail }.
 */

export interface Score {
  score: number;
  detail: string;
}

function normalize(v: unknown): string {
  return JSON.stringify(v ?? null);
}

/** exact: the agent's first tool call must match expected tool + args (deep equal). */
export function exactScorer(c: EvalCase, out: AgentOutput): Score {
  const call = out.toolCalls?.[0];
  if (!call) {
    return { score: 0, detail: "no tool call made" };
  }
  if (c.expected.tool && call.tool !== c.expected.tool) {
    return { score: 0, detail: `wrong tool: ${call.tool} (expected ${c.expected.tool})` };
  }
  if (c.expected.args) {
    const got = normalize(call.args);
    const want = normalize(c.expected.args);
    if (got !== want) {
      return { score: 0, detail: `args mismatch: got ${got}, want ${want}` };
    }
  }
  return { score: 1, detail: `correct tool call: ${call.tool}` };
}

/** keyword: output text must contain all expected.contains strings (case-insensitive). */
export function keywordScorer(c: EvalCase, out: AgentOutput): Score {
  const text = out.output.toLowerCase();
  const missing = (c.expected.contains ?? []).filter((k) => !text.includes(k.toLowerCase()));
  if (missing.length > 0) {
    return { score: 0, detail: `missing keywords: ${missing.join(", ")}` };
  }
  return { score: 1, detail: "all keywords present" };
}

export interface LlmJudgeOptions {
  apiKey?: string;
  model?: string;
  /** injectable fetch for tests */
  fetchFn?: typeof fetch;
}

/**
 * llm: ask Claude whether the output satisfies the case.
 * Requires ANTHROPIC_API_KEY. Returns 1/0 with the judge's reasoning.
 */
export async function llmJudgeScorer(
  c: EvalCase,
  out: AgentOutput,
  opts: LlmJudgeOptions = {}
): Promise<Score> {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { score: 0, detail: "skipped: ANTHROPIC_API_KEY not set" };
  }
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model ?? "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `You are grading an AI agent. Task: "${c.input}"\n\nExpected: ${JSON.stringify(c.expected)}\n\nAgent output:\n${out.output}\n\nDid the agent satisfy the task? Reply with exactly one line: PASS or FAIL, then a one-sentence reason.`,
        },
      ],
    }),
  });
  if (!res.ok) {
    return { score: 0, detail: `judge API error: ${res.status}` };
  }
  const data = (await res.json()) as any;
  const text: string = data.content?.[0]?.text ?? "";
  const verdict = text.trim().toUpperCase().startsWith("PASS");
  return { score: verdict ? 1 : 0, detail: `llm-judge: ${text.trim().slice(0, 160)}` };
}

/** latency stats helper used by the latency suite + leaderboard. */
export function latencyStats(latencies: number[]): {
  avg: number;
  p50: number;
  p95: number;
  max: number;
} {
  if (latencies.length === 0) return { avg: 0, p50: 0, p95: 0, max: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
  return {
    avg: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
    p50: pct(50),
    p95: pct(95),
    max: sorted[sorted.length - 1],
  };
}
