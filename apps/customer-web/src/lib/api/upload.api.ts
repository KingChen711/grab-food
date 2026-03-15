import axios from 'axios'
import { io } from 'socket.io-client'

import { apiClient } from './client'

export type UploadContext = 'restaurant_cover' | 'restaurant_logo' | 'menu_item' | 'avatar'

export interface UploadRecord {
  id: string
  context: UploadContext
  entityId: string | null
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'
  urls: { thumbnail: string | null; medium: string | null; full: string | null }
  error: string | null
}

// Media service uses TransformInterceptor — all responses are { success, data, timestamp }
type Wrapped<T> = { data: T }

type ProgressStage = 'presigning' | 'uploading' | 'processing' | 'done'

/** Poll until DONE/FAILED — fallback when WebSocket is unavailable */
async function pollUntilDone(
  uploadId: string,
  onProgress?: (stage: ProgressStage) => void,
): Promise<UploadRecord> {
  for (let i = 0; i < 30; i++) {
    await new Promise<void>((r) => setTimeout(r, 1500))
    const record = await uploadApi.getStatus(uploadId)
    onProgress?.('processing')
    if (record.status === 'DONE') return record
    if (record.status === 'FAILED') throw new Error(record.error ?? 'Upload failed')
  }
  throw new Error('Upload timed out')
}

/**
 * Wait for processing via WebSocket (direct connection to media service).
 * Falls back to polling if the WS connection cannot be established within 5 s.
 */
function waitForProcessing(
  uploadId: string,
  onProgress?: (stage: ProgressStage) => void,
): Promise<UploadRecord> {
  const wsUrl = process.env.NEXT_PUBLIC_MEDIA_WS_URL ?? 'http://localhost:3010'

  return new Promise((resolve, reject) => {
    const socket = io(`${wsUrl}/uploads`, {
      transports: ['websocket'],
      reconnection: false,
    })

    let connected = false

    const cleanup = () => {
      clearTimeout(connectTimer)
      clearTimeout(overallTimer)
      socket.disconnect()
    }

    // If no connect event within 5 s, fall back to polling
    const connectTimer = setTimeout(() => {
      if (!connected) {
        cleanup()
        pollUntilDone(uploadId, onProgress).then(resolve).catch(reject)
      }
    }, 5_000)

    // Hard cap — processing should never exceed 60 s
    const overallTimer = setTimeout(() => {
      cleanup()
      reject(new Error('Upload timed out'))
    }, 60_000)

    socket.on('connect', () => {
      connected = true
      clearTimeout(connectTimer)
      socket.emit('join', uploadId)
    })

    socket.on('connect_error', () => {
      if (!connected) {
        cleanup()
        pollUntilDone(uploadId, onProgress).then(resolve).catch(reject)
      }
    })

    socket.on(
      'progress',
      (event: { uploadId: string; step: string; status: string; message?: string }) => {
        if (event.uploadId !== uploadId) return

        // Map server steps → client stages
        const processingSteps = [
          'download',
          'resize_thumbnail',
          'resize_medium',
          'resize_full',
          'save',
        ]
        if (processingSteps.includes(event.step)) onProgress?.('processing')

        if (event.step === 'done' && event.status === 'done') {
          cleanup()
          uploadApi.getStatus(uploadId).then(resolve).catch(reject)
        }

        if (event.step === 'failed') {
          cleanup()
          reject(new Error(event.message ?? 'Upload failed'))
        }
      },
    )
  })
}

export const uploadApi = {
  requestPresigned: async (context: UploadContext, entityId?: string) => {
    const res = await apiClient.post<
      Wrapped<{ uploadId: string; presignedUrl: string; expiresAt: string }>
    >('/uploads/presigned', { context, entityId })
    return res.data.data
  },

  uploadToStorage: async (presignedUrl: string, file: File): Promise<void> => {
    await axios.put(presignedUrl, file, { headers: { 'Content-Type': file.type } })
  },

  confirm: async (uploadId: string): Promise<void> => {
    await apiClient.post(`/uploads/${uploadId}/confirm`)
  },

  getStatus: async (uploadId: string): Promise<UploadRecord> => {
    const res = await apiClient.get<Wrapped<UploadRecord>>(`/uploads/${uploadId}`)
    return res.data.data
  },

  claim: async (uploadId: string): Promise<UploadRecord> => {
    const res = await apiClient.post<Wrapped<UploadRecord>>(`/uploads/${uploadId}/claim`)
    return res.data.data
  },

  uploadFile: async (
    file: File,
    context: UploadContext,
    entityId?: string,
    onProgress?: (stage: ProgressStage) => void,
  ): Promise<{ url: string; uploadId: string }> => {
    onProgress?.('presigning')
    const { uploadId, presignedUrl } = await uploadApi.requestPresigned(context, entityId)

    onProgress?.('uploading')
    await uploadApi.uploadToStorage(presignedUrl, file)
    await uploadApi.confirm(uploadId)

    onProgress?.('processing')
    const record = await waitForProcessing(uploadId, onProgress)

    if (record.status !== 'DONE') throw new Error('Upload failed')
    const url = record.urls.medium ?? record.urls.full
    if (!url) throw new Error('No CDN URL in processed record')

    onProgress?.('done')
    return { url, uploadId }
  },
}
