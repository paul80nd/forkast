// A shimmering placeholder card shown while the recipe grid loads, so it doesn't
// jump in (forkast-design). Mirrors RecipeCard's shape.
export function SkeletonCard() {
  const block = 'animate-pulse bg-sunken'
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
      <div className={`aspect-[4/3] w-full ${block}`} />
      <div className="p-3">
        <div className={`h-[15px] w-[72%] rounded-sm ${block}`} />
        <div className={`mt-2 h-[11px] w-[95%] rounded-sm ${block}`} />
        <div className={`mt-1.5 h-[11px] w-[55%] rounded-sm ${block}`} />
        <div className="mt-3.5 flex justify-between">
          <div className={`h-[10px] w-[74px] rounded-sm ${block}`} />
          <div className={`h-[10px] w-[42px] rounded-sm ${block}`} />
        </div>
      </div>
    </div>
  )
}
