export type AccessStatus = 'free' | 'member'

export interface User {
  id: string
  telegramId: number
  firstName: string
  lastName?: string
  username?: string
  photoUrl?: string
  /** free — доступны только бесплатные уроки (прогрев), member — куплен доступ. */
  status: AccessStatus
  /** null = бессрочный доступ (оплата разовая). */
  accessUntil: string | null
  moggs: number
}

export interface AppConfig {
  /** Разовая оплата доступа, в минорных единицах (копейках). */
  priceAmount: number
  priceCurrency: string
  /** Сколько моггсов стоит один прокрут колеса. */
  spinCost: number
  /** Сколько дней действует промокод. */
  promoTtlDays: number
  managerUsername: string
  communityUrl: string
}

export interface Session {
  user: User
  config: AppConfig
}

export interface Category {
  id: string
  title: string
  subtitle: string
  /** Оттенок подложки, пока не проставлена обложка. */
  tint: string
  /** URL обложки категории. */
  cover?: string
  lessonsCount: number
  /** Категория целиком открыта без оплаты. */
  free: boolean
}

export interface Lesson {
  id: string
  categoryId: string
  title: string
  description: string
  /** ID видео в Kinescope. Пустая строка -> демо-плеер. */
  kinescopeId: string
  poster?: string
  durationSec: number
  free: boolean
  /** Сколько моггсов начисляется за досмотр. */
  moggsReward: number
  /** Материалы к уроку: пост/канал в Telegram. */
  materialsUrl?: string
  order: number
}

export interface LessonProgress {
  lessonId: string
  /** Кэш таймкода: с этой секунды продолжаем просмотр. */
  positionSec: number
  durationSec: number
  completed: boolean
  /** Моггсы за этот урок уже начислены. */
  rewarded: boolean
  updatedAt: string
}

export interface Curator {
  id: string
  name: string
  username: string
  role: string
  photoUrl?: string
  /** Поля ниже сервер ещё отдаёт, но список их не показывает. */
  about?: string
  tag?: string
}

export type PrizeSource = 'wheel' | 'shop'

export interface Prize {
  id: string
  title: string
  code: string
  source: PrizeSource
  createdAt: string
  expiresAt: string
  usedAt: string | null
}

export interface WheelSector {
  id: string
  label: string
  color: string
  /** Пустой сектор — «в другой раз». */
  blank?: boolean
}

export interface MoggsEntry {
  id: string
  amount: number
  reason: string
  createdAt: string
}

export interface ShopItem {
  id: string
  title: string
  description: string
  price: number
  /** URL картинки товара. */
  image?: string
}

export interface SpinResult {
  sectorId: string
  prize: Prize | null
  moggs: number
}

export interface WatchResult {
  moggs: number
  /** Сколько моггсов начислено этим вызовом (0 — уже начисляли). */
  awarded: number
}

export interface PaymentIntent {
  paymentId: string
  confirmationUrl: string
}

export type PaymentStatus = 'pending' | 'succeeded' | 'canceled'

export interface Api {
  auth(): Promise<Session>
  getCategories(): Promise<Category[]>
  getLessons(categoryId: string): Promise<Lesson[]>
  getLesson(lessonId: string): Promise<Lesson>
  getProgress(): Promise<Record<string, LessonProgress>>
  saveProgress(lessonId: string, positionSec: number, durationSec: number): Promise<WatchResult>
  getFavoriteIds(): Promise<string[]>
  toggleFavorite(lessonId: string): Promise<boolean>
  getFavorites(): Promise<Lesson[]>
  getCurators(): Promise<Curator[]>
  getWheel(): Promise<WheelSector[]>
  spin(): Promise<SpinResult>
  getShop(): Promise<ShopItem[]>
  buy(itemId: string): Promise<{ prize: Prize; moggs: number }>
  getPrizes(): Promise<Prize[]>
  getMoggsHistory(): Promise<MoggsEntry[]>
  createPayment(): Promise<PaymentIntent>
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 0,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
