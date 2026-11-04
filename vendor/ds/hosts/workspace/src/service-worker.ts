/// <reference lib="webworker" />
import { build, files, version } from "$service-worker";
import { isPwaAssetRequest, obsoletePwaCaches } from "./lib/pwa-cache";

const worker = self as unknown as ServiceWorkerGlobalScope;
const scope = new URL(worker.registration.scope);
const prefix = `red-ui-shell:${scope.pathname}:`;
const cacheName = `${prefix}${version}`;
// The static adapter's fallback has absolute/base-aware asset URLs, unlike
// index.html's route-relative URLs. It can boot any deep link while offline.
const shell = new URL("404.html", scope).pathname;
// Filled by stage-offline-runtime.mjs after Vite emits its nested Worker/WASM.
const localRuntime = "__REDDB_WORKSPACE_OFFLINE_RUNTIME__"
  .split("|")
  .filter(Boolean)
  .map((path) => new URL(path, scope).pathname);
const identity = files.filter((path) =>
  /\/(?:manifest\.webmanifest|favicon\.(?:ico|svg)|apple-touch-icon-180\.png|(?:icon|maskable)-(?:192|512)\.png)$/.test(
    path
  )
);
const assets = new Set([...build, ...localRuntime, ...identity, shell]);

worker.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => cache.addAll([...assets]))
  );
  // No skipWaiting: an update must never replace a workspace in use.
});

worker.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await Promise.all(
        obsoletePwaCaches(await caches.keys(), cacheName, prefix).map((name) =>
          caches.delete(name)
        )
      );
      await worker.clients.claim();
    })()
  );
});

worker.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== scope.origin ||
    request.headers.has("Authorization")
  )
    return;
  if (request.mode === "navigate") {
    // Navigation responses (including URL connection parameters) never enter
    // the cache. Only the fixed, credential-free application shell is retained.
    event.respondWith(
      fetch(request).catch(
        async () =>
          (await (await caches.open(cacheName)).match(shell)) ??
          Response.error()
      )
    );
  } else if (isPwaAssetRequest(request, scope.origin, assets)) {
    event.respondWith(
      (async () =>
        (await (await caches.open(cacheName)).match(url.pathname)) ??
        fetch(request))()
    );
  }
  // Database APIs, authenticated requests and all non-GET methods go straight
  // to the network. The worker never queues or replays a database mutation.
});
