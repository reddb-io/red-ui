// Emit HTML for fixed routes so static hosts can serve direct visits/reloads.
// Dynamic collection routes use the adapter's client-side fallback instead.
export const prerender = "auto";
export const ssr = false;
export const trailingSlash = "never";
