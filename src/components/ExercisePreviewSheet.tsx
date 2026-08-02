import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Exercise } from '../types'
import { CloseIcon } from './icons'

interface ExercisePreviewSheetProps {
  exercise: Exercise | null
  onClose: () => void
}

export function ExercisePreviewSheet({ exercise, onClose }: ExercisePreviewSheetProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const open = exercise !== null

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const video = videoRef.current
    if (!exercise || !video) return
    video.load()
    return () => {
      video.pause()
      video.currentTime = 0
    }
  }, [exercise])

  if (!open) return null

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[210] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden={!open}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={exercise ? `Demonstração: ${exercise.name}` : undefined}
        className={`fixed inset-x-0 bottom-0 z-[211] mx-auto max-w-[430px] transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="rounded-t-3xl bg-surface-2 shadow-2xl pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-neutral-600" />
          </div>

          {exercise && (
            <>
              <div className="relative mx-4 overflow-hidden rounded-2xl bg-black aspect-video">
                <video
                  ref={videoRef}
                  key={exercise.id}
                  className="h-full w-full object-cover"
                  poster={exercise.posterUrl}
                  controls
                  playsInline
                  loop
                  preload="metadata"
                >
                  <source src={exercise.videoUrl} type="video/mp4" />
                </video>
              </div>

              <div className="flex items-start justify-between gap-3 px-4 pt-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                    {exercise.muscle}
                  </p>
                  <h2 className="mt-0.5 text-xl font-bold">{exercise.name}</h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    {exercise.sets} · Descanso {exercise.rest} · {exercise.equipment}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-neutral-400 active:bg-neutral-700"
                  aria-label="Fechar"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="px-4 pt-4 pb-6">
                <p className="text-sm leading-relaxed text-neutral-300">{exercise.description}</p>

                <h3 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Dicas de execução
                </h3>
                <ul className="flex flex-col gap-2">
                  {exercise.tips.map((tip) => (
                    <li
                      key={tip}
                      className="flex items-start gap-2 rounded-lg bg-surface-3 px-3 py-2 text-sm text-neutral-300"
                    >
                      <span className="mt-0.5 text-brand">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
