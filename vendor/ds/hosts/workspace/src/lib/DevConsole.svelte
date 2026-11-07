<script lang="ts">
  import { Button } from '@reddb-io/design-system/base'
  import DeveloperPanel from '@reddb-io/design-system/data/DeveloperPanel'
  import DeveloperRequestInspector from '@reddb-io/design-system/data/DeveloperRequestInspector'
  import { useWorkspace } from './workspace-context'
  import { devConsole as defaultStore, type ConsoleEntry } from './reddb/index'
  import { consoleRequests } from './developer-requests'

  const workspace = useWorkspace()
  let { contained = false, store = workspace.devConsole, open: initialOpen = false }: {
    contained?: boolean
    store?: typeof defaultStore
    open?: boolean
  } = $props()
  // svelte-ignore state_referenced_locally: the prop seeds the local toggle once
  let open = $state(initialOpen)
  let entries = $state<readonly ConsoleEntry[]>([])
  let spacer = $state<HTMLDivElement>()
  let height = $state(0)
  const requests = $derived(consoleRequests(entries))
  const label = $derived(`Developer panel · ${entries.length} requests${workspace.activity.inflight ? ` · ${workspace.activity.inflight} active` : ''}`)

  $effect(() => store.subscribe(snapshot => entries = snapshot))
  $effect(() => workspace.on('red:toggle-dev-console', () => open = !open))

  // The canonical panel docks absolutely within this shell. Reserve its actual
  // height as a grid row, including while resizing, so editors remain visible.
  $effect(() => {
    if (!contained || !spacer) return
    const panel = spacer.parentElement?.querySelector<HTMLElement>(':scope > [data-developer-panel]')
    if (!panel) return
    const update = () => height = panel.getBoundingClientRect().height
    const observer = new ResizeObserver(update)
    observer.observe(panel)
    update()
    return () => observer.disconnect()
  })
</script>

{#if contained}<div bind:this={spacer} data-developer-panel-space aria-hidden="true" style:height={`${height}px`}></div>{/if}
<DeveloperPanel {label} {contained} bind:open contexts={[{ value: 'requests', label: 'Requests' }]}>
  {#snippet contextContent()}
    <DeveloperRequestInspector {requests} onrequestschange={() => store.clear()}>
      <div class="flex flex-col gap-[var(--reddb-spatial-gap-md)] p-[var(--reddb-spatial-inset-sm)]">
        <p>Requests are kept in this workspace for this session. Sensitive fields are redacted and large bodies are truncated.</p>
        <p>{workspace.activity.inflight} active requests. Only completed calls appear in the request list.</p>
        {#if workspace.activity.inflight > 0}<Button variant="ghost" size="sm" onclick={() => workspace.activity.reset()}>Reset active requests</Button>{/if}
      </div>
    </DeveloperRequestInspector>
  {/snippet}
</DeveloperPanel>
