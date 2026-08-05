// The Base Kit's public surface.
//
// The Base Kit is the parent every other Kit declares (ADR 0004): a consumer
// that declares any Kit receives this one too, so a component here reaches
// every application without it pulling a sibling Kit. That makes the bar for
// entry higher than the application Kit's, not lower — what belongs here is
// what is cross-audience by nature, the Logo first.
//
// The Kit ships no component yet; the Logo lands with issue #46. The list
// below is the seam it arrives through, pinned against the files on disk by
// `test/components.test.ts` so a component added here cannot go unexported.

/**
 * Every component this Kit ships, by component name.
 *
 * Declared rather than discovered, because a consumer reads this list out of
 * vendored source with no bundler glob to run — the same contract the
 * application Kit's `PRIMITIVES` carries.
 */
export const BASE_COMPONENTS = [] as const;

export type BaseComponentName = (typeof BASE_COMPONENTS)[number];
