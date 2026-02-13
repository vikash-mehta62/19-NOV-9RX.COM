import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showMobileCards?: boolean;
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  showMobileCards = true 
}: TableSkeletonProps) {
  return (
    <>
      {/* Desktop Table Skeleton */}
      <div className="hidden md:block space-y-3">
        {/* Header */}
        <div className="flex gap-4 pb-3 border-b">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-6 flex-1" />
            ))}
          </div>
        ))}
      </div>

      {/* Mobile Card Skeleton */}
      {showMobileCards && (
        <div className="md:hidden space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
