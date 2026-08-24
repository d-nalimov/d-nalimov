import type { ReactNode } from 'react'
import { SearchIcon } from './icons'

export function Screen({
  title,
  action,
  children,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <main className="screen">
      {title ? (
        <div className="screen__head">
          <h1 className="screen__title">{title}</h1>
          {action}
        </div>
      ) : null}
      {children}
    </main>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Поиск...',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="search">
      <SearchIcon size={20} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="search"
        enterKeyHint="search"
      />
    </label>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={option.value === value}
          className={`segmented__item${option.value === value ? ' segmented__item--active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <div>
        <div style={{ color: 'var(--text)', fontWeight: 700 }}>{title}</div>
        {hint ? <div style={{ marginTop: 6, fontSize: 13 }}>{hint}</div> : null}
      </div>
      {action}
    </div>
  )
}

export function Skeleton({ height = 96, radius }: { height?: number; radius?: number }) {
  return (
    <div
      className="skeleton"
      style={{ height, borderRadius: radius ?? 'var(--radius)' }}
      aria-hidden="true"
    />
  )
}

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="sheet"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sheet__body">{children}</div>
    </div>
  )
}
