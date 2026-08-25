import { initData } from '../telegram/sdk'
import type {
  Api,
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
  WatchResult,
  WheelSector,
} from './types'
import { ApiError } from './types'

/**
 * Реальный клиент. Аутентификация — по схеме Telegram Mini Apps:
 * заголовок `Authorization: tma <initData>`, подпись проверяет бэкенд
 * (HMAC-SHA256 по токену бота). Никаких user_id из клиента серверу не доверяем.
 */
export function createHttpApi(baseUrl: string): Api {
  const base = baseUrl.replace(/\/$/, '')

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${base}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${initData()}`,
          ...(init?.headers ?? {}),
        },
      })
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : 'Нет связи с сервером',
        0,
        'network_error',
      )
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; code?: string }
        | null
      throw new ApiError(
        payload?.message ?? `Ошибка запроса (${response.status})`,
        response.status,
        payload?.code,
      )
    }

    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }

  function post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
  }

  return {
    auth: () => post<Session>('/auth'),
    getCategories: () => request<Category[]>('/categories'),
    getLessons: (categoryId) =>
      request<Lesson[]>(`/categories/${encodeURIComponent(categoryId)}/lessons`),
    getLesson: (lessonId) => request<Lesson>(`/lessons/${encodeURIComponent(lessonId)}`),
    getProgress: () => request<Record<string, LessonProgress>>('/progress'),
    saveProgress: (lessonId, positionSec, durationSec) =>
      post<WatchResult>(`/lessons/${encodeURIComponent(lessonId)}/progress`, {
        positionSec: Math.round(positionSec),
        durationSec: Math.round(durationSec),
      }),
    getFavoriteIds: () => request<string[]>('/favorites/ids'),
    toggleFavorite: (lessonId) =>
      post<{ favorite: boolean }>(`/favorites/${encodeURIComponent(lessonId)}/toggle`).then(
        (r) => r.favorite,
      ),
    getFavorites: () => request<Lesson[]>('/favorites'),
    getCurators: () => request<Curator[]>('/curators'),
    getWheel: () => request<WheelSector[]>('/wheel'),
    spin: () => post<SpinResult>('/wheel/spin'),
    getShop: () => request<ShopItem[]>('/shop'),
    buy: (itemId) => post<{ prize: Prize; moggs: number }>(`/shop/${encodeURIComponent(itemId)}/buy`),
    getPrizes: () => request<Prize[]>('/prizes'),
    getMoggsHistory: () => request<MoggsEntry[]>('/moggs/history'),
    createPayment: () => post<PaymentIntent>('/payments'),
    getPaymentStatus: (paymentId) =>
      request<{ status: PaymentStatus }>(`/payments/${encodeURIComponent(paymentId)}`).then(
        (r) => r.status,
      ),
  }
}
