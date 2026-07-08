'use client'

import { useMemo } from 'react'
import { Polyline } from 'react-leaflet'
import type { PastPath } from '@/lib/past-paths'
import { opacityForPastPath } from '@/lib/past-paths'

const PAST_PATH_COLOR = {
  light: '#64748b',
  dark: '#c4d4cc',
} as const

type Props = {
  paths: PastPath[]
  theme: 'light' | 'dark'
}

export function PastPathsLayer({ paths, theme }: Props) {
  const color = PAST_PATH_COLOR[theme]

  const withOpacity = useMemo(
    () =>
      paths.map((path) => ({
        path,
        opacity: opacityForPastPath(path.drivenAt, paths),
      })),
    [paths],
  )

  if (!withOpacity.length) return null

  return (
    <>
      {withOpacity.map(({ path, opacity }) => (
        <Polyline
          key={path.id}
          positions={path.coords}
          pathOptions={{
            color,
            weight: 3,
            opacity,
            lineJoin: 'round',
            lineCap: 'round',
          }}
          interactive={false}
        />
      ))}
    </>
  )
}
