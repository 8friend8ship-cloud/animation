# -*- coding: utf-8 -*-
from __future__ import annotations
import argparse,json,shutil,subprocess,wave,math
from pathlib import Path
import numpy as np

def run(cmd):
    p=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding="utf-8",errors="replace")
    if p.returncode!=0: raise RuntimeError(p.stderr[-3000:])
    return p.stdout

def probe(path):
    ffprobe=shutil.which("ffprobe")
    if not ffprobe: raise RuntimeError("FFPROBE_NOT_FOUND")
    return json.loads(run([ffprobe,"-v","error","-show_streams","-show_format","-of","json",str(path)]))

def split_av(src,silent,audio):
    ffmpeg=shutil.which("ffmpeg")
    if not ffmpeg: raise RuntimeError("FFMPEG_NOT_FOUND")
    run([ffmpeg,"-y","-i",str(src),"-map","0:v:0","-c:v","copy","-an","-sn","-dn",str(silent)])
    meta=probe(src); aud=[s for s in meta.get("streams",[]) if s.get("codec_type")=="audio"]
    if aud:
        run([ffmpeg,"-y","-i",str(src),"-map","0:a:0","-ac","2","-ar","48000","-c:a","pcm_s16le",str(audio)])
    return bool(aud)

def audio_features(path):
    if not path.exists(): return {"status":"NO_AUDIO"}
    with wave.open(str(path),"rb") as w:
        ch=w.getnchannels(); sr=w.getframerate(); n=w.getnframes()
        raw=w.readframes(n)
    x=np.frombuffer(raw,dtype=np.int16).astype(np.float32)/32768.0
    if ch>1: x=x.reshape(-1,ch).mean(axis=1)
    if x.size==0: return {"status":"EMPTY_AUDIO"}
    peak=float(np.max(np.abs(x))); rms=float(np.sqrt(np.mean(x*x)+1e-12))
    clip=float(np.mean(np.abs(x)>=0.999))
    win=max(256,int(sr*0.25)); hops=[]
    for i in range(0,max(1,len(x)-win+1),win):
        s=x[i:i+win]
        if len(s)<win: break
        hops.append(float(np.sqrt(np.mean(s*s)+1e-12)))
    return {
      "status":"PASS","sample_rate":sr,"channels_original":ch,"duration_sec":round(len(x)/sr,3),
      "rms_dbfs":round(20*math.log10(max(rms,1e-9)),3),
      "peak_dbfs":round(20*math.log10(max(peak,1e-9)),3),
      "clip_ratio":round(clip,6),
      "envelope_250ms":[round(v,6) for v in hops[:240]]
    }

def verify_silent(path):
    p=probe(path); streams=p.get("streams",[])
    return {
      "audio_stream_count":sum(s.get("codec_type")=="audio" for s in streams),
      "video_stream_count":sum(s.get("codec_type")=="video" for s in streams),
      "duration_sec":float((p.get("format") or {}).get("duration") or 0)
    }

if __name__=="__main__":
    ap=argparse.ArgumentParser(); ap.add_argument("input"); ap.add_argument("--silent",required=True); ap.add_argument("--audio",required=True); ap.add_argument("--report",required=True)
    a=ap.parse_args()
    has_audio=split_av(Path(a.input),Path(a.silent),Path(a.audio))
    sv=verify_silent(Path(a.silent)); af=audio_features(Path(a.audio))
    errors=[]
    if sv["audio_stream_count"]!=0: errors.append("SILENT_MASTER_HAS_AUDIO")
    if sv["video_stream_count"]!=1: errors.append("VIDEO_STREAM_COUNT_NOT_1")
    if sv["duration_sec"]<=0: errors.append("BAD_DURATION")
    if has_audio and af.get("clip_ratio",0)>0.01: errors.append("AUDIO_CLIPPING_HIGH")
    out={"status":"PASS" if not errors else "HOLD","source_had_audio":has_audio,"silent_video":sv,"audio_teacher":af,"errors":errors}
    Path(a.report).write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(out,ensure_ascii=False,indent=2))
    raise SystemExit(0 if not errors else 3)
