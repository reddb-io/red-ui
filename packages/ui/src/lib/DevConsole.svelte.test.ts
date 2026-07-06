import { afterEach, expect, test } from 'vitest'
import { flushSync, mount, unmount } from 'svelte'
import DevConsole from './DevConsole.svelte'
import { DevConsoleStore } from '#reddb'

// Locks the developer console panel (#128): it mirrors the rune-free store,
// renders each call with its timing and row count, toggles from the shell
// event, and copies entry text without leaking secrets.

afterEach(() => {
  document.body.innerHTML = ''
})

function render(props: Record<string, unknown> = {}) {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(DevConsole, { target, props })
  flushSync()
  return { target, component }
}

test('renders each recorded call with its verb, target, and row count when open', () => {
  const store = new DevConsoleStore()
  store.record({
    kind: 'query',
    verb: 'POST',
    target: '/query',
    startedAt: 0,
    durationMs: 12,
    ok: true,
    rowCount: 5,
    payload: '{"query":"SELECT 1"}',
  })

  const { target, component } = render({ store, open: true })

  const panel = target.querySelector('[data-testid="dev-console"]')
  expect(panel).not.toBeNull()
  const entries = target.querySelectorAll('[data-testid="dev-console-entry"]')
  expect(entries.length).toBe(1)
  expect(target.textContent).toContain('/query')
  expect(target.textContent).toContain('5r')
  expect(target.textContent).toContain('12ms')

  unmount(component)
})

test('stays hidden until the shell toggle event fires, then reveals', () => {
  const store = new DevConsoleStore()
  const { target, component } = render({ store, open: false })

  expect(target.querySelector('[data-testid="dev-console"]')).toBeNull()

  window.dispatchEvent(new CustomEvent('red:toggle-dev-console'))
  flushSync()

  expect(target.querySelector('[data-testid="dev-console"]')).not.toBeNull()

  window.dispatchEvent(new CustomEvent('red:toggle-dev-console'))
  flushSync()

  expect(target.querySelector('[data-testid="dev-console"]')).toBeNull()

  unmount(component)
})

test('live-updates as the store records new calls', () => {
  const store = new DevConsoleStore()
  const { target, component } = render({ store, open: true })

  expect(target.querySelectorAll('[data-testid="dev-console-entry"]').length).toBe(0)
  expect(target.textContent).toContain("No calls yet")

  store.record({
    kind: 'http',
    verb: 'GET',
    target: '/stats',
    startedAt: 0,
    durationMs: 3,
    ok: true,
  })
  flushSync()

  expect(target.querySelectorAll('[data-testid="dev-console-entry"]').length).toBe(1)
  expect(target.querySelector('[data-testid="dev-console-count"]')?.textContent).toContain('1')

  unmount(component)
})

test('clear empties the panel via the store', () => {
  const store = new DevConsoleStore()
  store.record({
    kind: 'http',
    verb: 'GET',
    target: '/stats',
    startedAt: 0,
    durationMs: 3,
    ok: true,
  })

  const { target, component } = render({ store, open: true })
  expect(target.querySelectorAll('[data-testid="dev-console-entry"]').length).toBe(1)

  const clearBtn = [...target.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('Clear'),
  )!
  clearBtn.click()
  flushSync()

  expect(target.querySelectorAll('[data-testid="dev-console-entry"]').length).toBe(0)
  expect(store.size).toBe(0)

  unmount(component)
})
