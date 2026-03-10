ALTER TABLE public.culto_sync_state ADD COLUMN message text NOT NULL DEFAULT '';
ALTER TABLE public.culto_sync_state ADD COLUMN show_message boolean NOT NULL DEFAULT false;