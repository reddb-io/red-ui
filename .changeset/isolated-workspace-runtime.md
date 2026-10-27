---
"@reddb-io/ui": minor
"@reddb-io/ui-kit": minor
"@reddb-io/ui-mcp": minor
---

Give each mounted workspace independent connections, documents, drafts, staged edits, commands, appearance, renderer registrations and telemetry. Dispose its own queries, timers and subscriptions on unmount, and support simultaneous Shadow DOM mounts in the embed host.

Keep published embed types usable in plain TypeScript hosts through the portable App Kit session entry and extensionless generated imports.

**BREAKING:** mounted Workspaces now own their state. Hosts that controlled a Workspace through module-wide stores or window command events must create a `WorkspaceRuntime`, pass it to that mount and use its services and `dispatch`. Embedded handles expose their runtime. Persistence is private memory unless a mount supplies a `persistenceKey`; the standalone PWA keeps its existing profile and storage keys.
