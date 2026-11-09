-- Keep existing job schedules and activation states. The scheduler reads the
-- protected credential at run time so rotating it does not rewrite a job.
DO $migration$
DECLARE
  hook record;
  existing_job_id bigint;
  job_command text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE username = current_user
      AND jobname IN ('cleanup-old-order-logs-daily', 'steadfast-payment-sync')
      AND active
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.integration_credentials
    WHERE key = 'CRON_HOOK_SECRET' AND btrim(value) <> ''
  ) THEN
    RAISE EXCEPTION 'Configure CRON_HOOK_SECRET in integration_credentials before updating active cron jobs';
  END IF;

  FOR hook IN
    SELECT *
    FROM (VALUES
      ('cleanup-old-order-logs-daily', '30 3 * * *', '/api/public/hooks/cleanup-old-logs'),
      ('steadfast-payment-sync', '0 22 * * *', '/api/public/hooks/steadfast-payments')
    ) AS jobs(name, schedule, path)
  LOOP
    job_command := format($command$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', btrim(value)
        ),
        body := '{}'::jsonb
      )
      FROM public.integration_credentials
      WHERE key = 'CRON_HOOK_SECRET' AND btrim(value) <> '';
    $command$, 'https://panjabishopbd.com' || hook.path);

    SELECT jobid INTO existing_job_id
    FROM cron.job
    WHERE username = current_user AND jobname = hook.name;

    IF existing_job_id IS NULL THEN
      PERFORM cron.schedule(hook.name, hook.schedule, job_command);
    ELSE
      PERFORM cron.alter_job(existing_job_id, command := job_command);
    END IF;
  END LOOP;
END;
$migration$;
