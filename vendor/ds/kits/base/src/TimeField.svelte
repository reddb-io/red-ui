<!-- A segmented clock value composed from the canonical Field and Input. -->
<script lang="ts">
  import Field from "./Field.svelte";
  import Input from "./Input.svelte";
  import { timeField } from "./time-field.variants";

  interface Props {
    /** Visible label text owned by the caller. */
    label: string;
    /** Native form name receiving a complete, possible time. */
    name?: string;
    /** Complete 24-hour clock value. */
    value?: string;
    /** Called with the new value whenever it changes (ADR 0026's value dialect). */
    onvaluechange?: (value: string) => void;
    /** Supporting text associated with both segments. */
    help?: string;
    /** Current validation error associated with both segments. */
    error?: string;
    /** Applies native required validation to both segments. */
    required?: boolean;
    /** Disables both native segments. */
    disabled?: boolean;
    /** Explicit id for the hour segment. */
    id?: string;
    /** Extra classes merged onto the canonical Field root. */
    class?: string;
    /** Extra classes merged onto both native segments. */
    segmentClass?: string;
  }

  let {
    label,
    name,
    value = $bindable(""),
    onvaluechange,
    help,
    error,
    required = false,
    disabled = false,
    id,
    class: className,
    segmentClass,
  }: Props = $props();

  const initial = /^(?:([01]\d|2[0-3])):([0-5]\d)$/.exec(value);
  let hour = $state(initial?.[1] ?? "");
  let minute = $state(initial?.[2] ?? "");
  let hourControl = $state<HTMLInputElement>();
  let minuteControl = $state<HTMLInputElement>();
  const complete = $derived(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(`${hour}:${minute}`));
  const styles = timeField();

  function publish(): void {
    const before = value;
    value = complete ? `${hour}:${minute}` : "";
    if (value !== before) onvaluechange?.(value);
  }

  function handleInput(event: Event, segment: "hour" | "minute"): void {
    const input = event.currentTarget as HTMLInputElement;
    const maximum = segment === "hour" ? 23 : 59;
    const digits = input.value.replace(/\D/g, "").slice(0, 2);
    const next = digits.length === 2 && Number(digits) > maximum ? "" : digits;

    input.value = next;
    if (segment === "hour") hour = next;
    else minute = next;
    publish();
    if (next.length === 2) (segment === "hour" ? minuteControl : undefined)?.focus();
  }

  function handleKeydown(event: KeyboardEvent, segment: "hour" | "minute"): void {
    if (event.key === "ArrowLeft" && segment === "minute") {
      event.preventDefault();
      hourControl?.focus();
    } else if (event.key === "ArrowRight" && segment === "hour") {
      event.preventDefault();
      minuteControl?.focus();
    }
  }
</script>

<Field {label} {help} {error} {required} {id} class={styles.root({ class: className })}>
  {#snippet children(control)}
    <div class={styles.segments()} data-time-field data-time-segments>
      <Input
        {...control}
        bind:ref={hourControl}
        type="text"
        inputmode="numeric"
        maxlength={2}
        value={hour}
        {disabled}
        aria-label={`${label}, hour`}
        data-time-segment="hour"
        class={styles.segment({ class: segmentClass })}
        oninput={(event) => handleInput(event, "hour")}
        onkeydown={(event) => handleKeydown(event, "hour")}
      />
      <span class={styles.separator()} aria-hidden="true">:</span>
      <Input
        bind:ref={minuteControl}
        id={`${control.id}-minute`}
        type="text"
        inputmode="numeric"
        maxlength={2}
        value={minute}
        required={control.required}
        {disabled}
        aria-label={`${label}, minute`}
        aria-describedby={control["aria-describedby"]}
        aria-invalid={control["aria-invalid"]}
        aria-errormessage={control["aria-errormessage"]}
        data-time-segment="minute"
        class={styles.segment({ class: segmentClass })}
        oninput={(event) => handleInput(event, "minute")}
        onkeydown={(event) => handleKeydown(event, "minute")}
      />
      {#if name && complete && !disabled}<input type="hidden" {name} {value} />{/if}
    </div>
  {/snippet}
</Field>
