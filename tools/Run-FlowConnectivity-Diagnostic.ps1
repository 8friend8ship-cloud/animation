param()
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$repo='8friend8ship-cloud/animation'
$branch='codex/video-promo-agent-workflow-20260823'
$path='tools/Recover-AnimationRuntime-Lineage.ps1'
$taskId='FLOW_QUEUE_DIAG_20260826_1411_01'
$tmp=Join-Path $env:TEMP ('Run-FlowConnectivity-Diagnostic-'+[guid]::NewGuid().ToString('N')+'.ps1')
try {
  $headers=@{'User-Agent'='HomeDesign-Flow-Diagnostic';'Accept'='application/vnd.github.raw+json'}
  $url='https://raw.githubusercontent.com/'+$repo+'/'+$branch+'/'+$path
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $tmp -Headers $headers -TimeoutSec 30
  if(!(Test-Path -LiteralPath $tmp) -or (Get-Item -LiteralPath $tmp).Length -lt 1000){throw 'FLOW_DIAGNOSTIC_SOURCE_DOWNLOAD_FAILED'}
  & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $tmp -FlowConnectivityOnly -WorkerTaskId $taskId -TargetLabel FlowWebApp
  exit $LASTEXITCODE
} finally {
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}
