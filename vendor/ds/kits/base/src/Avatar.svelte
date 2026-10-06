<!-- A named image with an icon or required text fallback when media is absent or fails. -->
<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import Icon, { type IconGlyph } from "./Icon.svelte";
  import { avatar, type AvatarSize } from "./avatar.variants";

  interface SharedProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "class"> {
    /** Optional image source. Omitting it renders the fallback immediately. */
    src?: string;
    /** Accessible name for the person or entity represented. */
    name: string;
    /** Decorative content alternative used whenever the image is unavailable. */
    icon?: IconGlyph;
    /** Visible text required when no icon alternative is supplied. */
    fallback?: string;
    /** Density-responsive avatar size. */
    size?: AvatarSize;
    /** Extra classes merged onto the avatar root. */
    class?: string;
    /** Extra classes merged onto the `img` shown once `src` loads. */
    imageClass?: string;
    /** Extra classes merged onto the fallback layer that holds the icon or text. */
    fallbackClass?: string;
  }

  type Props = SharedProps & (
    | {
        icon: IconGlyph;
        fallback?: string;
      }
    | {
        icon?: undefined;
        fallback: string;
      }
  );

  let {
    src,
    name,
    icon,
    fallback,
    size = "md",
    class: className,
    imageClass,
    fallbackClass,
    ...rest
  }: Props = $props();

  let imageFailed = $state(false);
  const styles = $derived(avatar({ size }));
</script>

<span
  {...rest}
  data-avatar
  role="img"
  aria-label={name}
  class={styles.root({ class: className })}
>
  <span data-avatar-fallback aria-hidden="true" class={styles.fallback({ class: fallbackClass })}>
    {#if icon !== undefined}
      <Icon {icon} {size} aria-hidden="true" data-avatar-icon />
    {:else}
      {fallback}
    {/if}
  </span>
  {#if src && !imageFailed}
    <img
      data-avatar-image
      src={src}
      alt=""
      aria-hidden="true"
      class={styles.image({ class: imageClass })}
      onerror={() => (imageFailed = true)}
    />
  {/if}
</span>
