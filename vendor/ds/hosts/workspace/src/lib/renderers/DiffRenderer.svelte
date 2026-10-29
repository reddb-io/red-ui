<script lang="ts">
  import DiffExplorer from '@reddb-io/design-system/data/DiffExplorer'
  import type { QueryResult } from '../reddb/index'
  import { extractDiffEntries, toExplorerEntry } from './diff-render'

  interface Props {
    result: QueryResult
    collection?: string
  }
  let { result, collection }: Props = $props()
  const entries = $derived(extractDiffEntries(result).map(toExplorerEntry))
</script>

<DiffExplorer label="Changes" {entries} context={collection} emptyLabel="No diff shape in this result." />
