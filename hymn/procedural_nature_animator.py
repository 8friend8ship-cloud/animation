# -*- coding: utf-8 -*-
"""Free local 30fps procedural nature animator.

Turns a rights-cleared OUR/CC0/public-domain still image into a simple ambient
MP4 without a generative-video model. Designed for hymn/idle monitor backgrounds.

This is intentionally conservative: subtle motion beats flashy artifacts.
"""
from __future__ import annotations
import argparse, math, random
from pathlib import Path
import cv2
import numpy as np

TYPES=[
    "SLOW_ZOOM","WATERFALL","RIVER_STREAM","OCEAN_WAVES","RAIN_WINDOW",
    "FIREPLACE","BIRDS_FLYING","WIND_GRASS_TREES","SUNRISE_SUNSET","STORM_TO_CLEAR"
]

def ease(x): return 0.5-0.5*math.cos(math.pi*x)

def resize_cover(img,w,h):
    ih,iw=img.shape[:2]; s=max(w/iw,h/ih)
    r=cv2.resize(img,(int(iw*s)+1,int(ih*s)+1),interpolation=cv2.INTER_CUBIC)
    y=(r.shape[0]-h)//2; x=(r.shape[1]-w)//2
    return r[y:y+h,x:x+w].copy()

def affine_zoom(img,scale,dx=0,dy=0):
    h,w=img.shape[:2]
    m=cv2.getRotationMatrix2D((w/2,h/2),0,scale)
    m[0,2]+=dx; m[1,2]+=dy
    return cv2.warpAffine(img,m,(w,h),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT_101)

def sinusoidal_warp(img,amp,phase,axis="x",period=120):
    h,w=img.shape[:2]
    yy,xx=np.indices((h,w),dtype=np.float32)
    if axis=="x":
        mapx=xx+amp*np.sin(2*np.pi*yy/period+phase); mapy=yy
    else:
        mapx=xx; mapy=yy+amp*np.sin(2*np.pi*xx/period+phase)
    return cv2.remap(img,mapx.astype(np.float32),mapy.astype(np.float32),cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT_101)

def add_rain(frame,rng,count,phase):
    h,w=frame.shape[:2]; overlay=frame.copy()
    for i in range(count):
        x=(int(rng.random()*w)+int(phase*97+i*37))%w
        y=(int(rng.random()*h)+int(phase*211+i*53))%h
        ln=int(10+rng.random()*30)
        cv2.line(overlay,(x,y),(x+2,y+ln),(210,220,230),1,cv2.LINE_AA)
    return cv2.addWeighted(frame,0.86,overlay,0.14,0)

def add_embers(frame,rng,count,phase):
    h,w=frame.shape[:2]; overlay=np.zeros_like(frame)
    for i in range(count):
        x=int(rng.random()*w)
        y=int(h-(phase*40+i*17+rng.random()*h*0.35)%max(h,1))
        rad=1+(i%2)
        cv2.circle(overlay,(x,y),rad,(40,120,255),-1,cv2.LINE_AA)
    return cv2.add(frame,overlay)

def add_birds(frame,t,count=5):
    h,w=frame.shape[:2]; out=frame.copy()
    for i in range(count):
        speed=0.035+0.007*i; x=int(((t*speed+i*0.19)%1.2-0.1)*w)
        y=int((0.18+0.06*i+0.02*math.sin(t*1.7+i))*h)
        s=max(2,int(w/320))
        wing=int(2*s*math.sin(t*7+i))
        cv2.line(out,(x,y),(x-3*s,y-wing),(35,35,35),max(1,s//2),cv2.LINE_AA)
        cv2.line(out,(x,y),(x+3*s,y-wing),(35,35,35),max(1,s//2),cv2.LINE_AA)
    return out

def grade(frame,gain=1.0,bias=0.0,warm=0.0):
    x=frame.astype(np.float32)*gain+bias
    if warm:
        x[...,2]+=warm; x[...,0]-=warm*0.35
    return np.clip(x,0,255).astype(np.uint8)

def render(image_path:Path,out_path:Path,kind:str,seconds:float,fps:int,w:int,h:int,seed:int):
    src=cv2.imread(str(image_path),cv2.IMREAD_COLOR)
    if src is None: raise RuntimeError("IMAGE_OPEN_FAILED")
    base=resize_cover(src,w,h)
    fourcc=cv2.VideoWriter_fourcc(*"mp4v")
    writer=cv2.VideoWriter(str(out_path),fourcc,float(fps),(w,h))
    if not writer.isOpened(): raise RuntimeError("VIDEO_WRITER_OPEN_FAILED")
    total=max(1,int(round(seconds*fps)))
    rng=random.Random(seed)
    for i in range(total):
        t=i/fps; p=i/max(total-1,1); cyc=2*math.pi*p
        f=base.copy()
        if kind=="SLOW_ZOOM":
            f=affine_zoom(f,1.0+0.045*ease(p))
        elif kind=="WATERFALL":
            f=sinusoidal_warp(f,2.2,cyc*2,"x",70)
            f=affine_zoom(f,1.02,dy=int(4*math.sin(cyc)))
        elif kind=="RIVER_STREAM":
            f=sinusoidal_warp(f,2.0,cyc,"y",160)
            f=affine_zoom(f,1.025,dx=int(6*math.sin(cyc)))
        elif kind=="OCEAN_WAVES":
            f=sinusoidal_warp(f,3.2,cyc*2,"y",145)
            f=affine_zoom(f,1.018,dy=int(3*math.sin(cyc*2)))
        elif kind=="RAIN_WINDOW":
            f=affine_zoom(f,1.025)
            f=add_rain(f,rng,90,t)
            f=grade(f,0.88,-4,0)
        elif kind=="FIREPLACE":
            pulse=0.96+0.08*(0.5+0.5*math.sin(t*8))+0.025*math.sin(t*17)
            f=grade(f,pulse,0,12)
            f=add_embers(f,rng,20,t)
        elif kind=="BIRDS_FLYING":
            f=affine_zoom(f,1.015+0.015*ease(p))
            f=add_birds(f,t,5)
        elif kind=="WIND_GRASS_TREES":
            f=sinusoidal_warp(f,2.8,cyc*1.5,"x",210)
            f=affine_zoom(f,1.018,dx=int(3*math.sin(cyc)))
        elif kind=="SUNRISE_SUNSET":
            gain=0.82+0.25*ease(p)
            warm=4+18*ease(p)
            f=grade(affine_zoom(f,1.0+0.025*ease(p)),gain,0,warm)
        elif kind=="STORM_TO_CLEAR":
            calm=ease(p); amp=4.5*(1-calm)+0.8
            f=sinusoidal_warp(f,amp,cyc*2,"x",110)
            f=grade(f,0.68+0.36*calm,-8*(1-calm),8*calm)
            if p<0.58: f=add_rain(f,rng,int(110*(1-p/0.58)),t)
        writer.write(f)
    writer.release()
    return {"frames":total,"fps":fps,"seconds":total/fps,"width":w,"height":h,"kind":kind}

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("image"); ap.add_argument("output")
    ap.add_argument("--kind",choices=TYPES,default="SLOW_ZOOM")
    ap.add_argument("--seconds",type=float,default=8.0)
    ap.add_argument("--fps",type=int,default=30)
    ap.add_argument("--width",type=int,default=1280)
    ap.add_argument("--height",type=int,default=720)
    ap.add_argument("--seed",type=int,default=20261006)
    a=ap.parse_args()
    info=render(Path(a.image),Path(a.output),a.kind,a.seconds,a.fps,a.width,a.height,a.seed)
    print(info)
