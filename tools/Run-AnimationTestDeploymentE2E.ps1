param(
  [string]$ScriptId='14APk3L_PDBaDwUvuqzF2huGZFRKiv8CpTNLV4aYz68pkIdXRiTZ6mnmH'
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$Stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$Root=Join-Path $env:LOCALAPPDATA "AnimationCentralE2E\$Stamp"
$ResultDir=Join-Path $Root 'result'
$WorkDir=Join-Path $Root 'work'
New-Item -ItemType Directory -Force -Path $ResultDir,$WorkDir|Out-Null

function Native([string]$cmd,[string[]]$args,[string]$cwd){
  Push-Location $cwd
  $old=$ErrorActionPreference;$ErrorActionPreference='Continue'
  try{$text=(& $cmd @args 2>&1|Out-String);$code=$LASTEXITCODE;return [pscustomobject]@{text=$text;code=$code}}
  finally{$ErrorActionPreference=$old;Pop-Location}
}
function PostJson([string]$url,$obj){
  $json=$obj|ConvertTo-Json -Depth 20 -Compress
  return Invoke-RestMethod -Uri $url -Method Post -ContentType 'text/plain;charset=utf-8' -Body $json -TimeoutSec 30
}

$clasp=(Get-Command clasp -ErrorAction Stop).Source
$clone=Native $clasp @('clone',$ScriptId) $WorkDir
if($clone.code -ne 0){throw "clasp clone failed: $($clone.code)"}
$backup=Join-Path $ResultDir "BEFORE_ROUTER_PATCH_$ScriptId.zip"
Compress-Archive -Path (Join-Path $WorkDir '*') -DestinationPath $backup -Force

$codeFile=Get-ChildItem $WorkDir -File -Recurse|Where-Object{$_.Name -in @('Code.js','Code.gs')}|Select-Object -First 1
if(-not $codeFile){throw 'Code.js/Code.gs not found'}
$code=Get-Content $codeFile.FullName -Raw
$posts=[regex]::Matches($code,'(?m)^\s*function\s+doPost\s*\(\s*e\s*\)\s*\{')
if($posts.Count -lt 1){throw 'doPost not found'}
$lastStart=$posts[$posts.Count-1].Index
$prefix=$code.Substring(0,$lastStart)
$block=$code.Substring($lastStart)
$marker='VIDEO_AGENT_ROUTER_BRIDGE_V1_20260824'
if(-not $block.Contains($marker)){
  $m=[regex]::Match($block,'(?m)^(\s*(?:const|let|var)\s+action\s*=.*?;\s*)$')
  if(-not $m.Success){throw 'action assignment not found in last doPost'}
  $indent='    ';if($m.Groups[1].Value -match '^(\s*)'){$indent=$Matches[1]}
  $bridge="`n${indent}// $marker`n${indent}const videoAgentAction = String(action || '').trim().toUpperCase();`n${indent}const videoAgentActions = ['STATUS','QUEUE_APP_WORKFLOW','QUEUE_TEMPLATE_AGENT','REGISTER_ENGAGEMENT_CAMPAIGN','INGEST_ENGAGEMENT_EVENT','PROCESS_VIDEO_PROMO_QUEUE','PROCESS_ENGAGEMENT_EVENTS'];`n${indent}if (videoAgentActions.indexOf(videoAgentAction) >= 0) {`n${indent}  const videoAgentResult = handleVideoAgentRequest(Object.assign({}, body || {}, { action: videoAgentAction }));`n${indent}  return ContentService.createTextOutput(JSON.stringify(videoAgentResult)).setMimeType(ContentService.MimeType.JSON);`n${indent}}`n"
  $block=$block.Insert($m.Index+$m.Length,$bridge)
  Set-Content $codeFile.FullName ($prefix+$block) -Encoding UTF8
}

$after=Get-Content $codeFile.FullName -Raw
if(([regex]::Matches($after,$marker)).Count -ne 1){throw 'router bridge marker safety check failed'}
if(([regex]::Matches($after,'(?m)^\s*function\s+doPost\s*\(')).Count -ne $posts.Count){throw 'doPost count changed unexpectedly'}

$push=Native $clasp @('push','-f') $WorkDir
if($push.code -ne 0){throw "clasp push failed: $($push.code)"}

$sourcePass=$true
for($i=1;$i -le 2;$i++){
  $pull=Native $clasp @('pull') $WorkDir
  $all='';Get-ChildItem $WorkDir -File -Recurse|ForEach-Object{try{$all+="`n"+(Get-Content $_.FullName -Raw)}catch{}}
  if($pull.code -ne 0 -or $all -notmatch $marker -or $all -notmatch 'VIDEO_AGENT_DISPATCHER_V3_20260824'){$sourcePass=$false}
  Start-Sleep -Seconds 2
}
if(-not $sourcePass){throw 'source readback x2 failed'}

$desc='animation-video-agent-central-e2e-'+$Stamp
$dep=Native $clasp @('deploy','--description',$desc) $WorkDir
if($dep.code -ne 0){throw "test deploy failed: $($dep.code)"}
$deploymentId=''
if($dep.text -match '(AKfycb[A-Za-z0-9_-]+)'){$deploymentId=$Matches[1]}
if(-not $deploymentId){
  $deps=Native $clasp @('deployments') $WorkDir
  foreach($line in ($deps.text -split "`r?`n")){if($line -match '(AKfycb[A-Za-z0-9_-]+).*'+[regex]::Escape($desc)){$deploymentId=$Matches[1];break}}
}
if(-not $deploymentId){throw 'test deployment ID not found'}
$url="https://script.google.com/macros/s/$deploymentId/exec"

$statusRows=@()
for($i=1;$i -le 2;$i++){
  try{$r=PostJson $url @{action='STATUS'};$ok=($r.ok -eq $true -and [string]$r.version -eq 'VIDEO_AGENT_DISPATCHER_V3_20260824');$statusRows+=@{attempt=$i;ok=$ok;response=$r}}
  catch{$statusRows+=@{attempt=$i;ok=$false;error=$_.Exception.Message}}
  Start-Sleep -Seconds 2
}
$statusPass=@($statusRows|Where-Object{$_.ok}).Count -eq 2

$queueRows=@()
if($statusPass){
  for($i=1;$i -le 2;$i++){
    try{$r=PostJson $url @{action='QUEUE_TEMPLATE_AGENT';templateAgentId='AGENT_DASHBOARD_PROMO';targetApps=@('APP_ANIMATION');qa=$true;apiPolicy='API_FREE_FIRST';source='CENTRAL_LOCAL_AGENT_E2E'};$ok=($r.ok -eq $true);$queueRows+=@{attempt=$i;ok=$ok;response=$r}}
    catch{$queueRows+=@{attempt=$i;ok=$false;error=$_.Exception.Message}}
    Start-Sleep -Seconds 2
  }
}
$queuePass=$statusPass -and (@($queueRows|Where-Object{$_.ok}).Count -eq 2)

$summary=[ordered]@{
  ok=($sourcePass -and $statusPass -and $queuePass)
  scriptId=$ScriptId
  routerPatch='PASS'
  push='PASS'
  sourceReadbackX2='PASS'
  testDeploymentId=$deploymentId
  testWebAppUrl=$url
  statusX2=$(if($statusPass){'PASS'}else{'FAIL'})
  queueTemplateAgentX2=$(if($queuePass){'PASS'}else{'FAIL'})
  oldDeploymentsUpdated=$false
  oldDeploymentsDeleted=$false
  backup=$backup
  at=(Get-Date).ToString('o')
}
$summary|ConvertTo-Json -Depth 20|Set-Content (Join-Path $ResultDir '00_TEST_DEPLOY_SUMMARY.json') -Encoding UTF8
$summary|ConvertTo-Json -Depth 20 -Compress|Write-Output
if(-not $summary.ok){exit 40}
exit 0
