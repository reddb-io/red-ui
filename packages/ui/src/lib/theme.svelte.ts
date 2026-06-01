export type Theme = "light" | "dark";

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
  const scoped = target?.dataset.theme;
  if (scoped === "dark" || scoped === "light") return scoped;
  if (!persist) return initial ?? DEFAULT;
  if (typeof localStorage === "undefined") return initial ?? DEFAULT;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "dark" || v === "light" ? v : (initial ?? DEFAULT);
}

function apply(t: Theme, target: HTMLElement | null) {
  if (target) {
    target.dataset.theme = t;
    return;
  }
  if (typeof document !== "undefined")
    document.documentElement.dataset.theme = t;
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
