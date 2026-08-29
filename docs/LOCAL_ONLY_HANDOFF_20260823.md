# Animation / Video Agent — Local-only handoff

Everything that can be prepared remotely is staged in PR #11. Do **not** create a new Apps Script project, a new Vercel project, a new deployment, or repeat OAuth.

Only these two laptop-local read-only recovery jobs remain:

1. `tools/Recover-AnimationRuntime-Lineage.ps1 -DryRun`
   - uses the already-authorized `clasp` account;
   - lists existing Apps Script projects;
   - clones candidates read-only into a temp snapshot;
   - finds the unique Animation/VTube lineage candidate;
   - stops on zero or multiple candidates;
   - never pushes or deploys.

2. `tools/Recover-AnimationVercel-Lineage.ps1`
   - uses the already-authorized Vercel CLI;
   - reads existing project list, local `.vercel/project.json`, and Git origin;
   - never links, creates, or deploys.

Central queue IDs:
- `BRIDGE_ANIMATION_RUNTIME_RECOVERY_20260823_001`
- `BRIDGE_ANIMATION_VERCEL_RECOVERY_20260823_002`

Expected readback fields:
- Apps Script: unique `SCRIPT_ID`, snapshot path, matching evidence.
- Vercel: existing `PROJECT_ID`, `ORG_ID`, project name, repo mapping, existing deployment/domain if any.

After readback, the safe integration gate is:
`live snapshot diff -> existing router/scheduler hook only -> VideoAgentDispatcher V2 + VideoPromo + Engagement V2 -> STATUS x2 -> app workflow x2 -> video agent x2 -> engagement keyword/dedupe/rate-limit x2 -> Preview -> writeback`.

Hard rules:
- preserve existing IDs and deployments;
- no duplicate physical trigger if an existing scheduler can call the logical tick;
- no browser secret/API key;
- comment/DM delivery uses official platform capability only;
- no Production merge until runtime x2 evidence passes.
