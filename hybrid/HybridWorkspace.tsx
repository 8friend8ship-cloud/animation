import React, {useMemo, useState} from 'react';
import {DRYWRITER_REUSE_STYLES, HYBRID_120S_TIMELINE, ReuseStyleId} from './presets';
import {
  buildMotionCues,
  fetchPersonaAnimationPack,
  PersonaAnimationPack,
  summarizePersonaForAnimation,
} from '../lib/persona-motion-bridge';

type Props = {onBack: () => void};

export default function HybridWorkspace({onBack}: Props) {
  const [style, setStyle] = useState<ReuseStyleId>('hybrid');
  const [title, setTitle] = useState('사랑해라는 말이 부채가 된 이유');
  const [audioName, setAudioName] = useState('사랑해라는_말이_부채가_된_이유.m4a');
  const [queueUrl, setQueueUrl] = useState('');
  const [personaBridgeUrl, setPersonaBridgeUrl] = useState('');
  const [personaId, setPersonaId] = useState('P0000001');
  const [locale, setLocale] = useState('ko-KR');
  const [personaPack, setPersonaPack] = useState<PersonaAnimationPack | null>(null);
  const [personaLoading, setPersonaLoading] = useState(false);
  const [personaError, setPersonaError] = useState('');
  const selected = useMemo(() => DRYWRITER_REUSE_STYLES.find((x) => x.id === style)!, [style]);
  const personaSummary = useMemo(() => personaPack ? summarizePersonaForAnimation(personaPack) : null, [personaPack]);
  const motionCues = useMemo(() => personaPack ? buildMotionCues(personaPack, 12000) : [], [personaPack]);

  const loadPersona = async () => {
    setPersonaLoading(true);
    setPersonaError('');
    try {
      const pack = await fetchPersonaAnimationPack(personaBridgeUrl, personaId, locale);
      setPersonaPack(pack);
    } catch (error) {
      setPersonaPack(null);
      setPersonaError(error instanceof Error ? error.message : String(error));
    } finally {
      setPersonaLoading(false);
    }
  };

  const flowPrompts = [
    'vertical 9:16, Korean dry humor cinematic illustration, family dinner table in a modern apartment, awkward silence between two adults, steaming stew, restrained facial expressions, no text, realistic but slightly stylized, emotionally subtle, camera push-in',
    'vertical 9:16, symbolic cinematic illustration of a red heart turning into a heavy debt receipt and temperature gauge falling to -30%, dark witty editorial visual, clean composition, no text, premium short-form video frame'
  ];

  return <div className="min-h-screen bg-zinc-950 text-zinc-100">
    <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-5 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div><p className="text-xs font-semibold tracking-[.2em] text-zinc-500">ANIMATION FACTORY / PERSONA BACKDATA</p><h1 className="text-2xl font-bold">Persona · Language · Motion Hybrid Lab</h1></div>
        <button onClick={onBack} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold">돌아가기</button>
      </div>
    </header>
    <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[390px_1fr]">
      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div><label className="mb-1 block text-sm font-semibold">원본 콘텐츠</label><input value={title} onChange={e=>setTitle(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"/></div>
        <div><label className="mb-1 block text-sm font-semibold">음성 원본</label><input value={audioName} onChange={e=>setAudioName(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"/></div>
        <div className="space-y-2 rounded-xl border border-cyan-900 bg-cyan-950/20 p-3">
          <div className="text-sm font-bold text-cyan-200">Persona Backdata 연결</div>
          <input value={personaBridgeUrl} onChange={e=>setPersonaBridgeUrl(e.target.value)} placeholder="Language/Persona WebApp /exec URL" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"/>
          <div className="grid grid-cols-[1fr_100px] gap-2"><input value={personaId} onChange={e=>setPersonaId(e.target.value)} placeholder="P0000001" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"/><input value={locale} onChange={e=>setLocale(e.target.value)} placeholder="ko-KR" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"/></div>
          <button onClick={loadPersona} disabled={personaLoading || !personaBridgeUrl || !personaId} className="w-full rounded-xl bg-cyan-300 px-3 py-2 text-sm font-bold text-zinc-950 disabled:opacity-40">{personaLoading?'불러오는 중':'Persona → Voice → Motion 불러오기'}</button>
          {personaError && <p className="text-xs text-rose-300">{personaError}</p>}
          <p className="text-xs leading-5 text-cyan-200/70">PERSONA_ID → TEMPLATE_ID → DRY_PERSONA_CODE → 언어/무료음성 → Motion Profile 순으로 조인합니다.</p>
        </div>
        <div><label className="mb-1 block text-sm font-semibold">Flow 작업큐 WebApp URL</label><input value={queueUrl} onChange={e=>setQueueUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"/><p className="mt-1 text-xs text-zinc-500">Flow Agent Bridge의 nextFlowTask / completeFlowTask 계약과 동일합니다.</p></div>
        <div className="rounded-xl bg-emerald-950/40 p-3 text-sm leading-6 text-emerald-200"><strong>대표 혼합값:</strong> Whiteboard 45% · 일반 2D 애니메이션 30% · Flow 25%. 음성·자막은 전체 120초 동안 연속 유지합니다.</div>
        <div><h2 className="mb-2 font-bold">6가지 재활용 스타일</h2><div className="space-y-2">{DRYWRITER_REUSE_STYLES.map(s=><button key={s.id} onClick={()=>setStyle(s.id)} className={`w-full rounded-xl border p-3 text-left ${style===s.id?'border-white bg-white text-zinc-950':'border-zinc-700 bg-zinc-950'}`}><div className="font-bold">{s.name}</div><div className="mt-1 text-xs opacity-70">{s.mix}</div></button>)}</div></div>
      </section>
      <section className="space-y-5">
        {personaSummary && <article className="rounded-2xl border border-cyan-900 bg-cyan-950/20 p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Persona Motion Runtime</h2><span className="rounded-full border border-cyan-800 px-3 py-1 text-xs text-cyan-200">{personaSummary.dryPersonaCode}</span></div><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3"><div><span className="text-zinc-500">Persona</span><div className="font-semibold">{personaSummary.label}</div></div><div><span className="text-zinc-500">연령 / 역할</span><div className="font-semibold">{String(personaSummary.age)} · {personaSummary.role}</div></div><div><span className="text-zinc-500">언어 / Viseme</span><div className="font-semibold">{personaSummary.locale} · {personaSummary.visemeMapId}</div></div><div><span className="text-zinc-500">Voice</span><div className="font-semibold">{personaSummary.voiceProfile||'derived local voice'}</div></div><div><span className="text-zinc-500">Motion Energy</span><div className="font-semibold">{personaSummary.motionEnergy}</div></div><div><span className="text-zinc-500">Motion Set</span><div className="break-words font-semibold">{personaSummary.motionSet}</div></div></div></article>}
        {motionCues.length>0 && <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Persona 12초 동작 시퀀스</h2><span className="text-xs text-zinc-500">MOTION_PRIMITIVE_LIBRARY compatible</span></div><div className="space-y-2">{motionCues.map(c=><div key={c.id} className="grid grid-cols-[90px_1fr_110px] gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm"><div>{c.startMs}–{c.endMs}ms</div><div><div className="font-semibold">{c.motionId}</div><div className="text-xs text-zinc-500">{c.expression} · intensity {c.intensity.toFixed(2)}</div></div><div className="text-right text-xs text-zinc-400">{c.transition}</div></div>)}</div></article>}
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-xl font-bold">{selected.name}</h2><p className="mt-2 text-zinc-300">{selected.summary}</p><p className="mt-2 text-sm text-zinc-500">추천: {selected.bestFor}</p></article>
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">120초 Hybrid Timeline</h2><span className="text-sm text-zinc-500">9:16 · narration locked</span></div><div className="space-y-2">{HYBRID_120S_TIMELINE.map((x,i)=><div key={i} className="grid grid-cols-[80px_130px_1fr] gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm"><div>{x.start}–{x.end}s</div><div className="font-semibold">{x.mode}</div><div className="text-zinc-300">{x.label}</div></div>)}</div></article>
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-xl font-bold">Flow 테스트 컷 2개</h2><div className="mt-3 space-y-3">{flowPrompts.map((p,i)=><div key={i} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"><div className="mb-2 text-xs font-bold text-cyan-300">FLOW_SCENE_{String(i+1).padStart(2,'0')}</div><p className="text-sm leading-6 text-zinc-300">{p}</p></div>)}</div></article>
      </section>
    </main>
  </div>;
}
