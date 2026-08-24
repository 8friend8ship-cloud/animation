param(
  [Parameter(Mandatory=$true)][string]$VideoPath,
  [string]$ManifestJson='',
  [int]$PassNumber=1,
  [string]$OutputDir=''
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
if(-not(Test-Path -LiteralPath $VideoPath)){throw 'VideoPath not found'}
if(-not $OutputDir){$OutputDir=Join-Path ([Environment]::GetFolderPath('Desktop')) ('VideoFrameQA-P'+$PassNumber+'-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))}
New-Item -ItemType Directory -Force -Path $OutputDir|Out-Null
$ffmpeg=Get-Command ffmpeg.exe -ErrorAction SilentlyContinue
$ffprobe=Get-Command ffprobe.exe -ErrorAction SilentlyContinue
if(-not $ffmpeg -or -not $ffprobe){throw 'ffmpeg/ffprobe not found'}
$manifest=$null
if($ManifestJson){try{$manifest=$ManifestJson|ConvertFrom-Json}catch{throw 'ManifestJson invalid'}}
$probeRaw=& $ffprobe.Source -v quiet -print_format json -show_format -show_streams $VideoPath|Out-String
$probeRaw|Set-Content (Join-Path $OutputDir 'ffprobe.json') -Encoding UTF8
$probe=$probeRaw|ConvertFrom-Json
$v=@($probe.streams|Where-Object{$_.codec_type -eq 'video'})|Select-Object -First 1
$a=@($probe.streams|Where-Object{$_.codec_type -eq 'audio'})|Select-Object -First 1
$duration=[double]$probe.format.duration
$issues=@()
if(-not $v){$issues+='NO_VIDEO_STREAM'}else{if([int]$v.width -ne 1080 -or [int]$v.height -ne 1920){$issues+="UNEXPECTED_CANVAS_$($v.width)x$($v.height)"}}
if(-not $a){$issues+='NO_AUDIO_STREAM'}
if($duration -le 0){$issues+='INVALID_DURATION'}

$shotFrames=@()
$failedShotIds=@()
$promptDelta=@()
if($manifest -and $manifest.shots){
  foreach($shot in @($manifest.shots)){
    $shotId=[string]$shot.shotId
    $start=[double]$shot.startSec;$end=[double]$shot.endSec
    $shotIssues=@()
    if($end -le $start){$shotIssues+='INVALID_SHOT_RANGE'}
    if($start -gt $duration){$shotIssues+='SHOT_START_OUT_OF_RANGE'}
    if($end -gt ($duration+0.25)){$shotIssues+='SHOT_END_OUT_OF_RANGE'}
    $mid=[Math]::Max(0,[Math]::Min([Math]::Max(0,$duration-0.05),($start+$end)/2))
    $safeId=$shotId -replace '[^A-Za-z0-9_-]','_'
    $file=Join-Path $OutputDir ('shot-'+$safeId+'-mid.jpg')
    & $ffmpeg.Source -y -ss $mid -i $VideoPath -frames:v 1 -q:v 2 $file 2>&1|Set-Content (Join-Path $OutputDir ('extract-'+$safeId+'.log')) -Encoding UTF8
    if(-not(Test-Path $file)){$shotIssues+='FRAME_EXTRACTION_FAILED'}
    if($shotIssues.Count -gt 0){
      $failedShotIds+=$shotId
      $promptDelta+=[pscustomobject]@{shotId=$shotId;issues=$shotIssues;delta='Regenerate only this shot; preserve approved timing, voice and unaffected shots.'}
    }
    $shotFrames+=[pscustomobject]@{
      shotId=$shotId;blockId=$shot.blockId;startSec=$start;endSec=$end;sampleSec=$mid;frame=$(if(Test-Path $file){$file}else{''});
      screenProofRequired=[bool]$shot.screenProofRequired;captionText=$shot.captionText;technicalIssues=$shotIssues;
      visualChecksPending=@('CAPTION_READABILITY','SAFE_AREA','SCREEN_PROOF','SECRET_EXPOSURE','CONTENT_MATCH')
    }
  }
}else{
  $times=@(0.10,0.30,0.50,0.70,0.90)|ForEach-Object{[Math]::Max(0,[Math]::Round($duration*$_,2))}
  $i=0
  foreach($t in $times){
    $i++
    $file=Join-Path $OutputDir ('frame-{0:D2}-{1:N2}s.jpg' -f $i,$t)
    & $ffmpeg.Source -y -ss $t -i $VideoPath -frames:v 1 -q:v 2 $file 2>&1|Set-Content (Join-Path $OutputDir ('extract-{0:D2}.log' -f $i)) -Encoding UTF8
    if(Test-Path $file){$shotFrames+=[pscustomobject]@{shotId='SAMPLE_'+$i;sampleSec=$t;frame=$file;technicalIssues=@();visualChecksPending=@('CAPTION_READABILITY','SAFE_AREA','SCREEN_PROOF','SECRET_EXPOSURE','CONTENT_MATCH')}}
  }
  if($shotFrames.Count -lt 5){$issues+='FRAME_EXTRACTION_INCOMPLETE'}
}

$visualReviewPackage=[ordered]@{
  qaPass=$PassNumber;video=$VideoPath;manifestVersion=$(if($manifest){$manifest.manifestVersion}else{''});assetId=$(if($manifest){$manifest.assetId}else{''});
  instructions='Review each extracted frame against caption, safe area, required screen proof, secret exposure and content match. Return only failed shot IDs plus a minimal prompt delta.';
  shotFrames=$shotFrames
}
$visualReviewPackage|ConvertTo-Json -Depth 30|Set-Content (Join-Path $OutputDir '01_VISUAL_REVIEW_PACKAGE.json') -Encoding UTF8
$promptDelta|ConvertTo-Json -Depth 20|Set-Content (Join-Path $OutputDir '02_PROMPT_DELTA.json') -Encoding UTF8

$technicalOk=($issues.Count -eq 0 -and $failedShotIds.Count -eq 0)
$status=$(if($technicalOk){'TECHNICAL_FRAME_QA_PASS_VISUAL_REVIEW_PENDING'}else{'TECHNICAL_FRAME_QA_FAIL'})
$result=[ordered]@{
  ok=$technicalOk;status=$status;qaPass=$PassNumber;video=$VideoPath;durationSec=$duration;width=$(if($v){$v.width}else{0});height=$(if($v){$v.height}else{0});hasAudio=[bool]$a;
  issues=$issues;shotFrames=$shotFrames;failedShotIds=$failedShotIds;promptDelta=$promptDelta;
  visualChecksPending=@('CAPTION_READABILITY','SAFE_AREA','SCREEN_PROOF','SECRET_EXPOSURE','CONTENT_MATCH','FAILED_SHOT_CLASSIFICATION');
  next=$(if($PassNumber -lt 2){'Complete visual review; regenerate only failed shots; rerun as PassNumber 2.'}else{'Complete second visual review; PASS only if failedShotIds is empty and visual checks pass.'})
}
$result|ConvertTo-Json -Depth 30|Set-Content (Join-Path $OutputDir '00_FRAME_QA_SUMMARY.json') -Encoding UTF8
$result|ConvertTo-Json -Compress -Depth 30
