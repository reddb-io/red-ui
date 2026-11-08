---
"@reddb-io/ui": patch
"@reddb-io/ui-kit": patch
"@reddb-io/ui-mcp": patch
---

Bound collection discovery during connection startup so Free databases no longer exhaust their request-admission queue, and avoid probing optional VCS routes absent from modern capability discovery.
