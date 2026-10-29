<script lang="ts">
 import type {QueryResult} from '#reddb';
 import {useWorkspace} from '../workspace-context';
 import QueueExplorer from '@reddb-io/design-system/data/QueueExplorer';
 import {extractQueueMessages,extractQueueEvents,queueCommandPlan,queuePushQuery} from '@reddb-io/design-system/adapters/reddb/queue-results';
 const {activity,connection}=useWorkspace();
 let {result,collection}:{result:QueryResult;collection?:string}=$props();
 const messages=$derived(extractQueueMessages(result));
 const events=$derived(extractQueueEvents(messages));
 const commands=$derived(collection?queueCommandPlan(collection):[]);
 async function enqueue(payload:unknown,signal:AbortSignal){
  const client=connection.client;
  if(!client||!collection||connection.readOnly)throw new Error('Queue insertion is unavailable.');
  const response=await activity.track(`${collection} · enqueue message`,()=>client.query(queuePushQuery(collection,payload),{signal}));
  if(!response.ok)throw new Error(response.error??'Queue insertion failed.');
 }
</script>
<div data-renderer="queue" class="h-full min-h-0"><QueueExplorer label="Queue" {messages} {events} {commands} context={collection} error={!result.ok?result.error??'Query failed.':undefined} onenqueue={connection.client&&collection&&!connection.readOnly?enqueue:undefined}/></div>
