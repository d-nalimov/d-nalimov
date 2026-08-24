import { useEffect, useRef, useState } from 'react'
import type { WheelSector } from '../api/types'

interface Props {
  sectors: WheelSector[]
  /** ID выпавшего сектора приходит с сервера — колесо только доигрывает анимацию. */
  resultSectorId: string | null
  spinning: boolean
  onSpinEnd: () => void
}

const FULL_TURNS = 5

export function PrizeWheel({ sectors, resultSectorId, spinning, onSpinEnd }: Props) {
  const [angle, setAngle] = useState(0)
  const turns = useRef(0)

  useEffect(() => {
    if (!resultSectorId || !sectors.length) return
    const index = sectors.findIndex((s) => s.id === resultSectorId)
    if (index < 0) return

    const sectorSize = 360 / sectors.length
    turns.current += FULL_TURNS
    // Указатель сверху: доворачиваем так, чтобы центр нужного сектора встал под него.
    const target = turns.current * 360 - (index * sectorSize + sectorSize / 2)
    setAngle(target)

    const timer = window.setTimeout(onSpinEnd, 4700)
    return () => window.clearTimeout(timer)
  }, [resultSectorId, sectors, onSpinEnd])

  if (!sectors.length) return null

  const sectorSize = 360 / sectors.length
  const gradient = sectors
    .map((s, i) => `${s.color} ${i * sectorSize}deg ${(i + 1) * sectorSize}deg`)
    .join(', ')

  return (
    <div className="wheel-wrap">
      <div className="wheel__pin" />
      <div
        className="wheel"
        style={{
          background: `conic-gradient(${gradient})`,
          transform: `rotate(${angle}deg)`,
        }}
        aria-hidden={spinning}
      >
        {sectors.map((sector, i) => {
          const mid = i * sectorSize + sectorSize / 2
          // conic-gradient отсчитывает угол от 12 часов, CSS-поворот — от 3 часов.
          const flipped = mid > 180
          return (
            <span
              key={sector.id}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: '44%',
                height: 30,
                marginTop: -15,
                transformOrigin: '0 50%',
                transform: `rotate(${mid - 90}deg)`,
                display: 'flex',
                alignItems: 'center',
                // Дальний край блока всегда у обода — там и держим текст.
                justifyContent: 'flex-end',
                padding: '0 10px 0 0',
                pointerEvents: 'none',
              }}
            >
              <span
                style={{
                  // Держим подпись у обода: длинная переносится в две строки, а не уезжает под ступицу.
                  maxWidth: '62%',
                  transform: flipped ? 'rotate(180deg)' : 'none',
                  fontSize: 9,
                  lineHeight: 1.15,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  color: labelColor(sector.color, sector.blank),
                }}
              >
                {sector.label}
              </span>
            </span>
          )
        })}
      </div>
      <div className="wheel__hub">{spinning ? '...' : 'Крутить'}</div>
    </div>
  )
}

/** Тёмная подпись на светлом секторе и наоборот — в монохроме читаемость решает всё. */
function labelColor(hex: string, blank?: boolean): string {
  const value = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(value.slice(i, i + 2), 16) / 255)
  const light = 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55
  if (blank) return light ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.45)'
  return light ? '#111111' : '#ffffff'
}

export function WheelLegend({ sectors }: { sectors: WheelSector[] }) {
  return (
    <div className="wheel-legend">
      {sectors
        .filter((s) => !s.blank)
        .map((sector) => (
          <span className="wheel-legend__item" key={sector.id}>
            <span className="wheel-legend__dot" style={{ background: sector.color }} />
            {sector.label}
          </span>
        ))}
    </div>
  )
}
