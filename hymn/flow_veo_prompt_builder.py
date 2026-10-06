# -*- coding: utf-8 -*-
from __future__ import annotations
import argparse,json
from pathlib import Path

def build(grammar,phenomenon,variant_note=""):
    p=grammar["phenomena"][phenomenon]
    g=grammar["global_hymn_rules"]
    flow=(
        f'{p["framing"]}. Camera: {p["camera"]}. Lens look: {p["lens"]}. '
        f'Lighting: {p["light"]}. Photorealistic natural landscape, calm church hymn background, 16:9. '
        f'Keep the center and lower third visually simple, low-detail and readable for bright hymn lyrics. '
        f'No people, no words, no logos, no signs, no flashing highlights. {variant_note}'.strip()
    )
    veo=(
        f'Animate the provided approved image without changing the composition. '
        f'Natural motion: {p["motion"]}. Preserve the center and lower-third lyric-safe area. '
        f'Gentle physically plausible motion only. No cuts, no new objects, no text or logos, '
        f'no sudden exposure change, no whip pan, no fast zoom. '
        f'Begin and end in visually compatible states for looping. 16:9.'
    )
    return {
        "phenomenon":phenomenon,
        "flow_still_prompt":flow,
        "veo_motion_prompt":veo,
        "camera":p["camera"],
        "lens_look":p["lens"],
        "lighting":p["light"],
        "pipeline":[
            "REFERENCE_GRAMMAR",
            "FLOW_STILL_PROMPT",
            "FLOW_STILL_GENERATE_AFTER_APPROVAL",
            "GEMINI_EYE_IMAGE_ATTACH_AND_READBACK",
            "GEMINI_EYE_IMAGE_QC",
            "OPENAI_IMAGE_CROSSCHECK",
            "VEO_MOTION_PROMPT_BUILD",
            "GEMINI_EYE_VEO_PRESUBMIT_READBACK",
            "OPENAI_VEO_PRESUBMIT_CROSSCHECK",
            "USER_CREDIT_APPROVAL",
            "VEO_GENERATE",
            "GEMINI_EYE_VIDEO_QC",
            "LOCAL_30FPS_MOTION_ANALYSIS"
        ],
        "credit_guard":"NO_FLOW_OR_VEO_CREDIT_ACTION_WITHOUT_EXISTING_OR_EXPLICIT_APPROVAL"
    }

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("grammar")
    ap.add_argument("phenomenon")
    ap.add_argument("--variant",default="")
    ap.add_argument("--out")
    a=ap.parse_args()
    grammar=json.loads(Path(a.grammar).read_text(encoding="utf-8"))
    out=build(grammar,a.phenomenon,a.variant)
    text=json.dumps(out,ensure_ascii=False,indent=2)
    if a.out: Path(a.out).write_text(text,encoding="utf-8")
    print(text)
