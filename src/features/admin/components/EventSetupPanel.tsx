import type { FormEvent } from 'react'

import type { AdminEvent, TableQrRecord } from '@/features/admin/lib/adminTypes'

type EventSetupPanelProps = {
  activeTablesCount: number
  event: AdminEvent
  isGenerating: boolean
  onDesiredTableCountChange: (value: string) => void
  onGenerateMissingTables: () => Promise<void>
  onSignOut: () => Promise<void>
  statusMessage: { text: string; tone: 'error' | 'success' } | null
  tables: TableQrRecord[]
  targetTableCount: string
}

function formatEventDate(eventDate: string | null) {
  if (!eventDate) {
    return 'Fecha no configurada'
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${eventDate}T00:00:00`))
}

export function EventSetupPanel({
  activeTablesCount,
  event,
  isGenerating,
  onDesiredTableCountChange,
  onGenerateMissingTables,
  onSignOut,
  statusMessage,
  tables,
  targetTableCount,
}: EventSetupPanelProps) {
  async function handleSubmit(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault()
    await onGenerateMissingTables()
  }

  return (
    <article className="panel panel--highlight admin-setup">
      <div className="admin-setup__header">
        <div>
          <p className="eyebrow">Evento activo</p>
          <h1 className="page-title admin-setup__title">{event.title}</h1>
          <p className="page-lead admin-setup__lead">
            {formatEventDate(event.event_date)} - slug: {event.slug}
          </p>
        </div>

        <button className="button button--secondary" onClick={onSignOut} type="button">
          Cerrar sesion
        </button>
      </div>

      <div className="metric-grid admin-setup__metrics">
        <div className="metric-card">
          <span className="metric-label">Mesas configuradas</span>
          <strong className="metric-value">{tables.length}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">Mesas activas</span>
          <strong className="metric-value">{activeTablesCount}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">Trazabilidad</span>
          <strong className="metric-value">Mesa + familia</strong>
        </div>
      </div>

      <form className="admin-setup__form" onSubmit={handleSubmit}>
        <div className="field-group admin-setup__field">
          <label className="field-label" htmlFor="target-table-count">
            Cuantas mesas tendra el evento
          </label>
          <input
            className="text-input"
            id="target-table-count"
            inputMode="numeric"
            min="1"
            onChange={(eventInput) => onDesiredTableCountChange(eventInput.target.value)}
            placeholder="20"
            type="number"
            value={targetTableCount}
          />
        </div>

        <button className="button" disabled={isGenerating} type="submit">
          {isGenerating ? 'Creando mesas...' : 'Crear mesas faltantes'}
        </button>
      </form>

      <p className="helper-copy">
        Esta accion solo crea las mesas faltantes desde la 1 hasta la N. No
        borra mesas existentes ni sobrescribe nombres de familia.
      </p>

      {statusMessage ? (
        <p
          className={
            statusMessage.tone === 'error'
              ? 'notice-banner notice-banner--error'
              : 'notice-banner notice-banner--success'
          }
        >
          {statusMessage.text}
        </p>
      ) : null}
    </article>
  )
}
