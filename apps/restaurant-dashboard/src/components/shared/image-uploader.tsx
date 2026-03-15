'use client'

import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import type { UploadContext } from '@/lib/api/upload.api'
import { uploadApi } from '@/lib/api/upload.api'

interface ImageUploaderProps {
  value?: string
  onChange: (url: string) => void
  /**
   * Called whenever a new upload completes (with its uploadId) or the image is
   * cleared (with null). The parent should store this and call
   * `uploadApi.claim(uploadId)` after successfully saving the entity.
   */
  onPendingUploadId?: (uploadId: string | null) => void
  context: UploadContext
  entityId?: string
  label?: string
  /** Aspect ratio hint shown in the placeholder */
  hint?: string
}

type UploadStage = 'idle' | 'presigning' | 'uploading' | 'processing' | 'done'

const STAGE_LABEL: Record<UploadStage, string> = {
  idle: '',
  presigning: 'Preparing…',
  uploading: 'Uploading…',
  processing: 'Processing…',
  done: 'Done',
}

export function ImageUploader({
  value,
  onChange,
  onPendingUploadId,
  context,
  entityId,
  label,
  hint,
}: ImageUploaderProps) {
  const [stage, setStage] = useState<UploadStage>('idle')
  const inputRef = useRef<HTMLInputElement>(null)

  const isUploading = stage !== 'idle' && stage !== 'done'

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    try {
      const { url, uploadId } = await uploadApi.uploadFile(file, context, entityId, (s) =>
        setStage(s as UploadStage),
      )
      onChange(url)
      onPendingUploadId?.(uploadId)
      setStage('idle')
    } catch (err) {
      console.error(err)
      toast.error('Image upload failed')
      setStage('idle')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  const handleRemove = () => {
    onChange('')
    onPendingUploadId?.(null)
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}

      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="Preview" className="h-32 w-full rounded-md border object-cover" />
          <div className="absolute right-1 top-1 flex gap-1">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              className="rounded bg-black/60 p-1 text-white hover:bg-black/80"
              title="Replace image"
            >
              <Upload className="h-3 w-3" />
            </button>
            <button
              type="button"
              disabled={isUploading}
              onClick={handleRemove}
              className="rounded bg-black/60 p-1 text-white hover:bg-red-700"
              title="Remove image"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !isUploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={[
            'flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed transition-colors',
            isUploading
              ? 'cursor-not-allowed opacity-60'
              : 'hover:border-primary hover:bg-accent/30',
          ].join(' ')}
        >
          {isUploading ? (
            <>
              <Loader2 className="mb-1 h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{STAGE_LABEL[stage]}</p>
            </>
          ) : (
            <>
              <ImageIcon className="mb-1 h-6 w-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Click or drag to upload</p>
              {hint && <p className="mt-0.5 text-xs text-muted-foreground/60">{hint}</p>}
            </>
          )}
        </div>
      )}

      {isUploading && value && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          {STAGE_LABEL[stage]}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
