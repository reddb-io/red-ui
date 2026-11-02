import { detectSurface } from "./surface";

/** Opt in only the secure standalone web document, never a native or embedded host. */
export async function registerWorkspacePwa(
  base: string
): Promise<ServiceWorkerRegistration | null> {
  if (
    typeof window === "undefined" ||
    !window.isSecureContext ||
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    detectSurface() !== "web"
  )
    return null;
  // Keep precaching out of the initial document's critical resource loading.
  if (typeof document !== "undefined" && document.readyState !== "complete") {
    await new Promise<void>((resolve) =>
      window.addEventListener("load", () => resolve(), { once: true })
    );
  }
  try {
    return await navigator.serviceWorker.register(`${base}/service-worker.js`, {
      scope: `${base}/`,
      type: "module",
      updateViaCache: "none",
    });
  } catch {
    // Restricted storage/worker support leaves the online application usable.
    return null;
  }
}
