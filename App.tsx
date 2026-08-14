import React, {useEffect, useState} from 'react';
import Home from './Home';
import WhiteboardWorkspace from './whiteboard/WhiteboardWorkspace';

type AppMode = 'animation' | 'whiteboard';

function getInitialMode(): AppMode {
  const params = new URLSearchParams(window.location.search);
  return params.get('mode') === 'whiteboard' ? 'whiteboard' : 'animation';
}

export default function App() {
  const [mode, setMode] = useState<AppMode>(getInitialMode);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (mode === 'whiteboard') url.searchParams.set('mode', 'whiteboard');
    else url.searchParams.delete('mode');
    window.history.replaceState({}, '', url);
  }, [mode]);

  if (mode === 'whiteboard') {
    return <WhiteboardWorkspace onBack={() => setMode('animation')} />;
  }

  return (
    <div className="relative min-h-screen">
      <Home />
      <button
        type="button"
        onClick={() => setMode('whiteboard')}
        className="fixed bottom-5 right-5 z-[100] rounded-2xl border border-stone-700 bg-[#f5ebd7] px-4 py-3 text-sm font-bold text-stone-900 shadow-xl hover:bg-[#efe0c4]"
        title="SRT 자막 기반 화이트보드 애니메이션"
      >
        Whiteboard
      </button>
    </div>
  );
}
