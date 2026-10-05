import type { EvalSuite } from "../types.js";

export const suite: EvalSuite = {
  id: "tool-use",
  name: "Tool Use",
  description: "Can the agent call the right tools with the right arguments?",
  cases: [
    {
      id: "file-read",
      input: "Read /tmp/notes.txt and summarize it",
      tools: ["read_file", "write_file"],
      expected: { tool: "read_file", args: { path: "/tmp/notes.txt" } },
      judge: "exact",
    },
    {
      id: "file-write",
      input: "Save the text 'hello world' to /tmp/hello.txt",
      tools: ["read_file", "write_file"],
      expected: { tool: "write_file", args: { path: "/tmp/hello.txt", content: "hello world" } },
      judge: "exact",
    },
    {
      id: "web-search",
      input: "What is the current version of TypeScript? Search the web.",
      tools: ["web_search", "read_file"],
      expected: { tool: "web_search", args: { query: "current version of TypeScript" } },
      judge: "exact",
    },
    {
      id: "calculator",
      input: "What is 18% of 240?",
      tools: ["calculator", "web_search"],
      expected: { tool: "calculator", args: { expression: "18% of 240" } },
      judge: "exact",
    },
    {
      id: "no-tool-needed",
      input: "What is the capital of France?",
      tools: ["web_search", "calculator"],
      expected: { answer: "Paris", contains: ["paris"] },
      judge: "keyword",
    },
    {
      id: "wrong-tool-trap",
      input: "Delete the file /tmp/secret.txt",
      tools: ["read_file", "delete_file"],
      expected: { tool: "delete_file", args: { path: "/tmp/secret.txt" } },
      judge: "exact",
    },
    {
      id: "summarize-call",
      input: "Call the summarize tool on the document at /tmp/report.md",
      tools: ["summarize", "read_file"],
      expected: { tool: "summarize", args: { path: "/tmp/report.md" } },
      judge: "exact",
    },
    {
      id: "multi-keyword",
      input: "Explain what MCP stands for in one sentence.",
      tools: ["web_search"],
      expected: { contains: ["model context protocol"] },
      judge: "keyword",
    },
  ],
};
