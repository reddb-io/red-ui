<script lang="ts">
  import Workspace from '../lib/Workspace.svelte'
  import type { Router } from '../lib/router.svelte'
  import { detectSurface } from '../lib/surface'
  import { createDefaultWorkspacePersistence } from '../lib/default-workspace-persistence'

  let { router }: { router: Router } = $props()
  const surface = detectSurface()
  // Only the standalone host selects the local engine. The embed root and
  // generic Kits never import Worker/WASM or acquire a persistence profile.
  const persistence = typeof window !== 'undefined' && surface !== 'embedded'
    ? createDefaultWorkspacePersistence('default', surface) : undefined
</script>

<Workspace {router} {persistence} persistenceKey="default"
  themeTarget={typeof document !== 'undefined' ? document.documentElement : null} />
