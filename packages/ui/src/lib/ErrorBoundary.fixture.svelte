<script lang="ts">
  // Test-only harness: wraps the crash child in the real ErrorBoundary exactly
  // as the Workspace root does, so the regression test exercises the shipped
  // boundary rather than a stand-in.
  import ErrorBoundary from './ErrorBoundary.svelte'
  import CrashChild from './ErrorBoundaryCrashChild.fixture.svelte'
</script>

<ErrorBoundary>
  <CrashChild />
</ErrorBoundary>
