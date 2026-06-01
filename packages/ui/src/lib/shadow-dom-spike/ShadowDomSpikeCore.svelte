<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { BitsConfig, Dialog, Popover } from 'bits-ui'
  import Workspace from '../Workspace.svelte'

  type FindingState = 'pending' | 'working' | 'blocked'

  type Finding = {
    state: FindingState
    detail: string
  }

  let { portalTarget }: { portalTarget: HTMLElement } = $props()

  let popoverOpen = $state(false)
  let dialogOpen = $state(false)
  let popoverTrigger: HTMLButtonElement | null = $state(null)
  let popoverContent: HTMLDivElement | null = $state(null)
  let dialogContent: HTMLDivElement | null = $state(null)
  let dialogInput: HTMLInputElement | null = $state(null)
  let findings = $state<Record<'portals' | 'focus' | 'measurement', Finding>>({
    portals: { state: 'pending', detail: 'waiting for automated probe' },
    focus: { state: 'pending', detail: 'waiting for automated probe' },
    measurement: { state: 'pending', detail: 'waiting for automated probe' },
  })

  const statusClass: Record<FindingState, string> = {
    pending: 'border-line-2 bg-bg-2 text-fg-2',
    working: 'border-ok/40 bg-ok/10 text-ok',
    blocked: 'border-danger/40 bg-danger/10 text-danger',
  }

  function ownerShadowRoot(node: Node | null) {
    const root = node?.getRootNode()
    return root instanceof ShadowRoot ? root : null
  }

  function setFinding(key: keyof typeof findings, state: FindingState, detail: string) {
    findings[key] = { state, detail }
  }

  function nextFrame() {
    return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }

  async function settleLayout() {
    await tick()
    await nextFrame()
    await nextFrame()
  }

  async function runProbe() {
    popoverOpen = true
    await settleLayout()

    const popoverRoot = ownerShadowRoot(popoverContent)
    const popoverPortalledInsideShadow = Boolean(
      popoverContent && popoverRoot && portalTarget.contains(popoverContent),
    )
    const popoverLeakedToBody = Boolean(popoverContent && document.body.contains(popoverContent))

    if (popoverPortalledInsideShadow && !popoverLeakedToBody) {
      setFinding('portals', 'working', 'bits-ui Portal renders into an HTMLElement inside the shadow root')
    } else {
      setFinding('portals', 'blocked', 'portal content escaped the configured shadow-root portal target')
    }

    const triggerRect = popoverTrigger?.getBoundingClientRect()
    const contentRect = popoverContent?.getBoundingClientRect()
    const measured = Boolean(
      triggerRect &&
        contentRect &&
        triggerRect.width > 0 &&
        triggerRect.height > 0 &&
        contentRect.width > 0 &&
        contentRect.height > 0 &&
        Number.isFinite(contentRect.left) &&
        Number.isFinite(contentRect.top),
    )

    if (measured) {
      setFinding(
        'measurement',
        'working',
        `trigger ${Math.round(triggerRect!.width)}x${Math.round(triggerRect!.height)}, popover ${Math.round(
          contentRect!.width,
        )}x${Math.round(contentRect!.height)}`,
      )
    } else {
      setFinding('measurement', 'blocked', 'floating content or trigger produced a zero/invalid layout rect')
    }

    dialogOpen = true
    await settleLayout()
    dialogInput?.focus()
    await settleLayout()

    const shadowRoot = ownerShadowRoot(dialogContent)
    const focused = shadowRoot?.activeElement
    const focusInsideDialog = Boolean(
      focused && dialogContent && (focused === dialogContent || dialogContent.contains(focused)),
    )

    if (focusInsideDialog) {
      setFinding('focus', 'working', 'dialog focus is contained in the shadow root via shadowRoot.activeElement')
    } else {
      setFinding('focus', 'blocked', 'dialog focus did not move to or remain inside the shadow-root dialog')
    }
  }

  onMount(() => {
    void runProbe()
  })
</script>

<BitsConfig defaultPortalTo={portalTarget}>
  <section class="min-h-[720px] bg-bg-0 text-fg-0 font-sans">
    <div class="grid min-h-[720px] grid-cols-[minmax(0,1fr)_360px]">
      <div class="relative overflow-hidden border-r border-line-2">
        <Workspace />
      </div>

      <aside class="flex flex-col gap-4 bg-bg-1 p-4">
        <div>
          <p class="type-label">Shadow DOM spike</p>
          <h1 class="mt-2 text-lg font-semibold text-fg-0">Svelte 5 + Tailwind v4 + bits-ui</h1>
        </div>

        <div class="space-y-2">
          {#each Object.entries(findings) as [key, finding]}
            <div class={`rounded-md border p-3 ${statusClass[finding.state]}`} data-spike-finding={key}>
              <div class="flex items-center justify-between gap-3">
                <span class="font-mono text-[11px] uppercase tracking-[0.08em]">{key}</span>
                <span class="font-mono text-[10px] uppercase tracking-[0.08em]">{finding.state}</span>
              </div>
              <p class="mt-2 text-xs leading-5 text-fg-1">{finding.detail}</p>
            </div>
          {/each}
        </div>

        <Popover.Root bind:open={popoverOpen}>
          <Popover.Trigger
            bind:ref={popoverTrigger}
            data-spike-popover-trigger
            class="h-9 rounded-md border border-line-2 bg-bg-2 px-3 text-left text-sm text-fg-0 hover:bg-bg-3"
          >
            Open popover
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              bind:ref={popoverContent}
              data-spike-popover-content
              side="bottom"
              align="start"
              sideOffset={8}
              class="z-50 w-[260px] rounded-md border border-line-2 bg-bg-1 p-3 text-sm text-fg-1 shadow-lg"
            >
              <p class="font-medium text-fg-0">Portalled inside shadow root</p>
              <p class="mt-1 text-xs text-fg-2">Floating UI measured this against the trigger.</p>
              <Popover.Arrow class="fill-bg-1" />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <Dialog.Root bind:open={dialogOpen}>
          <Dialog.Trigger class="h-9 rounded-md border border-line-2 bg-bg-2 px-3 text-left text-sm text-fg-0 hover:bg-bg-3">
            Open dialog
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay class="fixed inset-0 z-40 bg-black/45" />
            <Dialog.Content
              bind:ref={dialogContent}
              data-spike-dialog-content
              trapFocus
              class="fixed left-1/2 top-1/2 z-50 w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line-2 bg-bg-1 p-4 shadow-lg"
            >
              <Dialog.Title class="text-sm font-semibold text-fg-0">Focus probe</Dialog.Title>
              <Dialog.Description class="mt-1 text-xs text-fg-2">
                Active focus is checked through shadowRoot.activeElement.
              </Dialog.Description>
              <input
                bind:this={dialogInput}
                data-spike-dialog-input
                class="mt-3 h-9 w-full rounded-md border border-line-2 bg-bg-2 px-3 text-sm text-fg-0 outline-none focus:border-accent"
                value="shadow-root focus target"
              />
              <div class="mt-4 flex justify-end">
                <Dialog.Close class="h-8 rounded-md border border-line-2 bg-bg-2 px-3 text-xs text-fg-0 hover:bg-bg-3">
                  Close
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </aside>
    </div>
  </section>
</BitsConfig>
