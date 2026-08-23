// VideoPromoWorkflow.gs
// Central video-reference -> Queens -> Seed -> T1 -> T2 -> front-app promo workflow.
// Canonical policy: SIMPLE_FIRST, API_FREE first, bridge only on capability/quality gap.

const VIDEO_PROMO = Object.freeze({
  DATAHUB_ID: PropertiesService.getScriptProperties().getProperty('CENTRAL_DATAHUB_ID') || '',
  SHEETS: {
    MIRROR: 'LIBRARY_DRIVE_MIRROR',
    SCHEMA: 'MEDIA_QUEENS_SEED_SCHEMA',
    MAP: 'VIDEO_WORKFLOW_MAP',
    ASSETS: 'ASSET_INDEX',
    TASKS: 'TASK_QUEUE',
    BRIDGE: 'BRIDGE_TASKS'
  },
  TEMPLATE_VERSION: 'VIDEO_PROMO_V1_20260823',
  COMPLEXITY_ORDER: ['SIMPLE', 'PRESENTER', 'DEMO', 'UGC', 'ANIMATION', 'CINEMATIC']
});

function setupVideoPromoWorkflow() {
  const ss = getVideoPromoDataHub_();
  ensureVideoPromoHeaders_(ss);
  ensureVideoPromoTrigger_();
  return getVideoPromoStatus();
}

function getVideoPromoStatus() {
  const ss = getVideoPromoDataHub_();
  return {
    ok: true,
    version: VIDEO_PROMO.TEMPLATE_VERSION,
    spreadsheetId: ss.getId(),
    sheets: Object.keys(VIDEO_PROMO.SHEETS).reduce((acc, key) => {
      const name = VIDEO_PROMO.SHEETS[key];
      acc[name] = !!ss.getSheetByName(name);
      return acc;
    }, {}),
    triggers: ScriptApp.getProjectTriggers().map(t => ({
      handler: t.getHandlerFunction(),
      source: String(t.getTriggerSource()),
      type: String(t.getEventType())
    }))
  };
}

function enqueueVideoReference(input) {
  input = input || {};
  const now = new Date();
  const assetId = input.assetId || ('ASSET-VID-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss'));
  const record = {
    assetId,
    assetType: input.assetType || 'VIDEO',
    sourceRef: input.sourceRef || '',
    sourcePlatform: input.sourcePlatform || 'UPLOAD',
    sourceUrl: input.sourceUrl || '',
    libraryFileId: input.libraryFileId || '',
    driveFileId: input.driveFileId || '',
    summary: input.summary || '',
    keywords: toCsv_(input.keywords),
    tags: toCsv_(input.tags),
    targetApps: toCsv_(input.targetApps),
    rightsUsage: input.rightsUsage || 'REFERENCE_ONLY',
    requestedStyle: input.requestedStyle || '',
    qualityTarget: input.qualityTarget || 'STANDARD',
    requestedBy: input.requestedBy || 'CENTRAL_AGENT',
    createdAt: now
  };
  writeAssetIndex_(record);
  enqueueBridgeTask_('VIDEO_PROMO_ANALYZE', record, 'HIGH');
  return {ok: true, assetId, queued: true};
}

function processVideoPromoQueue() {
  const ss = getVideoPromoDataHub_();
  const bridge = ss.getSheetByName(VIDEO_PROMO.SHEETS.BRIDGE);
  if (!bridge) throw new Error('Missing BRIDGE_TASKS');
  const values = bridge.getDataRange().getValues();
  if (values.length < 2) return {ok: true, processed: 0};
  const header = indexHeader_(values[0]);
  let processed = 0;
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (row[header.ACTION] !== 'VIDEO_PROMO_ANALYZE' || row[header.STATUS] !== 'READY') continue;
    const payload = safeJsonParse_(row[header.PAYLOAD_JSON]);
    try {
      const result = orchestrateVideoPromo_(payload);
      bridge.getRange(r + 1, header.STATUS + 1).setValue('DONE');
      bridge.getRange(r + 1, header.RESULT_JSON + 1).setValue(JSON.stringify(result));
      bridge.getRange(r + 1, header.UPDATED_AT + 1).setValue(new Date());
      processed++;
    } catch (err) {
      bridge.getRange(r + 1, header.STATUS + 1).setValue('ERROR');
      bridge.getRange(r + 1, header.ERROR + 1).setValue(String(err && err.stack || err));
      bridge.getRange(r + 1, header.UPDATED_AT + 1).setValue(new Date());
    }
  }
  return {ok: true, processed};
}

