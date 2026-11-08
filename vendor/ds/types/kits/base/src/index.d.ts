export { default as Alert } from "./Alert.svelte";
export { default as AlertDialog } from "./AlertDialog.svelte";
export { default as Badge } from "./Badge.svelte";
export { default as Button } from "./Button.svelte";
export { default as Card } from "./Card.svelte";
export { default as Checkbox } from "./Checkbox.svelte";
export { default as CodeBlock } from "./CodeBlock.svelte";
export { default as DescriptionList } from "./DescriptionList.svelte";
export { default as Dialog } from "./Dialog.svelte";
export { default as Disclosure } from "./Disclosure.svelte";
export { default as Divider } from "./Divider.svelte";
export { default as EmptyState } from "./EmptyState.svelte";
export { default as Field } from "./Field.svelte";
export { default as Heading } from "./Heading.svelte";
export { default as Icon } from "./Icon.svelte";
export { default as Indicator } from "./Indicator.svelte";
export { default as Input } from "./Input.svelte";
export { default as Kbd } from "./Kbd.svelte";
export { default as Label } from "./Label.svelte";
export { default as Link } from "./Link.svelte";
export { default as LoadingIndicator } from "./LoadingIndicator.svelte";
export { default as Logo } from "./Logo.svelte";
export { default as NavigationScope } from "./NavigationScope.svelte";
export { default as Popover } from "./Popover.svelte";
export { default as Progress } from "./Progress.svelte";
export { default as SectionHeading } from "./SectionHeading.svelte";
export { default as Select } from "./Select.svelte";
export { default as Skeleton } from "./Skeleton.svelte";
export { default as Stack } from "./Stack.svelte";
export { default as StatusIndicator } from "./StatusIndicator.svelte";
export { default as Tabs } from "./Tabs.svelte";
export { default as Textarea } from "./Textarea.svelte";
export { default as Timeline } from "./Timeline.svelte";
export { default as ToggleButton } from "./ToggleButton.svelte";
export { default as Tooltip } from "./Tooltip.svelte";
export { type Tone } from "./tone";
export { warnDeprecated } from "./deprecation";
/**
 * Every component this Kit ships, by component name.
 *
 * Declared rather than discovered, because a consumer reads this list out of
 * vendored source with no bundler glob to run — the same contract the
 * application Kit's `PRIMITIVES` carries.
 */
