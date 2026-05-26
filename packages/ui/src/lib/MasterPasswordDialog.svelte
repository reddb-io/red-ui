<script lang="ts">
  import { Lock, Loader2, AlertCircle, KeyRound } from 'lucide-svelte'
  import { secureStore } from './secureStore.svelte'

  let password = $state('')
  let confirm = $state('')
  let busy = $state(false)
  let inputEl: HTMLInputElement | undefined = $state()

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
    }
  }
</script>

{#if secureStore.backend === 'web' && secureStore.locked}
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
    </form>
  </div>
{/if}
