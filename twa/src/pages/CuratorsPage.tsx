import { useEffect, useMemo, useState } from 'react'
import { EmptyState, Screen, SearchInput, Skeleton } from '../components/ui'
import { SearchIcon, SendIcon } from '../components/icons'
import { initials } from '../lib/format'
import { haptic, openTelegram } from '../telegram/sdk'
import { useBackButton } from '../telegram/useTelegram'
import { useAppStore } from '../store/useAppStore'

export function CuratorsPage() {
  const curators = useAppStore((s) => s.curators)
  const loadCurators = useAppStore((s) => s.loadCurators)
  const [query, setQuery] = useState('')

  useBackButton(undefined)

  useEffect(() => {
    void loadCurators()
  }, [loadCurators])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return curators
    return curators.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q),
    )
  }, [curators, query])

  return (
    <Screen title="Кураторы">
      <SearchInput value={query} onChange={setQuery} placeholder="Имя или направление" />

      <div className="card" style={{ padding: '0 16px', marginTop: 14 }}>
        {!curators.length ? (
          <div style={{ padding: '14px 0' }}>
            <Skeleton height={64} />
          </div>
        ) : filtered.length ? (
          filtered.map((curator) => (
            <div className="row" key={curator.id}>
              {curator.photoUrl ? (
                <img className="row__avatar" src={curator.photoUrl} alt="" loading="lazy" />
              ) : (
                <div
                  className="row__avatar"
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {initials(curator.name.split(' ')[0], curator.name.split(' ')[1])}
                </div>
              )}

              <div className="row__body">
                <div className="row__name">
                  {curator.name}{' '}
                  {curator.tag ? (
                    <span className="badge" style={{ marginLeft: 4 }}>
                      {curator.tag}
                    </span>
                  ) : null}
                </div>
                <div className="row__role">{curator.role}</div>
                <div className="row__text">{curator.about}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  @{curator.username}
                </div>
              </div>

              <button
                className="icon-btn icon-btn--on"
                type="button"
                aria-label={`Написать ${curator.name}`}
                onClick={() => {
                  haptic.press()
                  openTelegram(`https://t.me/${curator.username}`)
                }}
              >
                <SendIcon size={19} />
              </button>
            </div>
          ))
        ) : (
          <EmptyState icon={<SearchIcon size={30} />} title="Куратор не найден" />
        )}
      </div>
    </Screen>
  )
}
