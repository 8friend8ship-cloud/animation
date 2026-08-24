param(
  [Parameter(Mandatory=$true)][string]$ManifestJson,
  [string]$OutputDir = '',
  [string]$OutputName = 'video-output.mp4',
  [switch]$DisableVoice,
  [switch]$DisableCaptions
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
  @{ok=$false;status='BLOCKED_FFMPEG_NOT_FOUND';manifestVersion=$manifest.manifestVersion;outputDir=$OutputDir}|ConvertTo-Json -Depth 20|Set-Content (Join-Path $OutputDir 'render-result.json') -Encoding UTF8
  exit 20
}

function Get-Candidates($shot){
  if(-not $shot.sourceCandidates){return @()}
  if($shot.sourceCandidates -is [System.Array]){return @($shot.sourceCandidates|ForEach-Object{[string]$_}|Where-Object{$_})}
  return @(([string]$shot.sourceCandidates).Split(',')|ForEach-Object{$_.Trim()}|Where-Object{$_})
}
function Get-SrtTime([double]$seconds){
  if($seconds -lt 0){$seconds=0}
  $ts=[TimeSpan]::FromSeconds($seconds)
  return ('{0:00}:{1:00}:{2:00},{3:000}' -f [math]::Floor($ts.TotalHours),$ts.Minutes,$ts.Seconds,$ts.Milliseconds)
}
function Escape-SubtitleFilterPath([string]$path){
  $p=(Resolve-Path -LiteralPath $path).Path.Replace('\\','/')
  $p=$p.Replace(':','\:').Replace("'","\'")
  return $p
}
function Get-VoiceLine($shot,$manifest){
  $id=[string]$shot.shotId
  if($manifest.voicePlan -and $manifest.voicePlan.lines){
    foreach($line in @($manifest.voicePlan.lines)){if([string]$line.shotId -eq $id){return [string]$line.text}}
  }
  if($shot.voiceLine){return [string]$shot.voiceLine}
  if($shot.captionText){return [string]$shot.captionText}
  return ''
}
function Set-SpeechRate($synth,[string]$text,[double]$duration){
  if($duration -le 0){$synth.Rate=0;return}
  $cps=([double]$text.Length)/$duration
  if($cps -ge 10){$synth.Rate=6}
  elseif($cps -ge 8){$synth.Rate=4}
  elseif($cps -ge 6){$synth.Rate=2}
  elseif($cps -le 2.5){$synth.Rate=-2}
  else{$synth.Rate=0}
}

$shots=@($manifest.shots)
if($shots.Count -lt 1){throw 'manifest has no shots'}
$resolved=@()
$missingProof=@()
foreach($shot in $shots){
  $src=''
  foreach($candidate in (Get-Candidates $shot)){if(Test-Path -LiteralPath $candidate){$src=$candidate;break}}
  if(-not $src -and [bool]$shot.screenProofRequired){
    $missingProof+=[pscustomobject]@{shotId=$shot.shotId;blockId=$shot.blockId;visualRule=$shot.visualRule;sourceCandidates=$shot.sourceCandidates}
  }
  $resolved+=[pscustomobject]@{shot=$shot;source=$src;synthetic=([string]::IsNullOrWhiteSpace($src))}
}
$assetReport=[ordered]@{manifestVersion=$manifest.manifestVersion;assetId=$manifest.assetId;shots=$shots.Count;resolved=@($resolved|Where-Object{-not $_.synthetic}).Count;synthetic=@($resolved|Where-Object{$_.synthetic}).Count;missingProof=$missingProof.Count;missingProofShots=$missingProof}
$assetReport|ConvertTo-Json -Depth 20|Set-Content (Join-Path $OutputDir 'asset-resolution.json') -Encoding UTF8
if($missingProof.Count -gt 0){
  @{ok=$false;status='BLOCKED_SCREEN_PROOF_ASSET_GAP';assetId=$manifest.assetId;missingShots=$missingProof;policy='DO_NOT_FABRICATE_SCREEN_PROOF';outputDir=$OutputDir}|ConvertTo-Json -Depth 20|Set-Content (Join-Path $OutputDir 'render-result.json') -Encoding UTF8
  exit 30
}

