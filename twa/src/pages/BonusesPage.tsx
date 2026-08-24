import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Prize } from '../api/types'
import { ApiError } from '../api/types'
import { PrizeWheel, WheelLegend } from '../components/PrizeWheel'
import { PromoCard } from '../components/PromoCard'
import { EmptyState, Screen, Segmented, Sheet, Skeleton } from '../components/ui'
import { GiftIcon, HistoryIcon, InfoIcon, TicketIcon } from '../components/icons'
import { formatDate, plural } from '../lib/format'
import { haptic } from '../telegram/sdk'
import { useBackButton } from '../telegram/useTelegram'
import { useAppStore } from '../store/useAppStore'

type Tab = 'wheel' | 'shop' | 'prizes'

export function BonusesPage() {
  const user = useAppStore((s) => s.user)
  const config = useAppStore((s) => s.config)
  const wheel = useAppStore((s) => s.wheel)
  const shop = useAppStore((s) => s.shop)
  const prizes = useAppStore((s) => s.prizes)
  const history = useAppStore((s) => s.moggsHistory)
  const loadBonuses = useAppStore((s) => s.loadBonuses)
  const loadPrizes = useAppStore((s) => s.loadPrizes)
  const refreshUser = useAppStore((s) => s.refreshUser)
  const showToast = useAppStore((s) => s.showToast)

  const [tab, setTab] = useState<Tab>('wheel')
  const [spinning, setSpinning] = useState(false)
  const [resultSectorId, setResultSectorId] = useState<string | null>(null)
  const [wonPrize, setWonPrize] = useState<Prize | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  useBackButton(undefined)

  useEffect(() => {
    void loadBonuses()
    void loadPrizes()
  }, [loadBonuses, loadPrizes])

  const moggs = user?.moggs ?? 0
  const spinCost = config?.spinCost ?? 100
  const canSpin = moggs >= spinCost && !spinning

  async function spin() {
    if (!canSpin) {
      haptic.warning()
      showToast(`Нужно ${spinCost} моггсов — смотри уроки и копи`)
      return
    }
    haptic.press()
    setSpinning(true)
    setWonPrize(null)
    setResultSectorId(null)
    try {
      const result = await api.spin()
      setResultSectorId(result.sectorId)
      setWonPrize(result.prize)
      await refreshUser()
    } catch (error) {
      setSpinning(false)
      haptic.error()
      showToast(error instanceof ApiError ? error.message : 'Не удалось прокрутить колесо')
    }
  }

  function onSpinEnd() {
    setSpinning(false)
    setShowResult(true)
    if (wonPrize) {
      haptic.success()
      void loadPrizes()
    } else {
      haptic.tap()
    }
    void refreshUser()
  }

  async function buy(itemId: string, price: number, title: string) {
    if (moggs < price) {
      haptic.warning()
      showToast('Недостаточно моггсов')
      return
    }
    haptic.press()
    try {
      await api.buy(itemId)
      await Promise.all([refreshUser(), loadPrizes()])
      haptic.success()
      showToast(`«${title}» — промокод в разделе «Мои призы»`)
      setTab('prizes')
    } catch (error) {
      haptic.error()
      showToast(error instanceof ApiError ? error.message : 'Покупка не прошла')
    }
  }

  async function usePrize(prize: Prize) {
    try {
      await api.usePrize(prize.id)
      await loadPrizes()
      showToast('Промокод отмечен как использованный')
    } catch (error) {
      haptic.error()
      showToast(error instanceof ApiError ? error.message : 'Не удалось обновить промокод')
    }
  }

  return (
    <Screen
      title="Мои бонусы"
      action={
        <button className="icon-btn" onClick={() => setShowInfo(true)} aria-label="Как это работает" type="button">
          <InfoIcon size={20} />
        </button>
      }
    >
      <div className="card balance">
        <div>
          <div className="muted" style={{ fontSize: 13 }}>
            Мои моггсы
          </div>
          <div className="balance__value moggs">{moggs}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            начисляются за просмотр уроков
          </div>
        </div>
        <button className="btn" onClick={() => setShowHistory(true)} type="button">
          <HistoryIcon size={18} />
          История
        </button>
      </div>

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'wheel', label: 'Колесо' },
          { value: 'shop', label: 'Магазин' },
          { value: 'prizes', label: 'Мои призы' },
        ]}
      />

      {tab === 'wheel' ? (
        <section style={{ marginTop: 18 }}>
          {wheel.length ? (
            <>
              <PrizeWheel
                sectors={wheel}
                resultSectorId={resultSectorId}
                spinning={spinning}
                onSpinEnd={onSpinEnd}
              />
              <button
                className="btn btn--accent btn--block"
                style={{ marginTop: 20 }}
                onClick={spin}
                disabled={spinning}
                type="button"
              >
                {spinning ? 'Крутим...' : `Крутить за ${spinCost} моггсов`}
              </button>
              <WheelLegend sectors={wheel} />
              <p className="muted" style={{ fontSize: 12, textAlign: 'center' }}>
                Приз приходит промокодом и действует {config?.promoTtlDays ?? 30}{' '}
                {plural(config?.promoTtlDays ?? 30, 'день', 'дня', 'дней')}.
              </p>
            </>
          ) : (
            <Skeleton height={280} radius={999} />
          )}
        </section>
      ) : null}

      {tab === 'shop' ? (
        <section style={{ marginTop: 18 }}>
          <div className="shop">
            {shop.length
              ? shop.map((item) => {
                  const affordable = moggs >= item.price
                  return (
                    <div className="shop__item" key={item.id}>
                      {item.image ? (
                        <img className="shop__img" src={item.image} alt="" loading="lazy" />
                      ) : (
                        <div className="shop__img" />
                      )}
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</div>
                      <div className="muted" style={{ fontSize: 12, flex: 1 }}>
                        {item.description}
                      </div>
                      <div className="shop__price">
                        {item.price} <span className="shop__price-unit">моггсов</span>
                      </div>
                      <button
                        className={`btn${affordable ? ' btn--accent' : ''}`}
                        style={{ minHeight: 40 }}
                        disabled={!affordable}
                        onClick={() => void buy(item.id, item.price, item.title)}
                        type="button"
                      >
                        {affordable ? 'Обменять' : 'Не хватает'}
                      </button>
                    </div>
                  )
                })
              : [0, 1].map((i) => <Skeleton key={i} height={220} />)}
          </div>
        </section>
      ) : null}

      {tab === 'prizes' ? (
        <section className="stack" style={{ marginTop: 18 }}>
          {prizes.length ? (
            prizes.map((prize) => (
              <PromoCard
                key={prize.id}
                prize={prize}
                managerUsername={config?.managerUsername ?? 'ceo_trauma'}
                onCopied={() => showToast('Промокод скопирован')}
                onUse={(p) => void usePrize(p)}
              />
            ))
          ) : (
            <EmptyState
              icon={<TicketIcon size={30} />}
              title="Призов пока нет"
              hint="Крути колесо или обменяй моггсы в магазине"
              action={
                <button className="btn btn--accent" onClick={() => setTab('wheel')} type="button">
                  К колесу
                </button>
              }
            />
          )}
        </section>
      ) : null}

      {showResult ? (
        <Sheet onClose={() => setShowResult(false)}>
          <div style={{ textAlign: 'center' }}>
            <GiftIcon size={44} style={{ color: 'var(--accent)' }} />
            <h2 className="screen__title" style={{ fontSize: 24, margin: '12px 0 6px' }}>
              {wonPrize ? 'Есть приз!' : 'В этот раз пусто'}
            </h2>
            <p className="muted" style={{ marginTop: 0 }}>
              {wonPrize
                ? `${wonPrize.title}. Промокод сохранён в «Мои призы» и действует до ${formatDate(wonPrize.expiresAt)}.`
                : 'Моггсы копятся за просмотр уроков — попробуй ещё раз.'}
            </p>
            <button
              className="btn btn--accent btn--block"
              style={{ marginTop: 14 }}
              onClick={() => {
                setShowResult(false)
                if (wonPrize) setTab('prizes')
              }}
              type="button"
            >
              {wonPrize ? 'Открыть мои призы' : 'Понятно'}
            </button>
          </div>
        </Sheet>
      ) : null}

      {showHistory ? (
        <Sheet onClose={() => setShowHistory(false)}>
          <h2 className="screen__title" style={{ fontSize: 22 }}>
            История моггсов
          </h2>
          {history.length ? (
            <div style={{ maxHeight: '52vh', overflowY: 'auto' }}>
              {history.map((entry) => (
                <div className="row" key={entry.id} style={{ padding: '12px 0' }}>
                  <div className="row__body">
                    <div className="row__name" style={{ fontSize: 14 }}>
                      {entry.reason}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {formatDate(entry.createdAt)}
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: entry.amount > 0 ? 'var(--success)' : 'var(--text-dim)',
                    }}
                  >
                    {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Пока пусто. Посмотри первый урок — начислим моггсы.</p>
          )}
          <button className="btn btn--block" style={{ marginTop: 12 }} onClick={() => setShowHistory(false)} type="button">
            Закрыть
          </button>
        </Sheet>
      ) : null}

      {showInfo ? (
        <Sheet onClose={() => setShowInfo(false)}>
          <h2 className="screen__title" style={{ fontSize: 22 }}>
            Как работают моггсы
          </h2>
          <ul className="muted" style={{ paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Моггсы начисляются, когда урок досмотрен до конца.</li>
            <li>Их можно обменять в магазине клуба или потратить на прокрут колеса.</li>
            <li>Любой приз выдаётся промокодом — он одноразовый.</li>
            <li>
              Промокод действует {config?.promoTtlDays ?? 30}{' '}
              {plural(config?.promoTtlDays ?? 30, 'день', 'дня', 'дней')}: чтобы использовать,
              напиши его менеджеру клуба.
            </li>
          </ul>
          <button className="btn btn--block" onClick={() => setShowInfo(false)} type="button">
            Понятно
          </button>
        </Sheet>
      ) : null}
    </Screen>
  )
}
