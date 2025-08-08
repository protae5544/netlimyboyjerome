#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-8080}"
STORAGE_ROOT="${STORAGE_ROOT:-${ROOT_DIR}/storage/pdf}"
STATIC_ROOT="${STATIC_ROOT:-${ROOT_DIR}}"
DOC_ID="${DOC_ID:-68000123}"

command_exists() { command -v "$1" >/dev/null 2>&1; }

if ! command_exists java; then
  echo "[run-server] Error: Java (JDK) not found in PATH"
  exit 1
fi

if ! command_exists mvn; then
  echo "[run-server] Error: Maven (mvn) not found in PATH"
  exit 1
fi

echo "[run-server] Using JAR from: ${ROOT_DIR}/server/target/pdf-server.jar"
echo "[run-server] PORT=${PORT}"
echo "[run-server] STORAGE_ROOT=${STORAGE_ROOT}"
echo "[run-server] STATIC_ROOT=${STATIC_ROOT}"

# Ensure storage directory exists
mkdir -p "${STORAGE_ROOT}"

if [ ! -f "${ROOT_DIR}/server/target/pdf-server.jar" ]; then
  echo "[run-server] Building server..."
  mvn -q -DskipTests -f "${ROOT_DIR}/server/pom.xml" package
fi

# Hint if sample file not present
SAMPLE="${STORAGE_ROOT}/${DOC_ID}.pdf"
if [ ! -f "${SAMPLE}" ]; then
  echo "[run-server] Note: Sample PDF not found at ${SAMPLE}"
  echo "[run-server]       You can run: scripts/setup-demo.sh ${DOC_ID}"
fi

echo "[run-server] Starting server..."
echo "[run-server] UI URL:   http://localhost:${PORT}/"
echo "[run-server] API URL:  http://localhost:${PORT}/api/pdf?id=${DOC_ID}"
exec env PORT="${PORT}" STORAGE_ROOT="${STORAGE_ROOT}" STATIC_ROOT="${STATIC_ROOT}" java -jar "${ROOT_DIR}/server/target/pdf-server.jar"
