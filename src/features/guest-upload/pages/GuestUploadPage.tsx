import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { PhotoSelectionSummary } from '@/features/guest-upload/components/PhotoSelectionSummary'
import { UploadDropzone } from '@/features/guest-upload/components/UploadDropzone'
import {
  fetchGuestUploadContext,
  submitGuestUpload,
  type GuestUploadContext,
  type GuestUploadProgress,
  type SubmitGuestUploadResult,
} from '@/features/guest-upload/lib/guestUploadService'
import {
  guestUploadSchema,
  MAX_FILES_PER_BATCH,
} from '@/features/guest-upload/lib/guestUploadSchema'
import { hasSupabaseConfig } from '@/lib/config/env'
import { getDeviceContext } from '@/lib/device/getDeviceContext'
import { formatFileSize } from '@/shared/utils/formatFileSize'

const uploadPromises = [
  'Sin registro ni pasos complicados para los invitados.',
  'Las fotos quedan privadas para los novios.',
  'Cada lote conserva trazabilidad por mesa, nombre y dispositivo.',
]

type StatusMessage = {
  text: string
  tone: 'error' | 'success'
}

function formatEventDate(eventDate: string | null) {
  if (!eventDate) {
    return 'Fecha pendiente'
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${eventDate}T00:00:00`))
}

export function GuestUploadPage() {
  const [searchParams] = useSearchParams()
  const [guestName, setGuestName] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [deviceContext] = useState(() => getDeviceContext())
  const [uploadContext, setUploadContext] = useState<GuestUploadContext | null>(null)
  const [contextError, setContextError] = useState<string | null>(null)
  const [isLoadingContext, setIsLoadingContext] = useState(() =>
    Boolean(hasSupabaseConfig),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)
  const [lastUploadResult, setLastUploadResult] = useState<SubmitGuestUploadResult | null>(null)
  const [uploadProgress, setUploadProgress] = useState<GuestUploadProgress>({
    completed: 0,
    currentFileName: null,
    total: 0,
  })

  const qrToken = searchParams.get('t') ?? ''
  const validation = guestUploadSchema.safeParse({
    guestName,
    files: selectedFiles,
  })
  const validationMessage = validation.success
    ? null
    : validation.error.issues[0]?.message ?? 'Completa los campos requeridos.'

  const totalSelectedSize = selectedFiles.reduce(
    (sum, file) => sum + file.size,
    0,
  )

  useEffect(() => {
    let isCancelled = false

    async function loadUploadContext() {
      if (!hasSupabaseConfig) {
        setIsLoadingContext(false)
        return
      }

      if (!qrToken.trim()) {
        setUploadContext(null)
        setContextError(null)
        setIsLoadingContext(false)
        return
      }

      setIsLoadingContext(true)
      setContextError(null)

      try {
        const nextContext = await fetchGuestUploadContext(qrToken)

        if (!isCancelled) {
          setUploadContext(nextContext)
        }
      } catch (error) {
        if (!isCancelled) {
          const message =
            error instanceof Error
              ? error.message
              : 'No pudimos validar el QR de esta mesa.'

          setUploadContext(null)
          setContextError(message)
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingContext(false)
        }
      }
    }

    void loadUploadContext()

    return () => {
      isCancelled = true
    }
  }, [qrToken])

  function handleFilesSelected(nextFiles: File[]) {
    const imageFiles = nextFiles.filter((file) => file.type.startsWith('image/'))
    const mergedFiles = [...selectedFiles]

    for (const file of imageFiles) {
      const alreadyAdded = mergedFiles.some(
        (existingFile) =>
          existingFile.name === file.name &&
          existingFile.size === file.size &&
          existingFile.lastModified === file.lastModified,
      )

      if (alreadyAdded || mergedFiles.length >= MAX_FILES_PER_BATCH) {
        continue
      }

      mergedFiles.push(file)
    }

    setSelectedFiles(mergedFiles)
    setStatusMessage(null)
    setLastUploadResult(null)
  }

  function handleRemoveFile(indexToRemove: number) {
    setSelectedFiles((currentFiles) =>
      currentFiles.filter((_, index) => index !== indexToRemove),
    )
    setStatusMessage(null)
  }

  async function handleSubmitUpload() {
    if (!validation.success || !uploadContext) {
      return
    }

    setIsSubmitting(true)
    setStatusMessage(null)
    setLastUploadResult(null)
    setUploadProgress({
      completed: 0,
      currentFileName: null,
      total: selectedFiles.length,
    })

    try {
      const result = await submitGuestUpload(
        {
          deviceContext,
          files: selectedFiles,
          guestName,
          qrToken,
        },
        (progress) => setUploadProgress(progress),
      )

      setLastUploadResult(result)
      setSelectedFiles([])
      setStatusMessage({
        text:
          result.failedFileNames.length > 0
            ? `Se subieron ${result.uploadedCount} fotos. Algunas no pudieron procesarse: ${result.failedFileNames.join(', ')}.`
            : `Tus ${result.uploadedCount} fotos se subieron correctamente.`,
        tone: 'success',
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible subir las fotos en este momento.'

      setStatusMessage({
        text: message,
        tone: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!hasSupabaseConfig) {
    return (
      <section className="panel panel--centered">
        <p className="eyebrow">Configuracion requerida</p>
        <h1 className="page-title">Faltan las variables publicas de Supabase.</h1>
        <p className="page-lead">
          Agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en tu archivo
          `.env` para usar el sitio.
        </p>
      </section>
    )
  }

  const isUploadDisabled =
    !validation.success ||
    qrToken.trim().length === 0 ||
    !uploadContext ||
    isLoadingContext ||
    isSubmitting

  return (
    <section className="page-grid">
      <div className="page-copy">
        <p className="eyebrow">Sube tus recuerdos</p>
        <h1 className="page-title">Comparte la boda desde tu mirada.</h1>
        <p className="page-lead">
          Escribe tu nombre, elige tus fotos favoritas y nosotros nos encargamos
          de guardarlas en privado para los novios.
        </p>

        <ul className="feature-list">
          {uploadPromises.map((promise) => (
            <li key={promise}>{promise}</li>
          ))}
        </ul>
      </div>

      <div className="panel-stack">
        <article className="panel panel--highlight">
          <div className="panel-grid">
            <div>
              <h2 className="panel-title">Datos de tu mesa</h2>
              <p className="panel-subtitle">
                Esta informacion se asocia automaticamente al lote que subas.
              </p>
            </div>

            {isLoadingContext ? (
              <p className="helper-copy">Validando el codigo QR...</p>
            ) : contextError ? (
              <p className="notice-banner notice-banner--error">{contextError}</p>
            ) : !qrToken ? (
              <p className="warning-banner">
                Escanea el QR impreso en tu mesa para abrir esta pagina.
              </p>
            ) : uploadContext ? (
              <>
                <div className="info-grid">
                  <div className="info-card">
                    <span className="info-label">Evento</span>
                    <strong className="info-value">{uploadContext.event_title}</strong>
                  </div>
                  <div className="info-card">
                    <span className="info-label">Mesa</span>
                    <strong className="info-value">Mesa {uploadContext.table_number}</strong>
                  </div>
                  <div className="info-card">
                    <span className="info-label">Grupo</span>
                    <strong className="info-value">
                      {uploadContext.guest_group_name || 'Sin nombre asignado'}
                    </strong>
                  </div>
                  <div className="info-card">
                    <span className="info-label">Tamano seleccionado</span>
                    <strong className="info-value">
                      {formatFileSize(totalSelectedSize)}
                    </strong>
                  </div>
                </div>

                <p className="helper-copy">
                  {formatEventDate(uploadContext.event_date)} -{' '}
                  {uploadContext.table_label}
                </p>
              </>
            ) : null}
          </div>
        </article>

        <article className="panel">
          <div className="field-group">
            <label className="field-label" htmlFor="guest-name">
              Tu nombre
            </label>
            <input
              className="text-input"
              id="guest-name"
              maxLength={120}
              onChange={(event) => setGuestName(event.target.value)}
              placeholder="Ejemplo: Sebastian, primo de la novia"
              type="text"
              value={guestName}
            />
          </div>

          <UploadDropzone
            onFilesSelected={handleFilesSelected}
            remainingSlots={MAX_FILES_PER_BATCH - selectedFiles.length}
          />

          <PhotoSelectionSummary
            files={selectedFiles}
            onRemoveFile={handleRemoveFile}
          />

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

          <div className="action-row">
            <button
              className="button"
              disabled={isUploadDisabled}
              onClick={handleSubmitUpload}
              type="button"
            >
              {isSubmitting
                ? `Subiendo ${uploadProgress.completed}/${uploadProgress.total || selectedFiles.length} fotos...`
                : 'Subir fotos'}
            </button>
            <p className="helper-copy">
              {isSubmitting
                ? `Procesando: ${uploadProgress.currentFileName || 'preparando lote'}`
                : validationMessage ||
                  'Puedes subir hasta 10 fotos por lote. Las fotos se guardan en privado.'}
            </p>
          </div>

          {lastUploadResult ? (
            <p className="helper-copy">
              Lote registrado: {lastUploadResult.batchId}
            </p>
          ) : null}
        </article>

        <article className="panel">
          <h2 className="panel-title">Trazabilidad del dispositivo</h2>
          <div className="metric-grid">
            <div className="metric-card">
              <span className="metric-label">Idioma</span>
              <strong className="metric-value">{deviceContext.language}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">Zona horaria</span>
              <strong className="metric-value">{deviceContext.timezone}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">Pantalla</span>
              <strong className="metric-value">
                {deviceContext.screenWidth} x {deviceContext.screenHeight}
              </strong>
            </div>
          </div>
          <p className="helper-copy">
            Estos datos se guardan junto con el lote para mantener la
            trazabilidad de cada subida.
          </p>
        </article>
      </div>
    </section>
  )
}
