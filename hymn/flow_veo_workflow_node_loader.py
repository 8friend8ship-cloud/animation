# -*- coding: utf-8 -*-
from __future__ import annotations
import argparse,json
from pathlib import Path

def ok(v): return v is True or str(v).upper() in {"PASS","TRUE","OK","YES","1"}

def first_unfinished(contract,evidence):
    for s in contract["state_machine"]:
        ev=evidence.get(s["id"],{})
        if ok(ev.get("pass")): continue
        return {
            "status":"HOLD" if s.get("on_missing") or s.get("on_fail") else "FIRST_UNFINISHED",
            "first_unfinished":s["id"],
            "requirements":s.get("requirements",[]),
            "fail_route":s.get("on_missing") or s.get("on_fail"),
            "next_after_pass":s.get("next")
        }
    return {"status":"DONE","first_unfinished":None}

if __name__=="__main__":
    ap=argparse.ArgumentParser(); ap.add_argument("contract"); ap.add_argument("evidence")
    a=ap.parse_args()
    c=json.loads(Path(a.contract).read_text(encoding="utf-8"))
    e=json.loads(Path(a.evidence).read_text(encoding="utf-8"))
    print(json.dumps(first_unfinished(c,e),ensure_ascii=False,indent=2))
