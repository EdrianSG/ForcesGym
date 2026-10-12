import { Card } from '@/components/ui/Card'
import { CardSkeleton } from './CardSkeleton'
import { Skeleton, SkeletonRegion } from './Skeleton'
import { TableSkeleton } from './TableSkeleton'

export function DashboardSkeleton() {
  return (
    <SkeletonRegion label="Cargando datos del dashboard…">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <Skeleton className="w-36" />
              <Skeleton className="size-4 shrink-0" />
            </div>
            <Skeleton className="mt-3 h-9 w-16" />
          </Card>
        ))}
      </section>
      <section className="mt-6 grid gap-4 lg:grid-cols-5">
        <CardSkeleton className="lg:col-span-3" />
        <CardSkeleton className="lg:col-span-2" />
      </section>
    </SkeletonRegion>
  )
}

export function MemberDetailSkeleton() {
  return (
    <SkeletonRegion label="Cargando información del cliente…">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 max-w-full" />
          <Skeleton className="w-36" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 border-b border-line pb-3">
            <Skeleton className="w-44" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 7 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        </Card>
        <CardSkeleton rows={4} />
      </div>
      <Card className="mt-4 overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <Skeleton className="w-64 max-w-full" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]" aria-hidden="true">
            <tbody className="divide-y divide-line">
              <TableSkeleton columns={7} rows={3} label="Cargando comprobantes…" />
            </tbody>
          </table>
        </div>
      </Card>
    </SkeletonRegion>
  )
}

export function MemberFormSkeleton() {
  return (
    <SkeletonRegion label="Cargando planes y datos para registrar al cliente…">
      <Card className="mx-auto max-w-2xl space-y-8 p-6">
        {[0, 1].map((section) => (
          <div key={section}>
            <Skeleton className="mb-4 w-40" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, field) => (
                <div key={field} className={field > 1 ? 'sm:col-span-2' : ''}>
                  <Skeleton className="mb-1.5 w-28" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <Skeleton className="h-20 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-24" />
        </div>
      </Card>
    </SkeletonRegion>
  )
}
