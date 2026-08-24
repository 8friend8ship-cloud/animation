# Flow Fallback Shorts Sample — 2026-08-24

## Goal
Produce a Shorts sample without OpenAI image generation and without depending on Flow/BRG_002 while that bridge is being checked on the laptop.

## Canonical route
Learned Shorts pattern → storyboard → existing scene-pack / existing image assets → SHORTS/kinetic renderer → Animation Studio → H.264 MP4 → MEDIA_OUTPUT → QA/readback x2.

## IDs
- CONTENT_ID: `CONTENT_OS_SHORTS_SAMPLE_20260824_001`
- Project: `APP_ANIMATION`
- Renderer repo: `8friend8ship-cloud/animation`
- Output: 9:16 H.264 MP4

## Fallback rules
1. Reuse existing assets before any paid generation.
2. Keep CONTENT_ID/SCENE_ID/STYLE_ID/ASSET_ID lineage.
3. Do not mark Flow as VERIFIED until actual generation and Drive RESULT/ACK pass twice.
4. When Flow is restored, replace only selected generative shots; preserve timeline and IDs.
5. QA: duration, hook, scene continuity, safe area, audio/subtitle sync, render integrity, readback x2.

## Sample concept
Content OS explainer short: hook → keyword input → analysis cards → idea conversion → multi-channel expansion → CTA.
