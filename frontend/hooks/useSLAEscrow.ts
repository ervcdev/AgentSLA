"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseEventLogs } from "viem";
import {
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { getEscrowAddress, slaEscrowAbi } from "@/lib/contracts/slaEscrow";
import { loadIds, saveIds } from "@/lib/sla/storage";

export type SlaRow = {
  slaId: `0x${string}`;
  provider: `0x${string}`;
  consumer: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
  penaltyPercent: bigint;
  maxLatencyMs: bigint;
  minUptimePercent: bigint;
  startTime: bigint;
  endTime: bigint;
  funded: boolean;
  settled: boolean;
  penalized: boolean;
};

export function useSLAEscrow() {
  const escrow = getEscrowAddress();
  const [slaIds, setSlaIds] = useState<`0x${string}`[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hidratar desde localStorage en cliente.
  // El patrón requiere setState en effect porque localStorage no existe en SSR.
  useEffect(() => {
    const stored = loadIds();
    if (stored.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlaIds(stored);
    }
    setHydrated(true);
  }, []);

  // Persistir cuando cambia la lista (tras hidratación).
  useEffect(() => {
    if (!hydrated) return;
    saveIds(slaIds);
  }, [hydrated, slaIds]);

  const contracts = useMemo(() => {
    if (!escrow) return [];
    return slaIds.map((slaId) => ({
      address: escrow,
      abi: slaEscrowAbi,
      functionName: "getSLA" as const,
      args: [slaId] as const,
    }));
  }, [escrow, slaIds]);

  const {
    data: readData,
    refetch: refetchSlas,
    isFetching,
    isError,
  } = useReadContracts({
    contracts,
    query: {
      enabled: Boolean(escrow && slaIds.length > 0),
    },
  });

  const rows: SlaRow[] = useMemo(() => {
    if (!readData) return [];
    const out: SlaRow[] = [];
    readData.forEach((res, i) => {
      const id = slaIds[i];
      if (!id || res.status !== "success" || !res.result) return;
      const s = res.result as Omit<SlaRow, "slaId">;
      out.push({ slaId: id, ...s });
    });
    return out;
  }, [readData, slaIds]);

  const appendSlaIds = useCallback((ids: `0x${string}`[]) => {
    setSlaIds((prev) => {
      const seen = new Set(prev);
      const next = [...prev];
      for (const id of ids) {
        if (!seen.has(id)) {
          next.push(id);
          seen.add(id);
        }
      }
      return next;
    });
  }, []);

  const removeSlaId = useCallback((id: `0x${string}`) => {
    setSlaIds((prev) => prev.filter((x) => x !== id));
  }, []);

  return {
    escrow,
    slaIds,
    rows,
    refetchSlas,
    isFetching,
    isError,
    appendSlaIds,
    removeSlaId,
    hydrated,
  };
}

export function useCreateSLA({
  escrow,
  onCreated,
}: {
  escrow?: `0x${string}`;
  onCreated?: (ids: `0x${string}`[]) => void;
}) {
  const {
    writeContract,
    data: txHash,
    error: writeError,
    isPending,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isSuccess || !receipt || !escrow) return;
    const relevant = receipt.logs.filter(
      (l) => l.address.toLowerCase() === escrow.toLowerCase(),
    );
    let parsed;
    try {
      parsed = parseEventLogs({
        abi: slaEscrowAbi,
        logs: relevant,
        eventName: "SLACreated",
      });
    } catch {
      return;
    }
    const ids = parsed
      .map((p) => p.args?.slaId)
      .filter((x): x is `0x${string}` => Boolean(x));
    if (ids.length) onCreated?.(ids);
  }, [isSuccess, receipt, escrow, onCreated]);

  return {
    writeContract,
    txHash,
    writeError,
    receiptError,
    isPending,
    isConfirming,
    isSuccess,
    reset,
  };
}
