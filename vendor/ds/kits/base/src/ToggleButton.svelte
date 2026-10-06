<!-- A pressed-state control composed from the canonical native Button. -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";
  import Button from "./Button.svelte";
  import { toggleButton } from "./toggle-button.variants";

  interface Props extends Omit<HTMLButtonAttributes, "aria-pressed" | "children" | "class" | "onclick" | "type"> {
    /** Required visible and accessible control name. */
    label: string;
    /** Current pressed state, bindable for controlled consumers. */
    pressed?: boolean;
    /** Group composition can prohibit removing its sole selection. */
    allowUnpress?: boolean;
    /** Disables the button, so activation neither changes `pressed` nor reports a change. */
    disabled?: boolean;
    /** Extra classes merged onto the underlying Button, over the pressed-state styling. */
    class?: string;
    /** Optional visual content; `label` remains the stable accessible name. */
    children?: Snippet;
    /**
     * Called with the click event after the pressed state has been updated; skipped while
     * disabled.
     */
    onclick?: HTMLButtonAttributes["onclick"];
    /** Called with the next pressed state when activation changes it (ADR 0026). */
    onpressedchange?: (pressed: boolean) => void;
  }

  let {
    label,
    pressed = $bindable(false),
    allowUnpress = true,
    disabled = false,
    class: className,
    children,
    onclick,
    onpressedchange,
    ...rest
  }: Props = $props();

  function activate(event: MouseEvent): void {
    if (disabled) return;
    if (!pressed || allowUnpress) {
      pressed = !pressed;
      onpressedchange?.(pressed);
    }
    onclick?.(event as Parameters<NonNullable<HTMLButtonAttributes["onclick"]>>[0]);
  }
</script>

<Button
  {...rest}
  {disabled}
  variant="secondary"
  class={toggleButton({ pressed, class: className })}
  aria-pressed={pressed}
  aria-label={children ? label : undefined}
  data-state={pressed ? "on" : "off"}
  data-toggle-button
  onclick={activate}
>
  {#if children}{@render children()}{:else}{label}{/if}
</Button>
