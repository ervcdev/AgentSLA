// agent/server.ts
import * as dotenv from "dotenv";
import express from "express";

dotenv.config();
const app = express();
app.use(express.json());

const PAYMENT_AMOUNT = "1000000000000000000"; // 1 Test USDT (18 decimales)
const PAY_TO = process.env.SERVICE_WALLET_ADDRESS!;
const USDT_ADDRESS =
  process.env.USDT_ADDRESS ?? "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63";
const PIEVERSE_URL =
  process.env.PIEVERSE_URL ?? "https://facilitator.pieverse.io";

app.get('/api/evaluate-sla', async (req: any, res: any) => {
  const paymentHeader = req.headers['x-payment'];

  if (!paymentHeader) {
    return res.status(402).json({
      error: "X-PAYMENT header is required",
      accepts: [{
        scheme: "gokite-aa",
        network: "kite-testnet",
        maxAmountRequired: PAYMENT_AMOUNT,
        resource: `${process.env.SERVICE_URL}/api/evaluate-sla`,
        description: "AgentSLA - Autonomous SLA evaluation service",
        mimeType: "application/json",
        outputSchema: {
          input: {
            discoverable: true,
            method: "GET",
            queryParams: {
              slaId: { description: "SLA ID to evaluate", required: true, type: "string" },
              avgLatencyMs: { description: "Measured avg latency in ms", required: true, type: "number" },
              uptimePercent: { description: "Measured uptime percentage", required: true, type: "number" }
            },
            type: "http"
          },
          output: {
            properties: {
              met: { description: "Whether SLA was met", type: "boolean" },
              recommendation: { description: "releaseFunds or penalize", type: "string" }
            },
            required: ["met", "recommendation"],
            type: "object"
          }
        },
        payTo: PAY_TO,
        maxTimeoutSeconds: 300,
        asset: USDT_ADDRESS,
        extra: null,
        merchantName: "AgentSLA Evaluator"
      }],
      x402Version: 1
    });
  }

  // Verificar pago con Pieverse
  const payment = JSON.parse(Buffer.from(paymentHeader as string, 'base64').toString());
  const verifyRes = await fetch(`${PIEVERSE_URL}/v2/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payment, network: 'kite-testnet' })
  });

  if (!verifyRes.ok) {
    return res.status(402).json({ error: "Payment verification failed" });
  }

  // Liquidar pago
  await fetch(`${PIEVERSE_URL}/v2/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payment, network: 'kite-testnet' })
  });

  // Evaluar SLA
  const { slaId, avgLatencyMs, uptimePercent, maxLatencyMs, minUptimePercent } = req.query;
  const met = Number(avgLatencyMs) <= Number(maxLatencyMs) &&
              Number(uptimePercent) >= Number(minUptimePercent);

  return res.json({
    slaId,
    met,
    avgLatencyMs: Number(avgLatencyMs),
    uptimePercent: Number(uptimePercent),
    recommendation: met ? "releaseFunds" : "penalize",
    timestamp: Date.now()
  });
});

app.listen(process.env.PORT || 3001, () => {
  console.log('AgentSLA evaluator running');
});