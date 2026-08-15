# Animation Style Reference Workflow — 2026-08-15

## Purpose
Uploaded reference videos are production data, not passive inspiration. The workflow is:

`INGEST -> DRIVE REGISTRY -> QUEENS ANALYSIS -> PERSONA RESOLVER -> STORYBOARD -> TEMPLATE 1 -> GITHUB TEMPLATE 2 -> RENDER -> QA -> SEED PROMOTION`

Unopened or inaccessible URLs stay `UNVERIFIED_REFERENCE`; they are never treated as learned or verified.

## Style A — WHITEBOARD_BASE_LIVE_DRAW_HAND
Use for DryWriter, education and explanation videos.

- Keep a completed BASE sketch fixed.
- Draw only narration-relevant LIVE_DRAW strokes.
- HAND/PEN follows the active stroke endpoint.
- Do not animate the whole image.
- VO is the master timeline; subtitles sync at phrase level.
- Recommended scene flow: `BASE -> LIVE_DRAW -> HAND -> SUBTITLE -> HOLD`.

Reference Drive asset: `1utS7n4mt3dEcnWaxBAHNpiZFfNLASYBI`.

## Style B — COOKING_CHARACTER_REAL_CLOSEUP
Use for cooking/recipe front apps.

- Character/PERSONA carries brand, emotion and story.
- Realistic cooking closeups carry information and trust.
- Flow: `INTRO_CHARACTER -> INGREDIENT -> COOKING_CLOSEUP -> TASTE_REACTION -> FINAL_DISH -> CTA`.
- Keep the cooking host PERSONA_ID stable across scenes.

Reference Drive asset: `1lBTGXY0o4qzaC2h1Vlqkwz58hqSH-a-h`.

## Style C — DAILY_MEDITATION_LIGHT_SITCOM
Use for DryWriter daily meditation / devotional video adaptation.

- Start from an everyday problem, not a sermon.
- Use 2–3 characters with short dialogue and reaction shots.
- Flow: `SETUP -> DIALOGUE -> MISUNDERSTANDING -> COMIC_ESCALATION -> TURN -> REFLECTION`.
- Place the reflective/devotional message only in the final 10–20% and keep it concise.
- Avoid heavy preaching tone.

Reference Drive asset: `1Us6dI7RpZ0AVyHS9YX4JSH1t4_hWyCDj`.

## Common contract
Every style reference should resolve these fields before renderer execution:

`REFERENCE_ID, STYLE_ID, DOMAIN, SOURCE_URL_OR_DRIVE_ID, PERSONA_ID, STORYBOARD_STYLE, SCENE_PATTERN, IMAGE_PROMPT, VIDEO_PROMPT, CAMERA_RULE, ACTION_RULE, TRANSITION_RULE, AUDIO_RULE, SUBTITLE_RULE, FRONT_APP_TARGET, QUEENS_STATUS, SEED_STATUS, TEMPLATE1_ID, TEMPLATE2_ID, QA_STATUS, VERSION`.

## Runtime gates
1. Template 1 is the normalized Apps Script contract. Do not mark it verified until the actual function exists and a sample output is valid.
2. GitHub stores schema/resolver/fixture/code, never duplicate source MP4 files.
3. Render must produce a preview or MP4 before QA.
4. Seed promotion requires repeatability, style/persona consistency, audio/subtitle sync and continuity QA.
5. A failed stage must update status and remain retryable; do not silently continue as verified.
