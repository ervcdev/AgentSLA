"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits, parseEventLogs, parseUnits } from "viem";
import {
  useAccount,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  KITE_TEST_USDT,
  getEscrowAddress,
  slaEscrowAbi,
} from "@/lib/contracts/slaEscrow";

const STORAGE_KEY = "agentsla:slaIds";
const DEFAULT_PENALTY_PERCENT = 10n;

type SlaRow = {
  slaId: `0x${string}`;
  provider: string;
  consumer: string;
  amount: bigint;
  maxLatencyMs: bigint;
  minUptimePercent: bigint;
  funded: boolean;
  settled: boolean;
  penalized: boolean;
};

function loadIds(): `0x${string}`[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is `0x${string}` => typeof x === "string" && x.startsWith("0x")
    );
  } catch {
    return [];
  }
}

function saveIds(ids: `0x${string}`[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function statusLabel(row: SlaRow): "Penalizado" | "Liquidado" | "Financiado" | "Creado" {
  if (row.penalized) return "Penalizado";
  if (row.settled) return "Liquidado";
  if (row.funded) return "Financiado";
  return "Creado";
}

export function SLADemo() {
  const { isConnected } = useAccount();
  const escrow = getEscrowAddress();

  const [slaIds, setSlaIds] = useState<`0x${string}`[]>([]);
  const [provider, setProvider] = useState("");
  const [maxLatencyMs, setMaxLatencyMs] = useState("200");
  const [minUptimePercent, setMinUptimePercent] = useState("99");
  const [amount, setAmount] = useState("1");
  const [durationSeconds, setDurationSeconds] = useState("3600");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setSlaIds(loadIds());
  }, []);

  const contracts = useMemo(
    () =>
      slaIds.map((slaId) => ({
        address: escrow!,
        abi: slaEscrowAbi,
        functionName: "getSLA" as const,
        args: [slaId] as const,
      })),
    [escrow, slaIds]
  );

  const { data: readData, refetch: refetchSlas } = useReadContracts({
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
      const s = res.result as {
        provider: `0x${string}`;
        consumer: `0x${string}`;
        amount: bigint;
        maxLatencyMs: bigint;
        minUptimePercent: bigint;
        settled: boolean;
        penalized: boolean;
        funded: boolean;
      };
      out.push({
        slaId: id,
        provider: s.provider,
        consumer: s.consumer,
        amount: s.amount,
        maxLatencyMs: s.maxLatencyMs,
        minUptimePercent: s.minUptimePercent,
        funded: s.funded,
        settled: s.settled,
        penalized: s.penalized,
      });
    });
    return out;
  }, [readData, slaIds]);

  const { writeContract, data: txHash, error: writeError, isPending } =
    useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } =
    useWaitForTransactionReceipt({ hash: txHash });

  const appendSlaId = useCallback((id: `0x${string}`) => {
    setSlaIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveIds(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isSuccess || !receipt || !escrow) return;
    const relevant = receipt.logs.filter(
      (l) => l.address.toLowerCase() === escrow.toLowerCase()
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
    const last = parsed[parsed.length - 1];
    if (last?.args?.slaId) {
      appendSlaId(last.args.slaId);
    }
    void refetchSlas();
  }, [appendSlaId, escrow, isSuccess, receipt, refetchSlas]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!escrow) {
      setFormError("Falta NEXT_PUBLIC_SLA_ESCROW_ADDRESS en .env.local");
      return;
    }
    if (!provider.match(/^0x[a-fA-F0-9]{40}$/)) {
      setFormError("Dirección de proveedor inválida");
      return;
    }
    let amountWei: bigint;
    try {
      amountWei = parseUnits(amount.trim() || "0", 18);
    } catch {
      setFormError("Monto inválido");
      return;
    }
    if (amountWei <= 0n) {
      setFormError("El monto debe ser mayor que 0");
      return;
    }
    const lat = BigInt(maxLatencyMs || "0");
    const up = BigInt(minUptimePercent || "0");
    const dur = BigInt(durationSeconds || "0");
    if (dur <= 0n) {
      setFormError("Duración debe ser > 0");
      return;
    }

    writeContract({
      address: escrow,
      abi: slaEscrowAbi,
      functionName: "createSLA",
      args: [
        provider as `0x${string}`,
        KITE_TEST_USDT,
        amountWei,
        DEFAULT_PENALTY_PERCENT,
        lat,
        up,
        dur,
      ],
    });
  };

  const txBusy = isPending || isConfirming;

  return (
    <div className="min-h-full bg-[#0a1628] text-[#e8eef5]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            AgentSLA
          </h1>
          <p className="text-sm text-white/60">
            Kite testnet · Chain ID 2368 · Demo
          </p>
        </div>
        <ConnectButton />
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-6 py-10">
        {!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ? (
          <p className="rounded-lg border border-[#00E5CC]/40 bg-[#00E5CC]/10 px-4 py-3 text-sm text-[#00E5CC]">
            Opcional: define{" "}
            <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code>{" "}
            (WalletConnect Cloud) para el conector WalletConnect.
          </p>
        ) : null}

        {!escrow ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Configura{" "}
            <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_SLA_ESCROW_ADDRESS</code>{" "}
            en <code className="rounded bg-black/30 px-1">frontend/.env.local</code> con
            la dirección desplegada de SLAEscrow.
          </p>
        ) : null}

        <section className="rounded-xl border border-white/10 bg-[#0d1f35] p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-medium text-[#00E5CC]">
            Nuevo SLA
          </h2>
          {!isConnected ? (
            <p className="text-sm text-white/60">
              Conecta tu wallet para crear un SLA on-chain.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="text-white/70">Dirección del proveedor</span>
                <input
                  className="rounded-lg border border-white/15 bg-[#0a1628] px-3 py-2 font-mono text-sm outline-none ring-[#00E5CC] focus:ring-2"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value.trim())}
                  placeholder="0x…"
                  autoComplete="off"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-white/70">Umbral de latencia (ms)</span>
                <input
                  type="number"
                  min={0}
                  className="rounded-lg border border-white/15 bg-[#0a1628] px-3 py-2 outline-none ring-[#00E5CC] focus:ring-2"
                  value={maxLatencyMs}
                  onChange={(e) => setMaxLatencyMs(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-white/70">Uptime mínimo (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="rounded-lg border border-white/15 bg-[#0a1628] px-3 py-2 outline-none ring-[#00E5CC] focus:ring-2"
                  value={minUptimePercent}
                  onChange={(e) => setMinUptimePercent(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-white/70">
                  Monto (USDC demo, 18 dec.)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="rounded-lg border border-white/15 bg-[#0a1628] px-3 py-2 outline-none ring-[#00E5CC] focus:ring-2"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <span className="text-xs text-white/45">
                  Token: Test USDT Kite · {KITE_TEST_USDT.slice(0, 10)}…
                </span>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-white/70">Duración (segundos)</span>
                <input
                  type="number"
                  min={1}
                  className="rounded-lg border border-white/15 bg-[#0a1628] px-3 py-2 outline-none ring-[#00E5CC] focus:ring-2"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(e.target.value)}
                />
              </label>
              <p className="text-xs text-white/50 sm:col-span-2">
                Penalización por defecto en esta demo: {String(DEFAULT_PENALTY_PERCENT)}%.
              </p>
              {formError ? (
                <p className="text-sm text-red-400 sm:col-span-2">{formError}</p>
              ) : null}
              {writeError ? (
                <p className="text-sm text-red-400 sm:col-span-2">
                  {writeError.message}
                </p>
              ) : null}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={txBusy || !escrow}
                  className="rounded-lg bg-[#00E5CC] px-5 py-2.5 text-sm font-medium text-[#0a1628] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {txBusy
                    ? isPending
                      ? "Firmando…"
                      : "Confirmando…"
                    : "Crear SLA"}
                </button>
                {isSuccess ? (
                  <span className="ml-3 text-sm text-[#00E5CC]">
                    Transacción confirmada.
                  </span>
                ) : null}
              </div>
            </form>
          )}
        </section>

        <section className="rounded-xl border border-white/10 bg-[#0d1f35] p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium text-[#00E5CC]">
              SLAs (esta sesión / navegador)
            </h2>
            <button
              type="button"
              onClick={() => void refetchSlas()}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
            >
              Actualizar
            </button>
          </div>
          <p className="mb-4 text-xs text-white/50">
            Los IDs se guardan en <code className="text-white/70">localStorage</code>{" "}
            tras crear un SLA. Estados: financiado, liquidado o penalizado según el
            contrato.
          </p>
          {!slaIds.length ? (
            <p className="text-sm text-white/55">
              Aún no hay SLAs en la lista. Crea uno arriba.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => (
                <li
                  key={row.slaId}
                  className="rounded-lg border border-white/10 bg-[#0a1628] p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs text-white/80">
                      {row.slaId.slice(0, 10)}…{row.slaId.slice(-8)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.penalized
                          ? "bg-red-500/20 text-red-300"
                          : row.settled
                            ? "bg-emerald-500/20 text-emerald-300"
                            : row.funded
                              ? "bg-[#00E5CC]/20 text-[#00E5CC]"
                              : "bg-white/10 text-white/70"
                      }`}
                    >
                      {statusLabel(row)}
                    </span>
                  </div>
                  <dl className="mt-2 grid gap-1 text-xs text-white/60 sm:grid-cols-2">
                    <div>
                      Proveedor:{" "}
                      <span className="font-mono text-white/80">
                        {row.provider.slice(0, 8)}…
                      </span>
                    </div>
                    <div>
                      Monto:{" "}
                      <span className="text-white/80">
                        {formatUnits(row.amount, 18)}
                      </span>
                    </div>
                    <div>Latencia máx.: {row.maxLatencyMs.toString()} ms</div>
                    <div>Uptime mín.: {row.minUptimePercent.toString()}%</div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
