import React, {useMemo, useState} from 'react';
import {DRYWRITER_REUSE_STYLES, HYBRID_120S_TIMELINE, ReuseStyleId} from './presets';

type Props = {onBack: () => void};

export default function HybridWorkspace({onBack}: Props) {
  const [style, setStyle] = useState<ReuseStyleId>('hybrid');
  const [title, setTitle] = useState('사랑해라는 말이 부채가 된 이유');
  const [audioName, setAudioName] = useState('사랑해라는_말이_부채가_된_이유.m4a');
  const [queueUrl, setQueueUrl] = useState('');
  const selected = useMemo(() => DRYWRITER_REUSE_STYLES.find((x) => x.id === style)!, [style]);

  const flowPrompts = [
    'vertical 9:16, Korean dry humor cinematic illustration, family dinner table in a modern apartment, awkward silence between two adults, steaming stew, restrained facial expressions, no text, realistic but slightly stylized, emotionally subtle, camera push-in',
    'vertical 9:16, symbolic cinematic illustration of a red heart turning into a heavy debt receipt and temperature gauge falling to -30%, dark witty editorial visual, clean composition, no text, premium short-form video frame'
  ];

  return <div className="min-h-screen bg-zinc-950 text-zinc-100">
    <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-5 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div><p className="text-xs font-semibold tracking-[.2em] text-zinc-500">ANIMATION FACTORY / DRYWRITER</p><h1 className="text-2xl font-bold">Hybrid 2분 쇼츠 · 6 Style Lab</h1></div>
        <button onClick={onBack} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold">돌아가기</button>
      </div>
    </header>
    <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[390px_1fr]">
      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div><label className="mb-1 block text-sm font-semibold">원본 콘텐츠</label><input value={title} onChange={e=>setTitle(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"/></div>
        <div><label className="mb-1 block text-sm font-semibold">음성 원본</label><input value={audioName} onChange={e=>setAudioName(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"/></div>
        <div><label className="mb-1 block text-sm font-semibold">Flow 작업큐 WebApp URL</label><input value={queueUrl} onChange={e=>setQueueUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"/><p className="mt-1 text-xs text-zinc-500">Flow Agent Bridge의 nextFlowTask / completeFlowTask 계약과 동일합니다.</p></div>
        <div className="rounded-xl bg-emerald-950/40 p-3 text-sm leading-6 text-emerald-200"><strong>대표 혼합값:</strong> Whiteboard 45% · 일반 2D 애니메이션 30% · Flow 25%. 음성·자막은 전체 120초 동안 연속 유지합니다.</div>
        <div><h2 className="mb-2 font-bold">6가지 재활용 스타일</h2><div className="space-y-2">{DRYWRITER_REUSE_STYLES.map(s=><button key={s.id} onClick={()=>setStyle(s.id)} className={`w-full rounded-xl border p-3 text-left ${style===s.id?'border-white bg-white text-zinc-950':'border-zinc-700 bg-zinc-950'}`}><div className="font-bold">{s.name}</div><div className="mt-1 text-xs opacity-70">{s.mix}</div></button>)}</div></div>
      </section>
      <section className="space-y-5">
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-xl font-bold">{selected.name}</h2><p className="mt-2 text-zinc-300">{selected.summary}</p><p className="mt-2 text-sm text-zinc-500">추천: {selected.bestFor}</p></article>
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">120초 Hybrid Timeline</h2><span className="text-sm text-zinc-500">9:16 · narration locked</span></div><div className="space-y-2">{HYBRID_120S_TIMELINE.map((x,i)=><div key={i} className="grid grid-cols-[80px_130px_1fr] gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm"><div>{x.start}–{x.end}s</div><div className="font-semibold">{x.mode}</div><div className="text-zinc-300">{x.label}</div></div>)}</div></article>
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="text-xl font-bold">Flow 테스트 컷 2개</h2><div className="mt-3 space-y-3">{flowPrompts.map((p,i)=><div key={i} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"><div className="mb-2 text-xs font-bold text-cyan-300">FLOW_SCENE_{String(i+1).padStart(2,'0')}</div><p className="text-sm leading-6 text-zinc-300">{p}</p></div>)}</div></article>
      </section>
    </main>
  </div>;
}
