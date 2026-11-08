/** The tone vocabulary: neutral plus the four Feedback Roles. */
export declare const TONES: readonly ["neutral", "info", "success", "warning", "danger"];
export type Tone = (typeof TONES)[number];
/** The tones that name a Feedback Role (ADR 0009) — every tone except neutral. */
export declare const FEEDBACK_TONES: readonly ["info", "success", "warning", "danger"];
export type FeedbackTone = (typeof FEEDBACK_TONES)[number];
/** Whether a value belongs to the tone vocabulary. */
export declare function isTone(value: unknown): value is Tone;
