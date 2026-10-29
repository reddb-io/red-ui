<script lang="ts">
  import { Badge, Card, StatusIndicator } from '@reddb-io/design-system/base'
  /** Compatibility composition. New topology consumers use Data Kit Diagram. */
  let { data, selected = false }: {
    data: { label: string; role: string; collections: number; entities: number; url: string }
    selected?: boolean
  } = $props()
</script>
<Card title={data.label} description={data.url} tone={selected ? 'info' : 'neutral'}>
  <StatusIndicator label={data.role} tone={data.role === 'primary' ? 'info' : 'neutral'} />
  <div class="flex flex-wrap gap-2">
    <Badge>{data.collections} collections</Badge>
    <Badge>{data.entities.toLocaleString()} entities</Badge>
  </div>
</Card>
