// =============================================================================
// 7Flow Display & Player State Service
// Manages display outputs, display state, and player state.
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type {
  DisplayOutput, DisplayState, PlayerState,
  DisplayType, DisplayMode, PlayerType, PlayerStatus,
} from './types';
import { logger } from '@/lib/logger';

const log = logger.scoped('Display');


// -------------------------------------------------------
// DISPLAY OUTPUTS
// -------------------------------------------------------

export async function listDisplayOutputs(session_id: string): Promise<DisplayOutput[]> {
  const { data, error } = await supabase
    .from('display_outputs')
    .select('*')
    .eq('session_id', session_id)
    .order('name');

  if (error) {
    log.error(`listDisplayOutputs error`, error);
    return [];
  }
  return (data ?? []) as DisplayOutput[];
}

export async function createDisplayOutput(
  session_id: string,
  name: string,
  display_type: DisplayType
): Promise<DisplayOutput | null> {
  const { data, error } = await supabase
    .from('display_outputs')
    .insert({ session_id, name, display_type, is_active: true })
    .select()
    .single();

  if (error) {
    log.error(`createDisplayOutput error`, error);
    return null;
  }

  // Create initial display state
  await supabase.from('display_state').insert({
    display_output_id: data.id,
    mode: 'idle' as DisplayMode,
  });

  return data as DisplayOutput;
}

export async function ensureDefaultDisplays(session_id: string): Promise<DisplayOutput[]> {
  const existing = await listDisplayOutputs(session_id);
  if (existing.length > 0) return existing;

  const defaults: { name: string; type: DisplayType }[] = [
    { name: 'Telão Principal', type: 'main' },
    { name: 'Monitor de Palco', type: 'stage' },
    { name: 'Display de Áudio', type: 'audio' },
    { name: 'Display do Moderador', type: 'moderator' },
  ];

  const outputs: DisplayOutput[] = [];
  for (const d of defaults) {
    const output = await createDisplayOutput(session_id, d.name, d.type);
    if (output) outputs.push(output);
  }

  return outputs;
}

// -------------------------------------------------------
// DISPLAY STATE
// -------------------------------------------------------

export async function getDisplayState(display_output_id: string): Promise<DisplayState | null> {
  const { data, error } = await supabase
    .from('display_state')
    .select('*')
    .eq('display_output_id', display_output_id)
    .single();

  if (error) return null;
  return data as DisplayState;
}

export async function updateDisplayState(
  display_output_id: string,
  updates: Partial<DisplayState>
): Promise<DisplayState | null> {
  const { data, error } = await supabase
    .from('display_state')
    .update({
      ...updates,
      current_cue: (updates.current_cue ?? {}) as unknown as Json,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('display_output_id', display_output_id)
    .select()
    .single();

  if (error) {
    log.error(`updateDisplayState error`, error);
    return null;
  }
  return data as DisplayState;
}

export async function setDisplayMode(
  display_output_id: string,
  mode: DisplayMode,
  extra?: { media_id?: string; song_id?: string; message?: string; slide_index?: number; moment_id?: string }
): Promise<DisplayState | null> {
  return updateDisplayState(display_output_id, {
    mode,
    current_media_id: extra?.media_id ?? null,
    current_song_id: extra?.song_id ?? null,
    current_slide_index: extra?.slide_index ?? 0,
    current_moment_id: extra?.moment_id ?? null,
    custom_message: extra?.message ?? null,
    updated_by: 'web',
  });
}

// -------------------------------------------------------
// PLAYER STATE
// -------------------------------------------------------

export async function getPlayerState(
  session_id: string,
  player_type: PlayerType
): Promise<PlayerState | null> {
  const { data, error } = await supabase
    .from('player_state')
    .select('*')
    .eq('session_id', session_id)
    .eq('player_type', player_type)
    .single();

  if (error) return null;
  return data as unknown as PlayerState;
}

export async function getAllPlayerStates(session_id: string): Promise<PlayerState[]> {
  const { data, error } = await supabase
    .from('player_state')
    .select('*')
    .eq('session_id', session_id);

  if (error) return [];
  return (data ?? []) as unknown as PlayerState[];
}

export async function upsertPlayerState(
  session_id: string,
  player_type: PlayerType,
  updates: Partial<PlayerState>
): Promise<PlayerState | null> {
  const { data, error } = await supabase
    .from('player_state')
    .upsert({
      session_id,
      player_type,
      status: updates.status ?? ('idle' as PlayerStatus),
      current_media_id: updates.current_media_id ?? null,
      current_song_id: updates.current_song_id ?? null,
      current_time_seconds: updates.current_time_seconds ?? 0,
      duration_seconds: updates.duration_seconds ?? 0,
      volume: updates.volume ?? 1.0,
      is_muted: updates.is_muted ?? false,
      queue_json: (updates.queue_json ?? []) as unknown as Json,
      updated_at: new Date().toISOString(),
      updated_by: updates.updated_by ?? 'system',
    }, {
      onConflict: 'session_id,player_type',
    })
    .select()
    .single();

  if (error) {
    log.error(`upsertPlayerState error`, error);
    return null;
  }
  return data as unknown as PlayerState;
}

// -------------------------------------------------------
// REALTIME SUBSCRIPTIONS
// -------------------------------------------------------

export function subscribeToPlayerState(
  session_id: string,
  callback: (state: PlayerState) => void
) {
  const channel = supabase
    .channel(`player_state_${session_id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'player_state',
        filter: `session_id=eq.${session_id}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as PlayerState);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToDisplayState(
  display_output_id: string,
  callback: (state: DisplayState) => void
) {
  const channel = supabase
    .channel(`display_state_${display_output_id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'display_state',
        filter: `display_output_id=eq.${display_output_id}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as DisplayState);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToPlayerCommands(
  session_id: string,
  callback: (command: Record<string, unknown>) => void
) {
  const channel = supabase
    .channel(`player_commands_${session_id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'player_commands',
        filter: `session_id=eq.${session_id}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as Record<string, unknown>);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
