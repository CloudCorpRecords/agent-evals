import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  exactScorer,
  keywordScorer,
  llmJudgeScorer,
  latencyStats,
} from "../src/scorer.js";
import type { EvalCase, AgentOutput } from "../src/types.js";

const exactCase: EvalCase = {
  id: "t",
  input: "Read /tmp/notes.txt",
  tools: ["read_file"],
  expected: { tool: "read_file", args: { path: "/tmp/notes.txt" } },
  judge: "exact",
};

describe("exactScorer", () => {
  it("passes on exact tool+args match", () => {
    const out: AgentOutput = {
      output: "",
      toolCalls: [{ tool: "read_file", args: { path: "/tmp/notes.txt" } }],
      latencyMs: 5,
    };
    const s = exactScorer(exactCase, out);
    assert.equal(s.score, 1);
  });
  it("fails on wrong tool", () => {
    const out: AgentOutput = {
      output: "",
      toolCalls: [{ tool: "write_file", args: { path: "/tmp/notes.txt" } }],
      latencyMs: 5,
    };
    assert.equal(exactScorer(exactCase, out).score, 0);
  });
  it("fails on arg mismatch", () => {
    const out: AgentOutput = {
      output: "",
      toolCalls: [{ tool: "read_file", args: { path: "/tmp/other.txt" } }],
      latencyMs: 5,
    };
    const s = exactScorer(exactCase, out);
    assert.equal(s.score, 0);
    assert.match(s.detail, /args mismatch/);
  });
  it("fails when no tool call was made", () => {
    const s = exactScorer(exactCase, { output: "here you go", latencyMs: 5 });
    assert.equal(s.score, 0);
  });
});

describe("keywordScorer", () => {
  const c: EvalCase = {
    id: "k",
    input: "capital of France?",
    tools: [],
    expected: { contains: ["paris"] },
    judge: "keyword",
  };
  it("passes case-insensitively", () => {
    assert.equal(keywordScorer(c, { output: "The answer is Paris.", latencyMs: 1 }).score, 1);
  });
  it("fails and names missing keywords", () => {
    const s = keywordScorer(c, { output: "London.", latencyMs: 1 });
    assert.equal(s.score, 0);
    assert.match(s.detail, /paris/);
  });
});

describe("llmJudgeScorer", () => {
  const c: EvalCase = { id: "j", input: "do the thing", tools: [], expected: {}, judge: "llm" };
  const stubFetch = (verdict: string) =>
    (async () =>
      ({
        ok: true,
        json: async () => ({ content: [{ text: verdict }] }),
      })) as typeof fetch;

  it("returns 1 on PASS", async () => {
    const s = await llmJudgeScorer(c, { output: "done", latencyMs: 1 }, {
      apiKey: "x",
      fetchFn: stubFetch("PASS - it did the thing"),
    });
    assert.equal(s.score, 1);
  });
  it("returns 0 on FAIL", async () => {
    const s = await llmJudgeScorer(c, { output: "nope", latencyMs: 1 }, {
      apiKey: "x",
      fetchFn: stubFetch("FAIL - nothing done"),
    });
    assert.equal(s.score, 0);
  });
  it("skips gracefully without an API key", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const s = await llmJudgeScorer(c, { output: "done", latencyMs: 1 });
    assert.equal(s.score, 0);
    assert.match(s.detail, /ANTHROPIC_API_KEY/);
  });
});

describe("latencyStats", () => {
  it("computes avg/p50/p95/max", () => {
    const s = latencyStats([100, 200, 300, 400, 500]);
    assert.equal(s.avg, 300);
    assert.equal(s.p50, 300);
    assert.equal(s.p95, 500);
    assert.equal(s.max, 500);
  });
  it("handles empty input", () => {
    assert.deepEqual(latencyStats([]), { avg: 0, p50: 0, p95: 0, max: 0 });
  });
});
