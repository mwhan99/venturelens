import type { Metadata } from "next";
import { DemoSeeder } from "@/components/screen/DemoSeeder";
import { ScreenTabs } from "@/components/screen/ScreenTabs";

export const metadata: Metadata = {
  title: {
    default: "Screen a startup",
    template: "%s · Screen a startup · VentureLens",
  },
  description:
    "Runway, ownership, MOIC and IRR for one startup, with Bear, Base and Bull cases, risk flags, a Form D financing benchmark and a printable memo.",
};

export default function ScreenLayout({ children }: LayoutProps<"/screen">) {
  return (
    <>
      <DemoSeeder />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pt-3 print:hidden sm:px-6">
        <ScreenTabs />
        <p className="text-sm text-muted">
          Demo companies are simulated. Your analyses stay in this browser.
        </p>
      </div>
      {children}
    </>
  );
}
