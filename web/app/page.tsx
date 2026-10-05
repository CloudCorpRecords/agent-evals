import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

interface Entry {
  agent: string; suiteId: string; totalScore: number; maxScore: number;
  passRate: number; avgLatencyMs: number; startedAt: string;
}

function loadBoard(): Entry[] {
  const p = join(process.cwd(), "..", "results", "leaderboard.json");
  if (!existsSync(p)) return [];
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return []; }
}

export default function Page() {
  const board = loadBoard();
  return (
    <main>
      <h1>Agent Evals Leaderboard</h1>
      <p>Open, reproducible agent evals. Best score per agent + suite.</p>
      {board.length === 0 ? (
        <p>No results yet. Run <code>agent-evals run --agent &lt;url&gt; --all --publish</code>.</p>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
            <th>Agent</th><th>Suite</th><th>Score</th><th>Pass rate</th><th>Avg latency</th>
          </tr></thead>
          <tbody>
            {board.map((e, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                <td><strong>{e.agent}</strong></td><td>{e.suiteId}</td>
                <td>{e.totalScore}/{e.maxScore}</td>
                <td>{Math.round(e.passRate * 100)}%</td><td>{e.avgLatencyMs}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ marginTop: 24, color: "#666" }}>
        Run your own: <code>npx agent-evals run --agent http://localhost:3000 --all --publish</code>
      </p>
    </main>
  );
}
