import React, {useEffect, useMemo, useState} from 'react';
import {Activity, Bot, CheckCircle2, Film, Gift, MessageCircle, Play, RefreshCcw, Send, ShieldCheck, Sparkles, Workflow, Zap} from 'lucide-react';
import {getVideoAgentRuntimeStatus, queueTemplateAgent, registerEngagementCampaign} from '../workflow-shell/bridgeClient';

type AgentStatus = 'READY' | 'RUNNING' | 'QA' | 'BLOCKED';
type TemplateAgent = {id:string;label:string;description:string;workflow:string[];status:AgentStatus;target:string};

const AGENTS: TemplateAgent[] = [
  {id:'SIMPLE_EXPLAINER',label:'Simple Explainer Agent',description:'그림·아이콘·한 문장 중심의 최소비용 설명형 쇼츠',workflow:['HOOK','CARD SCRIPT','ASSET','TTS','CAPTION','QA','EXPORT'],status:'READY',target:'앱 설명 / 교육'},
  {id:'PRESENTER_TOPLIST',label:'Presenter Agent',description:'진행자·표정·손동작·립싱크·큰 자막형 쇼츠',workflow:['HOOK','SCRIPT','VOICE','FACE/MOTION','LIPSYNC','CAPTION','QA'],status:'READY',target:'추천 / 비교 / 전문가 설명'},
  {id:'TOOL_DEMO',label:'Tool Demo Agent',description:'실제 기능 before/after와 짧은 증명컷 중심',workflow:['HOOK','SCREEN PROOF','DEMO CUTS','METRIC','CAPTION','CTA','QA'],status:'READY',target:'기능 소개'},
  {id:'AGENT_DASHBOARD_PROMO',label:'Agent Dashboard Promo',description:'실제 워크플로우 노드·작업상태·수치 증거를 보여주는 앱 홍보형',workflow:['HOOK','LIVE UI','WORKFLOW','PROOF METRIC','CTA','QA','DISTRIBUTE'],status:'RUNNING',target:'우리 앱 홍보'},
  {id:'APP_INTRO_COMPARISON',label:'App Comparison Agent',description:'여러 앱의 역할·차이를 빠르게 비교하는 소개형',workflow:['HOOK','APP CARDS','DIFFERENCE','BEST FOR','CTA','QA'],status:'READY',target:'앱 묶음 소개'},
  {id:'UGC_AD',label:'UGC Ad Agent',description:'페르소나/모델 기반 제품·앱 광고형',workflow:['ANGLE','PERSONA','SHOT LIST','RENDER','VOICE','CAPTION','QA'],status:'READY',target:'광고 / 유입'},
  {id:'BEFORE_AFTER',label:'Before & After Agent',description:'변화 전후를 짧게 증명하는 전환형',workflow:['PROBLEM','BEFORE','TRANSFORM','AFTER','PROOF','CTA'],status:'READY',target:'인테리어 / 도구 데모'},
  {id:'WORKFLOW_MAP_EXPLAINER',label:'Workflow Map Agent',description:'Queens→Seed→T1→T2 등 내부 자동화 흐름을 시각화',workflow:['MAP','NODE STATE','HANDOFF','RESULT','QA','EXPORT'],status:'READY',target:'워크플로우 설명'}
];

const PLATFORM_ROUTES = [
  {platform:'Instagram', trigger:'COMMENT_KEYWORD', delivery:'PRIVATE_REPLY/DM_WHEN_OFFICIAL_API_ALLOWED', fallback:'PUBLIC_REPLY + LANDING_LINK'},
  {platform:'Facebook', trigger:'COMMENT_KEYWORD', delivery:'MESSAGING_WHEN_OFFICIAL_API_ALLOWED', fallback:'PUBLIC_REPLY + LANDING_LINK'},
  {platform:'YouTube', trigger:'COMMENT_KEYWORD', delivery:'COMMENT_REPLY + LANDING_LINK', fallback:'PINNED_COMMENT / DESCRIPTION LINK'},
  {platform:'TikTok', trigger:'COMMENT/LEAD_EVENT', delivery:'OFFICIAL_CAPABILITY_ROUTER', fallback:'BIO/LANDING_LINK + MANUAL_DM'},
  {platform:'Threads', trigger:'REPLY/MENTION', delivery:'OFFICIAL_CAPABILITY_ROUTER', fallback:'REPLY + LANDING_LINK'}
];

function statusClass(status: AgentStatus) {
  if (status === 'RUNNING') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  if (status === 'QA') return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  if (status === 'BLOCKED') return 'border-red-500/40 bg-red-500/10 text-red-300';
  return 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300';
}

