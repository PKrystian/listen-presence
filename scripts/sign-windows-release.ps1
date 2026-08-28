param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[A-Fa-f0-9]{40}$')]
  [string]$CertificateThumbprint,

  [ValidatePattern('^https?://')]
  [string]$TimestampUrl = 'http://timestamp.digicert.com'
)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$connectorPath = Join-Path $root 'dist\native-host\listenpresence-connector.exe'
$setupPath = Join-Path $root 'dist\release\ListenPresence-Setup.exe'

$signToolCommand = Get-Command 'signtool.exe' -ErrorAction SilentlyContinue
if ($null -eq $signToolCommand) {
  $kitsRoot = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'
  $signToolPath = Get-ChildItem -LiteralPath $kitsRoot -Filter 'signtool.exe' -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '\\x64\\signtool\.exe$' } |
    Sort-Object FullName -Descending |
    Select-Object -First 1 -ExpandProperty FullName
} else {
  $signToolPath = $signToolCommand.Source
}
if ([string]::IsNullOrWhiteSpace($signToolPath)) {
  throw 'signtool.exe was not found. Install the Windows SDK or add SignTool to PATH.'
}
if (-not (Test-Path -LiteralPath $connectorPath -PathType Leaf)) {
  throw "Connector build was not found: $connectorPath"
}

function Invoke-SignFile {
  param([Parameter(Mandatory = $true)][string]$Path)

  & $signToolPath sign /sha1 $CertificateThumbprint /s My /fd SHA256 /tr $TimestampUrl /td SHA256 /d ListenPresence $Path
  if ($LASTEXITCODE -ne 0) {
    throw "SignTool failed to sign $Path"
  }
  & $signToolPath verify /pa /all /v $Path
  if ($LASTEXITCODE -ne 0) {
    throw "SignTool could not verify $Path"
  }
}

Invoke-SignFile -Path $connectorPath
& node (Join-Path $root 'scripts\build-installer.mjs')
if ($LASTEXITCODE -ne 0) {
  throw 'The Windows setup rebuild failed.'
}
Invoke-SignFile -Path $setupPath

Write-Output 'The connector and self-contained setup are Authenticode-signed and verified.'
