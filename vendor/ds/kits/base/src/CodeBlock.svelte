<!-- Preformatted source with a canonical Button copy affordance. -->
<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import Button from "./Button.svelte";
  import { codeBlock } from "./code-block.variants";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
    /** Exact source shown and copied; whitespace is never normalised. */
    code: string;
    /** Optional human-readable language label. */
    language?: string;
    /** Accessible and visible copy labels. */
    copyLabel?: string;
    /** Label shown and announced after the code is copied. Defaults to `Copied`. */
    copiedLabel?: string;
    /** Extra classes merged onto the code block root. */
    class?: string;
  }

  const {
    code,
    language,
    copyLabel = "Copy code",
    copiedLabel = "Copied",
    class: className,
    ...rest
  }: Props = $props();

  let copied = $state(false);
  const slots = $derived(codeBlock());

  async function copyCode(): Promise<void> {
    await navigator.clipboard.writeText(code);
    copied = true;
  }
</script>

<div {...rest} data-code-block class={slots.root({ class: className })}>
  <div class={slots.toolbar()}>
    {#if language}
      <span data-code-block-language class={slots.language()}>{language}</span>
    {:else}
      <span aria-hidden="true"></span>
    {/if}
    <Button
      data-code-block-copy
      variant="secondary"
      size="sm"
      aria-label={copied ? copiedLabel : copyLabel}
      onclick={copyCode}
    >
      <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
    </Button>
  </div>
  <pre class={slots.pre()}><code class={slots.code()}>{code}</code></pre>
</div>
