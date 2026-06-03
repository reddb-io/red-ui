// Thin reactive shell over the pure skin core (`skins.ts`).
//
// Holds the selected skin in rune state, applies it to the document, and
// persists the choice so it survives reloads. All the colour math lives in
// the pure `skinToCssVars` mapping — this file only does DOM + localStorage.

import {
  DEFAULT_SKIN,
  STORAGE_KEY,
  applySkin,
  skinByName,
  type Skin,
} from "./skins";

function readPersisted(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

function persist(name: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, name);
}

function rootEl(target?: HTMLElement | null): HTMLElement | null {
  return (
    target ??
    (typeof document !== "undefined" ? document.documentElement : null)
  );
}

class SkinStore {
  /** The currently selected skin (reactive). */
  current = $state<Skin>(DEFAULT_SKIN);
  private target: HTMLElement | null = null;

  /**
   * Sync the store with the persisted selection and apply it. Call once on
   * mount (after the theme inline script has run). With nothing persisted the
   * store reports the default skin but leaves the inherited theme untouched.
   */
  init(target?: HTMLElement | null) {
    this.target = rootEl(target);
    const persisted = readPersisted();
    if (persisted) {
      this.current = skinByName(persisted);
      if (this.target) applySkin(this.current, this.target);
    }
  }

  /** Select a skin: apply its vars to the DOM and persist the choice. */
  select(name: string) {
    const skin = skinByName(name);
    this.current = skin;
    const el = rootEl(this.target);
    if (el) {
      this.target = el;
      applySkin(skin, el);
    }
    persist(skin.name);
  }
}

export const skins = new SkinStore();
