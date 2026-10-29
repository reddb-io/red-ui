<script lang="ts">
  import type { Snippet } from "svelte";
  import { Label } from "@reddb-io/design-system/base";
  import type { SettingsRowContract } from "../core/contracts/settingsrow";
  import { settingsRowAssociation, type FieldControlProps } from "../core/settings-row";
  import { settingsRow } from "./settings-row.variants";

  interface Props extends SettingsRowContract {
    /** Field content receiving only its native id, requirement and description/error association. */
    children?: Snippet<[FieldControlProps]>;
    /** Independently named actions or controls. Their visible labels are never overwritten by the row. */
    actions?: Snippet;
    /** Additional classes on the row's container. */
    class?: string;
  }
  let { label, hint, wide = false, description, error, required = false, id, children, actions, class: className }: Props = $props();
  const generated = $props.id();
  const association = $derived(settingsRowAssociation({ label, description, error, required, id: id ?? `${generated}-control` }));
  const styles = settingsRow();
</script>

<div data-settings-row class={styles.root({ class: className })} role="group" aria-labelledby={association.labelId}>
  <div class={styles.row()}>
    <div class={styles.copy({ class: wide && !children ? "@sm/settings-row:col-span-2" : undefined })}>
      {#if children}
        <Label id={association.labelId} for={association.control.id} class={styles.label()}><span class={styles.heading()}><span>{label}</span>{#if hint}<span class={styles.hint()}>{hint}</span>{/if}</span>{#if required}<span class={styles.required()} aria-hidden="true">*</span><span class="sr-only"> (required)</span>{/if}</Label>
      {:else}
        <p id={association.labelId} class={styles.label()}><span class={styles.heading()}><span>{label}</span>{#if hint}<span class={styles.hint()}>{hint}</span>{/if}</span></p>
      {/if}
      {#if description}<p id={association.helpId} class={styles.description()}>{description}</p>{/if}
      {#if error}<p id={association.errorId} class={styles.error()} role="alert">{error}</p>{/if}
    </div>
    {#if children || (actions && !wide)}
      <div class={styles.end()}>
        {#if children}<div data-settings-row-control class={styles.control()}>{@render children(association.control)}</div>{/if}
        {#if actions && !wide}<div data-settings-row-actions class={styles.actions()}>{@render actions()}</div>{/if}
      </div>
    {/if}
  </div>
  {#if actions && wide}<div data-settings-row-actions data-wide class={styles.wideActions()}>{@render actions()}</div>{/if}
</div>
