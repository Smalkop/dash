const GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";

interface GraphQLResponse {
  data?: {
    viewer?: {
      accounts?: Array<{
        workersInvocationsAdaptiveGroups?: Array<{
          count: number;
          sum: { cpuTime: number; wallTime?: number };
          dimensions: { scriptName: string; date: string };
        }>;
        httpRequests1mGroups?: Array<{
          count: number;
          sum: { bytes: number };
          dimensions: { date: string; clientRequestPath: string };
        }>;
      }>;
    };
  };
  errors?: Array<{ message: string }>;
}

export interface WorkerMetrics {
  scriptName: string;
  requests: number;
  cpuTimeMs: number;
  wallTimeMs: number;
  date: string;
}

export async function fetchGraphQL<T>(
  apiToken: string,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = (await response.json()) as GraphQLResponse;

  if (data.errors) {
    throw new Error(`GraphQL error: ${data.errors.map((e) => e.message).join(", ")}`);
  }

  return data as unknown as T;
}

export async function syncMetricsFromGraphQL(
  apiToken: string,
  accountTag: string,
  scriptName: string,
  startDate: string,
  endDate: string
): Promise<{ requests: number; cpuTimeMs: number; wallTimeMs: number }> {
  const query = `
    query WorkerUsage($accountTag: String!, $scriptName: String!, $start: Time!, $end: Time!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          workersInvocationsAdaptiveGroups(
            limit: 10000
            filter: {
              datetimeHour_geq: $start,
              datetimeHour_leq: $end,
              scriptName: $scriptName
            }
            orderBy: [datetimeHour_DESC]
          ) {
            count
            sum {
              cpuTime
              wallTime
            }
            dimensions {
              scriptName
              date: datetimeHour
            }
          }
        }
      }
    }
  `;

  const startISO = `${startDate}T00:00:00Z`;
  const endISO = `${endDate}T23:59:59Z`;

  const result = await fetchGraphQL<GraphQLResponse>(apiToken, query, {
    accountTag,
    scriptName,
    start: startISO,
    end: endISO,
  });

  const groups = result?.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptiveGroups || [];

  let totalRequests = 0;
  let totalCpuTime = 0;
  let totalWallTime = 0;

  for (const group of groups) {
    totalRequests += group.count;
    totalCpuTime += group.sum.cpuTime;
    totalWallTime += group.sum.wallTime || 0;
  }

  return {
    requests: totalRequests,
    cpuTimeMs: Math.round(totalCpuTime),  // cpuTime viene en ms
    wallTimeMs: Math.round(totalWallTime),
  };
}

export async function evaluateAlerts(
  db: { q: <T>(sql: string, ...params: unknown[]) => Promise<T[]> },
  date: string
): Promise<void> {
  const alertRules = await db.q<{
    id: number;
    client_id: number | null;
    resource_id: number | null;
    metric_type: string;
    threshold_value: number;
    comparison: string;
    notification_email: string | null;
  }>("SELECT * FROM alert_rules WHERE is_active = 1");

  for (const rule of alertRules) {
    try {
      let currentValue = 0;

      if (rule.resource_id) {
        const result = await db.q<{ value: number }>(
          `SELECT COALESCE(SUM(
            CASE WHEN ? = 'requests' THEN requests_count
                 WHEN ? = 'cpu_time' THEN cpu_time_ms
                 WHEN ? = 'cost' THEN estimated_cost_cents
            END), 0) as value
           FROM usage_snapshots
           WHERE resource_id = ? AND snapshot_date = ?`,
          rule.metric_type, rule.metric_type, rule.metric_type,
          rule.resource_id, date
        );
        currentValue = result[0]?.value ?? 0;
      } else if (rule.client_id) {
        const result = await db.q<{ value: number }>(
          `SELECT COALESCE(SUM(
            CASE WHEN ? = 'requests' THEN us.requests_count
                 WHEN ? = 'cpu_time' THEN us.cpu_time_ms
                 WHEN ? = 'cost' THEN us.estimated_cost_cents
            END), 0) as value
           FROM usage_snapshots us
           JOIN resources r ON us.resource_id = r.id
           WHERE r.client_id = ? AND us.snapshot_date = ?`,
          rule.metric_type, rule.metric_type, rule.metric_type,
          rule.client_id, date
        );
        currentValue = result[0]?.value ?? 0;
      }

      const triggered = rule.comparison === "gt"
        ? currentValue > rule.threshold_value
        : currentValue < rule.threshold_value;

      if (triggered) {
        const message = `Alerta: ${rule.metric_type} ha ${rule.comparison === "gt" ? "superado" : "caído debajo de"} el umbral de ${rule.threshold_value}. Valor actual: ${currentValue}`;
        await db.q(
          `INSERT INTO notifications (client_id, alert_rule_id, message) VALUES (?, ?, ?)`,
          rule.client_id, rule.id, message
        );
      }
    } catch (err) {
      console.error(`Error evaluando alerta ${rule.id}:`, err);
    }
  }
}
