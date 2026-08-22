[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)]
  [ValidateSet('Chrome', 'Brave', 'Both', 'Chromium')]
  [string]$Browser = 'Both'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$installRoot = [System.IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'ListenPresence'))
$expectedRoot = [System.IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'ListenPresence'))
if ($installRoot -ne $expectedRoot) {
  throw 'Refusing to remove an unexpected installation path.'
}

$browsers = switch ($Browser) {
  'Both' { @('Chrome', 'Brave') }
  default { @($Browser) }
}

foreach ($target in $browsers) {
  $registryBases = switch ($target) {
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
    if (Test-Path -LiteralPath $registryKey) {
      Remove-Item -LiteralPath $registryKey -Recurse -Force
    }
  }
}

if (Test-Path -LiteralPath $installRoot) {
  Remove-Item -LiteralPath $installRoot -Recurse -Force
}

Write-Output 'ListenPresence connector registration and per-user files were removed.'
