import { useEffect, useRef, useState } from 'react'

import type { TableQrRecord } from '@/features/admin/lib/adminTypes'

type TableQrCardProps = {
  baseUploadUrl: string
  isBusy: boolean
  onRegenerateToken: (table: TableQrRecord) => Promise<void>
  onSave: (
    table: TableQrRecord,
    updates: { guest_group_name: string | null; is_active: boolean },
  ) => Promise<void>
  table: TableQrRecord
}

type LocalMessage = {
  text: string
  tone: 'error' | 'success'
}

function formatLastScan(lastScannedAt: string | null) {
  if (!lastScannedAt) {
    return 'Aun sin escaneos'
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(lastScannedAt))
}

function sanitizeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function TableQrCard({
  baseUploadUrl,
  isBusy,
  onRegenerateToken,
  onSave,
  table,
}: TableQrCardProps) {
  const [groupName, setGroupName] = useState(table.guest_group_name ?? '')
  const [isActive, setIsActive] = useState(table.is_active)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [isGeneratingQr, setIsGeneratingQr] = useState(true)
  const [localMessage, setLocalMessage] = useState<LocalMessage | null>(null)
  const dismissTimerRef = useRef<number | null>(null)

  useEffect(() => {
    setGroupName(table.guest_group_name ?? '')
    setIsActive(table.is_active)
  }, [table.guest_group_name, table.is_active])

  const uploadUrl = `${baseUploadUrl}?t=${encodeURIComponent(table.token)}`
  const canShareFromDevice =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const normalizedGroupName = groupName.trim()
  const hasPendingChanges =
    normalizedGroupName !== (table.guest_group_name ?? '') || isActive !== table.is_active
  const fileLabel =
    (table.guest_group_name ? sanitizeFileName(table.guest_group_name) : '') ||
    `mesa-${table.table_number}`
  const qrFileName = `wedsnap-${fileLabel}-qr.png`

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        window.clearTimeout(dismissTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    async function generateQrImage() {
      setIsGeneratingQr(true)

      try {
        const { default: QRCode } = await import('qrcode')
        const nextQrDataUrl = await QRCode.toDataURL(uploadUrl, {
          color: {
            dark: '#2f2a25',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 440,
        })

        if (!isCancelled) {
          setQrDataUrl(nextQrDataUrl)
        }
      } catch {
        if (!isCancelled) {
          setQrDataUrl('')
        }
      } finally {
        if (!isCancelled) {
          setIsGeneratingQr(false)
        }
      }
    }

    void generateQrImage()

    return () => {
      isCancelled = true
    }
  }, [uploadUrl])

  function pushLocalMessage(message: LocalMessage) {
    if (dismissTimerRef.current) {
      window.clearTimeout(dismissTimerRef.current)
    }

    setLocalMessage(message)
    dismissTimerRef.current = window.setTimeout(() => {
      setLocalMessage(null)
      dismissTimerRef.current = null
    }, 2400)
  }

  async function handleSave() {
    await onSave(table, {
      guest_group_name: normalizedGroupName ? normalizedGroupName : null,
      is_active: isActive,
    })
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(uploadUrl)
      pushLocalMessage({ text: 'Enlace copiado.', tone: 'success' })
    } catch {
      pushLocalMessage({
        text: 'No fue posible copiar el enlace en este navegador.',
        tone: 'error',
      })
    }
  }

  function handleDownload() {
    if (!qrDataUrl) {
      return
    }

    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = qrFileName
    link.click()
  }

  async function handleShareQr() {
    if (!qrDataUrl) {
      return
    }

    if (canShareFromDevice) {
      try {
        const response = await fetch(qrDataUrl)
        const qrBlob = await response.blob()
        const qrFile = new File([qrBlob], qrFileName, { type: qrBlob.type || 'image/png' })

        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [qrFile] })) {
          await navigator.share({
            files: [qrFile],
            text: uploadUrl,
            title: `QR de la mesa ${table.table_number}`,
          })
        } else {
          await navigator.share({
            text: uploadUrl,
            title: `QR de la mesa ${table.table_number}`,
            url: uploadUrl,
          })
        }

        pushLocalMessage({
          text: 'QR listo para compartir.',
          tone: 'success',
        })
        return
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
      }
    }

    if (typeof window !== 'undefined') {
      const shareWindow = window.open(qrDataUrl, '_blank', 'noopener,noreferrer')

      if (shareWindow) {
        pushLocalMessage({
          text: 'QR abierto en una nueva pestana.',
          tone: 'success',
        })
        return
      }
    }

    pushLocalMessage({
      text: 'No fue posible abrir el QR en este dispositivo.',
      tone: 'error',
    })
  }

  return (
    <article className="panel table-card">
      <div className="table-card__header">
        <div>
          <p className="eyebrow">Mesa {table.table_number}</p>
          <h2 className="panel-title">{table.table_label}</h2>
        </div>
        <label className="toggle-field">
          <input
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            type="checkbox"
          />
          <span>{isActive ? 'Activa' : 'Inactiva'}</span>
        </label>
      </div>

      <div className="table-card__qr-frame">
        {isGeneratingQr ? (
          <div className="table-card__qr-placeholder">Generando QR...</div>
        ) : qrDataUrl ? (
          <img
            alt={`QR de la mesa ${table.table_number}`}
            className="table-card__qr-image"
            src={qrDataUrl}
          />
        ) : (
          <div className="table-card__qr-placeholder">No se pudo renderizar el QR</div>
        )}
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor={`group-name-${table.id}`}>
          Familia o grupo
        </label>
        <input
          className="text-input"
          id={`group-name-${table.id}`}
          onChange={(event) => setGroupName(event.target.value)}
          placeholder="Ejemplo: Familia Hernandez"
          type="text"
          value={groupName}
        />
      </div>

      <div className="table-card__meta">
        <div className="info-card">
          <span className="info-label">Token</span>
          <strong className="info-value table-card__token">{table.token}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">Escaneos</span>
          <strong className="info-value">{table.scan_count}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">Ultimo escaneo</span>
          <strong className="info-value table-card__date">
            {formatLastScan(table.last_scanned_at)}
          </strong>
        </div>
      </div>

      <div className="table-card__actions">
        <button
          className="button"
          disabled={isBusy || !hasPendingChanges}
          onClick={handleSave}
          type="button"
        >
          Guardar mesa
        </button>
        <button
          className="button button--secondary"
          disabled={!qrDataUrl || isBusy}
          onClick={handleShareQr}
          type="button"
        >
          {canShareFromDevice ? 'Compartir QR' : 'Abrir QR'}
        </button>
        <button
          className="button button--secondary"
          disabled={isBusy}
          onClick={() => onRegenerateToken(table)}
          type="button"
        >
          Regenerar token
        </button>
        <button
          className="button button--secondary"
          disabled={!qrDataUrl || isBusy}
          onClick={handleDownload}
          type="button"
        >
          Descargar QR
        </button>
        <button
          className="button button--secondary"
          disabled={isBusy}
          onClick={handleCopyLink}
          type="button"
        >
          Copiar enlace
        </button>
      </div>

      <p className="helper-copy table-card__url">{uploadUrl}</p>

      {localMessage ? (
        <p
          className={
            localMessage.tone === 'error'
              ? 'notice-banner notice-banner--error'
              : 'notice-banner notice-banner--success'
          }
        >
          {localMessage.text}
        </p>
      ) : null}
    </article>
  )
}
