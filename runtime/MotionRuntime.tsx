import React, { useEffect, useMemo, useRef, useState } from 'react';

type MotionPrimitive = { MOTION_ID?: string; [key: string]: unknown };
type MotionCue = {
  START_MS?: number | string; END_MS?: number | string; MOTION_ID?: string;
  ASSET_URL?: string; ASSET_ID?: string; CAPTION_ID?: string; CAPTION_TEXT?: string;
  VISEME_ID?: string; EXPRESSION_ID?: string; GESTURE_ID?: string; Z_INDEX?: number | string;
  [key: string]: unknown;
};
type MotionPack = {
  schema?: string; extensionSchema?: string; personaId?: string; locale?: string;
  primitives?: MotionPrimitive[]; cues?: MotionCue[];
  visemes?: Record<string, unknown>[]; expressions?: Record<string, unknown>[];
  capability?: Record<string, boolean>; validation?: { ok?: boolean; errors?: string[] };
  animationTemplate?: Record<string, unknown> | null;
  animationAssets?: Record<string, unknown>[];
  assetReadiness?: { required?: string[]; ready?: string[]; missing?: string[]; needsGeneration?: string[]; renderReady?: boolean };
};
type ControlState = { viseme: string; expression: string; gesture: string; motion: string };

const PERSONA_ID = 'P-TEST-DRYWRITER-001';
const MASTER_URL = 'https://drive.google.com/uc?export=download&id=1rai10e1leGvjXjY2jVZo45Wb94b5pFFl';

function ms(v: unknown) { return Number(v || 0); }
function text(v: unknown, fallback = '') { return typeof v === 'string' && v ? v : fallback; }
function mouthShape(viseme: string) {
  const v = viseme.toUpperCase();
  if (v.includes('M') || v.includes('P') || v.includes('B')) return { rx: 22, ry: 3 };
  if (v.includes('U') || v.includes('O')) return { rx: 10, ry: 15 };
  if (v.includes('I') || v.includes('E')) return { rx: 25, ry: 8 };
  if (v.includes('A')) return { rx: 18, ry: 18 };
  return { rx: 18, ry: 5 };
}

const CONTROL_TEST_PACK: MotionPack = {
  schema: 'MOTION_CONNECTION_PACK_V1', personaId: PERSONA_ID, locale: 'ko-KR',
  primitives: [{ MOTION_ID: 'MOTION_SPEAK_IDLE' }, { MOTION_ID: 'MOTION_HEAD_NOD' }],
  cues: [
    { START_MS: 0, END_MS: 1200, MOTION_ID: 'MOTION_SPEAK_IDLE', VISEME_ID: 'M', EXPRESSION_ID: 'EXPLAIN_CALM', GESTURE_ID: 'MICRO_GESTURE', CAPTION_TEXT: '입술 닫힘 / 차분한 표정' },
    { START_MS: 1200, END_MS: 2400, MOTION_ID: 'MOTION_HEAD_NOD', VISEME_ID: 'A', EXPRESSION_ID: 'EXPLAIN', GESTURE_ID: 'SMALL_NOD', CAPTION_TEXT: '아 발음 / 설명 표정' },
    { START_MS: 2400, END_MS: 3600, MOTION_ID: 'MOTION_SPEAK_IDLE', VISEME_ID: 'I', EXPRESSION_ID: 'HAPPY', GESTURE_ID: 'OPEN_PALM', CAPTION_TEXT: '이 발음 / 밝은 표정' },
    { START_MS: 3600, END_MS: 4800, MOTION_ID: 'MOTION_HEAD_TURN', VISEME_ID: 'U', EXPRESSION_ID: 'THINKING', GESTURE_ID: 'POINT', CAPTION_TEXT: '우 발음 / 생각 표정' }
  ]
};

