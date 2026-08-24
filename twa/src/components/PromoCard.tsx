import type { Prize } from '../api/types'
import { daysLeft, formatDate, plural } from '../lib/format'
import { copyText, haptic, openTelegram } from '../telegram/sdk'
import { CheckIcon, CopyIcon, SendIcon } from './icons'

export function PromoCard({
  prize,
  managerUsername,
  onCopied,
  onUse,
}: {
  prize: Prize
  managerUsername: string
  onCopied: () => void
  onUse: (prize: Prize) => void
}) {
  const expired = new Date(prize.expiresAt).getTime() < Date.now()
  const used = Boolean(prize.usedAt)
  const left = daysLeft(prize.expiresAt)
  const inactive = used || expired

  async function copy() {
    const ok = await copyText(prize.code)
    if (ok) {
      haptic.success()
      onCopied()
    }
  }

  return (
    <div className="card promo">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <strong>{prize.title}</strong>
        {used ? (
          <span className="badge badge--muted">Использован</span>
        ) : expired ? (
          <span className="badge badge--muted">Истёк</span>
        ) : (
          <span className="badge badge--soft">
            {left} {plural(left, 'день', 'дня', 'дней')}
          </span>
        )}
      </div>

      <div className="promo__code" style={inactive ? { opacity: 0.5 } : undefined}>
        <span>{prize.code}</span>
        <button className="icon-btn" onClick={copy} aria-label="Скопировать промокод" type="button">
          <CopyIcon size={18} />
        </button>
      </div>

      <div className="promo__meta">
        <span>
          {prize.source === 'wheel' ? 'Выигрыш на колесе' : 'Покупка за моггсы'} ·{' '}
          {used ? `отмечен ${formatDate(prize.usedAt as string)}` : `действует до ${formatDate(prize.expiresAt)}`}
        </span>
      </div>

      {!inactive ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn--accent"
            style={{ flex: 1 }}
            onClick={() => {
              haptic.press()
              openTelegram(`https://t.me/${managerUsername}?text=${encodeURIComponent(`Промокод ${prize.code}`)}`)
            }}
            type="button"
          >
            <SendIcon size={18} />
            Менеджеру
          </button>
          <button className="btn btn--ghost" onClick={() => onUse(prize)} type="button">
            <CheckIcon size={18} />
            Использован
          </button>
        </div>
      ) : null}
    </div>
  )
}
