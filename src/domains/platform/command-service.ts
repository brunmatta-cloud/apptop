// =============================================================================
// 7Flow Command Service
// Central service for sending versioned commands to the platform.
// All critical mutations go through this service.
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type {
  PlatformCommandType,
  CommandTarget,
  PlayerCommand,
  CommandStatus,
} from './types';

// -------------------------------------------------------
// Logger for operational diagnostics
// -------------------------------------------------------

const LOG_PREFIX = '[7Flow:Command]';

function logCommand(action: string, data?: Record<string, unknown>) {
  console.log(`${LOG_PREFIX} ${action}`, data ?? '');
}

function logError(action: string, error: unknown) {
  console.error(`${LOG_PREFIX} ERROR ${action}`, error);
}

// -------------------------------------------------------
// Send a player/display/moderator command
// -------------------------------------------------------

export interface SendCommandParams {
  session_id: string;
  target: CommandTarget;
  command_type: PlatformCommandType;
  payload?: Record<string, unknown>;
  expected_revision?: number;
  created_by?: string;
  idempotency_key?: string;
}

export interface SendCommandResult {
  ok: boolean;
  command_id?: string;
  error?: string;
  status?: CommandStatus;
}

export async function sendPlatformCommand(params: SendCommandParams): Promise<SendCommandResult> {
  const {
    session_id,
    target,
    command_type,
    payload = {},
    expected_revision,
    created_by = 'system',
    idempotency_key,
  } = params;

  logCommand('Sending', { command_type, target, expected_revision, idempotency_key });

  try {
    const { data, error } = await supabase
      .from('player_commands')
      .insert({
        session_id,
        target,
        command_type,
        payload_json: payload as unknown as Json,
        expected_revision: expected_revision ?? null,
        created_by,
        idempotency_key: idempotency_key ?? null,
        status: 'pending' as CommandStatus,
      })
      .select('id')
      .single();

    if (error) {
      logError('Insert failed', error);
      return { ok: false, error: error.message };
    }

    logCommand('Sent OK', { command_id: data.id, command_type });
    return { ok: true, command_id: data.id };
  } catch (err) {
    logError('Unexpected', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// -------------------------------------------------------
// Process command via RPC (server-side validation)
// -------------------------------------------------------

export async function processCommand(
  command_id: string,
  session_id: string,
  processor = 'system'
): Promise<SendCommandResult> {
  logCommand('Processing', { command_id, processor });

  try {
    const { data, error } = await supabase.rpc('process_player_command', {
      p_command_id: command_id,
      p_session_id: session_id,
      p_target: 'session',
      p_command_type: 'process',
      p_created_by: processor,
    });

    if (error) {
      logError('RPC failed', error);
      return { ok: false, error: error.message };
    }

    const result = data as unknown as { ok: boolean; error?: string; command_id?: string };
    if (!result.ok) {
      logCommand('Rejected', { command_id, reason: result.error });
    } else {
      logCommand('Processed OK', { command_id });
    }

    return {
      ok: result.ok,
      command_id: result.command_id ?? command_id,
      error: result.error,
    };
  } catch (err) {
    logError('Unexpected', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// -------------------------------------------------------
// Send and immediately process (for web clients)
// -------------------------------------------------------

export async function sendAndProcessCommand(params: SendCommandParams): Promise<SendCommandResult> {
  const sendResult = await sendPlatformCommand(params);
  if (!sendResult.ok || !sendResult.command_id) {
    return sendResult;
  }

  return processCommand(sendResult.command_id, params.session_id, params.created_by ?? 'web');
}

// -------------------------------------------------------
// Fetch pending commands for a session (for executor)
// -------------------------------------------------------

export async function fetchPendingCommands(
  session_id: string,
  target?: CommandTarget
): Promise<PlayerCommand[]> {
  let query = supabase
    .from('player_commands')
    .select('*')
    .eq('session_id', session_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (target) {
    query = query.eq('target', target);
  }

  const { data, error } = await query;

  if (error) {
    logError('Fetch pending', error);
    return [];
  }

  return (data ?? []) as PlayerCommand[];
}

// -------------------------------------------------------
// Log a session event
// -------------------------------------------------------

export async function logSessionEvent(
  session_id: string,
  event_type: string,
  payload: Record<string, unknown> = {},
  created_by = 'system',
  revision_before?: number,
  revision_after?: number
): Promise<void> {
  try {
    await supabase.from('session_events').insert({
      session_id,
      event_type,
      payload: payload as unknown as Json,
      created_by,
      expected_revision: revision_before ?? null,
      applied_revision: revision_after ?? null,
    });
  } catch (err) {
    logError('Event log failed', err);
  }
}

// -------------------------------------------------------
// Convenience: Session Commands
// -------------------------------------------------------

export const SessionCommands = {
  start: (session_id: string, revision?: number) =>
    sendAndProcessCommand({ session_id, target: 'session', command_type: 'START_SESSION', expected_revision: revision }),
  pause: (session_id: string, revision?: number) =>
    sendAndProcessCommand({ session_id, target: 'session', command_type: 'PAUSE_SESSION', expected_revision: revision }),
  resume: (session_id: string, revision?: number) =>
    sendAndProcessCommand({ session_id, target: 'session', command_type: 'RESUME_SESSION', expected_revision: revision }),
  finish: (session_id: string, revision?: number) =>
    sendAndProcessCommand({ session_id, target: 'session', command_type: 'FINISH_SESSION', expected_revision: revision }),
  advanceMoment: (session_id: string, revision?: number) =>
    sendAndProcessCommand({ session_id, target: 'session', command_type: 'ADVANCE_MOMENT', expected_revision: revision }),
  goToMoment: (session_id: string, moment_id: string, revision?: number) =>
    sendAndProcessCommand({ session_id, target: 'session', command_type: 'GO_TO_MOMENT', payload: { moment_id }, expected_revision: revision }),
  skipMoment: (session_id: string, revision?: number) =>
    sendAndProcessCommand({ session_id, target: 'session', command_type: 'SKIP_MOMENT', expected_revision: revision }),
};

// -------------------------------------------------------
// Convenience: Audio Commands
// -------------------------------------------------------

export const AudioCommands = {
  play: (session_id: string, song_id: string, start_at?: number) =>
    sendPlatformCommand({ session_id, target: 'audio', command_type: 'PLAY_AUDIO', payload: { song_id, start_at_seconds: start_at } }),
  pause: (session_id: string) =>
    sendPlatformCommand({ session_id, target: 'audio', command_type: 'PAUSE_AUDIO' }),
  stop: (session_id: string) =>
    sendPlatformCommand({ session_id, target: 'audio', command_type: 'STOP_AUDIO' }),
  next: (session_id: string) =>
    sendPlatformCommand({ session_id, target: 'audio', command_type: 'NEXT_AUDIO' }),
  prev: (session_id: string) =>
    sendPlatformCommand({ session_id, target: 'audio', command_type: 'PREV_AUDIO' }),
  queueNow: (session_id: string, song_id: string) =>
    sendPlatformCommand({ session_id, target: 'audio', command_type: 'QUEUE_AUDIO_NOW', payload: { song_id, position: 'now' } }),
  queueNext: (session_id: string, song_id: string) =>
    sendPlatformCommand({ session_id, target: 'audio', command_type: 'QUEUE_AUDIO_NEXT', payload: { song_id, position: 'next' } }),
  addToMoment: (session_id: string, moment_id: string, song_id: string) =>
    sendPlatformCommand({ session_id, target: 'audio', command_type: 'ADD_SONG_TO_MOMENT', payload: { moment_id, song_id } }),
  removeFromMoment: (session_id: string, moment_id: string, song_id: string) =>
    sendPlatformCommand({ session_id, target: 'audio', command_type: 'REMOVE_SONG_FROM_MOMENT', payload: { moment_id, song_id } }),
  reorderMomentSongs: (session_id: string, moment_id: string, song_ids: string[]) =>
    sendPlatformCommand({ session_id, target: 'audio', command_type: 'REORDER_MOMENT_SONGS', payload: { moment_id, song_ids } }),
};

// -------------------------------------------------------
// Convenience: Video Commands
// -------------------------------------------------------

export const VideoCommands = {
  load: (session_id: string, media_item_id: string, autoplay = false) =>
    sendPlatformCommand({ session_id, target: 'video', command_type: 'LOAD_VIDEO', payload: { media_item_id, autoplay } }),
  play: (session_id: string) =>
    sendPlatformCommand({ session_id, target: 'video', command_type: 'PLAY_VIDEO' }),
  pause: (session_id: string) =>
    sendPlatformCommand({ session_id, target: 'video', command_type: 'PAUSE_VIDEO' }),
  stop: (session_id: string) =>
    sendPlatformCommand({ session_id, target: 'video', command_type: 'STOP_VIDEO' }),
  seek: (session_id: string, time_seconds: number) =>
    sendPlatformCommand({ session_id, target: 'video', command_type: 'SEEK_VIDEO', payload: { time_seconds } }),
  restart: (session_id: string) =>
    sendPlatformCommand({ session_id, target: 'video', command_type: 'RESTART_VIDEO' }),
};

// -------------------------------------------------------
// Convenience: Slides Commands
// -------------------------------------------------------

export const SlidesCommands = {
  load: (session_id: string, media_item_id: string, start_index = 0) =>
    sendPlatformCommand({ session_id, target: 'slides', command_type: 'LOAD_SLIDES', payload: { media_item_id, start_index } }),
  next: (session_id: string) =>
    sendPlatformCommand({ session_id, target: 'slides', command_type: 'NEXT_SLIDE' }),
  prev: (session_id: string) =>
    sendPlatformCommand({ session_id, target: 'slides', command_type: 'PREV_SLIDE' }),
  goTo: (session_id: string, index: number) =>
    sendPlatformCommand({ session_id, target: 'slides', command_type: 'GO_TO_SLIDE', payload: { index } }),
  first: (session_id: string) =>
    sendPlatformCommand({ session_id, target: 'slides', command_type: 'FIRST_SLIDE' }),
  last: (session_id: string) =>
    sendPlatformCommand({ session_id, target: 'slides', command_type: 'LAST_SLIDE' }),
};

// -------------------------------------------------------
// Convenience: Display Commands
// -------------------------------------------------------

export const DisplayCommands = {
  setMode: (session_id: string, display_output_id: string, mode: string) =>
    sendPlatformCommand({ session_id, target: 'display', command_type: 'SET_DISPLAY_MODE', payload: { display_output_id, mode } }),
  showLogo: (session_id: string, display_output_id: string) =>
    sendPlatformCommand({ session_id, target: 'display', command_type: 'SHOW_LOGO', payload: { display_output_id } }),
  showMessage: (session_id: string, display_output_id: string, message: string) =>
    sendPlatformCommand({ session_id, target: 'display', command_type: 'SHOW_MESSAGE', payload: { display_output_id, message } }),
  showVideo: (session_id: string, display_output_id: string, media_item_id: string) =>
    sendPlatformCommand({ session_id, target: 'display', command_type: 'SHOW_VIDEO', payload: { display_output_id, media_item_id } }),
  showSlides: (session_id: string, display_output_id: string, media_item_id: string) =>
    sendPlatformCommand({ session_id, target: 'display', command_type: 'SHOW_SLIDES', payload: { display_output_id, media_item_id } }),
  showTimeline: (session_id: string, display_output_id: string) =>
    sendPlatformCommand({ session_id, target: 'display', command_type: 'SHOW_TIMELINE', payload: { display_output_id } }),
  blackout: (session_id: string, display_output_id: string) =>
    sendPlatformCommand({ session_id, target: 'display', command_type: 'BLACKOUT_DISPLAY', payload: { display_output_id } }),
};

// -------------------------------------------------------
// Convenience: Moderator Commands
// -------------------------------------------------------

export const ModeratorCommands = {
  triggerRelease: (session_id: string, moment_id?: string) =>
    sendPlatformCommand({ session_id, target: 'moderator', command_type: 'TRIGGER_MODERATOR_RELEASE', payload: { moment_id } }),
  ackRelease: (session_id: string, moment_id?: string) =>
    sendPlatformCommand({ session_id, target: 'moderator', command_type: 'ACK_MODERATOR_RELEASE', payload: { moment_id } }),
  updateCallStatus: (session_id: string, moment_id: string, status: string) =>
    sendPlatformCommand({ session_id, target: 'moderator', command_type: 'UPDATE_CALL_STATUS', payload: { moment_id, status } }),
};
