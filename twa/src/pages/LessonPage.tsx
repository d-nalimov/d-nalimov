import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import type { Lesson } from '../api/types'
import { LessonPlayer } from '../components/LessonPlayer'
import { Screen, Skeleton } from '../components/ui'
import { ChevronLeft, ChevronRight, DownloadIcon, HeartIcon } from '../components/icons'
import { haptic, openTelegram } from '../telegram/sdk'
import { useBackButton } from '../telegram/useTelegram'
import { useAppStore } from '../store/useAppStore'

/** Как часто отправляем таймкод на бэкенд во время просмотра. */
const SAVE_INTERVAL_MS = 5000

export function LessonPage() {
  const { lessonId = '' } = useParams()
  const navigate = useNavigate()
  const progress = useAppStore((s) => s.progress)
  const favorites = useAppStore((s) => s.favorites)
  const toggleFavorite = useAppStore((s) => s.toggleFavorite)
  const saveProgress = useAppStore((s) => s.saveProgress)
  const showToast = useAppStore((s) => s.showToast)
  const lessonsByCategory = useAppStore((s) => s.lessonsByCategory)
  const loadLessons = useAppStore((s) => s.loadLessons)

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Стартовый таймкод фиксируем один раз, чтобы плеер не перематывал себя на каждый тик.
  const startAt = useRef<number | null>(null)
  const lastSaved = useRef(0)
  const latest = useRef<{ position: number; duration: number } | null>(null)

  useBackButton(() => navigate(-1))

  useEffect(() => {
    let cancelled = false
    setLesson(null)
    setError(null)
    // Новый урок — новый стартовый таймкод и свой буфер прогресса.
    startAt.current = null
    latest.current = null
    lastSaved.current = 0
    api
      .getLesson(lessonId)
      .then((data) => {
        if (cancelled) return
        setLesson(data)
        void loadLessons(data.categoryId)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Урок недоступен')
      })
    return () => {
      cancelled = true
    }
  }, [lessonId, loadLessons])

  if (startAt.current === null && lesson) {
    const saved = progress[lesson.id]
    startAt.current = saved && !saved.completed ? saved.positionSec : 0
  }

  const onProgress = useCallback(
    (position: number, duration: number) => {
      latest.current = { position, duration }
      const now = Date.now()
      if (now - lastSaved.current < SAVE_INTERVAL_MS) return
      lastSaved.current = now
      void saveProgress(lessonId, position, duration)
    },
    [lessonId, saveProgress],
  )

  // Досохраняем позицию при уходе с экрана — иначе теряются последние секунды.
  useEffect(
    () => () => {
      if (latest.current) {
        void saveProgress(lessonId, latest.current.position, latest.current.duration)
      }
    },
    [lessonId, saveProgress],
  )

  if (error) {
    return (
      <Screen title="Урок">
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{error}</div>
          <button className="btn btn--accent btn--block" onClick={() => navigate('/')} type="button">
            На главную
          </button>
        </div>
      </Screen>
    )
  }

  if (!lesson || startAt.current === null) {
    return (
      <Screen title="Урок">
        <Skeleton height={210} />
      </Screen>
    )
  }

  const siblings = lessonsByCategory[lesson.categoryId] ?? []
  const index = siblings.findIndex((l) => l.id === lesson.id)
  const next = index >= 0 ? siblings[index + 1] : undefined
  const favorite = favorites.includes(lesson.id)

  return (
    <Screen>
      <div className="subhead">
        <button className="subhead__back" onClick={() => navigate(-1)} type="button" aria-label="Назад">
          <ChevronLeft size={20} />
        </button>
        <h1 className="subhead__title" style={{ fontSize: 22 }}>
            {lesson.title}
          </h1>
      </div>

      <LessonPlayer lesson={lesson} startAt={startAt.current} onProgress={onProgress} />

      <p className="muted" style={{ marginTop: 16 }}>
        {lesson.description}
      </p>

      <div className="stack" style={{ marginTop: 12 }}>
        {lesson.materialsUrl ? (
          <button
            className="btn btn--block"
            type="button"
            onClick={() => {
              haptic.tap()
              openTelegram(lesson.materialsUrl as string)
            }}
          >
            <DownloadIcon size={19} />
            Материалы к уроку
          </button>
        ) : null}

        <button
          className={`btn btn--block${favorite ? ' btn--accent' : ' btn--ghost'}`}
          type="button"
          onClick={() => {
            void toggleFavorite(lesson.id)
            showToast(favorite ? 'Убрали из избранного' : 'Добавили в избранное')
          }}
        >
          <HeartIcon size={19} filled={favorite} />
          {favorite ? 'В избранном' : 'Добавить в избранное'}
        </button>

        {next ? (
          <button
            className="btn btn--block"
            type="button"
            onClick={() => {
              haptic.tap()
              navigate(`/lesson/${next.id}`)
            }}
          >
            Следующий урок
            <ChevronRight size={18} />
          </button>
        ) : null}
      </div>
    </Screen>
  )
}
