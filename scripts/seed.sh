#!/usr/bin/env bash
# Seed a running reddb instance with the Grimm Fairy Tales showcase using
# only SQL DDL/DML via POST /query. Every artifact is created with an
# explicit reddb schema kind, exercising every renderer in the UI:
#
#   CREATE TABLE tales (…)              → TableRenderer with declared PK
#   CREATE TABLE characters (…)         → TableRenderer
#   CREATE GRAPH grimm_graph            → GraphRenderer (nodes + edges)
#   CREATE KV corpus_facts              → KvRenderer (tree + JSON)
#   INSERT INTO grimm_runbooks DOCUMENT → DocumentRenderer (body + flattened fields)
#   CREATE TIMESERIES ingest_log        → HypertableRenderer (sparklines + event log)
#   CREATE QUEUE grimm_events           → QueueRenderer (collection event feed)
#   CREATE TABLE grimm_kpis             → StatsRenderer (KPIs + gauges)
#   CREATE VECTOR + bulk/vectors        → VectorRenderer (vector-search preview)
#   CREATE HLL/SKETCH/FILTER            → probabilistic stats showcase
#   ALTER TABLE tale_taxonomy VERSIONED  → VCS branch/diff showcase
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

now_ms() { date +%s%3N; }
BASE_TS=$(now_ms)

# ---------------------------------------------------------------------------
# DDL — declare every collection with its proper kind. Drop-then-create
# makes the seed idempotent across re-runs without leaving stale columns.
# ---------------------------------------------------------------------------
echo ""
echo "▸ CREATE TABLE / DOCUMENT / GRAPH / KV / TIMESERIES / QUEUE / VECTOR / PROBABILISTIC / VCS"

sql_try "DROP TABLE tales"
sql_try "DROP TABLE characters"
sql_try "DROP TABLE tale_reviews"
sql_try "DROP GRAPH grimm_graph"
sql_try "DROP DOCUMENT grimm_runbooks"
sql_try "DROP TABLE corpus_facts"
sql_try "DROP KV corpus_facts"
sql_try "DROP TIMESERIES ingest_log"
sql_try "DROP QUEUE grimm_events"
sql_try "DROP QUEUE grimm_events_dlq"
sql_try "DROP TABLE grimm_kpis"
sql_try "DROP VECTOR motif_vectors"
sql_try "DROP HLL grimm_unique_motifs"
sql_try "DROP SKETCH grimm_motif_frequency"
sql_try "DROP FILTER grimm_seen_sessions"
sql_try "DROP TABLE grimm_probabilistic"
sql_try "DROP TABLE tale_taxonomy"
sql_try "DROP TABLE grimm_branch_diff"

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

sql "CREATE QUEUE grimm_events FANOUT WITH DLQ grimm_events_dlq MAX_ATTEMPTS 2" >/dev/null
echo "  ✓ grimm_events (fanout queue, DLQ grimm_events_dlq)"

sql "CREATE TABLE tale_reviews (
  id TEXT PRIMARY KEY,
  tale_slug TEXT NOT NULL,
  reviewer TEXT,
  rating INT,
  sentiment TEXT,
  note TEXT,
  reviewed_at BIGINT
) WITH EVENTS TO grimm_events" >/dev/null
echo "  ✓ tale_reviews (event-enabled table → grimm_events)"

echo "  ✓ grimm_graph (deferred — full ingest via ingest-grimm.ts)"

sql "CREATE KV corpus_facts" >/dev/null
echo "  ✓ corpus_facts (native KV)"

sql "CREATE TIMESERIES ingest_log RETENTION 7 d" >/dev/null
echo "  ✓ ingest_log (timeseries, 7d retention)"

sql "CREATE VECTOR motif_vectors DIM 224 METRIC cosine" >/dev/null
echo "  ✓ motif_vectors (224d vector, cosine)"

