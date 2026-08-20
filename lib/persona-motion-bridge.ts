export type PersonaInstance = Record<string, unknown> & {
  PERSONA_ID?: string;
  PERSONA_TEMPLATE_ID?: string;
  DRY_PERSONA_CODE?: string;
  DISPLAY_LABEL?: string;
  AGE?: number | string;
  GENDER?: string;
  FAMILY_ROLE?: string;
  LOCALE?: string;
};

export type PersonaTemplate = Record<string, unknown> & {
  PERSONA_TEMPLATE_ID?: string;
  DRY_PERSONA_CODE?: string;
  TEMPLATE_NAME?: string;
  PRIMARY_ROLE?: string;
  CORE_BELIEF?: string;
  PRIMARY_DESIRE?: string;
  PRIMARY_FEAR?: string;
};

export type DryPersonaType = Record<string, unknown> & {
  DRY_PERSONA_CODE?: string;
  TYPE_ALIAS?: string;
  JUDGMENT_START?: string;
  PLANNING_MODE?: string;
  RESOURCE_MODE?: string;
  RELATION_MODE?: string;
  CHANGE_MODE?: string;
};

export type PersonaMotionProfile = {
  DRY_PERSONA_CODE: string;
  HEAD_MOTION_SCALE: number | string;
  GESTURE_SCALE: number | string;
  BODY_MOTION_SCALE: number | string;
  EXPRESSION_INTENSITY: number | string;
  MOTION_SPEED: number | string;
  ENERGY: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  PRIMARY_MOTIONS: string;
  TRANSITION_STYLE: string;
  STATUS?: string;
};

export type PersonaVoiceSeed = Record<string, unknown> & {
  VOICE_SEED_ID?: string;
  PERSONA_ID?: string;
  LOCALE?: string;
  VOICE_PROFILE?: string;
  RATE?: number | string;
  PITCH?: number | string;
  VOLUME?: number | string;
  PAUSE_STYLE?: string;
  PRONUNCIATION_RULE?: string;
  EMOTION_RULE?: string;
  ENERGY?: string;
  STATUS?: string;
};

export type PersonaAnimationPack = {
  schema: 'PERSONA_ANIMATION_PACK_V1' | string;
  version?: string;
  locale: string;
  personaId: string;
  backdata: {
    instance: PersonaInstance;
    template: PersonaTemplate | null;
    type: DryPersonaType | null;
    join: {personaTemplateId?: string; dryPersonaCode?: string};
    source?: Record<string, unknown>;
  };
  voiceSeed: PersonaVoiceSeed | null;
  motionProfile: PersonaMotionProfile | null;
  localeMotion?: {visemeMapId?: string};
  runtime?: Record<string, unknown>;
  generatedAt?: string;
};

export type MotionCue = {
  id: string;
  startMs: number;
  endMs: number;
  motionId: string;
  intensity: number;
  transition: string;
  expression: string;
};

const num = (value: unknown, fallback = 1) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const fetchPersonaAnimationPack = async (
  webAppUrl: string,
  personaId: string,
  locale = 'ko-KR',
): Promise<PersonaAnimationPack> => {
  if (!webAppUrl) throw new Error('Language/Persona bridge URL is required.');
  if (!personaId) throw new Error('PERSONA_ID is required.');
  const url = new URL(webAppUrl);
  url.searchParams.set('action', 'personaanimation');
  url.searchParams.set('locale', locale);
  url.searchParams.set('personaId', personaId);
  const response = await fetch(url.toString(), {cache: 'no-store'});
  if (!response.ok) throw new Error(`Persona animation bridge HTTP ${response.status}`);
  const data = await response.json();
  if (data?.error) throw new Error(String(data.error));
  return data as PersonaAnimationPack;
};

