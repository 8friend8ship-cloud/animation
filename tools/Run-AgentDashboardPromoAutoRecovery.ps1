param()
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$RootBase=Join-Path $env:LOCALAPPDATA 'HomeDesignAutomationV7\VideoProduction'
$RunRoot=Join-Path $RootBase ('AUTO_'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
$Out=Join-Path $RunRoot 'out'
New-Item -ItemType Directory -Force -Path $Out|Out-Null
$Log=Join-Path $RunRoot 'auto-recovery.log'
function L([string]$M){Add-Content -LiteralPath $Log -Value ('['+(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')+'] '+$M) -Encoding UTF8}
function U([string]$B){[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($B))}
function Q([string]$S){if($S -match '[\s"]'){return '"'+($S -replace '"','\"')+'"'};return $S}
function RunP([string]$Exe,[string[]]$Args,[int]$Timeout,[string]$Cwd,[string]$LogPath){
 $pInfo=New-Object Diagnostics.ProcessStartInfo;$pInfo.FileName=$Exe;$pInfo.WorkingDirectory=$Cwd;$pInfo.UseShellExecute=$false;$pInfo.CreateNoWindow=$true;$pInfo.RedirectStandardOutput=$true;$pInfo.RedirectStandardError=$true;$pInfo.Arguments=(@($Args)|ForEach-Object{Q ([string]$_)})-join ' '
 $p=New-Object Diagnostics.Process;$p.StartInfo=$pInfo;[void]$p.Start();$ot=$p.StandardOutput.ReadToEndAsync();$et=$p.StandardError.ReadToEndAsync()
 if(-not $p.WaitForExit($Timeout*1000)){try{& taskkill.exe /PID $p.Id /T /F 2>$null|Out-Null}catch{};try{[void]$p.WaitForExit(3000)}catch{};$o='';$e='';try{$o=$ot.Result}catch{};try{$e=$et.Result}catch{};($o+"`r`n"+$e)|Set-Content $LogPath -Encoding UTF8;return [pscustomobject]@{code=124;stdout=$o;stderr=$e}}
 $p.WaitForExit();$o=$ot.Result;$e=$et.Result;($o+"`r`n"+$e)|Set-Content $LogPath -Encoding UTF8;return [pscustomobject]@{code=$p.ExitCode;stdout=$o;stderr=$e}
}
function FindFfmpeg{
 $ff=Get-Command ffmpeg.exe -ErrorAction SilentlyContinue;$fp=Get-Command ffprobe.exe -ErrorAction SilentlyContinue
 if($ff -and $fp){return [pscustomobject]@{ff=$ff.Source;fp=$fp.Source}}
 $base=Join-Path $env:LOCALAPPDATA 'HomeDesignAutomationV7\Tools\ffmpeg'
 $f=Get-ChildItem -LiteralPath $base -Recurse -Filter ffmpeg.exe -File -ErrorAction SilentlyContinue|Select-Object -First 1
 $p=Get-ChildItem -LiteralPath $base -Recurse -Filter ffprobe.exe -File -ErrorAction SilentlyContinue|Select-Object -First 1
 if($f -and $p){return [pscustomobject]@{ff=$f.FullName;fp=$p.FullName}}
 throw 'FFMPEG_NOT_FOUND'
}
function FindCentral{
 $target=U 'MDDspJHsl5DsnojspITtirjsnIQ='
 foreach($d in @(Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue)){
   $r=[string]$d.Root;if(-not $r){continue}
   foreach($c in @((Join-Path $r $target),(Join-Path $r ('My Drive\'+$target)),(Join-Path $r ('Google Drive\'+$target)))){if(Test-Path -LiteralPath $c){return $c}}
 }
 return ''
}
function LatestVideo{
 $dirs=Get-ChildItem -LiteralPath $RootBase -Directory -ErrorAction SilentlyContinue|Sort-Object LastWriteTime -Descending
 foreach($d in $dirs){
   $v=Join-Path $d.FullName 'out\2026-08-24_AGENT_DASHBOARD_PROMO_CONTENTOS_E2E_V1.mp4'
   if(Test-Path -LiteralPath $v){try{if((Get-Item $v).Length -gt 100000){return $v}}catch{}}
 }
 return ''
}
$tools=FindFfmpeg;$env:PATH=(Split-Path $tools.ff -Parent)+';'+$env:PATH
$video=LatestVideo
if(-not $video){throw 'NO_COMPLETED_MP4_FOUND_FROM_V11_OR_LATER'}
L ('Reuse video: '+$video)
$manifestJson=U 'eyJtYW5pZmVzdFZlcnNpb24iOiJWSURFT19QUk9EVUNUSU9OX01BTklGRVNUX1YxXzIwMjYwODI0IiwiYXNzZXRJZCI6IkFHRU5UX0RBU0hCT0FSRF9QUk9NT19DT05URU5UT1NfRTJFXzIwMjYwODI0IiwidGVtcGxhdGVJZCI6IkFHRU5UX0RBU0hCT0FSRF9QUk9NT19FMkVfVjEiLCJjb21wbGV4aXR5Q2xhc3MiOiJERU1PIiwiY2FudmFzIjp7ImFzcGVjdCI6Ijk6MTYiLCJ3aWR0aCI6MTA4MCwiaGVpZ2h0IjoxOTIwLCJmcHMiOjMwfSwic2hvdHMiOlt7InNob3RJZCI6IlNIT1RfMDEiLCJibG9ja0lkIjoiSE9PSyIsInN0YXJ0U2VjIjowLCJlbmRTZWMiOjMsInNjcmVlblByb29mUmVxdWlyZWQiOmZhbHNlLCJjYXB0aW9uVGV4dCI6Iuy9mO2AkOy4oCBPUyDsi6TsoJwg7J6R64+ZIO2ZlOuptCJ9LHsic2hvdElkIjoiU0hPVF8wMiIsImJsb2NrSWQiOiJQUk9PRiIsInN0YXJ0U2VjIjozLCJlbmRTZWMiOjcsInNjcmVlblByb29mUmVxdWlyZWQiOnRydWUsImNhcHRpb25UZXh0Ijoi7Iuk7KCcIFByb2R1Y3Rpb24g7ZmU66m0IO2ZleyduCJ9LHsic2hvdElkIjoiU0hPVF8wMyIsImJsb2NrSWQiOiJXT1JLRkxPVyIsInN0YXJ0U2VjIjo3LCJlbmRTZWMiOjEyLCJzY3JlZW5Qcm9vZlJlcXVpcmVkIjp0cnVlLCJjYXB0aW9uVGV4dCI6IuyeheugpSDihpIg67aE7ISdIOKGkiDqsrDqs7wg7Z2Q66aEIn0seyJzaG90SWQiOiJTSE9UXzA0IiwiYmxvY2tJZCI6IlZBTFVFIiwic3RhcnRTZWMiOjEyLCJlbmRTZWMiOjE3LCJzY3JlZW5Qcm9vZlJlcXVpcmVkIjp0cnVlLCJjYXB0aW9uVGV4dCI6IuuwmOuztSDsnpHsl4Ug6rCQ7IaMIMK3IOqysOqzvCDthrXtlakg6rSA66asIn0seyJzaG90SWQiOiJTSE9UXzA1IiwiYmxvY2tJZCI6IkNUQSIsInN0YXJ0U2VjIjoxNywiZW5kU2VjIjoyMCwic2NyZWVuUHJvb2ZSZXF1aXJlZCI6ZmFsc2UsImNhcHRpb25UZXh0Ijoi7Iuk7KCcIOuPmeyekeydhCDtmZXsnbjtlbQg67O07IS47JqUIn1dfQ=='
$manifestPath=Join-Path $RunRoot 'production-manifest.json'
[IO.File]::WriteAllText($manifestPath,$manifestJson,(New-Object Text.UTF8Encoding($true)))
$qa=Join-Path $RunRoot 'Run-VideoFrameQA.ps1'
Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/8friend8ship-cloud/animation/codex/video-promo-agent-workflow-20260823/tools/Run-VideoFrameQA.ps1' -OutFile $qa -TimeoutSec 60
$qt=[IO.File]::ReadAllText($qa,[Text.Encoding]::UTF8);[IO.File]::WriteAllText($qa,$qt,(New-Object Text.UTF8Encoding($true)))
$wrapper=Join-Path $RunRoot 'qa-wrapper.ps1'
$wt=@'
param([string]$Qa,[string]$Video,[string]$Manifest,[int]$Pass,[string]$Out)
$ErrorActionPreference='Continue'
$J=[IO.File]::ReadAllText($Manifest,[Text.Encoding]::UTF8)
& $Qa -VideoPath $Video -ManifestJson $J -PassNumber $Pass -OutputDir $Out
exit $LASTEXITCODE
'@
[IO.File]::WriteAllText($wrapper,$wt,(New-Object Text.UTF8Encoding($true)))
$qaResults=@()
foreach($pass in @(1,2)){
 $dir=Join-Path $Out ('QA_PASS_'+$pass);New-Item -ItemType Directory -Force -Path $dir|Out-Null
 $r=RunP 'powershell.exe' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$wrapper,'-Qa',$qa,'-Video',$video,'-Manifest',$manifestPath,'-Pass',[string]$pass,'-Out',$dir) 210 $RunRoot (Join-Path $dir 'qa-console.log')
 $sumPath=Join-Path $dir '00_FRAME_QA_SUMMARY.json'
 if(-not(Test-Path $sumPath)){throw ('QA_'+$pass+'_NO_SUMMARY_EXIT_'+$r.code)}
 $sum=Get-Content $sumPath -Raw -Encoding UTF8|ConvertFrom-Json
 if(-not $sum.ok){throw ('QA_'+$pass+'_FAIL_'+$sum.status)}
 $qaResults+=$sum
 L ('QA'+$pass+' '+$sum.status)
}
$e2eStatus='NOT_RUN'
try{
 $e2e=Join-Path $RunRoot 'Run-AnimationTestDeploymentE2E.ps1'
 Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/8friend8ship-cloud/animation/codex/video-promo-agent-workflow-20260823/tools/Run-AnimationTestDeploymentE2E.ps1' -OutFile $e2e -TimeoutSec 60
 $et=[IO.File]::ReadAllText($e2e,[Text.Encoding]::UTF8);[IO.File]::WriteAllText($e2e,$et,(New-Object Text.UTF8Encoding($true)))
 $er=RunP 'powershell.exe' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$e2e,'-ScriptId','14APk3L_PDBaDwUvuqzF2huGZFRKiv8CpTNLV4aYz68pkIdXRiTZ6mnmH') 360 $RunRoot (Join-Path $Out 'animation-e2e.log')
 if($er.code -eq 0){$e2eStatus='PASS'}elseif($er.code -eq 124){$e2eStatus='TIMEOUT_360S'}else{$e2eStatus='CHECK_EXIT_'+$er.code}
}catch{$e2eStatus='CHECK_EXCEPTION'}
$central=FindCentral;$drive=''
if($central){
 $drive=Join-Path $central 'Video_Production\2026\08\AGENT_DASHBOARD_PROMO_FIRST_MP4_20260824'
 New-Item -ItemType Directory -Force -Path $drive|Out-Null
 Copy-Item -LiteralPath $video -Destination (Join-Path $drive ([IO.Path]::GetFileName($video))) -Force
 Copy-Item -LiteralPath $manifestPath -Destination (Join-Path $drive 'production-manifest.json') -Force
 foreach($name in @('QA_PASS_1','QA_PASS_2')){Copy-Item -LiteralPath (Join-Path $Out $name) -Destination $drive -Recurse -Force}
}
$result=[ordered]@{ok=$true;status='MP4_TECHNICAL_QA_X2_PASS_VISUAL_REVIEW_PENDING';video=$video;driveOutput=$drive;qa1=[string]$qaResults[0].status;qa2=[string]$qaResults[1].status;animationE2E=$e2eStatus;runRoot=$RunRoot;completedAt=(Get-Date).ToString('o')}
$resultPath=Join-Path $Out 'VIDEO_AUTO_RECOVERY_RESULT.json';$result|ConvertTo-Json -Depth 20|Set-Content $resultPath -Encoding UTF8
if($drive){$result|ConvertTo-Json -Depth 20|Set-Content (Join-Path $drive 'VIDEO_AUTO_RECOVERY_RESULT.json') -Encoding UTF8}
$result|ConvertTo-Json -Compress -Depth 20
exit 0
