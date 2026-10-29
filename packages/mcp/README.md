# RedDB UI MCP server

The `ui-mcp` command exposes the RedDB UI and data tools to MCP clients. The
server implementation is maintained by the Design System and built here from
its pinned, explicitly selected `hosts/mcp` source and RedDB adapter. This
package retains the existing public command and distribution path.

The published tarball includes the complete host source in `dist/host-source/`
and the adapter source in `dist/vendor-adapter/source/`, with their Apache-2.0
licenses. In a checkout, run `pnpm ds:sync` to update the pinned sources and
`pnpm --filter @reddb-io/ui-mcp test` to exercise the host.
