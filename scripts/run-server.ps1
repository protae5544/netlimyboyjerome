$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$jar = Join-Path $root "server\target\pdf-server.jar"

if (-not (Test-Path $jar)) {
  Write-Host "[run-server] Building server..."
  mvn -q -DskipTests -f "$root\server\pom.xml" package
}

$port = $env:PORT
if (-not $port) { $port = "8080" }

$storageRoot = $env:STORAGE_ROOT
if (-not $storageRoot) { $storageRoot = "$root\storage\pdf" }

$staticRoot = $env:STATIC_ROOT
if (-not $staticRoot) { $staticRoot = "$root" }

Write-Host "[run-server] Using JAR: $jar"
Write-Host "[run-server] PORT=$port"
Write-Host "[run-server] STORAGE_ROOT=$storageRoot"
Write-Host "[run-server] STATIC_ROOT=$staticRoot"

$env:PORT = $port
$env:STORAGE_ROOT = $storageRoot
$env:STATIC_ROOT = $staticRoot

Write-Host "[run-server] UI URL:   http://localhost:$port/"
Write-Host "[run-server] API URL:  http://localhost:$port/api/pdf?id=68000123"

java -jar $jar
