export const DRYWRITER_WHITEBOARD_PRESET = {
  id: 'drywriter',
  label: '건조한작가',
  description: '상황·대화·갈등 중심의 건조한작가 원고를 음성·자막과 함께 차분한 손그림 설명 영상으로 연출합니다.',
  sceneTiming: {
    targetSec: 24,
    minSec: 18,
    maxSec: 30,
  },
  inkPath: 'skeleton' as const,
  colorFill: 'contour-wipe' as const,
  finalHoldMs: 800,
  motionFx: 'subtle-pan-zoom' as const,
  narrationSync: true,
  subtitleSync: true,
  visualRules: [
    '한 장면에 핵심 사건 1개',
    '3~6개 요소를 음성 순서대로 그리기',
    '인물 표정과 관계는 완성 그림에 포함하고 객체 애니메이션은 만들지 않기',
    '강조 요소만 제한적으로 색을 채우기',
    '완성 후 0.8초 유지하고 다음 장면으로 전환',
    '카메라 효과는 약한 pan/zoom만 사용',
  ],
} as const;

export type WhiteboardPresetId = 'standard' | 'drywriter';
