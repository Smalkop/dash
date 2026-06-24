-- 002_free_tier_imputed_cost.sql
-- Agrega columna de costo imputado para seguimiento del tier gratuito

ALTER TABLE usage_snapshots ADD COLUMN imputed_cost_cents INTEGER DEFAULT 0;
ALTER TABLE usage_snapshots ADD COLUMN free_tier_usage_percent INTEGER DEFAULT 0;
ALTER TABLE usage_snapshots ADD COLUMN free_tier_exceeded BOOLEAN DEFAULT 0;
