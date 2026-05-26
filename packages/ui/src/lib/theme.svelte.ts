export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'red-ui-theme'
const DEFAULT: Theme = 'light'

function read(): Theme {
  if (typeof localStorage === 'undefined') return DEFAULT
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'dark' || v === 'light' ? v : DEFAULT
}

function apply(t: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = t
}

function persist(t: Theme) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, t)
}

class ThemeStore {
  current = $state<Theme>(DEFAULT)

  init() {
    this.current = read()
    apply(this.current)
  }

  set(t: Theme) {
    this.current = t
    apply(t)
    persist(t)
  }

  toggle() {
    this.set(this.current === 'dark' ? 'light' : 'dark')
  }
}

export const theme = new ThemeStore()
