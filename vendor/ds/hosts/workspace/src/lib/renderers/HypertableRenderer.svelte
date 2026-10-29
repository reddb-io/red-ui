<script lang="ts">
 import type {QueryResult} from '../reddb/index';
 import EventSeriesExplorer from '@reddb-io/design-system/data/EventSeriesExplorer';
 import {extractEventSeries} from '@reddb-io/design-system/adapters/reddb/time-series-results';
 let {result,collection}:{result:QueryResult;collection?:string}=$props();
 const series=$derived(extractEventSeries(result));
</script>
<EventSeriesExplorer label="Time series" {series} context={collection}/>
