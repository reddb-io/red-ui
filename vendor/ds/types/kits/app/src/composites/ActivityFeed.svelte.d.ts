import type { TimelineItem } from "@reddb-io/design-system/base";
export type ActivityFeedItem = TimelineItem;
import type { ActivityFeedContract } from "../core/contracts/activityfeed";
import type { HTMLAttributes } from "svelte/elements";
interface Props extends ActivityFeedContract, Omit<HTMLAttributes<HTMLOListElement>, keyof ActivityFeedContract | "class"> {
    /** Called when the person retries after a failed load. */
    onretry?: () => void;
    /** Extra classes, merged over the root slot's own, onto the Timeline list (or onto the loading, empty or error state that replaces it). */
    class?: string;
}
declare const ActivityFeed: import("svelte").Component<Props, {}, "">;
type ActivityFeed = ReturnType<typeof ActivityFeed>;
export default ActivityFeed;
