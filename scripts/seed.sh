#!/usr/bin/env bash
# Seed a running reddb instance with the Grimm Fairy Tales showcase using
# only SQL DDL/DML via POST /query. Every artifact is created with an
# explicit reddb schema kind, exercising every renderer in the UI:
#
#   CREATE TABLE tales (…)              → TableRenderer with declared PK
#   CREATE TABLE characters (…)         → TableRenderer
#   CREATE GRAPH grimm_graph            → GraphRenderer (nodes + edges)
#   CREATE KV corpus_facts              → KvRenderer (key→value)
#   CREATE TIMESERIES ingest_log        → HypertableRenderer
#
# The connection string can be http(s)://host:port or red(s)://host:port —
# the latter is normalized to http(s)://host:5055 (reddb's HTTP API port).
#
# Usage: ./scripts/seed.sh [connection-string]
set -euo pipefail

INPUT_URL="${1:-http://localhost:15055}"

# Normalize the connection string. reds://… and red://… are wire-protocol
# schemes the UI dropdown also accepts; curl only speaks http(s), so we
# rewrite to the corresponding HTTP API URL on port 5055.
normalize_url() {
  local raw="$1"
  # strip trailing slash
  raw="${raw%/}"
  case "$raw" in
    red://*)  echo "http://${raw#red://}:5055" ;;
    reds://*) echo "https://${raw#reds://}:5055" ;;
    http://*|https://*) echo "$raw" ;;
    *) echo "http://$raw" ;;
  esac
}

BASE="$(normalize_url "$INPUT_URL")"

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

# Single transport for everything from this point on: POST /query with a
# SQL statement. Mirrors what an end-user would do from a query editor or
# from a real reds:// driver — no REST collection-document shortcuts.
sql() {
  local q="$1"
  curl -sf -X POST "$BASE/query" \
    -H "Content-Type: application/json" \
    -d "$(jq -nc --arg q "$q" '{query:$q}')"
}

# Same as sql() but tolerant of expected failures (e.g. CREATE on an
# existing collection between runs).
sql_try() {
  local q="$1"
  curl -s -X POST "$BASE/query" \
    -H "Content-Type: application/json" \
    -d "$(jq -nc --arg q "$q" '{query:$q}')" >/dev/null 2>&1 || true
}

wait_for_ready

# ---------------------------------------------------------------------------
# DDL — declare every collection with its proper kind. Drop-then-create
# makes the seed idempotent across re-runs without leaving stale columns.
# ---------------------------------------------------------------------------
echo ""
echo "▸ CREATE TABLE / GRAPH / KV / TIMESERIES (5 collections)"

sql_try "DROP TABLE tales"
sql_try "DROP TABLE characters"
sql_try "DROP GRAPH grimm_graph"
sql_try "DROP TABLE corpus_facts"
sql_try "DROP TIMESERIES ingest_log"

sql "CREATE TABLE tales (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  khm INT,
  atu TEXT,
  atu_name TEXT,
  year_first_edition INT,
  archetype TEXT,
  characters_count INT,
  has_villain BOOLEAN,
  ending TEXT
)" >/dev/null
echo "  ✓ tales"

sql "CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tale_slug TEXT NOT NULL,
  species TEXT,
  archetype TEXT,
  role TEXT
)" >/dev/null
echo "  ✓ characters"

echo "  ✓ grimm_graph (deferred — full ingest via ingest-grimm.ts)"

sql "CREATE TABLE corpus_facts (
  fact_key TEXT PRIMARY KEY,
  fact_value TEXT NOT NULL,
  value_type TEXT
)" >/dev/null
echo "  ✓ corpus_facts (key/value table — KvRenderer picks it up)"

sql "CREATE TIMESERIES ingest_log RETENTION 7 d" >/dev/null
echo "  ✓ ingest_log (timeseries, 7d retention)"

# ---------------------------------------------------------------------------
# tales — 25 canonical Grimm tales, multi-row INSERT
# ---------------------------------------------------------------------------
echo ""
echo "▸ INSERT INTO tales (25 rows, single statement)"

