# HYMN STOCK MEDIA → MELODY PLACEMENT BRIDGE

Existing lineage: `DUAL_EYE_MULTI_BRAIN_BRIDGE_V1`  
Owner: existing `ANIMATION_PACK` with `MUSIC_TEACHER_PACK` support.

## Goal
Use free, rights-cleared nature-first stock images/videos as a visual layer for hymn karaoke.

## Source priority
1. Pexels
2. Pixabay
3. Coverr as runtime/final-content only

Coverr content must not be ingested into an AI-training/dataset pipeline.

## Placement calculation
The song arrives from MUSIC_TEACHER_PACK with:
- verse / chorus / refrain / interlude / outro boundaries
- phrase and breath boundaries
- downbeat grid when available
- section energy 0..1
- keywords / emotional role
- HEART-PEAK markers

Each stock candidate carries:
- rights_pass
- nature_score
- semantic tags
- duration
- motion_energy
- brightness
- expansiveness
- source URL / asset URL

Weighted score:
- nature 20%
- semantic match 18%
- musical energy match 16%
- duration fit 14%
- motion match 10%
- expansiveness 8%
- brightness 5%
- type fit 4%
- freshness / repetition avoidance 5%

A hard rights failure is never scored.

## Musical cut rule
Section boundaries are snapped to the nearest downbeat only when the shift is <= 0.55s.
Otherwise the MUSIC_TEACHER boundary is preserved.

## Hymn visual grammar
- INTRO / quiet VERSE: image or slow low-motion nature
- RISE: gradual motion / wider framing
- CHORUS / REFRAIN: more expansive video
- HEART-PEAK: highest visual openness/motion, but avoid rapid cuts
- RELEASE / OUTRO: return to slower image/video and longer hold

The visual layer must not dictate lyric timing.
Lyric timing remains authoritative from MUSIC_TEACHER_PACK.

## Output
`stock_melody_optimizer.py` outputs a playlist containing:
- section start/end
- selected media
- source link
- score + features
- loop decision
- crossfade duration
- still-image motion rule

The playlist can be loaded by the Hymn Simple Image/Video workspace.
