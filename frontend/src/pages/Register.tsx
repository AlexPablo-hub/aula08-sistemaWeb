import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { describeAuthError } from '@/lib/errors'
import { register as registerAccount } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome.')
    .max(100, 'O nome pode ter até 100 caracteres.'),
  email: z
    .string()
    .min(1, 'Informe o e-mail.')
    .email('Informe um e-mail válido.')
    .max(255, 'O e-mail pode ter até 255 caracteres.'),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
})
type FormValues = z.infer<typeof schema>

export default function Register() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setFormError(null)
    try {
      const { user, accessToken } = await registerAccount(values)
      setSession(user, accessToken)
      navigate('/app', { replace: true })
    } catch (error) {
      setFormError(describeAuthError(error, { 409: 'Já existe uma conta com este e-mail.' }))
    }
  }

  return (
    <AuthLayout
      title="Criar conta"
      description="Leva menos de um minuto."
      footer={
        <>
          Já tem conta?{' '}
          <Link to="/entrar" className="font-medium text-primary underline-offset-4 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError ? (
          <p role="alert" className="border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'name-error' : undefined}
            {...register('name')}
          />
          {errors.name ? (
            <p id="name-error" className="text-sm text-destructive">{errors.name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          {errors.email ? (
            <p id="email-error" className="text-sm text-destructive">{errors.email.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby="password-help"
            {...register('password')}
          />
          {errors.password ? (
            <p id="password-help" className="text-sm text-destructive">{errors.password.message}</p>
          ) : (
            <p id="password-help" className="text-sm text-muted-foreground">Mínimo de 8 caracteres.</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Criando conta...' : 'Criar conta'}
        </Button>
      </form>
    </AuthLayout>
  )
}
