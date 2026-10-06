<!-- A segmented calendar value composed from the canonical Field and Input. -->
<script lang="ts">
  import Field from "./Field.svelte";
  import Input from "./Input.svelte";
  import { dateField } from "./date-field.variants";

  interface Props {
    /** Visible label text owned by the caller. */
    label: string;
    /** Native form name receiving a complete, possible date. */
    name?: string;
    /** Complete ISO calendar date. */
    value?: string;
    /** Called with the new value whenever it changes (ADR 0026's value dialect). */
    onvaluechange?: (value: string) => void;
    /** Supporting text associated with every segment. */
    help?: string;
    /** Current validation error associated with every segment. */
    error?: string;
    /** Applies native required validation to every segment. */
    required?: boolean;
    /** Disables every native segment. */
    disabled?: boolean;
    /** Explicit id for the year segment. */
    id?: string;
    /** Extra classes merged onto the canonical Field root. */
    class?: string;
    /** Extra classes merged onto every native segment. */
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

  function possibleDate(candidate: string): RegExpMatchArray | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(candidate);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year === 0 || month < 1 || month > 12) return null;

    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day >= 1 && day <= days[month - 1]! ? match : null;
  }

  const initial = possibleDate(value);
  let year = $state(initial?.[1] ?? "");
  let month = $state(initial?.[2] ?? "");
  let day = $state(initial?.[3] ?? "");
  let yearControl = $state<HTMLInputElement>();
  let monthControl = $state<HTMLInputElement>();
  let dayControl = $state<HTMLInputElement>();
  let publishedValue = value;
  const complete = $derived(possibleDate(`${year}-${month}-${day}`) !== null);
  const styles = dateField();

  $effect(() => {
    if (value === publishedValue) return;

    const next = possibleDate(value);
    year = next?.[1] ?? "";
    month = next?.[2] ?? "";
    day = next?.[3] ?? "";
    publishedValue = value;
  });

  type Segment = "year" | "month" | "day";

  function publish(): void {
    const before = value;
    publishedValue = complete ? `${year}-${month}-${day}` : "";
    value = publishedValue;
    if (value !== before) onvaluechange?.(value);
  }

  function handleInput(event: Event, segment: Segment): void {
    const input = event.currentTarget as HTMLInputElement;
    const length = segment === "year" ? 4 : 2;
    const digits = input.value.replace(/\D/g, "").slice(0, length);
    const numeric = Number(digits);
    const invalidBound = digits.length === length && (
      (segment === "year" && numeric === 0)
      || (segment === "month" && (numeric < 1 || numeric > 12))
      || (segment === "day" && (numeric < 1 || numeric > 31))
    );
    const next = invalidBound ? "" : digits;

    input.value = next;
    if (segment === "year") year = next;
    else if (segment === "month") month = next;
    else day = next;
    publish();

    if (next.length === length) {
      (segment === "year" ? monthControl : segment === "month" ? dayControl : undefined)?.focus();
    }
  }

  function handleKeydown(event: KeyboardEvent, segment: Segment): void {
    const previous = segment === "day" ? monthControl : segment === "month" ? yearControl : undefined;
    const next = segment === "year" ? monthControl : segment === "month" ? dayControl : undefined;

    if (event.key === "ArrowLeft" && previous) {
      event.preventDefault();
      previous.focus();
    } else if (event.key === "ArrowRight" && next) {
      event.preventDefault();
      next.focus();
    }
  }
</script>

<Field {label} {help} {error} {required} {id} class={styles.root({ class: className })}>
  {#snippet children(control)}
    <div class={styles.segments()} data-date-field data-date-segments>
      <Input
        {...control}
        bind:ref={yearControl}
        type="text"
        inputmode="numeric"
        maxlength={4}
        value={year}
        {disabled}
        aria-label={`${label}, year`}
        data-date-segment="year"
        class={styles.year({ class: segmentClass })}
        oninput={(event) => handleInput(event, "year")}
        onkeydown={(event) => handleKeydown(event, "year")}
      />
      <span class={styles.separator()} aria-hidden="true">-</span>
      <Input
        bind:ref={monthControl}
        id={`${control.id}-month`}
        type="text"
        inputmode="numeric"
        maxlength={2}
        value={month}
        required={control.required}
        {disabled}
        aria-label={`${label}, month`}
        aria-describedby={control["aria-describedby"]}
        aria-invalid={control["aria-invalid"]}
        aria-errormessage={control["aria-errormessage"]}
        data-date-segment="month"
        class={styles.segment({ class: segmentClass })}
        oninput={(event) => handleInput(event, "month")}
        onkeydown={(event) => handleKeydown(event, "month")}
      />
      <span class={styles.separator()} aria-hidden="true">-</span>
      <Input
        bind:ref={dayControl}
        id={`${control.id}-day`}
        type="text"
        inputmode="numeric"
        maxlength={2}
        value={day}
        required={control.required}
        {disabled}
        aria-label={`${label}, day`}
        aria-describedby={control["aria-describedby"]}
        aria-invalid={control["aria-invalid"]}
        aria-errormessage={control["aria-errormessage"]}
        data-date-segment="day"
        class={styles.segment({ class: segmentClass })}
        oninput={(event) => handleInput(event, "day")}
        onkeydown={(event) => handleKeydown(event, "day")}
      />
      {#if name && complete && !disabled}<input type="hidden" {name} {value} />{/if}
    </div>
  {/snippet}
</Field>
