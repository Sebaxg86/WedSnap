import { useId } from 'react'

type UploadDropzoneProps = {
  onFilesSelected: (files: File[]) => void
  remainingSlots: number
}

export function UploadDropzone({
  onFilesSelected,
  remainingSlots,
}: UploadDropzoneProps) {
  const inputId = useId()

  return (
    <div className="dropzone">
      <div>
        <p className="dropzone__eyebrow">Fotos de invitados</p>
        <h2 className="panel-title">Elige las fotos de la boda</h2>
        <p className="panel-subtitle">
          Puedes agregar fotos JPG, PNG o HEIC. Antes de subirlas, el sitio las
          optimiza para que el proceso sea mas ligero.
        </p>
      </div>

      <label className="button button--secondary" htmlFor={inputId}>
        Seleccionar fotos
      </label>

      <input
        accept="image/*"
        className="sr-only"
        id={inputId}
        multiple
        onChange={(event) => {
          const nextFiles = Array.from(event.target.files ?? [])
          onFilesSelected(nextFiles)
          event.currentTarget.value = ''
        }}
        type="file"
      />

      <p className="helper-copy">
        Espacios disponibles en este lote: {remainingSlots}
      </p>
    </div>
  )
}
