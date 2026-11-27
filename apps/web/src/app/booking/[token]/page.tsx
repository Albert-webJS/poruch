import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import { acceptProposal, cancelBooking } from './actions'

interface Props {
  params: Promise<{ token: string }>
}

export const metadata: Metadata = {
  title: 'Статус заявки — Порuch',
}

const STATUS_MAP: Record<string, { label: string; color: string; description: string }> = {
  pending: {
    label: 'Очікує підтвердження',
    color: 'bg-amber-100 text-amber-800',
    description: 'Майстер отримав вашу заявку і скоро відповість.',
  },
  confirmed: {
    label: 'Підтверджено',
    color: 'bg-green-100 text-green-800',
    description: 'Ваш запис підтверджено! Чекаємо вас у вказаний час.',
  },
  proposed: {
    label: 'Запропоновано інший час',
    color: 'bg-blue-100 text-blue-800',
    description: 'Майстер запропонував інший час. Перевірте деталі нижче.',
  },
  declined: {
    label: 'Відхилено',
    color: 'bg-red-100 text-red-800',
    description: 'На жаль, майстер не може прийняти цю заявку.',
  },
  cancelled: {
    label: 'Скасовано',
    color: 'bg-gray-100 text-gray-800',
    description: 'Заявку скасовано.',
  },
  completed: {
    label: 'Завершено',
    color: 'bg-ocean-100 text-ocean-900',
    description: 'Послугу надано. Дякуємо!',
  },
}

const MONTH_NAMES = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

export default async function BookingStatusPage({ params }: Props) {
  const { token } = await params
  const booking = await api.getBookingStatus(token).catch(() => null)
  if (!booking) notFound()

  const status = STATUS_MAP[booking.status] ?? STATUS_MAP.pending!

  const displayDate = booking.confirmedDate ?? booking.preferredDate
  const displayTime = booking.confirmedTime ?? booking.preferredTime

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-ocean-100 overflow-hidden">
        {/* Status header */}
        <div className={`px-6 py-5 ${status.color}`}>
          <h1 className="text-lg font-bold">{status.label}</h1>
          <p className="text-sm mt-1 opacity-80">{status.description}</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Provider & Service */}
          <div>
            <div className="text-sm text-ocean-500">Майстер</div>
            <Link href={`/p/${booking.providerSlug}`} className="font-medium text-ocean-900 hover:text-primary transition-colors">
              {booking.providerName}
            </Link>
          </div>

          <div>
            <div className="text-sm text-ocean-500">Послуга</div>
            <div className="font-medium text-ocean-900">{booking.serviceName}</div>
          </div>

          {/* Date/Time */}
          <div>
            <div className="text-sm text-ocean-500">Дата і час</div>
            <div className="font-medium text-ocean-900">
              {formatDate(displayDate)} о {displayTime}
            </div>
          </div>

          {/* Proposed alternative */}
          {booking.status === 'proposed' && booking.proposedDate && booking.proposedTime && (
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-sm font-medium text-blue-900 mb-1">Пропозиція майстра:</div>
              <div className="text-blue-800">
                {formatDate(booking.proposedDate)} о {booking.proposedTime}
              </div>
              {booking.proposedMessage && (
                <div className="text-sm text-blue-700 mt-2">{booking.proposedMessage}</div>
              )}
              <div className="flex gap-3 mt-4">
                <AcceptButton token={token} />
                <CancelButton token={token} />
              </div>
            </div>
          )}

          {/* Cancel for pending */}
          {booking.status === 'pending' && (
            <CancelButton token={token} />
          )}

          {/* Back link */}
          <Link
            href={`/p/${booking.providerSlug}`}
            className="block text-center text-sm text-ocean-500 hover:text-ocean-700 mt-4 transition-colors"
          >
            Повернутися до профілю майстра
          </Link>
        </div>
      </div>
    </main>
  )
}

function AcceptButton({ token }: { token: string }) {
  const handleAccept = acceptProposal.bind(null, token)
  return (
    <form action={handleAccept}>
      <button
        type="submit"
        className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors"
      >
        Прийняти
      </button>
    </form>
  )
}

function CancelButton({ token }: { token: string }) {
  const handleCancel = cancelBooking.bind(null, token)
  return (
    <form action={handleCancel}>
      <button
        type="submit"
        className="border border-ocean-100 text-ocean-700 px-5 py-2 rounded-xl text-sm font-medium hover:border-ocean-300 transition-colors"
      >
        Скасувати
      </button>
    </form>
  )
}
