<script lang="ts">
  // Test-only child that throws during render when `crashCtrl.crash` is set,
  // reproducing a component regression that would otherwise black out the
  // webview. On a boundary reset it is recreated and re-reads the flag.
  import { crashCtrl } from './ErrorBoundary.fixtures.svelte'
  if (crashCtrl.crash) throw new Error(crashCtrl.message)
</script>

<div data-testid="child-alive">child rendered</div>
