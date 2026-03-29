import { z } from 'zod'

export const MAX_FILES_PER_BATCH = 10

export const guestUploadSchema = z.object({
  guestName: z
    .string()
    .trim()
    .min(2, 'Escribe al menos 2 caracteres para tu nombre.')
    .max(120, 'El nombre debe tener como máximo 120 caracteres.'),
  files: z
    .array(z.instanceof(File))
    .min(1, 'Selecciona al menos una foto para continuar.')
    .max(
      MAX_FILES_PER_BATCH,
      `Puedes subir hasta ${MAX_FILES_PER_BATCH} fotos por lote.`,
    ),
})
