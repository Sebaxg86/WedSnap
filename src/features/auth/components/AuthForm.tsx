import { Link } from 'react-router-dom'
import type { FormEvent } from 'react'

export type AuthMode = 'signin' | 'signup'

type AuthFormProps = {
  email: string
  errorMessage: string | null
  infoMessage: string | null
  isSubmitting: boolean
  mode: AuthMode
  onEmailChange: (value: string) => void
  onModeChange: (mode: AuthMode) => void
  onPasswordChange: (value: string) => void
  onSubmit: () => Promise<void>
  password: string
}

export function AuthForm({
  email,
  errorMessage,
  infoMessage,
  isSubmitting,
  mode,
  onEmailChange,
  onModeChange,
  onPasswordChange,
  onSubmit,
  password,
}: AuthFormProps) {
  const isSignUp = mode === 'signup'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit()
  }

  return (
    <article className="panel auth-card">
      <div className="auth-card__header">
        <p className="eyebrow">Acceso privado</p>
        <h1 className="page-title auth-card__title">
          {isSignUp ? 'Crea tu cuenta y empieza a organizar.' : 'Entra a tu panel privado.'}
        </h1>
        <p className="page-lead auth-card__lead">
          {isSignUp
            ? 'Abre tu espacio WeddVue, crea eventos y genera QRs por mesa para recibir fotos privadas.'
            : 'Inicia sesion para volver a tu dashboard, administrar tus eventos y compartir los QRs de cada mesa.'}
        </p>
      </div>

      <div className="auth-switch" aria-label="Modo de acceso" role="tablist">
        <button
          aria-selected={!isSignUp}
          className={
            !isSignUp
              ? 'auth-switch__button auth-switch__button--active'
              : 'auth-switch__button'
          }
          onClick={() => onModeChange('signin')}
          role="tab"
          type="button"
        >
          Iniciar sesion
        </button>
        <button
          aria-selected={isSignUp}
          className={
            isSignUp
              ? 'auth-switch__button auth-switch__button--active'
              : 'auth-switch__button'
          }
          onClick={() => onModeChange('signup')}
          role="tab"
          type="button"
        >
          Crear cuenta
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label className="field-label" htmlFor="auth-email">
            Correo
          </label>
          <input
            autoComplete="email"
            className="text-input"
            id="auth-email"
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="tu-correo@ejemplo.com"
            type="email"
            value={email}
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="auth-password">
            Contrasena
          </label>
          <input
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            className="text-input"
            id="auth-password"
            minLength={8}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="Minimo 8 caracteres"
            type="password"
            value={password}
          />
        </div>

        {errorMessage ? (
          <p className="notice-banner notice-banner--error">{errorMessage}</p>
        ) : null}

        {infoMessage ? (
          <p className="notice-banner notice-banner--success">{infoMessage}</p>
        ) : null}

        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting
            ? isSignUp
              ? 'Creando cuenta...'
              : 'Entrando...'
            : isSignUp
              ? 'Crear mi cuenta'
              : 'Entrar a mi dashboard'}
        </button>
      </form>

      <p className="helper-copy">
        Al continuar, tu panel privado sera el lugar para crear eventos, configurar
        mesas y descargar recuerdos.
      </p>

      <div className="button-row">
        <Link className="button button--secondary" to="/">
          Volver al inicio
        </Link>
      </div>
    </article>
  )
}
