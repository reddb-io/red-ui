<!-- A native-first scroll-entry Motion Primitive with useful bare defaults. -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { useReducedMotion } from "./reduced-motion.svelte";
  import { reveal } from "./reveal.variants";

  export type RevealDirection = "up" | "down" | "left" | "right" | "none";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
    /** The edge content enters from. */
    direction?: RevealDirection;
    /** Milliseconds to wait before entering. */
    delay?: number;
    /** Show the entry range while tuning a composition. */
    debug?: boolean;
    /** Extra classes merged onto the primitive. */
    class?: string;
    /** Content that enters the viewport with the reveal. */
    children?: Snippet;
  }

  const {
    direction = "up",
    delay = 0,
    debug = false,
    class: className,
    children,
    ...rest
  }: Props = $props();

  const path =
    typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()") ? "css" : "js";
  const reducedMotion = useReducedMotion();
  let element = $state<HTMLElement>();
  let entered = $state(false);

  const offsets: Record<RevealDirection, readonly [x: string, y: string]> = {
    up: ["0px", "1.5rem"],
    down: ["0px", "-1.5rem"],
    left: ["-1.5rem", "0px"],
    right: ["1.5rem", "0px"],
    none: ["0px", "0px"],
  };

  $effect(() => {
    if (!element) return;

    // Reduced motion is a settled presentation, not a scroll-driven fade.
    // Resolve it before selecting a motion path so a native ViewTimeline
    // cannot hold the content at its transparent first keyframe.
    if (reducedMotion.current) {
      entered = true;
      return;
    }

    if (path === "css") {
      const ViewTimeline = (
        globalThis as typeof globalThis & {
          ViewTimeline?: new (options: { subject: Element }) => AnimationTimeline;
        }
      ).ViewTimeline;
      if (typeof element.animate !== "function" || ViewTimeline === undefined) {
        entered = true;
        return;
      }

      const [x, y] = offsets[direction];
      const animation = element.animate(
        [
          { opacity: 0, transform: `translate3d(${x}, ${y}, 0)` },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ],
        {
          duration: 1,
          delay,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "both",
          timeline: new ViewTimeline({ subject: element }),
          rangeStart: "entry 0%",
          rangeEnd: "entry 35%",
        } as KeyframeAnimationOptions,
      );
      return () => animation.cancel();
    }

    if (typeof IntersectionObserver === "undefined") {
      entered = true;
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      entered = true;
      observer.disconnect();
    });
    observer.observe(element);
    return () => observer.disconnect();
  });
</script>

<div
  bind:this={element}
  {...(rest as Record<string, unknown>)}
  class={reveal({ direction, path, entered, debug, class: className })}
  style:--reveal-delay={`${delay}ms`}
  style:--reveal-x={reducedMotion.current ? "0px" : undefined}
  style:--reveal-y={reducedMotion.current ? "0px" : undefined}
  data-reveal
  data-reveal-path={path}
  data-reveal-motion={reducedMotion.current ? "fade" : "position-and-fade"}
  data-reveal-direction={direction}
  data-reveal-delay={delay}
  data-reveal-debug={debug ? "" : undefined}
  data-reveal-entered={entered ? "" : undefined}
>
  {@render children?.()}
</div>
