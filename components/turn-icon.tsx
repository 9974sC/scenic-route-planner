import {
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  MapPin,
  MoveUpLeft,
  MoveUpRight,
  RotateCw,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function iconForTurnSign(sign: number): LucideIcon {
  switch (sign) {
    case -98:
    case -8:
    case 8:
      return RotateCw
    case -7:
    case -3:
    case -2:
      return CornerUpLeft
    case -1:
      return MoveUpLeft
    case 0:
      return ArrowUp
    case 1:
    case 7:
      return MoveUpRight
    case 2:
    case 3:
      return CornerUpRight
    case 6:
    case -6:
      return RotateCw
    case 4:
    case 5:
      return MapPin
    default:
      return ArrowUp
  }
}

type TurnIconProps = {
  sign: number
  className?: string
  size?: number
}

export function TurnIcon({ sign, className, size = 16 }: TurnIconProps) {
  const Icon = iconForTurnSign(sign)
  return (
    <Icon
      className={cn('shrink-0', className)}
      size={size}
      strokeWidth={2.25}
      aria-hidden
    />
  )
}
