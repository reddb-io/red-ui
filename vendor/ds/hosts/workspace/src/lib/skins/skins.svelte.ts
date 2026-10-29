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
import type { KeyValueStorage } from "../connection-history";

function readPersisted(
  key: string | null,
  storage?: KeyValueStorage
): string | null {
  if (!key) return null;
  try {
    return (
      (
        storage ??
        (typeof localStorage !== "undefined" ? localStorage : undefined)
      )?.getItem(key) ?? null
    );
  } catch {
    return null;
  }
}

function persist(name: string, key: string | null, storage?: KeyValueStorage) {
  if (!key) return;
  try {
    (
      storage ??
      (typeof localStorage !== "undefined" ? localStorage : undefined)
    )?.setItem(key, name);
  } catch {
    /* Preferences may remain in memory in a restricted host. */
  }
}

function rootEl(
  target?: HTMLElement | null,
  globalTarget = true
): HTMLElement | null {
  return (
    target ??
    (globalTarget && typeof document !== "undefined"
      ? document.documentElement
      : null)
  );
}

export class SkinStore {
  constructor(
    private readonly storageKey: string | null = STORAGE_KEY,
    private readonly storage?: KeyValueStorage,
    private readonly globalTarget = true
  ) {}
  /** The currently selected skin (reactive). */
  current = $state<Skin>(DEFAULT_SKIN);
  private target: HTMLElement | null = null;

  /**
   * Sync the store with the persisted selection and apply it. Call once on
   * mount (after the theme inline script has run). With nothing persisted the
   * store reports the default skin but leaves the inherited theme untouched.
   */
  init(target?: HTMLElement | null) {
    this.target = rootEl(target, this.globalTarget);
    const persisted = readPersisted(this.storageKey, this.storage);
    if (persisted) {
      this.current = skinByName(persisted);
      if (this.target) applySkin(this.current, this.target);
    }
  }

  /** Select a skin: apply its vars to the DOM and persist the choice. */
  select(name: string) {
    const skin = skinByName(name);
    this.current = skin;
    const el = rootEl(this.target, this.globalTarget);
    if (el) {
      this.target = el;
      applySkin(skin, el);
    }
    persist(skin.name, this.storageKey, this.storage);
  }

  dispose() {
    this.target = null;
  }
}

export const skins = new SkinStore();
