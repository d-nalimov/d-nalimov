import { telegramUser } from '../telegram/sdk'
import { categories, curators, lessons, shopItems, wheelSectors } from './seed'
import type {
  Api,
  AppConfig,
  Category,
  Curator,
  Lesson,
  LessonProgress,
  MoggsEntry,
  PaymentIntent,
  PaymentStatus,
  Prize,
  Session,
  ShopItem,
  SpinResult,
  User,
  WatchResult,
  WheelSector,
} from './types'
import { ApiError } from './types'

const STORAGE_KEY = 'cashyou.mock.v1'

/** Доля просмотра, после которой урок считается пройденным и начисляются моггсы. */
const COMPLETE_RATIO = 0.9

/** Во сколько раз быстрее реального времени разрешено засчитывать просмотр. */
const MAX_PLAYBACK_SPEED = 2.5

/**
 * Стартовый баланс в демо-режиме — чтобы колесо и магазин можно было щёлкать
 * сразу, не досматривая уроки. На бэкенде такого начисления нет: там баланс
 * растёт только за просмотр.
 */
const DEMO_MOGGS = 9999

interface MockProgress extends LessonProgress {
  /** Служебные поля мока: столько просмотрено и когда последний раз сохраняли. */
  watchedSec: number
  lastSeenAt: number
}

interface MockState {
  user: User
  progress: Record<string, MockProgress>
  favorites: string[]
  prizes: Prize[]
  history: MoggsEntry[]
  payments: Record<string, { status: PaymentStatus; createdAt: number }>
}

const config: AppConfig = {
  priceAmount: 299000,
  priceCurrency: 'RUB',
  spinCost: 100,
  promoTtlDays: 30,
  managerUsername: import.meta.env.VITE_MANAGER_USERNAME || 'ceo_trauma',
  communityUrl: 'https://t.me/cashyou_club',
}

function defaultUser(): User {
  const tg = telegramUser()
  return {
    id: tg ? String(tg.id) : 'demo',
    telegramId: tg?.id ?? 0,
    firstName: tg?.first_name ?? 'Гость',
    lastName: tg?.last_name,
    username: tg?.username,
    photoUrl: tg?.photo_url,
    status: 'free',
    accessUntil: null,
    moggs: DEMO_MOGGS,
  }
}

function emptyState(): MockState {
  return {
    user: defaultUser(),
    progress: {},
    favorites: [],
    prizes: [],
    history: [],
    payments: {},
  }
}

function load(): MockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as MockState
    const restored = { ...emptyState(), ...parsed, user: { ...defaultUser(), ...parsed.user } }

    // Демо, открытое до появления стартового баланса, доначисляем один раз:
    // ничего не заработано и не потрачено — значит, это чистое состояние.
    if (restored.user.moggs === 0 && restored.history.length === 0) {
      restored.user.moggs = DEMO_MOGGS
    }
    return restored
  } catch {
    return emptyState()
  }
}

let state: MockState = typeof localStorage === 'undefined' ? emptyState() : load()

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* приватный режим — работаем в памяти */
  }
}

function delay<T>(value: T, ms = 140): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function promoCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 8; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `CY-${out.slice(0, 4)}-${out.slice(4)}`
}

function addMoggs(amount: number, reason: string): void {
  state.user.moggs += amount
  state.history.unshift({
    id: uid('m'),
    amount,
    reason,
    createdAt: new Date().toISOString(),
  })
  state.history = state.history.slice(0, 100)
}

function createPrize(title: string, source: Prize['source'], contactUrl?: string): Prize {
  const now = new Date()
  const expires = new Date(now.getTime() + config.promoTtlDays * 24 * 60 * 60 * 1000)
  const prize: Prize = {
    id: uid('p'),
    title,
    code: promoCode(),
    source,
    // Копия на момент выдачи: приз останется рабочим, даже если каталог поменяют.
    contactUrl: contactUrl ?? null,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    usedAt: null,
  }
  state.prizes.unshift(prize)
  return prize
}

function hasAccess(): boolean {
  if (state.user.status !== 'member') return false
  if (!state.user.accessUntil) return true
  return new Date(state.user.accessUntil).getTime() > Date.now()
}

function assertLessonAccess(lesson: Lesson): void {
  if (lesson.free || hasAccess()) return
  throw new ApiError('Урок доступен после оплаты доступа', 403, 'payment_required')
}

/** Оплата в моке «подтверждается» сама через несколько секунд — как вебхук ЮKassa. */
function resolvePayments(): void {
  const now = Date.now()
  for (const [id, payment] of Object.entries(state.payments)) {
    if (payment.status === 'pending' && now - payment.createdAt > 4000) {
      state.payments[id] = { ...payment, status: 'succeeded' }
      state.user.status = 'member'
      state.user.accessUntil = null
      addMoggs(100, 'Бонус за покупку доступа')
      save()
    }
  }
}

