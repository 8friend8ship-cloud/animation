"""Reusable WHITEBOARD_LIVE_DRAW timing candidate. No video, publication or asset generation."""
import math, json, hashlib
from pathlib import Path

def compile_strokes(strokes, fps=30):
    """Compile normalized vector paths into a semantic-beat-timed plan.
    Each stroke has its own start/end seconds; no global fixed-cut interval.
    Coordinates stay attached to the original canvas. Completed paths persist.
    """
    if not isinstance(fps,int) or isinstance(fps,bool) or fps<=0: raise ValueError("fps")
    if not strokes: raise ValueError("empty paths")
    out=[]; ids=set(); last_end=0
    for s in strokes:
        sid=s["id"]; beat=s["beat_id"]
        if not sid or sid in ids or not beat: raise ValueError("identity")
        ids.add(sid)
        start,end=float(s["start_s"]),float(s["end_s"])
        if not all(map(math.isfinite,(start,end))) or not 0<=start<end: raise ValueError("time")
        a,b=round(start*fps),round(end*fps)
        if a<last_end or b<=a: raise ValueError("overlap or subframe")
        last_end=b
        pts=[tuple(map(float,p)) for p in s["points"]]
        if len(pts)<2 or any(len(p)!=2 or not all(math.isfinite(v) and 0<=v<=1 for v in p) for p in pts):raise ValueError("geometry")
        cum=[0.]
        for u,v in zip(pts,pts[1:]):cum.append(cum[-1]+math.dist(u,v))
        if cum[-1]<=0:raise ValueError("zero length")
        out.append({"id":sid,"beat_id":beat,"start_frame":a,"end_frame":b,"points":pts,"lengths":cum})
    return {"style_id":"WHITEBOARD_LIVE_DRAW","fps":fps,"strokes":out,"end_frame":last_end}

def at_frame(plan, frame):
    """Stable completed geometry, current reveal path and exact pen endpoint.
    Hide the pen during idle periods; do not jump or erase completed strokes.
    """
    done=[]; active=None
    for s in plan["strokes"]:
        if frame>=s["end_frame"]:
            done.append(s["id"]);continue
        if frame<s["start_frame"]:break
        pts,L=s["points"],s["lengths"]
        target=L[-1]*(frame-s["start_frame"])/(s["end_frame"]-s["start_frame"])
        for i in range(1,len(pts)):
            if L[i]>L[i-1] and target<=L[i]:
                t=(target-L[i-1])/(L[i]-L[i-1])
                tip=tuple(u+t*(v-u) for u,v in zip(pts[i-1],pts[i]))
                active={"id":s["id"],"beat_id":s["beat_id"],"visible_path":pts[:i]+[tip],"pen":tip,"progress":target/L[-1]}
                break
        break
    return {"completed":done,"active":active,"pen_visible":active is not None}

def self_test():
    # Synthetic geometry, deliberately different topics/timings; not a video.
    def S(i,b,a,z,p):return dict(id=i,beat_id=b,start_s=a,end_s=z,points=p)
    fixtures=[
      [S("wall","structure",0,1.2,[(.1,.8),(.1,.2),(.8,.2)]),S("window","opening",1.5,2.4,[(.3,.4),(.5,.4),(.5,.6),(.3,.6),(.3,.4)])],
      [S("leaf","food",.2,.9,[(.2,.7),(.4,.3),(.8,.7)]),S("stem","food_detail",1.1,2.7,[(.5,.8),(.5,.4),(.7,.2)])]]
    checks=[]
    for i,src in enumerate(fixtures):
        plan=compile_strokes(src); prev=[]; prog={}
        for frame in range(plan["end_frame"]+1):
            state=at_frame(plan,frame)
            assert set(prev)<=set(state["completed"])
            prev=state["completed"]
            if state["active"]:
                a=state["active"]
                assert a["pen"]==a["visible_path"][-1]
                assert prog.get(a["id"],-1)<=a["progress"]<=1
                prog[a["id"]]=a["progress"]
                assert all(0<=x<=1 for x in a["pen"])
            else:assert not state["pen_visible"]
        assert len(prev)==len(src)
        assert at_frame(plan,plan["end_frame"])["active"] is None
        assert plan==compile_strokes(src)
        checks.append({"fixture":i+1,"frames_checked":plan["end_frame"]+1,"completed":len(prev),"status":"PASS"})
    for bad in [[],[S("a","b",0,0,[(0,0),(1,1)])],[S("a","b",0,1,[(0,0),(0,0)])],[S("a","b",0,1,[(0,0),(2,1)])],[S("a","b",0,1,[(0,0),(1,1)]),S("a","c",1,2,[(0,0),(1,1)])],[S("a","b",0,1,[(0,0),(1,1)]),S("c","d",.5,2,[(0,0),(1,1)])]]:
        try:compile_strokes(bad)
        except ValueError:continue
        raise AssertionError("invalid input accepted")
    return {"fixtures":checks,"invalid_cases_rejected":6,"scope":"timing/geometry only; synthetic; no render, hand image, actual visual QA, voice or consumer wiring","status":"PASS"}


if __name__=="__main__":
    x1=self_test(); x2=self_test()
    assert x1==x2
    print(json.dumps({"x1":x1,"x2":x2,"promotion":"HOLD"},indent=2))
