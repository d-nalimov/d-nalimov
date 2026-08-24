import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number; filled?: boolean }

function Icon({ size = 22, filled: _filled, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1V9.5" />
  </Icon>
)

export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
    <path d="M16.5 11.2a3 3 0 0 0 0-6" />
    <path d="M18 20c0-2.6-1-4.3-2.6-5.2" />
  </Icon>
)

export const HeartIcon = ({ filled, ...p }: IconProps) => (
  <Icon {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 3C19.5 15.4 12 20 12 20Z" />
  </Icon>
)

export const StarIcon = ({ filled, ...p }: IconProps) => (
  <Icon {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" />
  </Icon>
)

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-3.6-3.6" />
  </Icon>
)

export const ChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 5 7 7-7 7" />
  </Icon>
)

export const ChevronLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="m15 5-7 7 7 7" />
  </Icon>
)

export const LockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </Icon>
)

export const PlayIcon = (p: IconProps) => (
  <Icon {...p} fill="currentColor" stroke="none">
    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
  </Icon>
)

export const PauseIcon = (p: IconProps) => (
  <Icon {...p} fill="currentColor" stroke="none">
    <rect x="7" y="5" width="3.6" height="14" rx="1.2" />
    <rect x="13.4" y="5" width="3.6" height="14" rx="1.2" />
  </Icon>
)

export const Rewind10 = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11 4 6.5 8 11 12" />
    <path d="M6.5 8H13a5.5 5.5 0 1 1 0 11H8" />
  </Icon>
)

export const Forward10 = (p: IconProps) => (
  <Icon {...p}>
    <path d="m13 4 4.5 4L13 12" />
    <path d="M17.5 8H11a5.5 5.5 0 1 0 0 11h5" />
  </Icon>
)

export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v10" />
    <path d="m8 11 4 3.5 4-3.5" />
    <path d="M5 18.5h14" />
  </Icon>
)

export const CopyIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2.4" />
    <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4H6.4A2.4 2.4 0 0 0 4 6.4v6.1A2.5 2.5 0 0 0 6.5 15" />
  </Icon>
)

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Icon>
)

export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5" />
    <path d="M12 7.8h.01" />
  </Icon>
)

export const GiftIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="9" width="17" height="4" rx="1.2" />
    <path d="M5 13v6.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V13" />
    <path d="M12 9v11.5" />
    <path d="M12 9S10.7 4 8.4 4a2.2 2.2 0 0 0 0 5" />
    <path d="M12 9s1.3-5 3.6-5a2.2 2.2 0 0 1 0 5" />
  </Icon>
)

export const TicketIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5V10a2 2 0 0 0 0 4v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 15.5V14a2 2 0 0 0 0-4V8.5Z" />
    <path d="M13.5 7v10" strokeDasharray="2 2.5" />
  </Icon>
)

export const HistoryIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12a8 8 0 1 0 2.5-5.8" />
    <path d="M4 4.5V9h4.5" />
    <path d="M12 8v4.4l3 1.8" />
  </Icon>
)

export const SendIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 4 3.5 10.5l6.2 2.3 2.3 6.2L20 4Z" />
    <path d="m9.7 12.8 4-4" />
  </Icon>
)

export const LibraryIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 4.5h4.2v15H5z" />
    <path d="M10.8 4.5H15v15h-4.2z" />
    <path d="m16.6 5.4 3 .8-3.4 13.1-2.2-.6" />
  </Icon>
)

export const ChatIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 12.4c0 3.6-3.6 6.5-8 6.5a9.6 9.6 0 0 1-2.6-.35L4.5 20l1.2-3.2A6.2 6.2 0 0 1 4 12.4C4 8.8 7.6 6 12 6s8 2.8 8 6.4Z" />
  </Icon>
)