export default function VideoTemplateAgentHub({onBack}:{onBack?:()=>void}) {
  const [selected, setSelected] = useState(AGENTS[3].id);
  const [campaignKeyword, setCampaignKeyword] = useState('무료앱');
  const [offerUrl, setOfferUrl] = useState('');
  const [busy,setBusy]=useState(false);
  const [runtime,setRuntime]=useState<any>(null);
  const [lastResult,setLastResult]=useState<any>(null);
  const [error,setError]=useState('');
  const current = useMemo(() => AGENTS.find(a => a.id === selected) || AGENTS[0], [selected]);

  async function refreshStatus(){
    setError('');
    try { setRuntime(await getVideoAgentRuntimeStatus()); }
    catch(err:any){ setError(String(err?.message||err)); }
  }

  useEffect(()=>{ void refreshStatus(); },[]);

  async function queueAgentRun() {
    setBusy(true); setError('');
    try {
      const result=await queueTemplateAgent({templateAgentId:current.id,targetApps:['ALL_FRONT_APPS'],qa:true,apiPolicy:'API_FREE_FIRST'});
      setLastResult(result);
      await refreshStatus();
    } catch(err:any){ setError(String(err?.message||err)); }
    finally { setBusy(false); }
  }

  async function saveCampaign() {
    if(!campaignKeyword.trim()){ setError('댓글 키워드를 입력하세요.'); return; }
    if(!offerUrl.trim()){ setError('무료 앱/자료 URL을 입력하세요.'); return; }
    setBusy(true); setError('');
    try {
      const result=await registerEngagementCampaign({
        appId:'ALL_FRONT_APPS',templateAgentId:current.id,
        platforms:['Instagram','Facebook','YouTube','TikTok','Threads'],
        triggerType:'COMMENT_KEYWORD',keyword:campaignKeyword.trim(),offerName:'FREE_APP_OR_RESOURCE',offerUrl:offerUrl.trim(),
        ctaText:`댓글에 “${campaignKeyword.trim()}”라고 남기면 무료 링크를 보내드립니다.`,
        deliveryPolicy:'OFFICIAL_API_ONLY',fallbackPolicy:'PUBLIC_REPLY_OR_LANDING_LINK'
      });
      setLastResult(result);
      await refreshStatus();
    } catch(err:any){ setError(String(err?.message||err)); }
    finally { setBusy(false); }
  }

  const runtimeOk=Boolean(runtime?.ok && (runtime?.data?.ok ?? true));
  const runtimeVersion=runtime?.version||runtime?.data?.version||'PENDING';
  const lastTaskId=lastResult?.data?.taskId||lastResult?.data?.campaignId||'—';

  return <main className="min-h-screen bg-[#050811] text-white">
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#050811]/95 backdrop-blur px-5 py-4">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        <div><div className="flex items-center gap-2 text-emerald-300 text-sm font-bold"><Bot size={16}/> CENTRAL VIDEO AGENTS</div><h1 className="mt-1 text-2xl md:text-4xl font-black tracking-tight">각 영상 템플릿이 <span className="text-emerald-400">전용 에이전트 앱</span>으로 작동합니다</h1><p className="mt-2 text-sm text-slate-400">Queens → Seed → T1 → T2 → Render → QA → Publish → Comment/DM Distribution</p></div>
        <div className="flex flex-wrap justify-end gap-2">{onBack && <button onClick={onBack} className="rounded-xl border border-white/15 px-3 py-2 text-sm">Back</button>}<button onClick={refreshStatus} disabled={busy} className="rounded-xl border border-white/15 px-3 py-2 text-sm disabled:opacity-50"><span className="flex items-center gap-2"><RefreshCcw size={15}/> 상태확인</span></button><button onClick={queueAgentRun} disabled={busy} className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 font-black text-black disabled:opacity-50"><Play size={16}/>{busy?'실행 중':'작업 실행'}</button></div>
      </div>
    </header>

    <section className="mx-auto grid max-w-[1500px] gap-4 p-5 xl:grid-cols-[330px_1fr_390px]">
      <aside className="space-y-2">{AGENTS.map(agent => <button key={agent.id} onClick={()=>setSelected(agent.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selected===agent.id?'border-emerald-400 bg-emerald-400/10':'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}><div className="flex items-start justify-between gap-2"><div className="font-black">{agent.label}</div><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass(agent.status)}`}>{agent.status}</span></div><div className="mt-2 text-xs leading-5 text-slate-400">{agent.description}</div><div className="mt-3 text-[11px] text-emerald-300">{agent.target}</div></button>)}</aside>

      <div className="space-y-4">
        {(error||runtime||lastResult)&&<section className={`rounded-2xl border p-4 ${error?'border-red-500/30 bg-red-500/10':'border-emerald-500/20 bg-emerald-500/[0.06]'}`}><div className="flex items-center justify-between gap-3"><div><div className="text-xs font-black text-slate-400">RUNTIME READBACK</div><div className={`mt-1 font-black ${error?'text-red-300':'text-emerald-300'}`}>{error|| (runtimeOk?'BRIDGE READY':'BRIDGE RESPONSE')}</div></div><div className="text-xs text-slate-500">{runtimeVersion}</div></div>{lastResult&&<div className="mt-2 text-xs text-slate-300">최근 결과: {lastResult.message||lastResult.action||'OK'} · {lastTaskId}</div>}{error&&<div className="mt-2 text-xs text-red-200">{error}</div>}</section>}

        <section className="rounded-3xl border border-white/10 bg-[#0a1020] p-5 shadow-2xl"><div className="flex items-center justify-between"><div><div className="text-xs font-bold text-emerald-300">SELECTED AGENT</div><h2 className="mt-1 text-3xl font-black">{current.label}</h2></div><Film className="text-emerald-300"/></div><p className="mt-3 max-w-3xl text-slate-400">{current.description}</p><div className="mt-6 grid gap-3 md:grid-cols-3">{[['Runtime',runtimeOk?'READY':'PENDING',Activity],['Last task',lastTaskId,CheckCircle2],['API policy','FREE FIRST',ShieldCheck]].map(([label,value,Icon]:any)=><div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4"><Icon size={17} className="text-emerald-300"/><div className="mt-3 truncate text-lg font-black">{value}</div><div className="text-xs text-slate-500">{label}</div></div>)}</div></section>

        <section className="rounded-3xl border border-white/10 bg-[#080d18] p-5"><div className="flex items-center gap-2 font-black"><Workflow size={18} className="text-cyan-300"/> Workflow Map</div><div className="mt-6 flex flex-wrap items-center gap-2">{current.workflow.map((step,i)=><React.Fragment key={step}><div className={`min-w-[120px] rounded-2xl border p-4 ${i===2?'border-emerald-400 bg-emerald-400/10':'border-white/10 bg-white/[0.03]'}`}><div className="text-[10px] text-slate-500">STEP {String(i+1).padStart(2,'0')}</div><div className="mt-1 text-sm font-black">{step}</div></div>{i<current.workflow.length-1&&<Zap size={14} className="text-slate-600"/>}</React.Fragment>)}</div></section>

        <section className="rounded-3xl border border-white/10 bg-[#080d18] p-5"><div className="flex items-center gap-2 font-black"><Sparkles size={18} className="text-violet-300"/> 자동 브릿지</div><div className="mt-4 grid gap-3 md:grid-cols-2">{['Central Agent Task Queue','Apps Script trigger/functions','Queens / Seed / T1 / T2 backend','Front-app adapter','Chrome extension browser bridge','Frame / Caption / Audio QA'].map(x=><div key={x} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">{x}</div>)}</div></section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5"><div className="flex items-center gap-2 font-black"><Gift size={18} className="text-emerald-300"/> 댓글 참여 → 무료배포 Agent</div><p className="mt-2 text-xs leading-5 text-slate-400">영상 CTA에서 특정 댓글을 유도하고, 공식 플랫폼 권한이 허용하는 방식으로 무료 앱/자료를 전달합니다.</p><label className="mt-5 block text-xs font-bold text-slate-400">댓글 키워드</label><input value={campaignKeyword} onChange={e=>setCampaignKeyword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-emerald-400"/><label className="mt-4 block text-xs font-bold text-slate-400">무료 앱 / 랜딩 URL</label><input value={offerUrl} onChange={e=>setOfferUrl(e.target.value)} placeholder="https://..." className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-emerald-400"/><button onClick={saveCampaign} disabled={busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-black text-black disabled:opacity-50"><Send size={16}/> 캠페인 등록</button></section>

        <section className="rounded-3xl border border-white/10 bg-[#080d18] p-5"><div className="flex items-center gap-2 font-black"><MessageCircle size={18} className="text-cyan-300"/> Platform Router</div><div className="mt-4 space-y-3">{PLATFORM_ROUTES.map(x=><div key={x.platform} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><div className="font-black">{x.platform}</div><div className="mt-1 text-[11px] text-cyan-300">{x.trigger}</div><div className="mt-2 text-xs text-slate-300">{x.delivery}</div><div className="mt-1 text-[11px] text-slate-500">fallback · {x.fallback}</div></div>)}</div></section>
      </aside>
    </section>
  </main>;
}
