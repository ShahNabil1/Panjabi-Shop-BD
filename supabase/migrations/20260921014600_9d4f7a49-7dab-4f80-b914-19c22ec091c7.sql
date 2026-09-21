ALTER TABLE public.admin_activity_log ADD COLUMN IF NOT EXISTS ip text;
ALTER TABLE public.admin_activity_log ADD COLUMN IF NOT EXISTS user_agent text;
CREATE INDEX IF NOT EXISTS admin_activity_log_user_created_idx ON public.admin_activity_log (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_session_revocations (
  user_id uuid PRIMARY KEY,
  revoked_at timestamptz NOT NULL DEFAULT now(),
  revoked_by uuid,
  revoked_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_session_revocations TO authenticated;
GRANT ALL ON public.admin_session_revocations TO service_role;
ALTER TABLE public.admin_session_revocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own or admin read revocations" ON public.admin_session_revocations;
CREATE POLICY "own or admin read revocations" ON public.admin_session_revocations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admins manage revocations" ON public.admin_session_revocations;
CREATE POLICY "admins manage revocations" ON public.admin_session_revocations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));