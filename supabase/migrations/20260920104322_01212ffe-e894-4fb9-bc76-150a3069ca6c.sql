
CREATE TABLE public.staff_accounts (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  full_access boolean NOT NULL DEFAULT false,
  permissions text[] NOT NULL DEFAULT '{}',
  note text,
  created_by uuid,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  actor_name text,
  actor_email text,
  action text NOT NULL,
  area text,
  detail text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_activity_log_user_time ON public.admin_activity_log (user_id, created_at DESC);
CREATE INDEX admin_activity_log_time ON public.admin_activity_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
      OR EXISTS (SELECT 1 FROM public.staff_accounts WHERE user_id = _user_id AND is_active);
$$;

-- Widen every existing admin-only policy to "admin or active staff".
DO $do$
DECLARE r record; q text; wc text; sql text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename NOT IN ('staff_accounts','admin_activity_log','user_roles')
       AND (qual ILIKE '%has_role(auth.uid(), ''admin''::app_role)%'
         OR with_check ILIKE '%has_role(auth.uid(), ''admin''::app_role)%')
  LOOP
    q := replace(COALESCE(r.qual,''), 'has_role(auth.uid(), ''admin''::app_role)', 'public.is_admin_user(auth.uid())');
    wc := replace(COALESCE(r.with_check,''), 'has_role(auth.uid(), ''admin''::app_role)', 'public.is_admin_user(auth.uid())');
    sql := format('ALTER POLICY %I ON public.%I', r.policyname, r.tablename);
    IF r.qual IS NOT NULL THEN sql := sql || format(' USING (%s)', q); END IF;
    IF r.with_check IS NOT NULL THEN sql := sql || format(' WITH CHECK (%s)', wc); END IF;
    EXECUTE sql;
  END LOOP;
END
$do$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_accounts TO authenticated;
GRANT ALL ON public.staff_accounts TO service_role;
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage staff accounts" ON public.staff_accounts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff read own account" ON public.staff_accounts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT ON public.admin_activity_log TO authenticated;
GRANT ALL ON public.admin_activity_log TO service_role;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all activity" ON public.admin_activity_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());
CREATE POLICY "Signed in insert own activity" ON public.admin_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_staff_accounts_updated
  BEFORE UPDATE ON public.staff_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
