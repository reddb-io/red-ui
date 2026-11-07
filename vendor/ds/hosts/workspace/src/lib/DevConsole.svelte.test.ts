import { afterEach, expect, test, vi } from 'vitest'
import { flushSync, mount, unmount } from 'svelte'
import DevConsole from './DevConsole.svelte'
import { DevConsoleStore } from './reddb/index'

const components: ReturnType<typeof mount>[] = []
afterEach(async () => {
  await Promise.all(components.splice(0).map(component => unmount(component)))
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})
function render(store: DevConsoleStore, open = false) {
  const target = document.createElement('div')
  document.body.appendChild(target)
  components.push(mount(DevConsole, { target, props: { store, open } }))
  flushSync()
  return target
}
function record(store: DevConsoleStore, target = '/query') {
  store.record({ kind: 'query', verb: 'POST', target, startedAt: 0,
    durationMs: 12, ok: true, status: 200, rowCount: 5,
    payload: '{"query":"SELECT 1"}', response: '{"result":1}',
    requestHeaders: [['authorization', '«redacted»']],
  })
}
function button(target: HTMLElement, label: string) {
  return [...target.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.includes(label))!
}

test('bottom bar remains discoverable while collapsed and supports the existing toggle event', () => {
  const target = render(new DevConsoleStore())
  expect(button(target, 'Developer panel').getAttribute('aria-expanded')).toBe('false')
  window.dispatchEvent(new CustomEvent('red:toggle-dev-console'))
  flushSync()
  expect(button(target, 'Developer panel').getAttribute('aria-expanded')).toBe('true')
  target.querySelector<HTMLButtonElement>('[aria-label="Close"]')!.click()
  flushSync()
  expect(button(target, 'Developer panel').getAttribute('aria-expanded')).toBe('false')
})

test('inspects real bodies, redacted headers, row count and measured duration through canonical tabs', () => {
  const store = new DevConsoleStore()
  record(store)
  const target = render(store, true)
  expect(target.textContent).toContain('12 ms')
  expect(target.textContent).toContain('SELECT 1')
  button(target, 'Response').click()
  flushSync()
  expect(target.textContent).toContain('{"result":1}')
  button(target, 'Timing').click()
  flushSync()
  expect(target.textContent).toContain('Rows returned')
  expect(target.textContent).toContain('5')
  expect(target.textContent).toContain('Timing phases not available.')
  expect(target.querySelectorAll('[role="tablist"]').length).toBe(2)
})

test('filter, clear and live counts remain scoped to each workspace store', () => {
  const first = new DevConsoleStore(), second = new DevConsoleStore()
  record(first, '/only-first')
  record(second, '/only-second')
  const a = render(first, true), b = render(second, true)
  expect(a.textContent).not.toContain('/only-second')
  expect(b.textContent).not.toContain('/only-first')
  record(first, '/new')
  flushSync()
  expect(button(a, 'Developer panel').textContent).toContain('2 requests')
  const input = a.querySelector<HTMLInputElement>('[aria-label="Filter requests"]')!
  input.value = 'no-match'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  flushSync()
  expect(a.textContent).toContain('No requests match the filter.')
  button(a, 'Clear').click()
  flushSync()
  expect(first.size).toBe(0)
  expect(second.size).toBe(1)
})

test('copies sanitized detail content', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  const store = new DevConsoleStore()
  record(store)
  const target = render(store, true)
  button(target, 'Copy details').click()
  await Promise.resolve()
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('«redacted»'))
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('SELECT 1'))
})
