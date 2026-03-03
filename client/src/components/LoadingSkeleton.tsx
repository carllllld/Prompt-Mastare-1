import { Skeleton } from "@/components/ui/skeleton";

interface ProgressProps {
  step?: number;
  total?: number;
  message?: string;
}

export function PromptGenerationSkeleton({ step = 0, total = 7, message = "Förbereder generering..." }: ProgressProps) {
  const progress = total > 0 ? Math.round(((step + 1) / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#2D6A4F" }} />
          <span className="text-sm font-medium" style={{ color: "#2D6A4F" }}>{message}</span>
        </div>
        <span className="text-xs font-medium tabular-nums" style={{ color: "#9CA3AF" }}>
          {step + 1}/{total}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#E8E5DE" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%`, background: "#2D6A4F" }}
        />
      </div>
      <div className="space-y-3 pt-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
    </div>
  );
}

export function AddressLookupSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-3 w-[150px]" />
    </div>
  );
}

export function PersonalStyleSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-2 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-[80px]" />
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-[80px]" />
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-[80px]" />
          <Skeleton className="h-2 w-full" />
        </div>
      </div>
    </div>
  );
}

export function HistorySkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-[150px]" />
            <Skeleton className="h-4 w-[80px]" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-[60px]" />
            <Skeleton className="h-6 w-[80px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TeamSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-[120px]" />
        <Skeleton className="h-8 w-[100px]" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-4 p-3 border rounded">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-3 w-[80px]" />
            </div>
            <Skeleton className="h-6 w-[60px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
