import React, {useEffect, useState} from 'react';
import Home from './Home';
import WhiteboardWorkspace from './whiteboard/WhiteboardWorkspace';
import HybridWorkspace from './hybrid/HybridWorkspace';

type AppMode = 'animation' | 'whiteboard' | 'hybrid';

function getInitialMode(): AppMode {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  if (mode === 'whiteboard' || mode === 'hybrid') return mode;
  return 'animation';
}

export default function App() {
  const [mode, setMode] = useState<AppMode>(getInitialMode);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (mode === 'animation') url.searchParams.delete('mode');
    else url.searchParams.set('mode', mode);
    window.history.replaceState({}, '', url);
  }, [mode]);

  if (mode === 'whiteboard') return <WhiteboardWorkspace onBack={() => setMode('animation')} />;
  if (mode === 'hybrid') return <HybridWorkspace onBack={() => setMode('animation')} />;

  return (
    <div className="relative min-h-screen">
      <Home />
      <div className="fixed bottom-5 right-5 z-[100] flex gap-2">
        <button type="button" onClick={() => setMode('hybrid')} className="rounded-2xl border border-cyan-700 bg-cyan-950 px-4 py-3 text-sm font-bold text-cyan-100 shadow-xl hover:bg-cyan-900" title="건조한작가 혼합 2분 쇼츠와 6가지 재활용 스타일">Hybrid · Flow</button>
        <button type="button" onClick={() => setMode('whiteboard')} className="rounded-2xl border border-stone-700 bg-[#f5ebd7] px-4 py-3 text-sm font-bold text-stone-900 shadow-xl hover:bg-[#efe0c4]" title="SRT 자막 기반 화이트보드 애니메이션">Whiteboard</button>
      </div>
    </div>
  );
}
