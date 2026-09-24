export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="32" height="32" rx="8" fill="#1F8A70" />
      <path d="M8 8.5 16 23.5 24 8.5h-3.6L16 17.2 11.6 8.5H8Z" fill="white" />
    </svg>
  );
}

export function IconDashboard({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="2.5" width="6.5" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="8.5" width="6.5" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function IconAnalyze({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path d="M4 15.5 8.2 9.8l3 3.4L16.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 6h3.5V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPortfolio({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="5.5" width="14" height="11" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 5.5V4.6A1.6 1.6 0 0 1 8.6 3h2.8A1.6 1.6 0 0 1 13 4.6v.9" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 9.5h14" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function IconCompare({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path d="M6 4v12M14 4v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="3.5" y="7" width="5" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11.5" y="5.5" width="5" height="9" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function IconBenchmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <circle cx="10" cy="10" r="7.2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="3.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 2.8v2.4M10 14.8v2.4M2.8 10h2.4M14.8 10h2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconCases({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path d="M4 6.5h12v9.2a1.3 1.3 0 0 1-1.3 1.3H5.3A1.3 1.3 0 0 1 4 15.7V6.5Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 6.5V5.2A1.7 1.7 0 0 1 8.7 3.5h2.6A1.7 1.7 0 0 1 13 5.2v1.3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconMenu({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconMemo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path d="M5 3.5h7.2L15.5 7v9.5A1 1 0 0 1 14.5 17.5h-9A1 1 0 0 1 4.5 16.5v-12A1 1 0 0 1 5.5 3.5H5Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 3.5V7h3.5M7 10.5h6M7 13.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconClose({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
