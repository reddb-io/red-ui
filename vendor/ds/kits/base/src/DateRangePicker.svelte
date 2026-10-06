<!-- Synchronized DateRangeField and RangeCalendar under the canonical Popover lifecycle. -->
<script lang="ts">
  import { parseDate, type DateValue } from "@internationalized/date";
  import type { Snippet } from "svelte";
  import DateRangeField from "./DateRangeField.svelte";
  import Popover from "./Popover.svelte";
  import RangeCalendar from "./RangeCalendar.svelte";
  import { dateRangePicker } from "./date-range-picker.variants";

  type DateRange = { start: DateValue | undefined; end: DateValue | undefined };
  type StringDateRange = { start: string; end: string };
  type Side = "top" | "right" | "bottom" | "left";
  type Align = "start" | "center" | "end";

  interface Props {
    /** Visible legend naming the related DateFields. */
    label: string;
    /** Visible label for the start DateField. */
    startLabel: string;
    /** Visible label for the end DateField. */
    endLabel: string;
    /** Accessible name for the RangeCalendar grid and Popover dialog. */
    calendarLabel: string;
    /**
     * Accessible name for the Button that opens the calendar. Defaults to `Choose` followed by
     * `label`.
     */
    triggerLabel?: string;
    /** Native form name receiving the start date. */
    startName?: string;
    /**
     * Native form name receiving the end date; it is not submitted while the end precedes the
     * start.
     */
    endName?: string;
    /** Complete ISO bounds shared by DateRangeField and RangeCalendar. */
    startValue?: string;
    /** Complete ISO end date, bindable, shared with `startValue` by the field and the calendar. */
    endValue?: string;
    /** Supporting text associated with the complete range. */
    help?: string;
    /**
     * Message announced when the end precedes the start. Defaults to `End date cannot be before
     * start date.`
     */
    rangeError?: string;
    /** Applies native required validation to every segment of both date fields. */
    required?: boolean;
    /** Disables both date fields, the trigger Button and the RangeCalendar. */
    disabled?: boolean;
    /**
     * Explicit id prefix for the group associations and both date fields. A generated one is used
     * when omitted.
     */
    id?: string;
    /** Whether the calendar Popover is open, bindable. Defaults to closed. */
    open?: boolean;
    /** Calendar month shown when no range is selected. Defaults to the month of `startValue`. */
    placeholder?: DateValue;
    /** Earliest date the RangeCalendar lets the user select. */
    minValue?: DateValue;
    /** Latest date the RangeCalendar lets the user select. */
    maxValue?: DateValue;
    /** Fewest days a selected range may span. */
    minDays?: number;
    /** Most days a selected range may span. */
    maxDays?: number;
    /** Called with each date; return `true` to show it in the calendar but make it unselectable. */
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
    /** Custom content inside the trigger Button. The trigger label text is shown when omitted. */
    trigger?: Snippet;
    /** Extra classes merged onto the picker root, which lays the field and trigger out in a row. */
    class?: string;
    /** Extra classes merged onto the DateRangeField's Fieldset root. */
    fieldClass?: string;
    /** Extra classes merged onto each of the two DateField roots. */
    dateFieldClass?: string;
    /** Extra classes merged onto all six native date segments. */
    segmentClass?: string;
    /** Extra classes merged onto the Button that opens the calendar. */
    triggerClass?: string;
    /** Extra classes merged onto the Popover surface that holds the RangeCalendar. */
    contentClass?: string;
    /** Extra classes merged onto the RangeCalendar root. */
    calendarClass?: string;
    /** Extra classes merged onto the calendar's previous-month and next-month Buttons. */
    navigationClass?: string;
    /** Extra classes merged onto each day button in the calendar. */
    dayClass?: string;
    /**
     * Called with `{ start, end }` ISO dates once the user has chosen a complete range in the
     * calendar.
     */
    onvaluechange?: (value: StringDateRange) => void;
    /** Called with the next open state when the calendar Popover opens or closes. */
    onopenchange?: (open: boolean) => void;
  }

  let {
    label,
    startLabel,
    endLabel,
    calendarLabel,
    triggerLabel = `Choose ${label}`,
    startName,
    endName,
    startValue = $bindable(""),
    endValue = $bindable(""),
    help,
    rangeError,
    required = false,
    disabled = false,
    id,
    open = $bindable(false),
    placeholder,
    minValue,
    maxValue,
    minDays,
    maxDays,
    isDateUnavailable,
    side,
    align,
    sideOffset,
    collisionPadding,
    trigger,
    class: className,
    fieldClass,
    dateFieldClass,
    segmentClass,
    triggerClass,
    contentClass,
    calendarClass,
    navigationClass,
    dayClass,
    onvaluechange,
    onopenchange,
  }: Props = $props();

  const styles = dateRangePicker();
  const calendarValue = $derived<DateRange>({
    start: toDateValue(startValue),
    end: toDateValue(endValue),
  });

  function toDateValue(candidate: string): DateValue | undefined {
    try {
      return candidate ? parseDate(candidate) : undefined;
    } catch {
      return undefined;
    }
  }

  function handleCalendarValue(next: DateRange): void {
    startValue = next.start?.toString() ?? "";
    endValue = next.end?.toString() ?? "";

    if (startValue && endValue) {
      onvaluechange?.({ start: startValue, end: endValue });
      open = false;
    }
  }
</script>

<div class={styles.root({ class: className })} data-date-range-picker>
  <DateRangeField
    {label}
    {startLabel}
    {endLabel}
    {startName}
    {endName}
    bind:startValue
    bind:endValue
    {help}
    {rangeError}
    {required}
    {disabled}
    {id}
    class={styles.field({ class: fieldClass })}
    fieldClass={dateFieldClass}
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
    class={contentClass}
    onopenchange={onopenchange}
  >
    <RangeCalendar
      label={calendarLabel}
      value={calendarValue}
      placeholder={placeholder ?? calendarValue.start}
      {minValue}
      {maxValue}
      {minDays}
      {maxDays}
      {isDateUnavailable}
      {disabled}
      onvaluechange={handleCalendarValue}
      class={styles.calendar({ class: calendarClass })}
      {navigationClass}
      {dayClass}
    />
  </Popover>
</div>
