[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ExtensionId,

  [Parameter(Mandatory = $true)]
  [ValidateSet('Chrome', 'Brave', 'Chromium')]
  [string]$Browser,

  [Parameter(Mandatory = $true)]
  [string]$ConnectorPath,

  [Parameter(Mandatory = $true)]
  [string]$InstallRoot,

  [Parameter(Mandatory = $false)]
  [string]$DiscordApplicationId
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($ExtensionId -notmatch '^[a-p]{32}$') {
  throw 'ExtensionId must be a 32-character Chromium extension ID using letters a-p.'
}

$resolvedConnector = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $ConnectorPath).Path)
$resolvedRoot = [System.IO.Path]::GetFullPath($InstallRoot)
New-Item -ItemType Directory -Path $resolvedRoot -Force | Out-Null

$manifestPath = Join-Path $resolvedRoot 'com.listenpresence.connector.json'
$manifest = [ordered]@{
  name = 'com.listenpresence.connector'
  description = 'ListenPresence local Discord Rich Presence connector'
  path = $resolvedConnector
  type = 'stdio'
  allowed_origins = @("chrome-extension://$ExtensionId/")
}
$manifestJson = $manifest | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText($manifestPath, $manifestJson, [System.Text.UTF8Encoding]::new($false))

if ($DiscordApplicationId) {
  if ($DiscordApplicationId -notmatch '^\d{17,20}$') {
    throw 'DiscordApplicationId must be a Discord application snowflake.'
  }
  $configJson = @{ discordApplicationId = $DiscordApplicationId } | ConvertTo-Json
  [System.IO.File]::WriteAllText((Join-Path $resolvedRoot 'config.json'), $configJson, [System.Text.UTF8Encoding]::new($false))
}

$registryBases = switch ($Browser) {
  'Chrome' { @('HKCU:\Software\Google\Chrome\NativeMessagingHosts') }
  'Brave' {
    @(
      'HKCU:\Software\Google\Chrome\NativeMessagingHosts',
      'HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts'
    )
  }
  'Chromium' { @('HKCU:\Software\Chromium\NativeMessagingHosts') }
}

foreach ($registryBase in $registryBases) {
  $registryKey = Join-Path $registryBase 'com.listenpresence.connector'
  New-Item -Path $registryKey -Force | Out-Null
  Set-ItemProperty -LiteralPath $registryKey -Name '(default)' -Value $manifestPath -Force
  $registeredManifestPath = (Get-Item -LiteralPath $registryKey).GetValue('')
  if ($registeredManifestPath -ne $manifestPath) {
    throw "Native Messaging registration could not be verified for $Browser."
  }
}

Write-Output "Registered ListenPresence for $Browser."
