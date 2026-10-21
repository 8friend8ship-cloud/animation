// VideoPromoWorkflow.gs
// Reference -> Queens -> Seed -> T1 -> T2 -> production manifest -> local render/QA bridge.
// Canonical: SIMPLE_FIRST, API_FREE first, reuse the existing scheduler by default.

const VIDEO_PROMO = Object.freeze({
  DATAHUB_ID: PropertiesService.getScriptProperties().getProperty('CENTRAL_DATAHUB_ID') || '1bpilaFQ9vMNF9lKL76sKbD-08Xupz3KKsGS7C04om4M',
  SHEETS: {
    MIRROR:'LIBRARY_DRIVE_MIRROR', SCHEMA:'MEDIA_QUEENS_SEED_SCHEMA', MAP:'VIDEO_WORKFLOW_MAP',
    ASSETS:'ASSET_INDEX', TASKS:'TASK_QUEUE', BRIDGE:'BRIDGE_TASKS'
  },
  TEMPLATE_VERSION:'VIDEO_PROMO_V2_20260824',
  COMPLEXITY_ORDER:['SIMPLE','PRESENTER','DEMO','UGC','ANIMATION','CINEMATIC']
});

function setupVideoPromoWorkflow() {
  const ss=getVideoPromoDataHub_();
  ensureVideoPromoHeaders_(ss);
  ensureVideoPromoTrigger_();
  return getVideoPromoStatus();
}

function getVideoPromoStatus() {
  const ss=getVideoPromoDataHub_();
  return {
    ok:true, version:VIDEO_PROMO.TEMPLATE_VERSION, spreadsheetId:ss.getId(),
    sheets:Object.keys(VIDEO_PROMO.SHEETS).reduce((a,k)=>{const n=VIDEO_PROMO.SHEETS[k];a[n]=!!ss.getSheetByName(n);return a;},{}),
    schedulerPolicy:'REUSE_EXISTING_BY_DEFAULT',
    triggers:ScriptApp.getProjectTriggers().map(t=>({handler:t.getHandlerFunction(),source:String(t.getTriggerSource()),type:String(t.getEventType())}))
  };
}

