import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { formatMoney } from '../lib/format'
import { haptic, openPaymentUrl } from '../telegram/sdk'
import { useAppStore } from '../store/useAppStore'
import { CheckIcon } from './icons'
import { Sheet } from './ui'

const benefits = [
  'Все категории базы материалов',
  'Материалы к каждому уроку в закрытом канале',
  'Кураторы клуба в личке',
  'Моггсы за просмотры и колесо призов',
]

/**
 * Разовая оплата доступа. Клиент только открывает confirmation_url ЮKassa
 * и опрашивает статус — решение о выдаче доступа принимает бэкенд по вебхуку.
 */
export function PaywallSheet({ onClose }: { onClose: () => void }) {
  const config = useAppStore((s) => s.config)
  const refreshUser = useAppStore((s) => s.refreshUser)
  const showToast = useAppStore((s) => s.showToast)
  const [pending, setPending] = useState(false)
  const poll = useRef<number | null>(null)

  useEffect(() => () => {
    if (poll.current) window.clearInterval(poll.current)
  }, [])

  async function pay(close: () => void) {
    if (!config) return
    haptic.press()
    setPending(true)
    try {
      const intent = await api.createPayment()
      openPaymentUrl(intent.confirmationUrl)

      poll.current = window.setInterval(async () => {
        const status = await api.getPaymentStatus(intent.paymentId)
        if (status === 'succeeded') {
          if (poll.current) window.clearInterval(poll.current)
          await refreshUser()
          haptic.success()
          showToast('Доступ открыт. Приятного обучения!')
          setPending(false)
          close()
        }
        if (status === 'canceled') {
          if (poll.current) window.clearInterval(poll.current)
          haptic.error()
          showToast('Оплата отменена')
          setPending(false)
        }
      }, 2000)
    } catch (error) {
      setPending(false)
      haptic.error()
      showToast(error instanceof Error ? error.message : 'Не удалось создать платёж')
    }
  }

  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <>
      <h2 className="screen__title" style={{ fontSize: 26, marginBottom: 10 }}>
        Полный доступ к клубу
      </h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Ежемесячная оплата, и вся база материалов открывается навсегда.
      </p>

      <div className="stack" style={{ margin: '18px 0' }}>
        {benefits.map((item) => (
          <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <CheckIcon size={18} style={{ color: 'var(--accent)', flex: 'none' }} />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <button
        className="btn btn--accent btn--block"
        onClick={() => void pay(close)}
        disabled={pending}
        type="button"
      >
        {pending
          ? 'Ждём подтверждения оплаты...'
          : config
            ? `Оплатить ${formatMoney(config.priceAmount, config.priceCurrency)}`
            : 'Оплатить'}
      </button>
      <button className="btn btn--block" style={{ marginTop: 8 }} onClick={close} type="button">
        Позже
      </button>
      <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginBottom: 0 }}>
        Оплата через ЮKassa. После подтверждения доступ откроется автоматически.
      </p>
        </>
      )}
    </Sheet>
  )
}
