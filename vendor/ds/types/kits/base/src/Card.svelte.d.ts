import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { type IconGlyph } from "./Icon.svelte";
import { type ImageAsset } from "./Image.svelte";
import { type CardActionsAlign, type CardMediaFit, type CardMediaPosition, type CardMediaRatio, type CardMediaSpan, type CardOrientation, type CardPadding, type CardTone, type CardVariant, type DeprecatedCardTone } from "./card.variants";
interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class" | "title"> {
    /** Edge treatment. Defaults to `outline`. */
    variant?: CardVariant;
    /** Lift the Card onto the raised elevation level. */
    raised?: boolean;
    /** Retain the Card content while announcing background work. */
    busy?: boolean;
    /** Text announced while `busy`, naming what is loading. Defaults to `Loading card content`. */
    busyLabel?: string;
    /** Hides the busy text visually while keeping it announced to assistive technology. */
    busyLabelHidden?: boolean;
    /**
     * What the Card means: the shared tone vocabulary (ADR 0026), each on its
     * Feedback Role's surface and paired readable foreground. Defaults to
     * `neutral`. `brand` is deprecated for one release.
     */
    tone?: CardTone | DeprecatedCardTone;
    /** Density-owned inset applied to every section. Defaults to `md`. */
    padding?: CardPadding;
    /** Main-axis alignment for footer actions. Defaults to `start`. */
    actionsAlign?: CardActionsAlign;
    /** Media/content arrangement. Defaults to `vertical`. */
    orientation?: CardOrientation;
    /** How media fills its ratio-bound region without distortion. Defaults to `cover`. */
    fit?: CardMediaFit;
    /** Focal position retained when covered media crops. Defaults to `center`. */
    position?: CardMediaPosition;
    /** Aspect ratio of the media region. Defaults to `16/9`. */
    ratio?: CardMediaRatio;
    /** Media width or layering treatment. Defaults to `two-fifths`. */
    span?: CardMediaSpan;
    /** Header title, rendered when no `header` snippet is given. */
    title?: string;
    /** Decorative glyph rendered beside the title through the DS Icon contract. */
    icon?: IconGlyph;
    /** Supporting line under the title. */
    description?: string;
    /** Full control over the header. Replaces `icon`, `title`, and `description`. */
    header?: Snippet;
    /** Caller-owned media rendered as a vertical band, horizontal lead, or background. */
    media?: Snippet;
    /**
     * The media as an image the app's pipeline produced, rendered through the Base Image inside the
     * media region with the Card's `fit` and `position`; ignored when a `media` snippet is given.
     */
    image?: ImageAsset;
    /** The `image` is the page's Largest Contentful Paint: fetched eagerly at high priority. */
    priority?: boolean;
    /** Caller-owned actions or content rendered after the body. */
    footer?: Snippet;
    /** Extra classes merged onto the canonical surface. */
    class?: string;
    /** The Card body, rendered between the header and the footer. */
    children?: Snippet;
}
declare const Card: import("svelte").Component<Props, {}, "">;
type Card = ReturnType<typeof Card>;
export default Card;
