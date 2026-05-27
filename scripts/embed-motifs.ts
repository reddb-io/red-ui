import { env, pipeline } from '@huggingface/transformers'

const MODEL = process.env.RED_UI_EMBEDDING_MODEL ?? 'Xenova/all-MiniLM-L6-v2'
const TARGET_DIMENSION = Number(process.env.RED_UI_EMBEDDING_DIM ?? 224)

const motifs = [
  {
    content: 'abandoned children find their way home',
    tale_slug: 'hansel-and-gretel',
    motif: 'abandonment',
  },
  {
    content: 'sibling cooperation defeats a predator',
    tale_slug: 'hansel-and-gretel',
    motif: 'sibling_rescue',
  },
  {
    content: 'oppressed girl recognized by a lost shoe',
    tale_slug: 'cinderella',
    motif: 'recognition',
  },
  {
    content: 'false bride is exposed by ritual proof',
    tale_slug: 'the-goose-girl',
    motif: 'false_bride',
  },
  {
    content: 'curse lifts after long enchanted sleep',
    tale_slug: 'briar-rose',
    motif: 'curse_release',
  },
  {
    content: 'tower isolation breaks into exile and reunion',
    tale_slug: 'rapunzel',
    motif: 'imprisonment',
  },
  {
    content: 'predator disguise creates household danger',
    tale_slug: 'little-red-riding-hood',
    motif: 'predator_disguise',
  },
  {
    content: 'wolf impersonates trusted family voice',
    tale_slug: 'the-wolf-and-seven-kids',
    motif: 'predator_disguise',
  },
  {
    content: 'helper bargain is broken by learning a name',
    tale_slug: 'rumpelstiltskin',
    motif: 'name_bargain',
  },
  {
    content: 'wish escalation collapses back to poverty',
    tale_slug: 'the-fishermans-wife',
    motif: 'wish_escalation',
  },
]

function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`
}

function vectorLiteral(values: ArrayLike<number>): string {
  return `[${Array.from(values, (value) => Number(value).toFixed(6)).join(', ')}]`
}

function normalize(values: number[]): number[] {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0))
  if (!Number.isFinite(magnitude) || magnitude === 0) return values
  return values.map((value) => value / magnitude)
}

env.allowRemoteModels = process.env.TRANSFORMERS_OFFLINE === '1' ? false : true

const extractor = await pipeline('feature-extraction', MODEL)
const vectorPayloads: Array<{
  dense: number[]
  content: string
  metadata: { tale_slug: string; motif: string; model: string; dimension: number; source_dimension: number }
}> = []
const sqlRows: string[] = []

for (const item of motifs) {
  const output = await extractor(item.content, { pooling: 'mean', normalize: true })
  const sourceDense = Array.from(output.data, (value) => Number(value))
  const dense = normalize(sourceDense.slice(0, TARGET_DIMENSION)).map((value) => Number(value.toFixed(6)))
  vectorPayloads.push({
    dense,
    content: item.content,
    metadata: {
      tale_slug: item.tale_slug,
      motif: item.motif,
      model: MODEL,
      dimension: dense.length,
      source_dimension: sourceDense.length,
    },
  })
  sqlRows.push(
    `  (${vectorLiteral(output.data)}, ${sqlString(item.content)}, ${sqlString(item.tale_slug)}, ${sqlString(item.motif)})`,
  )
}

if (process.argv.includes('--sql')) {
  console.log(`INSERT INTO motif_vectors VECTOR (embedding, content, tale_slug, motif) VALUES\n${sqlRows.join(',\n')}`)
} else {
  console.log(JSON.stringify({ items: vectorPayloads }))
}
