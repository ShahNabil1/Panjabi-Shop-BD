CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS text LANGUAGE plpgsql AS $fn$
BEGIN
  RETURN 'PS-' || lpad(nextval('public.order_number_seq')::text, 2, '0');
END;
$fn$;

SELECT cron.unschedule('steadfast-payment-sync');
SELECT cron.schedule(
  'steadfast-payment-sync',
  '0 22 * * *',
  $$SELECT net.http_post(url := 'https://panjabishopbd.com/api/public/hooks/steadfast-payments', headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','uk_cron_9f3Ba7Qz2Ldx6Vt0Pm4Ye8Rn1Cs5Jw7H'), body := '{}'::jsonb)$$
);