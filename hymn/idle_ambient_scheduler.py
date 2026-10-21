# -*- coding: utf-8 -*-
"""Build a continuously rotating idle ambient playlist for karaoke monitors.

Input assets are already rights-cleared runtime assets or our procedural outputs.
The scheduler maximizes scene diversity and avoids repeating the same family.

Asset fields:
id, kind(image|video), asset_url, source_url, scene_family, tags,
motion_energy(0..1), brightness(0..1), rights_pass(bool), duration(optional)
"""
from __future__ import annotations
import argparse, json, math
from pathlib import Path

def score(prev,asset,used):
    if not asset.get("rights_pass"): return -1e9
    s=1.0
    # Idle mode prefers calm-to-medium motion and moderate brightness.
    s-=abs(float(asset.get("motion_energy",0.2))-0.25)*0.32
    s-=abs(float(asset.get("brightness",0.55))-0.58)*0.12
    family=str(asset.get("scene_family","UNKNOWN"))
    if prev and family==str(prev.get("scene_family","")): s-=0.55
    count=used.get(asset["id"],0); s-=0.16*count
    # Still images are useful and cheap; videos add variety.
    if asset.get("kind")=="image": s+=0.04
    return round(s,4)

def hold_seconds(asset):
    if asset.get("kind")=="video":
        d=float(asset.get("duration") or 18)
        return round(max(10,min(d,28)),2)
    # Stills stay longer with subtle motion.
    return 24.0

def build(assets,count=18):
    selected=[]; used={}; prev=None
    eligible=[a for a in assets if a.get("rights_pass")]
    if not eligible: raise ValueError("NO_RIGHTS_CLEARED_IDLE_ASSETS")
    for i in range(count):
        ranked=sorted(((score(prev,a,used),a) for a in eligible),key=lambda x:x[0],reverse=True)
        s,a=ranked[0]
        selected.append({
            "id":a["id"],"kind":a.get("kind","image"),"asset_url":a["asset_url"],
            "source_url":a.get("source_url"),"scene_family":a.get("scene_family","UNKNOWN"),
            "tags":a.get("tags",[]),"hold_sec":hold_seconds(a),
            "motion":"SLOW_ZOOM" if a.get("kind")=="image" else "NONE",
            "idle_score":s
        })
        used[a["id"]]=used.get(a["id"],0)+1; prev=a
    return {
        "status":"PASS",
        "mode":"IDLE_AMBIENT",
        "rule":"continuous natural visuals when no song is actively playing",
        "transition":"soft fade; no rapid cutting",
        "playlist":selected
    }

if __name__=="__main__":
    ap=argparse.ArgumentParser(); ap.add_argument("input"); ap.add_argument("--out",required=True); ap.add_argument("--count",type=int,default=18)
    a=ap.parse_args(); obj=json.loads(Path(a.input).read_text(encoding="utf-8"))
    result=build(obj.get("assets",obj),a.count)
    Path(a.out).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({"status":"PASS","items":len(result["playlist"])},ensure_ascii=False))
