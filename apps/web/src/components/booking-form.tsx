'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api, type Slot } from '@/lib/api'
import { Turnstile } from './turnstile'

interface Service {
  id: string
  name: string
  description: string | null
  priceType: string
  priceAmount: number | null
  durationMinutes: number | null
}

interface Props {
  slug: string
  providerId: string
  providerName: string
  services: Service[]
}

type Step = 'service' | 'datetime' | 'contacts' | 'submitting' | 'done'

function formatPrice(s: Service) {
  if (s.priceType === 'on_request') return 'за домовленістю'
  if (!s.priceAmount) return ''
  const prefix = s.priceType === 'from' ? 'від ' : ''
  return `${prefix}${s.priceAmount} грн`
}

function formatDuration(min: number | null) {
  if (!min) return ''
  if (min < 60) return `${min} хв`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} год ${m} хв` : `${h} год`
}

function getWeekDates(weekOffset: number): string[] {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() + weekOffset * 7)
  if (weekOffset === 0) {
  } else {
    const day = start.getDay()
    const diff = day === 0 ? -6 : 1 - day
    start.setDate(start.getDate() + diff)
  }

  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d.toISOString().split('T')[0]!)
  }
  return dates
}

const DAY_NAMES = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MONTH_NAMES = ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд']

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return { day: d.getDate(), weekday: DAY_NAMES[d.getDay()]!, month: MONTH_NAMES[d.getMonth()]! }
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

export function BookingForm({ slug, providerId, providerName, services }: Props) {
  const router = useRouter()

  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('+380')
  const [email, setEmail] = useState('')
  const [details, setDetails] = useState('')

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service)
    setSelectedDate(null)
    setSelectedTime(null)
    setSlots([])
    setWeekOffset(0)
    setStep('datetime')
  }

  const loadSlots = useCallback(async (serviceId: string, dates: string[]) => {
    setLoadingSlots(true)
    try {
      const result = await api.getSlots(slug, {
        serviceId,
        fromDate: dates[0]!,
        toDate: dates[dates.length - 1]!,
      })
      setSlots(result)
    } catch {
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }, [slug])

  const handleWeekChange = useCallback((offset: number) => {
    setWeekOffset(offset)
    setSelectedDate(null)
    setSelectedTime(null)
    if (selectedService) {
      const dates = getWeekDates(offset)
      loadSlots(selectedService.id, dates)
    }
  }, [selectedService, loadSlots])

  const handleDateTimeEnter = useCallback(() => {
    if (selectedService && slots.length === 0) {
      const dates = getWeekDates(0)
      loadSlots(selectedService.id, dates)
    }
  }, [selectedService, slots.length, loadSlots])

  const weekDates = getWeekDates(weekOffset)
  const today = new Date().toISOString().split('T')[0]!

  const slotsForDate = selectedDate
    ? slots.filter((s) => s.date === selectedDate)
    : []

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setSelectedTime(null)
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
  }

  const handleToContacts = () => {
    if (selectedDate && selectedTime) {
      setStep('contacts')
    }
  }

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !turnstileToken) return

    if (name.trim().length < 2) {
      setError("Ім'я має містити щонайменше 2 символи")
      return
    }
    const phoneClean = phone.replace(/\s/g, '')
    if (!/^\+380\d{9}$/.test(phoneClean)) {
      setError('Введіть коректний номер телефону (+380XXXXXXXXX)')
      return
    }

    setError(null)
    setStep('submitting')

    try {
      const result = await api.createBooking({
        providerId,
        serviceId: selectedService.id,
        preferredDate: selectedDate,
        preferredTime: selectedTime,
        clientName: name.trim(),
        clientPhone: phoneClean,
        clientEmail: email.trim() || undefined,
        details: details.trim() || undefined,
        turnstileToken,
      })
      router.push(`/booking/${result.accessToken}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка при створенні заявки')
      setStep('contacts')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-ocean-100 overflow-hidden">
      <div className="flex border-b border-ocean-100">
        {(['service', 'datetime', 'contacts'] as const).map((s, i) => {
          const labels = ['Послуга', 'Дата і час', 'Контакти']
          const stepIndex = s === 'service' ? 0 : s === 'datetime' ? 1 : 2
          const currentIndex = step === 'service' ? 0 : step === 'datetime' ? 1 : 2
          const isActive = stepIndex <= currentIndex
          return (
            <div
              key={s}
              className={`flex-1 py-3 px-4 text-center text-sm font-medium transition-colors ${
                isActive ? 'text-primary bg-ocean-100/30' : 'text-ocean-500'
              }`}
            >
              <span className="hidden sm:inline">{i + 1}. </span>
              {labels[i]}
            </div>
          )
        })}
      </div>

      <div className="p-6">
        {step === 'service' && (
          <div>
            <p className="text-sm text-ocean-500 mb-4">Оберіть послугу:</p>
            <div className="space-y-3">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleServiceSelect(s)}
                  className="w-full text-left p-4 rounded-xl border border-ocean-100 hover:border-ocean-300 hover:bg-ocean-100/20 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="font-medium text-ocean-900">{s.name}</div>
                      {s.description && (
                        <div className="text-sm text-ocean-500 mt-1">{s.description}</div>
                      )}
                      {s.durationMinutes && (
                        <div className="text-xs text-ocean-500 mt-1">{formatDuration(s.durationMinutes)}</div>
                      )}
                    </div>
                    <div className="text-sm font-medium text-ocean-700 shrink-0">
                      {formatPrice(s)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'datetime' && (
          <div ref={() => handleDateTimeEnter()}>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setStep('service')}
                className="text-sm text-ocean-500 hover:text-ocean-700"
              >
                &larr; {selectedService?.name}
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => handleWeekChange(weekOffset - 1)}
                disabled={weekOffset === 0}
                className="p-2 rounded-lg hover:bg-ocean-100/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5 text-ocean-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-medium text-ocean-900">
                {formatDateFull(weekDates[0]!)} — {formatDateFull(weekDates[6]!)}
              </span>
              <button
                onClick={() => handleWeekChange(weekOffset + 1)}
                disabled={weekOffset >= 3}
                className="p-2 rounded-lg hover:bg-ocean-100/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5 text-ocean-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-6">
              {weekDates.map((date) => {
                const { day, weekday } = formatDateShort(date)
                const isPast = date < today
                const hasSlots = slots.some((s) => s.date === date)
                const isSelected = date === selectedDate
                return (
                  <button
                    key={date}
                    onClick={() => !isPast && hasSlots && handleDateSelect(date)}
                    disabled={isPast || !hasSlots}
                    className={`flex flex-col items-center py-2 rounded-xl text-sm transition-colors ${
                      isSelected
                        ? 'bg-primary text-white'
                        : isPast || !hasSlots
                          ? 'text-ocean-300 cursor-not-allowed'
                          : 'text-ocean-900 hover:bg-ocean-100/50 border border-ocean-100'
                    }`}
                  >
                    <span className="text-xs">{weekday}</span>
                    <span className="font-medium">{day}</span>
                  </button>
                )
              })}
            </div>

            {loadingSlots && (
              <div className="text-center py-8 text-ocean-500 text-sm">Завантаження...</div>
            )}

            {selectedDate && !loadingSlots && (
              <div>
                <p className="text-sm text-ocean-500 mb-3">Оберіть час:</p>
                {slotsForDate.length === 0 ? (
                  <div className="text-center py-6 text-ocean-500 text-sm">Немає вільних слотів на цей день</div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {slotsForDate.map((slot) => (
                      <button
                        key={slot.startTime}
                        onClick={() => handleTimeSelect(slot.startTime)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          selectedTime === slot.startTime
                            ? 'bg-primary text-white'
                            : 'border border-ocean-100 text-ocean-900 hover:border-ocean-300'
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedDate && selectedTime && (
              <button
                onClick={handleToContacts}
                className="mt-6 w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-hover transition-colors"
              >
                Далі
              </button>
            )}
          </div>
        )}

        {(step === 'contacts' || step === 'submitting') && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setStep('datetime')}
                className="text-sm text-ocean-500 hover:text-ocean-700"
              >
                &larr; {selectedDate && formatDateFull(selectedDate)}, {selectedTime}
              </button>
            </div>

            <div className="bg-ocean-100/30 rounded-xl p-4 mb-6 text-sm">
              <div className="font-medium text-ocean-900">{selectedService?.name}</div>
              <div className="text-ocean-700 mt-1">
                {selectedDate && formatDateFull(selectedDate)} о {selectedTime}
              </div>
              {selectedService && (
                <div className="text-ocean-500 mt-1">{formatPrice(selectedService)}</div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-ocean-900 mb-1">
                  Ваше ім&apos;я *
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Іван"
                  className="w-full border border-ocean-100 rounded-xl px-4 py-3 text-ocean-900 placeholder:text-ocean-500/60 focus:outline-none focus:border-ocean-300 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-ocean-900 mb-1">
                  Телефон *
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+380501234567"
                  className="w-full border border-ocean-100 rounded-xl px-4 py-3 text-ocean-900 placeholder:text-ocean-500/60 focus:outline-none focus:border-ocean-300 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ocean-900 mb-1">
                  Email <span className="text-ocean-500 font-normal">(необов&apos;язково)</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full border border-ocean-100 rounded-xl px-4 py-3 text-ocean-900 placeholder:text-ocean-500/60 focus:outline-none focus:border-ocean-300 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="details" className="block text-sm font-medium text-ocean-900 mb-1">
                  Коментар <span className="text-ocean-500 font-normal">(необов&apos;язково)</span>
                </label>
                <textarea
                  id="details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  placeholder="Опишіть деталі або побажання"
                  className="w-full border border-ocean-100 rounded-xl px-4 py-3 text-ocean-900 placeholder:text-ocean-500/60 focus:outline-none focus:border-ocean-300 transition-colors resize-none"
                />
              </div>

              <Turnstile
                onVerify={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
              />

              {error && (
                <div className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</div>
              )}

              <button
                onClick={handleSubmit}
                disabled={step === 'submitting' || !turnstileToken || !name.trim() || phone.length < 13}
                className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === 'submitting' ? 'Відправляємо...' : 'Записатися'}
              </button>

              <p className="text-xs text-ocean-500 text-center">
                Натискаючи кнопку, ви погоджуєтесь з умовами використання сервісу
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
