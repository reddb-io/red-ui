<script lang="ts">
  import { onMount } from 'svelte'
  import { Button, Field, Icon, Input, Popover } from '@reddb-io/design-system/base'
  import {
    connection,
    makeCustomConnection,
    parseConnectionInput,
    openDatabaseFile,
    unreachableConnectHint,
  } from './connections.svelte'
  import Zap from '@lucide/svelte/icons/zap'
  import Loader2 from '@lucide/svelte/icons/loader-2'
  import AlertCircle from '@lucide/svelte/icons/alert-circle'
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2'
  import Clock from '@lucide/svelte/icons/clock'
  import X from '@lucide/svelte/icons/x'
  import Plug from '@lucide/svelte/icons/plug'
  import ChevronDown from '@lucide/svelte/icons/chevron-down'
  import FolderOpen from '@lucide/svelte/icons/folder-open'

  const DEFAULT_URL = 'red://localhost'

  function pickDefaultUrl(): string {
    if (connection.history[0]?.url) return connection.history[0].url
    if (connection.history[0]?.label) return connection.history[0].label
    if (connection.active.url) return connection.active.url
    return DEFAULT_URL
  }

  let open = $state(false)
  let signInOpen = $state(false)
  let url = $state(pickDefaultUrl())
  let username = $state('')
  let password = $state('')
  let status = $state<'idle' | 'probing' | 'ok' | 'error'>('idle')
  let error = $state<string | null>(null)
  let rtt = $state<number | null>(null)
  let inputEl: HTMLInputElement | undefined = $state()

  async function attempt(targetUrl: string, signIn = false) {
    const cleaned = targetUrl.trim()
    if (!cleaned) return
    let parsed: ReturnType<typeof parseConnectionInput>
    const secret = password
    password = ''
    try {
      parsed = parseConnectionInput(cleaned)
      url = parsed.url
      if (parsed.credentials && signIn) {
        throw new Error('Use credentials in either the connection string or the sign-in fields.')
      }
    } catch (cause) {
      url = ''
      status = 'error'
      error = cause instanceof Error ? cause.message : 'Invalid connection string.'
      return
    }
    // Transport reachability guard (#34): never attempt a transport this
    // Surface can't materialize — fail with a clear message instead of an
    // opaque transport-unsupported error from the client.
    if (!connection.canReach(parsed.url)) {
      status = 'error'
      // A file:// target on the web gets an honest, actionable explanation
      // (#123) instead of the generic transport-unsupported line.
      error =
        unreachableConnectHint(parsed.url) ??
        `This app can't reach that transport here — supported: ${supportedHint}`
      return
    }
    status = 'probing'
    error = null
    rtt = null
    const preset = makeCustomConnection(parsed.url)
    const credentials = parsed.credentials ?? (signIn ? { username: username.trim(), password: secret } : undefined)
    const ok = credentials
      ? await connection.login(preset, credentials.username, credentials.password)
      : await connection.tryConnect(preset)
    if (ok) {
      status = 'ok'
      rtt = connection.probe.rtt_ms ?? null
      setTimeout(() => (open = false), 350)
    } else {
      status = 'error'
      error = connection.probe.error ?? 'unreachable'
    }
  }

  function submit(e: Event) {
    e.preventDefault()
    attempt(url, Boolean(username.trim() && password))
  }

  // Desktop-only "Open database file…" flow (#123): the native OS picker feeds
  // the chosen .rdb into the existing file:// connect path. Hidden on the web
  // Surface, where there is no picker (file:// is unreachable there).
  async function openFile() {
    status = 'probing'
    error = null
    rtt = null
    const res = await openDatabaseFile()
    if (res.ok) {
      status = 'ok'
      rtt = connection.probe.rtt_ms ?? null
      url = connection.active.url
      setTimeout(() => (open = false), 350)
    } else if (res.cancelled) {
      status = 'idle'
    } else {
      status = 'error'
      error = res.reason ?? 'unreachable'
    }
  }

  function fmtRel(ms: number) {
    const d = Date.now() - ms
    if (d < 60_000) return 'just now'
    if (d < 3_600_000) return `${Math.round(d / 60_000)}m ago`
    if (d < 86_400_000) return `${Math.round(d / 3_600_000)}h ago`
    return `${Math.round(d / 86_400_000)}d ago`
  }

  function forget(e: MouseEvent, id: string) {
    e.stopPropagation()
    connection.forgetById(id)
  }

  onMount(() => {
    const onOpen = () => {
      open = true
      setTimeout(() => inputEl?.focus(), 0)
    }
    window.addEventListener('red:open-connect', onOpen)
    return () => window.removeEventListener('red:open-connect', onOpen)
  })

  $effect(() => {
    if (!connection.connected && connection.probe.error) {
      url = connection.active.url
      error = connection.probe.error
      status = 'error'
      open = true
      if (error.includes('HTTP 401')) signInOpen = true
    }
  })

  const dotClass = $derived(
    connection.connected ? 'bg-ok' : status === 'error' ? 'bg-danger' : 'bg-fg-3'
  )

  const triggerLabel = $derived(
    connection.connected ? connection.active.label : 'Connect'
  )

  const triggerStatus = $derived(
    connection.connected && connection.probe.rtt_ms !== undefined
      ? `${connection.probe.rtt_ms}ms`
      : connection.connected
        ? 'live'
        : 'no connection'
  )

  // Transport reachability (#34): a human hint of the schemes this Surface can
  // reach, and a history list filtered to reachable entries so unreachable
  // transports are absent rather than shown-but-broken.
  const supportedHint = $derived.by(() => {
    const t = connection.supportedTransports
    const schemes: string[] = []
    // http(s):// is the only browser transport; red(s):// works everywhere as an
    // http(s)://host:5055 alias (normalizeUrl) so it's not advertised separately.
    if (t.includes('http') || t.includes('https')) schemes.push('http(s)://')
    if (t.includes('unix')) schemes.push('file://')
    return schemes.join(' · ')
  })

  const reachableHistory = $derived(
    connection.history.filter((h) => !h.url || connection.canReach(h.url)),
  )

  // Native file open is only reachable on a Surface that can speak the unix /
  // embedded-file transport (the Tauri desktop shell) (#123).
  const canOpenFile = $derived(connection.supportedTransports.includes('unix'))
