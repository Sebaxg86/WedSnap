import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'

import { AdminLoginForm } from '@/features/admin/components/AdminLoginForm'
import { EventSetupPanel } from '@/features/admin/components/EventSetupPanel'
import { TableQrCard } from '@/features/admin/components/TableQrCard'
import type {
  AdminEvent,
  TableQrRecord,
} from '@/features/admin/lib/adminTypes'
import { generateQrToken } from '@/features/admin/lib/generateQrToken'
import { hasSupabaseConfig } from '@/lib/config/env'
import { supabase } from '@/lib/supabase/client'

type StatusMessage = {
  text: string
  tone: 'error' | 'success'
}

export function AdminDashboardPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [activeEvent, setActiveEvent] = useState<AdminEvent | null>(null)
  const [tables, setTables] = useState<TableQrRecord[]>([])
  const [tableQuery, setTableQuery] = useState('')
  const [targetTableCount, setTargetTableCount] = useState('20')
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(() => Boolean(supabase))
  const [isGeneratingTables, setIsGeneratingTables] = useState(false)
  const [busyTableId, setBusyTableId] = useState<string | null>(null)
  const [hasAdminAccess, setHasAdminAccess] = useState<boolean | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)

  async function loadDashboardData(userId: string) {
    if (!supabase) {
      return
    }

    const { data: adminProfile, error: adminProfileError } = await supabase
      .from('admin_profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()

    if (adminProfileError) {
      setStatusMessage({ text: adminProfileError.message, tone: 'error' })
      return
    }

    if (!adminProfile) {
      setHasAdminAccess(false)
      setActiveEvent(null)
      setTables([])
      setStatusMessage({
        text: 'Esta cuenta no esta registrada como administradora de la boda.',
        tone: 'error',
      })
      return
    }

    setHasAdminAccess(true)
    setStatusMessage(null)

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, slug, title, event_date, is_active')
      .eq('is_active', true)
      .order('event_date', { ascending: true })
      .limit(1)

    if (eventsError) {
      setStatusMessage({ text: eventsError.message, tone: 'error' })
      return
    }

    const nextEvent = events[0] ?? null
    setActiveEvent(nextEvent)

    if (!nextEvent) {
      setTables([])
      setStatusMessage({
        text: 'No se encontro un evento activo. Primero inserta o activa el evento en Supabase.',
        tone: 'error',
      })
      return
    }

    const { data: qrCodes, error: qrCodesError } = await supabase
      .from('qr_codes')
      .select(
        'id, event_id, table_number, table_label, guest_group_name, token, is_active, scan_count, last_scanned_at',
      )
      .eq('event_id', nextEvent.id)
      .order('table_number', { ascending: true })

    if (qrCodesError) {
      setStatusMessage({ text: qrCodesError.message, tone: 'error' })
      return
    }

    setTables(qrCodes)

    if (qrCodes.length > 0) {
      setTargetTableCount(String(qrCodes.length))
    }
  }

  useEffect(() => {
    if (!supabase) {
      return
    }

    const client = supabase
    let isMounted = true

    async function bootstrapSession() {
      const { data, error } = await client.auth.getSession()

      if (!isMounted) {
        return
      }

      const nextSession = data.session ?? null
      setSession(nextSession)

      if (!nextSession) {
        setHasAdminAccess(null)
        setActiveEvent(null)
        setTables([])
      } else {
        await loadDashboardData(nextSession.user.id)
      }

      if (error) {
        setStatusMessage({ text: error.message, tone: 'error' })
      }

      if (isMounted) {
        setIsBootstrapping(false)
      }
    }

    void bootstrapSession()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthError(null)

      if (!nextSession) {
        setHasAdminAccess(null)
        setActiveEvent(null)
        setTables([])
        setIsBootstrapping(false)
        return
      }

      setIsBootstrapping(true)

      void (async () => {
        await loadDashboardData(nextSession.user.id)

        if (isMounted) {
          setIsBootstrapping(false)
        }
      })()
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSignIn(credentials: { email: string; password: string }) {
    if (!supabase) {
      return
    }

    setIsAuthSubmitting(true)
    setAuthError(null)

    const { error } = await supabase.auth.signInWithPassword(credentials)

    if (error) {
      setAuthError(error.message)
    }

    setIsAuthSubmitting(false)
  }

  async function handleSignOut() {
    if (!supabase) {
      return
    }

    await supabase.auth.signOut()
    setStatusMessage(null)
  }

  async function handleGenerateMissingTables() {
    if (!supabase || !activeEvent || !session) {
      return
    }

    const desiredCount = Number(targetTableCount)

    if (!Number.isInteger(desiredCount) || desiredCount <= 0) {
      setStatusMessage({
        text: 'Escribe un numero de mesas valido mayor a cero.',
        tone: 'error',
      })
      return
    }

    setIsGeneratingTables(true)
    setStatusMessage(null)

    const existingNumbers = new Set(tables.map((table) => table.table_number))
    const missingRows = Array.from({ length: desiredCount }, (_, index) => index + 1)
      .filter((tableNumber) => !existingNumbers.has(tableNumber))
      .map((tableNumber) => ({
        event_id: activeEvent.id,
        guest_group_name: null,
        is_active: true,
        table_label: `Mesa ${tableNumber}`,
        table_number: tableNumber,
        token: generateQrToken(),
      }))

    if (missingRows.length === 0) {
      setStatusMessage({
        text: 'No hay mesas faltantes. Todo ya esta configurado hasta ese numero.',
        tone: 'success',
      })
      setIsGeneratingTables(false)
      return
    }

    const { error } = await supabase.from('qr_codes').insert(missingRows)

    if (error) {
      setStatusMessage({ text: error.message, tone: 'error' })
      setIsGeneratingTables(false)
      return
    }

    await loadDashboardData(session.user.id)
    setStatusMessage({
      text: `${missingRows.length} ${missingRows.length === 1 ? 'mesa fue creada' : 'mesas fueron creadas'} correctamente.`,
      tone: 'success',
    })
    setIsGeneratingTables(false)
  }

  async function handleSaveTable(
    table: TableQrRecord,
    updates: { guest_group_name: string | null; is_active: boolean },
  ) {
    if (!supabase || !session) {
      return
    }

    setBusyTableId(table.id)
    setStatusMessage(null)

    const { error } = await supabase
      .from('qr_codes')
      .update({
        guest_group_name: updates.guest_group_name,
        is_active: updates.is_active,
      })
      .eq('id', table.id)

    if (error) {
      setStatusMessage({ text: error.message, tone: 'error' })
      setBusyTableId(null)
      return
    }

    await loadDashboardData(session.user.id)
    setStatusMessage({
      text: `La mesa ${table.table_number} se actualizo correctamente.`,
      tone: 'success',
    })
    setBusyTableId(null)
  }

  async function handleRegenerateToken(table: TableQrRecord) {
    if (!supabase || !session) {
      return
    }

    setBusyTableId(table.id)
    setStatusMessage(null)

    const { error } = await supabase
      .from('qr_codes')
      .update({
        token: generateQrToken(),
      })
      .eq('id', table.id)

    if (error) {
      setStatusMessage({ text: error.message, tone: 'error' })
      setBusyTableId(null)
      return
    }

    await loadDashboardData(session.user.id)
    setStatusMessage({
      text: `Se genero un nuevo token para la mesa ${table.table_number}.`,
      tone: 'success',
    })
    setBusyTableId(null)
  }

  if (!hasSupabaseConfig) {
    return (
      <section className="panel panel--centered">
        <p className="eyebrow">Configuracion requerida</p>
        <h1 className="page-title">Faltan las variables publicas de Supabase.</h1>
        <p className="page-lead">
          Agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en tu archivo
          `.env` antes de usar el panel admin.
        </p>
      </section>
    )
  }

  if (isBootstrapping) {
    return (
      <section className="panel panel--centered">
        <p className="eyebrow">Panel admin</p>
        <h1 className="page-title">Cargando configuracion...</h1>
      </section>
    )
  }

  if (!session) {
    return (
      <AdminLoginForm
        errorMessage={authError}
        isSubmitting={isAuthSubmitting}
        onSubmit={handleSignIn}
      />
    )
  }

  if (hasAdminAccess === false) {
    return (
      <section className="panel panel--centered">
        <p className="eyebrow">Acceso restringido</p>
        <h1 className="page-title">Esta cuenta no tiene acceso admin.</h1>
        <p className="page-lead">
          Inicia sesion con la cuenta autorizada en Supabase Auth para administrar
          mesas y codigos QR.
        </p>

        {statusMessage ? (
          <p className="notice-banner notice-banner--error">{statusMessage.text}</p>
        ) : null}

        <div className="button-row">
          <button className="button button--secondary" onClick={handleSignOut} type="button">
            Cerrar sesion
          </button>
        </div>
      </section>
    )
  }

  const baseUploadUrl =
    typeof window === 'undefined'
      ? '/upload'
      : `${window.location.origin}/upload`
  const normalizedTableQuery = tableQuery.trim().toLowerCase()
  const visibleTables = tables.filter((table) => {
    if (normalizedTableQuery.length === 0) {
      return true
    }

    return [
      String(table.table_number),
      table.table_label,
      table.guest_group_name ?? '',
      table.token,
    ].some((value) => value.toLowerCase().includes(normalizedTableQuery))
  })

  return (
    <section className="admin-dashboard">
      {activeEvent ? (
        <EventSetupPanel
          activeTablesCount={tables.filter((table) => table.is_active).length}
          event={activeEvent}
          isGenerating={isGeneratingTables}
          onDesiredTableCountChange={setTargetTableCount}
          onGenerateMissingTables={handleGenerateMissingTables}
          onSignOut={handleSignOut}
          statusMessage={statusMessage}
          tables={tables}
          targetTableCount={targetTableCount}
        />
      ) : (
        <article className="panel">
          <h2 className="panel-title">No hay un evento activo</h2>
          <p className="panel-subtitle">
            Inserta primero el evento y el admin en Supabase para usar este panel.
          </p>
        </article>
      )}

      <section className="admin-dashboard__tables">
        <div className="admin-dashboard__tables-header">
          <div className="admin-dashboard__tables-heading">
            <p className="eyebrow">Mesas y QR</p>
            <h2 className="panel-title">Configura cada mesa con claridad.</h2>
            <p className="helper-copy">
              Mostrando {visibleTables.length} de {tables.length} mesas. Puedes
              buscar por numero, familia o token.
            </p>
          </div>

          <div className="field-group admin-dashboard__search">
            <label className="field-label" htmlFor="table-search">
              Buscar una mesa
            </label>
            <input
              className="text-input"
              id="table-search"
              inputMode="search"
              onChange={(event) => setTableQuery(event.target.value)}
              placeholder="Mesa 12 o Familia Hernandez"
              type="search"
              value={tableQuery}
            />
          </div>
        </div>

        {tables.length === 0 ? (
          <article className="panel">
            <p className="panel-subtitle">
              Aun no existen mesas QR. Crea el primer bloque desde la tarjeta del
              evento.
            </p>
          </article>
        ) : visibleTables.length === 0 ? (
          <article className="panel">
            <h2 className="panel-title">No hay mesas que coincidan.</h2>
            <p className="panel-subtitle">
              Prueba con un numero de mesa, un apellido o borra la busqueda para
              volver a ver todas las tarjetas.
            </p>
          </article>
        ) : (
          <div className="admin-dashboard__tables-grid">
            {visibleTables.map((table) => (
              <TableQrCard
                baseUploadUrl={baseUploadUrl}
                isBusy={busyTableId === table.id}
                key={table.id}
                onRegenerateToken={handleRegenerateToken}
                onSave={handleSaveTable}
                table={table}
              />
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
