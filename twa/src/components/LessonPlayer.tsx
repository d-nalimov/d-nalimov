import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Lesson } from '../api/types'
import { formatTime } from '../lib/format'
import { haptic } from '../telegram/sdk'
import { Forward10, PauseIcon, PlayIcon, Rewind10 } from './icons'

interface Props {
  lesson: Lesson
  /** Кэшированный таймкод: с него продолжаем просмотр. */
  startAt: number
  onProgress: (positionSec: number, durationSec: number) => void
}

const PLAYER_JS = { context: 'player.js', version: '0.0.11' }

/**
 * Плеер урока.
 *
 * Kinescope-встраивание общается по протоколу player.js через postMessage:
 * подписываемся на ready/timeupdate/ended, промотку делаем setCurrentTime.
 * Если у урока нет kinescopeId (демо-каталог), включается симулятор с той же
 * логикой таймкода и промотки — так весь флоу (кэш позиции, начисление
 * моггсов за досмотр) проверяется без реального аккаунта Kinescope.
 */
export function LessonPlayer({ lesson, startAt, onProgress }: Props) {
  const demo = !lesson.kinescopeId
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(startAt)
  const [duration, setDuration] = useState(lesson.durationSec)
  const seekedToStart = useRef(false)

  const report = useCallback(
    (pos: number, dur: number) => {
      setPosition(pos)
      if (dur > 0) setDuration(dur)
      onProgress(pos, dur > 0 ? dur : lesson.durationSec)
    },
    [lesson.durationSec, onProgress],
  )

  // ---- Kinescope: player.js ----

  const post = useCallback((method: string, value?: unknown) => {
    iframeRef.current?.contentWindow?.postMessage({ ...PLAYER_JS, method, value }, '*')
  }, [])

  useEffect(() => {
    if (demo) return
    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return
      const data = typeof event.data === 'string' ? safeParse(event.data) : event.data
      if (!data || data.context !== 'player.js') return

      if (data.event === 'ready') {
        post('addEventListener', 'timeupdate')
        post('addEventListener', 'ended')
        post('addEventListener', 'play')
        post('addEventListener', 'pause')
        if (!seekedToStart.current && startAt > 3) {
          seekedToStart.current = true
          post('setCurrentTime', startAt)
        }
      }
      if (data.event === 'timeupdate' && data.value) {
        report(Number(data.value.seconds) || 0, Number(data.value.duration) || 0)
      }
      if (data.event === 'play') setPlaying(true)
      if (data.event === 'pause') setPlaying(false)
      if (data.event === 'ended') {
        setPlaying(false)
        report(duration || lesson.durationSec, duration || lesson.durationSec)
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [demo, duration, lesson.durationSec, post, report, startAt])

  // ---- Демо-режим: тот же контракт без реального видео ----

  useEffect(() => {
    if (!demo || !playing) return
    const timer = window.setInterval(() => {
      setPosition((prev) => {
        const next = Math.min(prev + 0.5, lesson.durationSec)
        onProgress(next, lesson.durationSec)
        if (next >= lesson.durationSec) setPlaying(false)
        return next
      })
    }, 500)
    return () => window.clearInterval(timer)
  }, [demo, playing, lesson.durationSec, onProgress])

  const toggle = useCallback(() => {
    haptic.tap()
    if (demo) {
      setPlaying((p) => !p)
      return
    }
    post(playing ? 'pause' : 'play')
    setPlaying((p) => !p)
  }, [demo, playing, post])

  const seekTo = useCallback(
    (seconds: number) => {
      const target = Math.min(Math.max(0, seconds), duration || lesson.durationSec)
      haptic.select()
      if (!demo) post('setCurrentTime', target)
      report(target, duration || lesson.durationSec)
    },
    [demo, duration, lesson.durationSec, post, report],
  )

  const src = useMemo(() => {
    if (demo) return ''
    const params = new URLSearchParams({ autopause: '0', playsinline: '1' })
    if (startAt > 3) params.set('t', String(Math.floor(startAt)))
    return `https://kinescope.io/embed/${lesson.kinescopeId}?${params.toString()}`
  }, [demo, lesson.kinescopeId, startAt])

  const total = duration || lesson.durationSec
  const percent = total > 0 ? (position / total) * 100 : 0

  return (
    <div>
      <div className="player">
        {demo ? (
          <div className="player__demo">
            <PlayIcon size={34} style={{ color: 'var(--accent)' }} />
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={src}
            title={lesson.title}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
          />
        )}
      </div>

      <div
        className="seekbar"
        role="slider"
        aria-label="Позиция воспроизведения"
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(position)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') seekTo(position + 10)
          if (e.key === 'ArrowLeft') seekTo(position - 10)
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          seekTo(((e.clientX - rect.left) / rect.width) * total)
        }}
      >
        <span className="seekbar__fill" style={{ width: `${percent}%` }} />
        <span className="seekbar__knob" style={{ left: `${percent}%` }} />
      </div>

      <div className="player-bar">
        <button className="icon-btn" onClick={() => seekTo(position - 10)} aria-label="Назад 10 секунд" type="button">
          <Rewind10 size={20} />
        </button>
        <button
          className="btn btn--accent"
          style={{ flex: 1 }}
          onClick={toggle}
          type="button"
        >
          {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          {playing ? 'Пауза' : position > 3 ? 'Продолжить' : 'Смотреть'}
        </button>
        <button className="icon-btn" onClick={() => seekTo(position + 10)} aria-label="Вперёд 10 секунд" type="button">
          <Forward10 size={20} />
        </button>
      </div>

      <div className="player-bar" style={{ justifyContent: 'center', marginTop: 8 }}>
        <span className="player-bar__time">
          {formatTime(position)} / {formatTime(total)}
        </span>
      </div>
    </div>
  )
}

function safeParse(raw: string): { context?: string; event?: string; value?: Record<string, unknown> } | null {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
