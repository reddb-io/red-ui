<script lang="ts">
  import { Button } from '@reddb-io/design-system/base'
  import { documentCollectionEmptyCompact, searchEmpty } from '@reddb-io/design-system/base/illustrations'
  import DocumentViewer, { type DocumentPresentation, type DocumentValue } from '@reddb-io/design-system/data/DocumentViewer'
  import { collectionPageHref } from '$lib/collection-pages'
  import RendererEmptyState from './RendererEmptyState.svelte'
  import type { QueryResult } from '#reddb'
  import { extractDocuments, type DocumentItem } from './document-render'

  interface Props {
    result: QueryResult
    collection?: string
  }

  let { result, collection }: Props = $props()
  const docs = $derived(extractDocuments(result))
  // Copy each record into the portable DocumentValue shape; the presenter
  // keeps RedDB's body, user fields and raw record as separate views.
  const documents = $derived(docs.map((doc) => ({ ...doc })))
  const pretty = (value: unknown) => JSON.stringify(value ?? null, null, 2) ?? 'null'

  function present(document: DocumentValue): DocumentPresentation {
    const doc = document as unknown as DocumentItem
    return {
      summary: { id: doc.rid, title: doc.title, subtitle: [doc.subtitle, `#${doc.rid}`].filter(Boolean).join(' · ') },
      body: pretty(doc.body),
      fields: Object.entries(doc.fields).map(([key, value]) => ({ key, value, text: pretty(value) })),
      raw: pretty(doc.values),
      searchText: JSON.stringify(doc.body) ?? '',
    }
  }
</script>

<div data-renderer="document" class="flex h-full flex-col text-foreground">
  {#if !result.ok}
    <div role="alert" class="grid flex-1 place-items-center p-[var(--reddb-spatial-inset-lg)] text-sm font-mono text-ink-muted">{result.error ?? 'Query failed.'}</div>
  {:else if docs.length === 0}
    <RendererEmptyState surface="document" reason={result.result.records.length ? 'unsupported' : 'empty'} art={documentCollectionEmptyCompact} title={result.result.records.length ? 'No document data in this result' : 'No documents returned'} description={result.result.records.length ? 'The returned records do not contain document bodies. Inspect the collection as a table or return document fields.' : 'This query returned no documents. Adjust the query or inspect the collection as a table.'}>
      {#snippet actions()}{#if collection}<Button href={collectionPageHref(collection, 'table')}>View as table</Button>{/if}{/snippet}
    </RendererEmptyState>
  {:else}
    <div class="min-h-0 flex-1 overflow-auto">
      <DocumentViewer label={collection ? `${collection} documents` : 'Documents'} {documents} {present}>
        {#snippet empty({ clear })}
          <RendererEmptyState surface="document" reason="filtered" art={searchEmpty} title="No documents match this filter" description="Clear the search to show the returned documents.">
            {#snippet actions()}<Button onclick={clear}>Clear document filter</Button>{/snippet}
          </RendererEmptyState>
        {/snippet}
      </DocumentViewer>
    </div>
    <div class="border-t border-muted px-[var(--reddb-spatial-inset-sm)] py-[var(--reddb-spatial-inset-sm)] text-xs font-mono text-ink-muted">
      {docs.length} documents{collection ? ' · ' : ''}{collection ?? ''}
    </div>
  {/if}
</div>
