// Test-only reactive control for the ErrorBoundary regression test. Kept in a
// `.svelte.ts` module so the `$state` rune is compiled. The crash child reads
// `crashCtrl.crash` at (re)creation time, so flipping it before a boundary
// reset models a transient fault that has since cleared.
export const crashCtrl = $state({ crash: true, message: 'render-crash-test' })