function enqueueVideoReference(input) {
  input=input||{};
  const now=new Date();
  const assetId=input.assetId||('ASSET-VID-'+Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyyMMdd-HHmmss'));
  const record={
    assetId, assetType:input.assetType||'VIDEO', sourceRef:input.sourceRef||'', sourcePlatform:input.sourcePlatform||'UPLOAD',
    sourceUrl:input.sourceUrl||'', libraryFileId:input.libraryFileId||'', driveFileId:input.driveFileId||'',
    summary:input.summary||'', keywords:toCsv_(input.keywords), tags:toCsv_(input.tags), targetApps:toCsv_(input.targetApps),
    rightsUsage:input.rightsUsage||'REFERENCE_ONLY', requestedStyle:input.requestedStyle||'', qualityTarget:input.qualityTarget||'STANDARD',
    requestedBy:input.requestedBy||'CENTRAL_AGENT', createdAt:now
  };
  writeAssetIndex_(record);
  enqueueBridgeTask_('VIDEO_PROMO_ANALYZE',record,'HIGH');
  return {ok:true,assetId,queued:true};
}

function processVideoPromoQueue() {
  const ss=getVideoPromoDataHub_();
  const bridge=ss.getSheetByName(VIDEO_PROMO.SHEETS.BRIDGE);
  if(!bridge) throw new Error('Missing BRIDGE_TASKS');
  const values=bridge.getDataRange().getValues();
  if(values.length<2) return {ok:true,processed:0};
  const h=indexHeader_(values[0]);
  let processed=0;
  for(let r=1;r<values.length;r++){
    const row=values[r];
    if(String(row[h.ACTION])!=='VIDEO_PROMO_ANALYZE'||String(row[h.STATUS])!=='READY') continue;
    const payload=safeJsonParse_(row[h.PAYLOAD_JSON]);
    try{
      const result=orchestrateVideoPromo_(payload);
      setBridgeResult_(bridge,h,r,'DONE',result,'');
      processed++;
    }catch(err){ setBridgeResult_(bridge,h,r,'ERROR',null,String(err&&err.stack||err)); }
  }
  return {ok:true,processed};
}

function orchestrateVideoPromo_(input) {
  const queens=buildQueensRecord_(input);
  const seed=buildSeedRecord_(queens,input);
  const template=buildT1Template_(seed,input);
  const fronts=buildT2FrontAdapters_(template,input.targetApps||'');
  const manifest=buildVideoProductionManifest_(queens,seed,template,fronts,input);
  const quality=decideQualitySupport_(seed,input);
  writeWorkflowLearning_(queens,seed,template,fronts,quality,manifest);
  const bridgeTaskId=enqueueBridgeTask_('VIDEO_PROMO_RENDER_OR_QA',{
    assetId:queens.assetId, templateId:template.templateId, complexityClass:seed.complexityClass,
    apiPolicy:quality.apiPolicy, targetApps:fronts.map(x=>x.appId), instructions:quality.instructions,
    productionManifest:manifest
  },'HIGH');
  return {queens,seed,template,fronts,manifest,quality,bridgeTaskId};
}

function buildQueensRecord_(input){
  return {assetId:input.assetId,sourceRef:input.sourceRef||input.libraryFileId||input.driveFileId||input.sourceUrl||'',sourcePlatform:input.sourcePlatform||'UPLOAD',summary:input.summary||'REFERENCE_VIDEO_PENDING_DEEP_ANALYSIS',keywords:input.keywords||'',tags:input.tags||'',visualFacts:input.visualFacts||'',audioFacts:input.audioFacts||'',rightsUsage:input.rightsUsage||'REFERENCE_ONLY'};
}

function buildSeedRecord_(queens,input){
  const requested=String(input.requestedStyle||'').toUpperCase();
  return {assetId:queens.assetId,hookPattern:input.hookPattern||'RESULT_OR_SECRET_FIRST',scriptPattern:input.scriptPattern||'HOOK>PROOF>WORKFLOW>VALUE>CTA',visualPattern:input.visualPattern||'SCREEN_RECORDING + LARGE_HEADLINE + HIGHLIGHT_CAPTIONS',editPattern:input.editPattern||'FAST_EXPLANATORY_CUTS + KEYWORD_COLOR_HIGHLIGHT',complexityClass:inferComplexityClass_(requested,queens,input),apiRequirement:'API_FREE',targetApps:toCsv_(input.targetApps),learningDelta:input.learningDelta||'Show actual workflow state and numeric proof; never expose secrets.'};
}

function buildT1Template_(seed,input){
  return {
    templateId:'T1-VIDEO-PROMO-'+seed.complexityClass+'-V2', complexityClass:seed.complexityClass,
    blocks:[
      {id:'HOOK',seconds:[0,3],rule:seed.hookPattern,voice:input.hookVoice||'결과를 먼저 보여주고 왜 중요한지 한 문장으로 설명합니다.'},
      {id:'PROOF',seconds:[3,12],rule:'SHOW_REAL_UI_OR_RESULT',voice:input.proofVoice||'실제 화면과 결과를 증거로 보여줍니다.'},
      {id:'WORKFLOW',seconds:[12,45],rule:'SHOW_NODES_STATES_HANDOFFS',voice:input.workflowVoice||'입력부터 처리와 결과까지 핵심 단계만 따라갑니다.'},
      {id:'VALUE',seconds:[45,65],rule:'SHOW_TIME_COST_OUTPUT_DELTA',voice:input.valueVoice||'시간, 비용 또는 작업량이 어떻게 줄어드는지 검증 가능한 값만 보여줍니다.'},
      {id:'CTA',seconds:[65,80],rule:'ONE_ACTION_ONLY',voice:input.ctaVoice||'한 가지 행동만 요청합니다.'}
    ],
    caption:{placement:'LOWER_SAFE',maxLines:2,keywordHighlight:true}, render:{aspect:'9:16',width:1080,height:1920,fps:30,simpleFirst:true}
  };
}

function buildT2FrontAdapters_(template,targetAppsCsv){
  const apps=String(targetAppsCsv||'').split(',').map(s=>s.trim()).filter(Boolean);
  return apps.map(appId=>({appId,adapterId:'T2-'+appId.replace(/[^A-Za-z0-9_-]/g,'_')+'-APPINTRO-V2',templateId:template.templateId,fields:['APP_NAME','USER_PROBLEM','CORE_FUNCTIONS','WORKFLOW_PROOF','RESULT_METRIC','CTA']}));
}

function buildVideoProductionManifest_(queens,seed,template,fronts,input){
  const shots=template.blocks.map((b,i)=>({
    shotId:'SHOT_'+String(i+1).padStart(2,'0'), blockId:b.id, startSec:b.seconds[0], endSec:b.seconds[1],
    visualRule:b.rule, screenProofRequired:['PROOF','WORKFLOW','VALUE'].indexOf(b.id)>=0,
    sourceCandidates:toCsv_(input.sourceAssets||input.screenProofUrls||''),
    voiceLine:b.voice, captionText:b.voice, transition:i===0?'NONE':'CUT', qa:['SAFE_AREA','CAPTION_READABLE','NO_SECRET','SOURCE_PRESENT']
  }));
  return {
    manifestVersion:'VIDEO_PRODUCTION_MANIFEST_V1_20260824', assetId:queens.assetId, templateId:template.templateId,
    complexityClass:seed.complexityClass, canvas:template.render, targetApps:fronts.map(x=>x.appId),
    script:shots.map(s=>s.voiceLine).join(' '), shots,
    assetPlan:{reuseFirst:true,screenCapture:seed.complexityClass==='DEMO',generatedVisualAllowed:['UGC','ANIMATION','CINEMATIC'].indexOf(seed.complexityClass)>=0},
    voicePlan:{policy:'TTS_FREE_FIRST',language:input.language||'ko-KR',lines:shots.map(s=>({shotId:s.shotId,text:s.voiceLine}))},
    captionPlan:{format:'SRT_OR_ASS',safeArea:true,maxLines:2,items:shots.map(s=>({shotId:s.shotId,startSec:s.startSec,endSec:s.endSec,text:s.captionText}))},
    renderPlan:{engine:'LOCAL_FFMPEG_OR_REMOTION',output:'MP4_H264_AAC',failedShotOnlyRegen:true},
    qaPlan:['FRAME_QA','CAPTION_QA','AUDIO_QA','SECRET_SCAN','SCREEN_PROOF_QA','FAILED_SHOT_ONLY_REGEN']
  };
}

function decideQualitySupport_(seed,input){
  const target=String(input.qualityTarget||'STANDARD').toUpperCase();
  let apiPolicy='API_FREE';
  const instructions=['REUSE_EXISTING_ASSETS','SIMPLE_FIRST','FRAME_QA','CAPTION_QA','AUDIO_QA','FAILED_SHOT_ONLY_REGEN'];
  if(['UGC','ANIMATION','CINEMATIC'].indexOf(seed.complexityClass)>=0||target==='PREMIUM'){apiPolicy='API_OPTIONAL';instructions.push('ALLOW_APPROVED_API_ON_QUALITY_GAP');}
  return {apiPolicy,bridgeRequired:true,instructions};
}

function inferComplexityClass_(requested,queens,input){
  if(VIDEO_PROMO.COMPLEXITY_ORDER.indexOf(requested)>=0) return requested;
  const text=[queens.summary,queens.keywords,queens.tags,input.visualPattern].join(' ').toUpperCase();
  if(/CINEMATIC/.test(text)) return 'CINEMATIC'; if(/ANIMATION|MOTION GRAPHIC/.test(text)) return 'ANIMATION';
  if(/UGC|MODEL|PERSONA/.test(text)) return 'UGC'; if(/DEMO|SCREEN|DASHBOARD|WORKFLOW|AGENT/.test(text)) return 'DEMO';
  if(/PRESENTER|TALKING|HOST/.test(text)) return 'PRESENTER'; return 'SIMPLE';
}

function writeWorkflowLearning_(queens,seed,template,fronts,quality,manifest){
  const sheet=getVideoPromoDataHub_().getSheetByName(VIDEO_PROMO.SHEETS.MAP); if(!sheet)return;
  sheet.appendRow(['LEARN-'+queens.assetId,'REFERENCE_TO_PRODUCTION_MANIFEST','buildVideoProductionManifest_','QUEENS+SEED+T1+T2','RENDER_MANIFEST',quality.apiPolicy,'runMediaQA','WRITEBACK',queens.assetId,seed.complexityClass,template.templateId,fronts.map(x=>x.adapterId).join(','),seed.learningDelta,'ACTIVE',new Date()]);
}

function writeAssetIndex_(record){
  const sheet=getVideoPromoDataHub_().getSheetByName(VIDEO_PROMO.SHEETS.ASSETS); if(!sheet)throw new Error('Missing ASSET_INDEX');
  sheet.appendRow([record.assetId,'VIDEO_REFERENCE',record.requestedStyle||'PROMO_WORKFLOW_REFERENCE','PRJ-CONTENT-OS / VIDEO-ANIMATION',record.sourceRef||record.libraryFileId||'',record.sourceUrl||'',record.driveFileId||'','LIBRARY_DRIVE_MIRROR','','','',record.tags||'',['VIDEO','PROMO','AGENT','WORKFLOW','LEARNING'].join('|'),record.rightsUsage||'REFERENCE_ONLY','PENDING_ANALYSIS','QUEENS_QUEUED','N/A','',record.targetApps||'ALL_FRONT_APPS','GLOBAL_VIDEO_LEARNING',VIDEO_PROMO.TEMPLATE_VERSION,new Date()]);
}

function enqueueBridgeTask_(action,payload,priority){
  const sheet=getVideoPromoDataHub_().getSheetByName(VIDEO_PROMO.SHEETS.BRIDGE); if(!sheet)throw new Error('Missing BRIDGE_TASKS');
  const taskId='BRIDGE-VID-'+Utilities.getUuid();
  const headers=sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(),1)).getValues()[0].map(v=>String(v).trim());
  const rec={TASK_ID:taskId,TARGET:'VIDEO_PROMO',ACTION:action,PAYLOAD_JSON:JSON.stringify(payload),STATUS:'READY',PRIORITY:priority||'NORMAL',RUNNER_ID:'',CLAIMED_AT:'',UPDATED_AT:new Date(),RESULT_JSON:'',ERROR:''};
  sheet.appendRow(headers.map(h=>Object.prototype.hasOwnProperty.call(rec,h)?rec[h]:''));
  return taskId;
}

