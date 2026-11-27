'use client'

import { useEffect, useRef, useCallback } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA'

interface Props {
  onVerify: (token: string) => void
  onExpire?: () => void
}

export function Turnstile({ onVerify, onExpire }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  const handleVerify = useCallback((token: string) => onVerify(token), [onVerify])
  const handleExpire = useCallback(() => onExpire?.(), [onExpire])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function renderWidget() {
      if (!container || !window.turnstile) return
      if (widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(container, {
        sitekey: SITE_KEY,
        callback: handleVerify,
        'expired-callback': handleExpire,
        theme: 'light',
        language: 'uk',
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.onload = renderWidget
      document.head.appendChild(script)
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [handleVerify, handleExpire])

  return <div ref={containerRef} />
}
