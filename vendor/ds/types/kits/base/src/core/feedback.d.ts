import type { Tone } from "../tone";
/** Resolve the canonical tone before translating it into announcement urgency. */
export declare function feedbackTone(tone?: Tone, legacy?: Tone): Tone;
/** Errors interrupt; other feedback is a polite status update. */
export declare function feedbackAnnouncement(tone: Tone): "alert" | "status";