$segments=@()
$i=0
foreach($item in $resolved){
  $i++
  $shot=$item.shot
  $duration=[Math]::Max(0.5,[double]$shot.endSec-[double]$shot.startSec)
  $seg=Join-Path $OutputDir ('segment-{0:D2}.mp4' -f $i)
  $log=Join-Path $OutputDir ('ffmpeg-video-{0:D2}.log' -f $i)
  if($item.synthetic){
    & $ffmpeg.Source -y -f lavfi -i "color=c=0x111111:s=1080x1920:r=30:d=$duration" -t $duration -vf "format=yuv420p" -r 30 -an $seg 2>&1|Set-Content $log -Encoding UTF8
  }else{
    $ext=[IO.Path]::GetExtension($item.source).ToLowerInvariant()
    if($ext -in @('.png','.jpg','.jpeg','.webp','.bmp')){
      & $ffmpeg.Source -y -loop 1 -i $item.source -t $duration -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p" -r 30 -an $seg 2>&1|Set-Content $log -Encoding UTF8
    }else{
      & $ffmpeg.Source -y -stream_loop -1 -i $item.source -t $duration -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p" -r 30 -an $seg 2>&1|Set-Content $log -Encoding UTF8
    }
  }
  if($LASTEXITCODE -ne 0 -or -not(Test-Path $seg)){throw "segment render failed: $($shot.shotId)"}
  $segments+=$seg
}

