import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const stripComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
  }
};

const adapters = read('workflow-shell/appAdapters.ts');
const dispatcher = read('apps-script/VideoAgentDispatcher.gs');
const engagement = read('apps-script/EngagementDistributionWorkflow.gs');
const engagementCode = stripComments(engagement);
const promo = read('apps-script/VideoPromoWorkflow.gs');
const bridge = read('api/video-agent-bridge.js');
const hub = read('video-agents/VideoTemplateAgentHub.tsx');

const canonicalApps = [
  'APP_AGENT_CORE','APP_CONTENT_OS','APP_ANALYZER','APP_DRYWRITE','APP_TRAVEL','APP_INTERIOR',
  'APP_BIBLE365','APP_BOTS','APP_VTUBE_1011B','APP_ANIMATION','APP_SHORTS','APP_KFOOD',
  'APP_NLM_BRIDGE','APP_PUBLISHER_CORE'
];
for (const appId of canonicalApps) assert(adapters.includes(appId), `canonical adapter ${appId}`);

const templates = [
  'SIMPLE_EXPLAINER','PRESENTER_TOPLIST','TOOL_DEMO','AGENT_DASHBOARD_PROMO',
  'APP_INTRO_COMPARISON','UGC_AD','BEFORE_AFTER','WORKFLOW_MAP_EXPLAINER'
];
for (const id of templates) assert(hub.includes(id), `video template agent ${id}`);

const actions = [
  'STATUS','QUEUE_APP_WORKFLOW','QUEUE_TEMPLATE_AGENT','REGISTER_ENGAGEMENT_CAMPAIGN',
  'INGEST_ENGAGEMENT_EVENT','PROCESS_VIDEO_PROMO_QUEUE','PROCESS_ENGAGEMENT_EVENTS'
];
for (const action of actions) {
  assert(dispatcher.includes(`'${action}'`), `dispatcher action ${action}`);
  assert(bridge.includes(`'${action}'`), `server bridge action ${action}`);
}

assert(dispatcher.includes('PROJECT_ID:'), 'TASK_QUEUE uses PROJECT_ID');
assert(dispatcher.includes('TASK_TYPE:'), 'TASK_QUEUE uses TASK_TYPE');
assert(dispatcher.includes('SOURCE_REF:'), 'TASK_QUEUE uses SOURCE_REF');
assert(dispatcher.includes("['TASK_ID','PROJECT_ID','TITLE','TASK_TYPE']"), 'TASK_QUEUE header row is auto-detected by canonical columns');
assert(dispatcher.includes("['TIMESTAMP','TYPE','RUNNER_ID','TASK_ID','DETAIL']"), 'BRIDGE_EVENTS canonical header contract');
assert(dispatcher.includes('vadFindHeader_'), 'non-row1 header detection exists');

assert(engagement.includes('OFFICIAL_API_ONLY'), 'engagement is official-API-only');
assert(engagement.includes('MAX_PER_HOUR'), 'engagement rate limit exists');
assert(engagement.includes('DUPLICATE'), 'engagement dedupe path exists');
assert(!/puppeteer|playwright|selenium|chromedriver|fetch\([^)]*instagram\.com|fetch\([^)]*facebook\.com/i.test(engagementCode), 'no browser automation or direct platform scraping bypass in engagement code');

const compactPromo = promo.replace(/\s+/g, '');
assert(compactPromo.includes("COMPLEXITY_ORDER:['SIMPLE','PRESENTER','DEMO','UGC','ANIMATION','CINEMATIC']"), 'simple-first complexity ladder');
assert(promo.includes('QUEENS') && promo.includes('Seed') && promo.includes('T1') && promo.includes('T2'), 'promo lineage contains Queens/Seed/T1/T2');

assert(bridge.includes('VIDEO_AGENT_APPS_SCRIPT_URL'), 'server-only upstream URL contract');
assert(bridge.includes('FORBIDDEN_CLIENT_SECRET_FIELD'), 'front secret-field rejection');
assert(!adapters.includes('APP_DRYWRITER') && !adapters.includes('APP_PERSONA') && !adapters.includes('APP_CENTRAL_AGENT'), 'temporary APP_ID aliases removed');

if (process.exitCode) process.exit(process.exitCode);
console.log('Video agent static contract verification complete.');
