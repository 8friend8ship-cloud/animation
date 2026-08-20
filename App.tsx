import React, {useEffect, useState} from 'react';
import Home from './Home';
import WhiteboardWorkspace from './whiteboard/WhiteboardWorkspace';
import HybridWorkspace from './hybrid/HybridWorkspace';
import MotionRuntime from './runtime/MotionRuntime';

type AppMode = 'animation' | 'whiteboard' | 'hybrid' | 'motion';

function getInitialMode(): AppMode {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  if (mode === 'whiteboard' || mode === 'hybrid' || mode === 'motion') return mode;
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
  if (mode === 'motion') return <div className="min-h-screen bg-slate-950 p-6"><button onClick={() => setMode('animation')} className="mb-4 rounded-xl bg-slate-800 px-4 py-2 text-white">← Animation</button><MotionRuntime /></div>;

  return (
    <div className="relative min-h-screen">
      <Home />
      <div className="fixed bottom-5 right-5 z-[100] flex gap-2">
        <button type="button" onClick={() => setMode('motion')} className="rounded-2xl border border-emerald-700 bg-emerald-950 px-4 py-3 text-sm font-bold text-emerald-100 shadow-xl hover:bg-emerald-900" title="Bots MotionConnectionPack 기반 런타임 E2E">Motion Runtime</button>
        <button type="button" onClick={() => setMode('hybrid')} className="rounded-2xl border border-cyan-700 bg-cyan-950 px-4 py-3 text-sm font-bold text-cyan-100 shadow-xl hover:bg-cyan-900" title="건조한작가 혼합 2분 쇼츠와 6가지 재활용 스타일">Hybrid · Flow</button>
        <button type="button" onClick={() => setMode('whiteboard')} className="rounded-2xl border border-stone-700 bg-[#f5ebd7] px-4 py-3 text-sm font-bold text-stone-900 shadow-xl hover:bg-[#efe0c4]">Whiteboard</button>
      </div>
    </div>
  );
}
