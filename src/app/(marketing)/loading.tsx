export default function Loading() {
  return (
    <div className="max-w-[1080px] animate-pulse space-y-6 pt-2">
      <div>
        <div className="mb-2 h-3 w-28 rounded bg-line" />
        <div className="h-7 w-64 rounded bg-line" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="h-28 rounded-xl border border-line bg-white/80" />
        <div className="h-28 rounded-xl border border-line bg-white/80" />
        <div className="h-28 rounded-xl border border-line bg-white/80" />
      </div>
      <div className="h-64 rounded-xl border border-line bg-white/80" />
    </div>
  );
}