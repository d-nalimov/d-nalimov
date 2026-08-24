/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_MANAGER_USERNAME?: string
  readonly VITE_SUPPORT_USERNAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
