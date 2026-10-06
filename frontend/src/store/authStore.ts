import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

type AuthState = {
  user: User | null
  accessToken: string | null
  setSession: (user: User, accessToken: string) => void
  clearSession: () => void
}

/** Sessão (usuário e token), mantida em localStorage para sobreviver ao recarregamento. */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setSession: (user, accessToken) => set({ user, accessToken }),
      clearSession: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'ditado-session',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    },
  ),
)
