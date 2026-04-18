import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  width?: string;
  height?: string;
  className?: string;
}

export function SkeletonCard({ width, height = "h-40", className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-white/[0.05]",
        height,
        width,
        className
      )}
    />
  );
}

interface SkeletonGridProps {
  count?: number;
  cardHeight?: string;
  className?: string;
}

export function SkeletonGrid({ count = 6, cardHeight = "h-40", className }: SkeletonGridProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={cardHeight} />
      ))}
    </div>
  );
}
