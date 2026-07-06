import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { flushSync, mount, unmount } from 'svelte'
import LoadingOverlay from './LoadingOverlay.svelte'
import { loading } from './loading.svelte'

// Locks the step-logged loading overlay (#127): real steps render with their
// elapsed time, a stalled step stays on screen and keeps counting, and a fast
// open below the reveal threshold never flashes the overlay.

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
})

afterEach(() => {
  // Clear the singleton between tests so a leftover open can't bleed across.
  loading.succeed(0)
  document.body.innerHTML = ''
  vi.useRealTimers()
})

function render(props: Record<string, unknown> = {}) {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(LoadingOverlay, { target, props })
  flushSync()
  return { target, component }
}

test('renders the real, timestamped step log once the reveal threshold passes', () => {
  loading.begin('Opening Docker primary', 0)
  loading.step('Reaching server', 'http://localhost:15055', 0)

  const { target, component } = render({ revealAfterMs: 400 })

  // Below the threshold nothing is painted — the flash guard holds.
  expect(target.querySelector('[data-testid="loading-overlay"]')).toBeNull()

  // A second real step lands while still connecting.
  loading.step('Fetching stats & capabilities', undefined, 200)

  vi.advanceTimersByTime(400)
  flushSync()

  expect(target.querySelector('[data-testid="loading-overlay"]')).not.toBeNull()

  const steps = target.querySelectorAll('[data-testid="loading-step"]')
  expect(steps.length).toBe(2)
  expect(target.textContent).toContain('Reaching server')
  expect(target.textContent).toContain('http://localhost:15055')
  expect(target.textContent).toContain('Fetching stats & capabilities')

  // Headline and a ticking elapsed badge are shown.
  expect(target.textContent).toContain('Opening Docker primary')
  const elapsed = target.querySelector('[data-testid="loading-elapsed"]')
  expect(elapsed?.textContent).toContain('0.4s')

  // Every step carries its own elapsed time.
  const stepTimes = target.querySelectorAll('[data-testid="loading-step-elapsed"]')
  expect(stepTimes.length).toBe(2)
  expect(stepTimes[0]?.textContent).toContain('s')

  unmount(component)
})

test('does not flash the overlay for a fast open below the threshold', () => {
  loading.begin('Opening Embedded', 0)
  loading.step('Reaching server', undefined, 0)

  const { target, component } = render({ revealAfterMs: 400 })

  // The open resolves quickly, before the reveal timer would fire.
  vi.advanceTimersByTime(120)
  loading.succeed(120)
  flushSync()

  // Advancing past the old threshold must not resurrect the overlay.
  vi.advanceTimersByTime(400)
  flushSync()

  expect(target.querySelector('[data-testid="loading-overlay"]')).toBeNull()

  unmount(component)
})

test('keeps a stalled step on screen with a growing elapsed time', () => {
  loading.begin('Opening remote cluster', 0)
  loading.step('Reaching server', undefined, 0)

  const { target, component } = render({ revealAfterMs: 100 })

  vi.advanceTimersByTime(100)
  flushSync()

  expect(target.querySelector('[data-testid="loading-overlay"]')).not.toBeNull()
  const firstElapsed = target.querySelector('[data-testid="loading-elapsed"]')?.textContent

  // No further steps arrive — the step has stalled. Elapsed keeps ticking and
  // the stalled step stays the one on screen.
  vi.advanceTimersByTime(2000)
  flushSync()

  const laterElapsed = target.querySelector('[data-testid="loading-elapsed"]')?.textContent
  expect(laterElapsed).not.toBe(firstElapsed)
  expect(laterElapsed).toContain('2.1s')
  expect(target.querySelectorAll('[data-testid="loading-step"]').length).toBe(1)
  expect(target.textContent).toContain('Reaching server')

  unmount(component)
})
