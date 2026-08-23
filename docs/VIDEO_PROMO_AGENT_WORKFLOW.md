# Video Promo Agent Workflow

## Reference learned from 15897.mp4

This reference is a **screen-recorded AI-agent dashboard explainer**. Its promotional power comes from proving that the system is actually working: agent nodes, state changes, token/cost counters, workflow branches, and a large headline such as “24-hour AI agent secret”.

### Reusable promotion pattern

1. **HOOK (0–3s)** — one bold promise/secret/result.
2. **PROOF (3–12s)** — immediately show the real app/dashboard instead of stock footage.
3. **WORKFLOW (12–45s)** — zoom/pan through agents, nodes, queues, states, handoffs.
4. **VALUE (45–65s)** — show numerical proof: time saved, jobs processed, cost/token delta, coverage.
5. **CTA (last 5–15s)** — one action only: try app, open link, comment keyword, or view demo.

### Visual rules

- 9:16 vertical.
- Large fixed headline in upper safe zone.
- Main proof is screen recording of the actual front app or workflow map.
- Captions stay in lower safe zone and highlight only 1–3 keywords in accent color.
- Use cursor movement, node activation, status change, zoom and pan as motion; avoid unnecessary cinematic generation.
- Prefer `SIMPLE` or `DEMO` complexity before UGC/animation.

### Learning beyond the video itself

Every reference must produce both:

- `CONTENT_LEARNING`: hook, script, visual, subtitle, motion, audio patterns.
- `WORKFLOW_LEARNING`: what backend/front/bridge changes would let us reproduce the useful pattern automatically.

For this reference the workflow delta is:

> Promote apps by rendering their **actual backend/front workflow state** as the visual proof. The video generator therefore needs structured workflow data, not only a written script.

## Canonical production chain

`LIBRARY/DRIVE REFERENCE`
→ `QUEENS factual extraction`
→ `SEED reusable promo pattern`
→ `T1 generic promo template`
→ `T2 front-app adapter`
→ `BACKEND snapshot/metrics`
→ `FRONT screen/demo state`
→ `CAPTION + VOICE + MOTION plan`
→ `COMPOSE`
→ `FRAME/CAPTION/AUDIO QA`
→ `PLATFORM EXPORT`
→ `ENGAGEMENT CAMPAIGN`
→ `LEARNING WRITEBACK`

## Dedicated workflow-agent apps

Every learned video template becomes a dedicated agent mode inside `?mode=video-agents` rather than remaining a passive template:

- `SIMPLE_EXPLAINER`
- `PRESENTER_TOPLIST`
- `TOOL_DEMO`
- `AGENT_DASHBOARD_PROMO`
- `APP_INTRO_COMPARISON`
- `UGC_AD`
- `BEFORE_AFTER`
- `WORKFLOW_MAP_EXPLAINER`

Each agent owns its input contract, workflow map, T1 template, T2 front adapters, render policy, QA gate and distribution hook.

## Front-app contract

Each app adapter should provide:

```json
{
  "APP_NAME": "Content OS",
  "USER_PROBLEM": "what the user struggles with",
  "CORE_FUNCTIONS": ["feature1", "feature2"],
  "WORKFLOW_PROOF": [{"label":"Queens","status":"ACTIVE"}],
  "RESULT_METRIC": [{"label":"coverage","value":"92%"}],
  "CTA": "Try the workflow"
}
```

## Backend contract

Backends should expose sanitized, non-secret facts that can be rendered in promo videos:

- queue counts / successful runs
- workflow stage status
- processing duration
- saved/reused data count
- coverage / QA pass rate
- API usage class (`API_FREE`, `API_OPTIONAL`, `API_REQUIRED`)
- latest verified result pointer

Never expose credentials, API keys, private customer data, or internal secrets.

## Apps Script bridge

`apps-script/VideoPromoWorkflow.gs` is the orchestration source. It:

- queues new reference media,
- writes/links asset records,
- builds Queens/Seed/T1/T2 records,
- uses `BRIDGE_TASKS` for work Apps Script cannot perform directly (frame extraction, rendering, advanced audio/video QA),
- creates a 10-minute queue trigger,
- keeps `SIMPLE_FIRST` and approved-API-on-quality-gap policy.

`apps-script/EngagementDistributionWorkflow.gs` handles participation campaigns after publishing.

## Comment participation -> free app/resource delivery

A promo agent may attach CTA such as:

- `댓글에 무료앱이라고 남기면 링크를 보내드립니다.`
- `댓글에 견적이라고 남기면 무료 도구를 안내합니다.`
- `댓글에 여행이라고 남기면 무료 앱 링크를 보냅니다.`

Runtime chain:

`PUBLISHED CONTENT -> OFFICIAL COMMENT/REPLY EVENT -> KEYWORD MATCH -> PLATFORM CAPABILITY ROUTER -> OFFICIAL DM/PRIVATE REPLY WHEN PERMITTED -> OTHERWISE PUBLIC REPLY/LANDING LINK/MANUAL QUEUE -> DELIVERY LOG -> CONVERSION/LEARNING WRITEBACK`

Policy:

- `OFFICIAL_API_ONLY`.
- no scraping, credential reuse, simulated-user DM, spam loop or permission bypass.
- direct/private messaging is enabled only after current official platform capability + account permission readback.
- unsupported private messaging falls back to public reply + landing link, pinned comment/description, or manual queue.
- participant events must be deduplicated and rate limited before Production activation.

## Central DataHub tabs

- `VIDEO_TEMPLATE_AGENTS`
- `ENGAGEMENT_CAMPAIGNS`
- `ENGAGEMENT_EVENTS`
- `VIDEO_WORKFLOW_MAP`
- `MEDIA_QUEENS_SEED_SCHEMA`
- `ASSET_INDEX`
- `BRIDGE_TASKS`
- `TASK_QUEUE`

## Template modes

1. `SIMPLE`: cards/screenshots + TTS/captions.
2. `PRESENTER`: talking head/avatar + app overlays.
3. `DEMO`: screen recording/dashboard/workflow proof. **15897 belongs here.**
4. `UGC`: persona/model advertising.
5. `ANIMATION`: explanatory motion graphics.
6. `CINEMATIC`: highest-cost visual generation; use only on justified quality gap.

## QA gate

A template is not VERIFIED until two representative app inputs pass:

- hook readability
- safe-zone caption placement
- factual match with backend/front state
- no secrets/private data
- voice/caption sync
- app UI legibility
- CTA clarity
- 9:16 export
- no unnecessary API escalation
- comment keyword event x2
- dedupe/rate-limit check
- platform capability route check
- delivery/writeback evidence
