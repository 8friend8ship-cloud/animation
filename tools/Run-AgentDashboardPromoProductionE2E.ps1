param()
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$Stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$Base=Join-Path $env:LOCALAPPDATA 'AnimationProductionE2E'
$Work=Join-Path $Base ('work-'+$Stamp)
New-Item -ItemType Directory -Force -Path $Work|Out-Null

function Find-CentralDriveFolder{
  $target='00_중앙에이전트'
  $roots=@()
  try{$roots+=@(Get-PSDrive -PSProvider FileSystem|ForEach-Object{$_.Root})}catch{}
  $roots+=@((Join-Path $env:USERPROFILE 'My Drive'),(Join-Path $env:USERPROFILE '내 드라이브'),(Join-Path $env:USERPROFILE 'Google Drive'))
  foreach($root in @($roots|Where-Object{$_ -and (Test-Path -LiteralPath $_)}|Select-Object -Unique)){
    foreach($p in @((Join-Path $root $target),(Join-Path $root ('My Drive\'+$target)),(Join-Path $root ('내 드라이브\'+$target)),(Join-Path $root ('Google Drive\'+$target))){if(Test-Path -LiteralPath $p){return $p}}
  }
  foreach($root in @($roots|Where-Object{$_ -and (Test-Path -LiteralPath $_)}|Select-Object -Unique)){
    try{foreach($d1 in @(Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue|Select-Object -First 80)){if($d1.Name -eq $target){return $d1.FullName};foreach($d2 in @(Get-ChildItem -LiteralPath $d1.FullName -Directory -ErrorAction SilentlyContinue|Select-Object -First 80)){if($d2.Name -eq $target){return $d2.FullName}}}}catch{}
  }
  return ''
}
function QuoteArg([string]$s){if($s -match '[\s"]'){return '"'+($s -replace '"','\"')+'"'};return $s}
function RunBounded([string]$file,[string[]]$args,[int]$timeoutSec){
  $psi=New-Object Diagnostics.ProcessStartInfo;$psi.FileName=$file;$psi.WorkingDirectory=$Work;$psi.UseShellExecute=$false;$psi.RedirectStandardOutput=$true;$psi.RedirectStandardError=$true;$psi.CreateNoWindow=$true;$psi.Arguments=(@($args)|ForEach-Object{QuoteArg ([string]$_)})-join ' '
  $p=New-Object Diagnostics.Process;$p.StartInfo=$psi;[void]$p.Start();$outTask=$p.StandardOutput.ReadToEndAsync();$errTask=$p.StandardError.ReadToEndAsync();$finished=$p.WaitForExit($timeoutSec*1000)
  if(-not $finished){try{& taskkill.exe /PID $p.Id /T /F 2>$null|Out-Null}catch{try{Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue}catch{}};try{[void]$p.WaitForExit(5000)}catch{};$o='';$e='';try{$o=$outTask.Result}catch{};try{$e=$errTask.Result}catch{};return [pscustomobject]@{code=124;timedOut=$true;stdout=$o;stderr=$e}}
  $p.WaitForExit();return [pscustomobject]@{code=$p.ExitCode;timedOut=$false;stdout=$outTask.Result;stderr=$errTask.Result}
}
function Download([string]$url,[string]$path){Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $path -TimeoutSec 60;if(-not(Test-Path $path)){throw "Download failed: $url"}}
function ReadJson([string]$path){if(-not(Test-Path $path)){return $null};try{return Get-Content $path -Raw -Encoding UTF8|ConvertFrom-Json}catch{return $null}}

$central=Find-CentralDriveFolder
if($central){$OutDir=Join-Path $central 'Video_Production\2026\08\AGENT_DASHBOARD_PROMO_FIRST_MP4_20260824'}else{$OutDir=Join-Path ([Environment]::GetFolderPath('Desktop')) 'AGENT_DASHBOARD_PROMO_FIRST_MP4_20260824'}
New-Item -ItemType Directory -Force -Path $OutDir|Out-Null

$manifest=[ordered]@{
  manifestVersion='VIDEO_PRODUCTION_MANIFEST_V1_20260824';assetId='AGENT_DASHBOARD_PROMO_CONTENTOS_E2E_20260824';templateId='AGENT_DASHBOARD_PROMO_E2E_V1';complexityClass='DEMO';canvas=[ordered]@{aspect='9:16';width=1080;height=1920;fps=30};targetApps=@('APP_CONTENT_OS');
  script='콘텐츠 오에스가 실제 화면에서 어떻게 작동하는지 보여드립니다. 검색과 분석 화면을 실제 서비스에서 확인합니다. 입력부터 결과까지 핵심 흐름을 짧게 따라갑니다. 반복 작업을 줄이고 결과를 한곳에서 관리합니다. 실제 동작을 확인해 보세요.';
  shots=@(
    [ordered]@{shotId='SHOT_01';blockId='HOOK';startSec=0;endSec=3;visualRule='TITLE_CARD';screenProofRequired=$false;sourceCandidates='';voiceLine='콘텐츠 오에스가 실제 화면에서 어떻게 작동하는지 보여드립니다.';captionText='콘텐츠 OS 실제 작동 화면';transition='NONE';qa=@('SAFE_AREA','CAPTION_READABLE','NO_SECRET')},
    [ordered]@{shotId='SHOT_02';blockId='PROOF';startSec=3;endSec=7;visualRule='SHOW_REAL_UI';screenProofRequired=$true;sourceCandidates='https://contents-os.com';voiceLine='검색과 분석 화면을 실제 서비스에서 확인합니다.';captionText='실제 Production 화면 확인';transition='CUT';qa=@('SAFE_AREA','CAPTION_READABLE','NO_SECRET','SOURCE_PRESENT')},
    [ordered]@{shotId='SHOT_03';blockId='WORKFLOW';startSec=7;endSec=12;visualRule='SHOW_WORKFLOW_UI';screenProofRequired=$true;sourceCandidates='https://contents-os.com';voiceLine='입력부터 결과까지 핵심 흐름을 짧게 따라갑니다.';captionText='입력 → 분석 → 결과 흐름';transition='CUT';qa=@('SAFE_AREA','CAPTION_READABLE','NO_SECRET','SOURCE_PRESENT')},
    [ordered]@{shotId='SHOT_04';blockId='VALUE';startSec=12;endSec=17;visualRule='SHOW_RESULT_UI';screenProofRequired=$true;sourceCandidates='https://contents-os.com';voiceLine='반복 작업을 줄이고 결과를 한곳에서 관리합니다.';captionText='반복 작업 감소 · 결과 통합 관리';transition='CUT';qa=@('SAFE_AREA','CAPTION_READABLE','NO_SECRET','SOURCE_PRESENT')},
    [ordered]@{shotId='SHOT_05';blockId='CTA';startSec=17;endSec=20;visualRule='CTA_CARD';screenProofRequired=$false;sourceCandidates='';voiceLine='실제 동작을 확인해 보세요.';captionText='실제 동작을 확인해 보세요';transition='CUT';qa=@('SAFE_AREA','CAPTION_READABLE','NO_SECRET')}
  );
  assetPlan=[ordered]@{reuseFirst=$true;screenCapture=$true;generatedVisualAllowed=$false};
  voicePlan=[ordered]@{policy='TTS_FREE_FIRST';language='ko-KR';lines=@([ordered]@{shotId='SHOT_01';text='콘텐츠 오에스가 실제 화면에서 어떻게 작동하는지 보여드립니다.'},[ordered]@{shotId='SHOT_02';text='검색과 분석 화면을 실제 서비스에서 확인합니다.'},[ordered]@{shotId='SHOT_03';text='입력부터 결과까지 핵심 흐름을 짧게 따라갑니다.'},[ordered]@{shotId='SHOT_04';text='반복 작업을 줄이고 결과를 한곳에서 관리합니다.'},[ordered]@{shotId='SHOT_05';text='실제 동작을 확인해 보세요.'})};
  captionPlan=[ordered]@{format='SRT_OR_ASS';safeArea=$true;maxLines=2;items=@([ordered]@{shotId='SHOT_01';startSec=0;endSec=3;text='콘텐츠 OS 실제 작동 화면'},[ordered]@{shotId='SHOT_02';startSec=3;endSec=7;text='실제 Production 화면 확인'},[ordered]@{shotId='SHOT_03';startSec=7;endSec=12;text='입력 → 분석 → 결과 흐름'},[ordered]@{shotId='SHOT_04';startSec=12;endSec=17;text='반복 작업 감소 · 결과 통합 관리'},[ordered]@{shotId='SHOT_05';startSec=17;endSec=20;text='실제 동작을 확인해 보세요'})};
  renderPlan=[ordered]@{engine='LOCAL_FFMPEG';output='MP4_H264_AAC';failedShotOnlyRegen=$true};qaPlan=@('FRAME_QA','CAPTION_QA','AUDIO_QA','SECRET_SCAN','SCREEN_PROOF_QA','FAILED_SHOT_ONLY_REGEN')
}
$manifestJson=$manifest|ConvertTo-Json -Depth 30 -Compress
$manifest|ConvertTo-Json -Depth 30|Set-Content (Join-Path $OutDir 'production-manifest.json') -Encoding UTF8
$renderer=Join-Path $Work 'Render-VideoProductionManifest.ps1';$qa=Join-Path $Work 'Run-VideoFrameQA.ps1'
Download 'https://raw.githubusercontent.com/8friend8ship-cloud/animation/codex/video-promo-agent-workflow-20260823/tools/Render-VideoProductionManifest.ps1' $renderer
Download 'https://raw.githubusercontent.com/8friend8ship-cloud/animation/codex/video-promo-agent-workflow-20260823/tools/Run-VideoFrameQA.ps1' $qa

$videoName='2026-08-24_AGENT_DASHBOARD_PROMO_CONTENTOS_E2E_V1.mp4'
$r=RunBounded 'powershell.exe' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$renderer,'-ManifestJson',$manifestJson,'-OutputDir',$OutDir,'-OutputName',$videoName,'-UseCentralDrive') 480
($r.stdout+"`r`n"+$r.stderr)|Set-Content (Join-Path $OutDir 'render-console.txt') -Encoding UTF8
$render=ReadJson (Join-Path $OutDir 'render-result.json');$video=Join-Path $OutDir $videoName
if($r.code -ne 0 -or -not $render -or -not $render.ok -or -not(Test-Path $video)){throw "Renderer failed exit=$($r.code) status=$(if($render){$render.status}else{'NO_RESULT'})"}

$qa1Dir=Join-Path $OutDir 'QA_PASS_1';$q1r=RunBounded 'powershell.exe' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$qa,'-VideoPath',$video,'-ManifestJson',$manifestJson,'-PassNumber','1','-OutputDir',$qa1Dir) 180;$q1=ReadJson (Join-Path $qa1Dir '00_FRAME_QA_SUMMARY.json')
if($q1r.code -ne 0 -or -not $q1){throw 'Frame QA pass 1 execution failed'}
$qa2Dir=Join-Path $OutDir 'QA_PASS_2';$q2r=RunBounded 'powershell.exe' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$qa,'-VideoPath',$video,'-ManifestJson',$manifestJson,'-PassNumber','2','-OutputDir',$qa2Dir) 180;$q2=ReadJson (Join-Path $qa2Dir '00_FRAME_QA_SUMMARY.json')
if($q2r.code -ne 0 -or -not $q2){throw 'Frame QA pass 2 execution failed'}

$summary=[ordered]@{ok=([bool]$render.ok -and [bool]$q1.ok -and [bool]$q2.ok);status=$(if($q1.ok -and $q2.ok){'TECHNICAL_QA_X2_PASS_VISUAL_REVIEW_PENDING'}else{'TECHNICAL_QA_FAIL'});assetId=$manifest.assetId;video=$video;outputDir=$OutDir;centralDrive=$central;renderStatus=$render.status;audioMode=$render.audioMode;captionMode=$render.captionMode;qa1Status=$q1.status;qa2Status=$q2.status;qa1FailedShotIds=@($q1.failedShotIds);qa2FailedShotIds=@($q2.failedShotIds);visualReviewPending=$true;visualReviewPackage1=(Join-Path $qa1Dir '01_VISUAL_REVIEW_PACKAGE.json');visualReviewPackage2=(Join-Path $qa2Dir '01_VISUAL_REVIEW_PACKAGE.json');at=(Get-Date).ToString('o')}
$summary|ConvertTo-Json -Depth 30|Set-Content (Join-Path $OutDir '00_AGENT_DASHBOARD_PROMO_E2E_SUMMARY.json') -Encoding UTF8
$summary|ConvertTo-Json -Compress -Depth 30
if(-not $summary.ok){exit 40}
