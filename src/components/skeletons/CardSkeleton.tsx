import { Card } from "@/components/ui/Card";
import { Skeleton } from "./Skeleton";

interface CardSkeletonProps {
  className?: string;
  rows?: number;
}

export function CardSkeleton({ className, rows = 5 }: CardSkeletonProps) {
  return (
    <Card className={className}>
      <div className="border-b border-line px-5 py-4">
        <Skeleton className="w-44 max-w-full" />
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 px-5 py-3.5"
          >
            <div className="flex-1 space-y-2">
              <Skeleton className={index % 2 === 0 ? "w-2/3" : "w-1/2"} />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}
