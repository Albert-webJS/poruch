'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth, useUser, SignOutButton } from '@clerk/nextjs'
import { providerApi, type ProviderFullProfile } from '@/lib/provider-api'
import { api, type Category, type City } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text)
  }
  // Fallback for HTTP / older browsers
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
  return Promise.resolve()
}

export default function ProfilePage() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [profile, setProfile] = useState<ProviderFullProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [cities, setCities] = useState<City[]>([])

  const [linkCopied, setLinkCopied] = useState(false)
  const [slugSheet, setSlugSheet] = useState(false)
  const [slugInput, setSlugInput] = useState('')
  const [slugError, setSlugError] = useState<string | null>(null)
  const [slugSaving, setSlugSaving] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [cityId, setCityId] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()

      const [profileData, cats, cits] = await Promise.all([
        providerApi.getProfile(token).catch(() => null),
        api.getCategories().catch(() => [] as Category[]),
        api.getCities().catch(() => [] as City[]),
      ])

      setCategories(cats)
      setCities(cits)

      if (cats.length === 0 || cits.length === 0) {
        setError('Не вдалося завантажити категорії або міста. Перевірте що API-сервер запущений.')
      }

      if (profileData) {
        setProfile(profileData)
        setName(profileData.name)
        setPhone(profileData.phone ?? '')
        setDescription(profileData.description ?? '')
        setCategoryId(profileData.category?.id ?? null)
        setCityId(profileData.city?.id ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleSave = async () => {
    if (!name.trim() || !categoryId || !cityId) {
      setError("Заповніть ім'я, категорію та місто")
      return
    }
    try {
      setSaving(true)
      setError(null)
      setSaved(false)
      const token = await getToken()

      const data: Record<string, unknown> = {
        name: name.trim(),
        categoryId,
        cityId,
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
      }

      const updated = await providerApi.updateProfile(token, data)
      setProfile(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  const handleSlugSave = async () => {
    const normalized = slugInput.trim().toLowerCase()
    if (normalized.length < 3) {
      setSlugError('Мінімум 3 символи')
      return
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
      setSlugError('Тільки латинські літери, цифри та дефіс')
      return
    }
    try {
      setSlugSaving(true)
      setSlugError(null)
      const token = await getToken()
      const updated = await providerApi.updateSlug(token, normalized)
      setProfile(updated)
      setSlugSheet(false)
    } catch (err) {
      setSlugError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setSlugSaving(false)
    }
  }

  const handlePublish = async () => {
    try {
      setSaving(true)
      setError(null)
      const token = await getToken()
      const updated = await providerApi.publish(token)
      setProfile(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка публікації')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-5">
        <h1 className="text-xl font-bold mb-5">Профіль</h1>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-2xl border p-5 animate-pulse">
              <div className="h-5 bg-muted rounded w-40 mb-2" />
              <div className="h-10 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <div className="mb-5">
        <h1 className="text-xl font-bold">Профіль</h1>
      </div>

      {error && (
        <div className="mb-4 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</div>
      )}
      {saved && (
        <div className="mb-4 text-green-700 text-sm bg-green-50 rounded-xl px-4 py-3">Збережено!</div>
      )}

      <div className="bg-card rounded-2xl border p-4 mb-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-bold text-lg">
          {user?.firstName?.[0] ?? name?.[0] ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{user?.fullName ?? name}</div>
          <div className="text-sm text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</div>
        </div>
      </div>

      {profile && (
        <div className="bg-card rounded-2xl border p-5 mb-4">
          <h2 className="text-lg font-bold mb-1">Ваша персональна сторінка</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Діліться посиланням з клієнтами та отримуйте записи онлайн.
          </p>

          <div className="flex items-center gap-3 rounded-xl border px-4 py-3 mb-4">
            <svg className="w-5 h-5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="flex-1 min-w-0 text-sm font-medium truncate select-all">
              poruch.app/p/{profile.slug}
            </span>
            <button
              onClick={() => {
                const url = `${window.location.origin}/p/${profile.slug}`
                copyToClipboard(url).then(() => {
                  setLinkCopied(true)
                  setTimeout(() => setLinkCopied(false), 2000)
                })
              }}
              className="shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Копіювати"
            >
              {linkCopied ? (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={() => {
                const url = `${window.location.origin}/p/${profile.slug}`
                if (navigator.share) {
                  navigator.share({ title: name, url })
                } else {
                  copyToClipboard(url).then(() => {
                    setLinkCopied(true)
                    setTimeout(() => setLinkCopied(false), 2000)
                  })
                }
              }}
              className="flex flex-col items-center gap-2 rounded-xl border py-4 hover:bg-muted/50 transition-colors"
            >
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span className="text-xs font-medium">Поділитися</span>
            </button>

            <button
              onClick={() => {
                window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/p/${profile.slug}`)}`, '_blank')
              }}
              className="flex flex-col items-center gap-2 rounded-xl border py-4 hover:bg-muted/50 transition-colors"
            >
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span className="text-xs font-medium">QR-код</span>
            </button>

            <button
              onClick={() => {
                setSlugInput(profile.slug)
                setSlugError(null)
                setSlugSheet(true)
              }}
              className="flex flex-col items-center gap-2 rounded-xl border py-4 hover:bg-muted/50 transition-colors"
            >
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-xs font-medium">Редагувати</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {profile.status === 'published' ? (
              <>
                <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-green-600">Сторінку опубліковано</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm font-medium text-amber-500">Чернетка — опублікуйте профіль</span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="bg-card rounded-2xl border p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Ім&apos;я / назва *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Олександр Коваленко"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Телефон</label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+380501234567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Категорія *</label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Оберіть категорію">
                  {(value: string | null) => {
                    const label = categories.find((c) => c.id === value)?.nameUk
                    return label ?? <span className="text-muted-foreground/50">Оберіть категорію</span>
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nameUk}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Місто *</label>
            <Select value={cityId} onValueChange={setCityId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Оберіть місто">
                  {(value: string | null) => {
                    const label = cities.find((c) => c.id === value)?.nameUk
                    return label ?? <span className="text-muted-foreground/50">Оберіть місто</span>
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nameUk}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Опис</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Розкажіть про себе, досвід, спеціалізацію..."
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Зберігаємо...' : 'Зберегти'}
        </Button>

        {profile && profile.status === 'draft' && (
          <Button onClick={handlePublish} disabled={saving} variant="secondary" className="w-full bg-green-600 hover:bg-green-700 text-white">
            Опублікувати профіль
          </Button>
        )}
      </div>

      {profile && (
        <div className="bg-card rounded-2xl border p-4 text-center">
          <SignOutButton>
            <Button variant="ghost" className="text-destructive hover:text-destructive">
              Вийти з акаунту
            </Button>
          </SignOutButton>
        </div>
      )}

      <Sheet open={slugSheet} onOpenChange={setSlugSheet}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Редагувати посилання</SheetTitle>
          </SheetHeader>
          <div className="pt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Оберіть коротке та зрозуміле посилання для вашої сторінки.
            </p>

            <div>
              <label className="block text-sm font-medium mb-1">Ваше посилання</label>
              <div className="flex items-center gap-0 rounded-xl border overflow-hidden bg-white">
                <span className="shrink-0 px-3 py-2.5 text-sm text-muted-foreground bg-muted border-r">
                  poruch.app/p/
                </span>
                <input
                  value={slugInput}
                  onChange={(e) => {
                    setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                    setSlugError(null)
                  }}
                  className="flex-1 min-w-0 px-3 py-2.5 text-sm outline-none bg-transparent"
                  placeholder="iryna-melnyk"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Латинські літери, цифри та дефіс. Мінімум 3 символи.
              </p>
            </div>

            {slugError && (
              <div className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{slugError}</div>
            )}

            <Button
              onClick={handleSlugSave}
              disabled={slugSaving || slugInput.length < 3}
              className="w-full"
            >
              {slugSaving ? 'Зберігаємо...' : 'Зберегти'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
