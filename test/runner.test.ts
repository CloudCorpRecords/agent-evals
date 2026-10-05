import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSuite } from "../src/runner.js";
import { mockAgent } from "../src/agent.js";
import { rebuildLeaderboard } from "../src/index.js";
import { suite as toolUse } from "../src/suites/tool-use.js";
import { suite as ragAccuracy } from "../src/suites/rag-accuracy.js";
import { suite as latency } from "../src/suites/latency.js";

const perfectScript: Record<string, any> = {
  "Read /tmp/notes.txt": { output: "", toolCalls: [{ tool: "read_file", args: { path: "/tmp/notes.txt" } }] },
  "Save the text": { output: "", toolCalls: [{ tool: "write_file", args: { path: "/tmp/hello.txt", content: "hello world" } }] },
  "What is the current version": { output: "", toolCalls: [{ tool: "web_search", args: { query: "current version of TypeScript" } }] },
  "What is 18%": { output: "", toolCalls: [{ tool: "calculator", args: { expression: "18% of 240" } }] },
  "What is the capital of France": { output: "Paris" },
  "Delete the file": { output: "", toolCalls: [{ tool: "delete_file", args: { path: "/tmp/secret.txt" } }] },
  "Call the summarize": { output: "", toolCalls: [{ tool: "summarize", args: { path: "/tmp/report.md" } }] },
  "Explain what MCP": { output: "MCP stands for Model Context Protocol." },
};

describe("runSuite with a perfect mock agent", () => {
  it("scores 8/8 on tool-use", async () => {
    const r = await runSuite(toolUse, mockAgent(perfectScript), "mock-perfect");
    assert.equal(r.totalScore, 8);
    assert.equal(r.maxScore, 8);
    assert.equal(r.passRate, 1);
    assert.equal(r.cases.length, 8);
  });
});

describe("runSuite with a failing agent", () => {
  it("scores 0 and reports details", async () => {
    const r = await runSuite(toolUse, mockAgent({}, { output: "I dunno" }), "mock-bad");
    assert.equal(r.totalScore, 0);
    assert.equal(r.passRate, 0);
    assert.ok(r.cases[0].detail.length > 0);
  });
  it("bail stops after the first failure", async () => {
    await assert.rejects(
      runSuite(toolUse, mockAgent({}, { output: "nope" }), "mock-bad", { bail: true }),
      /bailing/
    );
  });
});

describe("latency gate", () => {
  it("fails a case that exceeds its budget", async () => {
    const slow = async () => {
      await new Promise((r) => setTimeout(r, 50));
      return { output: "ready" };
    };
    const { suite } = await import("../src/suites/latency.js");
    const tiny = { ...suite, cases: [{ ...suite.cases[0], expected: { contains: ["ready"], maxP95Ms: 1 } }] };
    const r = await runSuite(tiny, slow, "mock-slow");
    assert.equal(r.cases[0].passed, false);
    assert.match(r.cases[0].detail, /exceeded/);
  });
});

describe("suites are well-formed", () => {
  for (const s of [toolUse, ragAccuracy, latency]) {
    it(`${s.id} has 5+ cases with valid judges`, () => {
      assert.ok(s.cases.length >= 5, `${s.id} has ${s.cases.length} cases`);
      for (const c of s.cases) {
        assert.ok(c.id && c.input && c.tools, `case missing fields: ${c.id}`);
        assert.ok(["exact", "keyword", "llm"].includes(c.judge), `bad judge: ${c.judge}`);
      }
    });
  }
});

describe("rebuildLeaderboard", () => {
  it("keeps best score per agent+suite and sorts by pass rate", () => {
    const dir = mkdtempSync(join(tmpdir(), "evals-"));
    mkdirSync(dir, { recursive: true });
    const mk = (agent: string, suiteId: string, total: number, max: number, rate: number) =>
      writeFileSync(
        join(dir, `${agent}-${suiteId}-${total}.json`),
        JSON.stringify({ agent, suiteId, totalScore: total, maxScore: max, passRate: rate, avgLatencyMs: 100, startedAt: new Date().toISOString(), cases: [] })
      );
    mk("b-agent", "tool-use", 4, 8, 0.5);
    mk("a-agent", "tool-use", 8, 8, 1);
    mk("a-agent", "tool-use", 2, 8, 0.25); // worse run of same agent — ignored
    const board = rebuildLeaderboard(dir);
    assert.equal(board.length, 2);
    assert.equal(board[0].agent, "a-agent");
    assert.equal(board[0].totalScore, 8);
  });
  it("returns empty when no results exist", () => {
    assert.deepEqual(rebuildLeaderboard(mkdtempSync(join(tmpdir(), "empty-"))), []);
  });
});
