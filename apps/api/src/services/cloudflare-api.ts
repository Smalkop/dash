const API_BASE = "https://api.cloudflare.com/client/v4";

interface CfApiResponse<T> {
  success: boolean;
  result: T;
  errors?: Array<{ code: number; message: string }>;
  result_info?: { page: number; per_page: number; total_count: number };
}

export interface CfWorkerScript {
  id: string;
  created_on: string;
  modified_on: string;
  usage_model: "standard" | "bundled" | "unbound";
  handlers: string[];
  routes?: Array<{ pattern: string }>;
  tags: string[];
}

export interface CfAccountStatus {
  account: { id: string; name: string };
  plan: { id: string; name: string };
}

async function cfFetch<T>(
  apiToken: string,
  path: string
): Promise<CfApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
  });
  return res.json() as Promise<CfApiResponse<T>>;
}

export async function listWorkerScripts(
  apiToken: string,
  accountTag: string
): Promise<CfWorkerScript[]> {
  const all: CfWorkerScript[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await cfFetch<CfWorkerScript[]>(
      apiToken,
      `/accounts/${accountTag}/workers/scripts?per_page=100&page=${page}`
    );
    if (res.success) {
      all.push(...res.result);
      const total = res.result_info?.total_count ?? 0;
      const perPage = res.result_info?.per_page ?? 100;
      hasMore = page * perPage < total;
      page++;
    } else {
      throw new Error(
        `Cloudflare API error: ${res.errors?.map((e) => e.message).join(", ")}`
      );
    }
  }

  return all;
}

export async function getAccountInfo(
  apiToken: string
): Promise<{ id: string; name: string; plan: string } | null> {
  try {
    const res = await cfFetch<Array<{ id: string; name: string }>>(
      apiToken,
      "/accounts"
    );
    if (!res.success || res.result.length === 0) return null;

    const account = res.result[0]!;
    return { id: account.id, name: account.name, plan: "standard" };
  } catch {
    return null;
  }
}

export function resourceTypeFromHandlers(
  handlers: string[]
): "worker_script" | "durable_object" {
  const hasDurableObject =
    handlers.includes("class") ||
    handlers.some((h) => h.toLowerCase().includes("durableobject"));
  return hasDurableObject ? "durable_object" : "worker_script";
}

export function estimateFreeTierUsage(
  totalRequests: number,
  totalCpuMs: number
): {
  freeTierUsedPercent: number;
  freeRequestsRemaining: number;
  freeCpuMsRemaining: number;
  freeTierExceeded: boolean;
  exceededRequests: number;
  exceededCpuMs: number;
  imputedCostCents: number;
} {
  const FREE_DAILY_REQUESTS = 100_000;
  const FREE_CPU_MS_PER_REQUEST = 10;
  const FREE_TOTAL_CPU_MS = FREE_DAILY_REQUESTS * FREE_CPU_MS_PER_REQUEST;

  const exceededRequests = Math.max(0, totalRequests - FREE_DAILY_REQUESTS);
  const freeRequestsRemaining = Math.max(0, FREE_DAILY_REQUESTS - totalRequests);

  const freeCpuBudget = Math.min(totalRequests, FREE_DAILY_REQUESTS) * FREE_CPU_MS_PER_REQUEST;
  const exceededCpuMs = Math.max(0, totalCpuMs - freeCpuBudget);
  const freeCpuMsRemaining = Math.max(0, freeCpuBudget - totalCpuMs);

  const freeTierExceeded = exceededRequests > 0 || exceededCpuMs > 0;

  const freeTierUsedPercent = Math.min(
    100,
    Math.round(
      (Math.max(
        (totalRequests / FREE_DAILY_REQUESTS) * 100,
        totalCpuMs > 0 ? (totalCpuMs / FREE_TOTAL_CPU_MS) * 100 : 0
      ) * 100) / 100
    )
  );

  const PRICE_PER_MILLION_REQUESTS = 0.30;
  const PRICE_PER_MILLION_CPU_MS = 0.02;

  const imputedRequestsCost = (totalRequests / 1_000_000) * PRICE_PER_MILLION_REQUESTS;
  const imputedCpuCost = (totalCpuMs / 1_000_000) * PRICE_PER_MILLION_CPU_MS;
  const imputedCostCents = Math.round((imputedRequestsCost + imputedCpuCost) * 100);

  return {
    freeTierUsedPercent,
    freeRequestsRemaining,
    freeCpuMsRemaining,
    freeTierExceeded,
    exceededRequests,
    exceededCpuMs,
    imputedCostCents,
  };
}
