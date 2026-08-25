import { NavLink } from 'react-router-dom'
import { HeartIcon, HomeIcon, StarIcon, UsersIcon } from './icons'
import { haptic } from '../telegram/sdk'

const tabs = [
  { to: '/', label: 'Главная', Icon: HomeIcon, end: true },
  { to: '/curators', label: 'Кураторы', Icon: UsersIcon, end: false },
  { to: '/favorites', label: 'Избранное', Icon: HeartIcon, end: false },
  { to: '/bonuses', label: 'Мои бонусы', Icon: StarIcon, end: false },
]

export function TabBar() {
  return (
    <nav className="tabbar">
      {tabs.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => haptic.select()}
          className={({ isActive }) => `tabbar__item${isActive ? ' tabbar__item--active' : ''}`}
        >
          {({ isActive }) => (
            <>
              <span className="tabbar__icon">
                <Icon size={27} filled={isActive} />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
