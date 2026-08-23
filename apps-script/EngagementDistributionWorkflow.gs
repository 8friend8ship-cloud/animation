// EngagementDistributionWorkflow.gs
// Comment/reply participation -> offer delivery router.
// Policy: official platform APIs only; no scraping/bot-DM bypass. Unsupported capabilities fall back to public reply/landing page/manual queue.

const ENGAGEMENT_AGENT = Object.freeze({
  DATAHUB_ID: PropertiesService.getScriptProperties().getProperty('CENTRAL_DATAHUB_ID') || '',
  CAMPAIGN_SHEET: 'ENGAGEMENT_CAMPAIGNS',
  EVENT_SHEET: 'ENGAGEMENT_EVENTS',
  TASK_SHEET: 'BRIDGE_TASKS',
  VERSION: 'ENGAGEMENT_AGENT_V1_20260823'
});

function setupEngagementDistributionWorkflow() {
  const ss = getEngagementDataHub_();
  ensureEngagementSheet_(ss, ENGAGEMENT_AGENT.CAMPAIGN_SHEET, [
    'CAMPAIGN_ID','APP_ID','TEMPLATE_AGENT_ID','PLATFORMS','TRIGGER_TYPE','KEYWORD','OFFER_NAME','OFFER_URL','CTA_TEXT','DELIVERY_POLICY','FALLBACK_POLICY','STATUS','CREATED_AT','UPDATED_AT'
  ]);
  ensureEngagementSheet_(ss, ENGAGEMENT_AGENT.EVENT_SHEET, [
    'EVENT_ID','CAMPAIGN_ID','PLATFORM','CONTENT_ID','USER_REF','EVENT_TYPE','TEXT','MATCHED','DELIVERY_MODE','STATUS','RESULT','CREATED_AT','UPDATED_AT'
  ]);
  ensureEngagementTrigger_();
  return getEngagementDistributionStatus();
}

function getEngagementDistributionStatus() {
  const ss = getEngagementDataHub_();
  return {
    ok: true,
    version: ENGAGEMENT_AGENT.VERSION,
    campaignSheet: !!ss.getSheetByName(ENGAGEMENT_AGENT.CAMPAIGN_SHEET),
    eventSheet: !!ss.getSheetByName(ENGAGEMENT_AGENT.EVENT_SHEET),
    triggers: ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'processEngagementEvents').map(t => ({handler:t.getHandlerFunction(),type:String(t.getEventType())}))
  };
}

function registerEngagementCampaign(input) {
  input = input || {};
  const ss = getEngagementDataHub_();
  const sheet = ss.getSheetByName(ENGAGEMENT_AGENT.CAMPAIGN_SHEET);
  if (!sheet) throw new Error('Run setupEngagementDistributionWorkflow first');
  const now = new Date();
  const id = input.campaignId || ('CMP-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss'));
  sheet.appendRow([
    id,
    input.appId || 'ALL_FRONT_APPS',
    input.templateAgentId || 'AGENT_DASHBOARD_PROMO',
    toCsvEng_(input.platforms || ['Instagram','Facebook','YouTube','TikTok','Threads']),
    input.triggerType || 'COMMENT_KEYWORD',
    String(input.keyword || '무료앱').trim(),
    input.offerName || 'FREE_APP_OR_RESOURCE',
    input.offerUrl || '',
    input.ctaText || '댓글에 키워드를 남기면 무료 링크를 보내드립니다.',
    input.deliveryPolicy || 'OFFICIAL_API_ONLY',
    input.fallbackPolicy || 'PUBLIC_REPLY_OR_LANDING_LINK',
    input.status || 'ACTIVE',
    now, now
  ]);
  return {ok:true,campaignId:id};
}

function ingestEngagementEvent(event) {
  event = event || {};
  const ss = getEngagementDataHub_();
  const sheet = ss.getSheetByName(ENGAGEMENT_AGENT.EVENT_SHEET);
  if (!sheet) throw new Error('Run setupEngagementDistributionWorkflow first');
  const id = event.eventId || ('EVT-' + Utilities.getUuid());
  sheet.appendRow([
    id,event.campaignId || '',event.platform || '',event.contentId || '',event.userRef || '',event.eventType || 'COMMENT',event.text || '',false,'','READY','',new Date(),new Date()
  ]);
  return {ok:true,eventId:id};
}

