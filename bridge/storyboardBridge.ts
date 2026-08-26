export const STORYBOARD_BRIDGE_SCHEMA = 'HD_STORYBOARD_BRIDGE_V1' as const;

export interface StoryboardBridgeScene {
  id: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  narrationText: string;
  styleId: string;
  narrationMode: 'LIPSYNC' | 'TTS_GESTURE' | 'TTS_IMAGE_EXPLAINER' | 'STOCK_TTS';
  visualIntent: string;
  camera?: string;
  motionIntent?: string;
  dialogue?: string;
  sfx?: string[];
  bgmCue?: string;
  imagePrompt?: string;
  flowPrompt?: string;
  assetRefs?: string[];
  personaRefs?: string[];
  startFrameRef?: string;
  endFrameRef?: string;
  approved: boolean;
  revision?: number;
}

export interface StoryboardBridgeDocument {
  schema: typeof STORYBOARD_BRIDGE_SCHEMA;
  version: '1.0.0';
  sourceApp: 'ANIMATION_STUDIO';
  targetApps: string[];
  bridgeMode: 'OPTIONAL_HANDOFF';
  projectId: string;
  projectName: string;
  createdAt: string;
  approvedAt?: string;
  approvalState: 'DRAFT' | 'REVIEW' | 'APPROVED';
  language: string;
  synopsis: string;
  fullScript: string;
  tts?: { audioRef?: string; estimatedDurationSec?: number; voiceId?: string; };
  styleTemplateId?: string;
  personaRefs?: string[];
  assetRefs?: string[];
  scenes: StoryboardBridgeScene[];
  metadata?: Record<string, unknown>;
}

export function buildStoryboardBridgeDocument(input: Omit<StoryboardBridgeDocument, 'schema' | 'version' | 'sourceApp' | 'targetApps' | 'bridgeMode' | 'createdAt'>): StoryboardBridgeDocument {
  return {
    schema: STORYBOARD_BRIDGE_SCHEMA,
    version: '1.0.0',
    sourceApp: 'ANIMATION_STUDIO',
    targetApps: ['VTUBE'],
    bridgeMode: 'OPTIONAL_HANDOFF',
    createdAt: new Date().toISOString(),
    ...input,
  };
}

export function validateStoryboardBridgeForExport(doc: StoryboardBridgeDocument): string[] {
  const errors: string[] = [];
  if (doc.schema !== STORYBOARD_BRIDGE_SCHEMA) errors.push('invalid schema');
  if (!doc.projectId) errors.push('projectId required');
  if (!doc.fullScript?.trim()) errors.push('fullScript required');
  if (!doc.scenes?.length) errors.push('at least one scene required');
  doc.scenes?.forEach((scene, index) => {
    if (scene.id == null) errors.push(`scene[${index}].id required`);
    if (scene.endSec <= scene.startSec) errors.push(`scene[${index}] invalid timing`);
    if (!scene.narrationText?.trim()) errors.push(`scene[${index}].narrationText required`);
  });
  return errors;
}

export function downloadStoryboardBridgeJson(doc: StoryboardBridgeDocument): void {
  const errors = validateStoryboardBridgeForExport(doc);
  if (errors.length) throw new Error(`Storyboard bridge export blocked: ${errors.join(', ')}`);
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${doc.projectId}.storyboard.v1.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
