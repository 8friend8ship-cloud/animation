param(
  [Parameter(Mandatory=$true)][string]$VideoPath,
  [string]$OutputDir=''
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
if(-not(Test-Path -LiteralPath $VideoPath)){throw 'VideoPath not found'}
if(-not $OutputDir){$OutputDir=Join-Path ([Environment]::GetFolderPath('Desktop')) ('VideoFrameQA-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))}
New-Item -ItemType Directory -Force -Path $OutputDir|Out-Null
$ffmpeg=Get-Command ffmpeg.exe -ErrorAction SilentlyContinue
$ffprobe=Get-Command ffprobe.exe -ErrorAction SilentlyContinue
if(-not $ffmpeg -or -not $ffprobe){throw 'ffmpeg/ffprobe not found'}
$probeRaw=& $ffprobe.Source -v quiet -print_format json -show_format -show_streams $VideoPath|Out-String
$probeRaw|Set-Content (Join-Path $OutputDir 'ffprobe.json') -Encoding UTF8
$probe=$probeRaw|ConvertFrom-Json
$v=@($probe.streams|Where-Object{$_.codec_type -eq 'video'})|Select-Object -First 1
$a=@($probe.streams|Where-Object{$_.codec_type -eq 'audio'})|Select-Object -First 1
$duration=[double]$probe.format.duration
$times=@(0.10,0.30,0.50,0.70,0.90)|ForEach-Object{[Math]::Max(0,[Math]::Round($duration*$_,2))}
$frames=@()
$i=0
foreach($t in $times){$i++;$file=Join-Path $OutputDir ('frame-{0:D2}-{1:N2}s.jpg' -f $i,$t);& $ffmpeg.Source -y -ss $t -i $VideoPath -frames:v 1 -q:v 2 $file 2>&1|Set-Content (Join-Path $OutputDir ('extract-{0:D2}.log' -f $i)) -Encoding UTF8;if(Test-Path $file){$frames+=$file}}
$issues=@()
if(-not $v){$issues+='NO_VIDEO_STREAM'}else{if([int]$v.width -ne 1080 -or [int]$v.height -ne 1920){$issues+="UNEXPECTED_CANVAS_$($v.width)x$($v.height)"}}
if($duration -le 0){$issues+='INVALID_DURATION'}
if($frames.Count -lt 5){$issues+='FRAME_EXTRACTION_INCOMPLETE'}
$result=[ordered]@{
  ok=($issues.Count -eq 0);status=$(if($issues.Count -eq 0){'TECHNICAL_FRAME_QA_PASS_VISUAL_REVIEW_PENDING'}else{'TECHNICAL_FRAME_QA_FAIL'});
  video=$VideoPath;durationSec=$duration;width=$(if($v){$v.width}else{0});height=$(if($v){$v.height}else{0});hasAudio=[bool]$a;
  frames=$frames;issues=$issues;visualChecksPending=@('CAPTION_READABILITY','SAFE_AREA','SCREEN_PROOF','SECRET_EXPOSURE','FAILED_SHOT_CLASSIFICATION');
  next='Use extracted frames for multimodal QA; regenerate only failed shots.'
}
$result|ConvertTo-Json -Depth 20|Set-Content (Join-Path $OutputDir '00_FRAME_QA_SUMMARY.json') -Encoding UTF8
$result|ConvertTo-Json -Compress
