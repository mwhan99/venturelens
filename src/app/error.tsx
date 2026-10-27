"use client"; // Error boundaries must be Client Components

import Link from "next/link";

// Shown if a page crashes while rendering. This Next.js version names the
// recovery function `retry` (it re-renders the page); older versions used `reset`.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
      <section className="rounded-[18px] border border-line bg-card p-6 sm:rounded-[22px] sm:p-9">
        <span className="inline-block rounded-full bg-lime px-2.5 py-1 text-[13px] font-bold">Something went wrong</span>
        <h1 className="mt-4 font-display text-[clamp(30px,4vw,46px)] font-bold leading-[1.06] tracking-[-0.04em]">
          This page couldn’t load
        </h1>
        <p className="mt-3 max-w-[36em] text-lg text-muted">
          Try again, or head back to the home page. If you were using the calculator, your saved companies are still in this
          browser.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-full bg-brand px-5 py-3 font-bold text-white transition-colors hover:bg-brand-dark"
          >
            Try again
          </button>
          <Link href="/" className="rounded-full bg-brand-soft px-5 py-3 font-bold text-brand transition-colors hover:bg-[#ddd5ff]">
            Go to the home page
          </Link>
        </div>
        {error.digest ? <p className="mt-6 text-xs text-muted">Reference: {error.digest}</p> : null}
      </section>
    </div>
  );
}
