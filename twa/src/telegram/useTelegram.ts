import { useEffect, useRef } from 'react'
import { webApp } from './sdk'

/** Нативная кнопка «Назад» в шапке Telegram. */
export function useBackButton(onBack?: () => void): void {
  const handler = useRef(onBack)
  handler.current = onBack

  useEffect(() => {
    const app = webApp()
    if (!app) return
    if (!handler.current) {
      app.BackButton.hide()
      return
    }
    const cb = () => handler.current?.()
    app.BackButton.onClick(cb)
    app.BackButton.show()
    return () => {
      app.BackButton.offClick(cb)
      app.BackButton.hide()
    }
  }, [Boolean(onBack)])
}

interface MainButtonOptions {
  text: string
  visible?: boolean
  enabled?: boolean
  progress?: boolean
  onClick: () => void
}

/** Нативная главная кнопка Telegram (оплата, прокрут колеса и т.п.). */
export function useMainButton({
  text,
  visible = true,
  enabled = true,
  progress = false,
  onClick,
}: MainButtonOptions): void {
  const handler = useRef(onClick)
  handler.current = onClick

  useEffect(() => {
    const app = webApp()
    if (!app) return
    const cb = () => handler.current()
    app.MainButton.onClick(cb)
    return () => {
      app.MainButton.offClick(cb)
      app.MainButton.hide()
    }
  }, [])

  useEffect(() => {
    const app = webApp()
    if (!app) return
    app.MainButton.setParams({
      text,
      color: '#ffffff',
      text_color: '#000000',
      is_active: enabled,
      is_visible: visible,
    })
    if (progress) app.MainButton.showProgress(true)
    else app.MainButton.hideProgress()
  }, [text, visible, enabled, progress])
}
