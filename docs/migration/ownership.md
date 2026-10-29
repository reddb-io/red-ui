# Red-ui presentation ownership

The Design System owns all result explorers, their rendering engines, charts,
illustrations, navigation and interactive primitives. Product files adapt
RedDB state, permissions and routing into those contracts.

| Consumer responsibility                                            | Canonical owner                                                            |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Table queries and filters                                          | Data TableExplorer, RedDB table-results                                    |
| Key/value inspection and search                                    | Data KeyValueExplorer, RedDB kv-results                                    |
| Event series and buckets                                           | Data EventSeriesExplorer, RedDB time-series-results                        |
| Vectors and search composition                                     | Data VectorExplorer, RedDB vector-results                                  |
| Queue events and message composition                               | Data QueueExplorer, RedDB queue-results                                    |
| Graph canvas/SVG, communities, bundling, inspection and algorithms | Data GraphExplorer and Graph, RedDB graph-results                          |
| Documents, JSON, diffs and statistics                              | Existing Data explorers                                                    |
| Cluster topology and navigation                                    | Data Diagram and PanZoomViewport                                           |
| Metrics                                                            | Data TimeSeries and KpiCard, Base Progress                                 |
| Navigation and settings                                            | App NavItem, ApplicationWorkspace, SettingsRow                             |
| Positive/negative outcomes and errors                              | App OutcomeScreen and ErrorBoundary; Base artwork                          |
| Loading, activity and recovery controls                            | Base LoadingIndicator, Progress, Card, Badge, Disclosure; App ActivityFeed |
| Forms, tables, icons and code                                      | Base controls, Icon and CodeBlock; Data Table                              |

The old graph engines and XYFlow dependency are removed. The retained public
ClusterNode export composes DS Card/StatusIndicator/Badge. The ui-kit package
remains a compatibility facade; it owns no separate visual primitive.
Legacy custom seed palettes resolve to the canonical application theme.
The Appearance page selects the DS light/dark Color Scheme. Host Density is
preserved. Global decorative effects and fixed typography have been removed.
The mobile resource list opens through a canonical Popover; it no longer
reserves a desktop-width sidebar in a narrow workspace.

## Executed evidence

- Consumer type check: no errors or warnings; web and embed builds pass.
- 627 consumer tests, with targeted reruns after disclosure and layout changes.
  Migrated graph model tests execute in the producer repository.
- Real disposable RedDB: table query/filter/reset, key search/recovery, event
  buckets, vector search, queue insertion and graph MATCH/centrality/path metrics.
- Graph query errors retain the input and previous result. The adapter handles
  real MATCH `edge_type` and scalar algorithm responses. Path metrics never
  masquerade as returned path geometry.
- Production browser: security, analytics, cluster and appearance; both color
  schemes at 390 and 1280 pixels; query error artwork; no horizontal document
  overflow or axe violations in those exercised states.
- Source audit in CI rejects local native controls/navigation/tables/SVG/code
  blocks/disclosures, direct icon rendering, component CSS and legacy classes.
  The only named exception is the intentionally hostile Shadow DOM test host.
  `ui-ownership.json` is the reproducible inventory, not a percentage estimate.

## Remaining repository cutover

A zero primitive audit is necessary, not sufficient, for repository retirement.
The DS-owned workspace host is being validated separately. PWA/embed/desktop
build and publication responsibility, installer/update paths, public entrypoint
compatibility and release evidence must move before the red-ui repository can
be retired. See DS ADR 0051. The producer's source, receipt and public package
licensing must remain verifiable through that transition.
