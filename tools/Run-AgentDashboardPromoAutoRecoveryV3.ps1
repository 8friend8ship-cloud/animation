param()
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$RootBase=Join-Path $env:LOCALAPPDATA 'HomeDesignAutomationV7\VideoProduction'
$RunRoot=Join-Path $RootBase ('AUTO_QA_V3_'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
$Out=Join-Path $RunRoot 'out'
New-Item -ItemType Directory -Force -Path $Out|Out-Null
$Log=Join-Path $RunRoot 'auto-qa.log'
function L([string]$M){Add-Content -LiteralPath $Log -Value ('['+(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')+'] '+$M) -Encoding UTF8}
function Q([string]$S){if($S -match '[\s"]'){return '"'+($S -replace '"','\"')+'"'};return $S}
function KillTree([int]$ProcessId){try{& taskkill.exe /PID $ProcessId /T /F 2>$null|Out-Null}catch{try{Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue}catch{}}}
function RunP([string]$Exe,[string[]]$Args,[int]$Timeout,[string]$Cwd,[string]$LogPath){
  $Psi=New-Object Diagnostics.ProcessStartInfo;$Psi.FileName=$Exe;$Psi.WorkingDirectory=$Cwd;$Psi.UseShellExecute=$false;$Psi.CreateNoWindow=$true;$Psi.RedirectStandardOutput=$true;$Psi.RedirectStandardError=$true;$Psi.Arguments=(@($Args)|ForEach-Object{Q ([string]$_)})-join ' '
  $P=New-Object Diagnostics.Process;$P.StartInfo=$Psi;[void]$P.Start();$OT=$P.StandardOutput.ReadToEndAsync();$ET=$P.StandardError.ReadToEndAsync()
  if(-not $P.WaitForExit($Timeout*1000)){
    KillTree ([int]$P.Id);try{[void]$P.WaitForExit(5000)}catch{}
    $O=$(if($OT.IsCompleted){try{$OT.Result}catch{''}}else{'[stdout stream did not close before timeout]'})
    $E=$(if($ET.IsCompleted){try{$ET.Result}catch{''}}else{'[stderr stream did not close before timeout]'})
    ($O+"`r`n"+$E)|Set-Content -LiteralPath $LogPath -Encoding UTF8
    return [ordered]@{ok=$false;code=124;timedOut=$true;stdout=$O;stderr=$E}
  }
  $P.WaitForExit();$O=$OT.Result;$E=$ET.Result;($O+"`r`n"+$E)|Set-Content -LiteralPath $LogPath -Encoding UTF8
  return [ordered]@{ok=($P.ExitCode -eq 0);code=$P.ExitCode;timedOut=$false;stdout=$O;stderr=$E}
}
function FindFfmpeg{
  $F=Get-Command ffmpeg.exe -ErrorAction SilentlyContinue;$P=Get-Command ffprobe.exe -ErrorAction SilentlyContinue
  if($F -and $P){return [pscustomobject]@{ff=$F.Source;fp=$P.Source}}
  $Base=Join-Path $env:LOCALAPPDATA 'HomeDesignAutomationV7\Tools\ffmpeg'
  $FF=Get-ChildItem -LiteralPath $Base -Recurse -Filter ffmpeg.exe -File -ErrorAction SilentlyContinue|Select-Object -First 1
  $FP=Get-ChildItem -LiteralPath $Base -Recurse -Filter ffprobe.exe -File -ErrorAction SilentlyContinue|Select-Object -First 1
  if($FF -and $FP){return [pscustomobject]@{ff=$FF.FullName;fp=$FP.FullName}}
  throw 'FFMPEG_NOT_FOUND'
}
function FindCentralDriveFolder{
  $Target='00_중앙에이전트';$Roots=@()
  try{$Roots+=@(Get-PSDrive -PSProvider FileSystem|ForEach-Object{$_.Root})}catch{}
  $Roots+=@((Join-Path $env:USERPROFILE 'My Drive'),(Join-Path $env:USERPROFILE '내 드라이브'),(Join-Path $env:USERPROFILE 'Google Drive'))
  $Roots=@($Roots|Where-Object{$_ -and (Test-Path -LiteralPath $_)}|Select-Object -Unique)
  foreach($Root in $Roots){foreach($P in @((Join-Path $Root $Target),(Join-Path $Root ('My Drive\'+$Target)),(Join-Path $Root ('내 드라이브\'+$Target)),(Join-Path $Root ('Google Drive\'+$Target)))){if(Test-Path -LiteralPath $P){return $P}}}
  foreach($Root in $Roots){try{foreach($D1 in @(Get-ChildItem -LiteralPath $Root -Directory -ErrorAction SilentlyContinue|Select-Object -First 120)){if($D1.Name -eq $Target){return $D1.FullName};foreach($D2 in @(Get-ChildItem -LiteralPath $D1.FullName -Directory -ErrorAction SilentlyContinue|Select-Object -First 120)){if($D2.Name -eq $Target){return $D2.FullName}}}}catch{}}
  return ''
}
function FindExistingVideo{
  $Name='2026-08-24_AGENT_DASHBOARD_PROMO_CONTENTOS_E2E_V1.mp4'
  foreach($Pattern in @('V11_*','V10_*','V9_*')){foreach($D in @(Get-ChildItem -LiteralPath $RootBase -Directory -Filter $Pattern -ErrorAction SilentlyContinue|Sort-Object LastWriteTime -Descending)){$P=Join-Path $D.FullName ('out\'+$Name);if(Test-Path -LiteralPath $P){if((Get-Item -LiteralPath $P).Length -gt 100000){return $P}}}}
  $Found=Get-ChildItem -LiteralPath $RootBase -Recurse -Filter $Name -File -ErrorAction SilentlyContinue|Where-Object{$_.FullName -notmatch '\\AUTO_QA'}|Sort-Object LastWriteTime -Descending|Select-Object -First 1
  if($Found -and $Found.Length -gt 100000){return $Found.FullName}
  return ''
}
$Tools=FindFfmpeg;$env:PATH=(Split-Path $Tools.ff -Parent)+';'+$env:PATH
$Video=FindExistingVideo
if(-not $Video){throw 'NO_COMPLETED_V11_MP4_FOUND'}
L ('STEP_01_REUSE_MP4 '+$Video)
$Manifest=[ordered]@{
 manifestVersion='VIDEO_PRODUCTION_MANIFEST_V1_20260824';assetId='AGENT_DASHBOARD_PROMO_CONTENTOS_E2E_20260824';templateId='AGENT_DASHBOARD_PROMO_E2E_V1';complexityClass='DEMO';canvas=[ordered]@{aspect='9:16';width=1080;height=1920;fps=30};
 shots=@(
  [ordered]@{shotId='SHOT_01';blockId='HOOK';startSec=0;endSec=3;screenProofRequired=$false;captionText='콘텐츠 OS 실제 작동 화면'},
  [ordered]@{shotId='SHOT_02';blockId='PROOF';startSec=3;endSec=7;screenProofRequired=$true;captionText='실제 Production 화면 확인'},
  [ordered]@{shotId='SHOT_03';blockId='WORKFLOW';startSec=7;endSec=12;screenProofRequired=$true;captionText='입력 → 분석 → 결과 흐름'},
  [ordered]@{shotId='SHOT_04';blockId='VALUE';startSec=12;endSec=17;screenProofRequired=$true;captionText='반복 작업 감소 · 결과 통합 관리'},
  [ordered]@{shotId='SHOT_05';blockId='CTA';startSec=17;endSec=20;screenProofRequired=$false;captionText='실제 동작을 확인해 보세요'}
 )
}
$ManifestJson=$Manifest|ConvertTo-Json -Depth 20 -Compress
$ManifestPath=Join-Path $RunRoot 'production-manifest.json';$Manifest|ConvertTo-Json -Depth 20|Set-Content -LiteralPath $ManifestPath -Encoding UTF8
$Qa=Join-Path $RunRoot 'Run-VideoFrameQA-V3.ps1'
Invoke-WebRequest -UseBasicParsing -Uri ('https://raw.githubusercontent.com/8friend8ship-cloud/animation/codex/video-promo-agent-workflow-20260823/tools/Run-VideoFrameQA.ps1?hdcb='+[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()) -OutFile $Qa -TimeoutSec 60
$QaCode=Get-Content -LiteralPath $Qa -Raw -Encoding UTF8
$QaCode=$QaCode.Replace('& $ffmpeg.Source -hide_banner -i $FramePath','& $ffmpeg.Source -nostdin -hide_banner -i $FramePath')
$QaCode=$QaCode.Replace('& $ffmpeg.Source -y -ss $mid -i $VideoPath','& $ffmpeg.Source -nostdin -y -ss $mid -i $VideoPath')
$QaCode=$QaCode.Replace('& $ffmpeg.Source -y -ss $t -i $VideoPath','& $ffmpeg.Source -nostdin -y -ss $t -i $VideoPath')
Set-Content -LiteralPath $Qa -Value $QaCode -Encoding UTF8
$Wrapper=Join-Path $RunRoot 'qa-wrapper.ps1'
@'
param([string]$Qa,[string]$Video,[string]$Manifest,[int]$Pass,[string]$Out)
$ErrorActionPreference='Continue'
$J=[IO.File]::ReadAllText($Manifest,[Text.Encoding]::UTF8)
& $Qa -VideoPath $Video -ManifestJson $J -PassNumber $Pass -OutputDir $Out
exit $LASTEXITCODE
'@|Set-Content -LiteralPath $Wrapper -Encoding UTF8
$Results=@()
foreach($Pass in @(1,2)){
 L ('STEP_QA_'+$Pass+'_START')
 $Dir=Join-Path $Out ('QA_PASS_'+$Pass);New-Item -ItemType Directory -Force -Path $Dir|Out-Null
 $R=RunP 'powershell.exe' @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',$Wrapper,'-Qa',$Qa,'-Video',$Video,'-Manifest',$ManifestPath,'-Pass',[string]$Pass,'-Out',$Dir) 180 $RunRoot (Join-Path $Dir 'qa-console.log')
 if($R.timedOut){throw ('QA_'+$Pass+'_TIMEOUT_180S')}
 $SummaryPath=Join-Path $Dir '00_FRAME_QA_SUMMARY.json'
 if(-not(Test-Path -LiteralPath $SummaryPath)){throw ('QA_'+$Pass+'_NO_SUMMARY exit='+$R.code+' stderr='+$R.stderr)}
 $S=Get-Content -LiteralPath $SummaryPath -Raw -Encoding UTF8|ConvertFrom-Json
 if(-not $S.ok){throw ('QA_'+$Pass+'_FAIL '+$S.status+' failedShots='+(@($S.failedShotIds)-join ','))}
 $Results+=$S;L ('STEP_QA_'+$Pass+'_PASS '+$S.status)
}
$Central=FindCentralDriveFolder
if(-not $Central){throw 'CENTRAL_DRIVE_FOLDER_NOT_FOUND_AFTER_QA_PASS'}
$Drive=Join-Path $Central 'Video_Production\2026\08\AGENT_DASHBOARD_PROMO_FIRST_MP4_20260824'
New-Item -ItemType Directory -Force -Path $Drive|Out-Null
L ('STEP_DRIVE_COPY_START '+$Drive)
Copy-Item -LiteralPath $Video -Destination (Join-Path $Drive ([IO.Path]::GetFileName($Video))) -Force
Copy-Item -LiteralPath $ManifestPath -Destination (Join-Path $Drive 'production-manifest.json') -Force
foreach($Name in @('QA_PASS_1','QA_PASS_2')){Copy-Item -LiteralPath (Join-Path $Out $Name) -Destination $Drive -Recurse -Force}
$Result=[ordered]@{ok=$true;status='MP4_TECHNICAL_QA_X2_PASS_VISUAL_REVIEW_PENDING';video=$Video;driveOutput=$Drive;qa1=[string]$Results[0].status;qa2=[string]$Results[1].status;animationE2E='DEFERRED_SEPARATE_GATE';runRoot=$RunRoot;completedAt=(Get-Date).ToString('o')}
$Result|ConvertTo-Json -Depth 20|Set-Content -LiteralPath (Join-Path $Out 'VIDEO_AUTO_RECOVERY_RESULT.json') -Encoding UTF8
$Result|ConvertTo-Json -Depth 20|Set-Content -LiteralPath (Join-Path $Drive 'VIDEO_AUTO_RECOVERY_RESULT.json') -Encoding UTF8
L 'STEP_DONE'
$Result|ConvertTo-Json -Compress -Depth 20
exit 0
