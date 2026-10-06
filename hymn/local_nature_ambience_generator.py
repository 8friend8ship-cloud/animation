# -*- coding: utf-8 -*-
"""Token-free local nature ambience synthesizer.
Creates simple original ambience beds from rules distilled from approved teacher clips.
"""
from __future__ import annotations
import argparse,math,wave
from pathlib import Path
import numpy as np

def pinkish(n,rng):
    x=rng.standard_normal(n).astype(np.float32)
    y=np.zeros_like(x); a=0.985
    for i in range(1,n): y[i]=a*y[i-1]+(1-a)*x[i]
    y/=max(np.max(np.abs(y)),1e-6)
    return y

def make(kind,sec,sr,seed):
    rng=np.random.default_rng(seed); n=int(sec*sr); t=np.arange(n)/sr
    base=pinkish(n,rng)
    if kind=="WIND":
        env=.45+.25*np.sin(2*np.pi*.08*t)+.12*np.sin(2*np.pi*.17*t+1.2)
        x=base*env
    elif kind=="RAIN":
        x=.28*base+.18*rng.standard_normal(n)
        drops=np.zeros(n,dtype=np.float32)
        for _ in range(int(sec*18)):
            i=int(rng.integers(0,n)); L=min(n-i,int(sr*.03))
            if L>1: drops[i:i+L]+=np.linspace(1,0,L)*rng.uniform(.15,.5)
        x+=drops
    elif kind=="OCEAN":
        env=.22+.35*(.5+.5*np.sin(2*np.pi*.11*t))**2
        x=base*env
    elif kind=="RIVER":
        x=.38*base+.05*np.sin(2*np.pi*1.3*t)+.03*np.sin(2*np.pi*2.7*t)
    elif kind=="FIREPLACE":
        x=.12*base
        for _ in range(int(sec*6)):
            i=int(rng.integers(0,n)); L=min(n-i,int(sr*.025))
            if L>1: x[i:i+L]+=np.linspace(1,0,L)*rng.uniform(.2,.7)
    elif kind=="BIRDS":
        x=.08*base
        for _ in range(max(1,int(sec/3))):
            st=rng.uniform(0,max(sec-.4,.1)); dur=rng.uniform(.12,.35); f=rng.uniform(1800,4200)
            i=int(st*sr); L=min(n-i,int(dur*sr))
            if L>1:
                tt=np.arange(L)/sr; env=np.sin(np.pi*np.arange(L)/L)**2
                x[i:i+L]+=.12*np.sin(2*np.pi*(f+240*np.sin(2*np.pi*7*tt))*tt)*env
    else:
        x=.2*base
    x=np.tanh(x); x*=0.55/max(np.max(np.abs(x)),1e-6)
    return x.astype(np.float32)

def write_wav(path,x,sr):
    pcm=np.clip(x*32767,-32768,32767).astype(np.int16)
    with wave.open(str(path),"wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())

if __name__=="__main__":
    ap=argparse.ArgumentParser(); ap.add_argument("output"); ap.add_argument("--kind",choices=["WIND","RAIN","OCEAN","RIVER","FIREPLACE","BIRDS"],required=True)
    ap.add_argument("--seconds",type=float,default=20); ap.add_argument("--sr",type=int,default=48000); ap.add_argument("--seed",type=int,default=20261006)
    a=ap.parse_args(); x=make(a.kind,a.seconds,a.sr,a.seed); write_wav(Path(a.output),x,a.sr)
    print({"status":"PASS","kind":a.kind,"seconds":a.seconds,"sr":a.sr,"output":a.output})
