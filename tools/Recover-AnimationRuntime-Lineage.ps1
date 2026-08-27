param(
  [switch]$DryRun = $true,
  [switch]$ListOnly = $false,
  [switch]$ChromeUrlOnly = $false,
  [switch]$CftBoundScriptRecovery = $false,
  [switch]$DeploymentInventory = $false,
  [string]$TargetDeploymentId = '',
  [string]$ChromeUrlPrefix = '',
  [string]$TargetSpreadsheetId = '',
  [string]$TargetCodePattern = '',
  [string]$TargetNamePattern = '',
  [string]$TargetLabel = 'Animation',
  [string]$CentralReadbackName = '',
  [switch]$ChromeWorkerDriveHandoff = $false,
  [string]$Worker = '',
  [string]$WorkerTaskId = '',
  [string]$WorkerParentTaskId = '',
  [string]$WorkerAction = '',
  [string]$WorkerPrompt = '',
  [string]$WorkerTargetUrl = '',
  [int]$WorkerTimeoutSeconds = 240
)

$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$Repo='8friend8ship-cloud/animation'
$ScriptPath='tools/Recover-AnimationRuntime-Lineage.ps1'
$PreviousCommit='b1867ff4ef0ed4c42fea2bbc5aab9d7761669beb'

function Resolve-DriveFsParent {
  $target='00_중앙에이전트'
  $roots=@('G:\내 드라이브','G:\My Drive','H:\내 드라이브','H:\My Drive','I:\내 드라이브','I:\My Drive')
  try{foreach($d in [IO.DriveInfo]::GetDrives()){$r=[string]$d.RootDirectory.FullName;if($r){$roots+=@((Join-Path $r '내 드라이브'),(Join-Path $r 'My Drive'))}}}catch{}
  foreach($root in @($roots|Select-Object -Unique)){try{if(Test-Path -LiteralPath (Join-Path $root $target)){return $root}}catch{}}
  return ''
}

function Invoke-DeploymentInventory {
  $listText=(& npx --yes '@google/clasp@latest' list 2>&1 | Out-String)
  $listRc=$LASTEXITCODE
  if($listRc -ne 0){throw ('CLASP_LIST_FAILED rc='+$listRc+' output='+$listText.Trim())}
  $ids=@([regex]::Matches($listText,'https://script\.google\.com/d/([A-Za-z0-9_-]{20,})/edit')|ForEach-Object{$_.Groups[1].Value}|Select-Object -Unique)
  $projects=@()
  foreach($id in $ids){
    $work=Join-Path $env:TEMP ('AppsScriptDeploymentInventory-'+$id.Substring(0,[Math]::Min(8,$id.Length))+'-'+[guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force -Path $work|Out-Null
    Set-Content -LiteralPath (Join-Path $work '.clasp.json') -Value ('{"scriptId":"'+$id+'","rootDir":"."}') -Encoding UTF8
    Push-Location $work
    try{
      $depText=(& npx --yes '@google/clasp@latest' deployments 2>&1 | Out-String)
      $depRc=$LASTEXITCODE
    } finally { Pop-Location; Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue }
    $match=$false
    if($TargetDeploymentId){$match=($depText -match [regex]::Escape($TargetDeploymentId))}
    $projects += [ordered]@{scriptId=$id;deploymentsExit=$depRc;deploymentMatch=[bool]$match;deployments=$depText.Trim()}
  }
  $matches=@($projects|Where-Object{$_.deploymentMatch})
  [ordered]@{ok=($listRc -eq 0);action='APPS_SCRIPT_DEPLOYMENT_INVENTORY';targetDeploymentId=$TargetDeploymentId;projectCount=$projects.Count;matchCount=$matches.Count;matches=$matches;projects=$projects;listText=$listText.Trim();at=(Get-Date).ToString('o')}|ConvertTo-Json -Depth 20 -Compress
  if($TargetDeploymentId -and $matches.Count -ne 1){exit 2}else{exit 0}
}

function Invoke-Previous {
  $h=@{'User-Agent'='HomeDesign-Chrome-Worker';'Accept'='application/vnd.github+json'}
  $u='https://api.github.com/repos/'+$Repo+'/contents/'+$ScriptPath+'?ref='+$PreviousCommit
  $r=Invoke-RestMethod -Uri $u -Headers $h -Method Get -TimeoutSec 20
  $tmp=Join-Path $env:TEMP ('Recover-AnimationRuntime-Lineage-worker-base-'+[guid]::NewGuid().ToString('N')+'.ps1')
  [IO.File]::WriteAllBytes($tmp,[Convert]::FromBase64String(([string]$r.content -replace '\s','')))
  $args=@()
  if($DryRun){$args+='-DryRun'};if($ListOnly){$args+='-ListOnly'};if($ChromeUrlOnly){$args+='-ChromeUrlOnly'};if($CftBoundScriptRecovery){$args+='-CftBoundScriptRecovery'}
  if($ChromeUrlPrefix){$args+=@('-ChromeUrlPrefix',$ChromeUrlPrefix)};if($TargetSpreadsheetId){$args+=@('-TargetSpreadsheetId',$TargetSpreadsheetId)}
  if($TargetCodePattern){$args+=@('-TargetCodePattern',$TargetCodePattern)};if($TargetNamePattern){$args+=@('-TargetNamePattern',$TargetNamePattern)}
  if($TargetLabel){$args+=@('-TargetLabel',$TargetLabel)};if($CentralReadbackName){$args+=@('-CentralReadbackName',$CentralReadbackName)}
  if($ChromeWorkerDriveHandoff){$args+='-ChromeWorkerDriveHandoff'}
  if($Worker){$args+=@('-Worker',$Worker)};if($WorkerTaskId){$args+=@('-WorkerTaskId',$WorkerTaskId)};if($WorkerParentTaskId){$args+=@('-WorkerParentTaskId',$WorkerParentTaskId)}
  if($WorkerAction){$args+=@('-WorkerAction',$WorkerAction)};if($WorkerPrompt){$args+=@('-WorkerPrompt',$WorkerPrompt)};if($WorkerTargetUrl){$args+=@('-WorkerTargetUrl',$WorkerTargetUrl)}
  if($WorkerTimeoutSeconds){$args+=@('-WorkerTimeoutSeconds',[string]$WorkerTimeoutSeconds)}
  if($ChromeWorkerDriveHandoff){
    $parent=Resolve-DriveFsParent
    if($parent){try{New-PSDrive -Name 'HDCENTRAL' -PSProvider FileSystem -Root $parent -Scope Global -ErrorAction Stop|Out-Null;Write-Host ('DRIVEFS_PARENT='+$parent)}catch{}}
  }
  & $tmp @args
  $code=$LASTEXITCODE
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  exit $code
}

if($DeploymentInventory){Invoke-DeploymentInventory}
Invoke-Previous
