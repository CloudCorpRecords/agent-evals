export interface EvalCase {
  id: string;
  input: string;
  expected: { tool: string; args: Record<string, unknown> };
  judge: "exact" | "llm";
}

export interface EvalSuite {
  id: string;
  name: string;
  cases: EvalCase[];
}

export interface RunResult {
  passed: number;
  total: number;
  details: { id: string; pass: boolean; ms: number }[];
}

async function callAgent(agentUrl: string, input: string): Promise<any> {
  const res = await fetch(`${agentUrl}/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input }),
  });
  return res.json();
}

function exactMatch(output: any, expected: EvalCase["expected"]): boolean {
  return (
    output?.tool === expected.tool &&
    JSON.stringify(output?.args) === JSON.stringify(expected.args)
  );
}

export async function runSuite(
  suite: EvalSuite,
  agentUrl: string
): Promise<RunResult> {
  const details: RunResult["details"] = [];
  for (const c of suite.cases) {
    const start = Date.now();
    const output = await callAgent(agentUrl, c.input);
    const pass = c.judge === "exact" ? exactMatch(output, c.expected) : false; // llm judge: TODO
    const ms = Date.now() - start;
    details.push({ id: c.id, pass, ms });
    console.log(`${pass ? "PASS" : "FAIL"}  ${c.id}  (${ms}ms)`);
  }
  return {
    passed: details.filter((d) => d.pass).length,
    total: details.length,
    details,
  };
}
