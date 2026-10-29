// red-ui's light/dark choice is the DS Color Scheme axis (DS ADR 0008):
// `data-color-scheme` carries it, while `data-theme` names the DS Theme
// direction, which for red-ui is always "application".
import type { KeyValueStorage } from "./connection-history";
export type Theme = "light" | "dark";

export const DS_THEME = "application";

/** Put red-ui's appearance on an element in the DS's attribute vocabulary. */
export function applyAppearance(el: HTMLElement, scheme: Theme) {
  el.dataset.theme = DS_THEME;
  el.dataset.density ||= "compact";
  el.dataset.colorScheme = scheme;
}

/** The Color Scheme an element (default: the document root) carries. */
export function colorSchemeOf(el?: HTMLElement | null): Theme {
  const target =
    el ?? (typeof document !== "undefined" ? document.documentElement : null);
  return target?.dataset.colorScheme === "dark" ? "dark" : "light";
}

const STORAGE_KEY = "red-ui-theme";
const DEFAULT: Theme = "light";

interface ThemeInitOptions {
  target?: HTMLElement | null;
  persist?: boolean;
  initial?: Theme;
}

function read(
  target: HTMLElement | null,
  persist: boolean,
  initial?: Theme,
  storageKey = STORAGE_KEY,
  storage?: KeyValueStorage
): Theme {
  const scoped = target?.dataset.colorScheme;
  if (scoped === "dark" || scoped === "light") return scoped;
  if (!persist) return initial ?? DEFAULT;
  try {
    const backend =
      storage ??
      (typeof localStorage !== "undefined" ? localStorage : undefined);
    const v = backend?.getItem(storageKey);
    return v === "dark" || v === "light" ? v : (initial ?? DEFAULT);
  } catch {
    return initial ?? DEFAULT;
  }
}

function apply(t: Theme, target: HTMLElement | null, globalTarget = true) {
  if (target) {
    applyAppearance(target, t);
    return;
  }
  if (globalTarget && typeof document !== "undefined")
    applyAppearance(document.documentElement, t);
}

function persist(
  t: Theme,
  enabled: boolean,
  storageKey: string,
  storage?: KeyValueStorage
) {
  if (!enabled) return;
  try {
    (
      storage ??
      (typeof localStorage !== "undefined" ? localStorage : undefined)
    )?.setItem(storageKey, t);
  } catch {
    /* Preferences may remain in memory in a restricted host. */
  }
}

export class ThemeStore {
  constructor(
    private readonly storageKey = STORAGE_KEY,
    private readonly storage?: KeyValueStorage,
    private readonly globalTarget = true
  ) {}
  current = $state<Theme>(DEFAULT);
  target: HTMLElement | null = null;
  persistTheme = true;

  init(opts: ThemeInitOptions = {}) {
    this.target = opts.target ?? null;
    this.persistTheme = opts.persist ?? true;
    this.current = read(
      this.target,
      this.persistTheme,
      opts.initial,
      this.storageKey,
      this.storage
    );
    apply(this.current, this.target, this.globalTarget);
  }

  set(t: Theme) {
    this.current = t;
    apply(t, this.target, this.globalTarget);
    persist(t, this.persistTheme, this.storageKey, this.storage);
  }

  toggle() {
    this.set(this.current === "dark" ? "light" : "dark");
  }

  dispose() {
    this.target = null;
  }
}

export const theme = new ThemeStore();
