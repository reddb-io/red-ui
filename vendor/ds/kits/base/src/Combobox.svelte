<!-- A Field-bound typeahead whose input retains focus while Bits UI owns listbox semantics. -->
<script lang="ts">
  import { Combobox as Bits } from "bits-ui";
  import Field from "./Field.svelte";
  import { input } from "./input.variants";
  import { combobox, type ComboboxOption, type ComboboxSize } from "./combobox.variants";
  import { popover } from "./popover.variants";

  interface Props {
    /** Visible Field label for the typeahead input. */
    label: string;
    /** Caller-owned selectable values and their searchable labels. */
    options: readonly ComboboxOption[];
    /** Native form name applied to the selected value. */
    name?: string;
    /** Selected option value. */
    value?: string;
    /** Current text in the typeahead input. */
    inputValue?: string;
    /** Supporting text announced with the input. */
    help?: string;
    /** Current validation error announced with the input. */
    error?: string;
    /** Marks the input as required: the label shows it and the native control enforces it. */
    required?: boolean;
    /** Disables the input and the listbox, so nothing can be typed or chosen. */
    disabled?: boolean;
    /** Hint text shown in the input while it is empty. */
    placeholder?: string;
    /** Whether the anchored listbox is open. */
    open?: boolean;
    /** Extra classes merged onto the Field root that wraps the label, input and messages. */
    class?: string;
    /** The control height step, matching Button's `size` (default `md`). */
    controlSize?: ComboboxSize;
    /** Extra classes merged onto the typeahead input. */
    inputClass?: string;
    /** Extra classes merged onto the anchored listbox surface. */
    contentClass?: string;
    /** Extra classes merged onto every option row. */
    itemClass?: string;
    /** Called with the option's `value` when the user selects an option. */
    onvaluechange?: (value: string) => void;
    /**
     * Called with the input text as the user types, and with the option's label after a selection.
     */
    oninputvaluechange?: (value: string) => void;
    /** Called with the next open state when the listbox opens or closes. */
    onopenchange?: (open: boolean) => void;
  }

  let {
    label,
    options,
    name,
    value = $bindable(""),
    inputValue = $bindable(options.find((option) => option.value === value)?.label ?? ""),
    help,
    error,
    required = false,
    disabled = false,
    placeholder,
    open = $bindable(false),
    controlSize = "md",
    class: className,
    inputClass,
    contentClass,
    itemClass,
    onvaluechange,
    oninputvaluechange,
    onopenchange,
  }: Props = $props();

  const styles = $derived(combobox({ size: controlSize }));
  const normalizedInput = $derived(inputValue.trim().toLocaleLowerCase());
  const filteredOptions = $derived(
    normalizedInput === ""
      ? options
      : options.filter((option) => option.label.toLocaleLowerCase().includes(normalizedInput)),
  );

  function handleInput(event: Event): void {
    inputValue = (event.currentTarget as HTMLInputElement).value;
    oninputvaluechange?.(inputValue);
  }

  function handleValueChange(nextValue: string): void {
    value = nextValue;
    inputValue = options.find((option) => option.value === nextValue)?.label ?? "";
    onvaluechange?.(nextValue);
    oninputvaluechange?.(inputValue);
  }
</script>

<Field {label} {help} {error} {required} class={styles.root({ class: className })}>
  {#snippet children(control)}
    <Bits.Root
      type="single"
      items={[...options]}
      {name}
      {required}
      {disabled}
      {inputValue}
      bind:value
      bind:open
      onValueChange={handleValueChange}
      onOpenChange={onopenchange}
    >
      <div class={styles.control()} data-combobox>
        <Bits.Input
          {...control}
          {placeholder}
          oninput={handleInput}
          class={input({ size: controlSize, class: styles.input({ class: inputClass }) })}
        />
      </div>

      <Bits.Portal>
        <Bits.Content
          sideOffset={8}
          collisionPadding={8}
          data-combobox-surface
          data-avoid-collisions="true"
          class={popover({ class: styles.content({ class: contentClass }) })}
        >
          <Bits.Viewport>
            {#each filteredOptions as option (option.value)}
              <Bits.Item
                value={option.value}
                label={option.label}
                disabled={option.disabled}
                class={styles.item({ class: itemClass })}
              >
                <span>{option.label}</span>
                {#if option.value === value}
                  <span class={styles.indicator()} aria-hidden="true">✓</span>
                  <span class="sr-only">Selected</span>
                {/if}
              </Bits.Item>
            {:else}
              <span class={styles.empty()} data-combobox-empty>No matching options</span>
            {/each}
          </Bits.Viewport>
        </Bits.Content>
      </Bits.Portal>
    </Bits.Root>
  {/snippet}
</Field>
