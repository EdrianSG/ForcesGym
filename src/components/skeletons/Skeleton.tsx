import type { ReactNode } from 'react'

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`h-4 rounded-md bg-line motion-safe:animate-pulse ${className}`}
    />
  )
}

export function SkeletonRegion({
  children,
  label,
  className,
}: {
  children: ReactNode
  label: string
  className?: string
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  )
}
