export type AppWorkflowAdapter = {
  appId: string;
  label: string;
  projectId: string;
  accent: string;
  nodes: string[];
  metrics: string[];
  outputs: string[];
  templates: string[];
};

// APP_ID values follow 01_MASTER_REGISTRY/56_FRONTAPP_WORKFLOW_MAP whenever a canonical ID exists.
export const APP_WORKFLOW_ADAPTERS: AppWorkflowAdapter[] = [
  {appId:'APP_AGENT_CORE',label:'Central Agent Core',projectId:'PRJ-HUB',accent:'blue',nodes:['PRECHECK','TASK QUEUE','APP ROUTER','BACKEND','QA','PUBLISH GATE','AUDIT'],metrics:['Active tasks','Apps healthy','Blocked','QA pass','Readback'],outputs:['Task result','Audit','Workflow status','Deployment pointer'],templates:['AGENT_DASHBOARD_PROMO','WORKFLOW_MAP_EXPLAINER','TOOL_DEMO']},
  {appId:'APP_CONTENT_OS',label:'Content OS',projectId:'PRJ-CONTENT-OS',accent:'emerald',nodes:['INPUT','QUEENS','SEED','T1','T2','QA','PUBLISH'],metrics:['Queens coverage','Seed ready','T1/T2 pass','QA pass','Published'],outputs:['Article','Shorts','Image','Platform URL'],templates:['SIMPLE_EXPLAINER','TOOL_DEMO','AGENT_DASHBOARD_PROMO','APP_INTRO_COMPARISON','WORKFLOW_MAP_EXPLAINER']},
  {appId:'APP_ANALYZER',label:'Content OS Analyzer',projectId:'PRJ-CONTENT-OS',accent:'sky',nodes:['QUERY','STORED BASELINE','API LEARNING','QUEENS','SEED','T1/T2','A/B QA'],metrics:['Coverage','Freshness','API delta','Video metrics','Front pass'],outputs:['Research result','Keyword plan','Seed candidate','Quality delta'],templates:['TOOL_DEMO','AGENT_DASHBOARD_PROMO','WORKFLOW_MAP_EXPLAINER']},
  {appId:'APP_DRYWRITE',label:'DryWriter',projectId:'PRJ-DRYWRITE',accent:'violet',nodes:['INPUT','QUEENS','STYLE SEED','T1','T2','MEDIA','PUBLISH'],metrics:['Drafts','Style seed','Platform variants','QA pass','Published'],outputs:['Longform','Shorts script','Caption','Audio'],templates:['PRESENTER_TOPLIST','SIMPLE_EXPLAINER','APP_INTRO_COMPARISON','AGENT_DASHBOARD_PROMO']},
  {appId:'APP_TRAVEL',label:'Travel',projectId:'PRJ-TRAVEL',accent:'cyan',nodes:['ROAD INPUT','PLACE VERIFY','LIVE LAYER','USER LAYER','ROUTE','QA','OUTPUT'],metrics:['Roads','Places verified','Live events','Route pass','Fallbacks'],outputs:['Live Road','Map/route','Food/place cards'],templates:['TOOL_DEMO','BEFORE_AFTER','WORKFLOW_MAP_EXPLAINER','AGENT_DASHBOARD_PROMO']},
  {appId:'APP_INTERIOR',label:'Interior / Estimate',projectId:'PRJ-INTERIOR',accent:'amber',nodes:['PLAN','SPACE PARSE','MATERIAL MAP','QTY','COST','QA','REPORT'],metrics:['Plans parsed','Materials mapped','Qty pass','Estimate pass','QA anomalies'],outputs:['Estimate','Quantity sheet','Evidence','Before/After'],templates:['BEFORE_AFTER','SIMPLE_EXPLAINER','TOOL_DEMO','AGENT_DASHBOARD_PROMO']},
  {appId:'APP_BIBLE365',label:'Bible365',projectId:'PRJ-BIBLE365',accent:'indigo',nodes:['LIBRARIAN','QUEENS','SEED','T1 DAILY','T2 PLATFORM','MEDIA','DELIVERY'],metrics:['Verse/source pass','Seed ready','T1/T2 pass','Audio ready','Delivery readback'],outputs:['Daily devotional','Platform pack','Audio','Media pack'],templates:['SIMPLE_EXPLAINER','PRESENTER_TOPLIST','WORKFLOW_MAP_EXPLAINER']},
  {appId:'APP_BOTS',label:'Bots / Persona / Voice',projectId:'PRJ-BOTS',accent:'pink',nodes:['PERSONA','LANGUAGE','VOICE','MOTION','LIPSYNC','QA','RUNTIME'],metrics:['Persona ready','Voice pack','Motion pass','Lip sync','Runtime pass'],outputs:['Persona asset','Voice','Motion clip','Avatar video'],templates:['PRESENTER_TOPLIST','UGC_AD','APP_INTRO_COMPARISON','TOOL_DEMO']},
  {appId:'APP_VTUBE_1011B',label:'VTube Creative',projectId:'PRJ-VTUBE',accent:'fuchsia',nodes:['RESEARCH SEED','SERIES','SCRIPT','STORYBOARD','PERSONA','MEDIA','EXPORT'],metrics:['Series ready','Script pass','Storyboard','Media ready','Export pass'],outputs:['Series plan','Script','Storyboard','Video'],templates:['PRESENTER_TOPLIST','UGC_AD','APP_INTRO_COMPARISON','TOOL_DEMO']},
  {appId:'APP_ANIMATION',label:'Animation Studio',projectId:'PRJ-ANIMATION',accent:'lime',nodes:['SCRIPT','SCENES','ASSET','MOTION','CAPTION/AUDIO','FRAME QA','EXPORT'],metrics:['Scene pass','Asset reuse','Frame QA','Audio sync','Export pass'],outputs:['Whiteboard','Kinetic video','Animation','Media URL'],templates:['SIMPLE_EXPLAINER','TOOL_DEMO','WORKFLOW_MAP_EXPLAINER','BEFORE_AFTER']},
  {appId:'APP_SHORTS',label:'Shorts Generator',projectId:'PRJ-SHORTS',accent:'orange',nodes:['SEED','HOOK','60S SCRIPT','CUTS','MEDIA','CTA','EXPORT'],metrics:['Hook pass','Script pass','Cut count','Media ready','Export pass'],outputs:['Shorts script','Cut list','Caption','Video'],templates:['SIMPLE_EXPLAINER','PRESENTER_TOPLIST','UGC_AD','BEFORE_AFTER','TOOL_DEMO']},
  {appId:'APP_KFOOD',label:'K-Food Commerce',projectId:'PRJ-KFOOD',accent:'red',nodes:['PRODUCT/RECIPE','QUEENS','SEED','T1','T2','MEDIA','CTA'],metrics:['Product freshness','Recipe/source pass','Seed ready','CTA pass','Front pass'],outputs:['Product card','Recipe','Creator short','Affiliate link'],templates:['UGC_AD','PRESENTER_TOPLIST','BEFORE_AFTER','SIMPLE_EXPLAINER','TOOL_DEMO']},
  {appId:'APP_NLM_BRIDGE',label:'NotebookLM / Flow Bridge',projectId:'PRJ-BRIDGE',accent:'teal',nodes:['TASK','APPROVAL','LOCAL UI','RESULT','ACK','DRIVE','RETURN'],metrics:['Ready tasks','UI result','ACK pass','Export pass','Readback'],outputs:['Audio','Timeline','Video/export','Result ACK'],templates:['TOOL_DEMO','AGENT_DASHBOARD_PROMO','WORKFLOW_MAP_EXPLAINER']},
  {appId:'APP_PUBLISHER_CORE',label:'Publisher Core',projectId:'PRJ-PUBLISHER',accent:'slate',nodes:['PACKAGE','APPROVAL','QUEUE','PROVIDER','RECEIPT','READBACK','AUDIT'],metrics:['Draft queue','Approved','Provider ACK','Failures','Receipts'],outputs:['Draft URL','Platform URL','Receipt','Audit'],templates:['AGENT_DASHBOARD_PROMO','WORKFLOW_MAP_EXPLAINER','APP_INTRO_COMPARISON']}
];

export function getAppWorkflowAdapter(appId:string) {
  return APP_WORKFLOW_ADAPTERS.find(x=>x.appId===appId) || APP_WORKFLOW_ADAPTERS[0];
}
