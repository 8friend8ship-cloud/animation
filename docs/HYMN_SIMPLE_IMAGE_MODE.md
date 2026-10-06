# HYMN SIMPLE IMAGE MODE

Lineage: `DUAL_EYE_MULTI_BRAIN_BRIDGE_V1`  
Owner: existing `ANIMATION_PACK`  
No new pack/project/node/trigger is created.

## Purpose
A low-complexity hymn display mode for the multilingual hymn karaoke pipeline.

## Screen
- one still background image
- optional very slow zoom or pan
- no character animation required
- no scene-generation dependency
- lyric line centered near the lower third
- CC language selector changes only the lyric layer
- one audio track can be shared across languages when the melody/arrangement is the same

## Input bridge
`pack/contracts/hymn-simple-image.schema.json`

The input is designed to accept rights-cleared payloads exported by the V-tube
`hymn_multilingual` module.

## Rights
The screen refuses to expose full lyrics when the language track is marked
`COPYRIGHTED_METADATA_ONLY` or `UNKNOWN_METADATA_ONLY`.

## Korean baseline
The current 21st Century New Hymnal contains 645 hymns. The UI schema therefore
uses 1..645 for the Korean hymn-number field, while tune IDs remain the primary
cross-language identity.

## Animation Pack support order
1. IMAGE_PACK may provide a rights-cleared background.
2. MUSIC_TEACHER_PACK provides tune/language payload.
3. ANIMATION_PACK applies NONE / SLOW_ZOOM / SLOW_PAN only.
4. CAPTION/LANGUAGE bridge provides the selected lyric track.
5. AUDIO remains independent from image and lyric language.
6. Runtime readback verifies image, audio, language, current line and rights state.

This mode intentionally avoids expensive animation/video generation.
