import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { describeAuthError } from '@/lib/errors'
import { getGoogleConfig, loginWithGoogle } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'

const GIS_SRC = 'https://accounts.google.com/gsi/client'

let scriptPromise: Promise<void> | null = null

/** Carrega o script oficial do Google uma única vez. Rejeita se a rede bloquear o script. */
function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const fail = () => {
      scriptPromise = null
      document.querySelector(`script[src="${GIS_SRC}"]`)?.remove()
      reject(new Error('Não foi possível carregar o script do Google.'))
    }
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => (window.google?.accounts?.id ? resolve() : fail())
    script.onerror = fail
    document.head.appendChild(script)
  })
  return scriptPromise
}

type GoogleSignInButtonProps = {
  /** Texto do botão renderizado pelo Google. */
  text?: 'signin_with' | 'signup_with' | 'continue_with'
}

/**
 * Separador "ou" e botão "Entrar com Google" (Google Identity Services).
 * Só aparece quando o backend informa o client ID; sem ele, ou se o script
 * do Google não carregar, não renderiza nada e o formulário segue normal.
 */
export function GoogleSignInButton({ text = 'continue_with' }: GoogleSignInButtonProps) {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const [scriptFailed, setScriptFailed] = useState(false)

  // 404 significa "não configurado": sem nova tentativa e sem erro na tela.
  const config = useQuery({
    queryKey: ['google-config'],
    queryFn: getGoogleConfig,
    staleTime: Infinity,
    retry: (failureCount, error) =>
      !(axios.isAxiosError(error) && error.response?.status === 404) && failureCount < 1,
  })
  const clientId = config.data?.clientId

  const mutation = useMutation({
    mutationFn: loginWithGoogle,
    onSuccess: ({ user, accessToken }) => {
      setSession(user, accessToken)
      navigate('/app', { replace: true })
    },
  })

  // O callback do Google é registrado uma vez; esta ref mantém a mutação atual.
  const submitRef = useRef(mutation.mutate)
  useEffect(() => {
    submitRef.current = mutation.mutate
  })

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    loadGoogleScript().then(
      () => {
        if (!cancelled) setScriptReady(true)
      },
      () => {
        if (!cancelled) setScriptFailed(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [clientId])

  useEffect(() => {
    const container = containerRef.current
    if (!clientId || !scriptReady || !container || !window.google) return
    window.google.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      callback: (response) => submitRef.current(response.credential),
    })
    container.replaceChildren()
    window.google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      text,
      shape: 'rectangular',
      locale: 'pt-BR',
      width: Math.min(400, Math.max(200, container.clientWidth || 384)),
    })
    return () => container.replaceChildren()
  }, [clientId, scriptReady, text])

  if (!clientId || scriptFailed) return null

  return (
    <div className="mt-5 space-y-5">
      <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span>ou</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      {mutation.isError ? (
        <p role="alert" className="border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {describeAuthError(mutation.error, { 400: 'Não foi possível entrar com o Google. Tente de novo.' })}
        </p>
      ) : null}
      <div ref={containerRef} className={mutation.isPending ? 'hidden' : 'flex justify-center'} />
      {mutation.isPending ? (
        <p role="status" className="text-center text-sm text-muted-foreground">
          Validando com o Google...
        </p>
      ) : null}
    </div>
  )
}
