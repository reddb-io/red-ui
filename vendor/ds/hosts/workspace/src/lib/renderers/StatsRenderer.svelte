<script lang="ts">
  import StatsExplorer from '@reddb-io/design-system/data/StatsExplorer'
  import type { QueryResult } from '../reddb/index'
  import { extractStats } from './stats-render'

  interface Props {
    result: QueryResult
    collection?: string
  }
  let { result, collection }: Props = $props()
  const metrics = $derived(extractStats(result))
</script>

<StatsExplorer label={collection ? `${collection} statistics` : 'Statistics'} {metrics} context={collection} />
