'use client'

import { useAuth } from '@/components/auth-provider'
import { avatarUrlForUser } from '@/lib/profile'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function UserBadge() {
  const { user, logout } = useAuth()
  if (!user) return null

  const avatarSrc = user.hasAvatar
    ? `${avatarUrlForUser(user.id)}?v=${user.avatarVersion}`
    : null

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt=""
          className="size-7 shrink-0 rounded-full object-cover ring-1 ring-foreground/15"
        />
      ) : (
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-1 ring-foreground/15"
          style={{ backgroundColor: user.colorHex }}
          aria-hidden
        >
          {user.username.slice(0, 2).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">
          {user.displayName || user.username}
        </p>
        <p className="truncate font-mono text-[10px] text-muted-foreground">
          {user.displayId}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="size-7 shrink-0 p-0"
        aria-label="Sign out"
        onClick={() => logout()}
      >
        <LogOut className="size-3.5" />
      </Button>
    </div>
  )
}
