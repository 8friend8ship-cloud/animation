// VideoAgentDispatcher.gs
// Shared request router for Workflow Shell + per-template Video Agent Hub.
// This file intentionally does NOT define doPost(e). It is meant to be called
// from the existing canonical Apps Script web-app router after PRE_CHECK, so we
// do not create a competing deployment or break an already verified endpoint.

const VIDEO_AGENT_DISPATCHER = Object.freeze({
  VERSION: 'VIDEO_AGENT_DISPATCHER_V2_20260823',
  DATAHUB_ID: PropertiesService.getScriptProperties().getProperty('CENTRAL_DATAHUB_ID') || '',
  SHEETS: {
    TASKS: 'TASK_QUEUE',
    BRIDGE: 'BRIDGE_TASKS',
    AGENTS: 'VIDEO_TEMPLATE_AGENTS',
    CAMPAIGNS: 'ENGAGEMENT_CAMPAIGNS',
    EVENTS: 'ENGAGEMENT_EVENTS',
    WORKFLOW: 'VIDEO_WORKFLOW_MAP',
    ASSETS: 'ASSET_INDEX'
  },
  ACTIONS: [
    'STATUS',
    'QUEUE_APP_WORKFLOW',
    'QUEUE_TEMPLATE_AGENT',
    'REGISTER_ENGAGEMENT_CAMPAIGN',
    'INGEST_ENGAGEMENT_EVENT',
    'PROCESS_VIDEO_PROMO_QUEUE',
    'PROCESS_ENGAGEMENT_EVENTS'
  ]
});

function handleVideoAgentRequest(input) {
  input = input || {};
  const action = String(input.action || 'STATUS').trim().toUpperCase();
  if (VIDEO_AGENT_DISPATCHER.ACTIONS.indexOf(action) < 0) {
    return vadResult_(false, action, null, 'UNSUPPORTED_ACTION');
  }

  try {
    switch (action) {
      case 'STATUS':
        return vadResult_(true, action, getVideoAgentDispatcherStatus(), 'OK');
      case 'QUEUE_APP_WORKFLOW':
        return vadResult_(true, action, vadQueueAppWorkflow_(input), 'QUEUED');
      case 'QUEUE_TEMPLATE_AGENT':
        return vadResult_(true, action, vadQueueTemplateAgent_(input), 'QUEUED');
      case 'REGISTER_ENGAGEMENT_CAMPAIGN':
        if (typeof registerEngagementCampaign !== 'function') throw new Error('registerEngagementCampaign is not loaded');
        return vadResult_(true, action, registerEngagementCampaign(input), 'REGISTERED');
      case 'INGEST_ENGAGEMENT_EVENT':
        if (typeof ingestEngagementEvent !== 'function') throw new Error('ingestEngagementEvent is not loaded');
        return vadResult_(true, action, ingestEngagementEvent(input), 'INGESTED');
      case 'PROCESS_VIDEO_PROMO_QUEUE':
        if (typeof processVideoPromoQueue !== 'function') throw new Error('processVideoPromoQueue is not loaded');
        return vadResult_(true, action, processVideoPromoQueue(), 'PROCESSED');
      case 'PROCESS_ENGAGEMENT_EVENTS':
        if (typeof processEngagementEvents !== 'function') throw new Error('processEngagementEvents is not loaded');
        return vadResult_(true, action, processEngagementEvents(), 'PROCESSED');
    }
  } catch (err) {
    vadWriteAuditBridgeEvent_(action, input, 'ERROR', String(err && err.stack || err));
    return vadResult_(false, action, null, String(err && err.message || err));
  }
}

function getVideoAgentDispatcherStatus() {
  const ss = vadDataHub_();
  const sheets = {};
  Object.keys(VIDEO_AGENT_DISPATCHER.SHEETS).forEach(k => {
    const name = VIDEO_AGENT_DISPATCHER.SHEETS[k];
    sheets[name] = !!ss.getSheetByName(name);
  });
  const taskHeader = vadFindHeader_(ss.getSheetByName(VIDEO_AGENT_DISPATCHER.SHEETS.TASKS), ['TASK_ID','PROJECT_ID','TITLE','TASK_TYPE']);
  const bridgeHeader = vadFindHeader_(ss.getSheetByName(VIDEO_AGENT_DISPATCHER.SHEETS.BRIDGE), ['TASK_ID','TARGET','ACTION','PAYLOAD_JSON']);
  return {
    ok: true,
    version: VIDEO_AGENT_DISPATCHER.VERSION,
    spreadsheetId: ss.getId(),
    sheets,
    headers: {
      taskQueue: taskHeader ? {row: taskHeader.row, values: taskHeader.values} : null,
      bridgeTasks: bridgeHeader ? {row: bridgeHeader.row, values: bridgeHeader.values} : null
    },
    functions: {
      videoPromo: typeof processVideoPromoQueue === 'function',
      engagement: typeof processEngagementEvents === 'function',
      campaignRegistration: typeof registerEngagementCampaign === 'function'
    },
    supportedActions: VIDEO_AGENT_DISPATCHER.ACTIONS.slice()
  };
}

