CREATE OR REPLACE FUNCTION public.get_server_now()
RETURNS timestamptz
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT now();
$$;
