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

export const APP_WORKFLOW_ADAPTERS: AppWorkflowAdapter[] = [
  {appId:'APP_CONTENT_OS',label:'Content OS',projectId:'PRJ-CONTENT-OS',accent:'emerald',nodes:['INPUT','QUEENS','SEED','T1','T2','QA','PUBLISH'],metrics:['Queens coverage','Seed ready','T1/T2 pass','QA pass','Published'],outputs:['Article','Shorts','Image','Platform URL'],templates:['SIMPLE_EXPLAINER','TOOL_DEMO','AGENT_DASHBOARD_PROMO','APP_INTRO_COMPARISON']},
  {appId:'APP_TRAVEL',label:'Travel',projectId:'PRJ-TRAVEL',accent:'cyan',nodes:['ROAD INPUT','PLACE VERIFY','LIVE LAYER','USER LAYER','ROUTE','QA','OUTPUT'],metrics:['Roads','Places verified','Live events','Route pass','Fallbacks'],outputs:['Live Road','Map/route','Food/place cards'],templates:['TOOL_DEMO','BEFORE_AFTER','WORKFLOW_MAP_EXPLAINER','AGENT_DASHBOARD_PROMO']},
  {appId:'APP_INTERIOR',label:'Interior / Estimate',projectId:'PRJ-INTERIOR',accent:'amber',nodes:['PLAN','SPACE PARSE','MATERIAL MAP','QTY','COST','QA','REPORT'],metrics:['Plans parsed','Materials mapped','Qty pass','Estimate pass','QA anomalies'],outputs:['Estimate','Quantity sheet','Evidence','Before/After'],templates:['BEFORE_AFTER','SIMPLE_EXPLAINER','TOOL_DEMO','AGENT_DASHBOARD_PROMO']},
  {appId:'APP_DRYWRITER',label:'DryWriter',projectId:'PRJ-DRYWRITE',accent:'violet',nodes:['INPUT','QUEENS','STYLE SEED','T1','T2','MEDIA','PUBLISH'],metrics:['Drafts','Style seed','Platform variants','QA pass','Published'],outputs:['Longform','Shorts script','Caption','Audio'],templates:['PRESENTER_TOPLIST','SIMPLE_EXPLAINER','APP_INTRO_COMPARISON']},
  {appId:'APP_PERSONA',label:'Persona / VTube',projectId:'PRJ-PERSONA',accent:'pink',nodes:['PERSONA','FACE','VOICE','MOTION','LIPSYNC','QA','RENDER'],metrics:['Persona ready','Voice pack','Motion pass','Lip sync','Render pass'],outputs:['Persona asset','Voice','Motion clip','Video'],templates:['PRESENTER_TOPLIST','UGC_AD','APP_INTRO_COMPARISON']},
  {appId:'APP_CENTRAL_AGENT',label:'Central Agent',projectId:'PRJ-HUB',accent:'blue',nodes:['INPUT ROUTER','TASK QUEUE','APP ROUTER','BACKEND','QA','PUBLISH','AUDIT'],metrics:['Active tasks','Apps healthy','Blocked','QA pass','Readback'],outputs:['Task result','Audit','Workflow status','Deployment pointer'],templates:['AGENT_DASHBOARD_PROMO','WORKFLOW_MAP_EXPLAINER','TOOL_DEMO']}
];

export function getAppWorkflowAdapter(appId:string) {
  return APP_WORKFLOW_ADAPTERS.find(x=>x.appId===appId) || APP_WORKFLOW_ADAPTERS[0];
}
