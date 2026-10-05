// Shared types for the agent-evals harness.

export type JudgeKind = "exact" | "keyword" | "llm";

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

export interface EvalCase {
  id: string;
  input: string;
  /** tools the agent is allowed to call for this case */
  tools: string[];
  /** what a correct answer looks like */
  expected: {
    tool?: string;
    args?: Record<string, unknown>;
    contains?: string[];
    answer?: string;
    /** latency gate: case fails if it takes longer than this (ms) */
    maxP95Ms?: number;
  };
  judge: JudgeKind;
  /** max score for this case (default 1) */
  points?: number;
}

export interface EvalSuite {
  id: string;
  name: string;
  description: string;
  cases: EvalCase[];
}

export interface AgentOutput {
  /** raw text output from the agent */
  output: string;
  /** tool calls the agent made (if observable) */
  toolCalls?: ToolCall[];
  /** milliseconds the agent took */
  latencyMs: number;
}

export interface CaseResult {
  caseId: string;
  score: number;
  maxScore: number;
  passed: boolean;
  latencyMs: number;
  detail: string;
}

export interface SuiteResult {
  suiteId: string;
  agent: string;
  startedAt: string;
  cases: CaseResult[];
  totalScore: number;
  maxScore: number;
  passRate: number;
  avgLatencyMs: number;
}

/** The agent under test. Receives input + allowed tools, returns output. */
export type AgentFn = (
  input: string,
  tools: string[]
) => Promise<Omit<AgentOutput, "latencyMs">>;
