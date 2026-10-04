import type { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "@/shared/ui/BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="flex-1 overflow-y-auto overscroll-contain pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
        <div className="mx-auto w-full max-w-[1700px] px-4 py-6 sm:px-6 sm:py-8 lg:px-6 lg:py-8">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
