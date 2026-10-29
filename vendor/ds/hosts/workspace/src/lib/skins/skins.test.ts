import { describe, expect, it } from 'vitest';
import { DEFAULT_SKIN, skinByName, skinToCssVars } from './skins';
describe('legacy appearance migration', () => {
  it('resolves retired and unknown persisted palettes to the canonical appearance', () => {
    for (const name of ['nocturne', 'reddb', 'unknown', null, undefined]) expect(skinByName(name)).toBe(DEFAULT_SKIN);
  });
  it('compatibility aliases follow DS roles without deriving a second palette', () => {
    const vars = skinToCssVars(DEFAULT_SKIN);
    expect(vars['--color-bg-0']).toBe('var(--reddb-color-background)');
    expect(vars['--color-fg-2']).toBe('var(--reddb-color-ink-muted)');
    expect(Object.values(vars).every(value => /^var\(--reddb-/.test(value))).toBe(true);
  });
});
