'use server'

import { redirect } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'

export async function acceptProposal(token: string, _formData: FormData) {
  await fetch(`${API_URL}/api/v1/bookings/status/${token}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  redirect(`/booking/${token}`)
}

export async function cancelBooking(token: string, _formData: FormData) {
  await fetch(`${API_URL}/api/v1/bookings/status/${token}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Скасовано клієнтом' }),
  })
  redirect(`/booking/${token}`)
}
