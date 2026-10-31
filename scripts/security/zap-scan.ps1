[CmdletBinding()]
param(
  [string]$TargetUrl = 'http://127.0.0.1:3000',
  [ValidateRange(15, 120)][int]$SpiderSeconds = 60
)

$ErrorActionPreference = 'Stop'
$target = [Uri]$TargetUrl
if ($target.Scheme -ne 'http' -or $target.Host -notin @('127.0.0.1', 'localhost') -or
    $target.UserInfo -or $target.Query -or $target.Fragment -or $target.AbsolutePath -ne '/') {
  throw 'This scan permits only an unauthenticated HTTP localhost origin.'
}
$targetOrigin = $target.GetLeftPart([UriPartial]::Authority)
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$toolsDirectory = Join-Path $workspaceRoot '.security-tools'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$scanDirectory = Join-Path $toolsDirectory ('scan-' + $stamp)
$homeDirectory = Join-Path $scanDirectory 'home'
New-Item -ItemType Directory -Path $homeDirectory -Force | Out-Null
$zapJar = Join-Path $toolsDirectory 'ZAP_2.17.0/zap-2.17.0.jar'
if (-not (Test-Path -LiteralPath $zapJar)) {
  & (Join-Path $PSScriptRoot 'install-zap.ps1') | Out-Null
}

# Keep ZAP API and session data local. No application credentials are supplied.
$apiKey = [Guid]::NewGuid().ToString('N')
$configFile = Join-Path $scanDirectory 'daemon.properties'
@('api.disablekey=false', ('api.key=' + $apiKey), 'connection.timeoutInSecs=8',
  'spider.thread=2', 'spider.maxDepth=3', 'spider.processForm=false',
  'spider.postForm=false', 'spider.parseComments=false') | Set-Content -LiteralPath $configFile -Encoding ASCII
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$listener.Start()
$zapPort = $listener.LocalEndpoint.Port
$listener.Stop()
$apiOrigin = 'http://127.0.0.1:' + $zapPort

function Invoke-ZapApi {
  param([string]$Endpoint, [hashtable]$Parameters = @{})
  $query = @('apikey=' + $apiKey)
  foreach ($item in $Parameters.GetEnumerator()) {
    $query += [Uri]::EscapeDataString($item.Key) + '=' + [Uri]::EscapeDataString([string]$item.Value)
  }
  Invoke-RestMethod -Uri ($apiOrigin + '/JSON/' + $Endpoint + '/?' + ($query -join '&')) -TimeoutSec 15
}

$processArguments = '-jar "' + $zapJar + '" -daemon -silent -dir "' + $homeDirectory +
  '" -configfile "' + $configFile + '" -host 127.0.0.1 -port ' + $zapPort
