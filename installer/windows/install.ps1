[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ExtensionId,

  [Parameter(Mandatory = $true)]
  [string]$DiscordApplicationId,

  [Parameter(Mandatory = $false)]
  [ValidateSet('Chrome', 'Brave', 'Both', 'Chromium')]
  [string]$Browser = 'Both',

  [Parameter(Mandatory = $false)]
  [string]$ConnectorBinary
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ConnectorBinary)) {
  $ConnectorBinary = Join-Path $PSScriptRoot '..\..\dist\native-host\listenpresence-connector.exe'
}

if (-not (Test-Path -LiteralPath $ConnectorBinary -PathType Leaf)) {
  throw "Connector binary was not found: $ConnectorBinary"
}

$installRoot = Join-Path $env:LOCALAPPDATA 'ListenPresence'
New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
$installedBinary = Join-Path $installRoot 'listenpresence-connector.exe'
Copy-Item -LiteralPath $ConnectorBinary -Destination $installedBinary -Force

$browsers = switch ($Browser) {
  'Both' { @('Chrome', 'Brave') }
  default { @($Browser) }
}

foreach ($target in $browsers) {
  & (Join-Path $PSScriptRoot 'register-host.ps1') `
    -ExtensionId $ExtensionId `
    -Browser $target `
    -ConnectorPath $installedBinary `
    -InstallRoot $installRoot `
    -DiscordApplicationId $DiscordApplicationId
}

Write-Output 'ListenPresence connector installed for the current Windows user.'
Write-Output 'No Windows service, scheduled task, or automatic login startup entry was created.'
