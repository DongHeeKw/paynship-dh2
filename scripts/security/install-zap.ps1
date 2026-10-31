[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$toolsDirectory = Join-Path $workspaceRoot '.security-tools'
$zapVersion = '2.17.0'
$zapDirectory = Join-Path $toolsDirectory ('ZAP_' + $zapVersion)
$zapJar = Join-Path $zapDirectory ('zap-' + $zapVersion + '.jar')

if (Test-Path -LiteralPath $zapJar) { Write-Output $zapJar; exit 0 }
if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw 'ZAP requires Java 17 or newer.' }
New-Item -ItemType Directory -Path $toolsDirectory -Force | Out-Null
$archive = Join-Path $toolsDirectory ('ZAP_' + $zapVersion + '_Crossplatform.zip')
$downloadUrl = 'https://github.com/zaproxy/zaproxy/releases/download/v2.17.0/ZAP_2.17.0_Crossplatform.zip'
$expectedSha256 = '94c8f767b1c2e94f0db66b3ae56514d5e3f5a728ee1b6c798e0c8fe2d61fbff0'

if (-not (Test-Path -LiteralPath $archive)) {
  & curl.exe --fail --location --retry 2 --connect-timeout 15 --max-time 240 --output $archive $downloadUrl
  if ($LASTEXITCODE -ne 0) { throw 'Official ZAP download failed.' }
}
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedSha256) {
  throw 'ZAP checksum mismatch. Delete the untrusted archive before retrying.'
}
Expand-Archive -LiteralPath $archive -DestinationPath $toolsDirectory -Force
if (-not (Test-Path -LiteralPath $zapJar)) { throw 'ZAP archive did not contain the expected launcher.' }
Write-Output $zapJar