export declare const BASE_COMPONENTS: readonly ["Accordion", "Alert", "AlertDialog", "AppearanceSwitch", "AspectRatio", "AudioMeter", "Avatar", "Badge", "Breadcrumbs", "BrowserMockup", "BulletsSlide", "Button", "Calendar", "Card", "Carousel", "Checkbox", "CodeBlock", "Combobox", "Container", "ContentMask", "ContentState", "ControlGroup", "Countdown", "DateField", "DatePicker", "DateRangeField", "DateRangePicker", "Deck", "DescriptionList", "Dialog", "Disclosure", "Divider", "Drawer", "DropdownMenu", "EmptyState", "Eyebrow", "Field", "Fieldset", "FigureSlide", "FileInput", "Form", "GridList", "Heading", "Icon", "Image", "Indicator", "InlineEdit", "Input", "Kbd", "Label", "Link", "LinkPreview", "List", "ListContainer", "LoadingIndicator", "Logo", "MathExpression", "MediaObject", "Meter", "Navbar", "NavigationMenu", "NavigationScope", "Notification", "NumberField", "OneTimeCodeInput", "Pagination", "PhoneInput", "PhoneMockup", "Popover", "Progress", "Prose", "QuoteSlide", "RadialContent", "RadialProgress", "RadioGroup", "RangeCalendar", "Rating", "Reveal", "ScrollArea", "SearchSelect", "SecretValue", "SectionHeading", "SectionSlide", "Select", "Skeleton", "SkipLink", "SlideFrame", "Slider", "Stack", "StateIllustration", "Statistic", "StatusIndicator", "Steps", "Swap", "Switch", "Table", "Tabs", "Text", "Textarea", "TimeField", "TimeRangeField", "Timeline", "TitleSlide", "ToggleButton", "ToggleGroup", "Tooltip", "Transfer", "TwoColumnSlide", "VoiceInput", "WindowMockup"];
export type BaseComponentName = (typeof BASE_COMPONENTS)[number];
/** The purpose vocabulary shared by every Kit catalogue. */
export declare const PURPOSE_CATEGORIES: readonly ["Actions", "Data input", "Data display", "Navigation", "Feedback", "Layout", "Mockup"];
export type PurposeCategory = (typeof PURPOSE_CATEGORIES)[number];
/** Reader intent for each purpose group, used when placing new components. */
export declare const PURPOSE_GROUP_MEANINGS: {
    readonly Actions: "Controls that initiate or confirm operations and decisions.";
    readonly "Data input": "Components that collect, edit, select, or validate user-provided values.";
    readonly "Data display": "Components that present, summarize, compare, or organize information.";
    readonly Navigation: "Components that move readers among destinations or orient them within a structure.";
    readonly Feedback: "Components that communicate status, progress, outcomes, or required attention.";
    readonly Layout: "Components that arrange page regions, content, and related elements.";
    readonly Mockup: "Components that frame illustrative content inside recognizable device or code contexts.";
};
/**
 * The purpose of every Base component.
 *
 * daisyUI's catalogue supplies its section names directly. Components that
 * only occur in Bits UI or Tailwind Plus are assigned to the same vocabulary
 * here, at the Kit boundary, so consumers never need a parallel category map.
 */
