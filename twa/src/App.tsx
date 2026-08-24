import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { TabBar } from './components/TabBar'
import { BonusesPage } from './pages/BonusesPage'
import { CategoryPage } from './pages/CategoryPage'
import { CuratorsPage } from './pages/CuratorsPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { HomePage } from './pages/HomePage'
import { LessonPage } from './pages/LessonPage'
import { ProfilePage } from './pages/ProfilePage'
import { useAppStore } from './store/useAppStore'
import { Screen, Skeleton } from './components/ui'

export function App() {
  const ready = useAppStore((s) => s.ready)
  const bootError = useAppStore((s) => s.bootError)
  const boot = useAppStore((s) => s.boot)
  const toast = useAppStore((s) => s.toast)
  const hideToast = useAppStore((s) => s.hideToast)

  useEffect(() => {
    void boot()
  }, [boot])

  if (!ready) {
    return (
      <Screen title="Кэш`ю">
        <div className="stack">
          <Skeleton height={72} />
          <Skeleton height={96} />
          <Skeleton height={168} />
        </div>
      </Screen>
    )
  }

  if (bootError) {
    return (
      <Screen title="Кэш`ю">
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{bootError}</div>
          <p className="muted" style={{ fontSize: 13 }}>
            Проверь соединение и попробуй ещё раз.
          </p>
          <button className="btn btn--accent btn--block" onClick={() => void boot()} type="button">
            Повторить
          </button>
        </div>
      </Screen>
    )
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/category/:categoryId" element={<CategoryPage />} />
        <Route path="/lesson/:lessonId" element={<LessonPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/curators" element={<CuratorsPage />} />
        <Route path="/bonuses" element={<BonusesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <TabBar />

      {toast ? (
        <div className="toast" role="status" onClick={hideToast}>
          {toast}
        </div>
      ) : null}
    </div>
  )
}
