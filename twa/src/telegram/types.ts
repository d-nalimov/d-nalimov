export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
  is_premium?: boolean
}

export interface HapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
  notificationOccurred(type: 'error' | 'success' | 'warning'): void
  selectionChanged(): void
}

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: { user?: TelegramUser; start_param?: string }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  isExpanded: boolean
  viewportStableHeight: number
  HapticFeedback?: HapticFeedback
  BackButton: {
    isVisible: boolean
    show(): void
    hide(): void
    onClick(cb: () => void): void
    offClick(cb: () => void): void
  }
  MainButton: {
    text: string
    isVisible: boolean
    setText(text: string): void
    show(): void
    hide(): void
    enable(): void
    disable(): void
    showProgress(leaveActive?: boolean): void
    hideProgress(): void
    setParams(params: {
      text?: string
      color?: string
      text_color?: string
      is_active?: boolean
      is_visible?: boolean
    }): void
    onClick(cb: () => void): void
    offClick(cb: () => void): void
  }
  CloudStorage?: {
    setItem(key: string, value: string, cb?: (err: Error | null, ok?: boolean) => void): void
    getItem(key: string, cb: (err: Error | null, value?: string) => void): void
    removeItem(key: string, cb?: (err: Error | null, ok?: boolean) => void): void
  }
  ready(): void
  expand(): void
  close(): void
  openLink(url: string, options?: { try_instant_view?: boolean }): void
  openTelegramLink(url: string): void
  openInvoice?(url: string, cb?: (status: string) => void): void
  showPopup?(
    params: { title?: string; message: string; buttons?: { id?: string; type?: string; text?: string }[] },
    cb?: (id: string) => void,
  ): void
  showAlert?(message: string, cb?: () => void): void
  setHeaderColor?(color: string): void
  setBackgroundColor?(color: string): void
  enableClosingConfirmation?(): void
  disableVerticalSwipes?(): void
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}
