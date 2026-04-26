'use client'

import { Button, Input } from '@grab/ui'
import { Tag, X } from 'lucide-react'
import { useState } from 'react'

interface PromoCodeInputProps {
  appliedCode?: string
  onApply: (code: string) => void
  onRemove: () => void
  isApplying?: boolean
}

export function PromoCodeInput({
  appliedCode,
  onApply,
  onRemove,
  isApplying,
}: PromoCodeInputProps) {
  const [code, setCode] = useState('')

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <Tag className="h-4 w-4" />
          <span className="text-sm font-medium">{appliedCode}</span>
          <span className="text-xs text-muted-foreground">applied</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove} aria-label="Remove promo code">
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (code.trim()) onApply(code.trim().toUpperCase())
      }}
      className="flex gap-2"
    >
      <Input
        type="text"
        placeholder="Promo code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="flex-1 uppercase"
      />
      <Button type="submit" variant="outline" disabled={!code.trim() || isApplying}>
        Apply
      </Button>
    </form>
  )
}
