## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Verification

- The reviewer lint gate is repo-wide: run `npx prettier --check .` yourself before invoking reviewers — `stories/*.md` and generated `drizzle/` files are included (`prettier --write drizzle` after `drizzle-kit generate`). After a reviewer run, check `git status`: reviewers sometimes fix lint issues and leave them uncommitted.
- Subagents cannot spawn other subagents (`subagent_depth: 1`), so an implementer cannot run its own reviewers (`peck code-review` / `peck acceptance-review` only commit reports — they do not run reviews). The top-level session must run the verify loop: `npm run lint` + `npm test` green, then @acceptance-reviewer (story path) and @code-reviewer (`master..HEAD`) in parallel, reading each full report with `git show <HASH> --format=%B -s`. Any later code change invalidates the verdicts — commit and re-run both.
