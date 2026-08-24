import type { TelegramUser, TelegramWebApp } from './types'

export function webApp(): TelegramWebApp | undefined {
  return typeof window === 'undefined' ? undefined : window.Telegram?.WebApp
}

/** Приложение реально открыто внутри Telegram (а не в обычном браузере). */
export function isInsideTelegram(): boolean {
  const app = webApp()
  return Boolean(app && app.initData !== undefined && app.platform !== 'unknown')
}

/** Сырая initData — её и проверяет бэкенд по HMAC с токеном бота. */
export function initData(): string {
  return webApp()?.initData ?? ''
}

/** Пользователь из initDataUnsafe. Для UI годится, для доверия — нет: сервер разбирает initData сам. */
export function telegramUser(): TelegramUser | undefined {
  return webApp()?.initDataUnsafe?.user
}

/** start_param из ссылки t.me/bot/app?startapp=... — используем для deeplink на урок. */
export function startParam(): string | undefined {
  return webApp()?.initDataUnsafe?.start_param
}

export function initTelegram(): void {
  const app = webApp()
  if (!app) return
  app.ready()
  app.expand()
  app.setHeaderColor?.('#000000')
  app.setBackgroundColor?.('#000000')
  app.disableVerticalSwipes?.()
}

export const haptic = {
  tap(): void {
    webApp()?.HapticFeedback?.impactOccurred('light')
  },
  press(): void {
    webApp()?.HapticFeedback?.impactOccurred('medium')
  },
  success(): void {
    webApp()?.HapticFeedback?.notificationOccurred('success')
  },
  warning(): void {
    webApp()?.HapticFeedback?.notificationOccurred('warning')
  },
  error(): void {
    webApp()?.HapticFeedback?.notificationOccurred('error')
  },
  select(): void {
    webApp()?.HapticFeedback?.selectionChanged()
  },
}

export function openTelegram(url: string): void {
  const app = webApp()
  if (app) app.openTelegramLink(url)
  else window.open(url, '_blank', 'noopener')
}

export function openExternal(url: string): void {
  const app = webApp()
  if (app) app.openLink(url)
  else window.open(url, '_blank', 'noopener')
}

/** Диалог оплаты ЮKassa: внутри Telegram — внешняя ссылка на confirmation_url. */
export function openPaymentUrl(url: string): void {
  openExternal(url)
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  }
}
