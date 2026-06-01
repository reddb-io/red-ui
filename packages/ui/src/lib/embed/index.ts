import appCss from "../../app.css?inline";
import type { Component } from "svelte";
import type { ConnectionProvider } from "../reddb";
import type { Theme } from "../theme.svelte";

declare global {
  interface Window {
    __RED_UI_EMBED_SURFACE__?: boolean;
  }
}

export {
  InjectedClientProvider,
  RedClient,
  type Connection,
  type ConnectionProvider,
  type InjectedClientOptions,
  type RedClientOptions,
} from "../reddb";

export interface RedUiEmbedOptions {
  connectionProvider: ConnectionProvider;
  initialRoute?: string;
  theme?: Theme;
  shadowRoot?: ShadowRootInit;
}

export interface RedUiEmbedHandle {
  host: HTMLElement;
  shadowRoot: ShadowRoot;
  portalTarget: HTMLElement;
  destroy(): void;
}

export type RedUiElementTagName = `${string}-${string}`;

const shadowCss = `
:host {
  display: block;
  min-height: 720px;
  color-scheme: light dark;
  contain: content;
  font-family: var(--font-sans);
}

:host,
:host([data-theme='light']) {
  --color-bg-0: #ffffff;
  --color-bg-1: #fafafa;
  --color-bg-2: #f4f4f5;
  --color-bg-3: #e7e7ea;
  --color-fg-0: #0a0a0b;
  --color-fg-1: #3f3f46;
  --color-fg-2: #52525b;
  --color-fg-3: #71717a;
  --color-line-1: #ececef;
  --color-line-2: #d4d4d8;
  --color-line-3: #a1a1aa;
  --color-accent: #e11d48;
  --color-accent-soft: rgba(225, 29, 72, 0.10);
  --color-accent-glow: rgba(225, 29, 72, 0.30);
  --color-ok: #16a34a;
  --color-warn: #b45309;
  --color-danger: #dc2626;
  --color-info: #2563eb;
  --color-role-primary: #e11d48;
  --color-role-replica: #2563eb;
  --color-role-embedded: #16a34a;
  --color-ambient-glow: rgba(225, 29, 72, 0.04);
  --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08), 0 0 0 1px var(--color-line-2);
  --shadow-lg: 0 16px 48px rgba(15, 23, 42, 0.14), 0 0 0 1px var(--color-line-2);
}

:host([data-theme='dark']) {
  --color-bg-0: #050607;
  --color-bg-1: #0d0f13;
  --color-bg-2: #181b21;
  --color-bg-3: #232730;
  --color-fg-0: #f7f8fa;
  --color-fg-1: #c8ccd4;
  --color-fg-2: #9ca1a9;
  --color-fg-3: #7a7f87;
  --color-line-1: #181b21;
  --color-line-2: #2a2e36;
  --color-line-3: #3d424b;
  --color-accent: #ff2056;
  --color-accent-soft: rgba(255, 32, 86, 0.12);
  --color-accent-glow: rgba(255, 32, 86, 0.45);
  --color-ok: #4ade80;
  --color-warn: #fbbf24;
  --color-danger: #ff5470;
  --color-info: #60a5fa;
  --color-role-primary: #ff2056;
  --color-role-replica: #60a5fa;
  --color-role-embedded: #4ade80;
  --color-ambient-glow: rgba(255, 32, 86, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--color-line-2);
  --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--color-line-2);
}

:host * {
  box-sizing: border-box;
}

.red-ui-shadow-mount {
  min-height: 720px;
  background: var(--color-bg-0);
  color: var(--color-fg-0);
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

[data-red-ui-shadow-portal] {
  position: relative;
  z-index: 2147483647;
}
`;

function markEmbedSurface() {
  if (typeof window !== "undefined") window.__RED_UI_EMBED_SURFACE__ = true;
}

export async function mountRedUi(
  host: HTMLElement,
  opts: RedUiEmbedOptions
): Promise<RedUiEmbedHandle> {
  markEmbedSurface();
  host.dataset.theme = opts.theme ?? host.dataset.theme ?? "dark";

  const shadowRoot =
    host.shadowRoot ?? host.attachShadow(opts.shadowRoot ?? { mode: "open" });
  shadowRoot.textContent = "";

  const style = document.createElement("style");
  style.textContent = `${appCss}\n${shadowCss}`;

  const mountTarget = document.createElement("div");
  mountTarget.className = "red-ui-shadow-mount";

  const portalTarget = document.createElement("div");
  portalTarget.setAttribute("data-red-ui-shadow-portal", "");

  shadowRoot.append(style, mountTarget, portalTarget);

  const [{ mount, unmount }, root] = await Promise.all([
    import("svelte"),
    import("./RedUiEmbedRoot.svelte") as Promise<{
      default: Component<Record<string, unknown>>;
    }>,
  ]);

  const instance = mount(root.default, {
    target: mountTarget,
    props: {
      connectionProvider: opts.connectionProvider,
      portalTarget,
      shadowHost: host,
      initialRoute: opts.initialRoute,
      initialTheme: opts.theme,
    },
  });

  return {
    host,
    shadowRoot,
    portalTarget,
    destroy: () => {
      void unmount(instance);
      shadowRoot.textContent = "";
    },
  };
}

export class RedUiElement extends HTMLElement {
  #connectionProvider: ConnectionProvider | null = null;
  initialRoute: string | undefined;
  theme: Theme | undefined;
  #handle: RedUiEmbedHandle | null = null;
  #mounting: Promise<void> | null = null;

  get connectionProvider(): ConnectionProvider | null {
    return this.#connectionProvider;
  }

  set connectionProvider(provider: ConnectionProvider | null) {
    this.#connectionProvider = provider;
    if (this.isConnected) this.#mounting = this.#mount();
  }

  connectedCallback() {
    this.#mounting ??= this.#mount();
  }

  disconnectedCallback() {
    this.#handle?.destroy();
    this.#handle = null;
    this.#mounting = null;
  }

  async #mount() {
    if (!this.#connectionProvider) return;
    this.#handle?.destroy();
    this.#handle = await mountRedUi(this, {
      connectionProvider: this.#connectionProvider,
      initialRoute: this.initialRoute,
      theme: this.theme,
    });
  }
}

export function registerRedUiElement(
  tagName: RedUiElementTagName = "red-ui-app"
): typeof RedUiElement {
  markEmbedSurface();
  if (!customElements.get(tagName))
    customElements.define(tagName, RedUiElement);
  return customElements.get(tagName) as typeof RedUiElement;
}
