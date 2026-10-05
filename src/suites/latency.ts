import type { EvalSuite } from "../types.js";

export const suite: EvalSuite = {
  id: "latency",
  name: "Latency",
  description:
    "Time-to-first-token and total time per task. Scored on p95 total latency against thresholds.",
  cases: [
    {
      id: "lat-quick",
      input: "Say the word 'ready'.",
      tools: [],
      expected: { contains: ["ready"], maxP95Ms: 8000 },
      judge: "keyword",
    },
    {
      id: "lat-medium",
      input: "List three benefits of eval-driven development in one line each.",
      tools: [],
      expected: { contains: ["eval"], maxP95Ms: 15000 },
      judge: "keyword",
    },
    {
      id: "lat-tool",
      input: "Call the ping tool and report the result.",
      tools: ["ping"],
      expected: { tool: "ping", args: {}, maxP95Ms: 10000 },
      judge: "exact",
    },
    {
      id: "lat-slow",
      input: "Write a haiku about latency.",
      tools: [],
      expected: { contains: ["latency"], maxP95Ms: 20000 },
      judge: "keyword",
    },
    {
      id: "lat-echo",
      input: "Repeat back: the quick brown fox.",
      tools: [],
      expected: { contains: ["quick brown fox"], maxP95Ms: 8000 },
      judge: "keyword",
    },
  ],
};
