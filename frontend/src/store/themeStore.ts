import { create } from 'zustand'
import {
  readStoredTheme,
  resolveTheme,
  systemPrefersDark,
  writeStoredTheme,
  type Theme,
} from '@/lib/theme'

type ThemeState = {
  /** Escolha do usuário; null significa "seguir o sistema operacional". */
  theme: Theme | null
  /** Preferência atual do sistema operacional. */
  systemDark: boolean
  setTheme: (theme: Theme) => void
  toggle: () => void
}

/**
 * Tema da interface. É preferência do navegador (como a sessão), não dado do
 * servidor. A escolha é gravada em localStorage como texto simples, na mesma
 * chave e no mesmo formato que o script de `index.html` lê.
 */
export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: readStoredTheme(),
  systemDark: systemPrefersDark(),
  setTheme: (theme) => {
    writeStoredTheme(theme)
    set({ theme })
  },
  toggle: () => {
    const { theme, systemDark, setTheme } = get()
    setTheme(resolveTheme(theme, systemDark) === 'dark' ? 'light' : 'dark')
  },
}))

/** Tema efetivo (o que está na tela agora). */
export function useEffectiveTheme(): Theme {
  return useThemeStore((s) => resolveTheme(s.theme, s.systemDark))
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

/**
 * Mantém a classe `dark` do <html> igual ao tema efetivo e acompanha mudanças
 * do sistema operacional. Chamada uma vez, antes de montar o React.
 */
export function startThemeSync(): void {
  const sync = () => {
    const { theme, systemDark } = useThemeStore.getState()
    applyTheme(resolveTheme(theme, systemDark))
  }
  sync()
  useThemeStore.subscribe(sync)
  try {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    query.addEventListener('change', (event) => useThemeStore.setState({ systemDark: event.matches }))
  } catch {
    // sem matchMedia: o tema só muda pelo botão
  }
}
