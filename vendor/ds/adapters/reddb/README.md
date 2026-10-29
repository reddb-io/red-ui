# RedDB adapter

Opt-in RedDB connection and URL handling shared by workspace hosts. This is
not part of App Kit: select `"adapters": ["reddb"]` in a Sync manifest and
import `@reddb-io/design-system/adapters/reddb`. Its parser entry contains no
connection, storage, or platform initialization. Connection credentials are
returned to the caller and never persisted by this source.

The HTTP client is available at `@reddb-io/design-system/adapters/reddb/client`,
with separate entrypoints for CDC, diagnostics, server capabilities and response
models. Importing the connection parser does not load the HTTP client or its
compatibility diagnostics store. The client keeps the legacy default diagnostics
store; a host may inject a separate store and lifecycle for each workspace.
No module connects to a server on import.

The source originated in the Apache-2.0 licensed reddb-io/red-ui project; the
license is included here and in the distributed source. This extraction includes
the HTTP and CDC clients, connection providers, transport/URI contracts and
permission decisions. The `settings-authoring` entry owns configuration and vault SQL construction and response parsing; callers own authorization, secret presentation and runtime lifecycle. Platform bootstrap, hosts and UI interactions remain in
red-ui.
