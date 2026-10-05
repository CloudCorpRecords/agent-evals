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

## Status: v1 built and tested

The full harness is implemented, typechecked, and covered by tests (`npm test` — 20/20 passing), plus a live end-to-end run against a scripted agent server:

- **Runner** (`src/runner.ts`) — executes cases, scores, prints tables, supports `--bail` and latency budgets
- **Suites** — `tool-use` (8 cases), `rag-accuracy` (5 cases + `data/rag-corpus.json`), `latency` (5 cases with ms budgets)
- **Scorers** — exact-match, keyword, LLM-judge (Claude, `ANTHROPIC_API_KEY`), latency stats
- **Agent adapters** — HTTP `POST /run` and MCP `tools/call` transports, plus a scripted mock agent
- **CLI** — `run --agent --suite/--all --mcp --name --publish`, `leaderboard` (best score per agent+suite)
- **Leaderboard web UI** (`web/`) — Next.js page, statically renders `results/leaderboard.json` (verified with `next build`)

Verified end-to-end: scripted agent scored 8/8 tool-use, 4/5 rag-accuracy (LLM-judge case correctly skips without a key), 5/5 latency; `results/` + leaderboard page show real data.

Tests: `npm test` · Typecheck: `npx tsc --noEmit` (root) · Web: `cd web && npm run build`

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

