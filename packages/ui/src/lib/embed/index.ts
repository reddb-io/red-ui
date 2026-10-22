import appCss from "../../app.css?inline";
import type { Component } from "svelte";
import type { ConnectionProvider, ConsoleSink } from "../reddb";
import { devConsole } from "../reddb/dev-console";
import { applyAppearance, type Theme } from "../theme.svelte";
import { RED_UI_VERSION, readBuildInfo } from "../build-info";

/** Build version of the embeddable bundle, stamped at build time. */
export { RED_UI_VERSION, readBuildInfo };

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
  type ConsoleEntry,
  type ConsoleEntryKind,
  type ConsoleSink,
  type InjectedClientOptions,
  type RedClientOptions,
} from "../reddb";

export interface RedUiEmbedOptions {
  connectionProvider: ConnectionProvider;
  initialRoute?: string;
  theme?: Theme;
  shadowRoot?: ShadowRootInit;
  /**
   * Host tap on red-ui's developer console. When set, every query/HTTP
   * round-trip the embedded Core records — verb, target, duration, row count,
   * sanitized payload — is also delivered to the host, so a host app (e.g.
   * red-request) can mirror red-ui's RQL/SQL traffic into its own developer
   * bar. Entries are already secret-redacted before they reach the sink.
   */
  consoleSink?: ConsoleSink;
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
  // The DS axes (ADR 0008): `data-theme` is the Theme direction and
  // `data-color-scheme` is light/dark. A host that still pre-sets the legacy
  // `data-theme="light|dark"` keeps its choice.
  const legacy = host.dataset.theme;
  const preset =
    host.dataset.colorScheme ??
    (legacy === "light" || legacy === "dark" ? legacy : undefined);
  applyAppearance(host, opts.theme ?? (preset as Theme | undefined) ?? "dark");

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

  const removeSink = opts.consoleSink
    ? devConsole.addSink(opts.consoleSink)
    : undefined;

  return {
    host,
    shadowRoot,
    portalTarget,
    destroy: () => {
      removeSink?.();
      void unmount(instance);
      shadowRoot.textContent = "";
    },
  };
}

export class RedUiElement extends HTMLElement {
  #connectionProvider: ConnectionProvider | null = null;
  #consoleSink: ConsoleSink | null = null;
  initialRoute: string | undefined;
  theme: Theme | undefined;
  #handle: RedUiEmbedHandle | null = null;
  #mounting: Promise<void> | null = null;

  /** Build version of the embedded bundle (also reflected as a `version`
   *  attribute on connect, so a host can read `el.getAttribute('version')`). */
  static readonly version = RED_UI_VERSION;
  get version(): string {
    return RED_UI_VERSION;
  }

  get connectionProvider(): ConnectionProvider | null {
    return this.#connectionProvider;
  }

  set connectionProvider(provider: ConnectionProvider | null) {
    this.#connectionProvider = provider;
    if (this.isConnected) this.#mounting = this.#mount();
  }

  get consoleSink(): ConsoleSink | null {
    return this.#consoleSink;
  }

  /**
   * Host tap on the embedded Core's developer console (see
   * `RedUiEmbedOptions.consoleSink`). Setting it after mount remounts, like
   * `connectionProvider` — hosts normally assign both before attach.
   */
  set consoleSink(sink: ConsoleSink | null) {
    this.#consoleSink = sink;
    if (this.isConnected) this.#mounting = this.#mount();
  }

  connectedCallback() {
    if (!this.hasAttribute("version"))
      this.setAttribute("version", RED_UI_VERSION);
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
      consoleSink: this.#consoleSink ?? undefined,
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
