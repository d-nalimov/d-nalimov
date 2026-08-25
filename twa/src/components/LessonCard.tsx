import type { Lesson, LessonProgress } from '../api/types'
import { formatDuration, formatTime } from '../lib/format'
import { DownloadIcon, HeartIcon, LockIcon, PlayIcon } from './icons'

export function LessonCard({
  lesson,
  progress,
  favorite,
  locked,
  onOpen,
  onToggleFavorite,
  onMaterials,
}: {
  lesson: Lesson
  progress?: LessonProgress
  favorite: boolean
  locked: boolean
  onOpen: () => void
  onToggleFavorite: () => void
  onMaterials: () => void
}) {
  const watched =
    progress && progress.durationSec > 0
      ? Math.min(100, (progress.positionSec / progress.durationSec) * 100)
      : 0

  const meta = [
    formatDuration(lesson.durationSec),
    lesson.free ? 'Бесплатно' : null,
    progress?.completed
      ? 'Пройден'
      : progress && progress.positionSec > 5
        ? `Остановились на ${formatTime(progress.positionSec)}`
        : null,
  ].filter(Boolean)

  return (
    <article>
      <div className="lesson__card">
        <div className="lesson__head">
          <h2 className="lesson__title">{lesson.title}</h2>
          <div className="lesson__fav">
            <button
              className={`lesson__fav-btn${favorite ? ' lesson__fav-btn--on' : ''}`}
              onClick={onToggleFavorite}
              aria-label={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
              aria-pressed={favorite}
              type="button"
            >
              <HeartIcon size={20} filled={favorite} />
            </button>
          </div>
        </div>

        <button className="lesson__poster" onClick={onOpen} type="button" aria-label={lesson.title}>
          {lesson.poster ? <img src={lesson.poster} alt="" loading="lazy" /> : null}
          <span className="lesson__play">
            {locked ? <LockIcon size={21} /> : <PlayIcon size={21} />}
          </span>
          {watched > 0 ? (
            <span className="lesson__progress">
              <span style={{ width: `${watched}%` }} />
            </span>
          ) : null}
        </button>

        <div className="lesson__meta">{meta.join(' · ')}</div>
      </div>

      {/* В референсе материалы — отдельная кнопка под карточкой, а не внутри неё. */}
      {lesson.materialsUrl ? (
        <button className="btn btn--block" style={{ marginTop: 10 }} onClick={onMaterials} type="button">
          <DownloadIcon size={19} />
          Материалы к уроку
        </button>
      ) : null}
    </article>
  )
}
