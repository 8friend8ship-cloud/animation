export type BridgeResponse<T = any> = {
  ok: boolean;
  action?: string;
  message?: string;
  data?: T;
  version?: string;
  at?: string;
  error?: string;
};

const DEFAULT_BRIDGE_PATH = '/api/video-agent-bridge';

export function getVideoAgentBridgeUrl() {
  const configured = (import.meta as any).env?.VITE_VIDEO_AGENT_BRIDGE_URL;
  return configured || DEFAULT_BRIDGE_PATH;
}

export async function callVideoAgentBridge<T = any>(payload: Record<string, any>): Promise<BridgeResponse<T>> {
  const url = getVideoAgentBridgeUrl();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const text = await response.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = {ok:false,error:text || 'INVALID_JSON'}; }
    if (!response.ok) throw new Error(body?.error || body?.message || `HTTP_${response.status}`);
    return body || {ok:true};
  } finally {
    window.clearTimeout(timeout);
  }
}

export function queueAppWorkflow(input: {
  appId: string;
  projectId: string;
  kind: string;
  templateCandidates: string[];
  qa?: boolean;
  writeback?: boolean;
}) {
  return callVideoAgentBridge({action:'QUEUE_APP_WORKFLOW', ...input});
}

export function queueTemplateAgent(input: {
  templateAgentId: string;
  targetApps?: string[];
  qa?: boolean;
  apiPolicy?: string;
  referenceAssetIds?: string[];
  campaignId?: string;
}) {
  return callVideoAgentBridge({action:'QUEUE_TEMPLATE_AGENT', ...input});
}

export function registerEngagementCampaign(input: {
  appId?: string;
  templateAgentId: string;
  platforms?: string[];
  triggerType?: string;
  keyword: string;
  offerName?: string;
  offerUrl: string;
  ctaText?: string;
  deliveryPolicy?: string;
  fallbackPolicy?: string;
}) {
  return callVideoAgentBridge({action:'REGISTER_ENGAGEMENT_CAMPAIGN', ...input});
}

export function getVideoAgentRuntimeStatus() {
  return callVideoAgentBridge({action:'STATUS'});
}
