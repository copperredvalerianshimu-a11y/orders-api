#!/usr/bin/env bash

RUNS=${1:-10}
LABEL=${2:-"default_run"}
BASE_URL="http://localhost:3000"

ENDPOINTS=(
  "/health"
  "/orders?page=1&limit=20"
  "/orders?status=paid&customerId=15"
  "/orders/500"
  "/customers/15"
)

echo "label,endpoint,run,seconds"

for endpoint in "${ENDPOINTS[@]}"; do
  url="${BASE_URL}${endpoint}"
  
  for ((run=1; run<=RUNS; run++)); do
    seconds=$(curl -s -o /dev/null -w "%{time_total}" "$url")
    echo "\"$LABEL\",\"$endpoint\",$run,$seconds"
  done
done