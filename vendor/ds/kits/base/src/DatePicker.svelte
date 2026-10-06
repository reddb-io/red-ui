<!-- A synchronized DateField and Calendar under the canonical Popover lifecycle. -->
<script lang="ts">
  import { parseDate, type DateValue } from "@internationalized/date";
  import type { Snippet } from "svelte";
  import Calendar from "./Calendar.svelte";
  import DateField from "./DateField.svelte";
  import Popover from "./Popover.svelte";
  import { datePicker } from "./date-picker.variants";

  type Side = "top" | "right" | "bottom" | "left";
  type Align = "start" | "center" | "end";

  interface Props {
    /** Visible DateField label. */
    label: string;
    /** Accessible name for the Calendar grid and Popover dialog. */
    calendarLabel: string;
    /** Accessible name for the canonical Button that opens the calendar. */
    triggerLabel?: string;
    /** Native form name receiving the synchronized complete date. */
    name?: string;
    /** Complete ISO calendar date shared by DateField and Calendar. */
    value?: string;
    /** Supporting text associated with every date segment. */
    help?: string;
    /** Current validation error associated with every date segment. */
    error?: string;
    /** Applies native required validation to every date segment and marks the label as required. */
    required?: boolean;
    /** Disables the date segments, the trigger Button and the Calendar. */
    disabled?: boolean;
    /** Explicit id for the year segment. A generated one is used when omitted. */
    id?: string;
    /** Whether the calendar Popover is open. */
    open?: boolean;
    /** Calendar month shown when no value is selected. */
    placeholder?: DateValue;
    /** Earliest date the Calendar lets the user select. */
    minValue?: DateValue;
    /** Latest date the Calendar lets the user select. */
    maxValue?: DateValue;
    /** Called with each date; return `true` to show it in the Calendar but make it unselectable. */
    isDateUnavailable?: (date: DateValue) => boolean;
    /**
     * Preferred side of the trigger for the Popover; collision handling may flip it. Defaults to
     * `bottom`.
     */
    side?: Side;
    /** Preferred alignment of the Popover along the selected side. Defaults to `start`. */
    align?: Align;
    /** Distance in pixels between the trigger and the Popover. Defaults to `8`. */
    sideOffset?: number;
    /** Safe distance in pixels kept between the Popover and the viewport edges. Defaults to `8`. */
    collisionPadding?: number;
    /** Optional caller-owned content inside the canonical trigger Button. */
    trigger?: Snippet;
    /** Extra classes merged onto the picker root, which lays the field and trigger out in a row. */
    class?: string;
    /** Extra classes merged onto the DateField root. */
    fieldClass?: string;
    /** Extra classes merged onto each native date segment. */
    segmentClass?: string;
    /** Extra classes merged onto the Button that opens the calendar. */
    triggerClass?: string;
    /** Extra classes merged onto the Popover surface that holds the Calendar. */
    contentClass?: string;
    /** Extra classes merged onto the Calendar root. */
    calendarClass?: string;
    /** Extra classes merged onto the Calendar's previous-month and next-month Buttons. */
    navigationClass?: string;
    /** Extra classes merged onto each day button in the Calendar. */
    dayClass?: string;
    /** Called with the complete ISO date after the user picks one in the Calendar. */
    onvaluechange?: (value: string) => void;
    /** Called with the next open state when the calendar Popover opens or closes. */
    onopenchange?: (open: boolean) => void;
  }

  let {
    label,
    calendarLabel,
    triggerLabel = `Choose ${label}`,
    name,
    value = $bindable(""),
    help,
    error,
    required = false,
    disabled = false,
    id,
    open = $bindable(false),
    placeholder,
    minValue,
    maxValue,
    isDateUnavailable,
    side,
    align,
    sideOffset,
    collisionPadding,
    trigger,
    class: className,
    fieldClass,
    segmentClass,
    triggerClass,
    contentClass,
    calendarClass,
    navigationClass,
    dayClass,
    onvaluechange,
    onopenchange,
  }: Props = $props();

  const styles = datePicker();
  const calendarValue = $derived(toDateValue(value));

  function toDateValue(candidate: string): DateValue | undefined {
    try {
      return candidate ? parseDate(candidate) : undefined;
    } catch {
      return undefined;
    }
  }

  function handleCalendarValue(next: DateValue | undefined): void {
    if (!next) return;
    value = next.toString();
    onvaluechange?.(value);
    open = false;
  }
</script>

<div class={styles.root({ class: className })} data-date-picker>
  <DateField
    {label}
    {name}
    bind:value
    {help}
    {error}
    {required}
    {disabled}
    {id}
    class={styles.field({ class: fieldClass })}
    {segmentClass}
  />
  <Popover
    {triggerLabel}
    contentLabel={calendarLabel}
    bind:open
    {disabled}
    {side}
    {align}
    {sideOffset}
    {collisionPadding}
    {trigger}
    triggerClass={styles.trigger({ class: triggerClass })}
    class={styles.content({ class: contentClass })}
    onopenchange={onopenchange}
  >
    <Calendar
      label={calendarLabel}
      value={calendarValue}
      placeholder={placeholder ?? calendarValue}
      {minValue}
      {maxValue}
      {isDateUnavailable}
      disabled={disabled}
      onvaluechange={handleCalendarValue}
      class={styles.calendar({ class: calendarClass })}
      {navigationClass}
      {dayClass}
    />
  </Popover>
</div>
