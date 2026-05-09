"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { erc20Abi } from "@/lib/contracts/erc20";
import {
  KITE_TEST_USDT_DECIMALS,
  KITE_TEST_USDT_SYMBOL,
  slaEscrowAbi,
} from "@/lib/contracts/slaEscrow";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/chains/kite";
import { formatDuration, shortAddress, shortHash } from "@/lib/sla/format";
import type { SlaRow } from "@/hooks/useSLAEscrow";

type Props = {
  row: SlaRow;
  escrow?: `0x${string}`;
  onActed?: () => void;
};

function statusLabel(row: SlaRow) {
  if (row.penalized) return "Penalizado";
  if (row.settled) return "Liquidado";
  if (row.funded) return "Financiado";
  return "Creado";
}

function statusClasses(row: SlaRow) {
  if (row.penalized)
    return "border-destructive/30 bg-destructive/15 text-destructive";
  if (row.settled) return "border-success/30 bg-success/15 text-success";
  if (row.funded) return "border-accent/30 bg-accent/15 text-accent";
  return "border-border bg-muted text-muted-foreground";
}

export function SLAItem({ row, escrow, onActed }: Props) {
  const now = useNowSeconds();
  const ended = row.endTime > 0n && BigInt(now) >= row.endTime;
  const remaining = row.endTime > BigInt(now) ? row.endTime - BigInt(now) : 0n;

  return (
    <li className="rounded-md border border-border bg-background p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className="font-mono text-xs text-foreground/80"
          title={row.slaId}
        >
          {shortHash(row.slaId)}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClasses(row)}`}
        >
          {statusLabel(row)}
        </span>
      </div>

      <dl className="mt-3 grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
        <div>
          Proveedor:{" "}
          <a
            href={explorerAddressUrl(row.provider)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-foreground/85 hover:text-accent"
          >
            {shortAddress(row.provider)}
          </a>
        </div>
        <div>
          Consumidor:{" "}
          <a
            href={explorerAddressUrl(row.consumer)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-foreground/85 hover:text-accent"
          >
            {shortAddress(row.consumer)}
          </a>
        </div>
        <div>
          Monto:{" "}
          <span className="text-foreground">
            {formatUnits(row.amount, KITE_TEST_USDT_DECIMALS)}{" "}
            {KITE_TEST_USDT_SYMBOL}
          </span>
        </div>
        <div>Penalización: {row.penaltyPercent.toString()}%</div>
        <div>Latencia máx.: {row.maxLatencyMs.toString()} ms</div>
        <div>Uptime mín.: {row.minUptimePercent.toString()}%</div>
        <div className="sm:col-span-2">
          {ended
            ? "Periodo finalizado"
            : `Termina en ${formatDuration(remaining)}`}
        </div>
      </dl>

      <SLAActions row={row} escrow={escrow} ended={ended} onActed={onActed} />
    </li>
  );
}

function SLAActions({
  row,
  escrow,
  ended,
  onActed,
}: {
  row: SlaRow;
  escrow?: `0x${string}`;
  ended: boolean;
  onActed?: () => void;
}) {
  const { address: account } = useAccount();
  const isConsumer =
    Boolean(account) &&
    row.consumer.toLowerCase() === account!.toLowerCase();

  const canFund = isConsumer && !row.funded && !row.settled;
  const canSettle = row.funded && !row.settled && ended;

  const { data: allowance } = useReadContract({
    address: row.token,
    abi: erc20Abi,
    functionName: "allowance",
    args: account && escrow ? [account, escrow] : undefined,
    query: { enabled: Boolean(account && escrow && canFund) },
  });

  const {
    writeContract: writeApprove,
    data: approveHash,
    error: approveError,
    isPending: approveSubmitting,
  } = useWriteContract();
  const {
    writeContract: writeFund,
    data: fundHash,
    error: fundError,
    isPending: fundSubmitting,
  } = useWriteContract();
  const {
    writeContract: writeSettle,
    data: settleHash,
    error: settleError,
    isPending: settleSubmitting,
  } = useWriteContract();
  const {
    writeContract: writePenalize,
    data: penalizeHash,
    error: penalizeError,
    isPending: penalizeSubmitting,
  } = useWriteContract();

  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: fundConfirming, isSuccess: fundSuccess } =
    useWaitForTransactionReceipt({ hash: fundHash });
  const { isLoading: settleConfirming, isSuccess: settleSuccess } =
    useWaitForTransactionReceipt({ hash: settleHash });
  const { isLoading: penalizeConfirming, isSuccess: penalizeSuccess } =
    useWaitForTransactionReceipt({ hash: penalizeHash });

  const [pendingFund, setPendingFund] = useState(false);

  // Tras aprobar, dispara depositFunds automáticamente.
  useEffect(() => {
    if (!pendingFund || !approveSuccess || !escrow) return;
    writeFund({
      address: escrow,
      abi: slaEscrowAbi,
      functionName: "depositFunds",
      args: [row.slaId],
    });
    setPendingFund(false);
  }, [pendingFund, approveSuccess, escrow, row.slaId, writeFund]);

  // Refrescar la lista tras cualquier acción confirmada.
  useEffect(() => {
    if (fundSuccess || settleSuccess || penalizeSuccess) {
      onActed?.();
    }
  }, [fundSuccess, settleSuccess, penalizeSuccess, onActed]);

  const onApproveAndFund = () => {
    if (!escrow || !account) return;
    const hasAllowance = (allowance ?? 0n) >= row.amount;
    if (hasAllowance) {
      writeFund({
        address: escrow,
        abi: slaEscrowAbi,
        functionName: "depositFunds",
        args: [row.slaId],
      });
      return;
    }
    setPendingFund(true);
    writeApprove({
      address: row.token,
      abi: erc20Abi,
      functionName: "approve",
      args: [escrow, row.amount],
    });
  };

  const onSettle = () => {
    if (!escrow) return;
    writeSettle({
      address: escrow,
      abi: slaEscrowAbi,
      functionName: "releaseFunds",
      args: [row.slaId],
    });
  };

  const onPenalize = () => {
    if (!escrow) return;
    writePenalize({
      address: escrow,
      abi: slaEscrowAbi,
      functionName: "penalize",
      args: [row.slaId],
    });
  };

  if (!canFund && !canSettle) return null;

  const approveBusy =
    approveSubmitting || approveConfirming || pendingFund;
  const fundBusy = fundSubmitting || fundConfirming;
  const settleBusy = settleSubmitting || settleConfirming;
  const penalizeBusy = penalizeSubmitting || penalizeConfirming;

  const errorMessage =
    approveError?.message ||
    fundError?.message ||
    settleError?.message ||
    penalizeError?.message ||
    null;

  const txHash =
    approveHash || fundHash || settleHash || penalizeHash || undefined;

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
      {canFund ? (
        <button
          type="button"
          onClick={onApproveAndFund}
          aria-busy={approveBusy || fundBusy}
          disabled={approveBusy || fundBusy}
          className={btnPrimary}
        >
          {approveBusy
            ? "Aprobando…"
            : fundBusy
              ? "Financiando…"
              : "Aprobar y financiar"}
        </button>
      ) : null}

      {canSettle ? (
        <>
          <button
            type="button"
            onClick={onSettle}
            aria-busy={settleBusy}
            disabled={settleBusy || penalizeBusy}
            className={btnSecondary}
          >
            {settleBusy ? "Liquidando…" : "Liquidar"}
          </button>
          <button
            type="button"
            onClick={onPenalize}
            aria-busy={penalizeBusy}
            disabled={settleBusy || penalizeBusy}
            className={btnDestructive}
          >
            {penalizeBusy ? "Penalizando…" : "Penalizar"}
          </button>
        </>
      ) : null}

      {txHash ? (
        <a
          href={explorerTxUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="self-center text-xs text-muted-foreground underline-offset-2 hover:text-accent hover:underline"
        >
          Ver última tx ↗
        </a>
      ) : null}

      {errorMessage ? (
        <p
          role="alert"
          className="basis-full text-xs text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

const btnBase =
  "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-40";
const btnPrimary = `${btnBase} bg-primary text-primary-foreground hover:opacity-90`;
const btnSecondary = `${btnBase} border border-border bg-secondary text-foreground hover:bg-muted`;
const btnDestructive = `${btnBase} bg-destructive text-destructive-foreground hover:opacity-90`;

function useNowSeconds() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}
