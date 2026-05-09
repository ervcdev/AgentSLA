"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-balance text-xl font-semibold tracking-tight text-foreground">
            AgentSLA
          </h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Kite Testnet · Chain ID 2368 · Demo
          </p>
        </div>
        <ConnectButton
          accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
          chainStatus={{ smallScreen: "icon", largeScreen: "full" }}
          showBalance={{ smallScreen: false, largeScreen: true }}
        />
      </div>
    </header>
  );
}
