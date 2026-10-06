import React, { useEffect, useMemo, useRef, useState } from 'react';

export type HymnLyricLine = {
  start: number;
  end: number;
  text: string;
};

export type HymnLanguageTrack = {
  code: string;
  label: string;
  rightsStatus:
    | 'PUBLIC_DOMAIN'
    | 'CC0'
    | 'CC_BY'
    | 'CC_BY_SA'
    | 'EXPLICIT_LICENSE'
    | 'USER_PROVIDED'
    | 'COPYRIGHTED_METADATA_ONLY'
    | 'UNKNOWN_METADATA_ONLY';
  lines: HymnLyricLine[];
};

export type HymnSimpleImagePayload = {
  hymnNo?: number;
  title: string;
  tuneId: string;
  defaultLanguage: string;
  languages: HymnLanguageTrack[];
  backgroundImageUrl?: string;
  audioUrl?: string;
  motion?: 'NONE' | 'SLOW_ZOOM' | 'SLOW_PAN';
};

const FULL_TEXT_ALLOWED = new Set([
  'PUBLIC_DOMAIN',
  'CC0',
  'CC_BY',
  'CC_BY_SA',
  'EXPLICIT_LICENSE',
  'USER_PROVIDED',
]);

const EMPTY_PAYLOAD: HymnSimpleImagePayload = {
  title: '찬송가 단순 이미지 모드',
  tuneId: 'UNRESOLVED_TUNE',
  defaultLanguage: 'KO',
  languages: [
    {
      code: 'KO',
      label: '한국어',
      rightsStatus: 'USER_PROVIDED',
      lines: [{ start: 0, end: 9999, text: '가사 JSON을 불러오면 여기에 표시됩니다.' }],
    },
  ],
  motion: 'SLOW_ZOOM',
};

function findLine(lines: HymnLyricLine[], time: number) {
  return lines.find((line) => time >= line.start && time < line.end);
}

