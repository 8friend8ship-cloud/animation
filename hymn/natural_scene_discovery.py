# -*- coding: utf-8 -*-
"""Expand the nature-scene search taxonomy from metadata and rights-safe motion templates.

Important:
- Pexels/Pixabay/Coverr: metadata/tag co-occurrence may expand SEARCH vocabulary.
  Their frames are NOT automatically mined for ML/training.
- Frame/motion learning input must be USER_OWNED, CC0, PUBLIC_DOMAIN,
  OUR_GENERATED, or EXPLICIT_ANALYSIS_LICENSE.

Input:
{
  "stock_items": [{"provider":"PIXABAY","tags":["fog","mountain",...],...}],
  "motion_templates": [{"phenomenon":"...", "source":{"rights":"CC0"}, ...}]
}
"""
from __future__ import annotations
import argparse, collections, json, re
from pathlib import Path

STOP={"nature","video","landscape","scenic","outdoor","beautiful","background","4k","hd"}
ELIGIBLE_MOTION_RIGHTS={"USER_OWNED","CC0","PUBLIC_DOMAIN","OUR_GENERATED","EXPLICIT_ANALYSIS_LICENSE"}

def norm(x):
    x=re.sub(r"[^a-z0-9_ -]+"," ",str(x).lower()).strip()
    return re.sub(r"\s+","_",x)

def metadata_candidates(items,min_assets=3):
    count=collections.Counter(); providers=collections.defaultdict(set); co=collections.Counter()
    for item in items:
        iid=str(item.get("id",""))
        tags=sorted({norm(t) for t in item.get("tags",[]) if norm(t) and norm(t) not in STOP})
        for t in tags:
            count[t]+=1; providers[t].add(str(item.get("provider","UNKNOWN")))
        for i,a in enumerate(tags):
            for b in tags[i+1:]:
                co[(a,b)]+=1
    candidates=[]
    for tag,n in count.most_common():
        if n>=min_assets:
            related=[{"tag":b if a==tag else a,"count":c} for (a,b),c in co.items() if (a==tag or b==tag) and c>=2]
            related=sorted(related,key=lambda x:x["count"],reverse=True)[:8]
            candidates.append({
                "scene_term":tag,
                "asset_count":n,
                "providers":sorted(providers[tag]),
                "related_terms":related,
                "status":"SEARCH_VOCAB_CANDIDATE_NOT_MOTION_TRAINING"
            })
    return candidates

def motion_candidates(templates):
    groups=collections.defaultdict(list)
    for t in templates:
        rights=((t.get("source") or {}).get("rights"))
        if rights not in ELIGIBLE_MOTION_RIGHTS:
            continue
        groups[norm(t.get("phenomenon","unknown"))].append(t)
    out=[]
    for label,rows in groups.items():
        p90=[]
        active=[]
        for r in rows:
            for w in r.get("windows_1s",[]):
                p90.append(float(w.get("mag_p90",0)))
                active.append(float(w.get("active_ratio",0)))
        out.append({
            "scene_term":label,
            "eligible_template_count":len(rows),
            "motion_p90_mean":round(sum(p90)/len(p90),4) if p90 else None,
            "active_ratio_mean":round(sum(active)/len(active),4) if active else None,
            "status":"MOTION_ARCHETYPE_CANDIDATE" if len(rows)>=3 else "CASE_EVIDENCE_NEEDS_MORE"
        })
    return out

if __name__=="__main__":
    ap=argparse.ArgumentParser(); ap.add_argument("input"); ap.add_argument("--out",required=True); ap.add_argument("--min-assets",type=int,default=3)
    a=ap.parse_args(); obj=json.loads(Path(a.input).read_text(encoding="utf-8"))
    result={
      "schema":"LUMI_DYNAMIC_NATURE_SCENE_DISCOVERY_V1",
      "metadata_search_candidates":metadata_candidates(obj.get("stock_items",[]),a.min_assets),
      "rights_safe_motion_candidates":motion_candidates(obj.get("motion_templates",[])),
      "rule":"new terms expand search first; reusable motion template promotion requires rights-safe motion evidence and human review"
    }
    Path(a.out).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({"status":"PASS","search_candidates":len(result["metadata_search_candidates"]),"motion_candidates":len(result["rights_safe_motion_candidates"])},ensure_ascii=False))
