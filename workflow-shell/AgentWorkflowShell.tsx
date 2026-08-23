import React, {useMemo, useState} from 'react';
import {Activity, ArrowRight, Bot, CheckCircle2, Chrome, Database, Play, ShieldCheck, Workflow} from 'lucide-react';
import {APP_WORKFLOW_ADAPTERS, getAppWorkflowAdapter} from './appAdapters';

export default function AgentWorkflowShell({onBack}:{onBack?:()=>void}) {
  const [appId,setAppId]=useState('APP_CONTENT_OS');
  const app=useMemo(()=>getAppWorkflowAdapter(appId),[appId]);
  const bridgeUrl=(import.meta as any).env?.VITE_VIDEO_AGENT_BRIDGE_URL;

  async function run(kind:string){
    const payload={action:'QUEUE_APP_WORKFLOW',appId:app.appId,projectId:app.projectId,kind,templateCandidates:app.templates,qa:true,writeback:true};
    if(!bridgeUrl){alert('Preview: '+JSON.stringify(payload));return;}
    await fetch(bridgeUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    alert('중앙에이전트 작업큐에 등록했습니다.');
  }

  return <main className="min-h-screen bg-[#050811] text-white">
    <header className="border-b border-white/10 bg-[#070b14] px-5 py-4">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        <div><div className="flex items-center gap-2 text-sm font-black text-emerald-300"><Workflow size={17}/> AGENT WORKFLOW FRONT SHELL</div><h1 className="mt-1 text-3xl font-black">공통 UI + 앱별 Adapter + 중앙 실행 브릿지</h1><p className="mt-2 text-sm text-slate-400">Front → Central Agent → Apps Script/Backend → Queens/Seed/T1/T2 → Chrome/Platform → QA → Writeback</p></div>
        <div className="flex gap-2">{onBack&&<button onClick={onBack} className="rounded-xl border border-white/15 px-3 py-2">Back</button>}<button onClick={()=>run('FULL_E2E')} className="rounded-xl bg-emerald-400 px-4 py-2 font-black text-black"><span className="flex items-center gap-2"><Play size={16}/> E2E 실행</span></button></div>
      </div>
    </header>

    <section className="mx-auto grid max-w-[1500px] gap-4 p-5 xl:grid-cols-[280px_1fr]">
      <aside className="space-y-2">{APP_WORKFLOW_ADAPTERS.map(x=><button key={x.appId} onClick={()=>setAppId(x.appId)} className={`w-full rounded-2xl border p-4 text-left ${x.appId===appId?'border-emerald-400 bg-emerald-400/10':'border-white/10 bg-white/[0.03]'}`}><div className="font-black">{x.label}</div><div className="mt-1 text-xs text-slate-500">{x.appId}</div></button>)}</aside>

      <div className="space-y-4">
        <section className="rounded-3xl border border-white/10 bg-[#0a1020] p-5">
          <div className="flex items-center justify-between"><div><div className="text-xs font-bold text-emerald-300">{app.projectId}</div><h2 className="mt-1 text-3xl font-black">{app.label}</h2></div><Bot className="text-emerald-300"/></div>
          <div className="mt-6 flex flex-wrap items-center gap-2">{app.nodes.map((n,i)=><React.Fragment key={n}><div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"><div className="text-[10px] text-slate-500">STEP {i+1}</div><div className="font-black">{n}</div></div>{i<app.nodes.length-1&&<ArrowRight size={15} className="text-slate-600"/>}</React.Fragment>)}</div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-3xl border border-white/10 bg-[#080d18] p-5"><div className="flex items-center gap-2 font-black"><Activity size={17} className="text-cyan-300"/> Metrics</div><div className="mt-4 space-y-2">{app.metrics.map((m,i)=><div key={m} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2"><span className="text-sm text-slate-300">{m}</span><span className="font-black">{i===0?'LIVE':'—'}</span></div>)}</div></section>
          <section className="rounded-3xl border border-white/10 bg-[#080d18] p-5"><div className="flex items-center gap-2 font-black"><Database size={17} className="text-violet-300"/> Outputs</div><div className="mt-4 space-y-2">{app.outputs.map(x=><div key={x} className="rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-slate-300">{x}</div>)}</div></section>
          <section className="rounded-3xl border border-white/10 bg-[#080d18] p-5"><div className="flex items-center gap-2 font-black"><ShieldCheck size={17} className="text-emerald-300"/> Runtime Bridges</div><div className="mt-4 space-y-2">{['Central Task Queue','Apps Script','Backend WebApp','Chrome Extension','Drive/Asset Index','Platform Adapter'].map(x=><div key={x} className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-slate-300">{x==='Chrome Extension'?<Chrome size={14}/>:<CheckCircle2 size={14}/>} {x}</div>)}</div></section>
        </div>

        <section className="rounded-3xl border border-white/10 bg-[#080d18] p-5"><div className="font-black">Template Router</div><div className="mt-4 flex flex-wrap gap-2">{app.templates.map(x=><button key={x} onClick={()=>run('TEMPLATE:'+x)} className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200">{x}</button>)}</div><p className="mt-4 text-xs text-slate-500">각 버튼은 해당 앱의 실제 백데이터/프런트 계약을 사용해 전용 Video Agent로 작업을 넘기고 QA/배포/학습 writeback까지 연결하는 계약입니다.</p></section>
      </div>
    </section>
  </main>;
}