function orchestrateVideoPromo_(input) {
  const queens = buildQueensRecord_(input);
  const seed = buildSeedRecord_(queens, input);
  const template = buildT1Template_(seed);
  const fronts = buildT2FrontAdapters_(template, input.targetApps || '');
  const quality = decideQualitySupport_(seed, input);

  writeWorkflowLearning_(queens, seed, template, fronts, quality);

  if (quality.bridgeRequired) {
    enqueueBridgeTask_('VIDEO_PROMO_RENDER_OR_QA', {
      assetId: queens.assetId,
      templateId: template.templateId,
      complexityClass: seed.complexityClass,
      apiPolicy: quality.apiPolicy,
      targetApps: fronts.map(x => x.appId),
      instructions: quality.instructions
    }, 'HIGH');
  }

  return {queens, seed, template, fronts, quality};
}

function buildQueensRecord_(input) {
  return {
    assetId: input.assetId,
    sourceRef: input.sourceRef || input.libraryFileId || input.driveFileId || input.sourceUrl || '',
    sourcePlatform: input.sourcePlatform || 'UPLOAD',
    summary: input.summary || 'REFERENCE_VIDEO_PENDING_DEEP_ANALYSIS',
    keywords: input.keywords || '',
    tags: input.tags || '',
    visualFacts: input.visualFacts || '',
    audioFacts: input.audioFacts || '',
    rightsUsage: input.rightsUsage || 'REFERENCE_ONLY'
  };
}

function buildSeedRecord_(queens, input) {
  const requested = String(input.requestedStyle || '').toUpperCase();
  const inferred = inferComplexityClass_(requested, queens, input);
  return {
    assetId: queens.assetId,
    hookPattern: input.hookPattern || 'RESULT_OR_SECRET_FIRST',
    scriptPattern: input.scriptPattern || 'HOOK>PROOF>WORKFLOW>VALUE>CTA',
    visualPattern: input.visualPattern || 'SCREEN_RECORDING + LARGE_HEADLINE + HIGHLIGHT_CAPTIONS',
    editPattern: input.editPattern || 'FAST_EXPLANATORY_CUTS + KEYWORD_COLOR_HIGHLIGHT',
    complexityClass: inferred,
    apiRequirement: 'API_FREE',
    targetApps: toCsv_(input.targetApps),
    learningDelta: input.learningDelta || 'Agent-dashboard promotion pattern; show actual workflow state and numeric proof.'
  };
}

function buildT1Template_(seed) {
  return {
    templateId: 'T1-VIDEO-PROMO-' + seed.complexityClass + '-V1',
    complexityClass: seed.complexityClass,
    blocks: [
      {id: 'HOOK', seconds: [0, 3], rule: seed.hookPattern},
      {id: 'PROOF', seconds: [3, 12], rule: 'SHOW_REAL_UI_OR_RESULT'},
      {id: 'WORKFLOW', seconds: [12, 45], rule: 'SHOW_NODES_STATES_HANDOFFS'},
      {id: 'VALUE', seconds: [45, 65], rule: 'SHOW_TIME_COST_OUTPUT_DELTA'},
      {id: 'CTA', seconds: [65, 80], rule: 'ONE_ACTION_ONLY'}
    ],
    caption: {placement: 'LOWER_SAFE', maxLines: 2, keywordHighlight: true},
    render: {aspect: '9:16', simpleFirst: true}
  };
}

function buildT2FrontAdapters_(template, targetAppsCsv) {
  const apps = String(targetAppsCsv || '').split(',').map(s => s.trim()).filter(Boolean);
  return apps.map(appId => ({
    appId,
    adapterId: 'T2-' + appId.replace(/[^A-Za-z0-9_-]/g, '_') + '-APPINTRO-V1',
    templateId: template.templateId,
    fields: ['APP_NAME','USER_PROBLEM','CORE_FUNCTIONS','WORKFLOW_PROOF','RESULT_METRIC','CTA']
  }));
}

function decideQualitySupport_(seed, input) {
  const target = String(input.qualityTarget || 'STANDARD').toUpperCase();
  let apiPolicy = 'API_FREE';
  let bridgeRequired = true; // local/approved bridge still required for rendering or frame/audio QA.
  const instructions = ['REUSE_EXISTING_ASSETS', 'SIMPLE_FIRST', 'FRAME_QA', 'CAPTION_QA'];
  if (['UGC','ANIMATION','CINEMATIC'].indexOf(seed.complexityClass) >= 0 || target === 'PREMIUM') {
    apiPolicy = 'API_OPTIONAL';
    instructions.push('ALLOW_APPROVED_API_ON_QUALITY_GAP');
  }
  return {apiPolicy, bridgeRequired, instructions};
}

