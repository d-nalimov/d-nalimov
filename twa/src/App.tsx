import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
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
  const location = useLocation()

  // Тост держим на экране лишний миг, чтобы он успел уйти анимацией.
  const [shownToast, setShownToast] = useState<string | null>(null)
  const [toastLeaving, setToastLeaving] = useState(false)

  useEffect(() => {
    if (toast) {
      setShownToast(toast)
      setToastLeaving(false)
      return
    }
    if (!shownToast) return
    setToastLeaving(true)
    const timer = window.setTimeout(() => setShownToast(null), 220)
    return () => window.clearTimeout(timer)
  }, [toast, shownToast])

  useEffect(() => {
    void boot()
  }, [boot])

  if (!ready) {
    return (
      <Screen title="ПИК">
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
      <Screen title="ПИК">
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
      {/* Ключ по адресу: каждый экран появляется своим движением. */}
      <div className="page" key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/category/:categoryId" element={<CategoryPage />} />
          <Route path="/lesson/:lessonId" element={<LessonPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/curators" element={<CuratorsPage />} />
          <Route path="/bonuses" element={<BonusesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <TabBar />

      {shownToast ? (
        <div
          className={`toast${toastLeaving ? ' toast--leaving' : ''}`}
          role="status"
          onClick={hideToast}
        >
          {shownToast}
        </div>
      ) : null}
    </div>
  )
}
