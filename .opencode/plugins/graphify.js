// graphify OpenCode plugin: injects a one-time knowledge-graph reminder before bash calls.
// The reminder is echoed inside double quotes, so it must stay free of backticks and $(...).
import { existsSync } from "fs";
import { join } from "path";

export const GraphifyPlugin = ({ directory }) => {
  let reminded = false;

  return {
    "tool.execute.before": async (input, output) => {
      if (reminded || input.tool !== "bash") return;
      if (!existsSync(join(directory, "graphify-out", "graph.json"))) return;

      output.args.command =
        'echo "[graphify] knowledge graph at graphify-out/. For focused questions, run graphify query with your question (scoped subgraph, usually much smaller than GRAPH_REPORT.md) instead of grepping raw files. Read GRAPH_REPORT.md only for broad architecture context." ; ' +
        output.args.command;
      reminded = true;
    },
  };
};
