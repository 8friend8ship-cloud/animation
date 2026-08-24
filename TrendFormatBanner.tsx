import React from 'react';

export default function TrendFormatBanner() {
  return (
    <section data-testid="animation-trend-format" className="sticky top-0 z-[100] border-b border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-950 shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
        <strong>ANIMATION T2 · PROCESS → MISTAKE/TWIST → PAYOFF</strong>
        <span className="rounded-full bg-white px-2 py-1 font-bold">PUBLIC_VIEWS</span>
        <span className="rounded-full bg-white px-2 py-1 font-bold">ENGAGED_VIEWS</span>
        <span className="font-bold text-rose-700">8/24 전후 VIEW_VELOCITY 직접비교 금지</span>
      </div>
    </section>
  );
}
