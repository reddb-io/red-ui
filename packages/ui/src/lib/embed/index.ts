import appCss from "../../app.css?inline";
import type { Component } from "svelte";
import type { ConnectionProvider, ConsoleSink } from "../reddb";
import {
  createWorkspaceRuntime,
  type WorkspaceRuntime,
} from "../workspace-runtime.svelte";
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
  /** Distinct accessible name when several workspaces share one page. */
  label?: string;
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
  /** Instance-local services and command/lifecycle boundary. */
  runtime: WorkspaceRuntime;
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

const mounts = new WeakMap<HTMLElement, RedUiEmbedHandle>();
// Retain closed roots too: host.shadowRoot intentionally cannot expose them.
const shadowRoots = new WeakMap<HTMLElement, ShadowRoot>();

export async function mountRedUi(
  host: HTMLElement,
  opts: RedUiEmbedOptions
): Promise<RedUiEmbedHandle> {
  mounts.get(host)?.destroy();
  // The DS axes (ADR 0008): `data-theme` is the Theme direction and
  // `data-color-scheme` is light/dark. A host that still pre-sets the legacy
  // `data-theme="light|dark"` keeps its choice.
  const legacy = host.dataset.theme;
  const preset =
    host.dataset.colorScheme ??
    (legacy === "light" || legacy === "dark" ? legacy : undefined);
  applyAppearance(host, opts.theme ?? (preset as Theme | undefined) ?? "dark");

  // Browsers do not register @font-face rules inside a shadow tree. Publish
  // only the received DS faces once per document; appearance stays scoped.
  const doc = host.ownerDocument;
  if (!doc.head.querySelector(`style[data-red-ui-fonts="${RED_UI_VERSION}"]`)) {
    const fonts = doc.createElement("style");
    fonts.dataset.redUiFonts = RED_UI_VERSION;
    fonts.textContent =
      appCss.match(/@font-face\s*\{[^}]*\}/g)?.join("\n") ?? "";
    doc.head.append(fonts);
  }

  const shadowRoot =
    shadowRoots.get(host) ??
    host.shadowRoot ??
    host.attachShadow(opts.shadowRoot ?? { mode: "open" });
  shadowRoots.set(host, shadowRoot);
  shadowRoot.textContent = "";

  const style = document.createElement("style");
  style.textContent = `${appCss}\n${shadowCss}`;

  const mountTarget = document.createElement("div");
  mountTarget.className = "red-ui-shadow-mount";

  const portalTarget = document.createElement("div");
  portalTarget.setAttribute("data-red-ui-shadow-portal", "");

  shadowRoot.append(style, mountTarget, portalTarget);

  const runtime = createWorkspaceRuntime({
    connectionProvider: opts.connectionProvider,
    consoleSink: opts.consoleSink,
  });
  let instance: ReturnType<typeof import("svelte").mount> | undefined;
  let disposed = false;
  const handle: RedUiEmbedHandle = {
    host,
    shadowRoot,
    portalTarget,
    runtime,
    destroy() {
      if (disposed) return;
      disposed = true;
      runtime.dispose();
      if (instance)
        void import("svelte").then(({ unmount }) => unmount(instance!));
      if (mounts.get(host) === handle) {
        mounts.delete(host);
        shadowRoot.textContent = "";
      }
    },
  };
  mounts.set(host, handle);

  try {
    const [{ mount }, root] = await Promise.all([
      import("svelte"),
      import("./RedUiEmbedRoot.svelte") as Promise<{
        default: Component<Record<string, unknown>>;
      }>,
    ]);

    if (disposed) return handle;
    instance = mount(root.default, {
      target: mountTarget,
      props: {
        runtime,
        label: opts.label,
        portalTarget,
        shadowHost: host,
        initialRoute: opts.initialRoute,
        initialTheme: opts.theme,
      },
    });

    return handle;
  } catch (error) {
    handle.destroy();
    throw error;
  }
}

export class RedUiElement extends HTMLElement {
  #connectionProvider: ConnectionProvider | null = null;
  #consoleSink: ConsoleSink | null = null;
  initialRoute: string | undefined;
  label: string | undefined;
  theme: Theme | undefined;
  #handle: RedUiEmbedHandle | null = null;
  #mounting: Promise<void> | null = null;
  #generation = 0;

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
    this.#generation += 1;
    mounts.get(this)?.destroy();
    this.#handle?.destroy();
    this.#handle = null;
    this.#mounting = null;
  }

  async #mount() {
    const generation = ++this.#generation;
    const provider = this.#connectionProvider;
    this.#handle?.destroy();
    this.#handle = null;
    if (!provider) {
      mounts.get(this)?.destroy();
      return;
    }
    const handle = await mountRedUi(this, {
      connectionProvider: provider,
      label: this.label,
      initialRoute: this.initialRoute,
      theme: this.theme,
      consoleSink: this.#consoleSink ?? undefined,
    });
    if (generation !== this.#generation || !this.isConnected) handle.destroy();
    else this.#handle = handle;
  }
}

export function registerRedUiElement(
  tagName: RedUiElementTagName = "red-ui-app"
): typeof RedUiElement {
  if (!customElements.get(tagName))
    customElements.define(tagName, RedUiElement);
  return customElements.get(tagName) as typeof RedUiElement;
}
