# Agent Evals Leaderboard

Point it at any AI agent — a URL or MCP endpoint — pick an eval suite, and get scored. Results publish to a public leaderboard so the whole ecosystem can see what actually works.

## Why this exists

Evals are the #1 unsolved pain in applied AI. Everyone ships agents; almost nobody can answer "is this one actually good?" This is an open, reproducible harness plus the leaderboard the space needs.

## For AI builders (read this first)

This repo is designed to be built and extended by AI coding assistants. Keep it boring and modular:

- **Harness:** TypeScript CLI (`src/`) — runs eval suites against any agent exposing a simple HTTP or MCP interface
- **Suites:** `src/suites/` — each suite is one file exporting test cases + a scorer
- **Leaderboard:** Next.js page (`web/`) reading `results/*.json` — static, no backend for v1
- **Agent interface:** the agent under test just needs `POST /run {input} → {output}` or an MCP `call_tool` endpoint

## Repo structure

```
agent-evals/
├── src/
│   ├── index.ts              # CLI entry: agent-evals run --agent <url> --suite tool-use
│   ├── runner.ts             # ← core: executes cases, collects outputs, calls scorer
│   ├── agent.ts              # adapter: HTTP + MCP transports for the agent under test
│   ├── scorer.ts             # exact-match, LLM-judge, and latency scorers
│   └── suites/
│       ├── tool-use.ts       # can the agent call the right tools with the right args?
│       ├── rag-accuracy.ts   # grounded answers over a provided corpus
│       └── latency.ts        # time-to-first-token + total time per task
├── web/
│   └── app/page.tsx          # leaderboard reading results/*.json
├── results/
│   └── .gitkeep              # scored runs land here as JSON
└── data/
    └── rag-corpus.json       # sample corpus for the RAG suite
```

## Suite file contract

Each file in `src/suites/` exports:

```ts
export const suite = {
  id: "tool-use",
  name: "Tool Use",
  cases: [
    {
      id: "file-read",
      input: "Read /tmp/notes.txt and summarize it",
      tools: ["read_file"],          // tools the agent is allowed
      expected: { tool: "read_file", args: { path: "/tmp/notes.txt" } },
      judge: "exact" | "llm"         // how to score
    }
  ]
}
```

## CLI usage

```bash
# run the tool-use suite against a local agent
npx agent-evals run --agent http://localhost:3000 --suite tool-use

# run all suites, publish to leaderboard data
npx agent-evals run --agent http://localhost:3000 --all --publish
```

## Build order (suggested for AI implementation)

1. **Runner + one suite** — `runner.ts` + `suites/tool-use.ts` with 5 cases, exact-match scoring, CLI output table
2. **Agent adapters** — HTTP `POST /run` first, MCP transport second
3. **LLM-judge scorer** — for open-ended cases (uses Claude API, bring your own key)
4. **Leaderboard page** — static Next.js page over `results/*.json`, sortable columns
5. **RAG + latency suites** — expand coverage
6. **CI action** — GitHub Action that runs evals on every PR to an agent repo

## Tech stack

`TypeScript` `Next.js` `Anthropic API` (judge) `MCP SDK`

## Roadmap

- [ ] v1: CLI runner + tool-use suite + exact-match scoring
- [ ] v2: MCP transport + LLM-judge scorer
- [ ] v3: leaderboard web UI
- [ ] v4: RAG accuracy + latency suites
- [ ] v5: GitHub Action for continuous evals

## Contributing

New eval suites are the highest-value contribution. One file in `src/suites/`, 5+ cases, documented scoring.

## License

MIT
