param()
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'

$Stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$Desktop=[Environment]::GetFolderPath('Desktop')
$Root=Join-Path $Desktop ('VIDEO_PRODUCTION_V7_'+$Stamp)
$Work=Join-Path $Root 'work'
New-Item -ItemType Directory -Force -Path $Root,$Work|Out-Null
$Log=Join-Path $Root 'pipeline.log'

function Log([string]$Message){
  $line='['+(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')+'] '+$Message
  Add-Content -LiteralPath $Log -Value $line -Encoding UTF8
  Write-Host $line
}
function Download([string]$Url,[string]$Path,[int]$TimeoutSec=120){
  Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Path -TimeoutSec $TimeoutSec
  if(-not(Test-Path -LiteralPath $Path)){throw ('Download failed: '+$Url)}
}
function ParseCheck([string]$Path){
  $tokens=$null
  $errors=$null
  [void][System.Management.Automation.Language.Parser]::ParseFile($Path,[ref]$tokens,[ref]$errors)
  if($errors -and $errors.Count -gt 0){
    $text=($errors|ForEach-Object{('{0}:{1} {2}' -f $_.Extent.StartLineNumber,$_.Extent.StartColumnNumber,$_.Message)}) -join ' | '
    throw ('PowerShell parser check failed for '+$Path+': '+$text)
  }
}
function QuoteArg([string]$Value){
  if($Value -match '[\s"]'){return '"'+($Value -replace '"','\"')+'"'}
  return $Value
}
function RunBounded([string]$File,[string[]]$Args,[int]$TimeoutSec,[string]$Cwd=''){
  $psi=New-Object Diagnostics.ProcessStartInfo
  $psi.FileName=$File
  $psi.WorkingDirectory=$(if($Cwd){$Cwd}else{$Work})
  $psi.UseShellExecute=$false
  $psi.RedirectStandardOutput=$true
  $psi.RedirectStandardError=$true
  $psi.CreateNoWindow=$true
  $psi.Arguments=(@($Args)|ForEach-Object{QuoteArg ([string]$_)}) -join ' '
  $p=New-Object Diagnostics.Process
  $p.StartInfo=$psi
  [void]$p.Start()
  $outTask=$p.StandardOutput.ReadToEndAsync()
  $errTask=$p.StandardError.ReadToEndAsync()
  $finished=$p.WaitForExit($TimeoutSec*1000)
  if(-not $finished){
    try{& taskkill.exe /PID $p.Id /T /F 2>$null|Out-Null}catch{try{Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue}catch{}}
    try{[void]$p.WaitForExit(5000)}catch{}
    $stdout=''
    $stderr=''
    try{$stdout=$outTask.Result}catch{}
    try{$stderr=$errTask.Result}catch{}
    return [pscustomobject]@{code=124;timedOut=$true;stdout=$stdout;stderr=$stderr}
  }
  $p.WaitForExit()
  return [pscustomobject]@{code=$p.ExitCode;timedOut=$false;stdout=$outTask.Result;stderr=$errTask.Result}
}
function ReadJson([string]$Path){
  if(-not(Test-Path -LiteralPath $Path)){return $null}
  try{return Get-Content -LiteralPath $Path -Raw -Encoding UTF8|ConvertFrom-Json}catch{return $null}
}
function FindCentralDriveFolder{
  $target='00_중앙에이전트'
  foreach($drive in @(Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue)){
    $root=[string]$drive.Root
    if(-not $root){continue}
    $candidates=New-Object System.Collections.Generic.List[string]
    [void]$candidates.Add((Join-Path $root $target))
    [void]$candidates.Add((Join-Path $root ('My Drive\'+$target)))
    [void]$candidates.Add((Join-Path $root ('내 드라이브\'+$target)))
    [void]$candidates.Add((Join-Path $root ('Google Drive\'+$target)))
    foreach($candidate in $candidates){if(Test-Path -LiteralPath $candidate){return $candidate}}
  }
  $userCandidates=New-Object System.Collections.Generic.List[string]
  [void]$userCandidates.Add((Join-Path $env:USERPROFILE ('My Drive\'+$target)))
  [void]$userCandidates.Add((Join-Path $env:USERPROFILE ('내 드라이브\'+$target)))
  [void]$userCandidates.Add((Join-Path $env:USERPROFILE ('Google Drive\'+$target)))
  foreach($candidate in $userCandidates){if(Test-Path -LiteralPath $candidate){return $candidate}}
  return ''
}
function EnsureFfmpeg{
  $ff=Get-Command ffmpeg.exe -ErrorAction SilentlyContinue
  $fp=Get-Command ffprobe.exe -ErrorAction SilentlyContinue
  if($ff -and $fp){return [pscustomobject]@{ok=$true;source='PATH';bin=(Split-Path $ff.Source -Parent)}}
  $tools=Join-Path $env:LOCALAPPDATA 'HomeDesignAutomationV7\Tools\ffmpeg'
  $zip=Join-Path $tools 'ffmpeg-release-essentials.zip'
  $extract=Join-Path $tools 'current'
  New-Item -ItemType Directory -Force -Path $tools|Out-Null
  if(Test-Path -LiteralPath $extract){Remove-Item -LiteralPath $extract -Recurse -Force -ErrorAction SilentlyContinue}
  Log 'FFmpeg not found. Download portable FFmpeg to user folder.'
  Download 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' $zip 300
  Expand-Archive -LiteralPath $zip -DestinationPath $extract -Force
  $ffFile=Get-ChildItem -LiteralPath $extract -Recurse -Filter ffmpeg.exe -File -ErrorAction SilentlyContinue|Select-Object -First 1
  $fpFile=Get-ChildItem -LiteralPath $extract -Recurse -Filter ffprobe.exe -File -ErrorAction SilentlyContinue|Select-Object -First 1
  if(-not $ffFile -or -not $fpFile){throw 'Portable FFmpeg extraction failed'}
  $env:PATH=$ffFile.Directory.FullName+';'+$env:PATH
  return [pscustomobject]@{ok=$true;source='PORTABLE_GYAN';bin=$ffFile.Directory.FullName}
}

Write-Host ''
Write-Host '============================================================'
Write-Host 'HomeDesign Video Production V7'
Write-Host 'Parser-gated direct E2E'
Write-Host '============================================================'

$summary=[ordered]@{
  ok=$false
  status='STARTING'
  startedAt=(Get-Date).ToString('o')
  ffmpegSource=''
  renderStatus=''
  qa1Status=''
  qa2Status=''
  animationE2E=''
  video=''
  outputDir=''
  visualReviewPending=$true
  errors=New-Object System.Collections.Generic.List[string]
}

$renderer=Join-Path $Work 'Render-VideoProductionManifest.ps1'
$qa=Join-Path $Work 'Run-VideoFrameQA.ps1'
$e2e=Join-Path $Work 'Run-AnimationTestDeploymentE2E.ps1'
Download 'https://raw.githubusercontent.com/8friend8ship-cloud/animation/codex/video-promo-agent-workflow-20260823/tools/Render-VideoProductionManifest.ps1' $renderer 120
Download 'https://raw.githubusercontent.com/8friend8ship-cloud/animation/codex/video-promo-agent-workflow-20260823/tools/Run-VideoFrameQA.ps1' $qa 120
Download 'https://raw.githubusercontent.com/8friend8ship-cloud/animation/codex/video-promo-agent-workflow-20260823/tools/Run-AnimationTestDeploymentE2E.ps1' $e2e 120
ParseCheck $renderer
ParseCheck $qa
ParseCheck $e2e
Log 'Parser preflight PASS for renderer, frame QA and Animation E2E.'

$manifestJson=@'
{
  "manifestVersion":"VIDEO_PRODUCTION_MANIFEST_V1_20260824",
  "assetId":"AGENT_DASHBOARD_PROMO_CONTENTOS_E2E_20260824",
  "templateId":"AGENT_DASHBOARD_PROMO_E2E_V1",
  "complexityClass":"DEMO",
  "canvas":{"aspect":"9:16","width":1080,"height":1920,"fps":30},
  "targetApps":["APP_CONTENT_OS"],
  "script":"콘텐츠 오에스가 실제 화면에서 어떻게 작동하는지 보여드립니다. 검색과 분석 화면을 실제 서비스에서 확인합니다. 입력부터 결과까지 핵심 흐름을 짧게 따라갑니다. 반복 작업을 줄이고 결과를 한곳에서 관리합니다. 실제 동작을 확인해 보세요.",
  "shots":[
    {"shotId":"SHOT_01","blockId":"HOOK","startSec":0,"endSec":3,"visualRule":"TITLE_CARD","screenProofRequired":false,"sourceCandidates":"","voiceLine":"콘텐츠 오에스가 실제 화면에서 어떻게 작동하는지 보여드립니다.","captionText":"콘텐츠 OS 실제 작동 화면","transition":"NONE","qa":["SAFE_AREA","CAPTION_READABLE","NO_SECRET"]},
    {"shotId":"SHOT_02","blockId":"PROOF","startSec":3,"endSec":7,"visualRule":"SHOW_REAL_UI","screenProofRequired":true,"sourceCandidates":"https://contents-os.com","voiceLine":"검색과 분석 화면을 실제 서비스에서 확인합니다.","captionText":"실제 Production 화면 확인","transition":"CUT","qa":["SAFE_AREA","CAPTION_READABLE","NO_SECRET","SOURCE_PRESENT"]},
    {"shotId":"SHOT_03","blockId":"WORKFLOW","startSec":7,"endSec":12,"visualRule":"SHOW_WORKFLOW_UI","screenProofRequired":true,"sourceCandidates":"https://contents-os.com","voiceLine":"입력부터 결과까지 핵심 흐름을 짧게 따라갑니다.","captionText":"입력 → 분석 → 결과 흐름","transition":"CUT","qa":["SAFE_AREA","CAPTION_READABLE","NO_SECRET","SOURCE_PRESENT"]},
    {"shotId":"SHOT_04","blockId":"VALUE","startSec":12,"endSec":17,"visualRule":"SHOW_RESULT_UI","screenProofRequired":true,"sourceCandidates":"https://contents-os.com","voiceLine":"반복 작업을 줄이고 결과를 한곳에서 관리합니다.","captionText":"반복 작업 감소 · 결과 통합 관리","transition":"CUT","qa":["SAFE_AREA","CAPTION_READABLE","NO_SECRET","SOURCE_PRESENT"]},
    {"shotId":"SHOT_05","blockId":"CTA","startSec":17,"endSec":20,"visualRule":"CTA_CARD","screenProofRequired":false,"sourceCandidates":"","voiceLine":"실제 동작을 확인해 보세요.","captionText":"실제 동작을 확인해 보세요","transition":"CUT","qa":["SAFE_AREA","CAPTION_READABLE","NO_SECRET"]}
  ],
  "assetPlan":{"reuseFirst":true,"screenCapture":true,"generatedVisualAllowed":false},
  "voicePlan":{"policy":"TTS_FREE_FIRST","language":"ko-KR","lines":[
    {"shotId":"SHOT_01","text":"콘텐츠 오에스가 실제 화면에서 어떻게 작동하는지 보여드립니다."},
    {"shotId":"SHOT_02","text":"검색과 분석 화면을 실제 서비스에서 확인합니다."},
    {"shotId":"SHOT_03","text":"입력부터 결과까지 핵심 흐름을 짧게 따라갑니다."},
    {"shotId":"SHOT_04","text":"반복 작업을 줄이고 결과를 한곳에서 관리합니다."},
    {"shotId":"SHOT_05","text":"실제 동작을 확인해 보세요."}
  ]},
  "captionPlan":{"format":"SRT_OR_ASS","safeArea":true,"maxLines":2,"items":[
    {"shotId":"SHOT_01","startSec":0,"endSec":3,"text":"콘텐츠 OS 실제 작동 화면"},
    {"shotId":"SHOT_02","startSec":3,"endSec":7,"text":"실제 Production 화면 확인"},
    {"shotId":"SHOT_03","startSec":7,"endSec":12,"text":"입력 → 분석 → 결과 흐름"},
    {"shotId":"SHOT_04","startSec":12,"endSec":17,"text":"반복 작업 감소 · 결과 통합 관리"},
    {"shotId":"SHOT_05","startSec":17,"endSec":20,"text":"실제 동작을 확인해 보세요"}
  ]},
  "renderPlan":{"engine":"LOCAL_FFMPEG","output":"MP4_H264_AAC","failedShotOnlyRegen":true},
  "qaPlan":["FRAME_QA","CAPTION_QA","AUDIO_QA","SECRET_SCAN","SCREEN_PROOF_QA","FAILED_SHOT_ONLY_REGEN"]
}
'@
[void]($manifestJson|ConvertFrom-Json)
$manifestFile=Join-Path $Root 'production-manifest.json'
Set-Content -LiteralPath $manifestFile -Value $manifestJson -Encoding UTF8
Log 'Manifest JSON parse PASS.'

try{
  $ff=EnsureFfmpeg
  $summary.ffmpegSource=[string]$ff.source
  Log ('FFmpeg ready: '+$summary.ffmpegSource)
}catch{
  [void]$summary.errors.Add('FFMPEG: '+$_.Exception.Message)
  Log ('FFMPEG ERROR: '+$_.Exception.Message)
}

$central=FindCentralDriveFolder
if($central){$OutDir=Join-Path $central 'Video_Production\2026\08\AGENT_DASHBOARD_PROMO_FIRST_MP4_20260824'}else{$OutDir=Join-Path $Root 'render'}
New-Item -ItemType Directory -Force -Path $OutDir|Out-Null
$summary.outputDir=$OutDir

if($summary.ffmpegSource){
  try{
    Log 'Render actual ContentOS UI MP4.'
    $videoName='2026-08-24_AGENT_DASHBOARD_PROMO_CONTENTOS_E2E_V1.mp4'
    $r=RunBounded 'powershell.exe' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$renderer,'-ManifestJson',$manifestJson,'-OutputDir',$OutDir,'-OutputName',$videoName,'-UseCentralDrive') 540 $Work
    ($r.stdout+"`r`n"+$r.stderr)|Set-Content (Join-Path $Root 'render-console.txt') -Encoding UTF8
    $rr=ReadJson (Join-Path $OutDir 'render-result.json')
    $video=Join-Path $OutDir $videoName
    if(Test-Path -LiteralPath $video){$summary.video=$video}
    if($rr){$summary.renderStatus=[string]$rr.status}else{$summary.renderStatus='NO_RENDER_RESULT'}
    Log ('Render status: '+$summary.renderStatus)
  }catch{
    [void]$summary.errors.Add('RENDER: '+$_.Exception.Message)
    Log ('RENDER ERROR: '+$_.Exception.Message)
  }
}

if($summary.video -and (Test-Path -LiteralPath $summary.video)){
  try{
    Log 'Frame-QA Pass 1.'
    $qa1Dir=Join-Path $OutDir 'QA_PASS_1'
    $r1=RunBounded 'powershell.exe' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$qa,'-VideoPath',$summary.video,'-ManifestJson',$manifestJson,'-PassNumber','1','-OutputDir',$qa1Dir) 210 $Work
    $q1=ReadJson (Join-Path $qa1Dir '00_FRAME_QA_SUMMARY.json')
    if($q1){$summary.qa1Status=[string]$q1.status}else{$summary.qa1Status='NO_QA_RESULT'}
    Log ('QA1: '+$summary.qa1Status)

    Log 'Frame-QA Pass 2.'
    $qa2Dir=Join-Path $OutDir 'QA_PASS_2'
    $r2=RunBounded 'powershell.exe' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$qa,'-VideoPath',$summary.video,'-ManifestJson',$manifestJson,'-PassNumber','2','-OutputDir',$qa2Dir) 210 $Work
    $q2=ReadJson (Join-Path $qa2Dir '00_FRAME_QA_SUMMARY.json')
    if($q2){$summary.qa2Status=[string]$q2.status}else{$summary.qa2Status='NO_QA_RESULT'}
    Log ('QA2: '+$summary.qa2Status)
  }catch{
    [void]$summary.errors.Add('FRAME_QA: '+$_.Exception.Message)
    Log ('FRAME QA ERROR: '+$_.Exception.Message)
  }
}

try{
  Log 'Animation Apps Script E2E.'
  $er=RunBounded 'powershell.exe' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$e2e,'-ScriptId','14APk3L_PDBaDwUvuqzF2huGZFRKiv8CpTNLV4aYz68pkIdXRiTZ6mnmH') 780 $Work
  ($er.stdout+"`r`n"+$er.stderr)|Set-Content (Join-Path $Root 'animation-e2e-console.txt') -Encoding UTF8
  if($er.code -eq 0){$summary.animationE2E='PASS'}else{$summary.animationE2E=('CHECK_EXIT_'+$er.code)}
  Log ('Animation E2E: '+$summary.animationE2E)
}catch{
  [void]$summary.errors.Add('ANIMATION_E2E: '+$_.Exception.Message)
  $summary.animationE2E='CHECK'
  Log ('ANIMATION E2E ERROR: '+$_.Exception.Message)
}

$renderPass=($summary.video -and (Test-Path -LiteralPath $summary.video) -and $summary.renderStatus -match 'PASS|COMPLETED|RENDERED|DONE')
$qa1Pass=($summary.qa1Status -match 'PASS')
$qa2Pass=($summary.qa2Status -match 'PASS')
$summary.ok=[bool]($renderPass -and $qa1Pass -and $qa2Pass)
if($summary.ok -and $summary.animationE2E -eq 'PASS'){$summary.status='MP4_TECHNICAL_QA_X2_AND_ANIMATION_E2E_PASS_VISUAL_REVIEW_PENDING'}
elseif($summary.ok){$summary.status='MP4_TECHNICAL_QA_X2_PASS_ANIMATION_E2E_CHECK_VISUAL_REVIEW_PENDING'}
else{$summary.status='PIPELINE_CHECK_REQUIRED'}
$summary.completedAt=(Get-Date).ToString('o')
$resultFile=Join-Path $Root 'VIDEO_PRODUCTION_V7_RESULT.json'
$summary|ConvertTo-Json -Depth 20|Set-Content -LiteralPath $resultFile -Encoding UTF8
try{$summary|ConvertTo-Json -Depth 20|Set-Content -LiteralPath (Join-Path $OutDir 'VIDEO_PRODUCTION_V7_RESULT.json') -Encoding UTF8}catch{}

Write-Host ''
Write-Host '============================================================'
Write-Host ('PIPELINE RESULT: '+$summary.status)
Write-Host ('MP4: '+$summary.video)
Write-Host ('Render: '+$summary.renderStatus)
Write-Host ('QA1: '+$summary.qa1Status)
Write-Host ('QA2: '+$summary.qa2Status)
Write-Host ('Animation E2E: '+$summary.animationE2E)
Write-Host ('Result: '+$resultFile)
Write-Host '============================================================'
if($summary.ok){exit 0}else{exit 1}
