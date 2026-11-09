-- Scheduled HTTP hooks are installed by the credential-backed scheduler migration.

DROP FUNCTION IF EXISTS public.__apply_sql(text);
