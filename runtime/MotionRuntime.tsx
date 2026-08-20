import React, { useEffect, useMemo, useRef, useState } from 'react';

type MotionPrimitive = { MOTION_ID?: string; [key: string]: unknown };
type MotionCue = {
  START_MS?: number | string; END_MS?: number | string; MOTION_ID?: string;
  ASSET_URL?: string; ASSET_ID?: string; CAPTION_ID?: string; [key: string]: unknown;
};
type MotionPack = {
  schema?: string; personaId?: string; locale?: string;
  primitives?: MotionPrimitive[]; cues?: MotionCue[];
};

const PERSONA_ID = 'P-TEST-DRYWRITER-001';
const MASTER_URL = 'https://drive.google.com/uc?export=download&id=1rai10e1leGvjXjY2jVZo45Wb94b5pFFl';

function ms(v: unknown) { return Number(v || 0); }

export default function MotionRuntime() {
  const [packUrl, setPackUrl] = useState(import.meta.env.VITE_MOTION_PACK_URL || '');
  const [masterUrl, setMasterUrl] = useState(MASTER_URL);
  const [pack, setPack] = useState<MotionPack | null>(null);
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [caption, setCaption] = useState('');
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [error, setError] = useState('');
  const started = useRef(0);

  useEffect(() => {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    setVoice(voices.find(v => v.lang.toLowerCase().startsWith('ko')) || null);
    const onVoices = () => {
      const next = window.speechSynthesis.getVoices();
      setVoice(next.find(v => v.lang.toLowerCase().startsWith('ko')) || null);
    };
    speechSynthesis?.addEventListener?.('voiceschanged', onVoices);
    return () => speechSynthesis?.removeEventListener?.('voiceschanged', onVoices);
  }, []);

  const cues = useMemo(() => (pack?.cues || []).slice().sort((a,b) => ms(a.START_MS)-ms(b.START_MS)), [pack]);
  const active = cues.find(c => now >= ms(c.START_MS) && now <= ms(c.END_MS));
  const motion = String(active?.MOTION_ID || 'SPEAK_IDLE');
  const duration = Math.max(12000, ...cues.map(c => ms(c.END_MS)));

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const t = performance.now() - started.current;
      if (t >= duration) { setPlaying(false); setNow(0); return; }
      setNow(t);
    }, 40);
    return () => clearInterval(id);
  }, [playing, duration]);

  useEffect(() => {
    const text = active?.CAPTION_TEXT || active?.CAPTION_ID || motion;
    setCaption(String(text));
  }, [active, motion]);

  async function loadPack() {
    setError('');
    if (!packUrl) { setError('VITE_MOTION_PACK_URL 또는 Apps Script Web App URL을 입력하세요.'); return; }
    try {
      const res = await fetch(packUrl);
      if (!res.ok) throw new Error('Motion Pack HTTP ' + res.status);
      const data = await res.json();
      if (data.schema !== 'MOTION_CONNECTION_PACK_V1') throw new Error('지원하지 않는 Motion Pack schema');
      if (data.personaId && data.personaId !== PERSONA_ID) throw new Error('Persona ID 불일치');
      setPack(data);
      setNow(0);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  function speak() {
    const text = '건조한작가입니다. 오늘의 핵심 내용을 세 단계로 설명하겠습니다.';
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR'; u.rate = 0.96; u.pitch = 0.98;
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }

  function play() {
    started.current = performance.now() - now;
    setPlaying(true);
  }

  const className = ['persona', motion.toLowerCase().replaceAll('_','-')].join(' ');
  return <section className="motion-runtime rounded-3xl border border-cyan-800 bg-slate-950 p-6 text-slate-100 shadow-2xl">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Motion Connection Runtime</p><h2 className="text-2xl font-black">P-TEST-DRYWRITER-001 E2E Preview</h2></div>
      <span className="rounded-full bg-amber-900/60 px-3 py-1 text-xs">{pack ? 'PACK_LOADED' : 'PACK_PENDING'}</span>
    </div>
    <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
      <div className="rounded-2xl bg-slate-900 p-4">
        <label className="mb-2 block text-xs text-slate-400">Motion Pack Web App URL</label>
        <input value={packUrl} onChange={e=>setPackUrl(e.target.value)} className="mb-3 w-full rounded-xl bg-slate-800 p-3 text-sm" placeholder="https://script.google.com/macros/s/.../exec" />
        <label className="mb-2 block text-xs text-slate-400">FULLBODY_REF_URL</label>
        <input value={masterUrl} onChange={e=>setMasterUrl(e.target.value)} className="mb-3 w-full rounded-xl bg-slate-800 p-3 text-sm" />
        <div className="flex flex-wrap gap-2">
          <button onClick={loadPack} className="rounded-xl bg-cyan-500 px-4 py-2 font-bold text-slate-950">Load Pack</button>
          <button onClick={play} disabled={!pack} className="rounded-xl bg-emerald-500 px-4 py-2 font-bold text-slate-950 disabled:opacity-40">Play Timeline</button>
          <button onClick={speak} className="rounded-xl bg-violet-500 px-4 py-2 font-bold text-white">한국어 음성 미리듣기</button>
        </div>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        <p className="mt-4 text-xs text-slate-400">현재 음성은 브라우저의 한국어 voice를 사용합니다. 브라우저 speechSynthesis는 녹음 가능한 오디오 파일을 제공하지 않으므로 최종 MP4 오디오 export는 별도 TTS backend 결과가 필요합니다.</p>
      </div>
      <div className="relative min-h-[420px] overflow-hidden rounded-2xl bg-gradient-to-b from-cyan-950 to-slate-900">
        <img src={masterUrl} alt="DryWriter fullbody persona" className={className} />
        <div className="absolute bottom-5 left-5 right-5 rounded-xl bg-black/70 p-3 text-center text-lg font-bold">{caption || 'Motion Pack을 로드하면 cue가 표시됩니다.'}</div>
        <div className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs">{motion} · {Math.round(now)}ms</div>
      </div>
    </div>
    <style>{`
      .motion-runtime .persona{display:block;max-height:390px;max-width:82%;margin:18px auto 42px;object-fit:contain;transform-origin:50% 85%;transition:transform 180ms ease,filter 180ms ease}
      .motion-runtime .body-lean{transform:rotate(-3deg) translateX(-8px)}
      .motion-runtime .arm-sweep,.motion-runtime .hand-explain{transform:rotate(2deg) translateX(10px) scale(1.015)}
      .motion-runtime .head-turn{transform:rotate(1deg) translateX(5px)}
      .motion-runtime .head-nod{transform:translateY(4px) scaleY(.99)}
      .motion-runtime .speak-idle{filter:drop-shadow(0 0 12px rgba(34,211,238,.25))}
    `}</style>
  </section>;
}
