export type StoryboardPatchSource = 'BOT_TEXT' | 'BOT_VOICE' | 'WHITEBOARD_SKETCH';

export interface StoryboardPatchInstruction {
  projectId: string;
  source: StoryboardPatchSource;
  sceneIds?: string[];
  instruction?: string;
  sketchDataUrl?: string;
  sketchNotes?: string;
  preserveApprovedScenes: boolean;
  requestedAt: string;
}

export interface StoryboardPatchResult {
  projectId: string;
  appliedSceneIds: string[];
  preservedSceneIds: string[];
  changes: Array<{
    sceneId: string;
    fields: string[];
    summary: string;
  }>;
  needsHumanReview: boolean;
  updatedStoryboardJson?: string;
}

export function normalizeStoryboardPatch(input: StoryboardPatchInstruction): StoryboardPatchInstruction {
  if (!input.projectId) throw new Error('PROJECT_ID_REQUIRED');
  if (!input.instruction?.trim() && !input.sketchDataUrl) throw new Error('PATCH_INPUT_REQUIRED');
  return {
    ...input,
    instruction: input.instruction?.trim(),
    preserveApprovedScenes: input.preserveApprovedScenes !== false,
    requestedAt: input.requestedAt || new Date().toISOString(),
  };
}

export const STORYBOARD_PATCH_RULES = {
  schema: 'HD_STORYBOARD_PATCH_V1',
  defaultScope: 'ONLY_FAILED_OR_REQUESTED_SCENES',
  protectApprovedScenes: true,
  supportedInputs: ['BOT_TEXT', 'BOT_VOICE', 'WHITEBOARD_SKETCH'],
  workflow: [
    'AUTO_STORYBOARD_PROPOSAL',
    'BOT_OR_WHITEBOARD_PATCH',
    'SCENE_DIFF_PREVIEW',
    'USER_APPROVAL',
    'ANIMATICS_REFRESH',
    'STORYBOARD_JSON_EXPORT'
  ]
} as const;
