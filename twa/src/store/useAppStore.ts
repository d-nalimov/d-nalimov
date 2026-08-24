import { create } from 'zustand'
import { api } from '../api'
import type {
  AppConfig,
  Category,
  Curator,
  Lesson,
  LessonProgress,
  MoggsEntry,
  Prize,
  ShopItem,
  User,
  WheelSector,
} from '../api/types'
import { ApiError } from '../api/types'
import { haptic } from '../telegram/sdk'

interface AppState {
  ready: boolean
  bootError: string | null

  user: User | null
  config: AppConfig | null

  categories: Category[]
  lessonsByCategory: Record<string, Lesson[]>
  progress: Record<string, LessonProgress>
  favorites: string[]
  curators: Curator[]
  wheel: WheelSector[]
  shop: ShopItem[]
  prizes: Prize[]
  moggsHistory: MoggsEntry[]

  toast: string | null

  boot(): Promise<void>
  refreshUser(): Promise<void>
  loadCategories(): Promise<void>
  loadLessons(categoryId: string): Promise<Lesson[]>
  loadCurators(): Promise<void>
  loadBonuses(): Promise<void>
  loadPrizes(): Promise<void>
  toggleFavorite(lessonId: string): Promise<void>
  saveProgress(lessonId: string, positionSec: number, durationSec: number): Promise<void>
  showToast(message: string): void
  hideToast(): void
  hasAccess(): boolean
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  bootError: null,

  user: null,
  config: null,

  categories: [],
  lessonsByCategory: {},
  progress: {},
  favorites: [],
  curators: [],
  wheel: [],
  shop: [],
  prizes: [],
  moggsHistory: [],

  toast: null,

  async boot() {
    try {
      const [session, categories, progress, favorites] = await Promise.all([
        api.auth(),
        api.getCategories(),
        api.getProgress(),
        api.getFavoriteIds(),
      ])
      set({
        user: session.user,
        config: session.config,
        categories,
        progress,
        favorites,
        ready: true,
        bootError: null,
      })
    } catch (error) {
      set({
        ready: true,
        bootError:
          error instanceof ApiError ? error.message : 'Не удалось загрузить данные приложения',
      })
    }
  },

  async refreshUser() {
    const session = await api.auth()
    set({ user: session.user, config: session.config })
  },

  async loadCategories() {
    set({ categories: await api.getCategories() })
  },

  async loadLessons(categoryId) {
    const cached = get().lessonsByCategory[categoryId]
    if (cached) return cached
    const list = await api.getLessons(categoryId)
    set((s) => ({ lessonsByCategory: { ...s.lessonsByCategory, [categoryId]: list } }))
    return list
  },

  async loadCurators() {
    if (get().curators.length) return
    set({ curators: await api.getCurators() })
  },

  async loadBonuses() {
    const [wheel, shop, history] = await Promise.all([
      api.getWheel(),
      api.getShop(),
      api.getMoggsHistory(),
    ])
    set({ wheel, shop, moggsHistory: history })
  },

  async loadPrizes() {
    set({ prizes: await api.getPrizes() })
  },

  async toggleFavorite(lessonId) {
    const before = get().favorites
    const optimistic = before.includes(lessonId)
      ? before.filter((id) => id !== lessonId)
      : [lessonId, ...before]
    set({ favorites: optimistic })
    haptic.tap()
    try {
      await api.toggleFavorite(lessonId)
    } catch {
      set({ favorites: before })
      get().showToast('Не удалось обновить избранное')
    }
  },

  async saveProgress(lessonId, positionSec, durationSec) {
    const prev = get().progress[lessonId]
    // Локально обновляем сразу: таймкод нужен мгновенно, даже если сеть отвалилась.
    set((s) => ({
      progress: {
        ...s.progress,
        [lessonId]: {
          lessonId,
          positionSec,
          durationSec,
          completed: prev?.completed ?? false,
          rewarded: prev?.rewarded ?? false,
          updatedAt: new Date().toISOString(),
        },
      },
    }))

    try {
      const result = await api.saveProgress(lessonId, positionSec, durationSec)
      set((s) => ({
        user: s.user ? { ...s.user, moggs: result.moggs } : s.user,
        progress: {
          ...s.progress,
          [lessonId]: {
            ...s.progress[lessonId],
            completed: result.awarded > 0 ? true : (s.progress[lessonId]?.completed ?? false),
            rewarded: result.awarded > 0 ? true : (s.progress[lessonId]?.rewarded ?? false),
          },
        },
      }))
      if (result.awarded > 0) {
        haptic.success()
        get().showToast(`+${result.awarded} моггсов за урок`)
      }
    } catch {
      /* прогресс досохранится при следующем тике */
    }
  },

  showToast(message) {
    set({ toast: message })
    window.setTimeout(() => {
      if (get().toast === message) set({ toast: null })
    }, 2600)
  },

  hideToast() {
    set({ toast: null })
  },

  hasAccess() {
    const user = get().user
    if (!user || user.status !== 'member') return false
    if (!user.accessUntil) return true
    return new Date(user.accessUntil).getTime() > Date.now()
  },
}))
