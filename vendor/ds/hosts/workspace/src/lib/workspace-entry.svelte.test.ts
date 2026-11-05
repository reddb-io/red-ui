import { afterEach, expect, test, vi } from 'vitest'
import { flushSync, mount, unmount } from 'svelte'
import Workspace from './Workspace.svelte'
import { createWorkspaceRuntime, type WorkspaceRuntime } from './workspace-runtime.svelte'
import { createStateRouter } from './router.svelte'
import { MemoryStorage } from './workspace-storage'
import type { WorkspacePersistence } from './workspace-persistence'
import { RedClient, type ConnectionProvider } from './reddb/index'

const roots: ReturnType<typeof mount>[] = []
const runtimes: WorkspaceRuntime[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await unmount(root)
  for (const runtime of runtimes.splice(0)) runtime.dispose()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})
function render(runtime: WorkspaceRuntime, route = '/query') {
  runtimes.push(runtime)
  const target = document.createElement('div'); document.body.append(target)
  const router = createStateRouter(); router.go({view:'query'})
  roots.push(mount(Workspace, {target, props:{runtime, router, initialRoute:route}}))
  flushSync()
  return target
}
function deferred<T>() {
  let resolve!: (value:T) => void
  const promise = new Promise<T>(done => resolve = done)
  return {promise, resolve}
}

test('a clean launch shows a connection form without mounting collections, opening tabs or probing a default', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
  const runtime = createWorkspaceRuntime()
  const target = render(runtime)
  await vi.waitFor(() => expect(target.querySelector('[data-connection-form]')).not.toBeNull())
  expect(target.querySelector('[data-workspace-body]')).toBeNull()
  expect(target.querySelector('[data-developer-panel]')).toBeNull()
  expect(target.querySelector('textarea')).toBeNull()
  expect((target.querySelector('input') as HTMLInputElement).value).toBe('')
  expect(runtime.tabs.tabs).toHaveLength(0)
  expect(fetcher).not.toHaveBeenCalled()
})

test('a resolved connection waits for local documents before mounting the connected workspace', async () => {
  const saved = deferred<Record<string,string>>()
  const persistence = {read: () => saved.promise, commit: vi.fn(async () => {}),
    vault: {status: async () => ({initialized:false,locked:true})}, dispose: async () => {}} as unknown as WorkspacePersistence
  const endpoint = {id:'test',label:'test',url:'https://db.test'}
  const client = new RedClient(endpoint.url, {fetch: async () => Response.json({collections:[]})})
  const provider: ConnectionProvider = {list:async () => [endpoint], connect:async () => ({connection:endpoint,client,rtt_ms:1}), whoami:async () => ({authenticated:true,username:'tester',role:'admin'})}
  const runtime = createWorkspaceRuntime({connectionProvider:provider,persistence})
  const target = render(runtime)
  await vi.waitFor(() => expect(runtime.connection.connected).toBe(true))
  expect(target.querySelector('[data-workspace-body]')).toBeNull()
  expect(runtime.tabs.tabs).toHaveLength(0)
  saved.resolve({})
  await vi.waitFor(() => expect(target.querySelector('[data-workspace-body]')).not.toBeNull())
  expect(runtime.tabs.tabs).toHaveLength(1)
  expect(target.querySelector('[data-workspace-entry]')).toBeNull()
})

test('pending host discovery shows a startup state and enters only after the host connection is ready', async () => {
  const discovery = deferred<Awaited<ReturnType<ConnectionProvider['list']>>>()
  const provider: ConnectionProvider = {list:() => discovery.promise, connect:vi.fn(), whoami:async () => ({authenticated:false,username:'',role:''})}
  const runtime = createWorkspaceRuntime({connectionProvider:provider})
  const target = render(runtime)
  await runtime.ready
  await vi.waitFor(() => expect(target.textContent).toContain('Opening your connection'))
  expect(target.querySelector('[data-connection-form]')).toBeNull()
  expect(target.querySelector('main')).toBeNull() // The embedding host owns the page landmark.
  discovery.resolve([])
  await vi.waitFor(() => expect(target.textContent).toContain('host application'))
  expect(provider.connect).not.toHaveBeenCalled()
  expect(runtime.tabs.tabs).toHaveLength(0)
})