function setBridgeResult_(sheet,h,dataIndex,status,result,error){
  const row=dataIndex+1;
  if(h.STATUS!=null)sheet.getRange(row,h.STATUS+1).setValue(status);
  if(h.RESULT_JSON!=null)sheet.getRange(row,h.RESULT_JSON+1).setValue(result?JSON.stringify(result):'');
  if(h.ERROR!=null)sheet.getRange(row,h.ERROR+1).setValue(error||'');
  if(h.UPDATED_AT!=null)sheet.getRange(row,h.UPDATED_AT+1).setValue(new Date());
}

function ensureVideoPromoTrigger_(){
  const allow=String(PropertiesService.getScriptProperties().getProperty('VIDEO_PROMO_ALLOW_SEPARATE_TRIGGER')||'FALSE').toUpperCase()==='TRUE';
  if(!allow) return {created:false,policy:'REUSE_EXISTING_SCHEDULER'};
  const handler='processVideoPromoQueue'; const exists=ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()===handler);
  if(!exists)ScriptApp.newTrigger(handler).timeBased().everyMinutes(10).create();
  return {created:!exists,policy:'EXPLICIT_SEPARATE_TRIGGER'};
}

function ensureVideoPromoHeaders_(ss){['LIBRARY_DRIVE_MIRROR','MEDIA_QUEENS_SEED_SCHEMA','VIDEO_WORKFLOW_MAP','ASSET_INDEX','BRIDGE_TASKS'].forEach(n=>{if(!ss.getSheetByName(n))throw new Error('Missing canonical sheet: '+n);});}
function getVideoPromoDataHub_(){return SpreadsheetApp.openById(VIDEO_PROMO.DATAHUB_ID);}
function indexHeader_(row){return row.reduce((o,v,i)=>{o[String(v).trim()]=i;return o;},{});}
function safeJsonParse_(v){if(!v)return{};if(typeof v==='object')return v;try{return JSON.parse(String(v));}catch(e){return{};}}
function toCsv_(v){return Array.isArray(v)?v.join(','):(v==null?'':String(v));}
