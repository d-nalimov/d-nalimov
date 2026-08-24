import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { Lesson } from '../api/types'
import { LessonCard } from '../components/LessonCard'
import { PaywallSheet } from '../components/PaywallSheet'
import { EmptyState, Screen, Skeleton } from '../components/ui'
import { HeartIcon } from '../components/icons'
import { haptic, openTelegram } from '../telegram/sdk'
import { useBackButton } from '../telegram/useTelegram'
import { useAppStore } from '../store/useAppStore'

export function FavoritesPage() {
  const navigate = useNavigate()
  const favorites = useAppStore((s) => s.favorites)
  const progress = useAppStore((s) => s.progress)
  const toggleFavorite = useAppStore((s) => s.toggleFavorite)
  const hasAccess = useAppStore((s) => s.hasAccess)

  const [lessons, setLessons] = useState<Lesson[] | null>(null)
  const [paywall, setPaywall] = useState(false)
  const access = hasAccess()

  useBackButton(undefined)

  useEffect(() => {
    let cancelled = false
    api.getFavorites().then((list) => {
      if (!cancelled) setLessons(list)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Локальные снятия «сердечка» убираем из списка сразу.
  const visible = lessons?.filter((l) => favorites.includes(l.id)) ?? null

  return (
    <Screen title="Избранное">
      {!visible ? (
        <div className="stack">
          {[0, 1].map((i) => (
            <Skeleton key={i} height={280} />
          ))}
        </div>
      ) : visible.length ? (
        <div className="stack">
          {visible.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              progress={progress[lesson.id]}
              favorite
              locked={!lesson.free && !access}
              onOpen={() => {
                if (!lesson.free && !access) {
                  haptic.warning()
                  setPaywall(true)
                  return
                }
                haptic.tap()
                navigate(`/lesson/${lesson.id}`)
              }}
              onToggleFavorite={() => void toggleFavorite(lesson.id)}
              onMaterials={() => {
                haptic.tap()
                if (lesson.materialsUrl) openTelegram(lesson.materialsUrl)
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<HeartIcon size={30} />}
          title="Нет избранных уроков"
          hint="Нажми на сердечко у любого урока — он появится здесь"
          action={
            <button className="btn btn--accent" onClick={() => navigate('/')} type="button">
              В базу материалов
            </button>
          }
        />
      )}

      {paywall ? <PaywallSheet onClose={() => setPaywall(false)} /> : null}
    </Screen>
  )
}