$concat=Join-Path $OutputDir 'concat-video.txt'
$segments|ForEach-Object{"file '$($_.Replace("'","''"))'"}|Set-Content $concat -Encoding ASCII
$baseVideo=Join-Path $OutputDir 'base-video.mp4'
& $ffmpeg.Source -y -f concat -safe 0 -i $concat -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an $baseVideo 2>&1|Set-Content (Join-Path $OutputDir 'ffmpeg-video-concat.log') -Encoding UTF8
if($LASTEXITCODE -ne 0 -or -not(Test-Path $baseVideo)){throw 'base video concat failed'}

$captionPath=Join-Path $OutputDir 'captions.srt'
$captionItems=@()
if($manifest.captionPlan -and $manifest.captionPlan.items){$captionItems=@($manifest.captionPlan.items)}
if($captionItems.Count -eq 0){$captionItems=@($shots|ForEach-Object{[pscustomobject]@{startSec=$_.startSec;endSec=$_.endSec;text=$_.captionText}})}
$srt=@()
$cidx=0
foreach($item in $captionItems){
  $txt=[string]$item.text
  if([string]::IsNullOrWhiteSpace($txt)){continue}
  $cidx++
  $txt=$txt.Replace("`r",' ').Replace("`n",' ').Trim()
  $srt+=[string]$cidx
  $srt+=(Get-SrtTime ([double]$item.startSec))+' --> '+(Get-SrtTime ([double]$item.endSec))
  $srt+=$txt
  $srt+=''
}
$srt|Set-Content $captionPath -Encoding UTF8

$voiceMode='DISABLED'
$voiceName=''
$audioTrack=''
if(-not $DisableVoice){
  try{
    Add-Type -AssemblyName System.Speech -ErrorAction Stop
    $synth=New-Object System.Speech.Synthesis.SpeechSynthesizer
    $language=''
    if($manifest.voicePlan -and $manifest.voicePlan.language){$language=[string]$manifest.voicePlan.language}
    $voice=$null
    if($language){$voice=@($synth.GetInstalledVoices()|Where-Object{$_.Enabled -and $_.VoiceInfo.Culture.Name -eq $language})|Select-Object -First 1}
    if(-not $voice){$voice=@($synth.GetInstalledVoices()|Where-Object{$_.Enabled})|Select-Object -First 1}
    if($voice){$voiceName=$voice.VoiceInfo.Name;$synth.SelectVoice($voiceName)}
    $audioSegments=@()
    $aidx=0
    foreach($shot in $shots){
      $aidx++
      $duration=[Math]::Max(0.5,[double]$shot.endSec-[double]$shot.startSec)
      $wavRaw=Join-Path $OutputDir ('voice-raw-{0:D2}.wav' -f $aidx)
      $wav=Join-Path $OutputDir ('voice-{0:D2}.wav' -f $aidx)
      $text=Get-VoiceLine $shot $manifest
      if(-not [string]::IsNullOrWhiteSpace($text)){
        Set-SpeechRate $synth $text $duration
        $synth.SetOutputToWaveFile($wavRaw)
        $synth.Speak($text)
        $synth.SetOutputToDefaultAudioDevice()
        & $ffmpeg.Source -y -i $wavRaw -af "apad=pad_dur=$duration" -t $duration -ar 48000 -ac 2 -c:a pcm_s16le $wav 2>&1|Set-Content (Join-Path $OutputDir ('ffmpeg-audio-{0:D2}.log' -f $aidx)) -Encoding UTF8
      }else{
        & $ffmpeg.Source -y -f lavfi -i "anullsrc=r=48000:cl=stereo" -t $duration -c:a pcm_s16le $wav 2>&1|Set-Content (Join-Path $OutputDir ('ffmpeg-audio-{0:D2}.log' -f $aidx)) -Encoding UTF8
      }
      if($LASTEXITCODE -ne 0 -or -not(Test-Path $wav)){throw "voice segment failed: $($shot.shotId)"}
      $audioSegments+=$wav
    }
    $synth.Dispose()
    $audioConcat=Join-Path $OutputDir 'concat-audio.txt'
    $audioSegments|ForEach-Object{"file '$($_.Replace("'","''"))'"}|Set-Content $audioConcat -Encoding ASCII
    $audioTrack=Join-Path $OutputDir 'voice-track.m4a'
    & $ffmpeg.Source -y -f concat -safe 0 -i $audioConcat -c:a aac -b:a 192k $audioTrack 2>&1|Set-Content (Join-Path $OutputDir 'ffmpeg-audio-concat.log') -Encoding UTF8
    if($LASTEXITCODE -ne 0 -or -not(Test-Path $audioTrack)){throw 'voice concat failed'}
    $voiceMode='WINDOWS_SYSTEM_SPEECH'
  }catch{
    $voiceMode='VOICE_ENGINE_UNAVAILABLE'
    $voiceName=''
    $audioTrack=''
    $_.Exception.ToString()|Set-Content (Join-Path $OutputDir 'voice-error.log') -Encoding UTF8
  }
}

if(-not $audioTrack){
  $duration=[double](& $ffprobe.Source -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 $baseVideo|Select-Object -First 1)
  $audioTrack=Join-Path $OutputDir 'silence.m4a'
  & $ffmpeg.Source -y -f lavfi -i "anullsrc=r=48000:cl=stereo" -t $duration -c:a aac -b:a 128k $audioTrack 2>&1|Set-Content (Join-Path $OutputDir 'ffmpeg-silence.log') -Encoding UTF8
  if($LASTEXITCODE -ne 0 -or -not(Test-Path $audioTrack)){throw 'silence track generation failed'}
}

$out=Join-Path $OutputDir $OutputName
$captionMode='DISABLED'
if(-not $DisableCaptions -and $cidx -gt 0){
  $escaped=Escape-SubtitleFilterPath $captionPath
  $vf="subtitles='$escaped':force_style='FontSize=20,Alignment=2,MarginV=120,Outline=2,Shadow=0'"
  & $ffmpeg.Source -y -i $baseVideo -i $audioTrack -vf $vf -map 0:v:0 -map 1:a:0 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest -movflags +faststart $out 2>&1|Set-Content (Join-Path $OutputDir 'ffmpeg-final-burn.log') -Encoding UTF8
  if($LASTEXITCODE -eq 0 -and (Test-Path $out)){$captionMode='BURNED_SRT'}
  else{
    & $ffmpeg.Source -y -i $baseVideo -i $audioTrack -i $captionPath -map 0:v:0 -map 1:a:0 -map 2:0 -c:v copy -c:a aac -c:s mov_text -shortest -movflags +faststart $out 2>&1|Set-Content (Join-Path $OutputDir 'ffmpeg-final-caption-track.log') -Encoding UTF8
    if($LASTEXITCODE -ne 0 -or -not(Test-Path $out)){throw 'final compose failed'}
    $captionMode='EMBEDDED_MOV_TEXT_FALLBACK'
  }
}else{
  & $ffmpeg.Source -y -i $baseVideo -i $audioTrack -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -shortest -movflags +faststart $out 2>&1|Set-Content (Join-Path $OutputDir 'ffmpeg-final.log') -Encoding UTF8
  if($LASTEXITCODE -ne 0 -or -not(Test-Path $out)){throw 'final compose failed'}
}

$probe=& $ffprobe.Source -v quiet -print_format json -show_format -show_streams $out|Out-String
$probe|Set-Content (Join-Path $OutputDir 'ffprobe.json') -Encoding UTF8
$status='RENDER_PASS_FULL_COMPOSE'
if($voiceMode -ne 'WINDOWS_SYSTEM_SPEECH'){$status='RENDER_PASS_DEGRADED_VOICE'}
if($captionMode -eq 'EMBEDDED_MOV_TEXT_FALLBACK'){$status=$status+'_CAPTION_TRACK'}
$result=[ordered]@{
  ok=$true;status=$status;assetId=$manifest.assetId;manifestVersion=$manifest.manifestVersion;output=$out;segments=$segments.Count;
  audioMode=$voiceMode;voiceName=$voiceName;captionMode=$captionMode;captionFile=$captionPath;outputDir=$OutputDir;
  qaNext='Run-VideoFrameQA.ps1 -VideoPath <output> -ManifestJson <manifest> -PassNumber 1';failedShotOnlyRegen=$true
}
$result|ConvertTo-Json -Depth 20|Set-Content (Join-Path $OutputDir 'render-result.json') -Encoding UTF8
$result|ConvertTo-Json -Compress
