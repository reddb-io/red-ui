<!-- A named slide set with canonical controls and opt-in pausable rotation. -->
<script module lang="ts">
  import type { Snippet } from "svelte";

  export interface CarouselSlide {
    /** Visible meaning included in the slide's accessible position label. */
    label: string;
    /** Caller-owned slide content. */
    content: Snippet;
  }
</script>

<script lang="ts">
  import { untrack } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import Button from "./Button.svelte";
  import { warnDeprecated } from "./deprecation";
  import { carousel } from "./carousel.variants";
  import { useReducedMotion } from "./reduced-motion.svelte";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "class" | "onchange"> {
    /** Accessible name for the carousel region. */
    label: string;
    /** Caller-owned slides in stable document order. */
    slides: readonly CarouselSlide[];
    /** Initially selected zero-based slide index. */
    initialIndex?: number;
    /** Opt-in automatic rotation, suspended under reduced motion. A pause/resume control is always rendered when enabled. */
    autoplay?: boolean;
    /** Milliseconds between automatic selections. */
    interval?: number;
    /** Called with the selected zero-based index after a user or timer selects a slide. */
    onvaluechange?: (index: number) => void;
    /** @deprecated Renamed `onvaluechange` (ADR 0026); removed next release. */
    onchange?: (index: number) => void;
    /** Extra classes merged onto the carousel region. */
    class?: string;
    /** Extra classes merged onto the viewport that wraps the slides. */
    viewportClass?: string;
    /** Extra classes merged onto each slide's group element. */
    slideClass?: string;
    /** Extra classes merged onto the row holding the previous, next and rotation controls. */
    controlsClass?: string;
  }

  let {
    label,
    slides,
    initialIndex = 0,
    autoplay = false,
    interval = 5_000,
    onvaluechange,
    onchange,
    class: className,
    viewportClass,
    slideClass,
    controlsClass,
    ...rest
  }: Props = $props();

  const reducedMotion = useReducedMotion();
  let active = $state(untrack(() => Math.max(0, Math.min(initialIndex, slides.length - 1))));
  let rotationRequested = $state(untrack(() => autoplay && slides.length > 1));
  const isPlaying = $derived(rotationRequested && !reducedMotion.current);
  const styles = carousel();

  function select(index: number): void {
    if (slides.length < 1) return;
    active = (index + slides.length) % slides.length;
    onvaluechange?.(active);
    onchange?.(active);
  }

  $effect(() => {
    if (onchange) warnDeprecated("Carousel", "onchange", "onvaluechange");
  });

  function pauseForInteraction(event: FocusEvent | MouseEvent): void {
    if (!autoplay || !isPlaying) return;
    const target = event.target;
    if (target instanceof Element && target.closest("[data-carousel-rotation]")) return;
    rotationRequested = false;
  }

  $effect(() => {
    if (!isPlaying || slides.length < 2) return;
    const timer = window.setInterval(() => select(active + 1), Math.max(1, interval));
    return () => window.clearInterval(timer);
  });
</script>

<div
  {...rest}
  data-carousel
  role="region"
  aria-roledescription="carousel"
  aria-label={label}
  class={styles.root({ class: className })}
  onfocusin={pauseForInteraction}
  onmouseenter={pauseForInteraction}
>
  <div
    data-carousel-viewport
    aria-live={isPlaying ? "off" : "polite"}
    class={styles.viewport({ class: viewportClass })}
  >
    {#each slides as slide, index (slide)}
      <div
        data-carousel-slide
        role="group"
        aria-roledescription="slide"
        aria-label={`${index + 1} of ${slides.length} — ${slide.label}`}
        hidden={index !== active}
        class={styles.slide({ class: slideClass })}
      >
        {@render slide.content()}
      </div>
    {/each}
  </div>

  <div data-carousel-controls class={styles.controls({ class: controlsClass })}>
    <Button
      variant="secondary"
      size="sm"
      aria-label="Previous slide"
      disabled={slides.length < 2}
      onclick={() => select(active - 1)}
    >Previous</Button>
    <span data-carousel-position aria-live="off" class={styles.position()}>
      {slides.length === 0 ? "0 of 0" : `${active + 1} of ${slides.length}`}
    </span>
    <Button
      variant="secondary"
      size="sm"
      aria-label="Next slide"
      disabled={slides.length < 2}
      onclick={() => select(active + 1)}
    >Next</Button>
    {#if autoplay}
      <Button
        data-carousel-rotation
        variant="secondary"
        size="sm"
        aria-label={isPlaying ? "Pause slide rotation" : "Resume slide rotation"}
        aria-pressed={isPlaying}
        class={styles.rotation()}
        disabled={slides.length < 2 || reducedMotion.current}
        onclick={() => (rotationRequested = !rotationRequested)}
      >{isPlaying ? "Pause" : "Resume"}</Button>
    {/if}
  </div>
</div>
