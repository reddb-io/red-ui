import { mount, unmount } from "svelte";
import appCss from "../../app.css?inline";
import ShadowDomSpikeCore from "./ShadowDomSpikeCore.svelte";

const shadowHostCss = `
:host {
  display: block;
  min-height: 720px;
  color-scheme: dark;
  contain: content;
  font-family: var(--font-sans);
}

:host,
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
`;

export type ShadowDomSpikeMount = {
  shadowRoot: ShadowRoot;
  portalTarget: HTMLElement;
  destroy: () => void;
};

export function mountShadowDomSpike(host: HTMLElement): ShadowDomSpikeMount {
  host.setAttribute("data-theme", "dark");

  const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  shadowRoot.textContent = "";

  const style = document.createElement("style");
  style.textContent = `${appCss}\n${shadowHostCss}`;

  const mountTarget = document.createElement("div");
  mountTarget.className = "red-ui-shadow-mount";

  const portalTarget = document.createElement("div");
  portalTarget.setAttribute("data-red-ui-shadow-portal", "");

  shadowRoot.append(style, mountTarget, portalTarget);

  const instance = mount(ShadowDomSpikeCore, {
    target: mountTarget,
    props: { portalTarget },
  });

  return {
    shadowRoot,
    portalTarget,
    destroy: () => {
      unmount(instance);
      shadowRoot.textContent = "";
    },
  };
}
