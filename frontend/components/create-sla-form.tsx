"use client";

import { useEffect, useState } from "react";
import { isAddress, parseUnits } from "viem";
import { useAccount } from "wagmi";
import {
  KITE_TEST_USDT,
  KITE_TEST_USDT_DECIMALS,
  KITE_TEST_USDT_SYMBOL,
  slaEscrowAbi,
} from "@/lib/contracts/slaEscrow";
import { shortAddress } from "@/lib/sla/format";
import { useCreateSLA } from "@/hooks/useSLAEscrow";

const DEFAULT_PENALTY_PERCENT = 10n;

type Props = {
  escrow?: `0x${string}`;
  onCreated: (ids: `0x${string}`[]) => void;
};

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive";

export function CreateSLAForm({ escrow, onCreated }: Props) {
  const { isConnected } = useAccount();
  const [provider, setProvider] = useState("");
  const [maxLatencyMs, setMaxLatencyMs] = useState("200");
  const [minUptimePercent, setMinUptimePercent] = useState("99");
  const [amount, setAmount] = useState("1");
  const [durationSeconds, setDurationSeconds] = useState("3600");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    writeContract,
    writeError,
    isPending,
    isConfirming,
    isSuccess,
    reset,
  } = useCreateSLA({ escrow, onCreated });

  // Reset del formulario tras confirmación.
  useEffect(() => {
    if (!isSuccess) return;
    setProvider("");
    setAmount("1");
    setMaxLatencyMs("200");
    setMinUptimePercent("99");
    setDurationSeconds("3600");
    setErrors({});
    const t = setTimeout(() => reset(), 4000);
    return () => clearTimeout(t);
  }, [isSuccess, reset]);

  const txBusy = isPending || isConfirming;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};

    if (!escrow) {
      next.global = "Falta NEXT_PUBLIC_SLA_ESCROW_ADDRESS";
    }
    if (!isAddress(provider)) {
      next.provider = "Dirección Ethereum inválida";
    }

    let amountWei = 0n;
    try {
      const trimmed = amount.trim();
      if (!trimmed) throw new Error();
      amountWei = parseUnits(trimmed, KITE_TEST_USDT_DECIMALS);
      if (amountWei <= 0n) throw new Error();
    } catch {
      next.amount = "Monto inválido (debe ser > 0)";
    }

    const lat = Number(maxLatencyMs);
    if (!Number.isFinite(lat) || lat < 0) next.maxLatencyMs = "Valor inválido";

    const up = Number(minUptimePercent);
    if (!Number.isFinite(up) || up < 0 || up > 100)
      next.minUptimePercent = "Entre 0 y 100";

    const dur = Number(durationSeconds);
    if (!Number.isFinite(dur) || dur <= 0)
      next.durationSeconds = "Debe ser > 0";

    setErrors(next);
    if (Object.keys(next).length) return;

    writeContract({
      address: escrow!,
      abi: slaEscrowAbi,
      functionName: "createSLA",
      args: [
        provider as `0x${string}`,
        KITE_TEST_USDT,
        amountWei,
        DEFAULT_PENALTY_PERCENT,
        BigInt(lat),
        BigInt(up),
        BigInt(dur),
      ],
    });
  };

  return (
    <section
      className="rounded-lg border border-border bg-card p-6 shadow-lg"
      aria-labelledby="create-sla-title"
    >
      <h2
        id="create-sla-title"
        className="mb-4 text-lg font-medium text-accent"
      >
        Nuevo SLA
      </h2>

      {!isConnected ? (
        <p className="text-sm text-muted-foreground">
          Conecta tu wallet para crear un SLA on-chain.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field
            id="provider"
            label="Dirección del proveedor"
            error={errors.provider}
            colSpan
          >
            <input
              id="provider"
              name="provider"
              className={`${inputCls} font-mono`}
              value={provider}
              onChange={(e) => setProvider(e.target.value.trim())}
              placeholder="0x…"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(errors.provider)}
            />
          </Field>

          <Field
            id="latency"
            label="Umbral de latencia (ms)"
            error={errors.maxLatencyMs}
          >
            <input
              id="latency"
              type="number"
              min={0}
              className={inputCls}
              value={maxLatencyMs}
              onChange={(e) => setMaxLatencyMs(e.target.value)}
              aria-invalid={Boolean(errors.maxLatencyMs)}
            />
          </Field>

          <Field
            id="uptime"
            label="Uptime mínimo (%)"
            error={errors.minUptimePercent}
          >
            <input
              id="uptime"
              type="number"
              min={0}
              max={100}
              className={inputCls}
              value={minUptimePercent}
              onChange={(e) => setMinUptimePercent(e.target.value)}
              aria-invalid={Boolean(errors.minUptimePercent)}
            />
          </Field>

          <Field
            id="amount"
            label={`Monto (${KITE_TEST_USDT_SYMBOL}, ${KITE_TEST_USDT_DECIMALS} dec.)`}
            error={errors.amount}
            hint={`Token: ${shortAddress(KITE_TEST_USDT, 6, 4)}`}
          >
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              className={inputCls}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={Boolean(errors.amount)}
            />
          </Field>

          <Field
            id="duration"
            label="Duración (segundos)"
            error={errors.durationSeconds}
          >
            <input
              id="duration"
              type="number"
              min={1}
              className={inputCls}
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(e.target.value)}
              aria-invalid={Boolean(errors.durationSeconds)}
            />
          </Field>

          <p className="text-xs text-muted-foreground sm:col-span-2">
            Penalización por defecto: {String(DEFAULT_PENALTY_PERCENT)}%.
          </p>

          {errors.global ? (
            <p
              role="alert"
              className="text-sm text-destructive sm:col-span-2"
            >
              {errors.global}
            </p>
          ) : null}
          {writeError ? (
            <p
              role="alert"
              className="text-sm text-destructive sm:col-span-2"
            >
              {writeError.message}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={txBusy || !escrow}
              aria-busy={txBusy}
              className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-40"
            >
              {txBusy
                ? isPending
                  ? "Firmando…"
                  : "Confirmando…"
                : "Crear SLA"}
            </button>
            <span aria-live="polite" className="text-sm text-accent">
              {isSuccess ? "Transacción confirmada." : null}
            </span>
          </div>
        </form>
      )}
    </section>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  colSpan,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  colSpan?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-1 text-sm ${colSpan ? "sm:col-span-2" : ""}`}
    >
      <label htmlFor={id} className="text-foreground/85">
        {label}
      </label>
      {children}
      {hint ? (
        <span className="font-mono text-xs text-muted-foreground">{hint}</span>
      ) : null}
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
