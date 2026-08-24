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

  return (
    <article className="lesson">
      <div className="lesson__head">
        <h2 className="lesson__title">{lesson.title}</h2>
        <div className="lesson__fav">
          <span className="lesson__fav-label">
            {favorite ? 'В избранном' : 'Добавить в избранное'}
          </span>
          <button
            className={`icon-btn${favorite ? ' icon-btn--on' : ''}`}
            onClick={onToggleFavorite}
            aria-label={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
            aria-pressed={favorite}
            type="button"
            style={favorite ? undefined : { background: '#ded2c8', color: '#6d5c50' }}
          >
            <HeartIcon size={20} filled={favorite} />
          </button>
        </div>
      </div>

      <button className="lesson__poster" onClick={onOpen} type="button" aria-label={lesson.title}>
        {lesson.poster ? <img src={lesson.poster} alt="" loading="lazy" /> : null}
        <span className="lesson__play">
          {locked ? <LockIcon size={22} /> : <PlayIcon size={22} />}
        </span>
        {watched > 0 ? (
          <span className="lesson__progress">
            <span style={{ width: `${watched}%` }} />
          </span>
        ) : null}
      </button>

      <div className="lesson__badges">
        <span className="badge badge--muted">{formatDuration(lesson.durationSec)}</span>
        {lesson.free ? <span className="badge">Бесплатно</span> : null}
        {progress?.completed ? (
          <span className="badge badge--soft">Пройден</span>
        ) : progress && progress.positionSec > 5 ? (
          <span className="badge badge--soft">Продолжить с {formatTime(progress.positionSec)}</span>
        ) : null}
        {!progress?.rewarded ? (
          <span className="badge badge--muted">+{lesson.moggsReward} моггсов</span>
        ) : null}
      </div>

      {lesson.materialsUrl ? (
        <div className="lesson__foot">
          <button className="btn btn--block" onClick={onMaterials} type="button">
            <DownloadIcon size={19} />
            Материалы к уроку
          </button>
        </div>
      ) : null}
    </article>
  )
}