function vadQueueAppWorkflow_(input) {
  const appId = vadRequired_(input.appId, 'appId');
  const projectId = String(input.projectId || 'PRJ-UNKNOWN');
  const kind = String(input.kind || 'FULL_E2E');
  const templates = vadCsv_(input.templateCandidates || []);
  const taskId = input.taskId || ('TASK-VIDEO-APP-' + Utilities.getUuid());
  const now = new Date();
  const payload = {
    taskId,
    appId,
    projectId,
    kind,
    templateCandidates: vadArray_(input.templateCandidates),
    qa: input.qa !== false,
    writeback: input.writeback !== false,
    requestedAt: now.toISOString(),
    lineage: {queens:'AUTO', seed:'AUTO', t1:'AUTO', t2:'APP_ADAPTER', final:'VIDEO_AGENT'}
  };

  vadAppendByHeader_(VIDEO_AGENT_DISPATCHER.SHEETS.TASKS, {
    TASK_ID: taskId,
    PROJECT_ID: projectId,
    TITLE: appId + ' 영상/워크플로우 자동 실행',
    TASK_TYPE: 'APP_WORKFLOW_VIDEO_AGENT',
    PRIORITY: input.priority || 'HIGH',
    STATUS: 'READY_TO_EXECUTE',
    OWNER: 'CENTRAL_AGENT',
    DUE_DATE: '',
    OUTPUT: 'Workflow Shell → Template Router → Video Agent → QA/Publish/Writeback',
    NEXT_ACTION: 'Dispatch ' + kind + (templates ? ' using ' + templates : ''),
    SOURCE_REF: input.source || 'WORKFLOW_SHELL',
    UPDATED_AT: now
  }, ['TASK_ID','PROJECT_ID','TITLE','TASK_TYPE']);

  const bridgeTaskId = vadAppendBridgeTask_('APP_WORKFLOW_DISPATCH', payload, 'READY', input.priority || 'HIGH');
  vadWriteAuditBridgeEvent_('QUEUE_APP_WORKFLOW', payload, 'QUEUED', bridgeTaskId);
  return {ok:true, taskId, bridgeTaskId, appId, projectId, kind, templates:vadArray_(input.templateCandidates)};
}

function vadQueueTemplateAgent_(input) {
  const templateAgentId = vadRequired_(input.templateAgentId, 'templateAgentId');
  const taskId = input.taskId || ('TASK-VIDEO-AGENT-' + Utilities.getUuid());
  const now = new Date();
  const payload = {
    taskId,
    templateAgentId,
    targetApps: vadArray_(input.targetApps || ['ALL_FRONT_APPS']),
    qa: input.qa !== false,
    apiPolicy: input.apiPolicy || 'API_FREE_FIRST',
    referenceAssetIds: vadArray_(input.referenceAssetIds || []),
    campaignId: input.campaignId || '',
    requestedAt: now.toISOString()
  };

  const bridgeTaskId = vadAppendBridgeTask_('VIDEO_TEMPLATE_AGENT_RUN', payload, 'READY', input.priority || 'HIGH');
  vadAppendByHeader_(VIDEO_AGENT_DISPATCHER.SHEETS.TASKS, {
    TASK_ID: taskId,
    PROJECT_ID: 'PRJ-CONTENT-OS / VIDEO-ANIMATION',
    TITLE: templateAgentId + ' 전용 Video Agent 실행',
    TASK_TYPE: 'VIDEO_TEMPLATE_AGENT_RUN',
    PRIORITY: input.priority || 'HIGH',
    STATUS: 'READY_TO_EXECUTE',
    OWNER: 'CENTRAL_AGENT',
    DUE_DATE: '',
    OUTPUT: 'Queens→Seed→T1→T2→Render→QA→Publish→Learning',
    NEXT_ACTION: 'Process bridge task ' + bridgeTaskId,
    SOURCE_REF: input.source || 'VIDEO_TEMPLATE_AGENT_HUB',
    UPDATED_AT: now
  }, ['TASK_ID','PROJECT_ID','TITLE','TASK_TYPE']);
  vadWriteAuditBridgeEvent_('QUEUE_TEMPLATE_AGENT', payload, 'QUEUED', bridgeTaskId);
  return {ok:true, taskId, bridgeTaskId, templateAgentId};
}