export default function HymnSimpleImageWorkspace({
  onBack,
  initialPayload,
}: {
  onBack: () => void;
  initialPayload?: HymnSimpleImagePayload;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [payload, setPayload] = useState<HymnSimpleImagePayload>(initialPayload ?? EMPTY_PAYLOAD);
  const [language, setLanguage] = useState(payload.defaultLanguage);
  const [time, setTime] = useState(0);
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [localAudio, setLocalAudio] = useState<string | null>(null);
  const [status, setStatus] = useState('READY');

  const version = useMemo(
    () => payload.languages.find((item) => item.code === language) ?? payload.languages[0],
    [language, payload.languages],
  );

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (audioRef.current) setTime(audioRef.current.currentTime || 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    return () => {
      if (localImage) URL.revokeObjectURL(localImage);
      if (localAudio) URL.revokeObjectURL(localAudio);
    };
  }, [localImage, localAudio]);

  const currentLine = version ? findLine(version.lines, time) : undefined;
  const rightsAllowed = version ? FULL_TEXT_ALLOWED.has(version.rightsStatus) : false;
  const imageUrl = localImage ?? payload.backgroundImageUrl;
  const audioUrl = localAudio ?? payload.audioUrl;
  const motion = payload.motion ?? 'SLOW_ZOOM';

  async function loadPayload(file: File) {
    try {
      const next = JSON.parse(await file.text()) as HymnSimpleImagePayload;
      if (!next.title || !next.tuneId || !Array.isArray(next.languages) || next.languages.length === 0) {
        throw new Error('INVALID_HYMN_PAYLOAD');
      }
      setPayload(next);
      setLanguage(next.defaultLanguage || next.languages[0].code);
      setStatus('PAYLOAD_READBACK_PASS');
    } catch {
      setStatus('PAYLOAD_HOLD_INVALID_JSON');
    }
  }

  function chooseImage(file?: File) {
    if (!file) return;
    if (localImage) URL.revokeObjectURL(localImage);
    setLocalImage(URL.createObjectURL(file));
    setStatus('IMAGE_READBACK_PASS');
  }

  function chooseAudio(file?: File) {
    if (!file) return;
    if (localAudio) URL.revokeObjectURL(localAudio);
    setLocalAudio(URL.createObjectURL(file));
    setStatus('AUDIO_READBACK_PASS');
  }

  const motionClass =
    motion === 'SLOW_PAN'
      ? 'animate-[hymnPan_24s_ease-in-out_infinite_alternate]'
      : motion === 'NONE'
        ? ''
        : 'animate-[hymnZoom_28s_ease-in-out_infinite_alternate]';

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <style>{`
        @keyframes hymnZoom { from { transform: scale(1.0); } to { transform: scale(1.075); } }
        @keyframes hymnPan { from { transform: scale(1.06) translateX(-1.5%); } to { transform: scale(1.06) translateX(1.5%); } }
      `}</style>

      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/10"
        >
          ← Animation
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-white/60">
            {payload.hymnNo ? `새찬송가 ${payload.hymnNo}장 · ` : ''}{payload.tuneId}
          </div>
          <h1 className="truncate text-lg font-bold">{payload.title}</h1>
        </div>
        <div className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/70">{status}</div>

        <label className="cursor-pointer rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
          가사 JSON
          <input
            hidden
            type="file"
            accept=".json,application/json"
            onChange={(e) => e.target.files?.[0] && loadPayload(e.target.files[0])}
          />
        </label>
        <label className="cursor-pointer rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
          배경 이미지
          <input hidden type="file" accept="image/*" onChange={(e) => chooseImage(e.target.files?.[0])} />
        </label>
        <label className="cursor-pointer rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
          오디오
          <input hidden type="file" accept="audio/*" onChange={(e) => chooseAudio(e.target.files?.[0])} />
        </label>

        <label className="rounded-xl bg-white/10 px-3 py-2 text-sm">
          CC&nbsp;
          <select
            className="bg-transparent font-semibold outline-none"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {payload.languages.map((item) => (
              <option className="bg-neutral-900" key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
        <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 shadow-2xl">
          {imageUrl ? (
            <img
              className={`absolute inset-0 h-full w-full object-cover ${motionClass}`}
              src={imageUrl}
              alt=""
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#334155_0%,#111827_45%,#020617_100%)]" />
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/10 to-black/60" />

          <div className="absolute left-5 top-5 rounded-full bg-black/45 px-4 py-2 text-xs font-semibold tracking-wide text-white/80 backdrop-blur">
            SIMPLE IMAGE · {motion}
          </div>

          <div className="absolute inset-x-[7%] bottom-[8%] text-center">
            <div className="mb-3 text-sm font-medium text-white/65">
              {version?.label ?? language}
            </div>
            <div className="mx-auto max-w-5xl text-balance text-[clamp(26px,4.2vw,64px)] font-extrabold leading-[1.22] tracking-[-0.02em] text-white [text-shadow:0_3px_14px_rgba(0,0,0,.9)]">
              {rightsAllowed
                ? (currentLine?.text ?? '')
                : '이 언어 가사는 권리 확인 후 표시됩니다.'}
            </div>
          </div>
        </div>

        {audioUrl ? (
          <audio ref={audioRef} className="w-full" controls src={audioUrl} />
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 px-4 py-5 text-center text-sm text-white/50">
            오디오를 선택하면 시간 동기화 가사가 작동합니다.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white/5 p-4">
            <div className="text-xs text-white/50">화면 원칙</div>
            <div className="mt-1 font-semibold">이미지 1장 + 아주 약한 움직임</div>
          </div>
          <div className="rounded-2xl bg-white/5 p-4">
            <div className="text-xs text-white/50">언어 원칙</div>
            <div className="mt-1 font-semibold">CC 선택은 가사 레이어만 교체</div>
          </div>
          <div className="rounded-2xl bg-white/5 p-4">
            <div className="text-xs text-white/50">권리 원칙</div>
            <div className="mt-1 font-semibold">미승인 번역 가사 전문은 표시하지 않음</div>
          </div>
        </div>
      </section>
    </main>
  );
}
