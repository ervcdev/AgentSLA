import { defineChain } from "viem";

export const KITE_EXPLORER_BASE = "https://testnet.kitescan.ai";

export const kiteTestnet = defineChain({
  id: 2368,
  name: "Kite Testnet",
  nativeCurrency: { name: "KITE", symbol: "KITE", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_KITE_RPC ?? "https://rpc-testnet.gokite.ai/",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Kitescan",
      url: KITE_EXPLORER_BASE,
    },
  },
  testnet: true,
});

export function explorerAddressUrl(address: string): string {
  return `${KITE_EXPLORER_BASE}/address/${address}`;
}

export function explorerTxUrl(hash: string): string {
  return `${KITE_EXPLORER_BASE}/tx/${hash}`;
}
