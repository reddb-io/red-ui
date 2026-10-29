import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const dir = dirname(dirname(fileURLToPath(import.meta.url)));
const { RedClient, runQueryPreferStream } = await import(
  join(dir, "dist/red-client.js")
);
const client = new RedClient("https://example.invalid", {
  fetch: async () => Response.json({}),
});
assert.deepEqual(await client.collections(), []);
const controller = new AbortController();
let fallback = false;
const cancelled = {
  async queryStreamCollect() {
    controller.abort();
    throw new DOMException("cancelled", "AbortError");
  },
  async query() {
    fallback = true;
    throw new Error("must not reissue");
  },
};
await assert.rejects(
  runQueryPreferStream(cancelled, "SELECT * FROM records", {
    signal: controller.signal,
  }),
  { name: "AbortError" }
);
assert.equal(fallback, false);
assert(existsSync(join(dir, "dist/vendor-adapter/source/client.ts")));
assert(existsSync(join(dir, "dist/vendor-adapter/LICENSE")));
console.log("MCP Design System adapter packaging and cancellation passed");
