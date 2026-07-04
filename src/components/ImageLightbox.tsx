import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// A minimal image lightbox: one image centred at up to its natural size (capped to the
// viewport) over a dark scrim. Closes on Escape, a scrim click, or ✕. Portaled to <body> at a
// higher layer than RecipeModal (z-[60] > z-50) so it also works from the Plan page's quick-view
// modal — its Escape listener runs in the capture phase and stops propagation, so one press
// closes the lightbox without also closing the modal underneath.
export function ImageLightbox({
  src,
  alt = '',
  label,
  onClose,
}: {
  src: string
  alt?: string
  label: string
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  // SVGs (the demo placeholders) declare only a viewBox, so an <img> gives them no intrinsic
  // width and they collapse under bare max-* caps; size them explicitly instead (see below).
  const isVector = /\.svg(\?|#|$)/i.test(src)

  useEffect(() => {
    const restore = document.activeElement as HTMLElement | null
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation() // beat any Escape handler on the surface beneath us
        onClose()
      }
    }
    // Capture phase, so this fires before a bubble-phase listener on the modal below.
    document.addEventListener('keydown', onKey, true)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
      restore?.focus?.()
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center bg-ink/80 p-4 sm:p-8"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="relative cursor-default"
      >
        <button
          type="button"
          ref={closeRef}
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-3 -right-3 rounded-full bg-card px-2 py-1 text-lg leading-none text-muted shadow-md hover:text-ink"
        >
          ✕
        </button>
        {/* Shows the whole (uncropped) image, capped to the viewport. Raster photos show at up
            to their natural size (never upscaled past it); vector placeholders — which carry no
            intrinsic width — are given one so they scale up crisply to fill the frame. */}
        <img
          src={src}
          alt={alt}
          className={
            isVector
              ? 'max-h-[88vh] w-[min(92vw,60rem)] rounded-lg object-contain shadow-2xl'
              : 'max-h-[88vh] max-w-[92vw] rounded-lg object-contain shadow-2xl'
          }
        />
      </div>
    </div>,
    document.body,
  )
}
