"""Existing LearningPack shared video analysis, offline read-only resolver + guarded writer.
No provider, publishing, scheduled trigger or actual consumer ACK.
"""
import hashlib,json,os,re,tempfile
from pathlib import Path
# Validation uses assertions; fail closed under optimized Python.
if not __debug__:
    raise RuntimeError("HOLD_OPTIMIZED_PYTHON_VALIDATION_DISABLED")
ROOT=Path(__file__).resolve().parent
INDEX="VIDEO_SHARED_SEED_ANALYSIS_INDEX_V1.json"
ID=re.compile(r"^[A-Za-z0-9_-]{8,120}$")
HEX=re.compile(r"^[0-9a-f]{64}$")
DIMS=set("TITLE_KEYWORDS THUMBNAIL HOOK WRITTEN_SOURCE EXPLANATION SCRIPT_DIALOGUE SUBTITLE IMAGE VIDEO_EDIT STYLE PROGRESSION CHARACTER MOTION CAMERA VFX VOICE SOUND STOCK PERFORMANCE EFFICIENCY".split())
VIEWS=set("VTUBE ANIMATION ASIDE REA AI COLLECTION WRITING THUMBNAIL IMAGE VOICE LANGUAGE X41 FX MOTION RENDER GEMINI CODEX CENTRAL".split())
STATES={"OBSERVED","HYPOTHESIS","NOT_AVAILABLE","NOT_RUN"}
def sha(b):return hashlib.sha256(b).hexdigest()
def encode(x):return (json.dumps(x,ensure_ascii=False,sort_keys=True,indent=2)+"\n").encode("utf-8")
def hold(s):return {"status":"HOLD_"+s,"consumer_ack":"NOT_RUN","may_publish":False}
def load_index(root):
    p=root/INDEX
    if not p.exists():return {"schema":"video_shared_seed_index_v1","entries":{}}
    if p.is_symlink():raise ValueError("INDEX_SYMLINK")
    j=json.loads(p.read_bytes())
    if j.get("schema")!="video_shared_seed_index_v1" or not isinstance(j.get("entries"),dict):raise ValueError("INDEX_SCHEMA")
    return j
def validate(j):
    assert j["schema"]=="video_shared_seed_analysis_v1"
    assert ID.fullmatch(j["analysis_id"]) and type(j["analysis_version"]) is int and j["analysis_version"]>=1
    assert j["may_publish"] is False and j["pack_ack_default"]=="NOT_RUN"
    s=j["source_key"]
    if s.startswith("Drive:"): assert HEX.fullmatch(j["source_sha256"].lower()) and s.endswith(j["source_sha256"])
    elif s.startswith("YouTube:"):assert re.fullmatch(r"YouTube:[A-Za-z0-9_-]{11}",s) and (j["source_sha256"] is None or HEX.fullmatch(j["source_sha256"].lower()))
    else:raise ValueError("SOURCE_KEY")
    assert all(isinstance(j[k],str) and j[k] for k in ("rights","state","summary","memo","usage_description","source_url","first_unfinished","template_id_version"))
    assert isinstance(j["keywords"],list) and isinstance(j["recommendations"],list)
    o=j["observations"]
    assert len(o)==20 and {x["dimension"] for x in o}==DIMS
    assert all(x["state"] in STATES and all(x.get(k) for k in ("evidence_ref","timecode_or_evidence_type","usage_condition","avoid_condition","rights","observation")) for x in o)
    assert set(j["views"])==VIEWS and all(isinstance(v,list) and set(v)<=DIMS and len(v)==len(set(v)) for v in j["views"].values())
    return j
def immutable_write(path,b):
    if path.is_symlink():raise ValueError("SYMLINK")
    if path.exists():
        if path.read_bytes()!=b:raise ValueError("IMMUTABLE_CONFLICT")
        return
    # Exclusive creation; index becomes visible only after complete write and fsync.
    with path.open("xb") as f:f.write(b);f.flush();os.fsync(f.fileno())
def atomic_index(root,j):
    fd,tmp=tempfile.mkstemp(prefix=".video_seed_index_",suffix=".tmp",dir=root)
    try:
        with os.fdopen(fd,"wb") as f:f.write(encode(j));f.flush();os.fsync(f.fileno())
        os.replace(tmp,root/INDEX)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
