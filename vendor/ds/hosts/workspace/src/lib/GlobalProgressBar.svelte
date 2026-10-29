<script lang="ts">
  import { Progress } from '@reddb-io/design-system/base'
  import { useWorkspace } from './workspace-context'
  const { activity } = useWorkspace()
</script>

{#if activity.active}
  <Progress label="RedDB activity" class="absolute inset-x-0 top-0 z-50" />
{/if}
