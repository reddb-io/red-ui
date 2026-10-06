<!-- A destructive-confirmation overlay composed from the canonical Dialog. -->
<script lang="ts">
  import type { ComponentProps } from "svelte";
  import { alertDialog, alertDialogActions } from "./alert-dialog.variants";
  import Button from "./Button.svelte";
  import Dialog from "./Dialog.svelte";

  type Props = Omit<
    ComponentProps<typeof Dialog>,
    "actions" | "class" | "initialFocus" | "showClose"
  > & {
    /** Visible label for the destructive confirmation action. */
    confirmLabel: string;
    /** Visible label for the safe action. Defaults to `Cancel`. */
    cancelLabel?: string;
    /**
     * Called once when the destructive action is confirmed. Return a promise to
     * keep the dialog open, with the confirmation busy, until it settles: it
     * closes on fulfilment and stays open on rejection so the caller can
     * report the failure.
     */
    onconfirm?: (event: MouseEvent) => void | Promise<unknown>;
    /** Extra classes merged onto the alert surface. */
    class?: string;
  };

  let {
    confirmLabel,
    cancelLabel = "Cancel",
    onconfirm,
    open = $bindable(false),
    class: className,
    ...dialogProps
  }: Props = $props();

  let pending = $state(false);

  async function confirm(event: MouseEvent, close: () => void): Promise<void> {
    const outcome = onconfirm?.(event);
    if (!(outcome instanceof Promise)) {
      close();
      return;
    }
    pending = true;
    try {
      await outcome;
      close();
    } catch {
      // Stay open: the caller owns reporting why the action failed.
    } finally {
      pending = false;
    }
  }
</script>

{#snippet actions({ close }: { close: () => void })}
  <div data-alert-dialog-actions class={alertDialogActions()}>
    <Button data-alert-dialog-cancel variant="secondary" size="sm" disabled={pending} onclick={close}>
      {cancelLabel}
    </Button>
    <Button
      data-alert-dialog-confirm
      variant="primary"
      tone="danger"
      size="sm"
      loading={pending}
      onclick={(event: MouseEvent) => confirm(event, close)}
    >
      {confirmLabel}
    </Button>
  </div>
{/snippet}

<Dialog
  {...dialogProps}
  bind:open
  role="alertdialog"
  data-alert-dialog=""
  class={alertDialog({ class: className })}
  {actions}
  initialFocus="actions"
  showClose={false}
  dismissible={false}
/>
