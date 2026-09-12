# Animation Pack Promotion

This repository is promoted from a standalone animation app into the central-agent `ANIMATION_PACK` execution engine.

## Purpose

`ANIMATION_PACK` receives normalized scene requests from the central router, resolves reusable assets and sibling packs, executes animation/render work, runs QC, writes logs, performs readback, and returns a receipt.

## Boundaries

- IMAGE_PACK: still-image/background generation
- PERSONA_PACK: identity/character continuity
- MOTION_PACK: motion definitions
- ANIMATION_PACK: timeline composition + execution
- FLOW_PACK / VEO_PACK: generative video fallback/augmentation
- VTUBE_PACK / VIDEO_PACK: downstream composition/publishing workflows

## Existing assets reused

The existing storyboard bridge, storyboard patch contract, H.264 browser encoder, UI, hybrid modules, configuration and AI Studio integration remain source assets. Promotion must wrap and reuse them rather than duplicate them.

## Pipeline

REQUEST -> STORYBOARD -> ASSET_RESOLVE -> ANIMATE -> RENDER -> QC -> DRIVE_SAVE -> DATA_LOG -> READBACK -> RECEIPT

A render alone is not COMPLETE. COMPLETE requires successful readback and receipt generation.

## Seed and template policy

QC-passed outputs may be promoted to reusable Animation Seeds. Repeated high-quality seeds may be promoted to Templates. Reuse order is preferred before new API generation.

## Router contract

Input: `pack/contracts/animation-input.schema.json`

Output: `pack/contracts/animation-output.schema.json`

Manifest: `pack/animation-pack.manifest.json`

## Completion code

`ANIMATION_PACK_COMPLETE`

## Failure policy

A failure should trigger: detect -> search/learn -> reuse existing seed/template -> fallback route -> retry -> QC -> log -> receipt. A recorded failure without attempted normalization is not considered completion.
