import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CourseCard } from '../components/CourseCard'
import { PaywallSheet } from '../components/PaywallSheet'
import { ProfileCard } from '../components/ProfileCard'
import { ChatIcon, LibraryIcon, UsersIcon } from '../components/icons'
import { Screen, Skeleton } from '../components/ui'
import { haptic, openTelegram } from '../telegram/sdk'
import { useBackButton } from '../telegram/useTelegram'
import { useAppStore } from '../store/useAppStore'

export function HomePage() {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const config = useAppStore((s) => s.config)
  const categories = useAppStore((s) => s.categories)
  const hasAccess = useAppStore((s) => s.hasAccess)
  const [paywall, setPaywall] = useState(false)

  useBackButton(undefined)

  useEffect(() => {
    document.title = 'Кэш`ю — клуб'
  }, [])

  const access = hasAccess()

  return (
    <Screen>
      {user ? <ProfileCard user={user} onClick={() => navigate('/profile')} /> : <Skeleton height={72} />}

      <div className="tiles">
        <button
          className="tile"
          type="button"
          onClick={() => {
            haptic.tap()
            document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })
          }}
        >
          <span className="tile__box">
            <LibraryIcon size={26} />
          </span>
          <span className="caps-label">База материалов</span>
        </button>
        <button
          className="tile"
          type="button"
          onClick={() => {
            haptic.tap()
            navigate('/curators')
          }}
        >
          <span className="tile__box">
            <UsersIcon size={26} />
          </span>
          <span className="caps-label">Кураторы</span>
        </button>
        <button
          className="tile"
          type="button"
          onClick={() => {
            haptic.tap()
            if (config) openTelegram(config.communityUrl)
          }}
        >
          <span className="tile__box">
            <ChatIcon size={26} />
          </span>
          <span className="caps-label">Сообщество</span>
        </button>
      </div>

      {!access ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="gold">Открыт бесплатный блок</div>
          <button
            className="btn btn--gold btn--block"
            style={{ marginTop: 12 }}
            onClick={() => setPaywall(true)}
            type="button"
          >
            Смотреть
          </button>
        </div>
      ) : null}

      <h2 className="section-title" id="catalog">
        База материалов
      </h2>

      <div className="courses">
        {categories.length
          ? categories.map((category) => (
              <CourseCard
                key={category.id}
                category={category}
                locked={!category.free && !access}
                onClick={() => {
                  haptic.tap()
                  navigate(`/category/${category.id}`)
                }}
              />
            ))
          : [0, 1, 2, 3].map((i) => <Skeleton key={i} height={168} />)}
      </div>

      {paywall ? <PaywallSheet onClose={() => setPaywall(false)} /> : null}
    </Screen>
  )
}
