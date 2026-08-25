import { useEffect, useMemo, useState } from 'react'
import { EmptyState, Screen, SearchInput, Skeleton } from '../components/ui'
import { ChevronRight, SearchIcon } from '../components/icons'
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
      (c) => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q),
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
            // Вся строка — кнопка: попасть по ней проще, чем по круглой иконке,
            // а шеврон справа читается так же, как в остальных списках приложения.
            <button
              className="row"
              key={curator.id}
              type="button"
              onClick={() => {
                haptic.press()
                openTelegram(`https://t.me/${curator.username}`)
              }}
            >
              {curator.photoUrl ? (
                <img className="row__avatar" src={curator.photoUrl} alt="" loading="lazy" />
              ) : (
                // Пока фото нет — пустой кружок, ждёт реальную картинку.
                <div className="row__avatar" />
              )}

              <div className="row__body">
                <div className="row__name">{curator.name}</div>
                <div className="row__role">{curator.role}</div>
              </div>

              <ChevronRight size={20} className="chevron" style={{ alignSelf: 'center' }} />
            </button>
          ))
        ) : (
          <EmptyState icon={<SearchIcon size={30} />} title="Куратор не найден" />
        )}
      </div>
    </Screen>
  )
}
