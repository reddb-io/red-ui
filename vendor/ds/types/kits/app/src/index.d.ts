export { default as ListRow } from "./primitives/ListRow.svelte";
export { default as NavItem } from "./primitives/NavItem.svelte";
export { default as Pill } from "./primitives/Pill.svelte";
export { default as SplitView } from "./primitives/SplitView.svelte";
export { default as CommandPalette } from "./composites/CommandPalette.svelte";
export { default as ActivityFeed } from "./composites/ActivityFeed.svelte";
export { default as SidebarRail } from "./composites/SidebarRail.svelte";
export { default as PageHeading } from "./composites/PageHeading.svelte";
export { default as Toolbar } from "./composites/Toolbar.svelte";
/**
 * Every Primitive this Kit ships, by component name.
 *
 * Declared rather than discovered, because a consumer reads this list out of
 * vendored source with no bundler glob to run — and pinned against the files
 * on disk by `test/taxonomy.test.ts`, so it cannot quietly fall behind. The
 * showcase renders one route per entry.
 */
export declare const PRIMITIVES: readonly ["ListRow", "NavItem", "NodeBadge", "Pill", "SplitView"];
export type PrimitiveName = (typeof PRIMITIVES)[number];
/**
 * Every Composite this Kit ships, by component name — the same catalogue in
 * the Taxonomy's other half, kept for the same reason.
 */
export declare const COMPOSITES: readonly ["ApplicationWorkspace", "OutcomeScreen", "WorkspaceTabs", "ChangeReview", "ErrorBoundary", "ShortcutHelp", "EntityInspector", "EntityJourney", "SettingsRow", "TaskCard", "TelemetryRow", "PropertyPanel", "PhaseSummary", "PlaybackControls", "ActionPanel", "ActivityFeed", "ApplicationShell", "BottomNavigation", "CardHeading", "CategoryFilter", "CategoryPreview", "ChatMessage", "CheckoutForm", "CommandPalette", "ContextMenu", "Diff", "Filter", "Incentive", "Menubar", "MultiColumnLayout", "OrderHistory", "OrderSummary", "PageHeading", "Review", "ProductFeature", "ProductList", "ProductOverview", "ProductQuickview", "SidebarLayout", "SidebarNavigation", "SidebarPanel", "SidebarRail", "ShoppingCart", "SpeedDial", "StoreNavigation", "TaskList", "Toolbar"];
export type CompositeName = (typeof COMPOSITES)[number];
/** Every component the Kit ships, of either kind. */
export declare const COMPONENTS: readonly ["ListRow", "NavItem", "NodeBadge", "Pill", "SplitView", "ApplicationWorkspace", "OutcomeScreen", "WorkspaceTabs", "ChangeReview", "ErrorBoundary", "ShortcutHelp", "EntityInspector", "EntityJourney", "SettingsRow", "TaskCard", "TelemetryRow", "PropertyPanel", "PhaseSummary", "PlaybackControls", "ActionPanel", "ActivityFeed", "ApplicationShell", "BottomNavigation", "CardHeading", "CategoryFilter", "CategoryPreview", "ChatMessage", "CheckoutForm", "CommandPalette", "ContextMenu", "Diff", "Filter", "Incentive", "Menubar", "MultiColumnLayout", "OrderHistory", "OrderSummary", "PageHeading", "Review", "ProductFeature", "ProductList", "ProductOverview", "ProductQuickview", "SidebarLayout", "SidebarNavigation", "SidebarPanel", "SidebarRail", "ShoppingCart", "SpeedDial", "StoreNavigation", "TaskList", "Toolbar"];
export type ComponentName = PrimitiveName | CompositeName;
/**
 * The purpose of every application component, carried by this Kit's own
 * catalogue. Existing daisyUI sections are retained; Tailwind Plus and Bits UI
 * capabilities use the same shared purpose vocabulary.
 */
export declare const COMPONENT_PURPOSES: {
    readonly ApplicationWorkspace: "Layout";
    readonly OutcomeScreen: "Feedback";
    readonly WorkspaceTabs: "Navigation";
    readonly ChangeReview: "Data display";
    readonly ErrorBoundary: "Feedback";
    readonly ShortcutHelp: "Navigation";
    readonly EntityInspector: "Data display";
    readonly EntityJourney: "Data display";
    readonly SettingsRow: "Data input";
    readonly TaskCard: "Data display";
    readonly TelemetryRow: "Data display";
    readonly PropertyPanel: "Data display";
    readonly PhaseSummary: "Data display";
    readonly PlaybackControls: "Actions";
    readonly ListRow: "Data display";
    readonly NavItem: "Navigation";
    readonly NodeBadge: "Data display";
    readonly Pill: "Data display";
    readonly SplitView: "Layout";
    readonly ActionPanel: "Actions";
    readonly ActivityFeed: "Data display";
    readonly ApplicationShell: "Layout";
    readonly BottomNavigation: "Navigation";
    readonly CardHeading: "Data display";
    readonly CategoryFilter: "Data input";
    readonly CategoryPreview: "Navigation";
    readonly ChatMessage: "Data display";
    readonly CheckoutForm: "Data input";
    readonly CommandPalette: "Navigation";
    readonly ContextMenu: "Actions";
    readonly Diff: "Data display";
    readonly Filter: "Data input";
    readonly Incentive: "Data display";
    readonly Menubar: "Actions";
    readonly MultiColumnLayout: "Layout";
    readonly OrderHistory: "Data display";
    readonly OrderSummary: "Data display";
    readonly PageHeading: "Data display";
    readonly Review: "Data display";
    readonly ProductFeature: "Data display";
    readonly ProductList: "Data display";
    readonly ProductOverview: "Data display";
    readonly ProductQuickview: "Data display";
    readonly SidebarLayout: "Layout";
    readonly SidebarNavigation: "Navigation";
    readonly SidebarPanel: "Navigation";
    readonly SidebarRail: "Navigation";
    readonly ShoppingCart: "Data input";
    readonly SpeedDial: "Actions";
    readonly StoreNavigation: "Navigation";
    readonly TaskList: "Data display";
    readonly Toolbar: "Actions";
};
export { default as SettingsRow } from "./composites/SettingsRow.svelte";
export { default as WorkspaceTabs } from "./composites/WorkspaceTabs.svelte";
export { default as ChangeReview } from "./composites/ChangeReview.svelte";
export { default as ErrorBoundary } from "./composites/ErrorBoundary.svelte";
export { default as ShortcutHelp } from "./composites/ShortcutHelp.svelte";
export { default as OutcomeScreen } from "./composites/OutcomeScreen.svelte";
