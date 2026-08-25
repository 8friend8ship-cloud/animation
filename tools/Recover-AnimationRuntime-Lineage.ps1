param(
  [switch]$DryRun = $true,
  [switch]$ListOnly = $false,
  [switch]$ChromeUrlOnly = $false,
  [switch]$CftBoundScriptRecovery = $false,
  [string]$ChromeUrlPrefix = '',
  [string]$TargetSpreadsheetId = '',
  [string]$TargetCodePattern = '',
  [string]$TargetNamePattern = '',
  [string]$TargetLabel = 'Animation',
  [string]$CentralReadbackName = '',
  [switch]$ChromeWorkerDriveHandoff = $false,
  [string]$Worker = '',
  [string]$WorkerTaskId = '',
  [string]$WorkerParentTaskId = '',
  [string]$WorkerAction = '',
  [string]$WorkerPrompt = '',
  [string]$WorkerTargetUrl = '',
  [int]$WorkerTimeoutSeconds = 240
)

$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$Repo='8friend8ship-cloud/animation'
$ScriptPath='tools/Recover-AnimationRuntime-Lineage.ps1'
$PreviousCommit='d2b7764f4cba8f3d62b4b8dbff153879d44ca46b'

function Forward-Previous {
  $h=@{'User-Agent'='HomeDesign-Chrome-Worker';'Accept'='application/vnd.github+json'}
  $u='https://api.github.com/repos/'+$Repo+'/contents/'+$ScriptPath+'?ref='+$PreviousCommit
  $r=Invoke-RestMethod -Uri $u -Headers $h -Method Get -TimeoutSec 20
  $tmp=Join-Path $env:TEMP ('Recover-AnimationRuntime-Lineage-prev-'+[guid]::NewGuid().ToString('N')+'.ps1')
  [IO.File]::WriteAllBytes($tmp,[Convert]::FromBase64String(([string]$r.content -replace '\s','')))
  $args=@()
  if($DryRun){$args+='-DryRun'};if($ListOnly){$args+='-ListOnly'};if($ChromeUrlOnly){$args+='-ChromeUrlOnly'};if($CftBoundScriptRecovery){$args+='-CftBoundScriptRecovery'}
  if($ChromeUrlPrefix){$args+=@('-ChromeUrlPrefix',$ChromeUrlPrefix)};if($TargetSpreadsheetId){$args+=@('-TargetSpreadsheetId',$TargetSpreadsheetId)}
  if($TargetCodePattern){$args+=@('-TargetCodePattern',$TargetCodePattern)};if($TargetNamePattern){$args+=@('-TargetNamePattern',$TargetNamePattern)}
  if($TargetLabel){$args+=@('-TargetLabel',$TargetLabel)};if($CentralReadbackName){$args+=@('-CentralReadbackName',$CentralReadbackName)}
  try{& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $tmp @args;exit $LASTEXITCODE}finally{Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue}
}

if(-not $ChromeWorkerDriveHandoff){Forward-Previous}

