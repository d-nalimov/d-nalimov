import type { Category } from '../api/types'
import { plural } from '../lib/format'
import { ChevronRight, LockIcon } from './icons'

export function CourseCard({
  category,
  locked,
  onClick,
}: {
  category: Category
  locked: boolean
  onClick: () => void
}) {
  return (
    <button className="course" onClick={onClick} type="button">
      {category.cover ? (
        <img className="course__img" src={category.cover} alt="" loading="lazy" />
      ) : (
        <div
          className="course__img"
          style={{
            background: `radial-gradient(120% 90% at 20% 10%, ${category.tint} 0%, #12100c 70%, #0b0705 100%)`,
            display: 'grid',
            placeItems: 'center',
            fontSize: 54,
          }}
        >
          <span style={{ opacity: 0.55 }}>{category.emoji}</span>
        </div>
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
          <ChevronRight size={14} />
          {category.lessonsCount} {plural(category.lessonsCount, 'урок', 'урока', 'уроков')}
        </div>
      </div>
    </button>
  )
}
