import { startTransition, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AuthForm, type AuthMode } from '@/features/auth/components/AuthForm'
import { hasSupabaseConfig } from '@/lib/config/env'
import { supabase } from '@/lib/supabase/client'
import {
  isAccountSession,
  useSupabaseSession,
} from '@/lib/supabase/useSupabaseSession'

const authHighlights = [
  'Crea un espacio privado para cada boda o celebracion.',
  'Genera codigos QR por mesa y comparte el enlace correcto.',
  'Administra todos tus eventos desde un dashboard pensado para movil.',
]

export function AuthPage() {
  const navigate = useNavigate()
  const { errorMessage: sessionErrorMessage, isLoading, session } = useSupabaseSession()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isAccountSession(session)) {
      startTransition(() => {
        navigate('/dashboard', { replace: true })
      })
    }
  }, [navigate, session])

  async function handleSubmit() {
    if (!supabase) {
      return
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || password.trim().length < 8) {
      setErrorMessage('Escribe un correo valido y una contrasena de al menos 8 caracteres.')
      setInfoMessage(null)
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setInfoMessage(null)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (error) {
        setErrorMessage(error.message)
      }

      setIsSubmitting(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    })

    if (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    if (isAccountSession(data.session ?? null)) {
      startTransition(() => {
        navigate('/dashboard', { replace: true })
      })
    } else {
      setInfoMessage(
        'Tu cuenta fue creada. Si tu proyecto pide confirmacion por correo, confirma tu email antes de entrar.',
      )
      setMode('signin')
    }

    setIsSubmitting(false)
  }

  if (!hasSupabaseConfig) {
    return (
      <section className="panel panel--centered">
        <p className="eyebrow">Configuracion requerida</p>
        <h1 className="page-title">Faltan las variables publicas de Supabase.</h1>
        <p className="page-lead">
          Agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en tu archivo
          `.env` para habilitar el acceso de cuentas.
        </p>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="panel panel--centered">
        <p className="eyebrow">Acceso</p>
        <h1 className="page-title">Preparando tu cuenta...</h1>
      </section>
    )
  }

  return (
    <section className="page-grid auth-page">
      <div className="page-copy auth-page__copy">
        <p className="eyebrow">WeddVue para cualquier boda</p>
        <h1 className="page-title auth-page__title">
          De la landing al dashboard, sin rutas raras ni pasos escondidos.
        </h1>
        <p className="page-lead auth-page__lead">
          La pareja entra por el dominio principal, crea su cuenta y administra
          sus eventos. Los invitados solo ven el formulario de subida cuando
          escanean el QR correcto de su mesa.
        </p>

        <ul className="feature-list">
          {authHighlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>

        {sessionErrorMessage ? (
          <p className="notice-banner notice-banner--error">{sessionErrorMessage}</p>
        ) : null}
      </div>

      <AuthForm
        email={email}
        errorMessage={errorMessage}
        infoMessage={infoMessage}
        isSubmitting={isSubmitting}
        mode={mode}
        onEmailChange={setEmail}
        onModeChange={(nextMode) => {
          setMode(nextMode)
          setErrorMessage(null)
          setInfoMessage(null)
        }}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
        password={password}
      />
    </section>
  )
}
