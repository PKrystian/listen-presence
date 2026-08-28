param()

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$paths = @(
  (Join-Path $root 'dist\native-host\listenpresence-connector.exe'),
  (Join-Path $root 'dist\release\ListenPresence-Setup.exe')
)

foreach ($path in $paths) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Release file was not found: $path"
  }
  $signature = Get-AuthenticodeSignature -LiteralPath $path
  if ($signature.Status -ne 'Valid') {
    throw "Authenticode verification failed for $path with status $($signature.Status)."
  }
  if ($null -eq $signature.TimeStamperCertificate) {
    throw "The Authenticode signature has no trusted timestamp: $path"
  }
  Write-Output "Verified $path"
}
