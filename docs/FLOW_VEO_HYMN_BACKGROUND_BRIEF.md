# FLOW + VEO 3.1 HYMN BACKGROUND TEACHER BRIEF

## Conclusion
Use Flow/Veo as a **motion teacher**, not as the renderer for every hymn.

### Most efficient route
1. Flow creates one lyric-safe 16:9 nature still.
2. Veo 3.1 creates one 8-second gentle-motion seed.
3. 8 seconds x 30fps = 240 frames.
4. Existing `natural_motion_template_extractor.py` learns only motion fields from OUR generated clip.
5. Existing local procedural animator recreates 15–60s ambient loops from our own/right-cleared stills.
6. MUSIC_TEACHER chooses when that visual family is used in the hymn.
7. The monitor uses a long loop, not a distracting rapid sequence of 8-second clips.

## Worship design rules learned
- Readability is the first criterion.
- Keep center/lower-third calmer and darker than the rest of frame.
- Camera should be locked or extremely slow.
- Fast particles, fast pans, abrupt brightness change and repeated cuts are rejected.
- One background family per song is the default.
- Switch only at a major bridge/key change/HEART-PEAK when the musical reason is clear.
- Nature categories: calm water, cloud/sky, forest/field, sunrise/sunset, rain, fireplace, distant birds.
- Still backgrounds are better for dense text/teaching; motion is best for sung worship.

## Veo 8-second seed prompt shape
```
[wide nature scene], fixed camera, very slow natural movement,
gentle physically plausible motion, no cuts, no people,
no text or logos, preserve a calm low-detail area across the center and lower third
for bright hymn lyrics, soft cinematic light, no flashing, no sudden exposure change,
begin and end in visually compatible states, 16:9.
```

Then add only the phenomenon:
- waterfall: continuous downward water and mist
- ocean: slow periodic waves approaching shore
- stream: gentle directional flow and small ripples
- rain window: slow droplets, defocused quiet exterior
- fireplace: restrained flame and ember movement
- wind: layered grasses/trees swaying with phase offsets
- sunrise/sunset: mostly light/color change, very little camera motion
- storm-to-clear: dark clouds/rain gradually reduce into a calm bright opening

## Credit rule
No Flow/Veo generation is executed automatically. Credit use requires explicit approval.