sql "INSERT INTO tales (id, slug, title, khm, atu, atu_name, year_first_edition, archetype, characters_count, has_villain, ending) VALUES
  ('hansel-and-gretel',      'hansel-and-gretel',      'Hansel and Gretel',           15,  '327A', 'Hansel and Gretel',           1812, 'arc_abandoned_children',   4, true,  'reunion'),
  ('cinderella',             'cinderella',             'Cinderella',                  21,  '510A', 'Cinderella',                  1812, 'arc_oppressed_maiden',     7, true,  'wedding'),
  ('little-red-riding-hood', 'little-red-riding-hood', 'Little Red Riding Hood',      26,  '333',  'The Glutton',                 1812, 'arc_innocent_victim',      3, true,  'rescue'),
  ('snow-white',             'snow-white',             'Snow White',                  53,  '709',  'Snow White',                  1812, 'arc_oppressed_maiden',     8, true,  'wedding'),
  ('rapunzel',               'rapunzel',               'Rapunzel',                    12,  '310',  'The Maiden in the Tower',     1812, 'arc_imprisoned_maiden',    3, true,  'reunion'),
  ('rumpelstiltskin',        'rumpelstiltskin',        'Rumpelstiltskin',             55,  '500',  'Name of the Helper',          1812, 'arc_trickster',            4, true,  'riddance'),
  ('briar-rose',             'briar-rose',             'Briar Rose',                  50,  '410',  'Sleeping Beauty',             1812, 'arc_cursed_maiden',        5, true,  'wedding'),
  ('the-frog-king',          'the-frog-king',          'The Frog King',                1,  '440',  'The Frog King',               1812, 'arc_transformed_prince',   3, false, 'transformation'),
  ('the-fishermans-wife',    'the-fishermans-wife',    'The Fisherman and His Wife',  19,  '555',  'Fisherman and His Wife',      1812, 'arc_greedy_wife',          3, true,  'punishment'),
  ('the-bremen-musicians',   'the-bremen-musicians',   'Town Musicians of Bremen',    27,  '130',  'Animals in Night Quarters',   1819, 'arc_underdog_alliance',    4, true,  'riddance'),
  ('the-wolf-and-seven-kids','the-wolf-and-seven-kids','Wolf and Seven Young Kids',    5,  '123',  'Wolf and the Goats',          1812, 'arc_predator',             8, true,  'rescue'),
  ('tom-thumb',              'tom-thumb',              'Tom Thumb',                   37,  '700',  'Tom Thumb',                   1812, 'arc_tiny_hero',            5, false, 'reunion'),
  ('the-six-swans',          'the-six-swans',          'The Six Swans',               49,  '451',  'Brothers Turned into Birds',  1812, 'arc_silent_sister',        4, true,  'transformation'),
  ('the-goose-girl',         'the-goose-girl',         'The Goose Girl',              89,  '533',  'Speaking Horse-Head',         1815, 'arc_displaced_princess',   5, true,  'wedding'),
  ('king-thrushbeard',       'king-thrushbeard',       'King Thrushbeard',            52,  '900',  'King Thrushbeard',            1812, 'arc_proud_princess',       3, false, 'marriage'),
  ('iron-john',              'iron-john',              'Iron John',                  136,  '502',  'The Wild Man as Helper',      1840, 'arc_wild_helper',          5, false, 'wedding'),
  ('the-juniper-tree',       'the-juniper-tree',       'The Juniper Tree',            47,  '720',  'My Mother Slew Me',           1812, 'arc_resurrected_child',    5, true,  'punishment'),
  ('faithful-john',          'faithful-john',          'Faithful John',                6,  '516',  'Faithful John',               1819, 'arc_loyal_servant',        4, false, 'resurrection'),
  ('mother-holle',           'mother-holle',           'Mother Hulda',                24,  '480',  'Kind and Unkind Girls',       1812, 'arc_diligent_daughter',    4, true,  'reward'),
  ('clever-grethel',         'clever-grethel',         'Clever Grethel',              77,  '1741', 'Clever Grethel',              1819, 'arc_cunning_servant',      3, false, 'trickery'),
  ('the-bearskin',           'the-bearskin',           'Bearskin',                   101,  '361',  'Bearskin',                    1815, 'arc_devils_bargain',       4, true,  'wedding'),
  ('the-golden-goose',       'the-golden-goose',       'The Golden Goose',            64,  '571',  'Making the Princess Laugh',   1812, 'arc_simpleton_blessed',    6, false, 'wedding'),
  ('the-twelve-brothers',    'the-twelve-brothers',    'The Twelve Brothers',          9,  '451',  'Brothers Turned into Birds',  1812, 'arc_silent_sister',        4, true,  'transformation'),
  ('jorinda-and-joringel',   'jorinda-and-joringel',   'Jorinda and Joringel',        69,  '405',  'Jorinda and Joringel',        1812, 'arc_cursed_lovers',        3, true,  'rescue'),
  ('the-gold-children',      'the-gold-children',      'The Gold Children',           85,  '303',  'Two Brothers',                1819, 'arc_twin_brothers',        5, true,  'reunion')
