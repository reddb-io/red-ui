<!-- One persisted appearance-axis selector composed from canonical Field and Select. -->
<script lang="ts">
  import { onMount } from "svelte";
  import type { HTMLSelectAttributes } from "svelte/elements";
  import Field from "./Field.svelte";
  import Select from "./Select.svelte";
  import {
    applyAppearance,
    appearanceStorageKey,
    type AppearanceAxis,
    type AppearanceOption,
    type AppearanceStorage,
  } from "./appearance-switch.behavior";

  interface Props extends Omit<HTMLSelectAttributes, "children" | "class" | "onchange" | "value"> {
    /** Visible accessible control name. */
    label: string;
    /** The single independent axis this control changes. */
    axis: AppearanceAxis;
    /** Caller-owned values; the Base component invents no Theme, scheme, or stop. */
    options: readonly AppearanceOption[];
    /** Current axis value, bindable for controlled consumers. */
    value?: string;
    /** Root receiving the axis attribute. Defaults to the document root. */
    root?: HTMLElement;
    /** Persistence seam. Defaults to browser localStorage when available. */
    storage?: AppearanceStorage;
    /** Stable persistence key. Defaults to one key per independent axis. */
    persistKey?: string;
    /** Extra classes merged onto the canonical Select. */
    class?: string;
    /** Reports a user-selected value after it has been applied and persisted. */
    onvaluechange?: (value: string) => void;
  }

  let {
    label,
    axis,
    options,
    value = $bindable(options[0]?.value ?? ""),
    root,
    storage,
    persistKey,
    class: className,
    onvaluechange,
    ...rest
  }: Props = $props();

  const key = $derived(persistKey ?? appearanceStorageKey(axis));

  function target(): HTMLElement | undefined {
    return root ?? globalThis.document?.documentElement;
  }

  function persistence(): AppearanceStorage | undefined {
    if (storage) return storage;
    try {
      return globalThis.localStorage;
    } catch {
      return undefined;
    }
  }

  function commit(next: string, notify: boolean): void {
    value = next;
    const element = target();
    if (element) applyAppearance(element, axis, next);
    persistence()?.setItem(key, next);
    if (notify) onvaluechange?.(next);
  }

  function change(event: Event): void {
    commit((event.currentTarget as HTMLSelectElement).value, true);
  }

  onMount(() => {
    const persisted = persistence()?.getItem(key);
    const initial = options.some((option) => option.value === persisted) ? persisted! : value;
    if (options.some((option) => option.value === initial)) commit(initial, false);
  });
</script>

<Field {label}>
  {#snippet children(control)}
    <Select
      {...rest}
      {...control}
      data-appearance-switch
      data-appearance-axis={axis}
      class={className}
      bind:value
      onchange={change}
    >
      {#each options as option (option.value)}
        <option value={option.value} disabled={option.disabled}>{option.label}</option>
      {/each}
    </Select>
  {/snippet}
</Field>
