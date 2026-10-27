// Shown while a company's page loads for the first time.
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6" aria-busy="true" aria-label="Loading company">
      <div className="mt-8 grid gap-4 md:grid-cols-[1.5fr_1fr] md:gap-5">
        <div className="h-[220px] animate-pulse rounded-[18px] border border-line bg-card sm:rounded-[22px]" />
        <div className="h-[220px] animate-pulse rounded-[18px] border border-line bg-card sm:rounded-[22px]" />
      </div>
      <div className="mt-4 h-[320px] animate-pulse rounded-[18px] border border-line bg-card sm:mt-5 sm:rounded-[22px]" />
    </div>
  );
}
