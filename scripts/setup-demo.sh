#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STORAGE_DIR="${ROOT_DIR}/storage/pdf"
DOC_ID="${1:-68000123}"
OUT_FILE="${STORAGE_DIR}/${DOC_ID}.pdf"

SAMPLE_URL="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"

echo "[setup-demo] Preparing storage at: ${STORAGE_DIR}"
mkdir -p "${STORAGE_DIR}"

echo "[setup-demo] Downloading sample PDF -> ${OUT_FILE}"
if command -v curl >/dev/null 2>&1; then
  curl -L -o "${OUT_FILE}" "${SAMPLE_URL}"
elif command -v wget >/dev/null 2>&1; then
  wget -O "${OUT_FILE}" "${SAMPLE_URL}"
else
  echo "Neither curl nor wget is available. Please download manually:"
  echo "  ${SAMPLE_URL}"
  echo "and save it as:"
  echo "  ${OUT_FILE}"
  exit 1
fi

echo "[setup-demo] Done. Sample file saved at ${OUT_FILE}"
