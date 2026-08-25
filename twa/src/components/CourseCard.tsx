import type { Category } from '../api/types'
import { ChevronRight, LockIcon } from './icons'

export function CourseCard({
  category,
  locked,
  index = 0,
  onClick,
}: {
  category: Category
  locked: boolean
  /** Порядковый номер в сетке — задаёт задержку появления. */
  index?: number
  onClick: () => void
}) {
  return (
    <button
      className="course pressable appear"
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
      onClick={onClick}
      type="button"
    >
      {category.cover ? (
        <img className="course__img" src={category.cover} alt="" loading="lazy" />
      ) : (
        // Пока обложки нет — ровная подложка в тон категории.
        <div
          className="course__img"
          style={{
            background: `linear-gradient(165deg, ${category.tint} 0%, #121212 100%)`,
          }}
        />
      )}

      <div className="course__shade" />

      {locked ? (
        <span className="course__lock">
          <LockIcon size={16} />
        </span>
      ) : null}

      <div className="course__body">
        <div className="course__title">{category.title}</div>
        <div className="course__meta">
          <ChevronRight size={15} strokeWidth={2.4} />
          {category.lessonsCount}
        </div>
      </div>
    </button>
  )
}
