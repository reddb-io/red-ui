import { getContext, setContext } from "svelte";
import {
  getLegacyWorkspace,
  type WorkspaceRuntime,
} from "./workspace-runtime.svelte";

const WORKSPACE = Symbol("red-ui-workspace");

export function setWorkspaceRuntime(
  runtime: WorkspaceRuntime
): WorkspaceRuntime {
  return setContext(WORKSPACE, runtime);
}

/** Call during component initialization. Each mounted root supplies its scope. */
export function useWorkspace(): WorkspaceRuntime {
  return (
    getContext<WorkspaceRuntime | undefined>(WORKSPACE) ?? getLegacyWorkspace()
  );
}

/** Closed shadow roots hide their event path from document/window listeners. */
export function workspaceKeyboardTarget(
  runtime: WorkspaceRuntime
): Window | ShadowRoot {
  const root = runtime.root?.getRootNode();
  return root instanceof ShadowRoot
    ? root
    : (runtime.root?.ownerDocument.defaultView ?? window);
}