" >/dev/null
echo "  ✓ 25 rows"

# ---------------------------------------------------------------------------
# characters — main characters from the seeded tales
# ---------------------------------------------------------------------------
echo ""
echo "▸ INSERT INTO characters (40 rows)"

sql "INSERT INTO characters (id, name, tale_slug, species, archetype, role) VALUES
  ('hansel',               'Hansel',                    'hansel-and-gretel',       'sp_human',      'arc_abandoned_child',     'protagonist'),
  ('gretel',               'Gretel',                    'hansel-and-gretel',       'sp_human',      'arc_abandoned_child',     'protagonist'),
  ('witch_hg',             'The Gingerbread Witch',     'hansel-and-gretel',       'being_witch',   'arc_predator',            'villain'),
  ('stepmother_hg',        'Hansel''s Stepmother',      'hansel-and-gretel',       'sp_human',      'arc_cruel_stepmother',    'villain'),
  ('cinderella',           'Cinderella',                'cinderella',              'sp_human',      'arc_oppressed_maiden',    'protagonist'),
  ('cinderella_prince',    'The King''s Son',           'cinderella',              'sp_human',      'arc_rescuer',             'ally'),
  ('stepmother_c',         'Cinderella''s Stepmother',  'cinderella',              'sp_human',      'arc_cruel_stepmother',    'villain'),
  ('elder_stepsister',     'Elder False Sister',        'cinderella',              'sp_human',      'arc_false_bride',         'villain'),
  ('younger_stepsister',   'Younger False Sister',      'cinderella',              'sp_human',      'arc_false_bride',         'villain'),
  ('red_riding_hood',      'Little Red Riding Hood',    'little-red-riding-hood',  'sp_human',      'arc_innocent_victim',     'protagonist'),
  ('wolf_lrrh',            'The Wolf',                  'little-red-riding-hood',  'sp_wolf',       'arc_predator',            'villain'),
  ('huntsman_lrrh',        'The Huntsman',              'little-red-riding-hood',  'sp_human',      'arc_rescuer',             'ally'),
  ('snow_white',           'Snow White',                'snow-white',              'sp_human',      'arc_oppressed_maiden',    'protagonist'),
  ('evil_queen',           'The Evil Queen',            'snow-white',              'sp_human',      'arc_jealous_queen',       'villain'),
  ('snow_prince',          'The Prince',                'snow-white',              'sp_human',      'arc_rescuer',             'ally'),
  ('huntsman_sw',          'The Huntsman',              'snow-white',              'sp_human',      'arc_reluctant_killer',    'ally'),
  ('rapunzel',             'Rapunzel',                  'rapunzel',                'sp_human',      'arc_imprisoned_maiden',   'protagonist'),
  ('dame_gothel',          'Dame Gothel',               'rapunzel',                'being_witch',   'arc_jailer',              'villain'),
  ('rapunzel_prince',      'The Prince',                'rapunzel',                'sp_human',      'arc_rescuer',             'ally'),
  ('miller_daughter',      'The Miller''s Daughter',    'rumpelstiltskin',         'sp_human',      'arc_clever_maiden',       'protagonist'),
  ('rumpelstiltskin',      'Rumpelstiltskin',           'rumpelstiltskin',         'being_dwarf',   'arc_trickster',           'villain'),
  ('rump_king',            'The King',                  'rumpelstiltskin',         'sp_human',      'arc_greedy_king',         'ally'),
  ('briar_rose',           'Briar Rose',                'briar-rose',              'sp_human',      'arc_cursed_maiden',       'protagonist'),
  ('briar_prince',         'The Prince',                'briar-rose',              'sp_human',      'arc_rescuer',             'ally'),
  ('wise_woman',           'The Thirteenth Wise Woman', 'briar-rose',              'being_fairy',   'arc_curser',              'villain'),
  ('frog_king',            'The Frog King',             'the-frog-king',           'being_enchanted','arc_transformed_prince', 'protagonist'),
  ('frog_princess',        'The Princess',              'the-frog-king',           'sp_human',      'arc_proud_princess',      'ally'),
  ('fisherman',            'The Fisherman',             'the-fishermans-wife',     'sp_human',      'arc_hapless_husband',     'protagonist'),
  ('fishermans_wife',      'Ilsebill',                  'the-fishermans-wife',     'sp_human',      'arc_greedy_wife',         'villain'),
  ('magic_flounder',       'The Flounder',              'the-fishermans-wife',     'being_enchanted','arc_wish_granter',       'helper'),
  ('wolf_seven',           'The Wolf',                  'the-wolf-and-seven-kids', 'sp_wolf',       'arc_predator',            'villain'),
  ('mother_goat',          'Mother Goat',               'the-wolf-and-seven-kids', 'sp_goat',       'arc_protective_mother',   'protagonist'),
  ('tom_thumb',            'Tom Thumb',                 'tom-thumb',               'sp_human',      'arc_tiny_hero',           'protagonist'),
  ('goose_girl',           'The Goose Girl',            'the-goose-girl',          'sp_human',      'arc_displaced_princess',  'protagonist'),
  ('chambermaid',          'The False Bride',           'the-goose-girl',          'sp_human',      'arc_false_bride',         'villain'),
  ('falada',               'Falada',                    'the-goose-girl',          'sp_horse',      'arc_speaking_helper',     'helper'),
  ('juniper_boy',          'The Boy',                   'the-juniper-tree',        'sp_human',      'arc_murdered_child',      'protagonist'),
  ('juniper_stepmother',   'The Stepmother',            'the-juniper-tree',        'sp_human',      'arc_cruel_stepmother',    'villain'),
  ('iron_john',            'Iron John',                 'iron-john',               'being_wild',    'arc_wild_helper',         'helper'),
  ('mother_holle',         'Mother Hulda',              'mother-holle',            'being_supernatural','arc_judging_crone',   'helper')
