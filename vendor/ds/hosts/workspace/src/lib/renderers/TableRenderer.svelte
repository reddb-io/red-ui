<script lang="ts">
 import type {QueryResult} from '../reddb/index';
 import {useWorkspace} from '../workspace-context';
 import TableExplorer from '@reddb-io/design-system/data/TableExplorer';
 import type {TableRow,TableColumn,TableChange} from '@reddb-io/design-system/data/Table';
 import type {TableQueryRequest} from '@reddb-io/design-system/data/table-explorer';
 import {isSafeCellUpdateTarget} from '@reddb-io/design-system/adapters/reddb/change-sql';
 import {visibleRows,visibleColumns,inferPkColumn,identityKind,isSystemField,formatCell,rowId,buildTableSelectQuery} from '@reddb-io/design-system/adapters/reddb/table-results';
 const {activity,connection,pendingChanges}=useWorkspace();
 let {result,collection,showSystem=false}:{result:QueryResult;collection?:string;showSystem?:boolean}=$props();
 let overrideResult=$state<QueryResult|null>(null);
 $effect(()=>{void result;void collection;overrideResult=null;});
 const activeResult=$derived(overrideResult??result);
 const allRows=$derived(visibleRows(activeResult).map(row=>({...row})));
 const columns=$derived(visibleColumns(activeResult,{showSystem}));
 const pkCol=$derived(inferPkColumn(columns));
 const queryableColumns=$derived(columns.filter(key=>/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)));
 const tableColumns=$derived<TableColumn[]>(columns.map(key=>({key,header:`${key}${isSystemField(key)?' · sys':identityKind(key)==='id'||key===pkCol?' · pk':''}`,editable:!isSystemField(key),format:formatCell,parse:(input:string)=>input})));
 function describeQuery(request:TableQueryRequest){return buildTableSelectQuery(collection??'',request,queryableColumns);}
 async function runSelect(request:TableQueryRequest,signal:AbortSignal){
  const client=connection.client;if(!client||!collection)throw new Error('No active RedDB connection.');
  const sql=describeQuery(request),next=await activity.track(`${collection} · ${sql}`,()=>client.query(sql,{signal}));
  if(!next.ok)throw new Error(next.error??'Query failed.');
  if(!signal.aborted)overrideResult=next;
 }
  // Distinct display rows may address the same database row (e.g. a join).
  // Use source positions for the grid keys, but retain rid for mutations.
  function keyForRow(row: TableRow): string {
    return `row-${allRows.indexOf(row)}`
  }
  const tableChanges = $derived<TableChange[]>(allRows.flatMap((row) => {
    const rid = rowId(row)
    return pendingChanges.changes
      .filter((change) => change.table === collection && change.row === rid)
      .map((change) => ({ rowKey: keyForRow(row), columnKey: change.col, previous: change.oldValue, value: change.newValue }))
  }))

  function editable(row: TableRow, column: TableColumn): boolean {
    const rid = rowId(row)
    return !!collection && !connection.readOnly && rid !== null &&
      isSafeCellUpdateTarget({ table: collection, col: column.key, row: rid })
  }

  function updateChanges(next: readonly TableChange[]) {
    if (!collection) return
    // Process only the changed grid entry, not all staged cells. Entries for
    // rows absent from this result remain in the workspace queue untouched.
    const before = tableChanges
    for (const change of before) {
      if (next.some((item) => item.rowKey === change.rowKey && item.columnKey === change.columnKey)) continue
      const index = Number(String(change.rowKey).slice(4))
      const rid = rowId(allRows[index] ?? {})
      const staged = rid === null ? undefined : pendingChanges.find(collection, rid, change.columnKey)
      if (staged) pendingChanges.unstage(staged.id)
    }
    for (const change of next) {
      const old = before.find((item) => item.rowKey === change.rowKey && item.columnKey === change.columnKey)
      if (old && Object.is(old.value, change.value)) continue
      const index = Number(String(change.rowKey).slice(4))
      const rid = rowId(allRows[index] ?? {})
      if (rid === null) continue
      const existing = pendingChanges.find(collection, rid, change.columnKey)
      const value = String(change.value ?? '')
      if (String(change.previous ?? '') === value) {
        if (existing) pendingChanges.unstage(existing.id)
      } else {
        pendingChanges.stage(collection, rid, change.columnKey, change.previous, value)
      }
    }
  }

</script>
<div data-renderer="table" class="h-full min-h-0"><TableExplorer label="Query result" columns={tableColumns} rows={allRows} rowKey={keyForRow} total={activeResult.record_count} context={collection} error={!activeResult.ok?activeResult.error??'Query failed.':undefined} {editable} changes={tableChanges} onchangeschange={updateChanges} queryColumns={queryableColumns} onquery={connection.client&&collection?runSelect:undefined} onreset={overrideResult?()=>overrideResult=null:undefined} describequery={collection?describeQuery:undefined} identityLabel={pkCol?`identity ${pkCol}`:undefined}/></div>
