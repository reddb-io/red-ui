#!/usr/bin/env bash
# Seed a running reddb instance with realistic fixtures so the UI has
# something interesting to render. Targets the docker primary by default.
#
# Usage: ./scripts/seed.sh [base-url]
set -euo pipefail

BASE="${1:-http://localhost:15055}"

wait_for_ready() {
  local i=0
  echo -n "▸ waiting for $BASE/stats "
  until curl -sf "$BASE/stats" >/dev/null 2>&1; do
    sleep 0.5
    i=$((i + 1))
    echo -n "."
    if [ $i -gt 60 ]; then echo " timeout"; exit 1; fi
  done
  echo " ok"
}

create_collection() {
  local name="$1"
  curl -sf -X POST "$BASE/collections" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$name\"}" >/dev/null && echo "  ✓ created collection $name" || true
}

insert_doc() {
  local coll="$1" body="$2"
  curl -sf -X POST "$BASE/collections/$coll/documents" \
    -H "Content-Type: application/json" \
    -d "$body" >/dev/null
}

run_query() {
  local q="$1"
  curl -sf -X POST "$BASE/query" \
    -H "Content-Type: application/json" \
    -d "$(jq -nc --arg q "$q" '{query:$q}')"
}

wait_for_ready

echo ""
echo "▸ creating collections"
create_collection users
create_collection orders
create_collection tenants

echo ""
echo "▸ seeding users (50 docs)"
NAMES=(Ada Linus Grace Alan Margaret Dennis Barbara Ken Hedy Donald)
SURN=(Lovelace Torvalds Hopper Turing Hamilton Ritchie Liskov Thompson Lamarr Knuth)
STATUSES=(active paused churned trial)
for i in $(seq 0 49); do
  n=${NAMES[$((i % 10))]}
  s=${SURN[$((i % 10))]}
  st=${STATUSES[$((i % 4))]}
  body=$(jq -nc \
    --arg id "u_$(printf %03d $i)" \
    --arg email "$(echo $n | tr A-Z a-z).$(echo $s | tr A-Z a-z)+$i@acme.io" \
    --arg name "$n $s" \
    --arg status "$st" \
    --arg tenant_slug "acme-prod" \
    '{id:$id, email:$email, name:$name, status:$status, tenant_slug:$tenant_slug}')
  insert_doc users "$body"
done
echo "  ✓ 50 users inserted"

echo ""
echo "▸ seeding tenants (5 docs)"
PLANS=(enterprise pro pro free internal)
i=0
for slug in acme-prod globex initech umbrella reddb-io; do
  body=$(jq -nc --arg slug "$slug" --arg plan "${PLANS[$i]}" --argjson mrr $((i * 4900 + 990)) \
    '{slug:$slug, plan:$plan, mrr_cents:$mrr}')
  insert_doc tenants "$body"
  i=$((i + 1))
done
echo "  ✓ 5 tenants inserted"

echo ""
echo "▸ seeding orders (200 docs)"
for i in $(seq 1 200); do
  amount=$((50 + (i * 17) % 450))
  cur=$([ $((i % 3)) -eq 0 ] && echo BRL || ([ $((i % 3)) -eq 1 ] && echo USD || echo EUR))
  shipped=$([ $((i % 5)) -ne 0 ] && echo true || echo false)
  body=$(jq -nc --arg id "o_$(printf %05d $i)" --arg user "u_$(printf %03d $((i % 50)))" \
    --argjson amount "$amount" --arg currency "$cur" --argjson shipped "$shipped" \
    '{id:$id, user_id:$user, amount:$amount, currency:$currency, shipped:$shipped}')
  insert_doc orders "$body"
done
echo "  ✓ 200 orders inserted"

echo ""
echo "▸ verifying"
echo "  collections:"
curl -sf "$BASE/collections" | jq -c '.'
echo "  users count:"
run_query "SELECT COUNT(*) FROM users" | jq -c '.result.records // .'
echo "  orders count:"
run_query "SELECT COUNT(*) FROM orders" | jq -c '.result.records // .'
echo "  stats:"
curl -sf "$BASE/stats" | jq -c '{collection_count: .store.collection_count, total_entities: .store.total_entities, mem_bytes: .store.total_memory_bytes}'

echo ""
echo "✓ seed complete · UI: http://localhost:1420"
