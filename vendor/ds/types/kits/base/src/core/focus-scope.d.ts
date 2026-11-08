/** Keep boundary Tab moves inside a popup mounted in a native modal's top layer.
 * Native dialogs can intercept the headless engine's off-surface focus guards.
 * The innermost scope alone owns this boundary; ordinary moves stay native.
 */
export declare function trapScopeTab(scope: HTMLElement): () => void;
/** A consumer may deliberately focus its next field while a popup closes.
 * Restore the trigger only when focus still belongs to the popup or was lost.
 */
export declare function focusMovedOutside(anchor: HTMLElement | undefined, popupSelector: string): boolean;
