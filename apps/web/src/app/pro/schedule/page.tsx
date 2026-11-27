'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { providerApi, type WorkingHour, type AvailabilityException } from '@/lib/provider-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const DAY_NAMES = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота']
const DAY_SHORT = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MONTH_NAMES = ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд']

interface DaySchedule {
  dayOfWeek: number
  enabled: boolean
  startTime: string
  endTime: string
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { dayOfWeek: 1, enabled: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 2, enabled: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 3, enabled: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 4, enabled: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 5, enabled: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 6, enabled: false, startTime: '10:00', endTime: '15:00' },
  { dayOfWeek: 0, enabled: false, startTime: '10:00', endTime: '15:00' },
]

export default function SchedulePage() {
  const { getToken } = useAuth()
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE)
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  const [exSheetOpen, setExSheetOpen] = useState(false)
  const [exDate, setExDate] = useState('')
  const [exAvailable, setExAvailable] = useState(false)
  const [exStart, setExStart] = useState('09:00')
  const [exEnd, setExEnd] = useState('18:00')
  const [exReason, setExReason] = useState('')
  const [exSaving, setExSaving] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()
      const [hours, excs] = await Promise.all([
        providerApi.getHours(token),
        providerApi.getExceptions(token),
      ])
      if (hours.length > 0) {
        setSchedule(DEFAULT_SCHEDULE.map((ds) => {
          const h = hours.find((wh) => wh.dayOfWeek === ds.dayOfWeek)
          if (!h) return ds
          return { dayOfWeek: ds.dayOfWeek, enabled: h.isActive, startTime: h.startTime, endTime: h.endTime }
        }))
      }
      setExceptions(excs)
      setDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updateDay = (dayOfWeek: number, patch: Partial<DaySchedule>) => {
    setSchedule((prev) => prev.map((d) => d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d))
    setDirty(true)
  }

  const handleSaveSchedule = async () => {
    try {
      setSaving(true)
      setError(null)
      const token = await getToken()
      const data = schedule
        .filter((d) => d.enabled)
        .map((d) => ({ dayOfWeek: d.dayOfWeek, startTime: d.startTime, endTime: d.endTime }))
      await providerApi.updateHours(token, data)
      setDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  const handleAddException = async () => {
    if (!exDate) return
    try {
      setExSaving(true)
      const token = await getToken()
      await providerApi.createException(token, {
        date: exDate,
        isAvailable: exAvailable,
        startTime: exAvailable ? exStart : undefined,
        endTime: exAvailable ? exEnd : undefined,
        reason: exReason || undefined,
      })
      setExSheetOpen(false)
      setExDate('')
      setExReason('')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setExSaving(false)
    }
  }

  const handleDeleteException = async (id: string) => {
    try {
      const token = await getToken()
      await providerApi.deleteException(token, id)
      setExceptions((prev) => prev.filter((e) => e.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-5">
        <h1 className="text-xl font-bold text-ocean-900 mb-5">Розклад</h1>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card rounded-2xl border p-4 animate-pulse">
              <div className="h-5 bg-muted rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <h1 className="text-xl font-bold text-ocean-900 mb-5">Розклад</h1>

      {error && (
        <div className="mb-4 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</div>
      )}

      <section className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Робочі години</h2>
        <div className="bg-card rounded-2xl border overflow-hidden divide-y">
          {schedule.map((day) => (
            <div key={day.dayOfWeek} className="flex items-center gap-3 px-4 h-14">
              <Switch
                checked={day.enabled}
                onCheckedChange={(checked) => updateDay(day.dayOfWeek, { enabled: checked })}
              />
              <span className={`w-10 text-sm font-medium shrink-0 ${day.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                {DAY_SHORT[day.dayOfWeek]}
              </span>
              <div className="flex items-center gap-2 flex-1">
                {day.enabled ? (
                  <>
                    <Input
                      type="time"
                      value={day.startTime}
                      onChange={(e) => updateDay(day.dayOfWeek, { startTime: e.target.value })}
                      className="h-9 w-auto px-2 text-sm"
                    />
                    <span className="text-muted-foreground">—</span>
                    <Input
                      type="time"
                      value={day.endTime}
                      onChange={(e) => updateDay(day.dayOfWeek, { endTime: e.target.value })}
                      className="h-9 w-auto px-2 text-sm"
                    />
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Вихідний</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {dirty && (
          <Button onClick={handleSaveSchedule} disabled={saving} className="mt-3 w-full">
            {saving ? 'Зберігаємо...' : 'Зберегти розклад'}
          </Button>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Винятки</h2>
          <Button variant="ghost" size="sm" className="text-primary font-semibold" onClick={() => setExSheetOpen(true)}>
            + Додати
          </Button>
        </div>

        {exceptions.length === 0 ? (
          <div className="bg-card rounded-2xl border p-6 text-center">
            <p className="text-muted-foreground text-sm">Немає винятків</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Додайте вихідний або особливий графік</p>
          </div>
        ) : (
          <div className="space-y-2">
            {exceptions.map((ex) => {
              const d = new Date(ex.date + 'T00:00:00')
              return (
                <div key={ex.id} className="bg-card rounded-2xl border px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">
                      {d.getDate()} {MONTH_NAMES[d.getMonth()]} ({DAY_NAMES[d.getDay()]})
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={ex.isAvailable ? 'secondary' : 'destructive'} className="text-xs">
                        {ex.isAvailable ? `${ex.startTime} — ${ex.endTime}` : 'Вихідний'}
                      </Badge>
                      {ex.reason && <span className="text-xs text-muted-foreground">{ex.reason}</span>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteException(ex.id)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <Sheet open={exSheetOpen} onOpenChange={setExSheetOpen}>
        <SheetContent side="bottom" fullscreen>
          <SheetHeader>
            <SheetTitle>Додати виняток</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Дата</label>
              <Input
                type="date"
                value={exDate}
                onChange={(e) => setExDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Тип</label>
              <div className="flex gap-2">
                <Button
                  variant={!exAvailable ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setExAvailable(false)}
                >
                  Вихідний
                </Button>
                <Button
                  variant={exAvailable ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setExAvailable(true)}
                >
                  Особливий графік
                </Button>
              </div>
            </div>

            {exAvailable && (
              <div className="flex items-center gap-2">
                <Input type="time" value={exStart} onChange={(e) => setExStart(e.target.value)} />
                <span className="text-muted-foreground">—</span>
                <Input type="time" value={exEnd} onChange={(e) => setExEnd(e.target.value)} />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Причина</label>
              <Input
                value={exReason}
                onChange={(e) => setExReason(e.target.value)}
                placeholder="Наприклад: Відпустка"
              />
            </div>

            <Button onClick={handleAddException} disabled={exSaving || !exDate} className="w-full">
              {exSaving ? 'Зберігаємо...' : 'Додати'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
