import type { Client, PricingTier } from "@dash/db";

export async function calculateCosts(
  db: { qOne: <T>(sql: string, ...params: unknown[]) => Promise<T | null> },
  clientId: number,
  requests: number,
  cpuTimeMs: number
): Promise<{
  includedRequests: number;
  includedCpuMs: number;
  overageRequests: number;
  overageCpuMs: number;
  requestsCostCents: number;
  cpuCostCents: number;
  totalCents: number;
}> {
  const client = await db.qOne<Client>("SELECT * FROM clients WHERE id = ?", clientId);
  if (!client) throw new Error(`Client ${clientId} not found`);

  const tier = await db.qOne<PricingTier>(
    "SELECT * FROM pricing_tiers WHERE is_default = 1 LIMIT 1"
  );

  const includedRequests = tier?.included_requests ?? 10000000;
  const includedCpuMs = tier?.included_cpu_ms ?? 30000000;
  const pricePerMillionRequests = tier?.price_per_million_requests ?? 0.30;
  const pricePerMillionCpuMs = tier?.price_per_million_cpu_ms ?? 0.02;
  const overageMarkup = tier?.overage_markup_percent ?? 0;

  const overageRequests = Math.max(0, requests - includedRequests);
  const overageCpuMs = Math.max(0, cpuTimeMs - includedCpuMs);

  const requestsCost = (overageRequests / 1_000_000) * pricePerMillionRequests;
  const cpuCost = (overageCpuMs / 1_000_000) * pricePerMillionCpuMs;

  const markupMultiplier = 1 + (client.markup_percentage / 100);

  const requestsCostCents = Math.round(requestsCost * 100 * markupMultiplier);
  const cpuCostCents = Math.round(cpuCost * 100 * markupMultiplier);
  const totalCents = requestsCostCents + cpuCostCents;

  return {
    includedRequests,
    includedCpuMs,
    overageRequests,
    overageCpuMs,
    requestsCostCents,
    cpuCostCents,
    totalCents,
  };
}
