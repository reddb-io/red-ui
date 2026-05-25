<script lang="ts">
  import PageHeader from '$lib/PageHeader.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import { Clock } from 'lucide-svelte'
</script>

<PageHeader
  eyebrow="Explore"
  title="Hypertables"
  subtitle="Time-partitioned tables with chart-first inspection."
/>

<EmptyState
  icon={Clock}
  title="No hypertables defined"
  message="Hypertables are time-partitioned collections optimized for append-mostly time-series workloads. Create one via the schema API and it'll appear here with a chart, brush selection, and rollups."
  hint="POST /collections {'{'} name, hypertable: {'{'} partition_by, interval {'}'} {'}'}"
/>
