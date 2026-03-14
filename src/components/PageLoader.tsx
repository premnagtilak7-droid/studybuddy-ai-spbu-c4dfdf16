import { Skeleton } from "@/components/ui/skeleton";

export default function PageLoader() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-4 animate-in fade-in duration-150">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="glass-card p-5 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        <div className="glass-card p-5 space-y-3">
          <Skeleton className="h-5 w-40" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom section */}
      <div className="glass-card p-5 space-y-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}
