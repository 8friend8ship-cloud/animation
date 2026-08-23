import React, {useEffect, useState} from 'react';
import Home from './Home';
import WhiteboardWorkspace from './whiteboard/WhiteboardWorkspace';
import HybridWorkspace from './hybrid/HybridWorkspace';
import VideoTemplateAgentHub from './video-agents/VideoTemplateAgentHub';
import AgentWorkflowShell from './workflow-shell/AgentWorkflowShell';

type AppMode = 'animation' | 'whiteboard' | 'hybrid' | 'video-agents' | 'workflow-shell';

function getInitialMode(): AppMode {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  if (mode === 'whiteboard' || mode === 'hybrid' || mode === 'video-agents' || mode === 'workflow-shell') return mode;
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
  if (mode === 'video-agents') return <VideoTemplateAgentHub onBack={() => setMode('animation')} />;
  if (mode === 'workflow-shell') return <AgentWorkflowShell onBack={() => setMode('animation')} />;

  return (
    <div className="relative min-h-screen">
      <Home />
      <div className="fixed bottom-5 right-5 z-[100] flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => setMode('workflow-shell')} className="rounded-2xl border border-blue-700 bg-blue-950 px-4 py-3 text-sm font-bold text-blue-100 shadow-xl hover:bg-blue-900" title="공통 프런트 UI 셸 + 앱별 Adapter + 중앙 브릿지">Workflow Shell</button>
        <button type="button" onClick={() => setMode('video-agents')} className="rounded-2xl border border-emerald-700 bg-emerald-950 px-4 py-3 text-sm font-bold text-emerald-100 shadow-xl hover:bg-emerald-900" title="영상 템플릿별 전용 워크플로우 에이전트 + 댓글/무료배포 캠페인">Video Agents</button>
        <button type="button" onClick={() => setMode('hybrid')} className="rounded-2xl border border-cyan-700 bg-cyan-950 px-4 py-3 text-sm font-bold text-cyan-100 shadow-xl hover:bg-cyan-900" title="건조한작가 혼합 2분 쇼츠와 6가지 재활용 스타일">Hybrid · Flow</button>
        <button type="button" onClick={() => setMode('whiteboard')} className="rounded-2xl border border-stone-700 bg-[#f5ebd7] px-4 py-3 text-sm font-bold text-stone-900 shadow-xl hover:bg-[#efe0c4]" title="SRT 자막 기반 화이트보드 애니메이션">Whiteboard</button>
      </div>
    </div>
  );
}
