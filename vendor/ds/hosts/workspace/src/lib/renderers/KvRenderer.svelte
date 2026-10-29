<script lang="ts">
 import type {QueryResult} from '../reddb/index';
 import KeyValueExplorer from '@reddb-io/design-system/data/KeyValueExplorer';
 import {extractKv} from '@reddb-io/design-system/adapters/reddb/kv-results';
 let {result,collection}:{result:QueryResult;collection?:string}=$props();
 const entries=$derived(extractKv(result));
</script>
<KeyValueExplorer label="Key values" {entries} context={collection}/>
