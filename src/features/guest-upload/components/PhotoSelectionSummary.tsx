import { formatFileSize } from '@/shared/utils/formatFileSize'

type PhotoSelectionSummaryProps = {
  files: File[]
  onRemoveFile: (index: number) => void
}

export function PhotoSelectionSummary({
  files,
  onRemoveFile,
}: PhotoSelectionSummaryProps) {
  if (files.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Aun no has seleccionado fotos.</p>
        <p className="empty-state-copy">
          Puedes subir hasta 10 fotos por lote.
        </p>
      </div>
    )
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0)

  return (
    <div className="selection-summary">
      <div className="selection-summary__header">
        <div>
          <h3 className="panel-title">Fotos seleccionadas</h3>
          <p className="panel-subtitle">
            {files.length} {files.length === 1 ? 'archivo' : 'archivos'} -{' '}
            {formatFileSize(totalSize)}
          </p>
        </div>
      </div>

      <ul className="file-list">
        {files.map((file, index) => (
          <li className="file-list__item" key={`${file.name}-${file.size}-${index}`}>
            <div>
              <p className="file-list__name">{file.name}</p>
              <p className="file-list__meta">{formatFileSize(file.size)}</p>
            </div>
            <button
              className="ghost-button"
              onClick={() => onRemoveFile(index)}
              type="button"
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
