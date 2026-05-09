"use client";

import type { SlaRow } from "@/hooks/useSLAEscrow";
import { SLAItem } from "./sla-row";

type Props = {
  rows: SlaRow[];
  isFetching: boolean;
  hasIds: boolean;
  escrow?: `0x${string}`;
  onRefetch: () => void;
};

export function SLAList({
  rows,
  isFetching,
  hasIds,
  escrow,
  onRefetch,
}: Props) {
  return (
    <section
      className="rounded-lg border border-border bg-card p-6 shadow-lg"
      aria-labelledby="sla-list-title"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2
          id="sla-list-title"
          className="text-lg font-medium text-accent"
        >
          SLAs (esta sesión / navegador)
        </h2>
        <button
          type="button"
          onClick={onRefetch}
          aria-busy={isFetching}
          className="inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isFetching ? "Actualizando…" : "Actualizar"}
        </button>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Los IDs se guardan en{" "}
        <code className="font-mono text-foreground/80">localStorage</code> tras
        crear un SLA. Estados: financiado, liquidado o penalizado según el
        contrato.
      </p>

      {!hasIds ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay SLAs en la lista. Crea uno arriba.
        </p>
      ) : rows.length === 0 ? (
        <p
          aria-live="polite"
          className="text-sm text-muted-foreground"
        >
          {isFetching ? "Cargando SLAs…" : "No se pudieron leer los SLAs."}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <SLAItem
              key={row.slaId}
              row={row}
              escrow={escrow}
              onActed={onRefetch}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
