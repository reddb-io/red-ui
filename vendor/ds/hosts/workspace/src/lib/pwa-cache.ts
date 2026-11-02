/** Cache only immutable build assets and the host's declared install identity. */
export function isPwaAssetRequest(
  request: Request,
  origin: string,
  assets: ReadonlySet<string>
): boolean {
  const url = new URL(request.url);
  return (
    request.method === "GET" &&
    url.origin === origin &&
    !url.search &&
    !request.headers.has("Authorization") &&
    request.cache !== "no-store" &&
    assets.has(url.pathname)
  );
}

/** Delete only obsolete versions owned by this app's service worker. */
export function obsoletePwaCaches(
  names: string[],
  current: string,
  prefix: string
): string[] {
  return names.filter((name) => name.startsWith(prefix) && name !== current);
}
