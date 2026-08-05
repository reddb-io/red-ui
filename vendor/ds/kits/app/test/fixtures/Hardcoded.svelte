<!--
  Test fixture — NOT part of the Kit. A component that styles itself the two
  ways a Kit component must not: a literal class naming a colour no Theme owns,
  and a scoped <style> block holding a Brand value the Themes cannot reach.
-->
<script lang="ts">
  const { label = "fixture" } = $props();
</script>

<span class="badge bg-black text-white rounded-md">{label}</span>

<style>
  .badge {
    border: 1px solid #e5484d;
  }
</style>
