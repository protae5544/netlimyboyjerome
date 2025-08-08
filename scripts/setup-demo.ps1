Param(
  [string]$DocId = "68000123"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$storageDir = Join-Path $root "storage\pdf"
$outFile = Join-Path $storageDir "$DocId.pdf"

$sampleUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"

Write-Host "[setup-demo] Preparing storage at: $storageDir"
New-Item -ItemType Directory -Force -Path $storageDir | Out-Null

Write-Host "[setup-demo] Downloading sample PDF -> $outFile"
try {
  $ProgressPreference = 'SilentlyContinue'
  Invoke-WebRequest -Uri $sampleUrl -OutFile $outFile -UseBasicParsing
  Write-Host "[setup-demo] Done. Sample file saved at $outFile"
} catch {
  Write-Error "Download failed. Please download manually:`n  $sampleUrl`nThen save as:`n  $outFile"
  exit 1
}
