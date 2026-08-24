param(
  [Parameter(Mandatory=$true)][string]$ManifestJson,
  [string]$OutputDir = '',
  [string]$OutputName = 'video-output.mp4'
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
if(-not $OutputDir){$OutputDir=Join-Path ([Environment]::GetFolderPath('Desktop')) ('VideoRender-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))}
New-Item -ItemType Directory -Force -Path $OutputDir|Out-Null
$manifest=$ManifestJson|ConvertFrom-Json
if(-not $manifest.manifestVersion){throw 'manifestVersion missing'}
$ffmpeg=Get-Command ffmpeg.exe -ErrorAction SilentlyContinue
$ffprobe=Get-Command ffprobe.exe -ErrorAction SilentlyContinue
if(-not $ffmpeg -or -not $ffprobe){
  @{ok=$false;status='BLOCKED_FFMPEG_NOT_FOUND';manifestVersion=$manifest.manifestVersion;outputDir=$OutputDir}|ConvertTo-Json -Depth 10|Set-Content (Join-Path $OutputDir 'render-result.json') -Encoding UTF8
  exit 20
}
$shots=@($manifest.shots)
if($shots.Count -lt 1){throw 'manifest has no shots'}
$resolved=@()
$missing=@()
foreach($shot in $shots){
  $src=''
  $candidates=@()
  if($shot.sourceCandidates){$candidates=([string]$shot.sourceCandidates).Split(',')|ForEach-Object{$_.Trim()}|Where-Object{$_}}
  foreach($candidate in $candidates){if(Test-Path -LiteralPath $candidate){$src=$candidate;break}}
  if(-not $src){$missing+=[pscustomobject]@{shotId=$shot.shotId;blockId=$shot.blockId;screenProofRequired=[bool]$shot.screenProofRequired;visualRule=$shot.visualRule};continue}
  $resolved+=[pscustomobject]@{shot=$shot;source=$src}
}
$assetReport=[ordered]@{manifestVersion=$manifest.manifestVersion;assetId=$manifest.assetId;resolved=$resolved.Count;missing=$missing.Count;missingShots=$missing}
$assetReport|ConvertTo-Json -Depth 20|Set-Content (Join-Path $OutputDir 'asset-resolution.json') -Encoding UTF8
if($missing.Count -gt 0){
  @{ok=$false;status='BLOCKED_SOURCE_ASSET_GAP';assetId=$manifest.assetId;missingShots=$missing;policy='DO_NOT_FABRICATE_SCREEN_PROOF';outputDir=$OutputDir}|ConvertTo-Json -Depth 20|Set-Content (Join-Path $OutputDir 'render-result.json') -Encoding UTF8
  exit 30
}
$segments=@()
$i=0
foreach($item in $resolved){
  $i++
  $shot=$item.shot
  $duration=[Math]::Max(0.5,[double]$shot.endSec-[double]$shot.startSec)
  $seg=Join-Path $OutputDir ('segment-{0:D2}.mp4' -f $i)
  $ext=[IO.Path]::GetExtension($item.source).ToLowerInvariant()
  if($ext -in @('.png','.jpg','.jpeg','.webp')){
    & $ffmpeg.Source -y -loop 1 -i $item.source -t $duration -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p" -r 30 -an $seg 2>&1|Set-Content (Join-Path $OutputDir ('ffmpeg-{0:D2}.log' -f $i)) -Encoding UTF8
  }else{
    & $ffmpeg.Source -y -i $item.source -t $duration -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p" -r 30 -an $seg 2>&1|Set-Content (Join-Path $OutputDir ('ffmpeg-{0:D2}.log' -f $i)) -Encoding UTF8
  }
  if($LASTEXITCODE -ne 0 -or -not(Test-Path $seg)){throw "segment render failed: $($shot.shotId)"}
  $segments+=$seg
}
$concat=Join-Path $OutputDir 'concat.txt'
$segments|ForEach-Object{"file '$($_.Replace("'","''"))'"}|Set-Content $concat -Encoding ASCII
$out=Join-Path $OutputDir $OutputName
& $ffmpeg.Source -y -f concat -safe 0 -i $concat -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an $out 2>&1|Set-Content (Join-Path $OutputDir 'ffmpeg-concat.log') -Encoding UTF8
if($LASTEXITCODE -ne 0 -or -not(Test-Path $out)){throw 'final concat failed'}
$probe=& $ffprobe.Source -v quiet -print_format json -show_format -show_streams $out|Out-String
$probe|Set-Content (Join-Path $OutputDir 'ffprobe.json') -Encoding UTF8
$result=[ordered]@{ok=$true;status='RENDER_PASS_VIDEO_ONLY';assetId=$manifest.assetId;output=$out;segments=$segments.Count;audio='PENDING_VOICE_COMPOSE';caption='PENDING_CAPTION_COMPOSE';qaNext='Run-VideoFrameQA.ps1'}
$result|ConvertTo-Json -Depth 20|Set-Content (Join-Path $OutputDir 'render-result.json') -Encoding UTF8
$result|ConvertTo-Json -Compress
