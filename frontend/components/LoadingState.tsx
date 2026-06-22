export default function LoadingState() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading air quality dashboard">
      <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