function processEngagementEvents() {
  const ss = getEngagementDataHub_();
  const events = ss.getSheetByName(ENGAGEMENT_AGENT.EVENT_SHEET);
  const campaigns = ss.getSheetByName(ENGAGEMENT_AGENT.CAMPAIGN_SHEET);
  if (!events || !campaigns) throw new Error('Missing engagement sheets');
  const ev = events.getDataRange().getValues();
  const cp = campaigns.getDataRange().getValues();
  if (ev.length < 2 || cp.length < 2) return {ok:true,processed:0};
  const eh = headerMapEng_(ev[0]);
  const ch = headerMapEng_(cp[0]);
  const campaignMap = {};
  for (let i=1;i<cp.length;i++) campaignMap[String(cp[i][ch.CAMPAIGN_ID])] = cp[i];
  let processed = 0;
  for (let r=1;r<ev.length;r++) {
    if (String(ev[r][eh.STATUS]) !== 'READY') continue;
    const campaign = campaignMap[String(ev[r][eh.CAMPAIGN_ID])];
    if (!campaign || String(campaign[ch.STATUS]) !== 'ACTIVE') {
      events.getRange(r+1, eh.STATUS+1).setValue('NO_ACTIVE_CAMPAIGN');
      continue;
    }
    const keyword = String(campaign[ch.KEYWORD] || '').trim().toLowerCase();
    const text = String(ev[r][eh.TEXT] || '').toLowerCase();
    const matched = !!keyword && text.indexOf(keyword) !== -1;
    events.getRange(r+1, eh.MATCHED+1).setValue(matched);
    if (!matched) { events.getRange(r+1, eh.STATUS+1).setValue('IGNORED'); continue; }
    const platform = String(ev[r][eh.PLATFORM] || '');
    const route = resolveEngagementDeliveryRoute_(platform, campaign[ch.DELIVERY_POLICY], campaign[ch.FALLBACK_POLICY]);
    events.getRange(r+1, eh.DELIVERY_MODE+1).setValue(route.mode);
    const payload = {
      eventId: ev[r][eh.EVENT_ID], campaignId: ev[r][eh.CAMPAIGN_ID], platform,
      contentId: ev[r][eh.CONTENT_ID], userRef: ev[r][eh.USER_REF],
      offerName: campaign[ch.OFFER_NAME], offerUrl: campaign[ch.OFFER_URL],
      ctaText: campaign[ch.CTA_TEXT], mode: route.mode, policy: 'OFFICIAL_API_ONLY'
    };
    enqueueEngagementBridgeTask_(route.action, payload, route.requiresApproval ? 'WAITING_CAPABILITY_OR_APPROVAL' : 'READY');
    events.getRange(r+1, eh.STATUS+1).setValue('ROUTED');
    events.getRange(r+1, eh.RESULT+1).setValue(JSON.stringify(route));
    events.getRange(r+1, eh.UPDATED_AT+1).setValue(new Date());
    processed++;
  }
  return {ok:true,processed};
}

function resolveEngagementDeliveryRoute_(platform, deliveryPolicy, fallbackPolicy) {
  // Capability is intentionally conservative. Runtime connector can upgrade mode only after current official API permission readback.
  const p = String(platform || '').toUpperCase();
  const base = {requiresApproval:false};
  if (p === 'YOUTUBE') return Object.assign(base,{mode:'PUBLIC_COMMENT_REPLY_WITH_LANDING_LINK',action:'PLATFORM_PUBLIC_REPLY'});
  if (p === 'INSTAGRAM' || p === 'FACEBOOK') return Object.assign(base,{mode:'OFFICIAL_MESSAGING_CAPABILITY_CHECK',action:'PLATFORM_DM_OR_PRIVATE_REPLY',requiresApproval:true});
  if (p === 'TIKTOK' || p === 'THREADS') return Object.assign(base,{mode:'OFFICIAL_CAPABILITY_CHECK_THEN_FALLBACK',action:'PLATFORM_CAPABILITY_ROUTE',requiresApproval:true});
  return Object.assign(base,{mode:String(fallbackPolicy || 'PUBLIC_REPLY_OR_LANDING_LINK'),action:'PLATFORM_FALLBACK_REPLY',requiresApproval:true});
}

function enqueueEngagementBridgeTask_(action, payload, status) {
  const ss = getEngagementDataHub_();
  const sheet = ss.getSheetByName(ENGAGEMENT_AGENT.TASK_SHEET);
  if (!sheet) throw new Error('Missing BRIDGE_TASKS');
  const taskId = 'BRIDGE-ENG-' + Utilities.getUuid();
  sheet.appendRow([taskId,'ENGAGEMENT_DISTRIBUTION',action,JSON.stringify(payload),status || 'READY','HIGH','', '',new Date(),'', '']);
  return taskId;
}

function ensureEngagementTrigger_() {
  const handler = 'processEngagementEvents';
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === handler)) {
    ScriptApp.newTrigger(handler).timeBased().everyMinutes(10).create();
  }
}

function ensureEngagementSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1,1,1,headers.length).setValues([headers]);
  return sheet;
}

function getEngagementDataHub_() {
  if (!ENGAGEMENT_AGENT.DATAHUB_ID) throw new Error('Set Script Property CENTRAL_DATAHUB_ID');
  return SpreadsheetApp.openById(ENGAGEMENT_AGENT.DATAHUB_ID);
}

function headerMapEng_(row) { return row.reduce((o,v,i)=>{o[String(v).trim()]=i; return o;},{}); }
function toCsvEng_(v) { return Array.isArray(v) ? v.join(',') : String(v == null ? '' : v); }