def register(root,b,existing_name=None,parent_sha256=None):
    root=Path(root).resolve()
    j=validate(json.loads(b)); key=j["analysis_id"]; version=j["analysis_version"]; h=sha(b)
    name=existing_name or ("VIDEO_SHARED_SEED_"+key+"_REV"+str(version)+".json")
    if not re.fullmatch(r"VIDEO_SHARED_SEED_[A-Za-z0-9_-]+\.json",name) or name==INDEX:raise ValueError("FILENAME")
    lock=root/".video_shared_seed_index.lock"
    fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    os.close(fd)
    try:
        idx=load_index(root); entries=idx["entries"]
        if any(e["source_key"]==j["source_key"] and k!=key for k,e in entries.items()):raise ValueError("DUPLICATE_SOURCE")
        rec=entries.get(key)
        if rec and rec["source_key"]!=j["source_key"]:raise ValueError("SOURCE_MISMATCH")
        if rec and str(version) in rec["versions"]:
            old=rec["versions"][str(version)]
            if old["sha256"]!=h or sha((root/old["file"]).read_bytes())!=h:raise ValueError("IMMUTABLE_CONFLICT")
            return "NO_CHANGE"
        if rec:
            latest=max(map(int,rec["versions"]))
            if version!=latest+1 or parent_sha256!=rec["versions"][str(latest)]["sha256"]:raise ValueError("PARENT_OR_VERSION")
        elif version!=1 or parent_sha256 is not None:raise ValueError("INITIAL_VERSION")
        immutable_write(root/name,b)
        rec=entries.setdefault(key,{"source_key":j["source_key"],"versions":{}})
        rec["versions"][str(version)]={"file":name,"sha256":h,"parent_sha256":parent_sha256}
        atomic_index(root,idx)
        return "REGISTERED"
    finally:lock.unlink(missing_ok=True)
def lookup(args,root=ROOT):
    try:
        if not isinstance(args,dict) or set(args)-{"analysis_id","version","consumer","expected_snapshot_sha256"}:return hold("UNKNOWN_ARGUMENT")
        aid=args.get("analysis_id");v=args.get("version");consumer=args.get("consumer")
        if not isinstance(aid,str) or not ID.fullmatch(aid):return hold("UNKNOWN_ANALYSIS_ID")
        if type(v) is not int or v<1:return hold("VERSION_MISMATCH")
        if not isinstance(consumer,str) or consumer not in VIEWS:return hold("UNKNOWN_CONSUMER")
        root=Path(root).resolve();idx=load_index(root); rec=idx["entries"].get(aid)
        if not rec:return hold("UNKNOWN_ANALYSIS_ID")
        e=rec["versions"].get(str(v))
        if not e:return hold("VERSION_MISMATCH")
        name=e["file"]
        if not re.fullmatch(r"VIDEO_SHARED_SEED_[A-Za-z0-9_-]+\.json",name) or name==INDEX:return hold("INDEX_PATH")
        p=root/name
        if p.is_symlink():return hold("INDEX_PATH")
        b=p.read_bytes();h=sha(b)
        if h!=e["sha256"] or args.get("expected_snapshot_sha256",h)!=h:return hold("SNAPSHOT_SHA_MISMATCH")
        j=validate(json.loads(b))
        if (j["analysis_id"],j["analysis_version"],j["source_key"])!=(aid,v,rec["source_key"]):return hold("RECORD_MISMATCH")
        out={k:j[k] for k in ("analysis_id","analysis_version","source_key","source_sha256","rights","state","summary","memo","keywords","usage_description","recommendations","template_id_version","first_unfinished")}
        out.update(status="PASS_READONLY_SNAPSHOT_NOT_CONSUMER_ACK",consumer=consumer,snapshot_sha256=h,observations=[x for x in j["observations"] if x["dimension"] in j["views"][consumer]],consumer_ack="NOT_RUN",may_publish=False,live_sheet_refresh=False)
        return out
    except Exception:return hold("SNAPSHOT_OR_INDEX_INVALID")
