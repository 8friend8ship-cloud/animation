# -*- coding: utf-8 -*-
"""Search Pexels/Pixabay and normalize nature stock candidates for hymn visuals.

Keys are read only from environment:
  PEXELS_API_KEY
  PIXABAY_API_KEY

No API key is written to output or logs.
The collector stores links/metadata first; media download is a separate approved step.
"""
from __future__ import annotations
import argparse, json, os, urllib.parse, urllib.request
from pathlib import Path

UA="LUMI-Hymn-Stock-Bridge/1.0"

def get_json(url,headers=None):
    req=urllib.request.Request(url,headers={"User-Agent":UA,**(headers or {})})
    with urllib.request.urlopen(req,timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))

def choose_pexels_video_file(video):
    files=[f for f in video.get("video_files",[]) if f.get("link")]
    if not files: return None
    # Prefer landscape HD-ish, avoiding needlessly huge 4K for karaoke backgrounds.
    files.sort(key=lambda f:(
        abs((f.get("width") or 1920)-1920)+abs((f.get("height") or 1080)-1080),
        -(f.get("width") or 0)*(f.get("height") or 0)
    ))
    return files[0]

def pexels(query,kind,per_page,locale):
    key=os.environ.get("PEXELS_API_KEY")
    if not key:
        return {"provider":"PEXELS","status":"HOLD_MISSING_API_KEY","items":[]}
    if kind=="video":
        url="https://api.pexels.com/v1/videos/search?"+urllib.parse.urlencode({
            "query":query,"per_page":per_page,"orientation":"landscape","size":"medium","locale":locale
        })
        data=get_json(url,{"Authorization":key})
        items=[]
        for v in data.get("videos",[]):
            f=choose_pexels_video_file(v)
            if not f: continue
            items.append({
                "id":"pexels-video-"+str(v.get("id")),
                "provider":"PEXELS","kind":"video","duration":v.get("duration") or 0,
                "tags":[x for x in query.lower().replace(","," ").split() if x],
                "nature_score":1.0,"motion_energy":0.35,"brightness":0.5,"expansiveness":0.7,
                "rights_pass":True,
                "source_url":v.get("url"),
                "asset_url":f.get("link"),
                "creator":(v.get("user") or {}).get("name"),
                "width":f.get("width"),"height":f.get("height"),
                "license":"Pexels License",
                "api_credit_url":"https://www.pexels.com/"
            })
        return {"provider":"PEXELS","status":"PASS","items":items}
    url="https://api.pexels.com/v1/search?"+urllib.parse.urlencode({
        "query":query,"per_page":per_page,"orientation":"landscape","size":"large","locale":locale
    })
    data=get_json(url,{"Authorization":key})
    items=[]
    for p in data.get("photos",[]):
        src=p.get("src") or {}
        link=src.get("large2x") or src.get("large") or src.get("original")
        if not link: continue
        items.append({
            "id":"pexels-photo-"+str(p.get("id")),
            "provider":"PEXELS","kind":"image","duration":None,
            "tags":[x for x in query.lower().replace(","," ").split() if x],
            "nature_score":1.0,"motion_energy":0.05,"brightness":0.5,"expansiveness":0.7,
            "rights_pass":True,
            "source_url":p.get("url"),"asset_url":link,
            "creator":p.get("photographer"),"width":p.get("width"),"height":p.get("height"),
            "license":"Pexels License","api_credit_url":"https://www.pexels.com/"
        })
    return {"provider":"PEXELS","status":"PASS","items":items}

def pixabay(query,kind,per_page,lang):
    key=os.environ.get("PIXABAY_API_KEY")
    if not key:
        return {"provider":"PIXABAY","status":"HOLD_MISSING_API_KEY","items":[]}
    endpoint="https://pixabay.com/api/videos/" if kind=="video" else "https://pixabay.com/api/"
    params={"key":key,"q":query,"per_page":per_page,"safesearch":"true","lang":lang,"category":"nature"}
    if kind=="video": params["video_type"]="film"
    else:
        params.update({"image_type":"photo","orientation":"horizontal"})
    data=get_json(endpoint+"?"+urllib.parse.urlencode(params))
    items=[]
    for x in data.get("hits",[]):
        if kind=="video":
            videos=x.get("videos") or {}
            v=videos.get("medium") or videos.get("small") or videos.get("large") or videos.get("tiny") or {}
            link=v.get("url")
            if not link: continue
            width,height=v.get("width"),v.get("height")
            duration=x.get("duration") or 0
        else:
            link=x.get("largeImageURL") or x.get("webformatURL")
            if not link: continue
            width,height=x.get("imageWidth"),x.get("imageHeight")
            duration=None
        tags=[t.strip().lower() for t in str(x.get("tags","")).split(",") if t.strip()]
        items.append({
            "id":"pixabay-"+kind+"-"+str(x.get("id")),
            "provider":"PIXABAY","kind":kind,"duration":duration,
            "tags":tags,"nature_score":1.0,
            "motion_energy":0.35 if kind=="video" else 0.05,
            "brightness":0.5,"expansiveness":0.7,"rights_pass":True,
            "source_url":x.get("pageURL"),"asset_url":link,"creator":x.get("user"),
            "width":width,"height":height,"license":"Pixabay Content License",
            "api_credit_url":"https://pixabay.com/"
        })
    return {"provider":"PIXABAY","status":"PASS","items":items}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("query")
    ap.add_argument("--kind",choices=["image","video","both"],default="both")
    ap.add_argument("--provider",choices=["pexels","pixabay","both"],default="both")
    ap.add_argument("--per-page",type=int,default=15)
    ap.add_argument("--out")
    a=ap.parse_args()
    kinds=["image","video"] if a.kind=="both" else [a.kind]
    results=[]; items=[]
    if a.provider in {"pexels","both"}:
        for k in kinds:
            r=pexels(a.query,k,a.per_page,"ko-KR"); results.append(r); items.extend(r["items"])
    if a.provider in {"pixabay","both"}:
        for k in kinds:
            r=pixabay(a.query,k,a.per_page,"ko"); results.append(r); items.extend(r["items"])
    out={
        "status":"PASS" if items else "HOLD_NO_ITEMS_OR_API_KEYS",
        "query":a.query,
        "providers":results,
        "item_count":len(items),
        "items":items,
        "note":"Links/metadata only. Download/cache and license snapshot happen in a separate approved collection step."
    }
    text=json.dumps(out,ensure_ascii=False,indent=2)
    if a.out: Path(a.out).write_text(text,encoding="utf-8")
    print(text)

if __name__=="__main__": main()