export declare const BASE_COMPONENT_PURPOSES: {
    readonly Transfer: "Layout";
    readonly Accordion: "Data display";
    readonly Alert: "Feedback";
    readonly AlertDialog: "Actions";
    readonly AppearanceSwitch: "Actions";
    readonly AspectRatio: "Layout";
    readonly AudioMeter: "Data display";
    readonly VoiceInput: "Data input";
    readonly Avatar: "Data display";
    readonly Badge: "Data display";
    readonly Breadcrumbs: "Navigation";
    readonly BrowserMockup: "Mockup";
    readonly BulletsSlide: "Layout";
    readonly Button: "Actions";
    readonly Calendar: "Data input";
    readonly Card: "Data display";
    readonly Carousel: "Data display";
    readonly Checkbox: "Data input";
    readonly CodeBlock: "Mockup";
    readonly MathExpression: "Data display";
    readonly Combobox: "Data input";
    readonly Container: "Layout";
    readonly ContentMask: "Layout";
    readonly ContentState: "Feedback";
    readonly ControlGroup: "Layout";
    readonly Countdown: "Data display";
    readonly DateField: "Data input";
    readonly DatePicker: "Data input";
    readonly DateRangeField: "Data input";
    readonly DateRangePicker: "Data input";
    readonly Deck: "Layout";
    readonly DescriptionList: "Data display";
    readonly Dialog: "Actions";
    readonly Disclosure: "Data display";
    readonly Divider: "Layout";
    readonly Drawer: "Layout";
    readonly DropdownMenu: "Actions";
    readonly EmptyState: "Feedback";
    readonly StateIllustration: "Feedback";
    readonly Eyebrow: "Data display";
    readonly Field: "Data input";
    readonly Fieldset: "Data input";
    readonly FigureSlide: "Layout";
    readonly FileInput: "Data input";
    readonly Form: "Data input";
    readonly GridList: "Data display";
    readonly Heading: "Data display";
    readonly Icon: "Data display";
    readonly Image: "Data display";
    readonly Indicator: "Layout";
    readonly InlineEdit: "Data input";
    readonly Input: "Data input";
    readonly Kbd: "Data display";
    readonly Label: "Data input";
    readonly Link: "Navigation";
    readonly LinkPreview: "Data display";
    readonly List: "Data display";
    readonly ListContainer: "Layout";
    readonly LoadingIndicator: "Feedback";
    readonly Logo: "Data display";
    readonly MediaObject: "Layout";
    readonly Meter: "Data display";
    readonly Navbar: "Navigation";
    readonly NavigationMenu: "Navigation";
    readonly NavigationScope: "Navigation";
    readonly Notification: "Feedback";
    readonly NumberField: "Data input";
    readonly PhoneInput: "Data input";
    readonly OneTimeCodeInput: "Data input";
    readonly Pagination: "Navigation";
    readonly PhoneMockup: "Mockup";
    readonly Popover: "Actions";
    readonly Progress: "Feedback";
    readonly Prose: "Data display";
    readonly QuoteSlide: "Layout";
    readonly RadialProgress: "Feedback";
    readonly RadialContent: "Data display";
    readonly RadioGroup: "Data input";
    readonly RangeCalendar: "Data input";
    readonly Rating: "Data input";
    readonly Reveal: "Layout";
    readonly ScrollArea: "Layout";
    readonly SectionHeading: "Data display";
    readonly SectionSlide: "Layout";
    readonly SecretValue: "Data display";
    readonly SearchSelect: "Data input";
    readonly Select: "Data input";
    readonly Skeleton: "Feedback";
    readonly SkipLink: "Navigation";
    readonly SlideFrame: "Layout";
    readonly Slider: "Data input";
    readonly Stack: "Layout";
    readonly Statistic: "Data display";
    readonly StatusIndicator: "Data display";
    readonly Steps: "Navigation";
    readonly Swap: "Actions";
    readonly Switch: "Data input";
    readonly Table: "Data display";
    readonly Tabs: "Navigation";
    readonly Text: "Data display";
    readonly Textarea: "Data input";
    readonly TimeField: "Data input";
    readonly TimeRangeField: "Data input";
    readonly Timeline: "Data display";
    readonly TitleSlide: "Layout";
    readonly ToggleButton: "Actions";
    readonly ToggleGroup: "Actions";
    readonly Tooltip: "Feedback";
    readonly TwoColumnSlide: "Layout";
    readonly WindowMockup: "Mockup";
};
/** Components that compose another canonical Base component. */
export declare const BASE_COMPOSITES: readonly ["Accordion", "AlertDialog", "AppearanceSwitch", "Avatar", "Breadcrumbs", "BrowserMockup", "BulletsSlide", "Calendar", "Card", "Carousel", "Checkbox", "CodeBlock", "Combobox", "ContentState", "DateField", "DatePicker", "DateRangeField", "DateRangePicker", "Drawer", "DropdownMenu", "Disclosure", "Field", "FigureSlide", "FileInput", "GridList", "InlineEdit", "ListContainer", "Navbar", "NavigationMenu", "Notification", "NumberField", "OneTimeCodeInput", "Pagination", "PhoneInput", "PhoneMockup", "Popover", "QuoteSlide", "RadialContent", "RadioGroup", "RangeCalendar", "Rating", "SearchSelect", "SecretValue", "SectionSlide", "Slider", "Statistic", "Steps", "Swap", "Switch", "Tabs", "TimeField", "TimeRangeField", "Timeline", "TitleSlide", "ToggleButton", "ToggleGroup", "TwoColumnSlide", "VoiceInput", "WindowMockup"];
export type BaseCompositeName = (typeof BASE_COMPOSITES)[number];
/** Components with no imports from another Kit component. */
export type BasePrimitiveName = Exclude<BaseComponentName, BaseCompositeName>;
export declare const BASE_PRIMITIVES: BasePrimitiveName[];
export { type IconGlyph } from "./Icon.svelte";
export type { TimelineItem } from "./Timeline.svelte";
export { quietControl } from "./quiet-control.variants";
export { jsonCodeGrammar } from "./core/json-code";
export { type DropdownMenuEntry } from "./dropdown-menu.behavior";
export { default as StateIllustration } from "./StateIllustration.svelte";
