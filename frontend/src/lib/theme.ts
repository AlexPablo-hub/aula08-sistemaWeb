// Lógica pura do tema (claro/escuro), sem React.
//
// ATENÇÃO: o script inline de `index.html` (que roda antes do React, para a
// página não piscar o tema errado) repete esta lógica. Os dois precisam
// concordar na chave (`ditado-theme`) e nos valores ('light' | 'dark', texto
// simples, sem JSON). Se mudar um, mude o outro.

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'ditado-theme'

/** Aceita somente 'light' ou 'dark'; qualquer outro valor vira null (sem escolha). */
export function parseTheme(value: unknown): Theme | null {
  return value === 'light' || value === 'dark' ? value : null
}

/** Tema efetivo: a escolha salva, se válida; senão, a preferência do sistema. */
export function resolveTheme(stored: unknown, systemDark: boolean): Theme {
  return parseTheme(stored) ?? (systemDark ? 'dark' : 'light')
}

/** Lê a escolha salva. localStorage pode falhar (modo privado, bloqueio): nesse caso, sem escolha. */
export function readStoredTheme(): Theme | null {
  try {
    return parseTheme(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return null
  }
}

/** Grava a escolha (ou apaga, com null). Falhas são ignoradas: o tema só não persiste. */
export function writeStoredTheme(theme: Theme | null): void {
  try {
    if (theme === null) localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // sem armazenamento: a escolha vale só até recarregar
  }
}

/** O sistema operacional prefere o tema escuro? */
export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}
