export const colors = {
  bg: { 0: '#07080a', 1: '#0c0e11', 2: '#14171c', 3: '#1c2027' },
  fg: { 0: '#f4f5f7', 1: '#c8ccd4', 2: '#7a8088', 3: '#4a4f57' },
  line: { 1: '#1a1d22', 2: '#262a31', 3: '#353a42' },
  accent: '#ff2056',
  ok: '#4ade80',
  warn: '#fbbf24',
  danger: '#ff5470',
  info: '#60a5fa',
  role: { primary: '#ff2056', replica: '#60a5fa', embedded: '#4ade80' },
} as const

export const radius = { sm: '4px', md: '6px', lg: '10px', xl: '14px' } as const
export const font = {
  sans: "'InterVariable', 'Inter Tight', 'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Berkeley Mono', ui-monospace, monospace",
} as const
export const ease = {
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const
