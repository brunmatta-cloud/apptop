-- Create table to store culto state for real-time sync across devices
CREATE TABLE public.culto_sync_state (
  id TEXT PRIMARY KEY DEFAULT 'main',
  cultos JSONB NOT NULL DEFAULT '[]',
  all_momentos JSONB NOT NULL DEFAULT '{}',
  active_culto_id TEXT,
  current_index INTEGER NOT NULL DEFAULT -1,
  execution_mode TEXT NOT NULL DEFAULT 'manual',
  is_paused BOOLEAN NOT NULL DEFAULT false,
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  moment_elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.culto_sync_state ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read and write (no auth required for this app)
CREATE POLICY "Anyone can read culto state" 
  ON public.culto_sync_state 
  FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can insert culto state" 
  ON public.culto_sync_state 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can update culto state" 
  ON public.culto_sync_state 
  FOR UPDATE 
  USING (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.culto_sync_state;

-- Insert default row
INSERT INTO public.culto_sync_state (id) VALUES ('main');