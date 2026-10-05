import type {
  AgentFn,
  CaseResult,
  EvalCase,
  EvalSuite,
  SuiteResult,
} from "./types.js";
import { exactScorer, keywordScorer, llmJudgeScorer } from "./scorer.js";
import { latencyStats } from "./scorer.js";

export interface RunOptions {
  /** fail the whole run if any case throws */
  bail?: boolean;
  onCase?: (r: CaseResult) => void;
}

async function scoreCase(c: EvalCase, agent: AgentFn): Promise<CaseResult> {
  const maxScore = c.points ?? 1;
  const started = Date.now();
  try {
    const out = await agent(c.input, c.tools);
    const latencyMs = Date.now() - started;
    const agentOut = { ...out, latencyMs };

    let scored =
      c.judge === "exact"
        ? exactScorer(c, agentOut)
        : c.judge === "keyword"
          ? keywordScorer(c, agentOut)
          : await llmJudgeScorer(c, agentOut);

    let detail = scored.detail;
    let score = scored.score;
    if (c.expected.maxP95Ms !== undefined && latencyMs > c.expected.maxP95Ms) {
      score = 0;
      detail += ` | latency ${latencyMs}ms exceeded ${c.expected.maxP95Ms}ms budget`;
    }

    return {
      caseId: c.id,
      score: score * maxScore,
      maxScore,
      passed: score >= 1,
      latencyMs,
      detail,
    };
  } catch (err) {
    return {
      caseId: c.id,
      score: 0,
      maxScore,
      passed: false,
      latencyMs: Date.now() - started,
      detail: `agent error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function runSuite(
  suite: EvalSuite,
  agent: AgentFn,
  agentName: string,
  opts: RunOptions = {}
): Promise<SuiteResult> {
  const cases: CaseResult[] = [];
  for (const c of suite.cases) {
    const r = await scoreCase(c, agent);
    cases.push(r);
    opts.onCase?.(r);
    if (opts.bail && !r.passed) {
      throw new Error(`bailing after failed case ${c.id}: ${r.detail}`);
    }
  }
  const totalScore = cases.reduce((a, c) => a + c.score, 0);
  const maxScore = cases.reduce((a, c) => a + c.maxScore, 0);
  const stats = latencyStats(cases.map((c) => c.latencyMs));
  return {
    suiteId: suite.id,
    agent: agentName,
    startedAt: new Date().toISOString(),
    cases,
    totalScore: Math.round(totalScore * 100) / 100,
    maxScore,
    passRate: cases.length ? cases.filter((c) => c.passed).length / cases.length : 0,
    avgLatencyMs: stats.avg,
  };
}

export function printTable(result: SuiteResult): void {
  console.log(`\n${result.suiteId} — ${result.agent}`);
  console.log("─".repeat(72));
  for (const c of result.cases) {
    const mark = c.passed ? "✓" : "✗";
    console.log(
      `${mark} ${c.caseId.padEnd(22)} ${c.score}/${c.maxScore}  ${c.latencyMs}ms  ${c.detail.slice(0, 60)}`
    );
  }
  console.log("─".repeat(72));
  console.log(
    `score ${result.totalScore}/${result.maxScore}  pass rate ${Math.round(result.passRate * 100)}%  avg latency ${result.avgLatencyMs}ms`
  );
}
