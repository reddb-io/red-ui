<!--
  Button — a Primitive: it imports no other Kit component.

  Headless in the shadcn-svelte sense: the component owns the element and its
  behavior, `button.variants.ts` owns every class, and the Theme owns every
  value. Anything a native <button> accepts passes straight through, so
  `onclick`, `aria-*`, `form`, `disabled` and the rest need no re-declaration
  here — a Primitive that re-implements the platform is a Primitive that
  drifts from it.

  It renders an <a> when given an `href` and a <button> otherwise, which is why
  the props are a discriminated union: an anchor takes `target` and `rel` and no
  `form`, a button takes `form` and no `target`, and one widened interface would
  offer every caller both. The visual vocabulary does not fork with the element
  — a link that looks like a Button wears exactly the classes a Button wears,
  which is why this lives here instead of in every consumer that wanted one.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
  import { button, buttonSpinner, type ButtonSize, type ButtonVariant } from "./button.variants";

  interface Common {
    /** Emphasis. Defaults to `primary`. */
    variant?: ButtonVariant;
    /** Control height and padding. Defaults to `md`. */
    size?: ButtonSize;
    /**
     * Waiting on what the click started: a spinner joins the label and the
     * control goes out of action until it is over. The label stays, because it
     * is the only thing that says what is being waited for.
     */
    loading?: boolean;
    /** Full width, for a control that should fill its column. */
    block?: boolean;
    /**
     * Out of action. On a <button> this is the platform's own `disabled`; an
     * <a> has no such state, so its destination is withheld instead.
     */
    disabled?: boolean;
    /** Extra classes, merged over the variant's own. */
    class?: string;
    children?: Snippet;
  }

  /** Without an `href`: everything a native <button> accepts. */
  interface ButtonMode extends Common, Omit<HTMLButtonAttributes, "class"> {
    href?: never;
  }

  /** With an `href`: everything a native <a> accepts. */
  interface AnchorMode extends Common, Omit<HTMLAnchorAttributes, "class"> {
    /** Where it goes. Its presence is what makes this an <a>. */
    href: string;
  }

  type Props = ButtonMode | AnchorMode;

  const {
    variant = "primary",
    size = "md",
    loading = false,
    block = false,
    disabled = false,
    href,
    // `type` is defaulted per element below rather than here: on a <button> it
    // defaults to "button" and not to the platform's "submit", because a
    // Primitive dropped into a form should not submit it by accident (a form's
    // submit button says so) — while on an <a> it is a MIME hint, the caller's
    // to give and not this component's to invent.
    type,
    class: className,
    children,
    ...rest
  }: Props = $props();

  const tag = $derived(href !== undefined ? "a" : "button");
  // Loading is a disabled state that happens to be temporary, so it is the same
  // state as far as the element is concerned: one thing to check, one place
  // that decides what "out of action" means on each element.
  const inert = $derived(disabled || loading);
  const spinner = $derived(buttonSpinner({ size }));

  // A disabled link is not a thing the platform has, so its href is withheld —
  // which is exactly what makes it unfocusable — and `aria-disabled` says out
  // loud what a <button> says with an attribute the styling can also reach.
  const native = $derived(
    tag === "a"
      ? { href: inert ? undefined : href, type, tabindex: inert ? -1 : undefined }
      : { type: type ?? "button", disabled: inert },
  );
</script>

<svelte:element
  this={tag}
  {...rest}
  {...native}
  class={button({ variant, size, block, class: className })}
  aria-busy={loading ? "true" : undefined}
  aria-disabled={tag === "a" && inert ? "true" : undefined}
>
  {#if loading}
    <!-- Hidden from assistive technology: `aria-busy` on the control itself is
         what announces the wait, and the spinner would only say it again. The
         arc is drawn as a quarter of the circle it spins inside — the track
         shows where it is going, which is what makes the rotation readable. -->
    <svg class={spinner.root()} viewBox="0 0 24 24" aria-hidden="true">
      <circle class={spinner.track()} cx="12" cy="12" r="9" stroke-width="3" />
      <path class={spinner.head()} d="M21 12a9 9 0 0 0-9-9" stroke-width="3" stroke-linecap="round" />
    </svg>
  {/if}
  {@render children?.()}
</svelte:element>
