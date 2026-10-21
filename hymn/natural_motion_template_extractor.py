# -*- coding: utf-8 -*-
"""Extract 30fps natural-motion templates from RIGHTS-CLEARED video only.

Allowed sources:
- user-owned/user-recorded
- per-asset verified CC0/public-domain
- our own generated/procedural footage

Do NOT use this on Pexels/Pixabay/Coverr downloads as an automated ML/data-mining
pipeline unless explicit permission for that use is separately obtained.

Output is a compact motion descriptor/template, not copied frames.
"""
from __future__ import annotations
import argparse, json, math, hashlib
from pathlib import Path
import cv2
import numpy as np

def sha256_file(path:Path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for b in iter(lambda:f.read(1024*1024),b""): h.update(b)
    return h.hexdigest()

def circ_mean_deg(ang,weights):
    if len(ang)==0: return 0.0
    r=np.deg2rad(ang)
    x=np.sum(np.cos(r)*weights); y=np.sum(np.sin(r)*weights)
    return float((np.rad2deg(np.arctan2(y,x))+360)%360)

def flow_features(prev_gray,gray):
    flow=cv2.calcOpticalFlowFarneback(prev_gray,gray,None,0.5,3,15,3,5,1.2,0)
    fx,fy=flow[...,0],flow[...,1]
    mag,ang=cv2.cartToPolar(fx,fy,angleInDegrees=True)
    q=np.quantile(mag,[0.5,0.75,0.9,0.98]).tolist()
    mask=mag>max(0.2,float(q[1]))
    direction=circ_mean_deg(ang[mask],mag[mask]) if np.any(mask) else 0.0
    h,w=mag.shape
    grid=[]
    gy,gx=4,6
    for yy in range(gy):
        row=[]
        y0,y1=yy*h//gy,(yy+1)*h//gy
        for xx in range(gx):
            x0,x1=xx*w//gx,(xx+1)*w//gx
            row.append(round(float(np.mean(mag[y0:y1,x0:x1])),4))
        grid.append(row)
    return {
        "mag_median":round(float(q[0]),4),
        "mag_p75":round(float(q[1]),4),
        "mag_p90":round(float(q[2]),4),
        "mag_p98":round(float(q[3]),4),
        "dominant_direction_deg":round(direction,2),
        "active_ratio":round(float(np.mean(mask)),4),
        "grid_4x6":grid
    }

def summarize_window(frames):
    if not frames: return {}
    keys=["mag_median","mag_p75","mag_p90","mag_p98","active_ratio"]
    out={k:round(float(np.mean([x[k] for x in frames])),4) for k in keys}
    # circular average across frame directions weighted by p90
    dirs=np.array([x["dominant_direction_deg"] for x in frames],dtype=np.float32)
    ws=np.array([max(x["mag_p90"],1e-6) for x in frames],dtype=np.float32)
    out["dominant_direction_deg"]=round(circ_mean_deg(dirs,ws),2)
    arr=np.array([x["grid_4x6"] for x in frames],dtype=np.float32)
    out["grid_4x6"]=[[round(float(v),4) for v in row] for row in np.mean(arr,axis=0)]
    return out

def extract(path:Path,label:str,rights:str,target_fps=30,max_seconds=60):
    if rights not in {"USER_OWNED","CC0","PUBLIC_DOMAIN","OUR_GENERATED","EXPLICIT_ANALYSIS_LICENSE"}:
        raise ValueError("RIGHTS_NOT_ELIGIBLE_FOR_AUTOMATED_30FPS_LEARNING")
    cap=cv2.VideoCapture(str(path))
    if not cap.isOpened(): raise RuntimeError("VIDEO_OPEN_FAILED")
    src_fps=float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
    frames_total=int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration=frames_total/src_fps if frames_total>0 else 0.0
    sample_step=max(src_fps/target_fps,1.0)
    next_src_idx=0.0; src_idx=0
    prev=None; cur_window=[]; windows=[]; sampled=0
    brightness=[]; edge=[]
    max_samples=int(max_seconds*target_fps)
    while sampled<max_samples:
        ok,frame=cap.read()
        if not ok: break
        if src_idx+1e-6<next_src_idx:
            src_idx+=1; continue
        next_src_idx+=sample_step; src_idx+=1
        small=cv2.resize(frame,(384,216),interpolation=cv2.INTER_AREA)
        gray=cv2.cvtColor(small,cv2.COLOR_BGR2GRAY)
        brightness.append(float(np.mean(gray)/255.0))
        edge.append(float(np.mean(cv2.Canny(gray,80,160)>0)))
        if prev is not None:
            cur_window.append(flow_features(prev,gray))
            if len(cur_window)>=target_fps:
                windows.append(summarize_window(cur_window[:target_fps]))
                cur_window=cur_window[target_fps:]
        prev=gray; sampled+=1
    cap.release()
    if cur_window: windows.append(summarize_window(cur_window))
    global_motion=[w.get("mag_p90",0) for w in windows]
    periodicity=None
    if len(global_motion)>=4:
        x=np.array(global_motion,dtype=np.float32); x=x-np.mean(x)
        ac=np.correlate(x,x,mode="full")[len(x)-1:]
        if ac[0]>1e-9:
            ac=ac/ac[0]
            if len(ac)>1:
                lag=1+int(np.argmax(ac[1:]))
                periodicity={"best_lag_sec":lag,"autocorr":round(float(ac[lag]),4)}
    return {
        "schema":"LUMI_NATURAL_MOTION_TEMPLATE_V1",
        "source":{
            "path":str(path),"sha256":sha256_file(path),"rights":rights,
            "source_fps":round(src_fps,3),"sampled_fps":target_fps,
            "duration_sec":round(duration,3),"analyzed_sec":round(sampled/target_fps,3)
        },
        "phenomenon":label,
        "frame_rule":"1 second = 30 sampled frames",
        "brightness_mean":round(float(np.mean(brightness)),4) if brightness else 0,
        "edge_density_mean":round(float(np.mean(edge)),4) if edge else 0,
        "windows_1s":windows,
        "periodicity":periodicity,
        "use":"derive procedural/our-generated motion seed; never reconstruct source frames"
    }

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--label",required=True)
    ap.add_argument("--rights",required=True,choices=["USER_OWNED","CC0","PUBLIC_DOMAIN","OUR_GENERATED","EXPLICIT_ANALYSIS_LICENSE"])
    ap.add_argument("--fps",type=int,default=30)
    ap.add_argument("--max-seconds",type=int,default=60)
    ap.add_argument("--out",required=True)
    a=ap.parse_args()
    result=extract(Path(a.video),a.label,a.rights,a.fps,a.max_seconds)
    Path(a.out).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({"status":"PASS","out":a.out,"windows":len(result["windows_1s"]),"phenomenon":a.label},ensure_ascii=False))
