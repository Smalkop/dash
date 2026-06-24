export interface Client {
  id: number;
  name: string;
  email: string;
  billing_email: string | null;
  plan_type: "fixed" | "usage_based" | "hybrid";
  fixed_monthly_fee: number;
  markup_percentage: number;
  is_active: number;
  password_hash: string | null;
  created_at: string;
  updated_at: string;
}

export type PlanType = Client["plan_type"];

export interface Resource {
  id: number;
  client_id: number;
  resource_type: ResourceType;
  cloudflare_name: string;
  cloudflare_id: string | null;
  display_name: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export type ResourceType =
  | "worker_script"
  | "d1_database"
  | "kv_namespace"
  | "r2_bucket"
  | "durable_object"
  | "workflow";

export interface UsageSnapshot {
  id: number;
  resource_id: number;
  snapshot_date: string;
  requests_count: number;
  cpu_time_ms: number;
  wall_time_ms: number;
  estimated_cost_cents: number;
  imputed_cost_cents: number;
  free_tier_usage_percent: number;
  free_tier_exceeded: number;
  created_at: string;
}

export interface PricingTier {
  id: number;
  plan_name: string;
  included_requests: number;
  included_cpu_ms: number;
  price_per_million_requests: number;
  price_per_million_cpu_ms: number;
  overage_markup_percent: number;
  is_default: number;
}

export interface Invoice {
  id: number;
  client_id: number;
  period_start: string;
  period_end: string;
  fixed_fee_cents: number;
  usage_fee_cents: number;
  total_cents: number;
  status: "draft" | "sent" | "paid" | "overdue";
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  resource_id: number | null;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

export interface AlertRule {
  id: number;
  client_id: number | null;
  resource_id: number | null;
  metric_type: "requests" | "cpu_time" | "cost";
  threshold_value: number;
  comparison: "gt" | "lt";
  notification_email: string | null;
  is_active: number;
  created_at: string;
}

export interface Notification {
  id: number;
  client_id: number | null;
  alert_rule_id: number | null;
  message: string;
  is_read: number;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: "admin" | "client";
  client_id: number | null;
  created_at: string;
}
