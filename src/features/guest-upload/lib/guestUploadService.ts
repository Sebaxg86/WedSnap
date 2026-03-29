import imageCompression from 'browser-image-compression'
import { UAParser } from 'ua-parser-js'

import type { DeviceContext } from '@/lib/device/getDeviceContext'
import { supabase } from '@/lib/supabase/client'

const GUEST_SESSION_STORAGE_KEY = 'wedsnap_guest_session_id'
const STORAGE_BUCKET = 'fotos-boda'

type UploadBatchStatus = 'completed' | 'failed'

export type GuestUploadContext = {
  event_date: string | null
  event_id: string
  event_title: string
  guest_group_name: string | null
  qr_code_id: string
  table_label: string
  table_number: number
}

type StartGuestUploadResult = GuestUploadContext & {
  batch_id: string
  storage_prefix: string
}

export type GuestUploadProgress = {
  completed: number
  currentFileName: string | null
  total: number
}

export type SubmitGuestUploadParams = {
  deviceContext: DeviceContext
  files: File[]
  guestName: string
  qrToken: string
}

export type SubmitGuestUploadResult = {
  batchId: string
  failedFileNames: string[]
  uploadedCount: number
}

type ImageDimensions = {
  height: number | null
  width: number | null
}

function getGuestSessionId() {
  if (typeof window === 'undefined') {
    return crypto.randomUUID()
  }

  const currentValue = window.sessionStorage.getItem(GUEST_SESSION_STORAGE_KEY)

  if (currentValue) {
    return currentValue
  }

  const nextValue = crypto.randomUUID()
  window.sessionStorage.setItem(GUEST_SESSION_STORAGE_KEY, nextValue)
  return nextValue
}

function getFileExtension(fileName: string, mimeType: string) {
  const normalizedFileName = fileName.trim().toLowerCase()
  const dotIndex = normalizedFileName.lastIndexOf('.')

  if (dotIndex >= 0 && dotIndex < normalizedFileName.length - 1) {
    return normalizedFileName.slice(dotIndex + 1)
  }

  const mimeExtension = mimeType.split('/')[1] ?? 'jpg'
  return mimeExtension.replace('jpeg', 'jpg')
}

function sanitizeFileSegment(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function getImageDimensions(file: File) {
  return new Promise<ImageDimensions>((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ height: null, width: null })
      return
    }

    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      resolve({
        height: image.naturalHeight || null,
        width: image.naturalWidth || null,
      })
      URL.revokeObjectURL(objectUrl)
    }

    image.onerror = () => {
      resolve({ height: null, width: null })
      URL.revokeObjectURL(objectUrl)
    }

    image.src = objectUrl
  })
}

async function compressImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    return file
  }

  try {
    return await imageCompression(file, {
      initialQuality: 0.82,
      maxSizeMB: 3,
      maxWidthOrHeight: 2560,
      preserveExif: false,
      useWebWorker: true,
    })
  } catch {
    return file
  }
}

function getNetworkType() {
  if (typeof navigator === 'undefined') {
    return null
  }

  const connection = (
    navigator as Navigator & {
      connection?: { effectiveType?: string; type?: string }
    }
  ).connection

  return connection?.effectiveType ?? connection?.type ?? null
}

function getDevicePayload(deviceContext: DeviceContext) {
  const parser = new UAParser(deviceContext.userAgent)
  const parsed = parser.getResult()

  return {
    p_browser_name: parsed.browser.name ?? null,
    p_browser_version: parsed.browser.version ?? null,
    p_device_model: parsed.device.model ?? null,
    p_device_type: parsed.device.type ?? null,
    p_device_vendor: parsed.device.vendor ?? null,
    p_language: deviceContext.language,
    p_network_type: getNetworkType(),
    p_os_name: parsed.os.name ?? null,
    p_os_version: parsed.os.version ?? null,
    p_pixel_ratio:
      typeof window !== 'undefined' && window.devicePixelRatio > 0
        ? window.devicePixelRatio
        : null,
    p_referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    p_screen_height: deviceContext.screenHeight || null,
    p_screen_width: deviceContext.screenWidth || null,
    p_timezone: deviceContext.timezone,
    p_user_agent_raw: deviceContext.userAgent,
  }
}

async function ensureGuestSession() {
  if (!supabase) {
    throw new Error('Falta la configuracion publica de Supabase.')
  }

  const { data: existingSessionData, error: existingSessionError } =
    await supabase.auth.getSession()

  if (existingSessionError) {
    throw new Error(existingSessionError.message)
  }

  if (existingSessionData.session) {
    return existingSessionData.session
  }

  const { data, error } = await supabase.auth.signInAnonymously()

  if (error) {
    throw new Error(
      'No fue posible iniciar la sesion anonima. Activa Anonymous Sign-Ins en Supabase Auth.',
    )
  }

  if (!data.session) {
    throw new Error('Supabase no devolvio una sesion anonima valida.')
  }

  return data.session
}

