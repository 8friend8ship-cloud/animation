export type WhiteboardCue = {
  index: number;
  startMs: number;
  endMs: number;
  durMs: number;
  text: string;
};

export type WhiteboardScene = {
  sceneIndex: number;
  startMs: number;
  endMs: number;
  sceneDurationMs: number;
  cueRange: [number, number];
  text: string;
};

export type WhiteboardPlan = {
  cues: WhiteboardCue[];
  scenes: WhiteboardScene[];
};

export type WhiteboardSceneTiming = {
  targetSec?: number;
  minSec?: number;
  maxSec?: number;
};

export type WhiteboardRenderRequest = {
  srt: File;
  sceneImages: File[];
  annotations?: File[];
  aspectRatio: '16:9' | '9:16';
  projectName: string;
  inkPath: 'grid' | 'skeleton';
  colorFill: 'contour-wipe' | 'brush';
  profile?: 'standard' | 'drywriter';
  narrationSync?: boolean;
  subtitleSync?: boolean;
  finalHoldMs?: number;
  motionFx?: 'none' | 'subtle-pan-zoom';
};

export type WhiteboardRenderResult = {
  ok: boolean;
  jobId?: string;
  status?: string;
  outputUrl?: string;
  message?: string;
};

const TIME_RE = /(\d+):(\d{2}):(\d{2})[,.](\d{1,3})/g;

function toMs(h: string, m: string, s: string, ms: string): number {
  return ((Number(h) * 60 + Number(m)) * 60 + Number(s)) * 1000 + Number(ms.padEnd(3, '0'));
}

export function parseSrt(text: string): WhiteboardCue[] {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) return [];

  const cues: WhiteboardCue[] = [];
  for (const block of normalized.split(/\n\s*\n/)) {
    const lines = block.split('\n').filter((line) => line.trim() !== '');
    const timeLineIndex = lines.findIndex((line) => line.includes('-->'));
    if (timeLineIndex < 0) continue;

    TIME_RE.lastIndex = 0;
    const matches = [...lines[timeLineIndex].matchAll(TIME_RE)];
    if (matches.length < 2) continue;

    const startMs = toMs(matches[0][1], matches[0][2], matches[0][3], matches[0][4]);
    const endMs = toMs(matches[1][1], matches[1][2], matches[1][3], matches[1][4]);
    const body = lines.slice(timeLineIndex + 1).join(' ').trim();

    cues.push({
      index: cues.length + 1,
      startMs,
      endMs,
      durMs: Math.max(0, endMs - startMs),
      text: body,
    });
  }
  return cues;
}

export function groupWhiteboardScenes(
  cues: WhiteboardCue[],
  targetSec = 30,
  minSec = 25,
  maxSec = 35,
): WhiteboardScene[] {
  const scenes: WhiteboardScene[] = [];
  let bucket: WhiteboardCue[] = [];
  const targetMs = targetSec * 1000;
  const minMs = minSec * 1000;
  const maxMs = maxSec * 1000;

  const flush = () => {
    if (!bucket.length) return;
    const first = bucket[0];
    const last = bucket[bucket.length - 1];
    scenes.push({
      sceneIndex: scenes.length + 1,
      startMs: first.startMs,
      endMs: last.endMs,
      sceneDurationMs: Math.max(0, last.endMs - first.startMs),
      cueRange: [first.index, last.index],
      text: bucket.map((cue) => cue.text).join(' ').trim(),
    });
    bucket = [];
  };

  for (const cue of cues) {
    if (bucket.length && cue.endMs - bucket[0].startMs > maxMs) flush();
    bucket.push(cue);
    const span = bucket[bucket.length - 1].endMs - bucket[0].startMs;
    if (span >= targetMs && span >= minMs) flush();
  }
  flush();
  return scenes;
}

export function buildWhiteboardPlan(text: string, timing: WhiteboardSceneTiming = {}): WhiteboardPlan {
  const cues = parseSrt(text);
  return {
    cues,
    scenes: groupWhiteboardScenes(
      cues,
      timing.targetSec ?? 30,
      timing.minSec ?? 25,
      timing.maxSec ?? 35,
    ),
  };
}

export function getWhiteboardRendererUrl(): string {
  const viteEnv = (import.meta as ImportMeta & {env?: Record<string, string | undefined>}).env;
  return (viteEnv?.VITE_WHITEBOARD_RENDERER_URL || '').replace(/\/$/, '');
}

export async function checkWhiteboardRenderer(): Promise<boolean> {
  const baseUrl = getWhiteboardRendererUrl();
  if (!baseUrl) return false;
  try {
    const response = await fetch(`${baseUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function submitWhiteboardRender(request: WhiteboardRenderRequest): Promise<WhiteboardRenderResult> {
  const baseUrl = getWhiteboardRendererUrl();
  if (!baseUrl) {
    return {
      ok: false,
      status: 'WAITING_RENDERER_URL',
      message: 'VITE_WHITEBOARD_RENDERER_URL이 설정되지 않았습니다. 외부 AI API는 필요 없지만 Python/OpenCV 렌더러 실행 주소는 필요합니다.',
    };
  }

  if (!request.sceneImages.length) {
    return {
      ok: false,
      status: 'WAITING_SCENE_IMAGES',
      message: '각 장면의 완성 그림을 넣어 주세요. 렌더러는 그림을 생성하지 않고 완성 그림에서 선과 색을 다시 그립니다.',
    };
  }

  const form = new FormData();
  form.append('srt', request.srt);
  request.sceneImages.forEach((file) => form.append('sceneImages', file, file.name));
  (request.annotations || []).forEach((file) => form.append('annotations', file, file.name));
  form.append('aspectRatio', request.aspectRatio);
  form.append('projectName', request.projectName);
  form.append('inkPath', request.inkPath);
  form.append('colorFill', request.colorFill);
  form.append('workflow', 'completed-scene-image');
  form.append('profile', request.profile || 'standard');
  form.append('narrationSync', String(request.narrationSync ?? true));
  form.append('subtitleSync', String(request.subtitleSync ?? true));
  form.append('finalHoldMs', String(request.finalHoldMs ?? 500));
  form.append('motionFx', request.motionFx || 'none');

  const response = await fetch(`${baseUrl}/render`, {method: 'POST', body: form});
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: payload.status || `HTTP_${response.status}`,
      message: payload.message || '화이트보드 렌더링 요청에 실패했습니다.',
    };
  }
  return {ok: true, ...payload};
}
