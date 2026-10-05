import { writeFileSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { runSuite, printTable } from "./runner.js";
import { httpAgent, mcpAgent } from "./agent.js";
import { suite as toolUse } from "./suites/tool-use.js";
import { suite as ragAccuracy } from "./suites/rag-accuracy.js";
import { suite as latency } from "./suites/latency.js";
import type { EvalSuite, SuiteResult } from "./types.js";

const SUITES: Record<string, EvalSuite> = {
  "tool-use": toolUse,
  "rag-accuracy": ragAccuracy,
  latency,
};

function usage(): never {
  console.error(`agent-evals — score any AI agent

usage:
  agent-evals run --agent <url> [--suite tool-use|rag-accuracy|latency | --all] [--mcp] [--name NAME] [--publish]
  agent-evals leaderboard

  --agent <url>   agent under test: POST /run {input, tools} -> {output, toolCalls?}
  --mcp           treat --agent as an MCP server URL (tools/call) instead of HTTP
  --name NAME     label for this agent on the leaderboard (default: url host)
  --publish       write results/*.json for the leaderboard
`);
  process.exit(1);
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
function has(name: string): boolean {
  return process.argv.includes(name);
}

function agentName(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

async function cmdRun(): Promise<void> {
  const agentUrl = flag("--agent");
  if (!agentUrl) usage();
  const name = flag("--name") ?? agentName(agentUrl!);
  const agent = has("--mcp") ? mcpAgent(agentUrl!) : httpAgent(agentUrl!);

  const ids = has("--all") ? Object.keys(SUITES) : [flag("--suite") ?? "tool-use"];
  for (const id of ids) {
    const suite = SUITES[id];
    if (!suite) {
      console.error(`unknown suite: ${id} (available: ${Object.keys(SUITES).join(", ")})`);
      process.exit(1);
    }
    const result = await runSuite(suite, agent, name);
    printTable(result);
    if (has("--publish")) {
      mkdirSync("results", { recursive: true });
      const file = join("results", `${result.agent.replace(/[^a-z0-9.-]/gi, "_")}-${result.suiteId}-${Date.now()}.json`);
      writeFileSync(file, JSON.stringify(result, null, 2));
      console.log(`published ${file}`);
      rebuildLeaderboard();
    }
  }
}

export interface LeaderboardEntry {
  agent: string;
  suiteId: string;
  totalScore: number;
  maxScore: number;
  passRate: number;
  avgLatencyMs: number;
  startedAt: string;
}

/** Regenerate leaderboard.json from results/*.json (best score per agent+suite). */
export function rebuildLeaderboard(resultsDir = "results"): LeaderboardEntry[] {
  let files: string[] = [];
  try {
    files = readdirSync(resultsDir).filter((f) => f.endsWith(".json") && f !== "leaderboard.json");
  } catch {
    /* no results yet */
  }
  const best = new Map<string, LeaderboardEntry>();
  for (const f of files) {
    try {
      const r = JSON.parse(readFileSync(join(resultsDir, f), "utf8")) as SuiteResult;
      const key = `${r.agent}::${r.suiteId}`;
      const entry: LeaderboardEntry = {
        agent: r.agent,
        suiteId: r.suiteId,
        totalScore: r.totalScore,
        maxScore: r.maxScore,
        passRate: r.passRate,
        avgLatencyMs: r.avgLatencyMs,
        startedAt: r.startedAt,
      };
      const prev = best.get(key);
      if (!prev || entry.totalScore > prev.totalScore) best.set(key, entry);
    } catch {
      /* skip malformed */
    }
  }
  const board = [...best.values()].sort((a, b) => b.passRate - a.passRate || a.avgLatencyMs - b.avgLatencyMs);
  mkdirSync(resultsDir, { recursive: true });
  writeFileSync(join(resultsDir, "leaderboard.json"), JSON.stringify(board, null, 2));
  return board;
}

function cmdLeaderboard(): void {
  const board = rebuildLeaderboard();
  if (board.length === 0) {
    console.log("no results yet — run: agent-evals run --agent <url> --all --publish");
    return;
  }
  console.log("\nLEADERBOARD");
  console.log("─".repeat(72));
  for (const e of board) {
    console.log(
      `${e.agent.padEnd(28)} ${e.suiteId.padEnd(12)} ${e.totalScore}/${e.maxScore}  ${Math.round(e.passRate * 100)}%  ${e.avgLatencyMs}ms`
    );
  }
}

const cmd = process.argv[2];
const isMain = process.argv[1]?.endsWith("src/index.ts") || process.argv[1]?.endsWith("src/index.js");
if (isMain) {
  if (cmd === "run") await cmdRun();
  else if (cmd === "leaderboard") cmdLeaderboard();
  else usage();
}