function Safe-Name([string]$Value,[string]$Label){
  if(-not $Value -or $Value -notmatch '^[A-Za-z0-9_.-]{1,180}$'){throw ('UNSAFE_'+$Label)}
  return $Value
}
function Find-CentralRoot {
  $target=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('MDBf7KSR7JWZ7JeQ7J207KCE7Yq4'))
  foreach($drive in @(Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue)){
    $r=[string]$drive.Root;if(-not $r){continue}
    foreach($candidate in @((Join-Path $r $target),(Join-Path $r ('My Drive\'+$target)),(Join-Path $r ('내 드라이브\'+$target)),(Join-Path $r ('Google Drive\'+$target)))){if(Test-Path -LiteralPath $candidate){return $candidate}}
  }
  foreach($candidate in @((Join-Path $env:USERPROFILE ('My Drive\'+$target)),(Join-Path $env:USERPROFILE ('내 드라이브\'+$target)),(Join-Path $env:USERPROFILE ('Google Drive\'+$target)))){if(Test-Path -LiteralPath $candidate){return $candidate}}
  return ''
}
function Write-JsonAtomic([string]$Path,$Object){
  $tmp=$Path+'.tmp';$Object|ConvertTo-Json -Depth 30|Set-Content -LiteralPath $tmp -Encoding UTF8;Move-Item -LiteralPath $tmp -Destination $Path -Force
}

$Base=Join-Path $env:LOCALAPPDATA 'HomeDesignAutomationV7'
$UserData=Join-Path $Base 'ChromeUserData'
$CftRoot=Join-Path $Base 'ChromeForTesting'
$NotebookExtensionRoot=Join-Path $Base 'Extension\NotebookLM-WebApp-Bridge'
$FrontUrl='https://notebooklm-webapp-bridge.vercel.app'
$DebugPort=9223

function Find-CftChrome {return Get-ChildItem -LiteralPath $CftRoot -Recurse -Filter chrome.exe -File -ErrorAction SilentlyContinue|Sort-Object FullName -Descending|Select-Object -First 1}
function Dedicated-Procs {try{return @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue|Where-Object{$_.CommandLine -and ([string]$_.CommandLine).Contains($UserData)})}catch{return @()}}
function Stop-Dedicated {
  $killed=@();foreach($p in @(Dedicated-Procs)){try{& taskkill.exe /PID ([int]$p.ProcessId) /T /F 2>$null|Out-Null;$killed += [int]$p.ProcessId}catch{}}
  Start-Sleep -Seconds 2;return @($killed)
}
function Resolve-WorkerExtension([string]$WorkerName){
  $candidates=@()
  switch($WorkerName.ToUpperInvariant()){
    'FLOW' {$candidates=@((Join-Path $env:USERPROFILE 'Downloads\flow-agent-bridge-v0.1.0\flow-agent-bridge-v0.1.0'))}
    'FRONT_TEST' {$candidates=@((Join-Path $env:USERPROFILE 'Downloads\front-app-test-bridge-v1.0.1\front-app-test-bridge-v1.0.1\extension'))}
  }
  foreach($p in $candidates){if(Test-Path -LiteralPath (Join-Path $p 'manifest.json')){return $p}}
  return ''
}
function Start-CftWorker([string]$Url,[string]$WorkerExtension,[switch]$Debug){
  $chrome=Find-CftChrome;if(-not $chrome){throw 'CFT_CHROME_EXE_NOT_FOUND'}
  $args=@("--user-data-dir=$UserData",'--profile-directory=Default','--new-window','--no-first-run','--no-default-browser-check','--disable-session-crashed-bubble','--disable-download-notification')
  if($WorkerExtension){$args+=("--load-extension=$WorkerExtension")}
  if($Debug){$args+=@("--remote-debugging-port=$DebugPort",'--remote-debugging-address=127.0.0.1')}
  $args+=$Url
  Start-Process -FilePath $chrome.FullName -ArgumentList $args -WorkingDirectory $chrome.Directory.FullName|Out-Null
  return $chrome.FullName
}
function Restore-NotebookCft {
  try{
    Stop-Dedicated|Out-Null
    $chrome=Find-CftChrome;if(-not $chrome){return $false}
    $args=@("--user-data-dir=$UserData",'--profile-directory=Default',"--load-extension=$NotebookExtensionRoot",'--new-window','--no-first-run','--no-default-browser-check','--disable-session-crashed-bubble',$FrontUrl)
    Start-Process -FilePath $chrome.FullName -ArgumentList $args -WorkingDirectory $chrome.Directory.FullName|Out-Null
    Start-Sleep -Seconds 2
    return (@(Dedicated-Procs).Count -gt 0)
  }catch{return $false}
}
function Wait-Cdp([int]$Seconds=20){$end=(Get-Date).AddSeconds($Seconds);do{try{$v=Invoke-RestMethod -Uri ("http://127.0.0.1:$DebugPort/json/version") -TimeoutSec 2;if($v.webSocketDebuggerUrl){return $true}}catch{};Start-Sleep -Milliseconds 500}while((Get-Date)-lt $end);return $false}

function Run-WorkerCdp([string]$WorkerName,[string]$TargetUrl,[string]$Prompt,[string]$OutputDir,[int]$TimeoutSeconds){
  $node=Get-Command node.exe -ErrorAction SilentlyContinue;if(-not $node){$node=Get-Command node -ErrorAction SilentlyContinue};if(-not $node){throw 'NODE_NOT_FOUND'}
  $js=Join-Path $env:TEMP ('chrome-worker-drive-'+[guid]::NewGuid().ToString('N')+'.js')
  $code=@'
const port=Number(process.argv[2]);
const worker=String(process.argv[3]||'').toUpperCase();
const targetUrl=process.argv[4];
const prompt=process.argv[5]||'';
const outputDir=process.argv[6];
const timeoutMs=Math.max(30000,Number(process.argv[7]||240)*1000);
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function getJson(url){return await (await fetch(url)).json();}
function connect(url){return new Promise((resolve,reject)=>{const ws=new WebSocket(url);let seq=0;const pending=new Map();ws.onopen=()=>resolve({ws,send:(method,params={})=>new Promise((res,rej)=>{const id=++seq;pending.set(id,{res,rej});ws.send(JSON.stringify({id,method,params}));})});ws.onerror=e=>reject(e);ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return};if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.rej(new Error(JSON.stringify(m.error)));else p.res(m.result);}};});}
async function list(){return await getJson(`http://127.0.0.1:${port}/json/list`);}
async function waitPage(match,maxMs=25000){const end=Date.now()+maxMs;let last=[];while(Date.now()<end){last=await list();const p=last.find(t=>t.type==='page'&&match(t));if(p&&p.title){return {page:p,all:last};}await sleep(500);}return {page:last.find(t=>t.type==='page'&&match(t)),all:last};}
async function evalv(c,expression){const r=await c.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw new Error('RUNTIME_EVAL_EXCEPTION');return r.result?.value;}
const version=await getJson(`http://127.0.0.1:${port}/json/version`);
const browser=await connect(version.webSocketDebuggerUrl);
try{await browser.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:outputDir,eventsEnabled:true});}catch(e){await browser.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:outputDir});}
const ready=await waitPage(t=>t.url&&((targetUrl&&t.url.startsWith(targetUrl.split('?')[0].split('#')[0]))||(worker==='FLOW'&&(t.url.includes('labs.google')||t.url.includes('/fx/tools/flow')))||(worker==='FRONT_TEST'))),30000);
if(!ready.page){console.log(JSON.stringify({ok:false,stage:'TARGET_PAGE_NOT_FOUND',targets:ready.all.map(x=>({title:x.title,url:x.url,type:x.type}))}));process.exit(0);}
const c=await connect(ready.page.webSocketDebuggerUrl);await c.send('Page.bringToFront');await sleep(1500);
if((ready.page.url||'').includes('accounts.google.com')){console.log(JSON.stringify({ok:false,stage:'LOGIN_REQUIRED',url:ready.page.url}));process.exit(0);}
if(worker==='FLOW'){
  const promptLiteral=JSON.stringify(prompt);
  const fillExpr=`(()=>{const roots=[document],q=[document],seen=new Set(q);while(q.length){const r=q.shift();let a=[];try{a=[...r.querySelectorAll('*')]}catch{};for(const e of a){if(e.shadowRoot&&!seen.has(e.shadowRoot)){seen.add(e.shadowRoot);roots.push(e.shadowRoot);q.push(e.shadowRoot)}}}const vis=e=>{if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&r.width>18&&r.height>18&&r.bottom>=0&&r.right>=0};const desc=e=>[e.getAttribute?.('aria-label'),e.getAttribute?.('placeholder'),e.getAttribute?.('data-placeholder'),e.getAttribute?.('title'),e.getAttribute?.('name'),e.id,e.textContent,e.value].filter(Boolean).join(' ').replace(/\\s+/g,' ').toLowerCase();let els=[];for(const r of roots){try{els.push(...r.querySelectorAll('textarea,input[type=text],input:not([type]),[contenteditable=true],[role=textbox]'))}catch{}}let best=null,score=-9999;for(const e of [...new Set(els)]){if(!vis(e)||e.disabled||e.readOnly)continue;const d=desc(e);let s=0;for(const w of ['prompt','describe','description','imagine','scene','video','image','create','make','what do you want','type your','enter your','프롬프트','설명','장면','영상','이미지','만들','생성','입력'])if(d.includes(w))s+=12;for(const w of ['search','find','검색','댓글','comment','title','제목','name','이름'])if(d.includes(w))s-=20;if(e.tagName==='TEXTAREA')s+=12;if(e.isContentEditable)s+=7;if(e.getAttribute?.('role')==='textbox')s+=4;const z=e.getBoundingClientRect();s+=Math.min(12,Math.round(z.width*z.height/30000));if(z.top>innerHeight*.4)s+=3;if(s>score){score=s;best=e}}if(!best)return {ok:false,stage:'PROMPT_BOX_NOT_FOUND',candidateCount:els.length};best.focus();const v=${promptLiteral};if('value' in best){const proto=best.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const set=Object.getOwnPropertyDescriptor(proto,'value')?.set;if(set)set.call(best,v);else best.value=v;}else{best.textContent=v;}try{best.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:v}))}catch{best.dispatchEvent(new Event('input',{bubbles:true}))}best.dispatchEvent(new Event('change',{bubbles:true}));return {ok:true,score,tag:best.tagName,desc:desc(best).slice(0,180)}})()`;
  const fill=await evalv(c,fillExpr);if(!fill?.ok){console.log(JSON.stringify({ok:false,stage:'FLOW_PROMPT_FILL_FAILED',fill}));process.exit(0);}await sleep(700);
  const clickExpr=`(()=>{const roots=[document],q=[document],seen=new Set(q);while(q.length){const r=q.shift();let a=[];try{a=[...r.querySelectorAll('*')]}catch{};for(const e of a){if(e.shadowRoot&&!seen.has(e.shadowRoot)){seen.add(e.shadowRoot);roots.push(e.shadowRoot);q.push(e.shadowRoot)}}}const vis=e=>{if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&r.width>16&&r.height>16};const desc=e=>[e.getAttribute?.('aria-label'),e.getAttribute?.('title'),e.textContent,e.value].filter(Boolean).join(' ').replace(/\\s+/g,' ').toLowerCase();let els=[];for(const r of roots){try{els.push(...r.querySelectorAll('button,[role=button],input[type=submit]'))}catch{}}let best=null,score=-9999;for(const e of [...new Set(els)]){if(!vis(e)||e.disabled||e.getAttribute?.('aria-disabled')==='true')continue;const d=desc(e);let s=0;for(const w of ['generate','create','make','submit','run','생성','만들기','실행'])if(d.includes(w))s+=18;for(const w of ['cancel','close','menu','share','download','delete','settings','취소','닫기','메뉴','공유','다운로드','삭제','설정'])if(d.includes(w))s-=30;if(e.tagName==='BUTTON')s+=2;if(s>score){score=s;best=e}}if(!best||score<5)return {ok:false,stage:'GENERATE_BUTTON_NOT_FOUND',bestScore:score};const d=desc(best).slice(0,180);best.click();return {ok:true,score,desc:d}})()`;
  const click=await evalv(c,clickExpr);if(!click?.ok){console.log(JSON.stringify({ok:false,stage:'FLOW_GENERATE_CLICK_FAILED',fill,click}));process.exit(0);}
  const started=Date.now();let download=null;let menuTried=false;
  while(Date.now()-started<timeoutMs){await sleep(2500);const findDownload=`(()=>{const roots=[document],q=[document],seen=new Set(q);while(q.length){const r=q.shift();let a=[];try{a=[...r.querySelectorAll('*')]}catch{};for(const e of a){if(e.shadowRoot&&!seen.has(e.shadowRoot)){seen.add(e.shadowRoot);roots.push(e.shadowRoot);q.push(e.shadowRoot)}}}const vis=e=>{if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&r.width>12&&r.height>12};const desc=e=>[e.getAttribute?.('aria-label'),e.getAttribute?.('title'),e.getAttribute?.('download'),e.textContent].filter(Boolean).join(' ').replace(/\\s+/g,' ').toLowerCase();let els=[];for(const r of roots){try{els.push(...r.querySelectorAll('button,[role=button],a'))}catch{}}let best=null,score=-9999;for(const e of [...new Set(els)]){if(!vis(e)||e.disabled)continue;const d=desc(e);let s=0;for(const w of ['download','다운로드','내려받기'])if(d.includes(w))s+=35;if(e.hasAttribute?.('download'))s+=25;for(const w of ['share','delete','cancel','공유','삭제','취소'])if(d.includes(w))s-=30;if(s>score){score=s;best=e}}if(!best||score<20)return {ok:false,bestScore:score};return {ok:true,score,desc:desc(best).slice(0,180)}})()`;
    download=await evalv(c,findDownload);if(download?.ok){const doClick=`(()=>{const all=[];const roots=[document],q=[document],seen=new Set(q);while(q.length){const r=q.shift();let a=[];try{a=[...r.querySelectorAll('*')]}catch{};for(const e of a){if(e.shadowRoot&&!seen.has(e.shadowRoot)){seen.add(e.shadowRoot);roots.push(e.shadowRoot);q.push(e.shadowRoot)}}}const vis=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>12&&r.height>12};const desc=e=>[e.getAttribute?.('aria-label'),e.getAttribute?.('title'),e.getAttribute?.('download'),e.textContent].filter(Boolean).join(' ').replace(/\\s+/g,' ').toLowerCase();for(const r of roots){try{all.push(...r.querySelectorAll('button,[role=button],a'))}catch{}}let b=null,s=-9999;for(const e of [...new Set(all)]){if(!vis(e)||e.disabled)continue;const d=desc(e);let x=0;for(const w of ['download','다운로드','내려받기'])if(d.includes(w))x+=35;if(e.hasAttribute?.('download'))x+=25;if(x>s){s=x;b=e}}if(b&&s>=20){b.click();return {ok:true,score:s,desc:desc(b).slice(0,180)}}return {ok:false,score:s}})()`;const dc=await evalv(c,doClick);console.log(JSON.stringify({ok:!!dc?.ok,stage:dc?.ok?'FLOW_DOWNLOAD_CLICKED':'FLOW_DOWNLOAD_CLICK_FAILED',fill,click,download,downloadClick:dc,url:ready.page.url}));process.exit(0);}
    if(!menuTried && Date.now()-started>15000){menuTried=true;const moreExpr=`(()=>{const vis=e=>{if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>12&&r.height>12};const desc=e=>[e.getAttribute?.('aria-label'),e.getAttribute?.('title'),e.textContent].filter(Boolean).join(' ').replace(/\\s+/g,' ').toLowerCase();const media=[...document.querySelectorAll('video,img')].filter(e=>vis(e)&&e.getBoundingClientRect().width>280&&e.getBoundingClientRect().height>180).sort((a,b)=>b.getBoundingClientRect().width*b.getBoundingClientRect().height-a.getBoundingClientRect().width*a.getBoundingClientRect().height)[0];if(!media)return {ok:false};let p=media;for(let i=0;i<6&&p;i++,p=p.parentElement){for(const b of p.querySelectorAll('button,[role=button]')){if(!vis(b))continue;const d=desc(b);if(['more','menu','options','더보기','메뉴','옵션'].some(w=>d.includes(w))){b.click();return {ok:true,desc:d.slice(0,120)}}}}return {ok:false}})()`;try{await evalv(c,moreExpr)}catch{}}
  }
  console.log(JSON.stringify({ok:false,stage:'FLOW_GENERATION_OR_DOWNLOAD_TIMEOUT',fill,click,lastDownload:download,url:ready.page.url}));process.exit(0);
}
if(worker==='FRONT_TEST'){
  const report=await evalv(c,`(()=>{const root=document.querySelector('#root,#app,main,[role=main]');const buttons=[...document.querySelectorAll('button,[role=button]')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'});const inputs=[...document.querySelectorAll('input,textarea,[contenteditable=true],[role=textbox]')].length;const imgs=[...document.images];return {schemaVersion:'1.0',url:location.href,title:document.title,readyState:document.readyState,rootFound:!!root,buttonCount:buttons.length,inputCount:inputs,imageCount:imgs.length,brokenImageCount:imgs.filter(i=>i.complete&&i.naturalWidth===0).length,bodyTextLength:(document.body?.innerText||'').length,at:new Date().toISOString()}})()`);
  console.log(JSON.stringify({ok:true,stage:'FRONT_TEST_REPORT_READY',report,url:ready.page.url}));process.exit(0);
}
console.log(JSON.stringify({ok:false,stage:'UNSUPPORTED_WORKER',worker}));
'@
  Set-Content -LiteralPath $js -Value $code -Encoding UTF8
  try{
    $out=& $node.Source $js ([string]$DebugPort) $WorkerName $TargetUrl $Prompt $OutputDir ([string]$TimeoutSeconds) 2>&1|Out-String
    $trim=$out.Trim();if(-not $trim){throw 'WORKER_CDP_EMPTY_RESULT'}
    return ($trim|ConvertFrom-Json)
  }finally{Remove-Item -LiteralPath $js -Force -ErrorAction SilentlyContinue}
}

