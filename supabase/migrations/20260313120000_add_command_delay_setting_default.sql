CREATE OR REPLACE FUNCTION public.session_settings_defaults()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'isBlinking', false,
    'commandDelaySeconds', 0,
    'orangeThreshold', 120,
    'redThreshold', 20,
    'topFontSize', 4,
    'bottomFontSize', 2.75,
    'timerFontSize', 28,
    'messageFontSize', 16,
    'backgroundColor', '#000000',
    'timerTextColor', '#ffffff',
    'topTextColor', '#b8c0d4',
    'bottomTextColor', '#99a2b3',
    'messageTextColor', '#ffffff',
    'warningColor', '#f59e0b',
    'dangerColor', '#ef4444',
    'message', '',
    'showMessage', false
  );
$$;

UPDATE public.session_state
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('commandDelaySeconds', 0)
WHERE NOT COALESCE(settings, '{}'::jsonb) ? 'commandDelaySeconds';
