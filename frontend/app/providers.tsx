"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import {
  RainbowKitProvider,
  darkTheme,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { kiteTestnet } from "@/lib/chains/kite";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Si hay projectId de WalletConnect usamos getDefaultConfig (incluye múltiples
// wallets via WalletConnect). En caso contrario, fallback a un config mínimo
// con sólo el conector inyectado del navegador (MetaMask, Rabby, etc.).
const wagmiConfig = walletConnectProjectId
  ? getDefaultConfig({
      appName: "AgentSLA",
      projectId: walletConnectProjectId,
      chains: [kiteTestnet],
      ssr: true,
    })
  : createConfig({
      chains: [kiteTestnet],
      connectors: [injected({ shimDisconnect: true })],
      transports: {
        [kiteTestnet.id]: http(),
      },
      ssr: true,
    });

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#00E5CC",
            accentColorForeground: "#0a1628",
            borderRadius: "medium",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
