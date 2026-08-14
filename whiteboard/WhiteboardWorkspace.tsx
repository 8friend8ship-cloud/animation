import React, {ChangeEvent, useMemo, useState} from 'react';
import {
  buildWhiteboardPlan,
  checkWhiteboardRenderer,
  getWhiteboardRendererUrl,
  submitWhiteboardRender,
  WhiteboardPlan,
} from './client';
import {DRYWRITER_WHITEBOARD_PRESET, WhiteboardPresetId} from './drywriterPreset';

type Props = {onBack: () => void};

export default function WhiteboardWorkspace({onBack}: Props) {
  const [projectName, setProjectName] = useState('whiteboard-project');
  const [profile, setProfile] = useState<WhiteboardPresetId>('standard');
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [srtText, setSrtText] = useState('');
  const [sceneImages, setSceneImages] = useState<File[]>([]);
  const [annotations, setAnnotations] = useState<File[]>([]);
  const [plan, setPlan] = useState<WhiteboardPlan | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [inkPath, setInkPath] = useState<'grid' | 'skeleton'>('grid');
  const [colorFill, setColorFill] = useState<'contour-wipe' | 'brush'>('contour-wipe');
  const [status, setStatus] = useState('SRT와 장면별 완성 그림을 넣으면 렌더링 준비를 시작합니다.');
  const [isBusy, setIsBusy] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const rendererUrl = useMemo(() => getWhiteboardRendererUrl(), []);
  const timing = profile === 'drywriter' ? DRYWRITER_WHITEBOARD_PRESET.sceneTiming : undefined;

  const rebuildPlan = (text: string, nextProfile: WhiteboardPresetId) => {
    const nextTiming = nextProfile === 'drywriter' ? DRYWRITER_WHITEBOARD_PRESET.sceneTiming : undefined;
    const nextPlan = buildWhiteboardPlan(text, nextTiming);
    setPlan(nextPlan);
    return nextPlan;
  };

  const setPreset = (next: WhiteboardPresetId) => {
    setProfile(next);
    if (next === 'drywriter') {
      setInkPath(DRYWRITER_WHITEBOARD_PRESET.inkPath);
      setColorFill(DRYWRITER_WHITEBOARD_PRESET.colorFill);
      if (projectName === 'whiteboard-project') setProjectName('drywriter-whiteboard');
      setStatus('건조한작가 프리셋 적용: 18~30초 장면, 음성·자막 동기화, 약한 pan/zoom, 완성 후 0.8초 유지.');
    } else {
      setInkPath('grid');
      setColorFill('contour-wipe');
      setStatus('표준 Whiteboard 프리셋을 적용했습니다.');
    }
    if (srtText) rebuildPlan(srtText, next);
  };

  const handleSrt = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSrtFile(file);
    setPlan(null);
    setOutputUrl(null);
    if (!file) return;
    const text = await file.text();
    setSrtText(text);
    const nextPlan = rebuildPlan(text, profile);
    setStatus(nextPlan.cues.length
      ? `${nextPlan.cues.length}개 자막을 ${nextPlan.scenes.length}개 장면으로 분리했습니다. 장면마다 완성 그림 1장을 준비해 주세요.`
      : '유효한 SRT 자막을 찾지 못했습니다.');
  };

  const handleSceneImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSceneImages(files);
    setOutputUrl(null);
    setStatus(`${files.length}개 완성 그림을 불러왔습니다. 파일명 순서대로 Scene 01부터 연결합니다.`);
  };

  const handleAnnotations = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAnnotations(files);
    setStatus(`${files.length}개 annotation.json 파일을 불러왔습니다.`);
  };

  const testRenderer = async () => {
    setIsBusy(true);
    setStatus('Python/OpenCV 렌더러 상태를 확인 중입니다.');
    const ok = await checkWhiteboardRenderer();
    setStatus(ok ? 'WHITEBOARD_RENDERER 연결 정상' : 'WHITEBOARD_RENDERER 미연결 또는 응답 없음');
    setIsBusy(false);
  };

  const render = async () => {
    if (!srtFile) return setStatus('먼저 SRT 파일을 선택해 주세요.');
    if (!sceneImages.length) return setStatus('장면별 완성 그림이 필요합니다.');
    if (plan?.scenes.length && sceneImages.length !== plan.scenes.length) {
      return setStatus(`현재 장면은 ${plan.scenes.length}개인데 완성 그림은 ${sceneImages.length}개입니다.`);
    }
    setIsBusy(true);
    setOutputUrl(null);
    setStatus('화이트보드 MP4 렌더링 작업을 요청 중입니다.');
    const dry = profile === 'drywriter';
    const result = await submitWhiteboardRender({
      srt: srtFile,
      sceneImages,
      annotations,
      aspectRatio,
      projectName: projectName.trim() || 'whiteboard-project',
      inkPath,
      colorFill,
      profile,
      narrationSync: true,
      subtitleSync: true,
      finalHoldMs: dry ? DRYWRITER_WHITEBOARD_PRESET.finalHoldMs : 500,
      motionFx: dry ? DRYWRITER_WHITEBOARD_PRESET.motionFx : 'none',
    });
    if (result.ok) {
      setStatus(result.status || '렌더링 요청 완료');
      if (result.outputUrl) setOutputUrl(result.outputUrl);
    } else setStatus(`${result.status || 'ERROR'}: ${result.message || '렌더링 요청 실패'}`);
    setIsBusy(false);
  };

  return (
    <div className="min-h-screen bg-[#f5ebd7] text-stone-900">
      <header className="sticky top-0 z-20 border-b border-stone-300 bg-[#f5ebd7]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Animation Studio / Local Renderer</p><h1 className="text-2xl font-bold">Whiteboard Animation</h1></div>
          <button onClick={onBack} className="rounded-xl border border-stone-400 bg-white px-4 py-2 text-sm font-semibold">기존 애니메이션으로 돌아가기</button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[400px_1fr]">
        <section className="space-y-4 rounded-2xl border border-stone-300 bg-white/80 p-5 shadow-sm">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950"><strong>외부 AI 영상 API 불필요.</strong> 완성 그림을 Python + OpenCV가 손그림처럼 재생합니다.</div>

          <div>
            <label className="mb-1 block text-sm font-semibold">연출 프리셋</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPreset('standard')} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${profile === 'standard' ? 'border-stone-900 bg-stone-900 text-white' : 'bg-white'}`}>표준</button>
              <button onClick={() => setPreset('drywriter')} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${profile === 'drywriter' ? 'border-stone-900 bg-stone-900 text-white' : 'bg-white'}`}>건조한작가</button>
            </div>
            {profile === 'drywriter' && <p className="mt-2 text-xs leading-5 text-stone-600">상황·대화·갈등을 한 장면씩, 음성·자막과 그림 등장 순서를 맞추고 약한 pan/zoom만 사용합니다.</p>}
          </div>

          <div><label className="mb-1 block text-sm font-semibold">프로젝트 이름</label><input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2" /></div>
          <div><label className="mb-1 block text-sm font-semibold">1. SRT 자막</label><input type="file" accept=".srt,text/plain" onChange={handleSrt} className="w-full text-sm" /><p className="mt-1 text-xs text-stone-500">{profile === 'drywriter' ? `건조한작가: ${timing?.minSec}~${timing?.maxSec}초, 목표 ${timing?.targetSec}초` : '표준: 약 25~35초, 목표 30초'}</p></div>
          <div><label className="mb-1 block text-sm font-semibold">2. 장면별 완성 그림</label><input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={handleSceneImages} className="w-full text-sm" /></div>
          <div><label className="mb-1 block text-sm font-semibold">3. annotation.json</label><input type="file" multiple accept="application/json,.json" onChange={handleAnnotations} className="w-full text-sm" /></div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-sm font-semibold">Ink path</label><select value={inkPath} onChange={(e) => setInkPath(e.target.value as 'grid' | 'skeleton')} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"><option value="grid">grid · 빠름</option><option value="skeleton">skeleton · 선 추적</option></select></div>
            <div><label className="mb-1 block text-sm font-semibold">Color fill</label><select value={colorFill} onChange={(e) => setColorFill(e.target.value as 'contour-wipe' | 'brush')} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"><option value="contour-wipe">contour-wipe</option><option value="brush">brush</option></select></div>
          </div>

          <div><label className="mb-1 block text-sm font-semibold">화면비</label><div className="grid grid-cols-2 gap-2">{(['16:9','9:16'] as const).map((ratio)=><button key={ratio} onClick={()=>setAspectRatio(ratio)} className={`rounded-xl border px-3 py-2 font-semibold ${aspectRatio===ratio?'border-stone-900 bg-stone-900 text-white':'bg-white'}`}>{ratio}</button>)}</div></div>
          <div className="rounded-xl border border-stone-300 bg-stone-50 p-3 text-xs"><div className="font-semibold">Renderer endpoint</div><div className="break-all text-stone-600">{rendererUrl || 'VITE_WHITEBOARD_RENDERER_URL 미설정'}</div></div>
          <div className="grid grid-cols-2 gap-2"><button disabled={isBusy} onClick={testRenderer} className="rounded-xl border border-stone-400 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50">연결 확인</button><button disabled={isBusy || !srtFile || !sceneImages.length} onClick={render} className="rounded-xl bg-stone-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">MP4 렌더</button></div>
          <div className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950">{status}</div>
          {outputUrl && <a href={outputUrl} target="_blank" rel="noreferrer" className="block rounded-xl bg-emerald-700 px-3 py-2 text-center text-sm font-semibold text-white">결과 영상 열기</a>}
        </section>

        <section className="rounded-2xl border border-stone-300 bg-white/80 p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-bold">SRT → Scene → 완성 그림 → 음성/자막 동기화 → MP4</h2><p className="text-sm text-stone-500">{profile === 'drywriter' ? '건조한작가: 이야기의 상황·대화·갈등이 나오는 순서대로 손이 그림을 완성합니다.' : '한 장의 완성 그림 안에서 영역별 그리기 순서를 제어합니다.'}</p></div>{plan && <div className="text-sm font-semibold">{plan.cues.length} cues · {plan.scenes.length} scenes · {sceneImages.length} images</div>}</div>
          {!plan?.scenes.length ? <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-stone-300 text-stone-500">SRT를 선택하면 장면 계획이 표시됩니다.</div> : <div className="space-y-3">{plan.scenes.map((scene,index)=>{const image=sceneImages[index]; return <article key={scene.sceneIndex} className="rounded-2xl border border-stone-200 bg-[#fffdf8] p-4"><div className="mb-2 flex items-center justify-between gap-2"><h3 className="font-bold">Scene {String(scene.sceneIndex).padStart(2,'0')}</h3><div className="text-xs text-stone-500">{(scene.startMs/1000).toFixed(1)}s → {(scene.endMs/1000).toFixed(1)}s</div></div><p className="leading-7">{scene.text}</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className={`rounded-full px-2 py-1 ${image?'bg-emerald-100 text-emerald-800':'bg-rose-100 text-rose-800'}`}>{image?`그림: ${image.name}`:'완성 그림 필요'}</span><span className="rounded-full bg-stone-100 px-2 py-1">Subtitle {scene.cueRange[0]}–{scene.cueRange[1]}</span>{profile==='drywriter'&&<span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">DryWriter rhythm</span>}</div></article>;})}</div>}
        </section>
      </main>
    </div>
  );
}
