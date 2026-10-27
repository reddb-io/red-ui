<script lang="ts">
  import { useWorkspace } from './workspace-context'

  const workspace = useWorkspace()
  const { activity } = workspace

</script>

{#if activity.active}
  <div class="global-progress" role="progressbar" aria-label="reddb activity" aria-valuetext="Loading">
    <div class="global-progress__bar"></div>
  </div>
{/if}
