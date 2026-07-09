'use client'

import { Suspense, useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Module-level imperative bar state (singleton — one bar per app)
let bar: HTMLDivElement | null = null
let autoFinishTimeout: ReturnType<typeof setTimeout> | null = null
let finishDeferredTimeout: ReturnType<typeof setTimeout> | null = null
let startTime = 0
let running = false

export function startBar() {
  if (!bar) return

  // Clear any existing timers
  if (autoFinishTimeout) { clearTimeout(autoFinishTimeout); autoFinishTimeout = null }
  if (finishDeferredTimeout) { clearTimeout(finishDeferredTimeout); finishDeferredTimeout = null }

  running = true
  startTime = Date.now()

  // Reset without transition, then snap to starting position
  bar.style.transition = 'none'
  bar.style.opacity = '1'
  bar.style.transform = 'scaleX(0)'

  // Force reflow so the transition below is applied from the reset state
  bar.getBoundingClientRect()
  bar.style.transition = 'transform 2000ms linear'
  bar.style.transform = 'scaleX(1)'

  // Auto-finish after 2 seconds
  autoFinishTimeout = setTimeout(() => {
    finishBar()
  }, 2000)
}

// Freeze the bar at its current position
export function pauseBar() {
  if (autoFinishTimeout) { clearTimeout(autoFinishTimeout); autoFinishTimeout = null }
  if (finishDeferredTimeout) { clearTimeout(finishDeferredTimeout); finishDeferredTimeout = null }
  if (bar) {
    const computedStyle = window.getComputedStyle(bar)
    const transform = computedStyle.transform
    bar.style.transition = 'none'
    bar.style.transform = transform
  }
}

export function finishBar() {
  if (!bar || !running) return

  const elapsed = Date.now() - startTime
  const remaining = Math.max(0, 2000 - elapsed)

  // If there is still time remaining of the 2 seconds, defer finishing
  if (remaining > 0) {
    if (finishDeferredTimeout) return // Already deferred
    finishDeferredTimeout = setTimeout(() => {
      finishDeferredTimeout = null
      finishBar()
    }, remaining)
    return
  }

  // Clear timers
  if (autoFinishTimeout) { clearTimeout(autoFinishTimeout); autoFinishTimeout = null }
  if (finishDeferredTimeout) { clearTimeout(finishDeferredTimeout); finishDeferredTimeout = null }
  
  running = false

  // Snap to 100% then fade out
  bar.style.transition = 'transform 150ms ease-out'
  bar.style.transform = 'scaleX(1)'

  setTimeout(() => {
    if (!bar) return
    bar.style.transition = 'opacity 250ms ease'
    bar.style.opacity = '0'
    setTimeout(() => {
      if (!bar) return
      bar.style.transition = 'none'
      bar.style.transform = 'scaleX(0)'
    }, 300)
  }, 150)
}

// Placed inside a Suspense boundary so usePathname() resolves only after
// the new page's component tree is committed — not just after the URL changes.
function ProgressWatcher() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const didMount = useRef(false)

  useEffect(() => {
    // Skip the very first fire — page layouts handle bar completion during
    // their skeleton/loading phase. Only fire on actual route changes.
    if (!didMount.current) { didMount.current = true; return }
    finishBar()
  }, [pathname, searchParams])

  return null
}

export function NavigationProgress() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bar = ref.current

    const orig = {
      push: history.pushState.bind(history),
      replace: history.replaceState.bind(history),
    }

    history.pushState = (...args) => { startBar(); return orig.push(...args) }
    history.replaceState = (...args) => { startBar(); return orig.replace(...args) }
    window.addEventListener('popstate', startBar)

    return () => {
      history.pushState = orig.push
      history.replaceState = orig.replace
      window.removeEventListener('popstate', startBar)
      bar = null
    }
  }, [])

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          zIndex: 99999,
          pointerEvents: 'none',
        }}
      >
        <div
          ref={ref}
          style={{
            height: '100%',
            width: '100%',
            background: 'var(--foreground)',
            transformOrigin: '0 0',
            transform: 'scaleX(0)',
            opacity: 0,
            willChange: 'transform, opacity',
          }}
        />
      </div>
      <Suspense fallback={null}>
        <ProgressWatcher />
      </Suspense>
    </>
  )
}
