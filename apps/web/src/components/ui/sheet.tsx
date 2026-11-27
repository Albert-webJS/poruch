"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

const SheetOpenContext = React.createContext(false)

function Sheet({ open, ...props }: SheetPrimitive.Root.Props) {
  return (
    <SheetOpenContext.Provider value={!!open}>
      <SheetPrimitive.Root data-slot="sheet" open={open} {...props} />
    </SheetOpenContext.Provider>
  )
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      {...props}
    />
  )
}

/**
 * Blocks background scroll when sheet is open.
 * - Touch: intercepts touchmove outside the popup.
 * - Desktop: sets overflow:hidden on <html> to block wheel scroll.
 */
function useBodyScrollLock(active: boolean, popupRef: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    if (!active) return

    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = "hidden"

    const onTouchMove = (e: TouchEvent) => {
      const popup = popupRef.current
      // if popup not yet mounted, allow touch (don't block everything)
      if (!popup) return
      if (popup.contains(e.target as Node)) return
      e.preventDefault()
    }

    document.addEventListener("touchmove", onTouchMove, { passive: false })
    return () => {
      html.style.overflow = prevOverflow
      document.removeEventListener("touchmove", onTouchMove)
    }
  }, [active, popupRef])
}

/**
 * Tracks virtual keyboard height via visualViewport API.
 */
function useKeyboardOffset(enabled: boolean) {
  const [offset, setOffset] = React.useState(0)

  React.useEffect(() => {
    if (!enabled || typeof window === "undefined" || !window.visualViewport) return

    const vv = window.visualViewport
    const update = () => {
      setOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    }

    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [enabled])

  return offset
}

/**
 * When an input inside the ref gains focus, scroll it into view.
 */
function useScrollToFocused(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
  React.useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null
      if (!target || !("tagName" in target)) return
      const tag = target.tagName.toLowerCase()
      if (tag === "input" || tag === "textarea" || tag === "select") {
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "center" })
        }, 300)
      }
    }

    el.addEventListener("focusin", onFocusIn)
    return () => el.removeEventListener("focusin", onFocusIn)
  }, [ref, enabled])
}

function SheetContent({
  className,
  children,
  side = "right",
  fullscreen = false,
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  /** When true, bottom sheet becomes fullscreen on mobile (better for long forms) */
  fullscreen?: boolean
  showCloseButton?: boolean
}) {
  const isBottom = side === "bottom"
  const isOpen = React.useContext(SheetOpenContext)
  const keyboardOffset = useKeyboardOffset(isOpen && isBottom && !fullscreen)
  const popupRef = React.useRef<HTMLDivElement>(null)
  useBodyScrollLock(isOpen, popupRef)
  useScrollToFocused(popupRef, isOpen && isBottom)

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        ref={popupRef}
        data-slot="sheet-content"
        data-side={side}
        data-fullscreen={fullscreen || undefined}
        style={isBottom && !fullscreen && keyboardOffset > 0 ? { bottom: keyboardOffset } : undefined}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out overscroll-contain data-ending-style:opacity-0 data-starting-style:opacity-0",
          // bottom sheet (default — short forms)
          "data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:max-h-[85dvh] data-[side=bottom]:overflow-y-auto data-[side=bottom]:max-w-lg data-[side=bottom]:mx-auto data-[side=bottom]:rounded-t-2xl data-[side=bottom]:border-t data-[side=bottom]:px-5 data-[side=bottom]:pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem]",
          // bottom fullscreen (long forms) — fullscreen on mobile, constrained on desktop
          "data-[side=bottom][data-fullscreen]:max-h-none data-[side=bottom][data-fullscreen]:h-[100dvh] data-[side=bottom][data-fullscreen]:rounded-t-none data-[side=bottom][data-fullscreen]:overflow-y-auto data-[side=bottom][data-fullscreen]:sm:h-auto data-[side=bottom][data-fullscreen]:sm:max-h-[85dvh] data-[side=bottom][data-fullscreen]:sm:rounded-t-2xl",
          // left
          "data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem]",
          // right
          "data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem]",
          // top
          "data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem]",
          // size limits
          "data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
