#!/usr/bin/env bash
set -euo pipefail

PERF_THRESHOLD_MS="${PERF_THRESHOLD_MS:-200}"
RUN_COUNT=5
TARGET_ENDPOINT="/orders?page=1&limit=20"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Accumulate run timings
total_seconds="0"

for i in $(seq 1 $RUN_COUNT); do
  # Execute bench.sh for 1 run per iteration and filter for target endpoint
  row=$(bash "${SCRIPT_DIR}/bench.sh" 1 "perf_check_${i}" | grep -F "\"${TARGET_ENDPOINT}\"" || true)
  
  if [ -z "$row" ]; then
    echo "Error: Target endpoint '${TARGET_ENDPOINT}' not found in benchmark output." >&2
    exit 1
  fi

  # Extract the seconds column (4th column in CSV)
  seconds=$(echo "$row" | cut -d',' -f4)
  total_seconds=$(awk -v total="$total_seconds" -v val="$seconds" 'BEGIN { print total + val }')
done

# Calculate average in milliseconds
avg_ms=$(awk -v total="$total_seconds" -v count="$RUN_COUNT" 'BEGIN { printf "%.0f", (total / count) * 1000 }')

echo "orders_list average: ${avg_ms}ms (threshold ${PERF_THRESHOLD_MS}ms)"

if [ "$avg_ms" -gt "$PERF_THRESHOLD_MS" ]; then
  echo "FAIL: Average response time exceeds threshold of ${PERF_THRESHOLD_MS}ms"
  exit 1
else
  echo "PASS: Performance within acceptable threshold"
  exit 0
fi