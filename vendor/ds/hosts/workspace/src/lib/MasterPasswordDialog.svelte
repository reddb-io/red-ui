<script lang="ts">
  import { useWorkspace } from './workspace-context'
  import { Alert, Button, Dialog, Field, Icon, Input } from '@reddb-io/design-system/base'
  import Loader2 from '@lucide/svelte/icons/loader-2'
  import Trash2 from '@lucide/svelte/icons/trash-2'

  const workspace = useWorkspace()
  const { connection, secureStore } = workspace

  let password = $state('')
  let confirm = $state('')
  let busy = $state(false)
  let confirmingWipe = $state(false)
  let inputEl: HTMLInputElement | undefined = $state()

  function startWipe() {
    secureStore.error = null
    confirmingWipe = true
  }

  function cancelWipe() {
    confirmingWipe = false
  }

  function doWipe() {
    secureStore.wipe()
    password = ''
    confirm = ''
    confirmingWipe = false
    setTimeout(() => inputEl?.focus(), 0)
  }

  const needsSetup = $derived(secureStore.needsSetup)
  const error = $derived(secureStore.error)
  const title = $derived(needsSetup ? 'Set a master password' : 'Unlock credentials')
  const hint = $derived(
    needsSetup
      ? 'Picks a key that encrypts your connection history at rest. The password lives in this browser session only — there is no recovery.'
      : 'Enter the master password used to encrypt your saved connections.'
  )

  $effect(() => {
    if (secureStore.locked) setTimeout(() => inputEl?.focus(), 0)
  })

  async function submit(e: Event) {
    e.preventDefault()
    if (busy) return
    if (!password) return
    if (needsSetup && password !== confirm) {
      secureStore.error = "Passwords don't match"
      return
    }
    busy = true
    const ok = await secureStore.unlock(password)
    busy = false
    if (ok) {
      password = ''
      confirm = ''
      // Belt + suspenders: the layout's reactive $effect already kicks
      // connection.refresh() once locked flips, but firing it here too
      // means the connect dot updates within the same microtask the
      // dialog disappears — no "I unlocked but nothing happened" lag.
      connection.refresh()
    }
  }
</script>

<Dialog {title} description={hint} open={secureStore.backend === 'web' && secureStore.locked}
  dismissible={false} showClose={false} size="sm"
  onkeydown={(event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation() } }}>
  <form onsubmit={submit} class="grid gap-3">
    <Field label="Master password">
      {#snippet children(control)}
        <Input {...control} bind:ref={inputEl} bind:value={password} type="password"
          autocomplete={needsSetup ? 'new-password' : 'current-password'} spellcheck="false" />
      {/snippet}
    </Field>
    {#if needsSetup}
      <Field label="Confirm">
        {#snippet children(control)}
          <Input {...control} bind:value={confirm} type="password" autocomplete="new-password" spellcheck="false" />
        {/snippet}
      </Field>
    {/if}
    <Button type="submit" variant="primary" disabled={busy || !password || (needsSetup && !confirm)}>
      {#if busy}<Icon icon={Loader2} size="sm" class="animate-spin" />{needsSetup ? 'Setting up…' : 'Unlocking…'}
      {:else}{needsSetup ? 'Set password' : 'Unlock'}{/if}
    </Button>
    {#if error}<Alert tone="danger" title={error} />{/if}
    <div class="border-t border-muted pt-3">
      {#if !confirmingWipe}
        <Button variant="ghost" tone="danger" size="sm" onclick={startWipe}>
          <Icon icon={Trash2} size="sm" /> Start fresh — wipe this browser
        </Button>
      {:else}
        <p class="text-sm text-feedback-danger-foreground">Erase the encrypted store and all saved connections?</p>
        <div class="mt-2 flex gap-2">
          <Button tone="danger" size="sm" onclick={doWipe}>Yes, wipe</Button>
          <Button size="sm" onclick={cancelWipe}>Cancel</Button>
        </div>
      {/if}
    </div>
  </form>
</Dialog>
