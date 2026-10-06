<!--
  A modal Dialog on the platform's top-layer <dialog> (ADR 0017).

  `showModal()` already renders above every stacking context and makes the rest
  of the document inert, so the DS owns only what the platform leaves open: a
  controllable `open`, labelling, focus entry and return, light dismiss, and
  scroll containment. The trigger is optional — omit `triggerLabel` and drive
  `bind:open` from a menu item, a command or a route instead.
-->
<script module lang="ts">
  /** Nested modals share one lock; the page scrolls again when the last one closes. */
  let scrollLocks = 0;
  let unlockedOverflow = "";

  function lockScroll(): void {
    if (scrollLocks++ === 0) {
      unlockedOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
    }
  }

  function unlockScroll(): void {
    if (scrollLocks > 0 && --scrollLocks === 0) {
      document.documentElement.style.overflow = unlockedOverflow;
    }
  }
</script>

<script lang="ts">
  import { onDestroy, untrack, type Snippet } from "svelte";
  import type { HTMLDialogAttributes } from "svelte/elements";
  import { button } from "./button.variants";
  import { dialog as dialogAppearance, dialogClose, type DialogSize } from "./dialog.variants";

  interface Props extends Omit<HTMLDialogAttributes, "aria-describedby" | "aria-labelledby" | "class" | "open"> {
    /**
     * Accessible name for the DS-owned trigger. Omit it to render no trigger
     * and open the Dialog through `bind:open` instead.
     */
    triggerLabel?: string;
    /** Visible Dialog title and its accessible name. */
    title: string;
    /** Optional visible detail associated with the Dialog. */
    description?: string;
    /** Optional custom trigger content; `triggerLabel` remains its accessible name. */
    trigger?: Snippet;
    /** Dialog body. */
    children?: Snippet;
    /** Optional action region with the canonical close operation. */
    actions?: Snippet<[{ close: () => void }]>;
    /** Where focus enters when the Dialog opens. Defaults to its body. */
    initialFocus?: "body" | "actions";
    /** Whether to render the standard close control. Defaults to true. */
    showClose?: boolean;
    /** Whether the Dialog is open. Bindable; defaults to closed. */
    open?: boolean;
    /** Called whenever the Dialog opens or closes, by any path. */
    onopenchange?: (open: boolean) => void;
    /** Whether a click outside the surface dismisses it. Defaults to true. */
    dismissible?: boolean;
    /** Maximum inline size of the surface. Defaults to `md`. */
    size?: DialogSize;
    /** Extra classes merged onto the modal surface. */
    class?: string;
  }

  let {
    triggerLabel,
    title,
    description,
    trigger,
    children,
    actions,
    initialFocus = "body",
    showClose = true,
    open = $bindable(false),
    onopenchange,
    dismissible = true,
    size = "md",
    class: className,
    ...rest
  }: Props = $props();

  const uid = $props.id();
  const titleId = `${uid}-title`;
  const descriptionId = `${uid}-description`;

  let dialog: HTMLDialogElement | undefined = $state();
  let returnFocus: HTMLElement | null = null;
  let locked = false;

  const focusableSelector = [
    "button:not([disabled])",
    "a[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  /** Bring the platform element to `next` — synchronous, and a no-op when already there. */
  function apply(next: boolean): void {
    if (!dialog) return;
    if (next && !dialog.open) {
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      if (!locked) {
        lockScroll();
        locked = true;
      }
      const preferredRegion = initialFocus === "actions" ? "[data-dialog-actions]" : "[data-dialog-body]";
      (
        dialog.querySelector<HTMLElement>(`${preferredRegion} ${focusableSelector}`) ??
        dialog.querySelector<HTMLElement>(focusableSelector) ??
        dialog
      ).focus();
    } else if (!next && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      release();
      returnFocus?.focus();
      returnFocus = null;
    }
  }

  function release(): void {
    if (locked) {
      unlockScroll();
      locked = false;
    }
  }

  function setOpen(next: boolean): void {
    const changed = open !== next;
    open = next;
    apply(next);
    if (changed) onopenchange?.(next);
  }

  function close(): void {
    setOpen(false);
  }

  // A caller that drives `bind:open` from outside reaches the element here;
  // the DS's own trigger, close control and keys apply it synchronously above.
  $effect(() => {
    const wanted = open;
    untrack(() => apply(wanted));
  });

  onDestroy(release);

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab" || !dialog) return;

    const focusable = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      event.preventDefault();
      dialog.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /** Light dismiss: only a click that lands outside the surface's own box. */
  function handleClick(event: MouseEvent): void {
    if (!dismissible || !dialog || event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const outside =
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom;
    if (outside) close();
  }

  /** The platform can close the element itself (a `method="dialog"` form); keep `open` true to it. */
  function handleClose(): void {
    if (open) {
      open = false;
      release();
      onopenchange?.(false);
    }
  }
</script>

{#if triggerLabel}
  <button
    type="button"
    data-dialog-trigger
    aria-label={triggerLabel}
    aria-haspopup="dialog"
    aria-expanded={open}
    class={button({ variant: "secondary", size: "sm" })}
    onclick={() => setOpen(true)}
  >
    {#if trigger}{@render trigger()}{:else}{triggerLabel}{/if}
  </button>
{/if}

<dialog
  bind:this={dialog}
  {...(rest as Record<string, unknown>)}
  aria-modal="true"
  aria-labelledby={titleId}
  aria-describedby={description ? descriptionId : undefined}
  class={dialogAppearance({ size, class: className })}
  tabindex="-1"
  onkeydown={handleKeydown}
  onclick={handleClick}
  onclose={handleClose}
>
  <h2
    id={titleId}
    data-dialog-title
    class={[
      "text-heading",
      showClose && "pr-[var(--reddb-spatial-control-height-md)]",
    ]}
  >{title}</h2>
  {#if description}
    <p id={descriptionId} data-dialog-description class="mt-[var(--reddb-spatial-gap-sm)] text-ink-muted">
      {description}
    </p>
  {/if}
  {#if showClose}
    <button
      type="button"
      data-dialog-close
      aria-label={`Close ${title}`}
      class={button({ variant: "ghost", size: "sm", class: dialogClose() })}
      onclick={close}><span aria-hidden="true">×</span></button
    >
  {/if}
  {#if children}
    <div data-dialog-body class="mt-[var(--reddb-spatial-gap-lg)]">{@render children()}</div>
  {/if}
  {#if actions}
    <div data-dialog-actions>{@render actions({ close })}</div>
  {/if}
</dialog>
