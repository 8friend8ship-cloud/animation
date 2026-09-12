# Animation Pack Promotion

This repository is promoted from a standalone animation app into the central-agent `ANIMATION_PACK` execution engine.

## Purpose

`ANIMATION_PACK` receives normalized scene requests from the central router, resolves reusable assets and sibling packs, chooses an execution engine, executes animation/render work, runs scored QC, performs partial reruns when possible, writes logs, performs readback, and returns a receipt.

## Boundaries

- SEARCH_PACK: trend/solution lookup before new work or recovery
- LEARNING_PACK: stores validated fixes, successful routes, seeds and templates
- DATA_PACK: lineage, QC, logs and receipt records
- IMAGE_PACK: still-image/background generation
- PERSONA_PACK: identity/character continuity
- MOTION_PACK: motion definitions
- ANIMATION_PACK: timeline composition + execution
- FLOW_PACK / VEO_PACK: generative video fallback/augmentation
- VTUBE_PACK / VIDEO_PACK: downstream composition/publishing workflows

## Existing assets reused

The existing storyboard bridge, storyboard patch contract, H.264 browser encoder, UI, hybrid modules, configuration and AI Studio integration remain source assets. Promotion must wrap and reuse them rather than duplicate them.

## Optimized pipeline

REQUEST -> SEARCH_LEARN_VALIDATE -> TEMPLATE_SEED_RESOLVE -> ENGINE_ROUTE -> STORYBOARD -> STATE_RESOLVE -> ASSET_RESOLVE -> ANIMATE -> RENDER -> QC_SCORE -> PARTIAL_RERUN_IF_NEEDED -> BAKE -> SEED_TEMPLATE_PROMOTION -> DRIVE_SAVE -> DATA_LOG -> READBACK -> RECEIPT

A render alone is not COMPLETE. COMPLETE requires successful readback and receipt generation.

## Reuse-first policy

Execution preference:

1. approved Template
2. qualified Seed
3. internal animation engine
4. local/free engine
5. specialist engine (MetaHuman / Unreal / Flow / Veo)
6. paid API only when approved

## Engine router

`bridge/animationPackEngineRouter.ts` selects the execution path based on identity lock, precise motion, editable realtime-scene needs, photoreal/cinematic generation needs, reuse availability and paid-API approval.

## State machine

Reusable character/object behavior is represented as states such as `IDLE`, `ENTER`, `WALK`, `TALK`, `POINT`, `INTERACT`, and `EXIT`, with explicit transitions preferred for reproducibility.

## QC scoring

QC is scored from 0-100 across identity, motion, lipsync, voice, spatial consistency, camera, frame quality and continuity. Failed components should be rerun independently when possible rather than forcing a full regeneration.

## Partial rerun

The existing storyboard patch path is promoted into the standard repair flow. Approved scenes are preserved and only failed components or requested scenes are rerun whenever possible.

## Version lineage

Outputs must retain source/parent output IDs plus template, seed and engine versions so changes can be reproduced and regressions traced.

## Bake -> Seed -> Template

Editable work is baked after QC, then may be promoted to a reusable Seed. Repeated high-quality Seeds may be promoted to Templates. Promotion metadata is returned in the output contract.

## Router contracts

Input: `pack/contracts/animation-input.schema.json`

Output: `pack/contracts/animation-output.schema.json`

Manifest: `pack/animation-pack.manifest.json`

Engine router: `bridge/animationPackEngineRouter.ts`

## Completion code

`ANIMATION_PACK_COMPLETE`

## Failure policy

A failure should trigger: detect -> search/learn -> reuse existing template/seed -> fallback route -> retry only failed scope where possible -> QC -> log -> readback -> receipt. A recorded failure without attempted normalization is not considered completion.
