'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { providerApi, type ProviderServiceItem } from '@/lib/provider-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const PRICE_TYPES = [
  { value: 'fixed', label: 'Фіксована' },
  { value: 'from', label: 'Від' },
  { value: 'on_request', label: 'За домовленістю' },
] as const

function formatPrice(priceType: string, amount: number | null) {
  if (priceType === 'on_request') return 'за домовленістю'
  if (!amount) return ''
  return `${priceType === 'from' ? 'від ' : ''}${amount} грн`
}

interface ServiceFormState {
  name: string
  description: string
  priceType: string
  priceAmount: string
  durationMinutes: string
}

const emptyForm: ServiceFormState = {
  name: '',
  description: '',
  priceType: 'fixed',
  priceAmount: '',
  durationMinutes: '60',
}

export default function ServicesPage() {
  const { getToken } = useAuth()
  const [services, setServices] = useState<ProviderServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editSheet, setEditSheet] = useState<{ mode: 'create' | 'edit'; serviceId?: string } | null>(null)
  const [form, setForm] = useState<ServiceFormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const loadServices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()
      const data = await providerApi.getServices(token)
      setServices(data.filter((s) => s.isActive))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    loadServices()
  }, [loadServices])

  const openCreate = () => {
    setForm(emptyForm)
    setEditSheet({ mode: 'create' })
    setError(null)
  }

  const openEdit = (service: ProviderServiceItem) => {
    setForm({
      name: service.name,
      description: service.description ?? '',
      priceType: service.priceType,
      priceAmount: service.priceAmount?.toString() ?? '',
      durationMinutes: service.durationMinutes?.toString() ?? '60',
    })
    setEditSheet({ mode: 'edit', serviceId: service.id })
    setError(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Введіть назву послуги')
      return
    }
    try {
      setSaving(true)
      setError(null)
      const token = await getToken()

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        priceType: form.priceType,
        priceAmount: form.priceType === 'on_request' ? null : Number(form.priceAmount) || null,
        durationMinutes: Number(form.durationMinutes) || 60,
      }

      if (editSheet?.mode === 'edit' && editSheet.serviceId) {
        await providerApi.updateService(token, editSheet.serviceId, payload)
      } else {
        await providerApi.createService(token, { ...payload, sortOrder: services.length + 1 })
      }

      setEditSheet(null)
      await loadServices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const token = await getToken()
      await providerApi.deleteService(token, id)
      await loadServices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка видалення')
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Мої послуги</h1>
        <Button onClick={openCreate} size="sm">+ Додати</Button>
      </div>

      {error && !editSheet && (
        <div className="mb-4 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-2xl border p-5 animate-pulse">
              <div className="h-5 bg-muted rounded w-40 mb-2" />
              <div className="h-4 bg-muted rounded w-24" />
            </div>
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="bg-card rounded-2xl border p-8 text-center">
          <div className="text-4xl mb-3">🔧</div>
          <p className="font-medium">Немає послуг</p>
          <p className="text-muted-foreground text-sm mt-1">Додайте першу послугу, щоб клієнти могли записатися</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <div key={service.id} className="bg-card rounded-2xl border overflow-hidden">
              <button onClick={() => openEdit(service)} className="w-full text-left p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{service.name}</div>
                    {service.description && (
                      <div className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{service.description}</div>
                    )}
                    {service.durationMinutes && (
                      <div className="text-sm text-muted-foreground mt-1">{service.durationMinutes} хв</div>
                    )}
                  </div>
                  <div className="text-sm font-semibold shrink-0">
                    {formatPrice(service.priceType, service.priceAmount)}
                  </div>
                </div>
              </button>
              <div className="border-t px-4 py-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(service.id)}
                  className="text-destructive hover:text-destructive text-xs"
                >
                  Видалити
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={editSheet !== null} onOpenChange={(open) => !open && setEditSheet(null)}>
        <SheetContent side="bottom" fullscreen>
          <SheetHeader>
            <SheetTitle>{editSheet?.mode === 'edit' ? 'Редагувати послугу' : 'Нова послуга'}</SheetTitle>
          </SheetHeader>
          <div className="pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Назва *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Встановлення розетки"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Опис</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Короткий опис послуги"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Тип ціни</label>
              <div className="flex gap-2">
                {PRICE_TYPES.map((pt) => (
                  <Button
                    key={pt.value}
                    variant={form.priceType === pt.value ? 'default' : 'outline'}
                    className="flex-1"
                    size="sm"
                    onClick={() => setForm({ ...form, priceType: pt.value })}
                  >
                    {pt.label}
                  </Button>
                ))}
              </div>
            </div>

            {form.priceType !== 'on_request' && (
              <div>
                <label className="block text-sm font-medium mb-1">Ціна (грн) *</label>
                <Input
                  type="number"
                  value={form.priceAmount}
                  onChange={(e) => setForm({ ...form, priceAmount: e.target.value })}
                  placeholder="350"
                  min="0"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Тривалість (хв)</label>
              <Input
                type="number"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                placeholder="60"
                min="15"
                step="15"
              />
            </div>

            {error && editSheet && (
              <div className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? 'Зберігаємо...' : 'Зберегти'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
