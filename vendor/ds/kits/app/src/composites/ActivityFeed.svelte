<!-- Application activity expressed through the canonical ordered Timeline. -->
<script module lang="ts">
  import type { TimelineItem } from "@reddb-io/design-system/base";

  export type ActivityFeedItem = TimelineItem;
</script>

<script lang="ts">
  import { Timeline } from "@reddb-io/design-system/base";
  import type { HTMLAttributes } from "svelte/elements";
  import { activityFeed } from "./activity-feed.variants";

  interface Props extends Omit<HTMLAttributes<HTMLOListElement>, "class"> {
    /** Caller-owned activity in chronological display order. */
    items: readonly ActivityFeedItem[];
    /** Accessible name for this activity stream. */
    label?: string;
    /** Extra classes, merged over the root slot's own, onto the Timeline list. */
    class?: string;
  }

  let { items, label = "Activity feed", class: className, ...rest }: Props = $props();
  const styles = $derived(activityFeed());
</script>

<Timeline
  {...rest}
  {items}
  {label}
  data-activity-feed
  class={styles.root({ class: className })}
/>
