<script lang="ts">
  import { activity } from './activity.svelte'
</script>

{#if activity.active}
  <div class="global-progress" role="progressbar" aria-label="reddb activity" aria-valuetext="Loading">
    <div class="global-progress__bar"></div>
  </div>
{/if}