export const deriveMotionProfileOffline = (type: DryPersonaType): PersonaMotionProfile => {
  const principle = type.JUDGMENT_START === '원칙기준';
  const planned = type.PLANNING_MODE === '계획통제';
  const conserve = type.RESOURCE_MODE === '절약보존';
  const individual = type.RELATION_MODE === '개인기준';
  const stable = type.CHANGE_MODE === '기존유지';
  const primary = planned
    ? ['MOTION_SPEAK_IDLE', 'MOTION_HEAD_NOD', 'MOTION_HAND_POINT']
    : ['MOTION_SPEAK_IDLE', 'MOTION_BODY_LEAN', 'MOTION_HAND_EXPLAIN', 'MOTION_HEAD_TURN'];
  if (!individual) primary.push('MOTION_ARM_SWEEP');
  return {
    DRY_PERSONA_CODE: String(type.DRY_PERSONA_CODE || 'UNKNOWN'),
    HEAD_MOTION_SCALE: principle ? 0.55 : 0.75,
    GESTURE_SCALE: individual ? 0.45 : 0.72,
    BODY_MOTION_SCALE: planned ? 0.35 : 0.62,
    EXPRESSION_INTENSITY: conserve ? 0.42 : 0.68,
    MOTION_SPEED: stable ? 0.88 : 1.12,
    ENERGY: conserve && individual ? 'LOW' : !conserve && !individual ? 'HIGH' : 'MEDIUM',
    PRIMARY_MOTIONS: primary.join('|'),
    TRANSITION_STYLE: stable ? 'MEASURED' : 'FAST_ADAPTIVE',
    STATUS: 'DERIVED_OFFLINE',
  };
};

export const normalizePersonaAnimationPack = (pack: PersonaAnimationPack): PersonaAnimationPack => {
  const motionProfile = pack.motionProfile || (pack.backdata.type ? deriveMotionProfileOffline(pack.backdata.type) : null);
  return {...pack, motionProfile};
};

export const buildMotionCues = (
  input: PersonaAnimationPack,
  durationMs = 12000,
): MotionCue[] => {
  const pack = normalizePersonaAnimationPack(input);
  const profile = pack.motionProfile;
  if (!profile) return [];
  const motions = String(profile.PRIMARY_MOTIONS || 'MOTION_SPEAK_IDLE').split('|').filter(Boolean);
  const speed = Math.max(0.65, Math.min(1.4, num(profile.MOTION_SPEED, 1)));
  const expressionIntensity = Math.max(0.2, Math.min(1, num(profile.EXPRESSION_INTENSITY, 0.5)));
  const slot = Math.max(650, Math.round(1800 / speed));
  const cues: MotionCue[] = [];
  let cursor = 0;
  let index = 0;
  while (cursor < durationMs) {
    const motionId = motions[index % motions.length];
    const endMs = Math.min(durationMs, cursor + slot);
    cues.push({
      id: `${pack.personaId}-${index + 1}`,
      startMs: cursor,
      endMs,
      motionId,
      intensity: expressionIntensity,
      transition: String(profile.TRANSITION_STYLE || 'MEASURED'),
      expression: profile.ENERGY === 'HIGH' ? 'ENGAGED' : profile.ENERGY === 'LOW' ? 'CALM_NEUTRAL' : 'EXPLAIN_CALM',
    });
    cursor = endMs;
    index += 1;
  }
  return cues;
};

export const summarizePersonaForAnimation = (pack: PersonaAnimationPack) => {
  const instance = pack.backdata.instance || {};
  const template = pack.backdata.template || {};
  const profile = normalizePersonaAnimationPack(pack).motionProfile;
  return {
    personaId: pack.personaId,
    label: String(instance.DISPLAY_LABEL || template.TEMPLATE_NAME || pack.personaId),
    age: instance.AGE ?? '',
    role: String(instance.FAMILY_ROLE || template.PRIMARY_ROLE || ''),
    locale: pack.locale,
    dryPersonaCode: String(pack.backdata.join?.dryPersonaCode || ''),
    voiceProfile: String(pack.voiceSeed?.VOICE_PROFILE || ''),
    motionEnergy: String(profile?.ENERGY || ''),
    motionSet: String(profile?.PRIMARY_MOTIONS || ''),
    visemeMapId: String(pack.localeMotion?.visemeMapId || ''),
  };
};
