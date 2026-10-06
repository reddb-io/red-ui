// red-ui's light/dark choice is the DS Color Scheme axis (DS ADR 0008):
// `data-color-scheme` carries it, while `data-theme` names the DS Theme
// direction, which for red-ui is always "application".
export type Theme = "light" | "dark";

export const DS_THEME = "application";

/** Put red-ui's appearance on an element in the DS's attribute vocabulary. */
export function applyAppearance(el: HTMLElement, scheme: Theme) {
  el.dataset.theme = DS_THEME;
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
  initial?: Theme
): Theme {
  const scoped = target?.dataset.colorScheme;
  if (scoped === "dark" || scoped === "light") return scoped;
  if (!persist) return initial ?? DEFAULT;
  if (typeof localStorage === "undefined") return initial ?? DEFAULT;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "dark" || v === "light" ? v : (initial ?? DEFAULT);
}

function apply(t: Theme, target: HTMLElement | null) {
  if (target) {
    applyAppearance(target, t);
    return;
  }
  if (typeof document !== "undefined")
    applyAppearance(document.documentElement, t);
}

function persist(t: Theme, enabled: boolean) {
  if (!enabled) return;
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, t);
}

class ThemeStore {
  current = $state<Theme>(DEFAULT);
  target: HTMLElement | null = null;
  persistTheme = true;

  init(opts: ThemeInitOptions = {}) {
    this.target = opts.target ?? null;
    this.persistTheme = opts.persist ?? true;
    this.current = read(this.target, this.persistTheme, opts.initial);
    apply(this.current, this.target);
  }

  set(t: Theme) {
    this.current = t;
    apply(t, this.target);
    persist(t, this.persistTheme);
  }

  toggle() {
    this.set(this.current === "dark" ? "light" : "dark");
  }
}

export const theme = new ThemeStore();
