<script lang="ts">
  import { auth, type Action, type Resource } from './auth.svelte'

  interface Props {
    action: Action
    resource: Resource
    /** if denied, render this snippet instead of nothing. defaults to a soft chip explaining why */
    fallback?: import('svelte').Snippet
    children?: import('svelte').Snippet
    hideWhenDenied?: boolean
  }
  let { action, resource, fallback, children, hideWhenDenied = false }: Props = $props()

  const allowed = $derived(auth.can(action, resource))
  const why = $derived(auth.whyDenied(action, resource))
</script>

{#if allowed}
  {@render children?.()}
{:else if !hideWhenDenied}
  {#if fallback}
    {@render fallback()}
  {:else}
    <span class="denied" title={why ?? ''}>
      <span class="lock">⛔</span>
      <span class="reason">{action}:{resource}</span>
    </span>
  {/if}
{/if}

<style>
  .denied {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--fg-3);
    background: var(--bg-2);
    border: 1px dashed var(--line-2);
    border-radius: var(--r-sm);
    cursor: help;
  }
  .lock { font-size: 9px; }
</style>
