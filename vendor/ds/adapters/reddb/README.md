# RedDB adapter

Opt-in RedDB connection and URL handling shared by workspace hosts. This is
not part of App Kit: select `"adapters": ["reddb"]` in a Sync manifest and
import `@reddb-io/design-system/adapters/reddb`. It contains no implicit
connection, storage, or platform initialization. Connection credentials are
returned to the caller and never persisted by this source.

The source originated in the Apache-2.0 licensed reddb-io/red-ui project; the
license is included here and in the distributed source. This initial extraction
covers connection strings and the Open Contract; the client, permissions,
streaming and platform hosts still remain in red-ui.
