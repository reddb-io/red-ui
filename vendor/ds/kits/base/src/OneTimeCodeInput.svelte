<!-- A visibly named OTP group composed from canonical Fieldset and Input.
     Each segment remains native while paste and focus move across the code. -->
<script lang="ts">
  import type { HTMLFieldsetAttributes } from "svelte/elements";
  import Fieldset from "./Fieldset.svelte";
  import Input from "./Input.svelte";
  import { oneTimeCodeInput } from "./one-time-code-input.variants";

  interface Props extends Omit<HTMLFieldsetAttributes, "children" | "class"> {
    /** The required visible accessible name rendered as the native legend. */
    label: string;
    /** Native form name receiving the complete code. */
    name?: string;
    /** Number of one-character segments. */
    length?: number;
    /** Complete code, bindable by controlled consumers. */
    value?: string;
    /** Supporting text associated with every segment. */
    help?: string;
    /** Current validation error announced and associated with every segment. */
    error?: string;
    /** Applies native required validation to every segment. */
    required?: boolean;
    /** Input mode used by every segment. */
    inputmode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
    /** Native pattern used by every segment. */
    pattern?: string;
    /** Prefix for segment ids; otherwise Svelte supplies a stable generated one. */
    id?: string;
    /** Called when every segment contains a character. */
    oncomplete?: (value: string) => void;
    /** Called with the new value whenever it changes (ADR 0026's value dialect). */
    onvaluechange?: (value: string) => void;
    /** Extra classes merged onto the native fieldset. */
    class?: string;
    /** Extra classes merged onto every native segment. */
    segmentClass?: string;
  }

  const generatedId = $props.id();
  let {
    label,
    name,
    length = 6,
    value = $bindable(""),
    help,
    error,
    required = false,
    inputmode = "numeric",
    pattern = "[0-9]*",
    id,
    oncomplete,
    onvaluechange,
    class: className,
    segmentClass,
    ...rest
  }: Props = $props();

  const idPrefix = $derived(id ?? `${generatedId}-segment`);
  const helpId = $derived(`${idPrefix}-help`);
  const errorId = $derived(`${idPrefix}-error`);
  const describedBy = $derived([help ? helpId : undefined, error ? errorId : undefined].filter(Boolean).join(" ") || undefined);
  let segmentValues = $state<string[]>([]);
  let controls = $state<HTMLInputElement[]>([]);
  const styles = oneTimeCodeInput();

  $effect(() => {
    const joined = segmentValues.join("");
    if (value !== joined || segmentValues.length !== length) {
      segmentValues = Array.from({ length }, (_, index) => value[index] ?? "");
    }
  });

  function publish(): void {
    const before = value;
    value = segmentValues.join("");
    if (value !== before) onvaluechange?.(value);
    if (segmentValues.every(Boolean)) oncomplete?.(value);
  }

  function focus(index: number): void {
    controls[Math.max(0, Math.min(index, length - 1))]?.focus();
  }

  function handleInput(event: Event, index: number): void {
    const input = event.currentTarget as HTMLInputElement;
    const character = input.value.replace(/[^a-zA-Z0-9]/g, "").slice(-1);
    segmentValues[index] = character;
    publish();
    if (character) focus(index + 1);
  }

  function handlePaste(event: ClipboardEvent, index: number): void {
    const pasted = event.clipboardData?.getData("text") ?? "";
    const characters = pasted.replace(/[^a-zA-Z0-9]/g, "").slice(0, length - index).split("");
    if (characters.length === 0) return;

    event.preventDefault();
    for (const [offset, character] of characters.entries()) {
      segmentValues[index + offset] = character;
    }
    publish();
    focus(index + characters.length - 1);
  }

  function handleKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focus(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focus(index + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focus(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focus(length - 1);
    } else if (event.key === "Backspace" && !segmentValues[index]) {
      focus(index - 1);
    }
  }
</script>

<Fieldset
  {...rest}
  legend={label}
  class={styles.root({ class: className })}
  data-one-time-code-input
  aria-invalid={error ? "true" : undefined}
>
  <div class={styles.list()} data-otp-list>
    {#each segmentValues as character, index}
      <Input
        bind:ref={controls[index]}
        id={`${idPrefix}-${index}`}
        type="text"
        value={character}
        maxlength={1}
        {inputmode}
        {pattern}
        autocomplete={index === 0 ? "one-time-code" : "off"}
        {required}
        aria-label={`Digit ${index + 1} of ${length}`}
        aria-describedby={describedBy}
        aria-invalid={error ? "true" : undefined}
        data-otp-segment
        class={styles.segment({ class: segmentClass })}
        oninput={(event) => handleInput(event, index)}
        onpaste={(event) => handlePaste(event, index)}
        onkeydown={(event) => handleKeydown(event, index)}
      />
    {/each}
  </div>

  {#if name}<input type="hidden" {name} {value} />{/if}
  {#if help}<p class={styles.help()} id={helpId}>{help}</p>{/if}
  {#if error}<p class={styles.error()} id={errorId} role="alert">{error}</p>{/if}
</Fieldset>
