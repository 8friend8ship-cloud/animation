export type LumiFaceMode = 'idle' | 'listening' | 'thinking' | 'speaking';

export type LumiMouthShape =
  | 'closed'
  | 'small_open'
  | 'medium_open'
  | 'wide_open'
  | 'smile_open'
  | 'round_o'
  | 'narrow_e'
  | 'rest_transition';

export const LUMI_FACE_MOTION_V1 = {
  smoothingMs: 70,
  coarticulationMs: 90,
  idleMouth: 'smile_open' as LumiMouthShape,
  listeningMouth: 'small_open' as LumiMouthShape,
  speakingSequence: [
    'small_open',
    'medium_open',
    'round_o',
    'narrow_e',
    'wide_open',
    'smile_open',
    'medium_open',
    'rest_transition',
  ] as LumiMouthShape[],
};

export function mouthStyle(shape: LumiMouthShape): Record<string, string | number> {
  const base = {
    transition: 'width 70ms linear, height 70ms linear, border-radius 70ms linear, transform 70ms linear',
  };
  switch (shape) {
    case 'closed': return { ...base, width: 52, height: 5, borderRadius: 12 };
    case 'small_open': return { ...base, width: 34, height: 16, borderRadius: '50%' };
    case 'medium_open': return { ...base, width: 40, height: 28, borderRadius: '50%' };
    case 'wide_open': return { ...base, width: 46, height: 40, borderRadius: '48%' };
    case 'round_o': return { ...base, width: 31, height: 37, borderRadius: '50%' };
    case 'narrow_e': return { ...base, width: 48, height: 17, borderRadius: '45%' };
    case 'rest_transition': return { ...base, width: 42, height: 10, borderRadius: '50%' };
    case 'smile_open':
    default:
      return { ...base, width: 48, height: 20, borderRadius: '0 0 50% 50%', transform: 'translateY(-1px)' };
  }
}