export async function fetchGuestUploadContext(qrToken: string) {
  if (!supabase) {
    throw new Error('Falta la configuracion publica de Supabase.')
  }

  if (!qrToken.trim()) {
    throw new Error('El codigo QR no contiene un token valido.')
  }

  await ensureGuestSession()

  const { data, error } = await supabase
    .rpc('get_guest_upload_context', { p_token: qrToken.trim() })
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'No se pudo validar el codigo QR.')
  }

  return data as GuestUploadContext
}

async function registerUploadedPhoto(params: {
  batchId: string
  capturedAt: string | null
  file: File
  storagePath: string
}) {
  if (!supabase) {
    throw new Error('Falta la configuracion publica de Supabase.')
  }

  const dimensions = await getImageDimensions(params.file)
  const fileExtension = getFileExtension(params.file.name, params.file.type)

  const { error } = await supabase.rpc('register_uploaded_photo', {
    p_batch_id: params.batchId,
    p_captured_at: params.capturedAt,
    p_file_extension: fileExtension,
    p_file_size_bytes: params.file.size,
    p_height: dimensions.height,
    p_mime_type: params.file.type || 'image/jpeg',
    p_original_filename: params.file.name,
    p_storage_path: params.storagePath,
    p_width: dimensions.width,
  })

  if (error) {
    throw new Error(error.message)
  }
}

async function finishGuestUpload(batchId: string, photoCount: number, status: UploadBatchStatus) {
  if (!supabase) {
    throw new Error('Falta la configuracion publica de Supabase.')
  }

  const { error } = await supabase.rpc('finish_guest_upload', {
    p_batch_id: batchId,
    p_photo_count: photoCount,
    p_status: status,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function submitGuestUpload(
  params: SubmitGuestUploadParams,
  onProgress?: (progress: GuestUploadProgress) => void,
) {
  if (!supabase) {
    throw new Error('Falta la configuracion publica de Supabase.')
  }

  const session = await ensureGuestSession()
  const guestSessionId = getGuestSessionId()
  const devicePayload = getDevicePayload(params.deviceContext)

  const { data: startData, error: startError } = await supabase
    .rpc('start_guest_upload', {
      p_guest_name: params.guestName.trim(),
      p_guest_session_id: guestSessionId,
      p_token: params.qrToken.trim(),
      ...devicePayload,
    })
    .single()

  if (startError || !startData) {
    throw new Error(startError?.message ?? 'No se pudo crear el lote de subida.')
  }

  const uploadStart = startData as StartGuestUploadResult

  const failedFileNames: string[] = []
  let uploadedCount = 0

  onProgress?.({
    completed: 0,
    currentFileName: null,
    total: params.files.length,
  })

  for (const originalFile of params.files) {
    let storagePath: string | null = null

    try {
      const preparedFile = await compressImageFile(originalFile)
      const safeBaseName =
        sanitizeFileSegment(originalFile.name.replace(/\.[^.]+$/, '')) || 'foto'
      const extension = getFileExtension(originalFile.name, preparedFile.type || originalFile.type)
      storagePath = `${session.user.id}/${uploadStart.batch_id}/${safeBaseName}-${crypto.randomUUID()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, preparedFile, {
          cacheControl: '3600',
          contentType: preparedFile.type || originalFile.type || 'image/jpeg',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      const capturedAt =
        originalFile.lastModified > 0
          ? new Date(originalFile.lastModified).toISOString()
          : null

      await registerUploadedPhoto({
        batchId: uploadStart.batch_id,
        capturedAt,
        file: preparedFile,
        storagePath,
      })

      uploadedCount += 1
      onProgress?.({
        completed: uploadedCount,
        currentFileName: originalFile.name,
        total: params.files.length,
      })
    } catch {
      if (storagePath) {
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
      }

      failedFileNames.push(originalFile.name)
    }
  }

  await finishGuestUpload(
    uploadStart.batch_id,
    uploadedCount,
    uploadedCount > 0 ? 'completed' : 'failed',
  )

  if (uploadedCount === 0) {
    throw new Error('No fue posible subir las fotos. Revisa la configuracion de Supabase.')
  }

  return {
    batchId: uploadStart.batch_id,
    failedFileNames,
    uploadedCount,
  } satisfies SubmitGuestUploadResult
}