" >/dev/null
echo "  ✓ 40 rows"

# ---------------------------------------------------------------------------
# grimm_graph — full 8k node / 42k edge ingest from case-grimm corpus.
# Bash + curl can't reasonably stream that volume; delegate to ingest-grimm.ts
# which reuses case-grimm's YAML loader and posts batches to the same
# /query endpoint we've been using everywhere else in this script.
# ---------------------------------------------------------------------------
echo ""
echo "▸ Full case-grimm graph ingest (8180 nodes / 42532 edges via ingest-grimm.ts)"

SEED_DIR="$(dirname "$(readlink -f "$0")")"
REPO_ROOT="$(dirname "$SEED_DIR")"
GRIMM_DIR="$REPO_ROOT/../case-grimm"

if [ ! -d "$GRIMM_DIR/input/3-gold" ]; then
  echo "  ! ${GRIMM_DIR}/input/3-gold not found — skipping grimm_graph ingest."
  echo "    To enable: clone reddb-io/case-grimm next to red-ui."
else
  (cd "$REPO_ROOT" && pnpm exec tsx scripts/ingest-grimm.ts "$BASE")
fi

# ---------------------------------------------------------------------------
# corpus_facts — KV PUT statements (collection:key syntax)
# ---------------------------------------------------------------------------
echo ""
echo "▸ INSERT INTO corpus_facts (15 key/value rows)"

