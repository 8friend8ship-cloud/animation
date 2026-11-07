/** Deterministic 2D code-motion plan. No paid APIs or character-image generation. */
export type Easing = 'linear' | 'smoothstep';
export type SpriteSheet = {
  assetId: string;
  columns: number;
  rows: number;
  frameCount: number;
  framesPerSecond: number;
  loop?: 'repeat' | 'once';
};
export type MotionKeyframe = {
  atMs: number;
  x: number;
  y: number;
  scale?: number;
  rotationDeg?: number;
  opacity?: number;
  easing?: Easing;
};
export type MotionActor = {
  id: string;
  personaId?: string;
  width: number;
  height: number;
  zIndex?: number;
  sheet: SpriteSheet;
  keyframes: MotionKeyframe[];
};
export type AvoidOverlap = {
  movingActorId: string;
  obstacleActorId: string;
  axis?: 'x' | 'y' | 'auto';
  gapPx?: number;
};
export type CodeMotionScene = {
  sceneId: string;
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  actors: MotionActor[];
  avoidOverlap?: AvoidOverlap[];
};
export type PlannedLayer = {
  actorId: string;
  personaId?: string;
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number;
  opacity: number;
  zIndex: number;
  spriteColumn: number;
  spriteRow: number;
  sheetColumns: number;
  sheetRows: number;
};
export type PlannedFrame = { atMs: number; layers: PlannedLayer[]; corrections: string[] };

const finite = (n: number) => Number.isFinite(n);
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function validateCodeMotionScene(scene: CodeMotionScene): void {
  if (!scene.sceneId || !finite(scene.width) || !finite(scene.height) || scene.width <= 0 || scene.height <= 0) throw new Error('INVALID_SCENE_CANVAS');
  if (!finite(scene.fps) || scene.fps <= 0 || scene.fps > 60 || !finite(scene.durationMs) || scene.durationMs <= 0 || scene.durationMs > 60000) throw new Error('INVALID_SCENE_TIMING');
  if (scene.actors.length === 0) throw new Error('NO_ACTORS');
  const ids = new Set<string>();
  for (const a of scene.actors) {
    if (!a.id || ids.has(a.id)) throw new Error('DUPLICATE_OR_EMPTY_ACTOR_ID');
    ids.add(a.id);
    const s = a.sheet;
    if (!s.assetId || !Number.isInteger(s.columns) || !Number.isInteger(s.rows) || !Number.isInteger(s.frameCount) || s.columns < 1 || s.rows < 1 || s.frameCount < 1 || s.frameCount > s.columns * s.rows || !finite(s.framesPerSecond) || s.framesPerSecond <= 0) throw new Error(`INVALID_SPRITESHEET:${a.id}`);
    if (!finite(a.width) || !finite(a.height) || a.width <= 0 || a.height <= 0 || a.keyframes.length === 0) throw new Error(`INVALID_ACTOR:${a.id}`);
    let previous = -1;
    for (const k of a.keyframes) {
      if (!finite(k.atMs) || k.atMs < 0 || k.atMs > scene.durationMs || k.atMs <= previous || !finite(k.x) || !finite(k.y) || (k.scale !== undefined && (!finite(k.scale) || k.scale <= 0)) || (k.opacity !== undefined && (!finite(k.opacity) || k.opacity < 0 || k.opacity > 1)) || (k.rotationDeg !== undefined && !finite(k.rotationDeg))) throw new Error(`INVALID_KEYFRAME:${a.id}`);
      previous = k.atMs;
    }
  }
  for (const r of scene.avoidOverlap || []) {
    if (!ids.has(r.movingActorId) || !ids.has(r.obstacleActorId) || r.movingActorId === r.obstacleActorId || (r.gapPx !== undefined && (!finite(r.gapPx) || r.gapPx < 0))) throw new Error('INVALID_AVOID_OVERLAP_RULE');
  }
}

