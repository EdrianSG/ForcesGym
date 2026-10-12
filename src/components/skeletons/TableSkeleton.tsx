import { Skeleton } from './Skeleton'

interface TableSkeletonProps {
  columns: number
  rows?: number
  label: string
  align?: 'left' | 'center'
}

export function TableSkeleton({
  columns,
  rows = 5,
  label,
  align = 'left',
}: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row}>
          {Array.from({ length: columns }, (_, column) => (
            <td key={column} className="px-4 py-3">
              {row === 0 && column === 0 && (
                <span role="status" className="sr-only">{label}</span>
              )}
              <Skeleton
                className={`${align === 'center' ? 'mx-auto' : ''} ${
                  (row + column) % 3 === 0 ? 'w-3/4' : 'w-2/3'
                } min-w-12`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
