// Shown while a search runs.
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6" aria-busy="true" aria-label="Searching">
      <div className="h-[300px] animate-pulse rounded-[18px] border border-line bg-card sm:rounded-[22px]" />
      <div className="mt-4 grid gap-2 rounded-[18px] border border-line bg-card p-6 sm:mt-5 sm:rounded-[22px]">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-[14px] bg-background" />
        ))}
      </div>
    </div>
  );
}