sql "INSERT INTO corpus_facts (fact_key, fact_value, value_type) VALUES
  ('corpus_name',                'Grimm Fairy Tales',              'string'),
  ('corpus_version',             '1857-7th-edition',                'string'),
  ('canonical_tales',            '206',                             'number'),
  ('tales_seeded',               '25',                              'number'),
  ('first_edition_year',         '1812',                            'number'),
  ('last_edition_year',          '1857',                            'number'),
  ('author_brothers',            'Jacob & Wilhelm Grimm',           'string'),
  ('most_common_archetype',      'arc_oppressed_maiden',            'string'),
  ('most_common_villain',        'arc_cruel_stepmother',            'string'),
  ('tales_with_villain',         '20',                              'number'),
  ('tales_with_wedding',         '8',                               'number'),
  ('tales_with_transformation',  '4',                               'number'),
  ('shared_atu_classification',  'ATU 0-2399',                      'string'),
  ('source_repo',                'github.com/reddb-io/case-grimm',  'string'),
  ('ingest_method',              'SQL DDL/DML via POST /query',     'string')
" >/dev/null
echo "  ✓ 15 rows"

# ---------------------------------------------------------------------------
# ingest_log — TIMESERIES INSERTs with batch metrics
# ---------------------------------------------------------------------------
echo ""
echo "▸ INSERT INTO ingest_log (30 points)"

now_ms() { date +%s%3N; }
BASE_TS=$(now_ms)

insert_metric() {
  local metric="$1" value="$2" ts="$3" tags="$4"
  sql "INSERT INTO ingest_log (metric, value, tags, timestamp) VALUES ('$metric', $value, '$tags', $ts)" >/dev/null
}

for i in $(seq 0 9); do
  insert_metric "tales_batch_ms"      "$((50 + (i*13) % 80))"   "$((BASE_TS - (10-i)*60000))" "{\"phase\":\"tales\",\"batch_idx\":$i}"
done
for i in $(seq 0 9); do
  insert_metric "characters_batch_ms" "$((90 + (i*17) % 60))"   "$((BASE_TS - (10-i)*30000))" "{\"phase\":\"characters\",\"batch_idx\":$i}"
done
for i in $(seq 0 9); do
  insert_metric "graph_batch_ms"      "$((120 + (i*23) % 100))" "$((BASE_TS - (10-i)*20000))" "{\"phase\":\"graph\",\"batch_idx\":$i}"
done
echo "  ✓ 30 points"

# ---------------------------------------------------------------------------
# verify — read everything back via SQL only
# ---------------------------------------------------------------------------
echo ""
echo "▸ verifying via SELECT"
for c in tales characters grimm_graph corpus_facts ingest_log; do
  printf "  %-14s " "$c:"
  sql "SELECT COUNT(*) FROM $c" | jq -c '.result.records[0].values // .'
done
echo "  stats:         $(curl -sf "$BASE/stats" | jq -c '{collection_count: .store.collection_count, total_entities: .store.total_entities}')"

echo ""
echo "✓ seed complete · UI: http://localhost:1420"
echo ""
echo "  Try in the UI (every collection has an explicit reddb kind):"
echo "    tales          → TableRenderer       — CREATE TABLE with PK"
echo "    characters     → TableRenderer       — CREATE TABLE with PK"
echo "    grimm_graph    → GraphRenderer       — CREATE GRAPH (nodes + edges)"
echo "    corpus_facts   → KvRenderer          — TABLE shaped as key/value"
echo "    ingest_log     → HypertableRenderer  — CREATE TIMESERIES (retention 7d)"