function sampleActor(actor: MotionActor, atMs: number): PlannedLayer {
  const keys = actor.keyframes;
  let from = keys[0];
  let to = keys[keys.length - 1];
  if (atMs <= from.atMs) to = from;
  else if (atMs >= to.atMs) from = to;
  else for (let i = 1; i < keys.length; i++) if (atMs <= keys[i].atMs) { from = keys[i-1]; to = keys[i]; break; }
  const t = from === to ? 0 : clamp((atMs - from.atMs) / (to.atMs - from.atMs), 0, 1);
  const p = to.easing === 'smoothstep' ? t * t * (3 - 2 * t) : t;
  const lerp = (a: number, b: number) => a + (b - a) * p;
  const scale = lerp(from.scale ?? 1, to.scale ?? 1);
  const spriteIndexRaw = Math.floor((atMs / 1000) * actor.sheet.framesPerSecond);
  const spriteIndex = actor.sheet.loop === 'once'
    ? Math.min(actor.sheet.frameCount - 1, spriteIndexRaw)
    : spriteIndexRaw % actor.sheet.frameCount;
  return {
    actorId: actor.id, personaId: actor.personaId, assetId: actor.sheet.assetId,
    x: lerp(from.x, to.x), y: lerp(from.y, to.y),
    width: actor.width * scale, height: actor.height * scale,
    rotationDeg: lerp(from.rotationDeg ?? 0, to.rotationDeg ?? 0),
    opacity: lerp(from.opacity ?? 1, to.opacity ?? 1), zIndex: actor.zIndex ?? 0,
    spriteColumn: spriteIndex % actor.sheet.columns,
    spriteRow: Math.floor(spriteIndex / actor.sheet.columns),
    sheetColumns: actor.sheet.columns, sheetRows: actor.sheet.rows,
  };
}

/** Axis-aligned bounds: rotation is visual only. Collision rules are opt-in. */
function resolveOverlap(moving: PlannedLayer, obstacle: PlannedLayer, axis: 'x' | 'y' | 'auto', gap: number): boolean {
  if (moving.x + moving.width <= obstacle.x - gap || obstacle.x + obstacle.width <= moving.x - gap || moving.y + moving.height <= obstacle.y - gap || obstacle.y + obstacle.height <= moving.y - gap) return false;
  const left = obstacle.x - gap - (moving.x + moving.width);
  const right = obstacle.x + obstacle.width + gap - moving.x;
  const up = obstacle.y - gap - (moving.y + moving.height);
  const down = obstacle.y + obstacle.height + gap - moving.y;
  const dx = Math.abs(left) <= Math.abs(right) ? left : right;
  const dy = Math.abs(up) <= Math.abs(down) ? up : down;
  if (axis === 'x' || (axis === 'auto' && Math.abs(dx) <= Math.abs(dy))) moving.x += dx;
  else moving.y += dy;
  return true;
}

export function sampleCodeMotionFrame(scene: CodeMotionScene, atMs: number): PlannedFrame {
  validateCodeMotionScene(scene);
  if (!finite(atMs) || atMs < 0 || atMs > scene.durationMs) throw new Error('INVALID_SAMPLE_TIME');
  const layers = scene.actors.map(a => sampleActor(a, atMs));
  const byId = new Map(layers.map(l => [l.actorId, l]));
  const corrections: string[] = [];
  for (const rule of scene.avoidOverlap || []) {
    if (resolveOverlap(byId.get(rule.movingActorId)!, byId.get(rule.obstacleActorId)!, rule.axis ?? 'auto', rule.gapPx ?? 0)) corrections.push(`${rule.movingActorId}:${rule.obstacleActorId}`);
  }
  layers.sort((a, b) => a.zIndex - b.zIndex);
  return { atMs, layers, corrections };
}

export function buildCodeMotionPlan(scene: CodeMotionScene): PlannedFrame[] {
  validateCodeMotionScene(scene);
  return Array.from({ length: Math.ceil(scene.durationMs * scene.fps / 1000) }, (_, i) => sampleCodeMotionFrame(scene, i * 1000 / scene.fps));
}

/** Render one planned frame using already-approved, already-loaded sprite atlases. */
export function drawCodeMotionFrame(ctx: CanvasRenderingContext2D, frame: PlannedFrame, assets: Record<string, HTMLImageElement>): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const layer of frame.layers) {
    const img = assets[layer.assetId];
    if (!img?.complete || !img.naturalWidth || !img.naturalHeight) throw new Error(`ASSET_NOT_LOADED:${layer.assetId}`);
    const cellW = img.naturalWidth / layer.sheetColumns;
    const cellH = img.naturalHeight / layer.sheetRows;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
    ctx.rotate(layer.rotationDeg * Math.PI / 180);
    ctx.drawImage(img, layer.spriteColumn * cellW, layer.spriteRow * cellH, cellW, cellH, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
    ctx.restore();
  }
}
