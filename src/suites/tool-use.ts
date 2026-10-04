import type { EvalSuite } from "../runner.js";

export const toolUseSuite: EvalSuite = {
  id: "tool-use",
  name: "Tool Use",
  cases: [
    {
      id: "file-read",
      input: "Read /tmp/notes.txt and summarize it",
      expected: { tool: "read_file", args: { path: "/tmp/notes.txt" } },
      judge: "exact",
    },
    {
      id: "web-search",
      input: "What is the current price of Bitcoin?",
      expected: { tool: "web_search", args: { query: "current price of Bitcoin" } },
      judge: "exact",
    },
    {
      id: "multi-step",
      input: "Find all TODO comments in src/ and write them to /tmp/todos.md",
      expected: {
        tool: "write_file",
        args: { path: "/tmp/todos.md", content: "<todos>" },
      },
      judge: "llm",
    },
  ],
};
