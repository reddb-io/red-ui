# RedWire WebSocket Spike

This spike lives at `/redwire-ws-spike`. It is intentionally not wired into the
production connection provider or transport classifier.

Enable it by either running the SvelteKit dev server or setting:

```bash
VITE_REDWIRE_WS_SPIKE=1
```

The reddb endpoint must be reachable over WSS. The server-side RedWire
WebSocket route is `/redwire` and requires the subprotocol
`reddb.redwire.v1`. The server mounts the route only when WebSocket allowed
origins are configured, so include the red-ui dev origin in reddb's Origin
allowlist.

Local checklist:

1. Start reddb with TLS/WSS enabled for the API origin.
2. Configure reddb's WebSocket allowed origins to include the red-ui dev
   origin, for example `https://localhost:5173` or the actual dev origin in
   use.
3. Open `/redwire-ws-spike`.
4. Enter the HTTPS origin or full WSS URL. Origins resolve to `/redwire`.
5. Enter a bearer token accepted by the reddb instance.
6. Run one query and inspect the decoded RedWire result.

The browser will reject plain `ws://` for this spike. Use a WSS endpoint with a
certificate trusted by the browser.
