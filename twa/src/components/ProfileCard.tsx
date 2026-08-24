import type { User } from '../api/types'
import { formatDate, initials } from '../lib/format'
import { ChevronRight } from './icons'

export function ProfileCard({ user, onClick }: { user: User; onClick?: () => void }) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
  const isMember = user.status === 'member'

  return (
    <button className="profile" onClick={onClick} type="button">
      {user.photoUrl ? (
        <img className="profile__avatar" src={user.photoUrl} alt="" />
      ) : (
        <div className="profile__avatar profile__avatar--fallback">
          {initials(user.firstName, user.lastName)}
        </div>
      )}

      <div className="profile__body">
        <div className="profile__name">{name || 'Участник клуба'}</div>
        <div className="profile__meta">
          <span className={`badge${isMember ? '' : ' badge--muted'}`}>
            {isMember ? 'Участник' : 'Гость'}
          </span>
          <span>
            {isMember
              ? user.accessUntil
                ? `до ${formatDate(user.accessUntil)}`
                : 'доступ навсегда'
              : 'открыт бесплатный блок'}
          </span>
        </div>
      </div>

      <ChevronRight className="chevron" size={20} />
    </button>
  )
}