</script>

<Popover triggerLabel={`${triggerLabel} ${triggerStatus}`} contentLabel="Connect to reddb" bind:open size="sm"
  class="w-[380px] max-w-[calc(100vw-2rem)] p-4">
  {#snippet trigger()}
    <span class={['size-1.5 rounded-full shrink-0', dotClass].join(' ')}></span>
    {#if !connection.connected}<Icon icon={Plug} size="sm" />{/if}
    <span class="font-mono">{triggerLabel}</span>
    <span class="text-caption text-ink-muted">{triggerStatus}</span>
    <Icon icon={ChevronDown} size="sm" />
  {/snippet}
  <form onsubmit={submit} class="grid gap-3">
    <Field id="connect-url" label="Connection string" help={`URL or Base64-encoded URL · reachable here: ${supportedHint}`}>
      {#snippet children(control)}
        <Input {...control} bind:ref={inputEl} bind:value={url} disabled={status === 'probing'}
          oninput={() => { username = ''; password = '' }} spellcheck="false"
          placeholder="https://user:password@host or Base64" />
      {/snippet}
    </Field>
    <details bind:open={signInOpen}>
      <summary class="cursor-pointer text-sm text-fg-2">Sign in to the database</summary>
      <div class="mt-2 grid gap-2">
        <Field id="connect-username" label="Username">
          {#snippet children(control)}<Input {...control} autocomplete="username" bind:value={username} disabled={status === 'probing'} />{/snippet}
        </Field>
        <Field id="connect-password" label="Password">
          {#snippet children(control)}<Input {...control} type="password" autocomplete="current-password" bind:value={password} disabled={status === 'probing'} />{/snippet}
        </Field>
        <p class="text-caption text-ink-muted">Credentials go directly to this database. The session stays in this tab.</p>
      </div>
    </details>
    <Button type="submit" variant="primary"
      disabled={status === 'probing' || !url.trim() || Boolean(username.trim()) !== Boolean(password)}>
      {#if status === 'probing'}<Icon icon={Loader2} size="sm" class="animate-spin" /> Connecting…
      {:else}<Icon icon={Zap} size="sm" /> Connect{/if}
    </Button>
    <div aria-live="polite" class="min-h-5 flex items-center gap-1.5 text-caption">
      {#if status === 'ok'}<Icon icon={CheckCircle2} size="sm" class="text-ok" />
        <span class="text-ok">Connected{rtt !== null ? ` · ${rtt}ms` : ''}</span>
      {:else if status === 'error'}<Icon icon={AlertCircle} size="sm" class="text-danger" />
        <span class="break-words text-danger">{error}</span>{/if}
    </div>
  </form>
  {#if canOpenFile}
    <Button onclick={openFile} disabled={status === 'probing'} class="mt-2 w-full">
      <Icon icon={FolderOpen} size="sm" /> Open database file…
    </Button>
  {/if}
  {#if reachableHistory.length > 0}
    <section aria-label="Recent connections" class="mt-3 border-t border-line-1 pt-3">
      <h3 class="type-label mb-2 flex items-center gap-1.5"><Icon icon={Clock} size="sm" />Recent</h3>
      <div class="grid max-h-[180px] gap-1 overflow-y-auto">
        {#each reachableHistory as h (h.id)}
          <div class="flex items-center gap-1">
            <Button variant="ghost" size="sm" class="min-w-0 flex-1 justify-between" disabled={status === 'probing'}
              title={h.url ? undefined : 'Enter credentials to reconnect'}
              onclick={() => {
                if (h.url) attempt(h.url)
                else { url = h.label; setTimeout(() => inputEl?.focus(), 0) }
              }}>
              <code class="min-w-0 truncate">{h.url ?? h.label}</code>
              <span class="inline-flex shrink-0 items-center gap-2 text-caption text-ink-muted">
                {#if h.rtt_ms !== undefined}<span>{h.rtt_ms}ms</span>{/if}
                <span>{fmtRel(h.last_used)}</span>
              </span>
            </Button>
            <Button variant="ghost" size="sm" disabled={status === 'probing'}
              aria-label={`Remove ${h.label} from history`} onclick={(e: MouseEvent) => forget(e, h.id)}>
              <Icon icon={X} size="sm" />
            </Button>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</Popover>
