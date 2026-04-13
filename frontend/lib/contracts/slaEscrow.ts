/** Test USDT en Kite testnet (context.md). La UI lo muestra como “USDC” en la demo. */
export const KITE_TEST_USDT =
  "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63" as const;

export const slaEscrowAbi = [
  {
    type: "function",
    name: "createSLA",
    stateMutability: "nonpayable",
    inputs: [
      { name: "provider", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "penaltyPercent", type: "uint256" },
      { name: "maxLatencyMs", type: "uint256" },
      { name: "minUptimePercent", type: "uint256" },
      { name: "durationSeconds", type: "uint256" },
    ],
    outputs: [{ name: "slaId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "getSLA",
    stateMutability: "view",
    inputs: [{ name: "slaId", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "provider", type: "address" },
          { name: "consumer", type: "address" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "penaltyPercent", type: "uint256" },
          { name: "maxLatencyMs", type: "uint256" },
          { name: "minUptimePercent", type: "uint256" },
          { name: "startTime", type: "uint256" },
          { name: "endTime", type: "uint256" },
          { name: "settled", type: "bool" },
          { name: "penalized", type: "bool" },
          { name: "funded", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "SLACreated",
    inputs: [
      { name: "slaId", type: "bytes32", indexed: true },
      { name: "provider", type: "address", indexed: false },
      { name: "consumer", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export function getEscrowAddress(): `0x${string}` | undefined {
  const raw = process.env.NEXT_PUBLIC_SLA_ESCROW_ADDRESS;
  if (!raw || !raw.startsWith("0x")) return undefined;
  return raw as `0x${string}`;
}
