<script lang="ts">
  import { Badge } from '@reddb-io/design-system/base'

  // The legacy marker names a role, not reachability. Do not manufacture an
  // online status to fit the DS NodeBadge's different domain contract.
  interface Props { role: 'primary' | 'replica' | 'embedded'; label?: string }
  let { role, label }: Props = $props()
</script>

<Badge tone="neutral">{label ?? role}</Badge>
