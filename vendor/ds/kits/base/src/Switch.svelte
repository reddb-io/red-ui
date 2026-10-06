<!-- A visibly named native binary input exposed with switch semantics. -->
<script lang="ts">
  import { untrack } from "svelte";
  import type { HTMLInputAttributes } from "svelte/elements";
  import Field from "./Field.svelte";
  import { switchControl } from "./switch.variants";

  interface Props extends Omit<HTMLInputAttributes, "checked" | "children" | "class" | "id" | "required" | "role" | "type"> {
    /** The required visible accessible name supplied through Field. */
    label: string;
    /** Supporting text announced with the switch. */
    help?: string;
    /** Current validation error announced with the switch. */
    error?: string;
    /** Makes the requirement visible and native. */
    required?: boolean;
    /** Explicit control id; otherwise Field supplies a stable generated one. */
    id?: string;
    /** Whether it is checked. Bindable: `bind:checked` follows every toggle. */
    checked?: boolean;
    /**
     * Called with the next checked state after every toggle (ADR 0026). The
     * native `onchange` still receives the Event.
     */
    oncheckedchange?: (checked: boolean) => void;
    /** The native input element for rare imperative access. */
    ref?: HTMLInputElement;
    /** Extra classes merged onto the native switch. */
    class?: string;
    /** Extra classes merged onto the containing Field. */
    fieldClass?: string;
  }

  let {
    label,
    help,
    error,
    required = false,
    id,
    ref = $bindable(),
    checked = $bindable(),
    class: className,
    fieldClass,
    onchange,
    oncheckedchange,
    ...rest
  }: Props = $props();

  // The element owns its checked state; `checked` follows every toggle and is
  // written back only when a caller supplies one (see Input).
  const initial = untrack(() => checked);
  let element: HTMLInputElement | undefined = $state();

  function handleChange(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
    checked = event.currentTarget.checked;
    onchange?.(event);
    oncheckedchange?.(event.currentTarget.checked);
  }

  $effect(() => {
    const next = checked;
    if (!element || next === undefined || next === null) return;
    if (next !== element.checked) element.checked = next;
  });

  $effect(() => {
    ref = element;
  });
</script>

<Field {label} {help} {error} {required} {id} layout="inline" class={fieldClass}>
  {#snippet children(control)}
    <input
      {...rest}
      {...control}
      checked={initial}
      bind:this={element}
      onchange={handleChange}
      type="checkbox"
      role="switch"
      class={switchControl({ class: className })}
    />
  {/snippet}
</Field>
