ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS staff_group text NOT NULL DEFAULT 'ALL',
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS commission_rules jsonb NOT NULL DEFAULT '{"mode":"TARGET_PERCENT","tiers":[{"min_credited_qty":30,"achievement_percent":80,"payout":100},{"min_credited_qty":40,"achievement_percent":100,"payout":200}],"step":{"start_qty":40,"step_qty":10,"start_percent":100,"step_percent":25,"payout":100}}'::jsonb;

ALTER TABLE public.promotion_items
  ADD COLUMN IF NOT EXISTS item_scope text NOT NULL DEFAULT 'OUR',
  ADD COLUMN IF NOT EXISTS target_qty numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_factor numeric NOT NULL DEFAULT 1;

ALTER TABLE public.pg_daily_activity_reports
  ADD COLUMN IF NOT EXISTS promotion_id text,
  ADD COLUMN IF NOT EXISTS promotion_commission_rules jsonb;

ALTER TABLE public.pg_daily_report_products
  ADD COLUMN IF NOT EXISTS item_scope text NOT NULL DEFAULT 'OUR',
  ADD COLUMN IF NOT EXISTS credit_factor numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS promotion_target_qty numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS competitor_price numeric;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'promotions_staff_group_check'
      AND conrelid = 'public.promotions'::regclass
  ) THEN
    ALTER TABLE public.promotions
      ADD CONSTRAINT promotions_staff_group_check
      CHECK (staff_group IN ('ALL', 'BA', 'PG'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'promotion_items_item_scope_check'
      AND conrelid = 'public.promotion_items'::regclass
  ) THEN
    ALTER TABLE public.promotion_items
      ADD CONSTRAINT promotion_items_item_scope_check
      CHECK (item_scope IN ('OUR', 'COMPETITOR'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'promotion_items_credit_factor_check'
      AND conrelid = 'public.promotion_items'::regclass
  ) THEN
    ALTER TABLE public.promotion_items
      ADD CONSTRAINT promotion_items_credit_factor_check
      CHECK (credit_factor >= 0);
  END IF;
END $$;