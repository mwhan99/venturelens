// A saved company's page is rendered on request (companies live in the
// visitor's browser), so show its outline while it loads.
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-4 pt-4 sm:px-6" aria-busy="true" aria-label="Loading company">
      <div className="h-[132px] animate-pulse rounded-[18px] border border-line bg-card sm:rounded-[22px]" />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[220px] animate-pulse rounded-[18px] border border-line bg-card" />
        ))}
      </div>
    </div>
  );
}
