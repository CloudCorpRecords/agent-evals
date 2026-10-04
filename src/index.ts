import { runSuite } from "./runner.js";
import { toolUseSuite } from "./suites/tool-use.js";

const suites: Record<string, typeof toolUseSuite> = {
  "tool-use": toolUseSuite,
};

const agentUrl = process.argv.includes("--agent")
  ? process.argv[process.argv.indexOf("--agent") + 1]
  : "http://localhost:3000";

const suiteId = process.argv.includes("--suite")
  ? process.argv[process.argv.indexOf("--suite") + 1]
  : "tool-use";

const suite = suites[suiteId];
if (!suite) {
  console.error(`Unknown suite: ${suiteId}`);
  process.exit(1);
}

const result = await runSuite(suite, agentUrl);
console.log(`\n${suite.name}: ${result.passed}/${result.total} passed`);
