<script lang="ts">
  import type { Snippet } from "svelte";
  import { Heading, StateIllustration } from "@reddb-io/design-system/base";
  import { operationComplete, operationFailed } from "@reddb-io/design-system/base/illustrations";
  import { outcomeScreen } from "../outcome-screen.variants";
  import type { OutcomeScreenContract } from "../core/contracts/outcomescreen";
  interface Props extends OutcomeScreenContract {
    /** Optional product identity, supplied by the host. */
    identity?: Snippet;
    /** Caller-owned recovery, continuation or close controls. */
    actions?: Snippet;
    /** Extra classes on the outer region. */
    class?: string;
  }
  let { outcome, title, description, note, fullPage = true, headingLevel = 1, illustration, identity, actions, class: className }: Props = $props();
  const styles = $derived(outcomeScreen({fullPage}));
  const art = $derived(illustration ?? (outcome === "success" ? operationComplete : operationFailed));
</script>
<section data-outcome-screen data-outcome={outcome} aria-label={title} class={styles.root({class: className})}>
  <div class={styles.content()}>
    {#if identity}<div class={styles.identity()}>{@render identity()}</div>{/if}
    <StateIllustration {art} size="lg" />
    <Heading level={headingLevel} role="title">{title}</Heading>
    {#if description}<p class={styles.description()}>{description}</p>{/if}
    {#if actions}<div class={styles.actions()}>{@render actions()}</div>{/if}
    {#if note}<p class={styles.note()}>{note}</p>{/if}
  </div>
</section>
