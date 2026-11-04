// The canonical DS host owns offline runtime asset discovery.
import { stageOfflineRuntime } from "../vendor/ds/hosts/workspace/src/stage-offline-runtime.mjs";
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The Product Application packages its selected runtime's original notice.
// Keep generated distribution files outside the receipt-protected DS source.
const require = createRequire(
  new URL("../vendor/ds/package.json", import.meta.url)
);
const runtime = dirname(require.resolve("@reddb-io/browser/package.json"));
const notices = fileURLToPath(
  new URL("../packages/ui/build/third-party/", import.meta.url)
);
mkdirSync(notices, { recursive: true });
copyFileSync(
  join(runtime, "LICENSE"),
  join(notices, "reddb-browser-LICENSE.txt")
);
stageOfflineRuntime(new URL("../packages/ui/build/", import.meta.url));
