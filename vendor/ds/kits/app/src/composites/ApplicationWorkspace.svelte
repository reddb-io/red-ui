<script lang="ts">
  import type { Snippet } from "svelte";
  import type { ApplicationWorkspaceContract } from "../core/contracts/applicationworkspace";
  import { applicationWorkspace } from "../application-workspace.variants";
  import WorkspaceTabs from "./WorkspaceTabs.svelte";

  interface Props extends ApplicationWorkspaceContract {
    /** Caller-owned resource navigation. */
    navigation?: Snippet;
    /** Caller-owned commands or contextual controls above the documents. */
    toolbar?: Snippet;
    /** Content for each caller-owned document. */
    children?: Snippet<[{ id: string }]>;
    /** Alternative caller-owned content when no document list is supplied. */
    content?: Snippet;
    /** Additional classes on the navigation region. */
    navigationClass?: string;
    /** Additional classes on the content region. */
    contentClass?: string;
    /** Additional classes on the workspace root. */
    class?: string;
  }
  let { label, landmarks = true, navigationLabel = "Navigation", documentLabel = "Documents", items, selected, onselectedchange, oncloserequest, emptyLabel, panelClass, navigation, toolbar, children: renderDocument, content, navigationClass, contentClass, class: className }: Props = $props();
  const styles = applicationWorkspace();
</script>

<svelte:element this={landmarks ? "section" : "div"} role={landmarks ? undefined : "group"} aria-label={label} data-application-workspace class={styles.root({class: className})}>
  {#if navigation}
    <svelte:element this={landmarks ? "aside" : "div"} role={landmarks ? undefined : "group"} aria-label={navigationLabel} data-application-workspace-navigation class={styles.navigation({class: navigationClass})}>{@render navigation()}</svelte:element>
  {/if}
  <div data-application-workspace-content class={styles.content({class: contentClass})}>
    {#if toolbar}<div data-application-workspace-toolbar class={styles.toolbar()}>{@render toolbar()}</div>{/if}
    {#if items}
      <WorkspaceTabs label={documentLabel} {items} {selected} {onselectedchange} {oncloserequest} {emptyLabel} {panelClass} class="min-h-0 flex-1">
        {#snippet children(item)}{@render renderDocument?.(item)}{/snippet}
      </WorkspaceTabs>
    {:else}
      {@render content?.()}
    {/if}
  </div>
</svelte:element>