function vadAppendBridgeTask_(action, payload, status, priority) {
  const taskId = 'BRIDGE-VIDEO-' + Utilities.getUuid();
  vadAppendByHeader_(VIDEO_AGENT_DISPATCHER.SHEETS.BRIDGE, {
    TASK_ID: taskId,
    TARGET: 'VIDEO_AGENT',
    ACTION: action,
    PAYLOAD_JSON: JSON.stringify(payload),
    STATUS: status || 'READY',
    PRIORITY: priority || 'HIGH',
    RUNNER_ID: '',
    CLAIMED_AT: '',
    UPDATED_AT: new Date(),
    RESULT_JSON: '',
    ERROR: ''
  }, ['TASK_ID','TARGET','ACTION','PAYLOAD_JSON']);
  return taskId;
}

/**
 * Appends by canonical header names and auto-detects the header row.
 * DataHub TASK_QUEUE currently has its real headers on row 4 while most newer
 * tables have them on row 1, so assuming row 1 is unsafe.
 */
function vadAppendByHeader_(sheetName, record, requiredHeaders) {
  const ss = vadDataHub_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Missing canonical sheet: ' + sheetName);
  const headerInfo = vadFindHeader_(sheet, requiredHeaders || Object.keys(record).slice(0, 1));
  if (!headerInfo) throw new Error('Canonical headers not found: ' + sheetName);
  const row = headerInfo.values.map(h => {
    const key = String(h).trim();
    return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : '';
  });
  const targetRow = Math.max(sheet.getLastRow() + 1, headerInfo.row + 1);
  sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  return targetRow;
}

function vadFindHeader_(sheet, requiredHeaders) {
  if (!sheet) return null;
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const scanRows = Math.min(Math.max(sheet.getLastRow(), 1), 10);
  const values = sheet.getRange(1, 1, scanRows, lastCol).getValues();
  const required = (requiredHeaders || []).map(v => String(v).trim());
  for (let r = 0; r < values.length; r++) {
    const normalized = values[r].map(v => String(v).trim());
    const nonEmpty = normalized.filter(Boolean);
    if (!nonEmpty.length) continue;
    const ok = required.every(h => normalized.indexOf(h) >= 0);
    if (ok) return {row:r + 1, values:values[r]};
  }
  return null;
}

function vadWriteAuditBridgeEvent_(action, payload, status, note) {
  try {
    const ss = vadDataHub_();
    const sheet = ss.getSheetByName('BRIDGE_EVENTS');
    if (!sheet) return;
    const headerInfo = vadFindHeader_(sheet, ['TIMESTAMP','TYPE','RUNNER_ID','TASK_ID','DETAIL']);
    if (!headerInfo) return;
    const taskId = payload && (payload.taskId || payload.eventId || payload.campaignId) || '';
    const record = {
      TIMESTAMP: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss z'),
      TYPE: 'VIDEO_AGENT_' + status + '_' + action,
      RUNNER_ID: 'APPS_SCRIPT_VIDEO_AGENT',
      TASK_ID: taskId,
      DETAIL: JSON.stringify({payload:vadSanitizeForAudit_(payload), note:note || ''})
    };
    const row = headerInfo.values.map(h => Object.prototype.hasOwnProperty.call(record, String(h).trim()) ? record[String(h).trim()] : '');
    const targetRow = Math.max(sheet.getLastRow() + 1, headerInfo.row + 1);
    sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  } catch (_) {
    // Audit must never break the primary queue path.
  }
}

function vadSanitizeForAudit_(value) {
  if (!value || typeof value !== 'object') return value;
  const clone = JSON.parse(JSON.stringify(value));
  ['apiKey','api_key','token','secret','password','authorization','cookie','accessToken','refreshToken'].forEach(k => {
    if (Object.prototype.hasOwnProperty.call(clone, k)) clone[k] = '[REDACTED]';
  });
  return clone;
}

function vadDataHub_() {
  if (!VIDEO_AGENT_DISPATCHER.DATAHUB_ID) throw new Error('Set Script Property CENTRAL_DATAHUB_ID');
  return SpreadsheetApp.openById(VIDEO_AGENT_DISPATCHER.DATAHUB_ID);
}

function vadRequired_(value, name) {
  const out = String(value == null ? '' : value).trim();
  if (!out) throw new Error('Missing required field: ' + name);
  return out;
}

function vadArray_(value) {
  if (Array.isArray(value)) return value.map(v => String(v)).filter(Boolean);
  if (value == null || value === '') return [];
  return String(value).split(',').map(v => v.trim()).filter(Boolean);
}

function vadCsv_(value) { return vadArray_(value).join(','); }

function vadResult_(ok, action, data, message) {
  return {ok:!!ok, action:action || '', message:message || '', data:data || null, version:VIDEO_AGENT_DISPATCHER.VERSION, at:new Date().toISOString()};
}
