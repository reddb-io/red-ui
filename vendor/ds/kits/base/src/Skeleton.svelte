<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { skeleton } from "./skeleton.variants";
  import type { SkeletonContract } from "./core/contracts/skeleton";
  import { skeletonGeometry, skeletonSvgMarkup } from "./core/skeleton";

  interface Props extends SkeletonContract, Omit<HTMLAttributes<HTMLDivElement>, "class" | "children"> {
    /** Extra classes, merged over the placeholder's own, for example to set its size. */
    class?: string;
  }

  const {
    shape = "text",
    label,
    rows = 5,
    columns = 4,
    animated = true,
    style,
    class: className,
    ...rest
  }: Props = $props();
  const geometry = $derived(skeletonGeometry(shape, rows, columns));
  const markup = $derived(skeletonSvgMarkup(geometry));
</script>

<div
  {...(rest as Record<string, unknown>)}
  data-skeleton
  data-shape={shape}
  class={skeleton({ shape, animated, class: className })}
  style={`${geometry?.tracks ? `grid-template-rows:${geometry.tracks};` : ""}${style ?? ""}`}
  role={label ? "status" : undefined}
  aria-label={label}
  aria-live={label ? "polite" : undefined}
  aria-busy={label ? "true" : undefined}
  aria-hidden={label ? undefined : "true"}
>
  {#if geometry}
    <svg data-skeleton-svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} preserveAspectRatio={shape === "pie" || shape === "donut" || shape === "radial" ? "xMidYMid meet" : "none"} aria-hidden="true" focusable="false" class="absolute inset-0 block h-full w-full">
      {@html markup}
    </svg>
  {/if}
</div>
