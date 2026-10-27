import { copyCodeSource, observeCodeOverflow } from "./code-block";

const active = new WeakSet<HTMLElement>();

/**
 * Activate copy feedback and keyboard scrolling on server-rendered CodeBlocks
 * without loading a framework. Labels come from the native SSR contract.
 * Repeated calls skip blocks already owned by an enhancer. The returned cleanup
 * restores those this call activated; dispose it before hydrating the same DOM.
 * Call again after inserting new static blocks. Does not observe DOM mutations.
 */
export function enhanceCodeBlocks(root: ParentNode = document): () => void {
  const cleanups: Array<() => void> = [];
  const blocks = [...root.querySelectorAll<HTMLElement>("[data-code-block]")];
  if (root instanceof HTMLElement && root.matches("[data-code-block]")) blocks.unshift(root);
  for (const block of blocks) {
    if (active.has(block)) continue;
    const button = block.querySelector<HTMLButtonElement>("[data-code-block-copy]");
    const label = button?.querySelector<HTMLElement>('[aria-live="polite"]');
    const pre = block.querySelector<HTMLPreElement>("pre"), code = pre?.querySelector("code");
    if (!button || !label || !pre || !code) continue;
    active.add(block);
    let disposed = false, request = 0;
    const originalLabel = label.textContent, originalName = button.getAttribute("aria-label");
    const attributes = ["tabindex", "role", "aria-label", "data-code-block-overflowing"];
    const originalRegion = attributes.map(name => pre.getAttribute(name));
    const set = (element: Element, name: string, value: string | null) => {
      if (value === null) element.removeAttribute(name);
      else element.setAttribute(name, value);
    };
    const stop = observeCodeOverflow(pre, overflowing => {
      if (disposed) return;
      set(pre, "data-code-block-overflowing", overflowing ? "true" : null);
      set(pre, "tabindex", overflowing ? "0" : null);
      set(pre, "role", overflowing ? "region" : null);
      set(pre, "aria-label", overflowing ? block.dataset.codeBlockRegionLabel ?? "Code sample" : null);
    });
    const copy = async () => {
      const current = ++request;
      const copied = await copyCodeSource(code.textContent ?? "");
      if (disposed || current !== request) return;
      const text = copied ? block.dataset.codeBlockCopiedLabel ?? "Copied" : block.dataset.codeBlockCopyErrorLabel ?? "Copy failed. Try again.";
      label.textContent = text;
      button.setAttribute("aria-label", text);
    };
    button.addEventListener("click", copy);
    cleanups.push(() => {
      disposed = true;
      request++;
      button.removeEventListener("click", copy);
      stop();
      label.textContent = originalLabel;
      set(button, "aria-label", originalName);
      attributes.forEach((name, index) => set(pre, name, originalRegion[index]!));
      active.delete(block);
    });
  }
  return () => { cleanups.splice(0).forEach(cleanup => cleanup()); };
}
