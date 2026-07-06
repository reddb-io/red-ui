import { afterEach, expect, test, vi } from 'vitest'
import { flushSync, mount, unmount } from 'svelte'
import Fixture from './ErrorBoundary.fixture.svelte'
import { crashCtrl } from './ErrorBoundary.fixtures.svelte'

// Locks the black-screen shield (#126): a throwing child must surface the
// recovery UI, retry-render must recover a transient fault, and reload-window
// must always fire.

afterEach(() => {
  crashCtrl.crash = true
  crashCtrl.message = 'render-crash-test'
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

function render() {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(Fixture, { target })
  flushSync()
  return { target, component }
}

test('a throwing child renders the failure screen, not a black webview', () => {
  crashCtrl.crash = true
  const { target, component } = render()

  const alert = target.querySelector('[role="alert"]')
  expect(alert, 'failure screen should be shown').not.toBeNull()
  // The crash message and stack are surfaced for the operator.
  expect(target.textContent).toContain('render-crash-test')
  expect(target.querySelector('pre'), 'stack trace should be shown').not.toBeNull()
  // The child never mounted — the boundary contained the fault.
  expect(target.querySelector('[data-testid="child-alive"]')).toBeNull()
  // Both recovery actions are present.
  expect(target.textContent).toContain('Retry render')
  expect(target.textContent).toContain('Reload window')

  unmount(component)
})

test('retry-render recovers once the transient fault clears', () => {
  crashCtrl.crash = true
  const { target, component } = render()
  expect(target.querySelector('[role="alert"]')).not.toBeNull()

  // The underlying fault is gone; retrying the render should recover.
  crashCtrl.crash = false
  const retry = [...target.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('Retry render'),
  )
  expect(retry, 'retry button should exist').toBeTruthy()
  retry!.click()
  flushSync()

  expect(target.querySelector('[data-testid="child-alive"]'), 'child should recover').not.toBeNull()
  expect(target.querySelector('[role="alert"]'), 'failure screen should be gone').toBeNull()

  unmount(component)
})

test('retry-render stays on the failure screen while the fault persists', () => {
  crashCtrl.crash = true
  const { target, component } = render()

  // Fault still reproduces — retrying re-throws and the shield holds.
  const retry = [...target.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('Retry render'),
  )
  retry!.click()
  flushSync()

  expect(target.querySelector('[role="alert"]'), 'failure screen should persist').not.toBeNull()
  expect(target.querySelector('[data-testid="child-alive"]')).toBeNull()

  unmount(component)
})

test('reload-window always fires a hard reload', () => {
  crashCtrl.crash = true
  const { target, component } = render()

  const reloadSpy = vi.fn()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload: reloadSpy },
  })

  const reload = [...target.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('Reload window'),
  )
  expect(reload, 'reload button should exist').toBeTruthy()
  reload!.click()
  flushSync()

  expect(reloadSpy).toHaveBeenCalledOnce()

  unmount(component)
})