function inferComplexityClass_(requested, queens, input) {
  if (VIDEO_PROMO.COMPLEXITY_ORDER.indexOf(requested) >= 0) return requested;
  const text = [queens.summary, queens.keywords, queens.tags, input.visualPattern].join(' ').toUpperCase();
  if (/CINEMATIC/.test(text)) return 'CINEMATIC';
  if (/ANIMATION|MOTION GRAPHIC/.test(text)) return 'ANIMATION';
  if (/UGC|MODEL|PERSONA/.test(text)) return 'UGC';
  if (/DEMO|SCREEN|DASHBOARD|WORKFLOW|AGENT/.test(text)) return 'DEMO';
  if (/PRESENTER|TALKING|HOST/.test(text)) return 'PRESENTER';
  return 'SIMPLE';
}

function writeWorkflowLearning_(queens, seed, template, fronts, quality) {
  const ss = getVideoPromoDataHub_();
  const sheet = ss.getSheetByName(VIDEO_PROMO.SHEETS.MAP);
  if (!sheet) return;
  sheet.appendRow([
    'LEARN-' + queens.assetId,
    'REFERENCE_TO_PROMO_TEMPLATE',
    'analyzeMediaReference',
    'VIDEO_REFERENCE',
    'QUEENS+SEED+T1+T2',
    quality.apiPolicy,
    'runMediaQA',
    'WRITEBACK',
    queens.assetId,
    seed.complexityClass,
    template.templateId,
    fronts.map(x => x.adapterId).join(','),
    seed.learningDelta,
    'ACTIVE',
    new Date()
  ]);
}

function writeAssetIndex_(record) {
  const ss = getVideoPromoDataHub_();
  const sheet = ss.getSheetByName(VIDEO_PROMO.SHEETS.ASSETS);
  if (!sheet) throw new Error('Missing ASSET_INDEX');
  sheet.appendRow([
    record.assetId, 'VIDEO_REFERENCE', record.requestedStyle || 'PROMO_WORKFLOW_REFERENCE',
    'PRJ-CONTENT-OS / VIDEO-ANIMATION', record.sourceRef || record.libraryFileId || '',
    record.sourceUrl || '', record.driveFileId || '', 'LIBRARY_DRIVE_MIRROR', '', '', '',
    record.tags || '', ['VIDEO','PROMO','AGENT','WORKFLOW','LEARNING'].join('|'),
    record.rightsUsage || 'REFERENCE_ONLY', 'PENDING_ANALYSIS', 'QUEENS_QUEUED', 'N/A', '',
    record.targetApps || 'ALL_FRONT_APPS', 'GLOBAL_VIDEO_LEARNING', VIDEO_PROMO.TEMPLATE_VERSION, new Date()
  ]);
}

function enqueueBridgeTask_(action, payload, priority) {
  const ss = getVideoPromoDataHub_();
  const sheet = ss.getSheetByName(VIDEO_PROMO.SHEETS.BRIDGE);
  if (!sheet) throw new Error('Missing BRIDGE_TASKS');
  const taskId = 'BRIDGE-VID-' + Utilities.getUuid();
  sheet.appendRow([taskId, 'VIDEO_PROMO', action, JSON.stringify(payload), 'READY', priority || 'NORMAL', '', '', new Date(), '', '']);
  return taskId;
}

function ensureVideoPromoTrigger_() {
  const handler = 'processVideoPromoQueue';
  const exists = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === handler);
  if (!exists) ScriptApp.newTrigger(handler).timeBased().everyMinutes(10).create();
}

function ensureVideoPromoHeaders_(ss) {
  // Existing CentralAgent sheets are canonical. This function only verifies them; it never recreates/renames them.
  ['LIBRARY_DRIVE_MIRROR','MEDIA_QUEENS_SEED_SCHEMA','VIDEO_WORKFLOW_MAP','ASSET_INDEX','BRIDGE_TASKS'].forEach(name => {
    if (!ss.getSheetByName(name)) throw new Error('Missing canonical sheet: ' + name);
  });
}

function getVideoPromoDataHub_() {
  if (!VIDEO_PROMO.DATAHUB_ID) throw new Error('Set Script Property CENTRAL_DATAHUB_ID');
  return SpreadsheetApp.openById(VIDEO_PROMO.DATAHUB_ID);
}

function indexHeader_(headerRow) {
  return headerRow.reduce((o, v, i) => { o[String(v).trim()] = i; return o; }, {});
}

function safeJsonParse_(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(String(value)); } catch (e) { return {}; }
}

function toCsv_(value) {
  if (Array.isArray(value)) return value.join(',');
  return value == null ? '' : String(value);
}
