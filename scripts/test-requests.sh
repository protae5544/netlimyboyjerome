#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:8080}"
DOC_ID="${DOC_ID:-68000123}"

echo "[test] 200 OK -> ${BASE}/api/pdf?id=${DOC_ID}"
curl -s -D /tmp/headers1.txt -o /dev/null "${BASE}/api/pdf?id=${DOC_ID}" || true
grep -E "HTTP/1.1|HTTP/2" /tmp/headers1.txt | tail -n1
grep -E "Content-Type|Content-Disposition|ETag|Last-Modified" /tmp/headers1.txt || true

ETAG=$(grep -i '^ETag:' /tmp/headers1.txt | sed -E 's/ETag:\s*(.*)/\1/i' | tr -d '\r')
if [ -n "${ETAG}" ]; then
  echo "[test] 304 Not Modified with If-None-Match: ${ETAG}"
  curl -s -D /tmp/headers2.txt -H "If-None-Match: ${ETAG}" -o /dev/null "${BASE}/api/pdf?id=${DOC_ID}" || true
  grep -E "HTTP/1.1|HTTP/2" /tmp/headers2.txt | tail -n1
else
  echo "[test] Skip 304 test (no ETag found)"
fi

echo "[test] 404 Not Found"
curl -s -D /tmp/headers3.txt -o /dev/null "${BASE}/api/pdf?id=99999999" || true
grep -E "HTTP/1.1|HTTP/2" /tmp/headers3.txt | tail -n1

echo "[test] 400 Bad Request (missing id)"
curl -s -D /tmp/headers4.txt -o /dev/null "${BASE}/api/pdf" || true
grep -E "HTTP/1.1|HTTP/2" /tmp/headers4.txt | tail -n1

echo "[test] 400 Bad Request (invalid id)"
curl -s -D /tmp/headers5.txt -o /dev/null "${BASE}/api/pdf?id=../../etc/passwd" || true
grep -E "HTTP/1.1|HTTP/2" /tmp/headers5.txt | tail -n1

echo "[test] Done."
