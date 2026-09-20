CREATE OR REPLACE FUNCTION public.__apply_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  EXECUTE sql;
END;
$fn$;
REVOKE ALL ON FUNCTION public.__apply_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.__apply_sql(text) FROM anon;
REVOKE ALL ON FUNCTION public.__apply_sql(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.__apply_sql(text) TO service_role;