import type { Client, PricingTier } from "@dash/db";

const FREE_DAILY_REQUESTS_LIMIT = 100_000;
const FREE_CPU_MS_PER_INVOCATION = 10;
const FREE_TIER_REQUEST_PRICE = 0.30;
const FREE_TIER_CPU_PRICE = 0.02;

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
  freeTierRequestsUsed: number;
  freeTierCpuMsUsed: number;
  freeTierRequestsRemaining: number;
  freeTierCpuMsRemaining: number;
  freeTierExceeded: boolean;
  freeTierUsagePercent: number;
  imputedCostCents: number;
  imputedRequestsCostCents: number;
  imputedCpuCostCents: number;
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

  const freeTierCpuMsBudget = Math.min(requests, FREE_DAILY_REQUESTS_LIMIT) * FREE_CPU_MS_PER_INVOCATION;
  const freeTierRequestsUsed = Math.min(requests, FREE_DAILY_REQUESTS_LIMIT);
  const freeTierCpuMsUsed = Math.min(cpuTimeMs, freeTierCpuMsBudget);
  const freeTierRequestsRemaining = Math.max(0, FREE_DAILY_REQUESTS_LIMIT - requests);
  const freeTierCpuMsRemaining = Math.max(0, freeTierCpuMsBudget - cpuTimeMs);
  const freeTierExceeded = requests > FREE_DAILY_REQUESTS_LIMIT || cpuTimeMs > freeTierCpuMsBudget;

  const maxFreeRequests = Math.max(FREE_DAILY_REQUESTS_LIMIT, 1);
  const freeTierUsagePercent = Math.min(100, Math.round(
    Math.max(
      (requests / maxFreeRequests) * 100,
      cpuTimeMs > 0 ? (cpuTimeMs / freeTierCpuMsBudget) * 100 : 0
    )
  ));

  const imputedRequestsCost = (requests / 1_000_000) * FREE_TIER_REQUEST_PRICE;
  const imputedCpuCost = (cpuTimeMs / 1_000_000) * FREE_TIER_CPU_PRICE;
  const imputedRequestsCostCents = Math.round(imputedRequestsCost * 100 * markupMultiplier);
  const imputedCpuCostCents = Math.round(imputedCpuCost * 100 * markupMultiplier);
  const imputedCostCents = imputedRequestsCostCents + imputedCpuCostCents;

  return {
    includedRequests,
    includedCpuMs,
    overageRequests,
    overageCpuMs,
    requestsCostCents,
    cpuCostCents,
    totalCents,
    freeTierRequestsUsed,
    freeTierCpuMsUsed,
    freeTierRequestsRemaining,
    freeTierCpuMsRemaining,
    freeTierExceeded,
    freeTierUsagePercent,
    imputedCostCents,
    imputedRequestsCostCents,
    imputedCpuCostCents,
  };
}

export { FREE_DAILY_REQUESTS_LIMIT, FREE_CPU_MS_PER_INVOCATION };
