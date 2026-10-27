// The Atlas mark: a violet slice of a coral circle. Matches src/app/icon.svg.
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <circle cx="16" cy="16" r="16" fill="#e0552d" />
      <path d="M16 16V0a16 16 0 0 1 14.1 23.5Z" fill="#5b3df5" />
    </svg>
  );
}
