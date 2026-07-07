'use client'

import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function UserBadge() {
  const { user, logout } = useAuth()
  if (!user) return null

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
      <span
        className="size-3 shrink-0 rounded-full ring-1 ring-foreground/15"
        style={{ backgroundColor: user.colorHex }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs font-semibold text-foreground">
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
