import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

import type { ReactNode, RefObject } from 'react'

interface DialogProps {
  children: ReactNode
  className?: string
  description: ReactNode
  initialFocusRef?: RefObject<HTMLElement | null>
  onOpenChange: (open: boolean) => void
  open: boolean
  title: ReactNode
}

let lockedDialogCount = 0
let previousBodyOverflow = ''

function lockDocumentScroll() {
  if (lockedDialogCount === 0) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockedDialogCount += 1
}

function unlockDocumentScroll() {
  lockedDialogCount = Math.max(0, lockedDialogCount - 1)
  if (lockedDialogCount === 0) {
    document.body.style.overflow = previousBodyOverflow
  }
}

function openModal(dialog: HTMLDialogElement) {
  if (typeof dialog.showModal === 'function') {
    dialog.showModal()
    return
  }
  dialog.setAttribute('open', '')
}

function closeModal(dialog: HTMLDialogElement) {
  if (typeof dialog.close === 'function') {
    dialog.close()
    return
  }
  dialog.removeAttribute('open')
}

export function Dialog({
  children,
  className = '',
  description,
  initialFocusRef,
  onOpenChange,
  open,
  title,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const scrollLockedRef = useRef(false)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      if (!dialog.open) openModal(dialog)
      if (!scrollLockedRef.current) {
        lockDocumentScroll()
        scrollLockedRef.current = true
      }
      initialFocusRef?.current?.focus({ preventScroll: true })
      return
    }

    if (dialog.open) closeModal(dialog)
    if (scrollLockedRef.current) {
      unlockDocumentScroll()
      scrollLockedRef.current = false
    }
    returnFocusRef.current?.focus({ preventScroll: true })
    returnFocusRef.current = null
  }, [initialFocusRef, open])

  useEffect(
    () => () => {
      const dialog = dialogRef.current
      if (dialog?.open) closeModal(dialog)
      if (scrollLockedRef.current) {
        unlockDocumentScroll()
        scrollLockedRef.current = false
      }
      returnFocusRef.current?.focus({ preventScroll: true })
    },
    [],
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    function handleBackdropClick(event: MouseEvent) {
      if (event.target === dialog) onOpenChange(false)
    }

    dialog.addEventListener('click', handleBackdropClick)
    return () => dialog.removeEventListener('click', handleBackdropClick)
  }, [onOpenChange])

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className={`app-dialog m-auto max-h-[calc(100dvh-2rem)] w-[min(calc(100%-2rem),42rem)] overflow-y-auto rounded-2xl border border-[#d9d6ce] bg-white p-0 text-[#28332f] shadow-2xl ${className}`}
      onCancel={(event) => {
        event.preventDefault()
        onOpenChange(false)
      }}
      ref={dialogRef}
    >
      <div className="relative p-6 sm:p-7">
        <div className="pr-12">
          <h2 className="text-xl font-bold tracking-tight text-[#28332f]" id={titleId}>
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#65706b]" id={descriptionId}>
            {description}
          </p>
        </div>
        <button
          aria-label="Close dialog"
          className="absolute top-5 right-5 inline-flex size-10 items-center justify-center rounded-full border border-transparent text-[#69736e] hover:border-[#dedad2] hover:bg-[#f7f5ef] hover:text-[#28332f]"
          onClick={() => onOpenChange(false)}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
        <div className="mt-6">{children}</div>
      </div>
    </dialog>
  )
}
