/**
 * Warn, once per session and only in development, that `component` received a
 * deprecated name. `used` is what the caller wrote (`intent="danger"`),
 * `instead` the canonical spelling (`tone="danger"`).
 */
export declare function warnDeprecated(component: string, used: string, instead: string): void;
