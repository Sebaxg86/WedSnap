import { useState } from 'react'
import type { FormEvent } from 'react'

type AdminLoginFormProps = {
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (credentials: { email: string; password: string }) => Promise<void>
}

export function AdminLoginForm({
  errorMessage,
  isSubmitting,
  onSubmit,
}: AdminLoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit({ email, password })
  }

  return (
    <section className="admin-auth">
      <article className="panel panel--centered admin-auth__panel">
        <p className="eyebrow">Acceso admin</p>
        <h1 className="page-title admin-auth__title">Entra al panel de la boda.</h1>
        <p className="page-lead admin-auth__lead">
          Inicia sesion con la cuenta admin que creaste en Supabase Auth. Esta
          vista esta optimizada para ser comoda desde iPhone y Android.
        </p>

        <form className="admin-auth__form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label" htmlFor="admin-email">
              Correo admin
            </label>
            <input
              autoComplete="email"
              className="text-input"
              id="admin-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu-correo@ejemplo.com"
              type="email"
              value={email}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="admin-password">
              Contrasena
            </label>
            <input
              autoComplete="current-password"
              className="text-input"
              id="admin-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tu contrasena segura"
              type="password"
              value={password}
            />
          </div>

          {errorMessage ? (
            <p className="notice-banner notice-banner--error">{errorMessage}</p>
          ) : null}

          <button className="button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </article>
    </section>
  )
}
