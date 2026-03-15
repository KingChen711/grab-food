'use client'

import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import type { UploadContext } from '@/lib/api/upload.api'
import { uploadApi } from '@/lib/api/upload.api'

interface ImageUploaderProps {
  value?: string
  onChange: (url: string) => void
  onPendingUploadId?: (uploadId: string | null) => void
  context: UploadContext
  entityId?: string
  label?: string
  hint?: string
  round?: boolean
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
  round = false,
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

  const shapeClass = round ? 'rounded-full' : 'rounded-md'

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}

      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className={`h-24 w-24 border object-cover ${shapeClass}`}
          />
          <div className="absolute right-0 top-0 flex gap-1">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              className="rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              title="Replace"
            >
              <Upload className="h-3 w-3" />
            </button>
            <button
              type="button"
              disabled={isUploading}
              onClick={handleRemove}
              className="rounded-full bg-black/60 p-1 text-white hover:bg-red-700"
              title="Remove"
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
            'flex h-24 w-24 cursor-pointer flex-col items-center justify-center border-2 border-dashed transition-colors',
            shapeClass,
            isUploading
              ? 'cursor-not-allowed opacity-60'
              : 'hover:border-primary hover:bg-accent/30',
          ].join(' ')}
        >
          {isUploading ? (
            <>
              <Loader2 className="mb-1 h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground">{STAGE_LABEL[stage]}</p>
            </>
          ) : (
            <>
              <ImageIcon className="mb-1 h-5 w-5 text-muted-foreground" />
              <p className="text-center text-[10px] text-muted-foreground">Upload</p>
            </>
          )}
        </div>
      )}

      {hint && !value && <p className="text-xs text-muted-foreground/70">{hint}</p>}

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
