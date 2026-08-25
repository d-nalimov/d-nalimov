import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isMockMode } from '../api'
import { resetMockState } from '../api/mockApi'
import { PaywallSheet } from '../components/PaywallSheet'
import { ProfileCard } from '../components/ProfileCard'
import { Screen, Skeleton } from '../components/ui'
import { ChevronLeft, SendIcon, UsersIcon } from '../components/icons'
import { formatMoney } from '../lib/format'
import { haptic, openTelegram } from '../telegram/sdk'
import { useBackButton } from '../telegram/useTelegram'
import { useAppStore } from '../store/useAppStore'

export function ProfilePage() {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const config = useAppStore((s) => s.config)
  const progress = useAppStore((s) => s.progress)
  const favorites = useAppStore((s) => s.favorites)
  const hasAccess = useAppStore((s) => s.hasAccess)
  const [paywall, setPaywall] = useState(false)

  useBackButton(() => navigate(-1))

  const completed = Object.values(progress).filter((p) => p.completed).length

  return (
    <Screen>
      <h1 className="subhead">
        <button className="subhead__back" onClick={() => navigate('/')} type="button" aria-label="Назад">
          <ChevronLeft size={20} />
        </button>
        Профиль
      </h1>

      {user ? <ProfileCard user={user} /> : <Skeleton height={72} />}

      <div className="card" style={{ marginTop: 12, display: 'flex', gap: 16 }}>
        <Stat value={user?.moggs ?? 0} label="Моггсы" />
        <Stat value={completed} label="Уроки" />
        <Stat value={favorites.length} label="Избранное" />
      </div>

      {!hasAccess() && config ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700 }}>Полный доступ</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            Ежемесячная оплата {formatMoney(config.priceAmount, config.priceCurrency)}, и вся база
            материалов открывается навсегда.
          </div>
          <button
            className="btn btn--gold btn--block"
            style={{ marginTop: 12 }}
            onClick={() => setPaywall(true)}
            type="button"
          >
            Открыть доступ
          </button>
        </div>
      ) : null}

      <div className="stack" style={{ marginTop: 12 }}>
        <button
          className="btn btn--block"
          type="button"
          onClick={() => {
            haptic.tap()
            if (config) openTelegram(config.communityUrl)
          }}
        >
          <UsersIcon size={19} />
          Сообщество клуба
        </button>
        <button
          className="btn btn--block"
          type="button"
          onClick={() => {
            haptic.tap()
            openTelegram(`https://t.me/${config?.managerUsername ?? 'ceo_trauma'}`)
          }}
        >
          <SendIcon size={19} />
          Написать менеджеру
        </button>
      </div>

      {isMockMode ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="muted" style={{ fontSize: 12 }}>
            Демо-режим: данные хранятся локально в браузере, бэкенд не подключён
            (<code>VITE_API_BASE_URL</code> пуст).
          </div>
          <button
            className="btn btn--ghost btn--block"
            style={{ marginTop: 10 }}
            type="button"
            onClick={() => {
              resetMockState()
              window.location.reload()
            }}
          >
            Сбросить демо-данные
          </button>
        </div>
      ) : null}

      {paywall ? <PaywallSheet onClose={() => setPaywall(false)} /> : null}
    </Screen>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  // Подпись сверху, число под ней — как в карточке баланса на экране бонусов.
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div className="caps-label">{label}</div>
      <div className="balance__value" style={{ fontSize: 28, marginTop: 4 }}>
        {value}
      </div>
    </div>
  )
}
