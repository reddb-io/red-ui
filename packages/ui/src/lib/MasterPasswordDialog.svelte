<script lang="ts">
  import { Lock, Loader2, AlertCircle, KeyRound, Trash2 } from 'lucide-svelte'
  import { secureStore } from './secureStore.svelte'
  import { connection } from './connections.svelte'
  import { detectSurface, surfaceGatesBoot } from './surface'

  const surface = detectSurface()
  // Only the web vault dialog is a *password* prompt. It appears when this
  // Surface gates boot on a secret — i.e. web with existing envelopes. A
  // credential-less web boot (nothing saved yet) skips it entirely, and the
  // standalone Surface unlocks via the OS keychain, never this dialog.
  const gated = $derived(
    secureStore.backend === 'web' &&
      secureStore.locked &&
      surfaceGatesBoot(surface, !secureStore.needsSetup),
  )

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

{#if gated}
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-bg-0/70 backdrop-blur-sm motion-reduce:backdrop-blur-none"
    role="dialog"
    aria-modal="true"
    aria-labelledby="mp-title"
  >
    <form
      onsubmit={submit}
      class="w-[380px] bg-bg-1 border border-line-2 rounded-lg shadow-2xl p-5"
    >
      <div class="flex items-center gap-2 mb-1.5 text-fg-0">
        {#if needsSetup}
          <KeyRound class="size-4 text-accent" />
        {:else}
          <Lock class="size-4 text-accent" />
        {/if}
        <h2 id="mp-title" class="type-h2 m-0">{title}</h2>
      </div>
      <p class="text-fg-3 text-[12px] leading-relaxed m-0 mb-3">{hint}</p>

      <label for="mp-pwd" class="type-label block mb-1">Master password</label>
      <input
        id="mp-pwd"
        bind:this={inputEl}
        bind:value={password}
        type="password"
        autocomplete={needsSetup ? 'new-password' : 'current-password'}
        spellcheck="false"
        class="w-full h-9 px-3 mb-2 bg-bg-0 border border-line-2 rounded-md font-mono text-[13px] text-fg-0 outline-none transition-colors focus:border-accent"
      />

      {#if needsSetup}
        <label for="mp-confirm" class="type-label block mb-1">Confirm</label>
        <input
          id="mp-confirm"
          bind:value={confirm}
          type="password"
          autocomplete="new-password"
          spellcheck="false"
          class="w-full h-9 px-3 mb-2 bg-bg-0 border border-line-2 rounded-md font-mono text-[13px] text-fg-0 outline-none transition-colors focus:border-accent"
        />
      {/if}

      <button
        type="submit"
        disabled={busy || !password || (needsSetup && !confirm)}
        class="w-full h-9 mt-1 bg-accent text-white font-medium rounded-md cursor-pointer transition-colors hover:bg-[#ff3868] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[13px]"
      >
        {#if busy}
          <Loader2 class="size-3.5 animate-spin" />
          {needsSetup ? 'Setting up…' : 'Unlocking…'}
        {:else}
          {needsSetup ? 'Set password' : 'Unlock'}
        {/if}
      </button>

      <div class="h-5 mt-2 flex items-center gap-1.5 text-[11px] font-mono">
        {#if error}
          <AlertCircle class="size-3 text-danger" />
          <span class="text-danger truncate">{error}</span>
        {/if}
      </div>

      <!-- Start fresh: when the user can't unlock (forgot the password,
           wedged state, etc.) the only path forward is to wipe the
           encrypted store entirely. There's no recovery — the password
           is the key. Two-step confirmation prevents accidental clicks. -->
      <div class="mt-3 pt-3 border-t border-line-1 text-[11px] font-mono">
        {#if !confirmingWipe}
          <button
            type="button"
            onclick={startWipe}
            class="inline-flex items-center gap-1.5 text-fg-3 hover:text-danger transition-colors cursor-pointer bg-transparent border-0 p-0"
          >
            <Trash2 class="size-3" />
            <span>Start fresh — wipe this browser</span>
          </button>
        {:else}
          <div class="flex items-center justify-between gap-2">
            <span class="text-danger">Erase the encrypted store and all saved connections?</span>
          </div>
          <div class="flex items-center gap-2 mt-1.5">
            <button
              type="button"
              onclick={doWipe}
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20 cursor-pointer"
            >
              <Trash2 class="size-3" />
              Yes, wipe
            </button>
            <button
              type="button"
              onclick={cancelWipe}
              class="px-2 py-1 rounded border border-line-2 text-fg-2 hover:text-fg-0 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        {/if}
      </div>
    </form>
  </div>
{/if}
