import { Button } from '@/components/ui/Button'

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="my-4 rounded-xl border border-line bg-surface p-5">
      <p className="text-sm text-status-expired">{message}</p>
      <Button className="mt-3" onClick={onRetry}>Reintentar</Button>
    </div>
  )
}
