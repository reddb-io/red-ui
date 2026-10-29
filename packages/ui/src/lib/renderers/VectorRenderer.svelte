<script lang="ts">
 import type {QueryResult,RedClient} from '#reddb';
 import VectorExplorer from '@reddb-io/design-system/data/VectorExplorer';
 import type {VectorSearchRequest} from '@reddb-io/design-system/data/vector-explorer';
 import {extractVectors,buildVectorSearchQuery,isVectorSearchResult,isSyntheticVectorPreview} from '@reddb-io/design-system/adapters/reddb/vector-results';
 let {result,collection,client}:{result:QueryResult;collection?:string;client?:RedClient}=$props();
 const rows=$derived(extractVectors(result));
 function searchResponse(result:QueryResult){return {rows:extractVectors(result),note:isSyntheticVectorPreview(result)?'Synthetic preview: this result is not a semantic similarity ranking.':undefined};}
 const searchResults=$derived(isVectorSearchResult(result)?searchResponse(result):undefined);
 async function search(request:VectorSearchRequest,signal:AbortSignal){
  if(!client||!collection)throw new Error('No active RedDB connection for vector search.');
  const next=await client.query(buildVectorSearchQuery(collection,request,request.limit),{signal});
  if(!next.ok)throw new Error(next.error??'Vector search failed.');
  return searchResponse(next);
 }
</script>
<VectorExplorer label="Vectors" {rows} {searchResults} context={collection} onsearch={client&&collection?search:undefined}/>
