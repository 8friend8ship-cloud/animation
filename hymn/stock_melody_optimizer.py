# -*- coding: utf-8 -*-
"""Hymn stock-media / melody placement optimizer.

Input JSON structure:
{
  "song": {
    "duration": 210.0,
    "bpm": 72,
    "downbeats": [0.0, 3.33, ...],
    "sections": [
      {"id":"V1","start":0,"end":32,"role":"VERSE","energy":0.25,
       "keywords":["grace","quiet"],"heart_peak":false}
    ]
  },
  "media": [
    {"id":"p1","kind":"video","duration":18,"tags":["mountain","sunrise"],
     "nature_score":1.0,"motion_energy":0.25,"brightness":0.7,
     "expansiveness":0.8,"rights_pass":true,"source_url":"...","asset_url":"..."}
  ]
}

Output is a cut list aligned to musical sections/downbeats.
This is a deterministic placement optimizer, not an AI stock-content trainer.
"""
from __future__ import annotations
import json, math, sys
from pathlib import Path

WEIGHTS={
    "nature":0.20,
    "semantic":0.18,
    "energy":0.16,
    "duration":0.14,
    "motion":0.10,
    "expansiveness":0.08,
    "brightness":0.05,
    "type_fit":0.04,
    "freshness":0.05,
}

def clamp(x,a=0.0,b=1.0): return max(a,min(b,x))

def tag_similarity(a,b):
    a={str(x).lower() for x in (a or [])}
    b={str(x).lower() for x in (b or [])}
    if not a or not b: return 0.0
    return len(a & b)/len(a | b)

def closeness(a,b,scale=1.0):
    return clamp(1.0-abs(float(a)-float(b))/max(scale,1e-9))

def duration_fit(section_len, media):
    kind=media.get("kind","image")
    if kind=="image":
        return 0.95
    d=max(float(media.get("duration",0)),0.001)
    if d>=section_len:
        return clamp(1.0-(d-section_len)/max(section_len*3,1))
    # Short clips may loop, but looping is penalized.
    loops=math.ceil(section_len/d)
    return clamp(0.82-0.12*(loops-1))

def desired_visual(section):
    role=str(section.get("role","VERSE")).upper()
    energy=clamp(float(section.get("energy",0.3)))
    peak=bool(section.get("heart_peak"))
    if peak or role in {"CHORUS","REFRAIN","CLIMAX"}:
        return {"motion":clamp(max(0.55,energy)),"exp":0.9,"bright":0.72,"video_bonus":1.0}
    if role in {"INTRO","OUTRO","PRAYER","VERSE"}:
        return {"motion":clamp(min(0.35,energy)),"exp":0.65,"bright":0.58,"video_bonus":0.65}
    return {"motion":energy,"exp":0.72,"bright":0.62,"video_bonus":0.8}

def score(section, media, used_counts):
    if not media.get("rights_pass"):
        return -1e9, {"blocked":"RIGHTS_NOT_PASS"}
    target=desired_visual(section)
    sem=tag_similarity(section.get("keywords"),media.get("tags"))
    section_len=max(0.1,float(section["end"])-float(section["start"]))
    media_energy=clamp(float(media.get("motion_energy",0.2)))
    nature=clamp(float(media.get("nature_score",0.0)))
    vals={
        "nature":nature,
        "semantic":sem,
        "energy":closeness(section.get("energy",0.3),media_energy,1.0),
        "duration":duration_fit(section_len,media),
        "motion":closeness(target["motion"],media_energy,1.0),
        "expansiveness":closeness(target["exp"],media.get("expansiveness",0.5),1.0),
        "brightness":closeness(target["bright"],media.get("brightness",0.5),1.0),
        "type_fit":1.0 if (media.get("kind")=="video" and target["video_bonus"]>=0.9) else 0.85,
        "freshness":1.0/(1.0+used_counts.get(media["id"],0)*1.5),
    }
    total=sum(vals[k]*WEIGHTS[k] for k in WEIGHTS)
    if used_counts.get(media["id"],0)>0:
        total-=0.08*used_counts[media["id"]]
    return round(total,4), vals

def snap(t, downbeats, max_delta=0.55):
    if not downbeats: return float(t)
    nearest=min(downbeats,key=lambda x:abs(float(x)-float(t)))
    return float(nearest) if abs(float(nearest)-float(t))<=max_delta else float(t)

def crossfade_seconds(bpm, role):
    beat=60.0/max(float(bpm or 72),1)
    base=beat*0.6
    if str(role).upper() in {"CHORUS","REFRAIN","CLIMAX"}: base*=0.8
    return round(clamp(base,0.35,1.25),3)

def optimize(obj):
    song=obj["song"]; media=list(obj.get("media",[]))
    sections=list(song.get("sections",[])); downbeats=list(song.get("downbeats",[]))
    used={}; playlist=[]
    for sec in sections:
        ranked=[]
        for m in media:
            s,features=score(sec,m,used)
            if s>-1e8: ranked.append((s,m,features))
        if not ranked:
            raise ValueError("NO_RIGHTS_CLEARED_MEDIA_FOR_SECTION:"+str(sec.get("id")))
        ranked.sort(key=lambda x:x[0],reverse=True)
        s,m,features=ranked[0]
        used[m["id"]]=used.get(m["id"],0)+1
        start=snap(sec["start"],downbeats)
        end=snap(sec["end"],downbeats)
        if end<=start: end=float(sec["end"])
        playlist.append({
            "section_id":sec["id"],
            "role":sec.get("role","VERSE"),
            "start":round(start,3),
            "end":round(end,3),
            "media_id":m["id"],
            "kind":m.get("kind","image"),
            "asset_url":m.get("asset_url"),
            "source_url":m.get("source_url"),
            "score":s,
            "score_features":features,
            "crossfade_sec":crossfade_seconds(song.get("bpm",72),sec.get("role")),
            "loop":bool(m.get("kind")=="video" and float(m.get("duration",0))<(end-start)),
            "motion":"SLOW_ZOOM" if m.get("kind")=="image" and not sec.get("heart_peak") else "NONE",
        })
    return {
        "status":"PASS",
        "strategy":"SECTION_ROLE + DOWNBEAT_SNAP + RIGHTS + NATURE + SEMANTIC + ENERGY + DURATION + REPETITION",
        "playlist":playlist,
        "used_media_count":len(used),
        "section_count":len(sections),
    }

if __name__=="__main__":
    if len(sys.argv)!=2:
        print(json.dumps({"status":"FAIL","error":"INPUT_JSON_REQUIRED"})); raise SystemExit(2)
    obj=json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    print(json.dumps(optimize(obj),ensure_ascii=False,indent=2))
