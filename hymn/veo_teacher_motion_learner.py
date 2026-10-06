# -*- coding: utf-8 -*-
"""Veo teacher-video motion learner for AnimationPack + VideoPack.

Purpose
-------
Read OUR-GENERATED / rights-cleared teacher videos, normalize them to a 30fps
analysis timeline, and extract reusable *motion descriptors* rather than copied
frames.

This learner separates:
- global camera motion: pan / tilt / zoom / rotation
- residual/local motion: water, fire, rain, foliage, particles, subject motion
- cuts / discontinuities
- lyric-safe-zone visual density
- first/end compatibility for looping

It never auto-promotes a clip to a reusable template. Input manifest status is
carried through and promotion remains gated by visual/runtime QC.
"""
from __future__ import annotations
import argparse, hashlib, json, math
from pathlib import Path
import cv2
import numpy as np

ELIGIBLE_RIGHTS={"OUR_GENERATED","USER_OWNED","CC0","PUBLIC_DOMAIN","EXPLICIT_ANALYSIS_LICENSE"}

def sha256_file(path:Path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for b in iter(lambda:f.read(1024*1024),b""): h.update(b)
    return h.hexdigest()

def read_frame_at(cap,t_sec,w=320,h=180):
    cap.set(cv2.CAP_PROP_POS_MSEC,max(0.0,t_sec)*1000.0)
    ok,fr=cap.read()
    if not ok: return None
    return cv2.resize(fr,(w,h),interpolation=cv2.INTER_AREA)

def gray(fr): return cv2.cvtColor(fr,cv2.COLOR_BGR2GRAY)

def global_affine(prev_g,g):
    pts=cv2.goodFeaturesToTrack(prev_g,maxCorners=250,qualityLevel=0.01,minDistance=5,blockSize=7)
    if pts is None or len(pts)<8:
        return {"dx":0.0,"dy":0.0,"scale":1.0,"rotation_deg":0.0,"inlier_ratio":0.0}
    nxt,st,_=cv2.calcOpticalFlowPyrLK(prev_g,g,pts,None,winSize=(21,21),maxLevel=3)
    good=st.reshape(-1)==1
    p0=pts.reshape(-1,2)[good]; p1=nxt.reshape(-1,2)[good]
    if len(p0)<8:
        return {"dx":0.0,"dy":0.0,"scale":1.0,"rotation_deg":0.0,"inlier_ratio":0.0}
    M,inliers=cv2.estimateAffinePartial2D(p0,p1,method=cv2.RANSAC,ransacReprojThreshold=2.0,maxIters=1000)
    if M is None:
        return {"dx":0.0,"dy":0.0,"scale":1.0,"rotation_deg":0.0,"inlier_ratio":0.0}
    a,b,tx=M[0]; c,d,ty=M[1]
    scale=float(math.sqrt(max(a*a+c*c,1e-12)))
    rot=float(math.degrees(math.atan2(c,a)))
    ir=float(np.mean(inliers)) if inliers is not None and len(inliers) else 0.0
    return {"dx":round(float(tx),4),"dy":round(float(ty),4),
            "scale":round(scale,6),"rotation_deg":round(rot,4),
            "inlier_ratio":round(ir,4)}

def residual_flow(prev_g,g,aff):
    h,w=prev_g.shape
    a=math.radians(aff["rotation_deg"]); s=aff["scale"]
    M=np.array([[s*math.cos(a),-s*math.sin(a),aff["dx"]],
                [s*math.sin(a), s*math.cos(a),aff["dy"]]],dtype=np.float32)
    warped=cv2.warpAffine(prev_g,M,(w,h),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT_101)
    flow=cv2.calcOpticalFlowFarneback(warped,g,None,0.5,3,15,3,5,1.2,0)
    fx,fy=flow[...,0],flow[...,1]
    mag,ang=cv2.cartToPolar(fx,fy,angleInDegrees=True)
    q=np.quantile(mag,[0.5,0.75,0.9,0.98])
    active=mag>max(0.25,float(q[1]))
    if np.any(active):
        rr=np.deg2rad(ang[active]); ww=mag[active]
        direction=float((math.degrees(math.atan2(float(np.sum(np.sin(rr)*ww)),float(np.sum(np.cos(rr)*ww))))+360)%360)
    else: direction=0.0
    return {"median":round(float(q[0]),4),"p75":round(float(q[1]),4),
            "p90":round(float(q[2]),4),"p98":round(float(q[3]),4),
            "active_ratio":round(float(np.mean(active)),4),
            "direction_deg":round(direction,2)}

def frame_metrics(fr):
    g=gray(fr); h,w=g.shape
    safe=g[int(h*.50):int(h*.93),int(w*.08):int(w*.92)]
    edge=cv2.Canny(safe,70,150)
    return {
        "brightness":round(float(np.mean(g)/255.0),4),
        "global_edge_density":round(float(np.mean(cv2.Canny(g,70,150)>0)),4),
        "lyric_safe_edge_density":round(float(np.mean(edge>0)),4),
        "lyric_safe_brightness_std":round(float(np.std(safe)/255.0),4)
    }

def hist_corr(a,b):
    ha=cv2.calcHist([a],[0],None,[64],[0,256]); hb=cv2.calcHist([b],[0],None,[64],[0,256])
    cv2.normalize(ha,ha); cv2.normalize(hb,hb)
    return float(cv2.compareHist(ha,hb,cv2.HISTCMP_CORREL))

def classify_camera(steps):
    if not steps: return "STATIC_OR_UNRESOLVED"
    dx=float(np.median([x["affine"]["dx"] for x in steps]))
    dy=float(np.median([x["affine"]["dy"] for x in steps]))
    zoom=float(np.median([x["affine"]["scale"]-1.0 for x in steps]))
    rot=float(np.median([x["affine"]["rotation_deg"] for x in steps]))
    vals={"PAN_X":abs(dx),"TILT_Y":abs(dy),"ZOOM":abs(zoom)*100.0,"ROTATE":abs(rot)}
    best=max(vals,key=vals.get)
    if vals[best]<0.08: return "LOCKED_OR_VERY_SLOW"
    return best

def analyze(entry,target_fps=30,max_sec=None):
    p=Path(entry["path"])
    rights=entry.get("rights","")
    if rights not in ELIGIBLE_RIGHTS: raise ValueError("RIGHTS_NOT_ELIGIBLE:"+rights)
    cap=cv2.VideoCapture(str(p))
    if not cap.isOpened(): raise RuntimeError("OPEN_FAIL:"+str(p))
    src_fps=float(cap.get(cv2.CAP_PROP_FPS) or 0)
    frame_count=int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration=frame_count/src_fps if src_fps>0 else float(entry.get("duration") or 0)
    use_dur=min(duration,float(max_sec)) if max_sec else duration
    # Uniform 30fps timeline by timestamp seek. For 24fps Veo, repeated source
    # frames are expected; analysis cadence is still 30 slots/sec.
    times=np.arange(0,max(use_dur-1e-6,0),1.0/target_fps,dtype=np.float64)
    frames=[]; metrics=[]
    for t in times:
        fr=read_frame_at(cap,float(t))
        if fr is None: break
        frames.append(fr); metrics.append(frame_metrics(fr))
    cap.release()
    steps=[]
    cut_flags=[]
    prev=None
    for i,fr in enumerate(frames):
        g=gray(fr)
        if prev is not None:
            aff=global_affine(prev,g)
            res=residual_flow(prev,g,aff)
            mad=float(np.mean(cv2.absdiff(prev,g))/255.0)
            hc=hist_corr(prev,g)
            cut=(mad>0.22 and hc<0.72)
            steps.append({"t":round(i/target_fps,3),"affine":aff,"residual":res,
                          "frame_mad":round(mad,4),"hist_corr":round(hc,4),"cut":cut})
            if cut: cut_flags.append(round(i/target_fps,3))
        prev=g
    windows=[]
    for sec in range(int(math.ceil(len(frames)/target_fps))):
        s=sec*target_fps; e=min((sec+1)*target_fps-1,len(steps))
        xs=steps[s:e] if e>s else []
        if not xs: continue
        windows.append({
            "sec":sec,
            "camera_dx_median":round(float(np.median([x["affine"]["dx"] for x in xs])),4),
            "camera_dy_median":round(float(np.median([x["affine"]["dy"] for x in xs])),4),
            "camera_scale_delta_median":round(float(np.median([x["affine"]["scale"]-1 for x in xs])),6),
            "camera_rotation_median":round(float(np.median([x["affine"]["rotation_deg"] for x in xs])),4),
            "residual_p90_mean":round(float(np.mean([x["residual"]["p90"] for x in xs])),4),
            "residual_active_mean":round(float(np.mean([x["residual"]["active_ratio"] for x in xs])),4),
            "cut_count":sum(1 for x in xs if x["cut"])
        })
    first=gray(frames[0]) if frames else None; last=gray(frames[-1]) if frames else None
    loop={}
    if first is not None and last is not None:
        loop={
            "first_last_mad":round(float(np.mean(cv2.absdiff(first,last))/255.0),4),
            "first_last_hist_corr":round(hist_corr(first,last),4)
        }
    return {
        "source":{
            "path":str(p),"sha256":sha256_file(p),"rights":rights,
            "teacher_status":entry.get("teacher_status","MOTION_OBSERVATION_ONLY_HOLD"),
            "source_fps":round(src_fps,3),"source_frames":frame_count,
            "duration_sec":round(duration,3),"analysis_fps":target_fps,
            "analysis_slots":len(frames)
        },
        "camera_class":classify_camera(steps),
        "cut_times_sec":cut_flags,
        "loopability":loop,
        "visual":{
            "brightness_mean":round(float(np.mean([m["brightness"] for m in metrics])),4) if metrics else 0,
            "edge_density_mean":round(float(np.mean([m["global_edge_density"] for m in metrics])),4) if metrics else 0,
            "lyric_safe_edge_density_mean":round(float(np.mean([m["lyric_safe_edge_density"] for m in metrics])),4) if metrics else 0,
            "lyric_safe_brightness_std_mean":round(float(np.mean([m["lyric_safe_brightness_std"] for m in metrics])),4) if metrics else 0
        },
        "windows_1s":windows,
        "promotion":{
            "allowed":False,
            "reason":"DESCRIPTOR_ONLY_UNTIL_VISUAL_RUNTIME_QC_AND_PACK_PROMOTION_GATE"
        }
    }

if __name__=="__main__":
    ap=argparse.ArgumentParser(); ap.add_argument("manifest"); ap.add_argument("--out",required=True)
    ap.add_argument("--fps",type=int,default=30); ap.add_argument("--max-sec",type=float)
    a=ap.parse_args()
    manifest=json.loads(Path(a.manifest).read_text(encoding="utf-8"))
    results=[]; errors=[]
    seen=set()
    for e in manifest.get("videos",[]):
        try:
            h=e.get("sha256")
            if h and h in seen: continue
            r=analyze(e,a.fps,a.max_sec); seen.add(r["source"]["sha256"]); results.append(r)
        except Exception as ex:
            errors.append({"path":e.get("path"),"error":str(ex)})
    out={
        "schema":"VEO_TEACHER_MOTION_LEARNING_V1",
        "lineage":"DUAL_EYE_MULTI_BRAIN_BRIDGE_V1",
        "pack_consumers":["VideoPack","AnimationPack","VTubePack","MotionPack"],
        "analysis_fps":a.fps,
        "video_count":len(results),"error_count":len(errors),
        "results":results,"errors":errors,
        "new_paid_generation_count":0,
        "promotion_count":0
    }
    Path(a.out).write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({"status":"PASS" if not errors else "PARTIAL","videos":len(results),"errors":len(errors),
                      "out":a.out,"paid":0,"promoted":0},ensure_ascii=False))