sql "CREATE TABLE grimm_kpis (
  name TEXT PRIMARY KEY,
  value FLOAT,
  unit TEXT,
  source TEXT
)" >/dev/null
echo "  ✓ grimm_kpis (metric/value stats shape)"

sql "CREATE TABLE grimm_probabilistic (
  name TEXT PRIMARY KEY,
  value FLOAT,
  unit TEXT,
  source TEXT
)" >/dev/null
echo "  ✓ grimm_probabilistic (HLL/SKETCH/FILTER rollups)"

sql "CREATE TABLE tale_taxonomy (
  id TEXT PRIMARY KEY,
  title TEXT,
  archetype TEXT,
  risk_score INT,
  editorial_branch TEXT,
  status TEXT
)" >/dev/null
sql "ALTER TABLE tale_taxonomy SET VERSIONED = true" >/dev/null
echo "  ✓ tale_taxonomy (versioned table)"

sql "CREATE TABLE grimm_branch_diff (
  id TEXT PRIMARY KEY,
  from_ref TEXT,
  to_ref TEXT,
  target_collection TEXT,
  change TEXT,
  entity_id TEXT,
  before_state TEXT,
  after_state TEXT,
  note TEXT
)" >/dev/null
echo "  ✓ grimm_branch_diff (branch diff rows)"

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
# tale_reviews — event-enabled table: every insert populates grimm_events
# ---------------------------------------------------------------------------
echo ""
echo "▸ INSERT INTO tale_reviews (12 rows → grimm_events queue)"

REVIEW_TS="$BASE_TS"
sql "INSERT INTO tale_reviews (id, tale_slug, reviewer, rating, sentiment, note, reviewed_at) VALUES
  ('rv-001', 'hansel-and-gretel',      'folklore-ops', 5, 'tense',      'abandonment pattern detected; rescue arc closes cleanly', $((REVIEW_TS - 720000))),
  ('rv-002', 'cinderella',             'motif-bot',    5, 'reward',     'false bride motif, shoe test, and status inversion',       $((REVIEW_TS - 660000))),
  ('rv-003', 'little-red-riding-hood', 'risk-bot',     4, 'danger',     'predator encounter produces direct rescue event',          $((REVIEW_TS - 600000))),
  ('rv-004', 'snow-white',             'motif-bot',    5, 'danger',     'jealous queen creates repeated assassination attempts',     $((REVIEW_TS - 540000))),
  ('rv-005', 'rapunzel',               'tower-watch',  4, 'isolation',  'tower constraint, hidden visits, exile, and reunion',       $((REVIEW_TS - 480000))),
  ('rv-006', 'rumpelstiltskin',        'contract-bot', 5, 'bargain',    'name discovery breaks escalating exchange contract',        $((REVIEW_TS - 420000))),
  ('rv-007', 'briar-rose',             'curse-watch',  4, 'sleep',      'long-duration curse resolved by arrival event',             $((REVIEW_TS - 360000))),
  ('rv-008', 'the-fishermans-wife',    'wish-bot',     3, 'greed',      'wish escalation reaches governance and cosmic authority',   $((REVIEW_TS - 300000))),
  ('rv-009', 'the-bremen-musicians',   'ops-bot',      4, 'alliance',   'aging workers form durable self-rescue collective',         $((REVIEW_TS - 240000))),
  ('rv-010', 'the-goose-girl',         'identity-bot', 4, 'deception',  'identity theft, witness artifact, and public reversal',      $((REVIEW_TS - 180000))),
  ('rv-011', 'the-juniper-tree',       'signal-bot',   5, 'uncanny',    'murder, song propagation, restitution, resurrection',       $((REVIEW_TS - 120000))),
  ('rv-012', 'mother-holle',           'reward-bot',   4, 'judgment',   'labor quality maps directly to reward/punishment',          $((REVIEW_TS - 60000)))
