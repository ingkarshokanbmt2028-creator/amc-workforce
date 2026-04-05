'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EARLY_DEPARTURE', 'PARTIAL', 'ON_LEAVE']

interface AttendanceRecord {
  id: string
  employee: { name: string }
  date: string
  status: string
}

interface OverrideModalProps {
  open: boolean
  record: AttendanceRecord
  onClose: () => void
  onSave: (status: string, reason: string) => Promise<void>
}

export function OverrideModal({ open, record, onClose, onSave }: OverrideModalProps) {
  const [status, setStatus] = useState(record.status)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!reason.trim()) {
      setError('Reason is required')
      return
    }
    setSaving(true)
    await onSave(status, reason.trim())
    setSaving(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Override Attendance</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{record.employee.name}</span>
            {' · '}
            {record.date.slice(0, 10)}
          </p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select value={status} onValueChange={(v) => { if (v) setStatus(v) }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="Required: explain the reason for this override"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError('')
              }}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Override'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
