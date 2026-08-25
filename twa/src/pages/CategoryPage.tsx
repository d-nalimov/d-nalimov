import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LessonCard } from '../components/LessonCard'
import { PaywallSheet } from '../components/PaywallSheet'
import { Screen, SearchInput, Skeleton, EmptyState } from '../components/ui'
import { ChevronLeft, SearchIcon } from '../components/icons'
import { haptic, openTelegram } from '../telegram/sdk'
import { useBackButton } from '../telegram/useTelegram'
import { useAppStore } from '../store/useAppStore'
import type { Lesson } from '../api/types'

export function CategoryPage() {
  const { categoryId = '' } = useParams()
  const navigate = useNavigate()
  const categories = useAppStore((s) => s.categories)
  const lessonsByCategory = useAppStore((s) => s.lessonsByCategory)
  const loadLessons = useAppStore((s) => s.loadLessons)
  const favorites = useAppStore((s) => s.favorites)
  const progress = useAppStore((s) => s.progress)
  const toggleFavorite = useAppStore((s) => s.toggleFavorite)
  const hasAccess = useAppStore((s) => s.hasAccess)

  const [query, setQuery] = useState('')
  const [paywall, setPaywall] = useState(false)

  const category = categories.find((c) => c.id === categoryId)
  const lessons = lessonsByCategory[categoryId]
  const access = hasAccess()

  useBackButton(() => navigate(-1))

  useEffect(() => {
    void loadLessons(categoryId)
  }, [categoryId, loadLessons])

  const filtered = useMemo(() => {
    if (!lessons) return []
    const q = query.trim().toLowerCase()
    if (!q) return lessons
    return lessons.filter(
      (l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q),
    )
  }, [lessons, query])

  function openLesson(lesson: Lesson) {
    if (!lesson.free && !access) {
      haptic.warning()
      setPaywall(true)
      return
    }
    haptic.tap()
    navigate(`/lesson/${lesson.id}`)
  }

  return (
    <Screen>
      <h1 className="subhead">
        <button className="subhead__back" onClick={() => navigate('/')} type="button" aria-label="Назад">
          <ChevronLeft size={20} />
        </button>
        {category?.title ?? 'Категория'}
      </h1>

      <SearchInput value={query} onChange={setQuery} />

      <div className="lesson-list">
        {!lessons ? (
          [0, 1, 2].map((i) => <Skeleton key={i} height={280} />)
        ) : filtered.length ? (
          filtered.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              progress={progress[lesson.id]}
              favorite={favorites.includes(lesson.id)}
              locked={!lesson.free && !access}
              onOpen={() => openLesson(lesson)}
              onToggleFavorite={() => void toggleFavorite(lesson.id)}
              onMaterials={() => {
                haptic.tap()
                if (lesson.materialsUrl) openTelegram(lesson.materialsUrl)
              }}
            />
          ))
        ) : (
          <EmptyState icon={<SearchIcon size={30} />} title="Ничего не нашлось" hint="Попробуй другой запрос" />
        )}
      </div>

      {paywall ? <PaywallSheet onClose={() => setPaywall(false)} /> : null}
    </Screen>
  )
}
