'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { providerApi, type ProviderBooking } from '@/lib/provider-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const STATUS_FILTERS = [
  { value: '', label: 'Всі' },
  { value: 'pending', label: 'Нові' },
  { value: 'confirmed', label: 'Підтверджені' },
  { value: 'proposed', label: 'Запропоновані' },
  { value: 'completed', label: 'Виконані' },
  { value: 'declined', label: 'Відхилені' },
  { value: 'cancelled', label: 'Скасовані' },
] as const

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  confirmed: 'default',
  proposed: 'secondary',
  completed: 'secondary',
  declined: 'destructive',
  cancelled: 'outline',
  expired: 'outline',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Нова',
  confirmed: 'Підтверджено',
  proposed: 'Запропоновано',
  completed: 'Виконано',
  declined: 'Відхилено',
  cancelled: 'Скасовано',
  expired: 'Прострочено',
}

const MONTH_NAMES = ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд']

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

function formatPrice(priceType: string, amount: number | null) {
  if (priceType === 'on_request') return 'за домовленістю'
  if (!amount) return ''
  return `${priceType === 'from' ? 'від ' : ''}${amount} грн`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'щойно'
  if (mins < 60) return `${mins} хв тому`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} год тому`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'вчора'
  return `${days} дн тому`
}

export default function BookingsPage() {
  const { getToken } = useAuth()
  const [bookings, setBookings] = useState<ProviderBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const [actionSheet, setActionSheet] = useState<{ type: 'decline' | 'propose' | 'complete'; booking: ProviderBooking } | null>(null)
  const [declineReason, setDeclineReason] = useState('')
  const [proposedDate, setProposedDate] = useState('')
  const [proposedTime, setProposedTime] = useState('')
  const [proposedMessage, setProposedMessage] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()
      const result = await providerApi.getBookings(token, {
        status: statusFilter || undefined,
        limit: 50,
      })
      setBookings(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }, [getToken, statusFilter])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  const handleConfirm = async (booking: ProviderBooking) => {
    try {
      setActionLoading(true)
      const token = await getToken()
      await providerApi.confirmBooking(token, booking.id)
      await loadBookings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDecline = async () => {
    if (!actionSheet || actionSheet.type !== 'decline') return
    try {
      setActionLoading(true)
      const token = await getToken()
      await providerApi.declineBooking(token, actionSheet.booking.id, declineReason || undefined)
      setActionSheet(null)
      setDeclineReason('')
      await loadBookings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePropose = async () => {
    if (!actionSheet || actionSheet.type !== 'propose' || !proposedDate || !proposedTime) return
    try {
      setActionLoading(true)
      const token = await getToken()
      await providerApi.proposeBooking(token, actionSheet.booking.id, {
        proposedDate,
        proposedTime,
        message: proposedMessage || undefined,
      })
      setActionSheet(null)
      setProposedDate('')
      setProposedTime('')
      setProposedMessage('')
      await loadBookings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setActionLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!actionSheet || actionSheet.type !== 'complete') return
    try {
      setActionLoading(true)
      const token = await getToken()
      await providerApi.completeBooking(token, actionSheet.booking.id)
      setActionSheet(null)
      await loadBookings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setActionLoading(false)
    }
  }

  const pendingCount = bookings.filter((b) => b.status === 'pending').length

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">
          Заявки
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-amber-500 rounded-full">
              {pendingCount}
            </span>
          )}
        </h1>
        <Button variant="ghost" size="icon" onClick={loadBookings} disabled={loading} aria-label="Оновити">
          <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(f.value)}
            className="shrink-0 rounded-full"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {error && (
        <div className="mt-4 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</div>
      )}

      {loading && bookings.length === 0 ? (
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-2xl border p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-3" />
              <div className="h-5 bg-muted rounded w-48 mb-2" />
              <div className="h-4 bg-muted rounded w-36" />
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="mt-8 bg-card rounded-2xl border p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-medium">Немає заявок</p>
          <p className="text-muted-foreground text-sm mt-1">
            {statusFilter ? 'Спробуйте інший фільтр' : 'Нові заявки з\'являться тут'}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {bookings.map((booking) => {
            const displayDate = booking.confirmedDate ?? booking.preferredDate
            const displayTime = booking.confirmedTime ?? booking.preferredTime
            return (
              <div key={booking.id} className="bg-card rounded-2xl border overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant={STATUS_VARIANT[booking.status] ?? 'outline'}>
                      {STATUS_LABEL[booking.status] ?? booking.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{timeAgo(booking.createdAt)}</span>
                  </div>

                  <div className="font-semibold mb-1">{booking.service.name}</div>
                  <div className="text-sm text-muted-foreground mb-3">
                    {formatPrice(booking.service.priceType, booking.service.priceAmount)}
                    {booking.service.durationMinutes && ` · ${booking.service.durationMinutes} хв`}
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(displayDate)}, {displayTime}
                    </div>

                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {booking.clientContact.name ?? 'Клієнт'} · {booking.clientContact.phone}
                    </div>

                    {booking.details && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        <span className="line-clamp-2">{booking.details}</span>
                      </div>
                    )}

                    {booking.status === 'proposed' && booking.proposedDate && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Запропоновано: {formatDate(booking.proposedDate)}, {booking.proposedTime}
                      </div>
                    )}
                  </div>
                </div>

                {booking.status === 'pending' && (
                  <div className="border-t p-3 flex gap-2">
                    <Button
                      onClick={() => handleConfirm(booking)}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      Підтвердити
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setActionSheet({ type: 'propose', booking }); setProposedDate(''); setProposedTime(''); setProposedMessage('') }}
                      className="flex-1"
                    >
                      Інший час
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => { setActionSheet({ type: 'decline', booking }); setDeclineReason('') }}
                      className="text-destructive hover:text-destructive hover:bg-red-50 shrink-0"
                    >
                      ✕
                    </Button>
                  </div>
                )}

                {booking.status === 'confirmed' && (
                  <div className="border-t p-3 flex gap-2">
                    <a
                      href={`tel:${booking.clientContact.phone}`}
                      className="flex-1 inline-flex items-center justify-center rounded-lg bg-secondary text-secondary-foreground text-sm font-medium h-8 px-2.5 hover:bg-secondary/80 transition-colors"
                    >
                      📞 Подзвонити
                    </a>
                    <Button
                      onClick={() => setActionSheet({ type: 'complete', booking })}
                      className="flex-1"
                    >
                      Виконано
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Sheet open={actionSheet?.type === 'decline'} onOpenChange={(open) => !open && setActionSheet(null)}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Відхилити заявку</SheetTitle>
          </SheetHeader>
          <div className="pt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Клієнт отримає повідомлення про відхилення. Ви можете вказати причину (необов&apos;язково).
            </p>
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Причина відхилення"
              rows={3}
            />
            <Button onClick={handleDecline} disabled={actionLoading} variant="destructive" className="w-full">
              {actionLoading ? 'Відхиляємо...' : 'Відхилити'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={actionSheet?.type === 'propose'} onOpenChange={(open) => !open && setActionSheet(null)}>
        <SheetContent side="bottom" fullscreen>
          <SheetHeader>
            <SheetTitle>Запропонувати інший час</SheetTitle>
          </SheetHeader>
          <div className="pt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Запропонуйте клієнту зручний для вас час.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">Дата</label>
              <Input
                type="date"
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Час</label>
              <Input
                type="time"
                value={proposedTime}
                onChange={(e) => setProposedTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Коментар <span className="text-muted-foreground font-normal">(необов&apos;язково)</span>
              </label>
              <Textarea
                value={proposedMessage}
                onChange={(e) => setProposedMessage(e.target.value)}
                placeholder="Наприклад: Можу прийти раніше"
                rows={2}
              />
            </div>
            <Button onClick={handlePropose} disabled={actionLoading || !proposedDate || !proposedTime} className="w-full">
              {actionLoading ? 'Відправляємо...' : 'Запропонувати'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={actionSheet?.type === 'complete'} onOpenChange={(open) => !open && setActionSheet(null)}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Завершити замовлення</SheetTitle>
          </SheetHeader>
          <div className="pt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Підтвердіть, що роботу виконано. Клієнт зможе залишити відгук.
            </p>
            <div className="bg-muted rounded-xl p-4 text-sm">
              <div className="font-medium">{actionSheet?.booking.service.name}</div>
              <div className="text-muted-foreground mt-1">{actionSheet?.booking.clientContact.name}</div>
            </div>
            <Button onClick={handleComplete} disabled={actionLoading} className="w-full">
              {actionLoading ? 'Завершуємо...' : 'Підтвердити виконання'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
