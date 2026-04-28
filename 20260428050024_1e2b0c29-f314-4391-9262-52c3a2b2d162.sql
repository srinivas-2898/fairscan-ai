
-- =========================================================
-- scan_categories
-- =========================================================
CREATE TABLE public.scan_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text DEFAULT '📊',
  color text DEFAULT '#00F5FF',
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated views active categories"
  ON public.scan_categories FOR SELECT
  TO authenticated
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert categories"
  ON public.scan_categories FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update categories"
  ON public.scan_categories FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete categories"
  ON public.scan_categories FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_scan_categories_updated
  BEFORE UPDATE ON public.scan_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- activity_logs
-- =========================================================
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  entity text,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'info',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX activity_logs_created_at_idx ON public.activity_logs(created_at DESC);
CREATE INDEX activity_logs_user_id_idx ON public.activity_logs(user_id);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own logs, admins view all"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins delete logs"
  ON public.activity_logs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Promote first user to admin on signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count int;
  assigned_role public.app_role := 'user';
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );

  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count <= 1 THEN
    assigned_role := 'admin';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- Seed default categories
-- =========================================================
INSERT INTO public.scan_categories (name, description, icon, color) VALUES
  ('Hiring & Recruitment', 'Bias audits for AI hiring & resume screening systems.', '👥', '#00F5FF'),
  ('Lending & Credit', 'Detect bias in credit-scoring and loan-approval models.', '💳', '#7B2FFF'),
  ('Insurance Underwriting', 'Premium fairness for risk-pricing models.', '🛡️', '#00FF88'),
  ('Healthcare Triage', 'Patient-prioritization fairness across demographics.', '🩺', '#FF3B6B'),
  ('Education Admissions', 'Equitable admissions and grading AI.', '🎓', '#FFB020'),
  ('Criminal Justice', 'Risk-assessment and recidivism model audits.', '⚖️', '#7B2FFF'),
  ('Content Moderation', 'Bias in toxicity / removal classifiers.', '🛰️', '#00F5FF'),
  ('Customer Eligibility', 'Eligibility & rewards-program scoring fairness.', '🏷️', '#00FF88')
ON CONFLICT (name) DO NOTHING;