function FaceControlRig({ state }: { state: ControlState }) {
  const mouth = mouthShape(state.viseme);
  const happy = /HAPPY|EXPLAIN/.test(state.expression.toUpperCase());
  const thinking = state.expression.toUpperCase().includes('THINK');
  return <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-3">
    <div className="mb-2 flex items-center justify-between"><b className="text-sm">Face / Lip Control Test Rig</b><span className="text-xs text-amber-300">TEST_RIG</span></div>
    <svg viewBox="0 0 220 180" className="mx-auto h-44 w-56" role="img" aria-label="표정과 입술 제어 테스트 리그">
      <ellipse cx="110" cy="90" rx="76" ry="82" fill="#f1c7a5"/>
      <path d={thinking ? 'M58 57 Q80 45 96 58' : 'M58 58 Q78 54 96 58'} stroke="#38251f" strokeWidth="6" fill="none"/>
      <path d={happy ? 'M124 58 Q145 50 164 58' : 'M124 58 Q145 54 164 58'} stroke="#38251f" strokeWidth="6" fill="none"/>
      <ellipse cx="78" cy="82" rx="8" ry={happy ? 5 : 9} fill="#222"/>
      <ellipse cx="144" cy="82" rx="8" ry={happy ? 5 : 9} fill="#222"/>
      <ellipse cx="110" cy="130" rx={mouth.rx} ry={mouth.ry} fill="#7f1d1d"/>
      <text x="110" y="172" textAnchor="middle" fill="#cbd5e1" fontSize="10">{state.expression} · {state.viseme}</text>
    </svg>
    <div className="grid grid-cols-2 gap-2 text-xs">
      <span>VISEME: {state.viseme}</span><span>EXPRESSION: {state.expression}</span>
      <span>GESTURE: {state.gesture}</span><span>MOTION: {state.motion}</span>
    </div>
  </div>;
}

