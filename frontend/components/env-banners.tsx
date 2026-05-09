type Props = {
  hasEscrow: boolean;
  hasWalletConnect: boolean;
};

export function EnvBanners({ hasEscrow, hasWalletConnect }: Props) {
  if (hasEscrow && hasWalletConnect) return null;

  return (
    <div className="space-y-3">
      {!hasEscrow ? (
        <p
          role="alert"
          className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning"
        >
          Configura{" "}
          <code className="rounded bg-background/60 px-1 font-mono text-xs">
            NEXT_PUBLIC_SLA_ESCROW_ADDRESS
          </code>{" "}
          en{" "}
          <code className="rounded bg-background/60 px-1 font-mono text-xs">
            frontend/.env.local
          </code>{" "}
          con la dirección desplegada de SLAEscrow.
        </p>
      ) : null}
      {!hasWalletConnect ? (
        <p
          role="status"
          className="rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent"
        >
          Opcional: define{" "}
          <code className="rounded bg-background/60 px-1 font-mono text-xs">
            NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
          </code>{" "}
          (WalletConnect Cloud) para activar más wallets. Sin él se usa solo el
          conector inyectado del navegador.
        </p>
      ) : null}
    </div>
  );
}
