export interface VisibilitySource {
  readonly hidden: boolean;
  addEventListener(type: "visibilitychange", listener: () => void): void;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
}

/**
 * Poll only while the owning document is visible and never overlap requests.
 * Returning to a visible tab refreshes immediately instead of waiting for the
 * next interval.
 */
export function startVisiblePoll(
  operation: () => void | Promise<void>,
  intervalMs: number,
  source: VisibilitySource = document
): () => void {
  let running = false;
  let stopped = false;

  const run = () => {
    if (stopped || source.hidden || running) return;
    running = true;
    void Promise.resolve(operation()).finally(() => {
      running = false;
    });
  };
  const onVisibilityChange = () => run();
  const timer = setInterval(run, intervalMs);
  source.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    stopped = true;
    clearInterval(timer);
    source.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
