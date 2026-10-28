/** A host-supplied presentation for one kind of workspace result. */
export interface WorkspaceRenderer<Key extends string, Result> {
  /** Stable identifier used for registration, hints and overrides. */
  capability: Key;
  /** Whether the renderer can present this result. */
  renders(result: Result): boolean;
}

/** Independent registry; the host supplies renderer implementations and data. */
export class WorkspaceRendererRegistry<Key extends string, Result, Renderer extends WorkspaceRenderer<Key, Result>> {
  private renderers: Renderer[] = [];

  /** Register or replace a capability without changing its precedence. */
  register(renderer: Renderer): void {
    const index = this.renderers.findIndex(item => item.capability === renderer.capability);
    if (index >= 0) this.renderers[index] = renderer;
    else this.renderers.push(renderer);
  }

  /** Remove a registered capability. */
  unregister(capability: Key): void {
    this.renderers = this.renderers.filter(item => item.capability !== capability);
  }

  /** Remove all registrations from this registry. */
  clear(): void { this.renderers = []; }

  /** List registrations in matching precedence order. */
  list(): readonly Renderer[] { return this.renderers; }

  /** Check whether a capability is registered. */
  has(capability: Key): boolean {
    return this.renderers.some(item => item.capability === capability);
  }

  /** Select override, compatible hint, first matching shape, then fallback. */
  resolve(hint: Key | undefined, result: Result, override?: Key, fallback?: Key): Renderer | undefined {
    if (override) {
      const forced = this.renderers.find(item => item.capability === override);
      if (forced) return forced;
    }
    if (hint) {
      const preferred = this.renderers.find(item => item.capability === hint);
      if (preferred?.renders(result)) return preferred;
    }
    return this.renderers.find(item => item.renders(result)) ??
      this.renderers.find(item => item.capability === fallback);
  }
}
