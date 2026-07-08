import { avatarUrlForUser } from '@/lib/profile'
import { cn } from '@/lib/utils'

type Props = {
  userId: string
  username: string
  colorHex: string
  hasAvatar: boolean
  avatarVersion: number
  className?: string
}

export function LeaderboardUserAvatar({
  userId,
  username,
  colorHex,
  hasAvatar,
  avatarVersion,
  className,
}: Props) {
  const avatarSrc = hasAvatar
    ? `${avatarUrlForUser(userId)}?v=${avatarVersion}`
    : null

  if (avatarSrc) {
    return (
      <img
        src={avatarSrc}
        alt=""
        className={cn(
          'size-9 shrink-0 rounded-full object-cover ring-1 ring-foreground/15',
          className,
        )}
      />
    )
  }

  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ring-1 ring-foreground/15',
        className,
      )}
      style={{ backgroundColor: colorHex }}
      aria-hidden
    >
      {username.slice(0, 2).toUpperCase()}
    </span>
  )
}
