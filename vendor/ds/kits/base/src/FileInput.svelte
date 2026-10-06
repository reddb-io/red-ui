<!-- A native file control composed through canonical Field and Input, with
     selected filenames kept as visible polite feedback. -->
<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";
  import Field from "./Field.svelte";
  import Input from "./Input.svelte";
  import { fileInput } from "./file-input.variants";

  interface Props extends Omit<HTMLInputAttributes, "children" | "class" | "id" | "required" | "type" | "value"> {
    /** The required visible accessible name supplied through Field. */
    label: string;
    /** Supporting text announced with the file control. */
    help?: string;
    /** Current validation error announced with the file control. */
    error?: string;
    /** Makes the requirement visible and native. */
    required?: boolean;
    /** Explicit control id; otherwise Field supplies a stable generated one. */
    id?: string;
    /** The chosen files. Bindable: `bind:files` follows every selection. */
    files?: FileList | null;
    /** The native file input for imperative focus or file inspection. */
    ref?: HTMLInputElement;
    /** Extra classes merged onto the native file control. */
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
    files = $bindable(),
    class: className,
    fieldClass,
    multiple = false,
    onchange,
    ...rest
  }: Props = $props();

  let selectedNames = $state<string[]>([]);
  const styles = fileInput();

  function handleChange(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    files = input.files;
    selectedNames = [...(input.files ?? [])].map(({ name }) => name);
    onchange?.(
      event as Parameters<NonNullable<HTMLInputAttributes["onchange"]>>[0],
    );
  }
</script>

<div class={styles.root()} data-file-input>
  <Field {label} {help} {error} {required} {id} class={styles.field({ class: fieldClass })}>
    {#snippet children(control)}
      <Input
        {...rest}
        {...control}
        bind:ref
        type="file"
        {multiple}
        onchange={handleChange}
        class={styles.control({ class: className })}
      />
    {/snippet}
  </Field>
  <p class={styles.filename()} aria-live="polite" data-file-name>
    {#if selectedNames.length > 0}
      {selectedNames.join(", ")}
    {:else if multiple}
      No files selected
    {:else}
      No file selected
    {/if}
  </p>
</div>
