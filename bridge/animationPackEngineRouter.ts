export type AnimationEngine = 'INTERNAL' | 'LOCAL_FREE' | 'FLOW' | 'VEO' | 'UNREAL' | 'METAHUMAN' | 'PAID_API';

export interface EngineRouteContext {
  hasApprovedTemplate?: boolean;
  hasQualifiedSeed?: boolean;
  needsIdentityLock?: boolean;
  needsPreciseMotion?: boolean;
  needsPhotorealGeneration?: boolean;
  needsCinematicGeneration?: boolean;
  needsEditableRealtimeScene?: boolean;
  allowPaidApi?: boolean;
}

export interface EngineRouteDecision {
  engine: AnimationEngine;
  reason: string;
  reuseFirst: boolean;
}

export const ANIMATION_ENGINE_PRIORITY: AnimationEngine[] = [
  'INTERNAL',
  'LOCAL_FREE',
  'METAHUMAN',
  'UNREAL',
  'FLOW',
  'VEO',
  'PAID_API',
];

export function routeAnimationEngine(ctx: EngineRouteContext): EngineRouteDecision {
  if (ctx.hasApprovedTemplate || ctx.hasQualifiedSeed) {
    return { engine: 'INTERNAL', reason: 'REUSE_TEMPLATE_OR_SEED', reuseFirst: true };
  }
  if (ctx.needsIdentityLock && ctx.needsPreciseMotion) {
    return { engine: 'METAHUMAN', reason: 'IDENTITY_AND_PRECISE_MOTION', reuseFirst: false };
  }
  if (ctx.needsEditableRealtimeScene) {
    return { engine: 'UNREAL', reason: 'EDITABLE_REALTIME_SCENE', reuseFirst: false };
  }
  if (ctx.needsPhotorealGeneration || ctx.needsCinematicGeneration) {
    return { engine: ctx.needsCinematicGeneration ? 'VEO' : 'FLOW', reason: 'GENERATIVE_VIDEO_REQUIRED', reuseFirst: false };
  }
  if (ctx.allowPaidApi) {
    return { engine: 'PAID_API', reason: 'APPROVED_FALLBACK', reuseFirst: false };
  }
  return { engine: 'LOCAL_FREE', reason: 'LOW_COST_DEFAULT_FALLBACK', reuseFirst: false };
}

export const PARTIAL_RERUN_RULES = {
  preserveApprovedScenes: true,
  scope: 'ONLY_FAILED_COMPONENTS_OR_REQUESTED_SCENES',
  preferredOrder: ['VOICE', 'LIPSYNC', 'MOTION', 'CAMERA', 'FRAME', 'SCENE', 'FULL_RENDER'],
} as const;

export const ANIMATION_STATE_MACHINE_DEFAULTS = {
  states: ['IDLE', 'ENTER', 'WALK', 'TALK', 'POINT', 'INTERACT', 'EXIT'],
  requireExplicitTransitions: true,
} as const;

export const QC_SCORE_FIELDS = [
  'identity',
  'motion',
  'lipsync',
  'voice',
  'spatial',
  'camera',
  'frame',
  'continuity',
] as const;