$taskId=Safe-Name $WorkerTaskId 'WORKER_TASK_ID'
$workerName=Safe-Name $Worker 'WORKER'
$parent=$(if($WorkerParentTaskId){Safe-Name $WorkerParentTaskId 'PARENT_TASK_ID'}else{$taskId})
if($WorkerTimeoutSeconds -lt 30){$WorkerTimeoutSeconds=30};if($WorkerTimeoutSeconds -gt 900){$WorkerTimeoutSeconds=900}
$central=Find-CentralRoot;if(-not $central){throw 'CENTRAL_DRIVE_ROOT_NOT_FOUND'}
$resultId=('RESULT_'+$taskId)
$outputDir=Join-Path (Join-Path (Join-Path $central 'Worker_Results') $workerName) $taskId
New-Item -ItemType Directory -Force -Path $outputDir|Out-Null
$started=(Get-Date).ToString('o')
$target=$(if($WorkerTargetUrl){$WorkerTargetUrl}elseif($workerName -eq 'FLOW'){'https://labs.google/fx/tools/flow'}elseif($workerName -eq 'FRONT_TEST'){'https://aistudio.google.com/apps'}else{''})
if(-not $target){throw 'WORKER_TARGET_URL_REQUIRED'}
$ext=Resolve-WorkerExtension $workerName
$cdp=$null;$restoreOk=$false;$chromePath='';$killed=@()
try{
  $killed=Stop-Dedicated
  $chromePath=Start-CftWorker -Url $target -WorkerExtension $ext -Debug
  if(-not(Wait-Cdp 20)){throw 'CFT_CDP_NOT_READY'}
  $cdp=Run-WorkerCdp -WorkerName $workerName -TargetUrl $target -Prompt $WorkerPrompt -OutputDir $outputDir -TimeoutSeconds $WorkerTimeoutSeconds
  if($workerName -eq 'FLOW' -and $cdp.ok){
    $deadline=(Get-Date).AddSeconds(45);do{Start-Sleep -Seconds 2;$now=@(Get-ChildItem -LiteralPath $outputDir -File -ErrorAction SilentlyContinue|Where-Object{$_.Name -notin @('result.json','ACK.json') -and $_.Name -notlike '*.crdownload'})}while(@($now).Count -eq 0 -and (Get-Date)-lt $deadline)
  }
} catch {
  $cdp=[ordered]@{ok=$false;stage='WORKER_RUNTIME_ERROR';error=$_.Exception.Message}
}
$artifacts=@(Get-ChildItem -LiteralPath $outputDir -File -ErrorAction SilentlyContinue|Where-Object{$_.Name -notin @('result.json','ACK.json') -and $_.Name -notlike '*.crdownload'}|ForEach-Object{[ordered]@{name=$_.Name;path=$_.FullName;size=[long]$_.Length;modifiedAt=$_.LastWriteTime.ToString('o')}})
if($workerName -eq 'FRONT_TEST' -and $cdp.ok -and $cdp.report){
  $reportPath=Join-Path $outputDir 'front-test-report.json';Write-JsonAtomic $reportPath $cdp.report
  $artifacts=@([ordered]@{name='front-test-report.json';path=$reportPath;size=[long](Get-Item $reportPath).Length;modifiedAt=(Get-Item $reportPath).LastWriteTime.ToString('o')})
}
$artifactOk=(@($artifacts).Count -gt 0)
$ok=([bool]$cdp.ok -and $artifactOk)
$result=[ordered]@{
  ok=[bool]$ok;status=$(if($ok){'DONE'}else{'ERROR'});taskId=$taskId;parentTaskId=$parent;resultId=$resultId;worker=$workerName;workerAction=$WorkerAction
  startedAt=$started;completedAt=(Get-Date).ToString('o');targetUrl=$target;extensionPath=$ext;chromePath=$chromePath;normalChromeUntouched=$true
  driveCentralRoot=$central;driveRelativePath=('Worker_Results/'+$workerName+'/'+$taskId);localDriveResultPath=$outputDir;artifacts=$artifacts;cdp=$cdp
  ack=[bool]$ok;nextWorkerDecision='CENTRAL_AGENT_ONLY';error=$(if($ok){''}elseif($cdp.error){[string]$cdp.error}else{[string]$cdp.stage})
}
$resultPath=Join-Path $outputDir 'result.json';$ackPath=Join-Path $outputDir 'ACK.json'
Write-JsonAtomic $resultPath $result
$ack=[ordered]@{ack=[bool]$ok;taskId=$taskId;parentTaskId=$parent;resultId=$resultId;worker=$workerName;status=$result.status;resultPath=$resultPath;artifactCount=@($artifacts).Count;at=(Get-Date).ToString('o')}
Write-JsonAtomic $ackPath $ack
try{
  $runtime=Join-Path $central 'Runtime_Readback';New-Item -ItemType Directory -Force -Path $runtime|Out-Null
  Write-JsonAtomic (Join-Path $runtime ($taskId+'.json')) $result
}catch{}
$restoreOk=Restore-NotebookCft
$result['dedicatedRestoreOk']=[bool]$restoreOk;Write-JsonAtomic $resultPath $result
Write-Output ('CHROME_WORKER_DRIVE_HANDOFF_JSON='+($result|ConvertTo-Json -Depth 30 -Compress))
if($ok){Write-Host ('WORKER_RESULT_PATH='+$resultPath);Write-Host ('WORKER_ACK_PATH='+$ackPath)}
exit 0
