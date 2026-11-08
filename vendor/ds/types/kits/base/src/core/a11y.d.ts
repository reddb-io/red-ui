/**
 * Warn, once per session and only in development, that `component` broke an
 * accessibility contract. `problem` says what is missing, `fix` the props that
 * supply it. The sibling of `warnDeprecated`, for the same audience.
 */
export declare function warnA11y(component: string, problem: string, fix: string): void;
/**
 * Whether `element` has an accessible name a screen reader can announce:
 * `aria-label`, an `aria-labelledby` that resolves to text, a native `<label>`
 * (wrapping or `for`), a `title`, or — for a button — its own content.
 *
 * A pragmatic approximation of the accessible-name computation, used only to
 * decide whether to warn in development, never to change what renders.
 */
export declare function hasAccessibleName(element: Element, { fromContent }?: {
    fromContent?: boolean | undefined;
}): boolean;
/** The ways a field gets its name, quoted in every field warning. */
export declare const FIELD_NAME_FIX = "Wrap it in a Field with a `label`, or pass `aria-label` or `aria-labelledby`, or point a native <label for> at its id";
/**
 * Warn in development when a mounted form control has no accessible name.
 * Checked after mount, so a `<label for>` written anywhere in the document
 * counts, exactly as it does for the browser.
 */
export declare function checkFieldName(component: string, element: Element | undefined): void;
/** Buttons keep their visible words in the accessible name (WCAG 2.5.3). */
export declare function checkButtonName(component: string, element: Element | undefined): void;