" >/dev/null
echo "  ✓ 12 review events enqueued"

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
# corpus_facts — native KV entries with hierarchical keys and mixed scalar/JSON values
# ---------------------------------------------------------------------------
echo ""
echo "▸ INSERT INTO corpus_facts KV (22 hierarchical keys)"

sql "INSERT INTO corpus_facts KV (key, value) VALUES
  ('corpus/name',                         'Grimm Fairy Tales'),
  ('corpus/version',                      '1857-7th-edition'),
  ('corpus/source/repo',                  'github.com/reddb-io/case-grimm'),
  ('corpus/source/method',                'SQL DDL/DML via POST /query'),
  ('corpus/counts/canonical_tales',        206),
  ('corpus/counts/seeded_tales',           25),
  ('corpus/counts/seeded_characters',      40),
  ('corpus/counts/reviews',                12),
  ('corpus/editions/first_year',           1812),
  ('corpus/editions/last_year',            1857),
  ('motifs/common/archetype',              'arc_oppressed_maiden'),
  ('motifs/common/villain',                'arc_cruel_stepmother'),
  ('motifs/outcomes/wedding',              8),
  ('motifs/outcomes/transformation',       4),
  ('features/graph/full_ingest',           true),
  ('features/events/enabled_collection',   'tale_reviews'),
  ('features/events/queue',                'grimm_events'),
  ('features/timeseries/log',              'ingest_log'),
  ('features/ui/renderers',                {\"table\":true,\"graph\":\"canvas\",\"kv\":\"nested-json\",\"queue\":\"events\",\"timeseries\":\"sparkline-log\"}),
  ('features/vector/search',               {\"collection\":\"motif_vectors\",\"dimension\":224,\"source_dimension\":384,\"model\":\"Xenova/all-MiniLM-L6-v2\",\"preview\":\"literal-vector-search\"}),
  ('features/probabilistic/structures',     {\"hll\":\"grimm_unique_motifs\",\"sketch\":\"grimm_motif_frequency\",\"filter\":\"grimm_seen_sessions\"}),
  ('features/vcs/diff',                    {\"versioned\":\"tale_taxonomy\",\"diff\":\"grimm_branch_diff\",\"known_issue\":\"AS OF COMMIT currently unreliable\"})
" >/dev/null
echo "  ✓ 22 kv pairs"

# ---------------------------------------------------------------------------
# grimm_runbooks — document collection with nested JSON bodies.
# ---------------------------------------------------------------------------
echo ""
echo "▸ INSERT INTO grimm_runbooks DOCUMENT (6 JSON bodies)"

sql "INSERT INTO grimm_runbooks DOCUMENT (body) VALUES
  ('{\"title\":\"Replay Grimm event queue\",\"category\":\"operations\",\"status\":\"ready\",\"source\":\"grimm_events\",\"severity\":2,\"steps\":[\"inspect grimm_events backlog\",\"peek payload body\",\"replay to downstream indexer\"],\"checks\":{\"queue\":\"grimm_events\",\"dlq\":\"grimm_events_dlq\",\"expected_backlog\":12}}'),
  ('{\"title\":\"Investigate predator motif spike\",\"category\":\"analysis\",\"status\":\"watch\",\"source\":\"grimm_motif_frequency\",\"severity\":3,\"motifs\":[\"predator_disguise\",\"false_bride\"],\"checks\":{\"sketch\":\"grimm_motif_frequency\",\"threshold\":2}}'),
  ('{\"title\":\"Refresh vector motif index\",\"category\":\"search\",\"status\":\"ready\",\"source\":\"motif_vectors\",\"severity\":1,\"query\":{\"model\":\"Xenova/all-MiniLM-L6-v2\",\"limit\":5},\"checks\":{\"collection\":\"motif_vectors\",\"expected_dimension\":224,\"source_dimension\":384}}'),
  ('{\"title\":\"Audit branch taxonomy retell\",\"category\":\"vcs\",\"status\":\"review\",\"source\":\"grimm_branch_diff\",\"severity\":2,\"refs\":{\"base\":\"seed tale taxonomy\",\"branch\":\"retell taxonomy branch\"},\"checks\":{\"diff_rows\":3,\"target\":\"tale_taxonomy\"}}'),
  ('{\"title\":\"Review timeseries ingest drift\",\"category\":\"observability\",\"status\":\"ready\",\"source\":\"ingest_log\",\"severity\":2,\"window\":{\"bucket\":\"1min\",\"points\":40},\"checks\":{\"metric\":\"all writes\",\"event_log\":true}}'),
  ('{\"title\":\"Confirm Cinderella session membership\",\"category\":\"probabilistic\",\"status\":\"done\",\"source\":\"grimm_seen_sessions\",\"severity\":1,\"checks\":{\"filter\":\"grimm_seen_sessions\",\"member\":\"session:cinderella\",\"expected\":true}}')
" >/dev/null
echo "  ✓ 6 documents"

# ---------------------------------------------------------------------------
# ingest_log — TIMESERIES INSERTs as an ingest/event timeline
# ---------------------------------------------------------------------------
echo ""
echo "▸ INSERT INTO ingest_log (40 event points)"

insert_metric() {
  local metric="$1" value="$2" ts="$3" tags="$4"
  sql "INSERT INTO ingest_log (metric, value, tags, timestamp) VALUES ('$metric', $value, '$tags', $ts)" >/dev/null
}

for i in $(seq 0 9); do
  insert_metric "insert.tales"       "$((1 + (i % 4)))"        "$((BASE_TS - (40-i)*15000))" "{\"phase\":\"tales\",\"event\":\"batch_insert\",\"batch_idx\":$i,\"collection\":\"tales\"}"
done
for i in $(seq 0 9); do
  insert_metric "insert.characters"  "$((2 + (i % 5)))"        "$((BASE_TS - (30-i)*15000))" "{\"phase\":\"characters\",\"event\":\"batch_insert\",\"batch_idx\":$i,\"collection\":\"characters\"}"
done
for i in $(seq 0 9); do
  insert_metric "insert.graph"       "$((3500 + (i*137) % 900))" "$((BASE_TS - (20-i)*15000))" "{\"phase\":\"graph\",\"event\":\"node_edge_batch\",\"batch_idx\":$i,\"collection\":\"grimm_graph\"}"
done
for i in $(seq 0 9); do
  insert_metric "queue.events"       "$((1 + (i % 3)))"        "$((BASE_TS - (10-i)*15000))" "{\"phase\":\"events\",\"event\":\"queue_emit\",\"batch_idx\":$i,\"queue\":\"grimm_events\"}"
done
echo "  ✓ 40 points"

# ---------------------------------------------------------------------------
# motif_vectors — native vector collection + open-source sentence embeddings
# ---------------------------------------------------------------------------
echo ""
echo "▸ POST /collections/motif_vectors/bulk/vectors (10 embeddings, 224d projected from 384d all-MiniLM-L6-v2)"

VECTOR_PAYLOAD="$(cd "$REPO_ROOT" && pnpm exec tsx scripts/embed-motifs.ts)"
curl -sf -X POST "$BASE/collections/motif_vectors/bulk/vectors" \
  -H "Content-Type: application/json" \
  -d "$VECTOR_PAYLOAD" >/dev/null
echo "  ✓ 10 vectors (224d stored, 384d source model Xenova/all-MiniLM-L6-v2)"

# ---------------------------------------------------------------------------
# probabilistic structures — native HLL, Count-Min Sketch, and Cuckoo Filter
# plus a stats table that makes their readings explorable from the UI.
# ---------------------------------------------------------------------------
echo ""
echo "▸ CREATE HLL / SKETCH / FILTER and collect rollups"

sql "CREATE HLL grimm_unique_motifs" >/dev/null
sql "HLL ADD grimm_unique_motifs 'abandonment' 'sibling_rescue' 'recognition' 'false_bride' 'curse_release' 'imprisonment' 'predator_disguise' 'predator_disguise' 'name_bargain' 'wish_escalation'" >/dev/null

sql "CREATE SKETCH grimm_motif_frequency WIDTH 2000 DEPTH 7" >/dev/null
sql "SKETCH ADD grimm_motif_frequency 'predator_disguise' 2" >/dev/null
sql "SKETCH ADD grimm_motif_frequency 'false_bride' 2" >/dev/null
sql "SKETCH ADD grimm_motif_frequency 'oppressed_maiden' 3" >/dev/null
sql "SKETCH ADD grimm_motif_frequency 'curse_release' 1" >/dev/null

sql "CREATE FILTER grimm_seen_sessions CAPACITY 10000" >/dev/null
sql "FILTER ADD grimm_seen_sessions 'session:hansel-and-gretel'" >/dev/null
sql "FILTER ADD grimm_seen_sessions 'session:cinderella'" >/dev/null
sql "FILTER ADD grimm_seen_sessions 'session:briar-rose'" >/dev/null

HLL_COUNT="$(sql "HLL COUNT grimm_unique_motifs" | jq -r '.result.records[0].values.count // 0')"
HLL_MEMORY="$(sql "HLL INFO grimm_unique_motifs" | jq -r '.result.records[0].values.memory_bytes // 0')"
PREDATOR_FREQ="$(sql "SKETCH COUNT grimm_motif_frequency 'predator_disguise'" | jq -r '.result.records[0].values.estimate // 0')"
FALSE_BRIDE_FREQ="$(sql "SKETCH COUNT grimm_motif_frequency 'false_bride'" | jq -r '.result.records[0].values.estimate // 0')"
SESSION_HIT="$(sql "FILTER CHECK grimm_seen_sessions 'session:cinderella'" | jq -r '.result.records[0].values.exists // false')"
SESSION_VALUE=0
if [ "$SESSION_HIT" = "true" ]; then SESSION_VALUE=1; fi

sql "INSERT INTO grimm_probabilistic (name, value, unit, source) VALUES
  ('unique_motifs_hll',          $HLL_COUNT,        'approx_count', 'grimm_unique_motifs'),
  ('hll_memory_bytes',           $HLL_MEMORY,       'bytes',        'grimm_unique_motifs'),
  ('predator_disguise_frequency',$PREDATOR_FREQ,   'estimate',     'grimm_motif_frequency'),
  ('false_bride_frequency',      $FALSE_BRIDE_FREQ, 'estimate',     'grimm_motif_frequency'),
  ('cinderella_session_seen',    $SESSION_VALUE,    'boolean',      'grimm_seen_sessions')
" >/dev/null
echo "  ✓ probabilistic structures + 5 rollup metrics"

# ---------------------------------------------------------------------------
# tale_taxonomy / grimm_branch_diff — VCS opt-in, branch edit, REST diff
# ---------------------------------------------------------------------------
echo ""
echo "▸ VCS branch diff for versioned tale_taxonomy"

vcs_post() {
  local path="$1" body="$2"
  curl -sf -X POST "$BASE$path" -H "Content-Type: application/json" -d "$body"
}

sql "INSERT INTO tale_taxonomy (id, title, archetype, risk_score, editorial_branch, status) VALUES
  ('hansel-and-gretel', 'Hansel and Gretel', 'arc_abandoned_children', 5, 'main', 'canon'),
  ('cinderella', 'Cinderella', 'arc_oppressed_maiden', 2, 'main', 'canon'),
  ('briar-rose', 'Briar Rose', 'arc_cursed_maiden', 3, 'main', 'canon')
" >/dev/null

VCS_AUTHOR='{"name":"red-ui seed","email":"seed@reddb.local"}'
BASE_COMMIT="$(vcs_post "/repo/commits" "{\"connection_id\":1,\"message\":\"seed tale taxonomy\",\"author\":$VCS_AUTHOR,\"allow_empty\":false}" | jq -r '.result.hash // empty')"
BRANCH_NAME="showcase-taxonomy-$BASE_TS"
vcs_post "/repo/refs/heads" "{\"name\":\"$BRANCH_NAME\",\"from\":\"$BASE_COMMIT\",\"connection_id\":1}" >/dev/null
vcs_post "/repo/sessions/1/checkout" "{\"kind\":\"branch\",\"target\":\"$BRANCH_NAME\"}" >/dev/null

sql "UPDATE tale_taxonomy SET risk_score = 1, editorial_branch = '$BRANCH_NAME', status = 'retold' WHERE id = 'cinderella'" >/dev/null
sql "INSERT INTO tale_taxonomy (id, title, archetype, risk_score, editorial_branch, status) VALUES
  ('rapunzel', 'Rapunzel', 'arc_imprisoned_maiden', 4, '$BRANCH_NAME', 'candidate')
" >/dev/null
BRANCH_COMMIT="$(vcs_post "/repo/commits" "{\"connection_id\":1,\"message\":\"retell taxonomy branch\",\"author\":$VCS_AUTHOR,\"allow_empty\":false}" | jq -r '.result.hash // empty')"
DIFF_JSON="$(curl -sf "$BASE/repo/commits/$BASE_COMMIT/diff/$BRANCH_COMMIT?collection=tale_taxonomy" || true)"
DIFF_ADDED="$(printf "%s" "$DIFF_JSON" | jq -r '.result.added // 0' 2>/dev/null || echo 0)"
DIFF_REMOVED="$(printf "%s" "$DIFF_JSON" | jq -r '.result.removed // 0' 2>/dev/null || echo 0)"

sql "INSERT INTO grimm_branch_diff (id, from_ref, to_ref, target_collection, change, entity_id, before_state, after_state, note) VALUES
  ('taxonomy-cinderella', '$BASE_COMMIT', '$BRANCH_COMMIT', 'tale_taxonomy', 'modified', 'cinderella',
    '{\"id\":\"cinderella\",\"risk_score\":2,\"editorial_branch\":\"main\",\"status\":\"canon\"}',
    '{\"id\":\"cinderella\",\"risk_score\":1,\"editorial_branch\":\"$BRANCH_NAME\",\"status\":\"retold\"}',
    'branch retells Cinderella as lower operational risk'),
  ('taxonomy-rapunzel', '$BASE_COMMIT', '$BRANCH_COMMIT', 'tale_taxonomy', 'added', 'rapunzel',
    null,
    '{\"id\":\"rapunzel\",\"risk_score\":4,\"editorial_branch\":\"$BRANCH_NAME\",\"status\":\"candidate\"}',
    'branch adds Rapunzel to the taxonomy candidate set'),
  ('raw-vcs-diff-counts', '$BASE_COMMIT', '$BRANCH_COMMIT', 'tale_taxonomy', 'reported', 'repo.diff',
    '{\"added\":0,\"removed\":0}',
    '{\"added\":$DIFF_ADDED,\"removed\":$DIFF_REMOVED}',
    'raw REST diff currently reports entity-level add/remove counts')
" >/dev/null
vcs_post "/repo/sessions/1/checkout" "{\"kind\":\"branch\",\"target\":\"main\"}" >/dev/null || true
echo "  ✓ $BASE_COMMIT → $BRANCH_COMMIT ($BRANCH_NAME)"

# ---------------------------------------------------------------------------
# grimm_kpis — compact metric/value table to drive KPIs and gauges
# ---------------------------------------------------------------------------
echo ""
echo "▸ INSERT INTO grimm_kpis (17 metrics)"

sql "INSERT INTO grimm_kpis (name, value, unit, source) VALUES
  ('tales_seeded',              25,    'count', 'tales'),
  ('characters_seeded',         40,    'count', 'characters'),
  ('review_events_emitted',     12,    'count', 'grimm_events'),
  ('document_runbooks',           6,    'count', 'grimm_runbooks'),
  ('graph_nodes_loaded',      8180,    'count', 'grimm_graph'),
  ('graph_edges_loaded',     42532,    'count', 'grimm_graph'),
  ('kv_facts',                  22,    'count', 'corpus_facts'),
  ('timeseries_points',         40,    'count', 'ingest_log'),
  ('villain_tale_ratio',        80,    'percent', 'tales'),
  ('wedding_outcome_ratio',     32,    'percent', 'tales'),
  ('event_queue_backlog',       12,    'count', 'grimm_events'),
  ('avg_review_rating',          4.33, 'score', 'tale_reviews'),
  ('vector_embeddings',          10,    'count', 'motif_vectors'),
  ('unique_motifs_hll',          $HLL_COUNT, 'approx_count', 'grimm_unique_motifs'),
  ('probabilistic_rollups',       5,    'count', 'grimm_probabilistic'),
  ('vcs_diff_rows',               3,    'count', 'grimm_branch_diff'),
  ('seed_showcase_surfaces',     16,    'count', 'red.collections')
" >/dev/null
echo "  ✓ 17 metrics"

# ---------------------------------------------------------------------------
# verify — read everything back via SQL only
# ---------------------------------------------------------------------------
echo ""
echo "▸ verifying via SELECT"
for c in tales characters tale_reviews grimm_graph corpus_facts grimm_runbooks ingest_log motif_vectors grimm_probabilistic tale_taxonomy grimm_branch_diff grimm_kpis; do
  printf "  %-14s " "$c:"
  sql "SELECT COUNT(*) FROM $c" | jq -c '.result.records[0].values // .'
done
printf "  %-14s " "grimm_events:"
sql "QUEUE LEN grimm_events" | jq -c '.result.records[0].values // .'
printf "  %-14s " "unique_motifs:"
sql "HLL INFO grimm_unique_motifs" | jq -c '.result.records[0].values // .'
printf "  %-14s " "motif_freq:"
sql "SKETCH INFO grimm_motif_frequency" | jq -c '.result.records[0].values // .'
printf "  %-14s " "seen_sessions:"
sql "FILTER INFO grimm_seen_sessions" | jq -c '.result.records[0].values // .'
echo "  stats:         $(curl -sf "$BASE/stats" | jq -c '{collection_count: .store.collection_count, total_entities: .store.total_entities}')"

echo ""
echo "✓ seed complete · UI: http://localhost:1420"
echo ""
echo "  Try in the UI (every collection has an explicit reddb kind):"
echo "    tales          → TableRenderer       — CREATE TABLE with PK"
echo "    characters     → TableRenderer       — CREATE TABLE with PK"
echo "    tale_reviews   → TableRenderer       — WITH EVENTS source collection"
echo "    grimm_graph    → GraphRenderer       — CREATE GRAPH (nodes + edges)"
echo "    corpus_facts   → KvRenderer          — CREATE KV with hierarchical keys"
echo "    grimm_runbooks → DocumentRenderer    — INSERT ... DOCUMENT with nested JSON body"
echo "    ingest_log     → HypertableRenderer  — CREATE TIMESERIES (sparkline + log)"
echo "    grimm_events   → QueueRenderer       — CREATE QUEUE fed by table events"
echo "    grimm_kpis     → StatsRenderer       — metric/value KPIs and gauges"
echo "    motif_vectors  → VectorRenderer      — CREATE VECTOR + bulk/vectors + VECTOR SEARCH preview"
echo "    grimm_unique_motifs / grimm_motif_frequency / grimm_seen_sessions"
echo "                  → StatsRenderer       — HLL / SKETCH / FILTER native structures"
echo "    tale_taxonomy  → TableRenderer       — ALTER TABLE ... SET VERSIONED = true"
echo "    grimm_branch_diff"
echo "                  → DiffRenderer        — VCS branch diff side-by-side"
