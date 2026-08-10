# Animation Queens / Seed / Motion Persona Spec v1

Date: 2026-08-11

## Goal
Treat the animation app as a data-driven scene/cut/frame engine, not a one-shot video generator. The durable assets are Style Prompt DB, Persona Performance DB, Motion Primitive DB, Dialogue Template DB, and Edit Template DB.

## Pipeline
Queens -> normalize -> Persona Library -> Template 1 (Motion Primitive / Image State) -> Flow image generation -> Animation Front Scene/Cut/Frame -> Template 2 (Dialogue / Persona Performance / Continuity) -> Template 3 (Edit / Audio / Subtitle / FX) -> Renderer Provider -> Asset Registry -> QA -> Seed promotion.

## Queens
Collect genre/style/shot/camera/lighting/persona/dialogue/motion/prompt metadata from source videos. Store source URL + structured analysis, not duplicated source media.

## Persona
Persona is an actor package, not just one image. Store appearance, voice, language, temperament, speech style, facial habits, gaze, head motion, hand/body gestures, emotion response, relationships, and reference image IDs.

## Lip / Viseme
Model by language/phoneme/viseme + persona face structure. Do not hard-code ethnicity as the primary lip-motion key.

## Template 1 — Apps Script
Normalize Queens observations into reusable image-state motion data:
START_STATE -> MID_STATE_1 -> MID_STATE_2 -> END_STATE.
Each primitive contains image prompts, motion prompt, duration, face/gaze/hand/body/camera state, compatible motions, and conflict rules.

Base motions: SPEAK, LISTEN, SMILE, LAUGH, CRY, ANGRY, SURPRISED, LOOK, BLINK, NOD, TURN_HEAD, REACH, GRAB, LIFT, WALK, RUN, SIT, STAND, JUMP, WAVE, POINT.

## Composite performance
Build combinations instead of duplicating whole clips: SPEAK+SMILE, SPEAK+WALK, SPEAK+RUN+ANGRY, SPEAK+JUMP+HAPPY, etc. Save timing offsets and override/conflict rules.

## Flow
Generate only required key image states (start/mid/end/intermediate), not every 30fps frame. Each asset is linked by PERSONA_ID, SCENE_ID, CUT_ID, STATE_ID, STYLE_ID.

## Front App
Keep current scene/cut/frame editing model. Canonical hierarchy:
PROJECT -> SCENE -> CUT -> MOTION_SEGMENT -> KEY_STATE -> FRAME_RANGE.
Existing style presets remain STYLE_ID assets and are separated from Persona.

## Template 2 — Dialogue / Persona Performance
Add multi-character speaker/listener logic. Each dialogue unit contains SPEAKER_ID, LISTENER_ID, intent, emotion, facial/body performance, listener reaction, shot rule, timing, and continuity.
A dialogue scene is Speaker Performance + Listener Reaction + Camera Shot.

## Template 3 — Post
Audio/TTS, lip-sync timing, subtitles, BGM, SFX, transitions, pacing, aspect ratio, platform rules, opening/ending/CTA.

## Provider layer
Higgsfield, Veo, Kling, Seedance, etc. are swappable render providers. Keep app data/schema provider-neutral.

## Suggested backend tables
QUEENS_VIDEO_STYLE
QUEENS_SCENE_ANALYSIS
PERSONA_MASTER
PERSONA_PERFORMANCE
LIP_VISEME
MOTION_PRIMITIVE
MOTION_COMBINATION
SCENE_TEMPLATE
DIALOGUE_TEMPLATE
STYLE_TEMPLATE
IMAGE_STATE_QUEUE
FLOW_ASSET
EDIT_TEMPLATE
RENDER_QUEUE
ASSET_REGISTRY
QA_LOG
SEED_LIBRARY

## MVP order
1. Current main audit: styles, text/audio scene split, frame UI.
2. Template 1 / Motion Primitive generator.
3. Persona Performance + language/viseme.
4. Multi-character speaker/listener engine.
5. Flow image-state queue.
6. Template 2/3 post pipeline.
7. Renderer adapter and swap test.
8. Automated QA and Seed promotion.

## Rule
Do not rebuild the current front app. Preserve already-working scene split, style, character, cut/frame behavior and add these layers. All production code changes require full-file versioning, execution tests, request/response verification, and QA status updates.
