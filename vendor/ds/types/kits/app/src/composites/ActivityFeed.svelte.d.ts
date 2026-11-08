import type { TimelineItem } from "@reddb-io/design-system/base";
export type ActivityFeedItem = TimelineItem;
import type { ActivityFeedContract } from "../core/contracts/activityfeed";
import type { HTMLAttributes } from "svelte/elements";
interface Props extends ActivityFeedContract, Omit<HTMLAttributes<HTMLOListElement>, keyof ActivityFeedContract | "class"> {
    /** Extra classes, merged over the root slot's own, onto the Timeline list. */
    class?: string;
}
declare const ActivityFeed: import("svelte").Component<Props, {}, "">;
type ActivityFeed = ReturnType<typeof ActivityFeed>;
export default ActivityFeed;
