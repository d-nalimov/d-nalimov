import { createHttpApi } from './httpApi'
import { mockApi } from './mockApi'
import type { Api } from './types'

const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

/** Без VITE_API_BASE_URL приложение работает на локальном моке — можно щёлкать весь флоу. */
export const api: Api = baseUrl ? createHttpApi(baseUrl) : mockApi

export const isMockMode = !baseUrl

export * from './types'