$daemon = Start-Process -FilePath (Get-Command java).Source -ArgumentList $processArguments -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $scanDirectory 'daemon.stdout.log') `
  -RedirectStandardError (Join-Path $scanDirectory 'daemon.stderr.log')

try {
  $ready = $false
  $deadline = [DateTime]::UtcNow.AddSeconds(90)
  while ([DateTime]::UtcNow -lt $deadline -and -not $ready) {
    if ($daemon.HasExited) { throw 'ZAP exited during startup; inspect the local daemon log.' }
    try { $version = (Invoke-ZapApi 'core/view/version').version; $ready = $true } catch { Start-Sleep -Seconds 1 }
  }
  if (-not $ready) { throw 'ZAP did not become ready in 90 seconds.' }

  $contextName = 'localhost-passive'
  $scope = '^' + [Regex]::Escape($targetOrigin) + '(?:/.*)?$'
  Invoke-ZapApi 'context/action/newContext' @{ contextName = $contextName } | Out-Null
  Invoke-ZapApi 'context/action/includeInContext' @{ contextName = $contextName; regex = $scope } | Out-Null
  Invoke-ZapApi 'context/action/setContextInScope' @{ contextName = $contextName; booleanInScope = 'true' } | Out-Null
  Invoke-ZapApi 'core/action/setMode' @{ mode = 'protect' } | Out-Null
  Invoke-ZapApi 'pscan/action/setScanOnlyInScope' @{ onlyInScope = 'true' } | Out-Null

  # Prime selected GET endpoints without submitting forms, canceling or placing orders.
  $seedPaths = @('/', '/login', '/purchase', '/orders', '/settings/delivery', '/admin/purchases', '/admin/support', '/api/purchases', '/api/delivery-profile',
    '/api/admin/purchases', '/api/admin-settings', '/api/agent/stream', '/api/chat', '/api/draft-order')
  foreach ($seedPath in $seedPaths) {
    Invoke-ZapApi 'core/action/accessUrl' @{ url = $targetOrigin + $seedPath; followRedirects = 'false' } | Out-Null
  }
  $scanId = (Invoke-ZapApi 'spider/action/scan' @{
    url = $targetOrigin; maxChildren = 20; recurse = 'true'; contextName = $contextName; subtreeOnly = 'true'
  }).scan
  $deadline = [DateTime]::UtcNow.AddSeconds($SpiderSeconds)
  while ([DateTime]::UtcNow -lt $deadline) {
    $status = [int](Invoke-ZapApi 'spider/view/status' @{ scanId = $scanId }).status
    if ($status -eq 100) { break }
    Start-Sleep -Seconds 1
  }
  Invoke-ZapApi 'spider/action/stop' @{ scanId = $scanId } | Out-Null

  $deadline = [DateTime]::UtcNow.AddSeconds(90)
  $pendingRecords = 0
  do {
    $pendingRecords = [int](Invoke-ZapApi 'pscan/view/recordsToScan').recordsToScan
    if ($pendingRecords -eq 0) { break }
    Start-Sleep -Seconds 1
  } while ([DateTime]::UtcNow -lt $deadline)

  $alerts = @((Invoke-ZapApi 'core/view/alerts' @{ baseurl = $targetOrigin; start = 0; count = 1000 }).alerts)
  $urls = @((Invoke-ZapApi 'core/view/urls' @{ baseurl = $targetOrigin }).urls)
  $reportJson = Join-Path $scanDirectory 'zap-passive.json'
  $reportHtml = Join-Path $scanDirectory 'zap-passive.html'
  $alerts | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $reportJson -Encoding UTF8
  $html = Invoke-WebRequest -UseBasicParsing -Uri ($apiOrigin + '/OTHER/core/other/htmlreport/?apikey=' + $apiKey) -TimeoutSec 15
  $html.Content | Set-Content -LiteralPath $reportHtml -Encoding UTF8

  # Publish only a sanitized summary. Raw HTTP evidence remains ignored under .security-tools.
  $summary = [ordered]@{
    scanner = 'ZAP'; version = $version; target = $targetOrigin; scanType = 'passive';
    generatedAtUtc = [DateTime]::UtcNow.ToString('o'); scannedUrls = $urls.Count;
    pendingPassiveRecords = $pendingRecords; activeScanPerformed = $false; authenticated = $false;
    alerts = @($alerts | Group-Object pluginId | ForEach-Object {
      $first = $_.Group[0]
      [ordered]@{ rule = $_.Name; name = $first.alert; risk = $first.risk; confidence = $first.confidence; instances = $_.Count }
    }); reportJson = $reportJson; reportHtml = $reportHtml
  }
  $summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $scanDirectory 'summary.json') -Encoding UTF8
  $summary | ConvertTo-Json -Depth 6
} finally {
  if (-not $daemon.HasExited) {
    try { Invoke-ZapApi 'core/action/shutdown' | Out-Null; $daemon.WaitForExit(10000) | Out-Null } catch {}
    if (-not $daemon.HasExited) { Stop-Process -Id $daemon.Id -Force }
  }
}