test('saved drafts are recovered without entering data surfaces and can be opened explicitly offline', async () => {
  const storage = new MemoryStorage()
  const runtime = createWorkspaceRuntime({persistenceKey:'entry-test',storage,resumeStorage:new MemoryStorage()})
  const tab = runtime.tabs.open({kind:'query',label:'Saved SQL',key:'Saved SQL'},true)
  runtime.queryTabs.ensure(tab.id); runtime.queryTabs.setSql(tab.id,'SELECT preserve_this_draft')
  runtime.workspaceSession.flush({view:'query',collection:null,subpage:null,tabs:runtime.tabs.tabs,activeTabId:tab.id,queries:runtime.queryTabs.snapshot(runtime.tabs.tabs)})
  const target = render(runtime)
  await vi.waitFor(() => expect(target.querySelector('[data-connection-form]')).not.toBeNull())
  expect(target.querySelector('[data-workspace-body]')).toBeNull()
  const offline = [...target.querySelectorAll('button')].find(button => button.textContent?.includes('Open saved workspace offline'))!
  expect(offline).toBeTruthy(); offline.click(); flushSync()
  await vi.waitFor(() => expect(target.querySelector('textarea')).not.toBeNull())
  expect((target.querySelector('textarea') as HTMLTextAreaElement).value).toBe('SELECT preserve_this_draft')
  expect(runtime.connection.connected).toBe(false)
  expect(runtime.tabs.tabs).toHaveLength(1)
})


test('a live heartbeat cannot enter data surfaces before the current connection opening finishes', async () => {
  const runtime = createWorkspaceRuntime()
  const target = render(runtime)
  await vi.waitFor(() => expect(target.querySelector('[data-connection-form]')).not.toBeNull())
  runtime.loading.begin('Opening database')
  runtime.loading.step('Fetching stats & capabilities')
  // A refresh can observe reachability while capability negotiation is pending.
  runtime.connection.connected = true
  flushSync()
  expect(target.querySelector('[data-workspace-body]')).toBeNull()
  expect(runtime.tabs.tabs).toHaveLength(0)
  runtime.loading.succeed()
  await vi.waitFor(() => expect(target.querySelector('[data-workspace-body]')).not.toBeNull())
})


test('local recovery keeps its screen while a handoff opens in parallel', async () => {
  const saved = deferred<Record<string,string>>()
  const discovery = deferred<Awaited<ReturnType<ConnectionProvider['list']>>>()
  const persistence = {read: () => saved.promise, commit: async () => {}, vault: {status: async () => ({initialized:false,locked:true})}, dispose: async () => {}} as unknown as WorkspacePersistence
  const provider: ConnectionProvider = {list:() => discovery.promise, connect:vi.fn(), whoami:async () => ({authenticated:false,username:'',role:''})}
  const runtime = createWorkspaceRuntime({connectionProvider:provider,persistence})
  runtime.loading.begin('Opening database')
  runtime.loading.step('Signing in')
  const target = render(runtime)
  await new Promise(resolve => setTimeout(resolve,450))
  flushSync()
  expect(target.textContent).toContain('Checking this device')
  expect(target.querySelector('[data-testid="loading-overlay"]')).toBeNull()
  expect(target.querySelector('[data-workspace-body]')).toBeNull()
  saved.resolve({})
  await vi.waitFor(() => expect(target.querySelector('[data-testid="loading-overlay"]')).not.toBeNull())
  expect(target.textContent).toContain('Signing in')
  runtime.loading.succeed(); discovery.resolve([])
})
