#!/usr/bin/env node
// Stand-in for the `red` binary used by the local-server lifecycle test.
// It ignores the leading `server --http` args, reads `--http-bind host:port`,
// and serves a 200 `/stats` after a short startup delay — enough to exercise
// spawn → health-check → teardown without needing a real reddb build.
//
//   FAKE_RED_FAIL=exit       exit immediately (simulate a bad binary / bad file)
//   FAKE_RED_DELAY_MS=<n>    delay before `/stats` starts answering (default 150)

import http from "node:http";

const args = process.argv.slice(2);
const bindIdx = args.indexOf("--http-bind");
const bind = bindIdx >= 0 ? args[bindIdx + 1] : "127.0.0.1:0";
const [host, portStr] = bind.split(":");

if (process.env.FAKE_RED_FAIL === "exit") {
  process.stderr.write("fake red: refusing to start (FAKE_RED_FAIL)\n");
  process.exit(3);
}

const delayMs = Number(process.env.FAKE_RED_DELAY_MS ?? 150);

setTimeout(() => {
  const server = http.createServer((req, res) => {
    if (req.url === "/stats") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ store: { collection_count: 0 } }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(Number(portStr), host, () => {
    process.stdout.write(`fake red listening on ${bind}\n`);
  });
  const shutdown = () => {
    server.close(() => process.exit(0));
    // Backstop if connections linger.
    setTimeout(() => process.exit(0), 200).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}, delayMs);
