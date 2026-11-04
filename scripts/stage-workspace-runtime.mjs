// The canonical DS host owns offline runtime asset discovery.
import { stageOfflineRuntime } from '../vendor/ds/hosts/workspace/src/stage-offline-runtime.mjs';
stageOfflineRuntime(new URL('../packages/ui/build/', import.meta.url));
