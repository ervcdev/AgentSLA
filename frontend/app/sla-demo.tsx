"use client";

import { useCallback } from "react";
import { CreateSLAForm } from "@/components/create-sla-form";
import { EnvBanners } from "@/components/env-banners";
import { SiteHeader } from "@/components/site-header";
import { SLAList } from "@/components/sla-list";
import { useSLAEscrow } from "@/hooks/useSLAEscrow";

export function SLADemo() {
  const {
    escrow,
    slaIds,
    rows,
    refetchSlas,
    isFetching,
    appendSlaIds,
  } = useSLAEscrow();

  const onCreated = useCallback(
    (ids: `0x${string}`[]) => {
      appendSlaIds(ids);
      void refetchSlas();
    },
    [appendSlaIds, refetchSlas],
  );

  const onRefetch = useCallback(() => {
    void refetchSlas();
  }, [refetchSlas]);

  return (
    <div className="min-h-full">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
        <EnvBanners
          hasEscrow={Boolean(escrow)}
          hasWalletConnect={Boolean(
            process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
          )}
        />
        <CreateSLAForm escrow={escrow} onCreated={onCreated} />
        <SLAList
          rows={rows}
          isFetching={isFetching}
          hasIds={slaIds.length > 0}
          escrow={escrow}
          onRefetch={onRefetch}
        />
      </main>
    </div>
  );
}
