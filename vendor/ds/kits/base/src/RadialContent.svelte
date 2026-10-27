<script lang="ts">
  import Avatar from "./Avatar.svelte";
  import { radialContent } from "./radial-content.variants";
  import type { RadialContentContract } from "./core/contracts/radialcontent";
  interface Props extends RadialContentContract {
    /** Extra classes merged on the central composition. */
    class?: string;
  }
  let { title, value, description, avatar, class: className }: Props = $props();
  const styles = radialContent();
</script>
<div data-radial-content class={styles.root({ class: className })}>
  {#if avatar}<Avatar {...avatar} size="sm" />{/if}
  {#if title}<span title={title} class={styles.title()}>{title}</span>{/if}
  <strong title={String(value)} class={styles.value()}>{value}</strong>
  {#if description}<span title={description} class={styles.description()}>{description}</span>{/if}
</div>
