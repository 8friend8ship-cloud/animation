import React, {ChangeEvent, useMemo, useState} from 'react';
import {
  buildWhiteboardPlan,
  checkWhiteboardRenderer,
  getWhiteboardRendererUrl,
  submitWhiteboardRender,
  WhiteboardPlan,
} from './client';

type Props = {
  onBack: () => void;
};

export default function WhiteboardWorkspace({onBack}: Props) {
  const [projectName, setProjectName] = useState('whiteboard-project');
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [lineArtFile, setLineArtFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<WhiteboardPlan | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [status, setStatus] = useState('SRT 파일을 넣으면 장면 분석을 시작합니다.');
  const [isBusy, setIsBusy] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const rendererUrl = useMemo(() => getWhiteboardRendererUrl(), []);

  const handleSrt = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSrtFile(file);
    setPlan(null);
    setOutputUrl(null);
    if (!file) return;

    const text = await file.text();
    const nextPlan = buildWhiteboardPlan(text);
    setPlan(nextPlan);
    setStatus(
      nextPlan.cues.length
        ? `${nextPlan.cues.length}개 자막을 ${nextPlan.scenes.length}개 화이트보드 장면으로 분리했습니다.`
        : '유효한 SRT 자막을 찾지 못했습니다.',
    );
  };

  const handleLineArt = (event: ChangeEvent<HTMLInputElement>) => {
    setLineArtFile(event.target.files?.[0] || null);
  };

  const testRenderer = async () => {
    setIsBusy(true);
    setStatus('렌더러 상태를 확인 중입니다.');
    const ok = await checkWhiteboardRenderer();
    setStatus(ok ? 'WHITEBOARD_RENDERER 연결 정상' : 'WHITEBOARD_RENDERER 미연결 또는 응답 없음');
    setIsBusy(false);
  };

  const render = async () => {
    if (!srtFile) {
      setStatus('먼저 SRT 파일을 선택해 주세요.');
      return;
    }
    setIsBusy(true);
    setOutputUrl(null);
    setStatus('화이트보드 렌더링 작업을 요청 중입니다.');
    const result = await submitWhiteboardRender({
      srt: srtFile,
      lineArt: lineArtFile,
      aspectRatio,
      projectName: projectName.trim() || 'whiteboard-project',
    });
    if (result.ok) {
      setStatus(result.status || '렌더링 요청 완료');
      if (result.outputUrl) setOutputUrl(result.outputUrl);
    } else {
      setStatus(`${result.status || 'ERROR'}: ${result.message || '렌더링 요청 실패'}`);
    }
    setIsBusy(false);
  };

  return (
    <div className="min-h-screen bg-[#f5ebd7] text-stone-900">
      <header className="sticky top-0 z-20 border-b border-stone-300 bg-[#f5ebd7]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Animation Studio / Renderer</p>
            <h1 className="text-2xl font-bold">Whiteboard Animation</h1>
          </div>
          <button onClick={onBack} className="rounded-xl border border-stone-400 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-100">
            기존 애니메이션으로 돌아가기
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[380px_1fr]">
        <section className="space-y-4 rounded-2xl border border-stone-300 bg-white/80 p-5 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-semibold">프로젝트 이름</label>
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">SRT 자막</label>
            <input type="file" accept=".srt,text/plain" onChange={handleSrt} className="w-full text-sm" />
            <p className="mt-1 text-xs text-stone-500">25~35초 기준으로 자동 장면 분할합니다.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">선화 이미지 (선택)</label>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLineArt} className="w-full text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">화면비</label>
            <div className="grid grid-cols-2 gap-2">
              {(['16:9', '9:16'] as const).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`rounded-xl border px-3 py-2 font-semibold ${aspectRatio === ratio ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white'}`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-stone-300 bg-stone-50 p-3 text-xs leading-5">
            <div className="font-semibold">Renderer endpoint</div>
            <div className="break-all text-stone-600">{rendererUrl || 'VITE_WHITEBOARD_RENDERER_URL 미설정'}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button disabled={isBusy} onClick={testRenderer} className="rounded-xl border border-stone-400 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50">
              연결 확인
            </button>
            <button disabled={isBusy || !srtFile} onClick={render} className="rounded-xl bg-stone-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              MP4 렌더 요청
            </button>
          </div>

          <div className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950">{status}</div>
          {outputUrl && (
            <a href={outputUrl} target="_blank" rel="noreferrer" className="block rounded-xl bg-emerald-700 px-3 py-2 text-center text-sm font-semibold text-white">
              결과 영상 열기
            </a>
          )}
        </section>

        <section className="rounded-2xl border border-stone-300 bg-white/80 p-5 shadow-sm">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">SRT 장면 계획</h2>
              <p className="text-sm text-stone-500">자막 → Scene → Whiteboard render queue</p>
            </div>
            {plan && <div className="text-sm font-semibold">{plan.cues.length} cues · {plan.scenes.length} scenes</div>}
          </div>

          {!plan?.scenes.length ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-stone-300 text-stone-500">
              SRT를 선택하면 장면별 자막과 시간이 여기에 표시됩니다.
            </div>
          ) : (
            <div className="space-y-3">
              {plan.scenes.map((scene) => (
                <article key={scene.sceneIndex} className="rounded-2xl border border-stone-200 bg-[#fffdf8] p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">Scene {String(scene.sceneIndex).padStart(2, '0')}</h3>
                    <div className="text-xs text-stone-500">
                      {(scene.startMs / 1000).toFixed(1)}s → {(scene.endMs / 1000).toFixed(1)}s · {(scene.sceneDurationMs / 1000).toFixed(1)}s
                    </div>
                  </div>
                  <p className="leading-7">{scene.text}</p>
                  <div className="mt-2 text-xs text-stone-500">Subtitle {scene.cueRange[0]}–{scene.cueRange[1]}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
