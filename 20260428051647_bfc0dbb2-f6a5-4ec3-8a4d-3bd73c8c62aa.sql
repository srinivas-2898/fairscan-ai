-- Resume template versions: admins publish; system tracks which user used which version
CREATE TABLE public.resume_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  name text NOT NULL,
  notes text,
  category text,
  schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resume_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated views published templates"
  ON public.resume_template_versions FOR SELECT TO authenticated
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert templates"
  ON public.resume_template_versions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update templates"
  ON public.resume_template_versions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete templates"
  ON public.resume_template_versions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_resume_template_versions_updated_at
  BEFORE UPDATE ON public.resume_template_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Usage tracking: which user generated resumes from which template version
CREATE TABLE public.resume_template_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_version_id uuid NOT NULL REFERENCES public.resume_template_versions(id) ON DELETE CASCADE,
  template_version text NOT NULL,
  user_id uuid NOT NULL,
  user_email text,
  category text,
  resume_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_template_usage_user ON public.resume_template_usage(user_id);
CREATE INDEX idx_template_usage_version ON public.resume_template_usage(template_version_id);
CREATE INDEX idx_template_usage_created ON public.resume_template_usage(created_at DESC);

ALTER TABLE public.resume_template_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own usage, admins view all"
  ON public.resume_template_usage FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own usage"
  ON public.resume_template_usage FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins delete usage"
  ON public.resume_template_usage FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed an initial v1.0.0 template if none exists
INSERT INTO public.resume_template_versions (version, name, notes, is_published, is_default, published_at, schema)
VALUES ('v1.0.0', 'FairScan Standard Resume', 'Initial template — header, summary, skills, experience, education.', true, true, now(),
  '{"sections":["header","summary","skills","experience","certifications","education"],"font":"Helvetica","accent":"#00F5FF"}'::jsonb);

-- Realtime for live admin widgets
ALTER PUBLICATION supabase_realtime ADD TABLE public.scan_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resume_template_usage;