export default function MotionRuntime() {
  const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const [packUrl, setPackUrl] = useState(runtimeEnv?.VITE_MOTION_PACK_URL || '');
  const [masterUrl, setMasterUrl] = useState(MASTER_URL);
  const [templateType, setTemplateType] = useState('EXPLAIN');
  const [pack, setPack] = useState<MotionPack | null>(null);
  const [packSource, setPackSource] = useState<'NONE'|'BRIDGE'|'TEST_RIG'>('NONE');
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [error, setError] = useState('');
  const started = useRef(0);

  useEffect(() => {
    const onVoices = () => {
      const voices = window.speechSynthesis?.getVoices?.() || [];
      setVoice(voices.find(v => v.lang.toLowerCase().startsWith('ko')) || null);
    };
    onVoices();
    speechSynthesis?.addEventListener?.('voiceschanged', onVoices);
    return () => speechSynthesis?.removeEventListener?.('voiceschanged', onVoices);
  }, []);

  const cues = useMemo(() => (pack?.cues || []).slice().sort((a,b) => ms(a.START_MS)-ms(b.START_MS)), [pack]);
  const activeCues = cues.filter(c => now >= ms(c.START_MS) && now <= ms(c.END_MS)).sort((a,b) => ms(a.Z_INDEX)-ms(b.Z_INDEX));
  const active = activeCues.at(-1);
  const controls: ControlState = {
    motion: text(active?.MOTION_ID, 'MOTION_SPEAK_IDLE'),
    viseme: text(active?.VISEME_ID, 'VISEME_MISSING'),
    expression: text(active?.EXPRESSION_ID, 'EXPRESSION_MISSING'),
    gesture: text(active?.GESTURE_ID, 'GESTURE_MISSING')
  };
  const duration = Math.max(packSource === 'TEST_RIG' ? 4800 : 12000, ...cues.map(c => ms(c.END_MS)));
  const hasControlIds = cues.some(c => c.VISEME_ID) && cues.some(c => c.EXPRESSION_ID) && cues.some(c => c.GESTURE_ID);
  const hasRenderableFaceMap = cues.some(c => c.VISEME_ASSET_URL || c.EXPRESSION_ASSET_URL || c.FACE_RIG_ID);
  const faceStatus = packSource === 'TEST_RIG' ? 'CONTROL_TEST_READY' : hasControlIds && hasRenderableFaceMap ? 'PERSONA_FACE_READY' : hasControlIds ? 'ID_ONLY_NO_FACE_MAP' : 'CONTROL_DATA_MISSING';

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const t = performance.now() - started.current;
      if (t >= duration) { setPlaying(false); setNow(0); return; }
      setNow(t);
    }, 40);
    return () => clearInterval(id);
  }, [playing, duration]);

  async function loadPack() {
    setError('');
    if (!packUrl) { setError('Apps Script Web App URL을 입력하세요.'); return; }
    try {
      const url = new URL(packUrl);
      url.searchParams.set('projectId', templateType === 'DANCE' ? 'DRYWRITER_DANCE_TEST_001' : 'DRYWRITER_PERSONA_EXPLAIN_001');
      url.searchParams.set('personaId', PERSONA_ID);
      url.searchParams.set('locale', 'ko-KR');
      url.searchParams.set('mode', 'AVATAR');
      url.searchParams.set('templateType', templateType);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Motion Pack HTTP ' + res.status);
      const data = await res.json();
      if (data.schema !== 'MOTION_CONNECTION_PACK_V1') throw new Error('지원하지 않는 Motion Pack schema');
      if (data.personaId && data.personaId !== PERSONA_ID) throw new Error('Persona ID 불일치');
      setPack(data); setPackSource('BRIDGE'); setNow(0);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  function loadControlTest() { setPack(CONTROL_TEST_PACK); setPackSource('TEST_RIG'); setNow(0); setError(''); }
  function play() { started.current = performance.now() - now; setPlaying(true); }
  function speak() {
    const u = new SpeechSynthesisUtterance('건조한작가입니다. 얼굴 표정과 입술 제어를 점검합니다.');
    u.lang = 'ko-KR'; u.rate = 0.96; u.pitch = 0.98; if (voice) u.voice = voice;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }

  const motionClass = controls.motion.toLowerCase().replace(/^motion_/, '').replaceAll('_','-');
  return <section className="motion-runtime rounded-3xl border border-cyan-800 bg-slate-950 p-6 text-slate-100 shadow-2xl">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Motion Connection Runtime</p><h2 className="text-2xl font-black">P-TEST-DRYWRITER-001 Control Check</h2></div>
      <span className="rounded-full bg-amber-900/60 px-3 py-1 text-xs">{packSource} · {faceStatus} · {pack?.validation?.ok === false ? 'PACK_INVALID' : pack ? 'PACK_VALID' : 'PACK_PENDING'}</span>
    </div>
    <div className="grid gap-4 lg:grid-cols-[.9fr_1.25fr_.8fr]">
      <div className="rounded-2xl bg-slate-900 p-4">
        <label className="mb-2 block text-xs text-slate-400">Motion Pack Web App URL</label>
        <input value={packUrl} onChange={e=>setPackUrl(e.target.value)} className="mb-3 w-full rounded-xl bg-slate-800 p-3 text-sm" placeholder="https://script.google.com/macros/s/.../exec" />
        <label className="mb-2 block text-xs text-slate-400">Animation Template Type</label>
        <select value={templateType} onChange={e=>setTemplateType(e.target.value)} className="mb-3 w-full rounded-xl bg-slate-800 p-3 text-sm">
          {['EXPLAIN','GREETING','THINK','POINT','DANCE','LISTEN'].map(type=><option key={type}>{type}</option>)}
        </select>
        <label className="mb-2 block text-xs text-slate-400">FULLBODY_REF_URL</label>
        <input value={masterUrl} onChange={e=>setMasterUrl(e.target.value)} className="mb-3 w-full rounded-xl bg-slate-800 p-3 text-sm" />
        <div className="flex flex-wrap gap-2">
          <button onClick={loadPack} className="rounded-xl bg-cyan-500 px-3 py-2 font-bold text-slate-950">Load Bridge</button>
          <button onClick={loadControlTest} className="rounded-xl bg-amber-400 px-3 py-2 font-bold text-slate-950">Load Control Test</button>
          <button onClick={play} disabled={!pack} className="rounded-xl bg-emerald-500 px-3 py-2 font-bold text-slate-950 disabled:opacity-40">Play</button>
          <button onClick={speak} className="rounded-xl bg-violet-500 px-3 py-2 font-bold text-white">한국어 음성</button>
        </div>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        <p className="mt-4 text-xs text-slate-400">TEST_RIG는 제어 엔진 검증용이며 실제 Persona 얼굴 합성 판정이 아닙니다. 실제 판정에는 viseme/expression 매핑과 얼굴 rig 또는 레이어 자산이 필요합니다.</p>
        {pack?.capability && <div className="mt-3 grid grid-cols-2 gap-1 text-xs">{Object.entries(pack.capability).map(([key,value])=><span key={key} className={value ? 'text-emerald-300' : 'text-rose-300'}>{key}: {value ? 'READY' : 'HOLD'}</span>)}</div>}
        {!!pack?.validation?.errors?.length && <p className="mt-2 text-xs text-rose-300">{pack.validation.errors.join(' · ')}</p>}
        {pack?.assetReadiness && <div className="mt-3 rounded-xl bg-slate-800 p-2 text-xs">
          <b>Asset Pack: {pack.assetReadiness.renderReady ? 'READY' : 'NEEDS_GENERATION'}</b>
          <p className="mt-1 text-emerald-300">Ready: {(pack.assetReadiness.ready || []).join(', ') || '없음'}</p>
          <p className="mt-1 text-amber-300">Missing: {(pack.assetReadiness.missing || []).join(', ') || '없음'}</p>
        </div>}
      </div>
      <div className="relative min-h-[420px] overflow-hidden rounded-2xl bg-gradient-to-b from-cyan-950 to-slate-900">
        <img src={masterUrl} alt="DryWriter fullbody persona" className={'persona '+motionClass} />
        <div className="absolute bottom-5 left-5 right-5 rounded-xl bg-black/70 p-3 text-center text-lg font-bold">{text(active?.CAPTION_TEXT, text(active?.CAPTION_ID, 'Motion Pack을 로드하세요.'))}</div>
        <div className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs">{controls.motion} · {Math.round(now)}ms</div>
      </div>
      <FaceControlRig state={controls}/>
    </div>
    <style>{`
      .motion-runtime .persona{display:block;max-height:390px;max-width:82%;margin:18px auto 42px;object-fit:contain;transform-origin:50% 85%;transition:transform 180ms ease,filter 180ms ease}
      .motion-runtime .body-lean{transform:rotate(-3deg) translateX(-8px)}
      .motion-runtime .arm-sweep,.motion-runtime .hand-explain{transform:rotate(2deg) translateX(10px) scale(1.015)}
      .motion-runtime .head-turn{transform:rotate(1deg) translateX(5px)}
      .motion-runtime .head-nod{transform:translateY(4px) scaleY(.99)}
      .motion-runtime .speak-idle{filter:drop-shadow(0 0 12px rgba(34,211,238,.25))}
      .motion-runtime .dance-bounce{animation:motion-dance-bounce .8s ease-in-out infinite}
      .motion-runtime .dance-step-side{animation:motion-dance-step 1s ease-in-out infinite}
      .motion-runtime .dance-arm-wave{animation:motion-dance-wave .9s ease-in-out infinite}
      @keyframes motion-dance-bounce{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-14px) rotate(1deg) scale(1.02)}}
      @keyframes motion-dance-step{0%,100%{transform:translateX(-16px) rotate(-2deg)}50%{transform:translateX(16px) rotate(2deg)}}
      @keyframes motion-dance-wave{0%,100%{transform:rotate(-3deg) translateY(0)}50%{transform:rotate(3deg) translateY(-8px)}}
    `}</style>
  </section>;
}
