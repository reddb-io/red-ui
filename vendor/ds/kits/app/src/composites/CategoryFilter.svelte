<!-- Multiple announced category filters, composed from canonical Base form contracts. -->
<script lang="ts">
  import { untrack } from "svelte";
  import { Checkbox, Fieldset } from "@reddb-io/design-system/base";
  import { warnDeprecated } from "@reddb-io/design-system/base";
  import type { HTMLFieldsetAttributes } from "svelte/elements";
  import { categoryFilter, type CategoryFilterOption } from "./category-filter.variants";

  interface Props extends Omit<HTMLFieldsetAttributes, "children" | "class" | "name"> {
    /** Visible name for the category choices. */
    legend: string;
    /** Caller-owned categories rendered as native checkbox choices. */
    options: readonly CategoryFilterOption[];
    /** Active category values: `bind:value` (ADR 0026). */
    value?: string[];
    /** @deprecated Renamed `value` (`bind:value`, ADR 0026); removed next release. */
    values?: string[];
    /** Optional native form name shared by every category. */
    name?: string;
    /** Disables the whole fieldset and every category checkbox. Defaults to `false`. */
    disabled?: boolean;
    /** Extra classes, merged over the root slot's own, onto the fieldset. */
    class?: string;
    /**
     * Extra classes, merged over the list slot's own, onto the element that wraps the checkboxes.
     */
    listClass?: string;
    /** Extra classes, merged over the option slot's own, onto each checkbox's field wrapper. */
    optionClass?: string;
    /** Called with the active category values after each change. */
    onvaluechange?: (value: string[]) => void;
    /** @deprecated Renamed `onvaluechange` (ADR 0026); removed next release. */
    onvalueschange?: (values: string[]) => void;
  }

  let {
    legend,
    options,
    value = $bindable(),
    values = $bindable(),
    name,
    disabled = false,
    class: className,
    listClass,
    optionClass,
    onvaluechange,
    onvalueschange,
    ...rest
  }: Props = $props();
  const styles = categoryFilter();

  // A caller that still binds the deprecated `values` (and not `value`) keeps
  // driving the filter through it for one release; `value` wins otherwise.
  const aliased = untrack(() => value === undefined && values !== undefined);
  const active = $derived((aliased ? values : value) ?? []);

  $effect(() => {
    if (aliased) warnDeprecated("CategoryFilter", "values", "value (bind:value)");
    if (onvalueschange) warnDeprecated("CategoryFilter", "onvalueschange", "onvaluechange");
  });

  function change(option: string, checked: boolean): void {
    const next = checked
      ? active.includes(option)
        ? active
        : [...active, option]
      : active.filter((candidate) => candidate !== option);
    if (aliased) values = next;
    else value = next;
    onvaluechange?.([...next]);
    onvalueschange?.([...next]);
  }
</script>

<Fieldset
  {...rest}
  {legend}
  {disabled}
  data-category-filter
  class={styles.root({ class: className })}
>
  <div data-category-filter-list class={styles.list({ class: listClass })}>
    {#each options as option (option.value)}
      <Checkbox
        label={option.label}
        {name}
        value={option.value}
        checked={active.includes(option.value)}
        disabled={disabled || option.disabled}
        fieldClass={styles.option({ class: optionClass })}
        oncheckedchange={(checked) => change(option.value, checked)}
      />
    {/each}
  </div>
</Fieldset>