export const mockApi: Api = {
  async auth(): Promise<Session> {
    state.user = { ...defaultUser(), ...state.user, ...pickTelegramFields() }
    save()
    return delay({ user: { ...state.user }, config })
  },

  async getCategories(): Promise<Category[]> {
    const counts = new Map<string, number>()
    for (const item of lessons) counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1)
    return delay(categories.map((c) => ({ ...c, lessonsCount: counts.get(c.id) ?? c.lessonsCount })))
  },

  async getLessons(categoryId: string): Promise<Lesson[]> {
    return delay(lessons.filter((l) => l.categoryId === categoryId).sort((a, b) => a.order - b.order))
  },

  async getLesson(lessonId: string): Promise<Lesson> {
    const found = lessons.find((l) => l.id === lessonId)
    if (!found) throw new ApiError('Урок не найден', 404, 'not_found')
    assertLessonAccess(found)
    return delay({ ...found })
  },

  async getProgress(): Promise<Record<string, LessonProgress>> {
    return delay({ ...state.progress })
  },

  async saveProgress(lessonId: string, positionSec: number, durationSec: number): Promise<WatchResult> {
    const lesson = lessons.find((l) => l.id === lessonId)
    if (!lesson) throw new ApiError('Урок не найден', 404, 'not_found')

    const prev = state.progress[lessonId]
    // Длительность берём из каталога, а просмотренное копим сами и не быстрее
    // реального времени — те же правила, что и на сервере.
    const duration = lesson.durationSec || durationSec
    const position = Math.max(0, Math.min(Math.round(positionSec), duration || positionSec))

    const now = Date.now()
    const elapsed = prev?.lastSeenAt ? (now - prev.lastSeenAt) / 1000 : 0
    const advanced = Math.max(0, position - (prev?.positionSec ?? 0))
    const credited = Math.min(advanced, elapsed * MAX_PLAYBACK_SPEED)
    const watched = Math.min(duration || position, (prev?.watchedSec ?? 0) + Math.round(credited))

    const rewarded = prev?.rewarded ?? false
    const completed = duration > 0 && watched / duration >= COMPLETE_RATIO
    let awarded = 0

    if (completed && !rewarded) {
      awarded = lesson.moggsReward
      addMoggs(awarded, `Просмотр: ${lesson.title}`)
    }

    state.progress[lessonId] = {
      lessonId,
      positionSec: position,
      durationSec: duration,
      watchedSec: watched,
      lastSeenAt: now,
      completed: completed || Boolean(prev?.completed),
      rewarded: rewarded || awarded > 0,
      updatedAt: new Date().toISOString(),
    }
    save()
    return { moggs: state.user.moggs, awarded }
  },

  async getFavoriteIds(): Promise<string[]> {
    return delay([...state.favorites])
  },

  async toggleFavorite(lessonId: string): Promise<boolean> {
    const index = state.favorites.indexOf(lessonId)
    if (index >= 0) state.favorites.splice(index, 1)
    else state.favorites.unshift(lessonId)
    save()
    return index < 0
  },

  async getFavorites(): Promise<Lesson[]> {
    const list = state.favorites
      .map((id) => lessons.find((l) => l.id === id))
      .filter((l): l is Lesson => Boolean(l))
    return delay(list)
  },

  async getCurators(): Promise<Curator[]> {
    return delay(curators)
  },

  async getWheel(): Promise<WheelSector[]> {
    return delay(wheelSectors)
  },

  async spin(): Promise<SpinResult> {
    if (state.user.moggs < config.spinCost) {
      throw new ApiError('Не хватает моггсов на прокрут', 400, 'insufficient_funds')
    }
    addMoggs(-config.spinCost, 'Прокрут колеса')

    const sector = wheelSectors[Math.floor(Math.random() * wheelSectors.length)]
    let prize: Prize | null = null

    if (sector.blank) {
      // пусто
    } else if (sector.label.includes('моггс')) {
      const amount = Number.parseInt(sector.label, 10) || 100
      addMoggs(amount, 'Выигрыш на колесе')
    } else {
      prize = createPrize(sector.label, 'wheel', sector.contactUrl)
    }

    save()
    return { sectorId: sector.id, prize, moggs: state.user.moggs }
  },

  async getShop(): Promise<ShopItem[]> {
    return delay(shopItems)
  },

  async buy(itemId: string): Promise<{ prize: Prize; moggs: number }> {
    const item = shopItems.find((s) => s.id === itemId)
    if (!item) throw new ApiError('Товар не найден', 404, 'not_found')
    if (state.user.moggs < item.price) {
      throw new ApiError('Недостаточно моггсов', 400, 'insufficient_funds')
    }
    addMoggs(-item.price, `Покупка: ${item.title}`)
    const prize = createPrize(item.title, 'shop')
    save()
    return { prize, moggs: state.user.moggs }
  },

  async getPrizes(): Promise<Prize[]> {
    return delay([...state.prizes])
  },


  async getMoggsHistory(): Promise<MoggsEntry[]> {
    return delay([...state.history])
  },

  async createPayment(): Promise<PaymentIntent> {
    const paymentId = uid('pay')
    state.payments[paymentId] = { status: 'pending', createdAt: Date.now() }
    save()
    // В моке подтверждение имитируется: реальный ЮKassa вернёт confirmation_url.
    return delay({ paymentId, confirmationUrl: `https://yookassa.ru/checkout/demo/${paymentId}` })
  },

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    resolvePayments()
    return delay(state.payments[paymentId]?.status ?? 'pending', 60)
  },
}

/** Данные из Telegram имеют приоритет над сохранёнными в моке. */
function pickTelegramFields(): Partial<User> {
  const tg = telegramUser()
  if (!tg) return {}
  return {
    id: String(tg.id),
    telegramId: tg.id,
    firstName: tg.first_name,
    lastName: tg.last_name,
    username: tg.username,
    photoUrl: tg.photo_url,
  }
}

/** Отладочная утилита: сбросить локальное состояние демо. */
export function resetMockState(): void {
  state = emptyState()
  save()
}
