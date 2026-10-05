import type { AgentFn, AgentOutput } from "./types.js";

/**
 * Agent adapters: turn "the agent under test" into an AgentFn.
 *
 * - httpAgent(url): POST {input, tools} to the URL, expects {output, toolCalls?}
 * - mcpAgent(url, toolName): call an MCP server's tool over Streamable HTTP
 * - mockAgent(script): scripted responses for tests and offline runs
 */

export function httpAgent(baseUrl: string): AgentFn {
  const url = baseUrl.replace(/\/$/, "");
  return async (input, tools) => {
    const res = await fetch(`${url}/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input, tools }),
    });
    if (!res.ok) throw new Error(`agent HTTP ${res.status} at ${url}/run`);
    const data = (await res.json()) as Partial<AgentOutput>;
    return { output: String(data.output ?? ""), toolCalls: data.toolCalls };
  };
}

export function mcpAgent(serverUrl: string, toolName = "run"): AgentFn {
  return async (input, tools) => {
    // Minimal JSON-RPC call_tool over Streamable HTTP (no SDK session needed
    // for single-shot servers that accept plain JSON-RPC).
    const res = await fetch(serverUrl.replace(/\/$/, ""), {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: toolName, arguments: { input, tools } },
      }),
    });
    if (!res.ok) throw new Error(`agent MCP ${res.status} at ${serverUrl}`);
    const data = (await res.json()) as any;
    const text =
      data.result?.content?.map((c: any) => c.text ?? "").join("\n") ??
      JSON.stringify(data.result ?? data);
    let toolCalls: AgentOutput["toolCalls"];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.toolCalls)) toolCalls = parsed.toolCalls;
    } catch {
      /* plain text output */
    }
    return { output: text, toolCalls };
  };
}

/** Scripted agent for tests / offline runs: map input-prefix -> output. */
export function mockAgent(
  script: Record<string, Omit<AgentOutput, "latencyMs">>,
  fallback: Omit<AgentOutput, "latencyMs"> = { output: "" }
): AgentFn {
  return async (input) => {
    for (const [prefix, out] of Object.entries(script)) {
      if (input.startsWith(prefix)) return out;
    }
    return fallback;
  };
}
