import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  addCultoTransition,
  addMomentoTransition,
  adjustCurrentMomentDurationTransition,
  advanceCultoTransition,
  backCultoTransition,
  buildRowPayload,
  defaultRemoteState,
  finishCultoTransition,
  markCalledTransition,
  normalizeRemoteState,
  patchSettingsTransition,
  pauseCultoTransition,
  removeCultoTransition,
  removeMomentoTransition,
  resumeCultoTransition,
  setActiveCultoTransition,
  setCultoTransition,
  setExecutionModeTransition,
  setMomentosTransition,
  startCultoTransition,
  updateCultoTransition,
  updateMomentoTransition,
  withMutationMetadata,
  type RemoteCultoState,
  type TransitionResult,
} from '@/features/culto-sync/domain';

const SESSION_ID = 'main';

type BackendMode = 'session_rpc' | 'legacy_table';

let backendMode: BackendMode | null = null;
const REVISION_CONFLICT_MARKERS = ['revision conflict', 'expected revision'];

const getErrorText = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return String(error ?? '');
  }

  const candidate = error as {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
    code?: unknown;
    name?: unknown;
  };

  return [
    candidate.name,
    candidate.code,
    candidate.message,
    candidate.details,
    candidate.hint,
  ]
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .join(' | ');
};

const enrichError = (error: unknown, fallback: string) => {
  const message = getErrorText(error) || fallback;
  const enriched = new Error(message);
  Object.assign(enriched, typeof error === 'object' && error ? error : {});
  return enriched;
};

const isMissingBackendFeature = (error: unknown) => {
  const normalized = getErrorText(error).toLowerCase();
  return (
    normalized.includes('get_session_state') ||
    normalized.includes('apply_session_command') ||
    normalized.includes('session_state') ||
    normalized.includes('could not find the function') ||
    normalized.includes('could not choose the best candidate function') ||
    normalized.includes('no function matches the given name and argument types') ||
    normalized.includes('malformed record literal') ||
    normalized.includes('missing left parenthesis') ||
    normalized.includes('relation') ||
    normalized.includes('does not exist') ||
    normalized.includes('schema cache') ||
    normalized.includes('22p02') ||
    normalized.includes('pgrst202') ||
    normalized.includes('pgrst203')
  );
};

const isRevisionConflict = (error: unknown) => {
  const normalized = getErrorText(error).toLowerCase();
  return REVISION_CONFLICT_MARKERS.some((marker) => normalized.includes(marker));
};

const setMode = (mode: BackendMode) => {
  backendMode = mode;
};

const getLegacyState = async (): Promise<RemoteCultoState> => {
  const { data, error } = await supabase
    .from('culto_sync_state')
    .select('*')
    .eq('id', SESSION_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const seeded = withMutationMetadata(defaultRemoteState, 'legacy-bootstrap', new Date().toISOString());
    const { error: upsertError } = await supabase
      .from('culto_sync_state')
      .upsert(buildRowPayload(seeded), { onConflict: 'id' });

    if (upsertError) {
      throw upsertError;
    }

    return seeded;
  }

  return normalizeRemoteState(data);
};

const runLegacyTransition = (command: string, state: RemoteCultoState, payload: Record<string, unknown>, nowIso: string, nowMs: number): TransitionResult => {
  switch (command) {
    case 'start':
      return startCultoTransition(state, nowIso);
    case 'pause':
      return pauseCultoTransition(state, nowIso, nowMs);
    case 'resume':
      return resumeCultoTransition(state, nowIso);
    case 'advance':
    case 'skip':
      return advanceCultoTransition(state, nowIso, nowMs);
    case 'back':
      return backCultoTransition(state, nowIso, nowMs);
    case 'finish':
      return finishCultoTransition(state, nowIso, nowMs);
    case 'mark_called':
      return markCalledTransition(state, String(payload.id ?? ''));
    case 'adjust_duration':
      return adjustCurrentMomentDurationTransition(state, Number(payload.deltaSeconds ?? 0));
    case 'set_execution_mode':
      return setExecutionModeTransition(state, String(payload.mode ?? 'manual') as RemoteCultoState['executionMode']);
    case 'set_active_culto':
      return setActiveCultoTransition(state, String(payload.id ?? ''));
    case 'set_culto':
      return setCultoTransition(state, payload.culto as never);
    case 'set_momentos':
      return setMomentosTransition(state, (payload.momentos ?? []) as never);
    case 'add_culto':
      return addCultoTransition(state, payload.culto as never);
    case 'update_culto':
      return updateCultoTransition(state, payload.culto as never);
    case 'remove_culto':
      return removeCultoTransition(state, String(payload.id ?? ''));
    case 'duplicate_culto':
      return {
        ok: true,
        state: {
          ...state,
          cultos: [...state.cultos, payload.culto as never],
          allMomentos: {
            ...state.allMomentos,
            [String((payload.culto as { id?: string } | undefined)?.id ?? '')]: (payload.momentos as never) ?? [],
          },
        },
      };
    case 'add_momento':
      return addMomentoTransition(state, payload.momento as never);
    case 'update_momento':
      return updateMomentoTransition(state, payload.momento as never);
    case 'remove_momento':
      return removeMomentoTransition(state, String(payload.id ?? ''));
    case 'patch_settings':
      return patchSettingsTransition(state, (payload.patch ?? {}) as never);
    default:
      return { ok: false, reason: `unsupported legacy command: ${command}` };
  }
};

const sendLegacyCommand = async ({
  command,
  payload = {},
  expectedRevision,
  actor,
}: {
  command: string;
  payload?: Json;
  expectedRevision?: number | null;
  actor: string;
  sessionId?: string;
}): Promise<RemoteCultoState> => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const base = await getLegacyState();
    const effectiveExpectedRevision = attempt === 0 ? (expectedRevision ?? base.revision) : base.revision;
    if (effectiveExpectedRevision !== base.revision) {
      if (attempt === 0) {
        continue;
      }
      throw new Error(`revision conflict: expected ${effectiveExpectedRevision}, got ${base.revision}`);
    }

    const now = new Date();
    const transition = runLegacyTransition(command, base, (payload ?? {}) as Record<string, unknown>, now.toISOString(), now.getTime());
    if (!transition.ok) {
      throw new Error(transition.reason);
    }

    const next = withMutationMetadata(transition.state, actor, now.toISOString());
    const { data, error } = await supabase
      .from('culto_sync_state')
      .update(buildRowPayload(next))
      .eq('id', SESSION_ID)
      .eq('revision', base.revision)
      .select('*')
      .maybeSingle();

    if (error) {
      throw enrichError(error, `Falha ao persistir comando legado ${command}.`);
    }

    if (data) {
      return normalizeRemoteState(data);
    }
  }

  throw new Error('legacy conflict: could not apply command');
};

export const getSessionState = async (sessionId = SESSION_ID): Promise<RemoteCultoState> => {
  if (backendMode === 'legacy_table') {
    return getLegacyState();
  }

  try {
    const { data, error } = await supabase.rpc('get_session_state', {
      p_session_id: sessionId,
    });

    if (error) {
      throw enrichError(error, 'Falha ao carregar session_state.');
    }

    setMode('session_rpc');
    return normalizeRemoteState(data);
  } catch (error) {
    if (!isMissingBackendFeature(error)) {
      throw error;
    }

    console.warn('[sync] session RPC indisponivel, usando tabela legado culto_sync_state.', getErrorText(error));
    setMode('legacy_table');
    return getLegacyState();
  }
};

export const sendSessionCommand = async ({
  command,
  payload = {},
  expectedRevision,
  actor,
  sessionId = SESSION_ID,
}: {
  command: string;
  payload?: Json;
  expectedRevision?: number | null;
  actor: string;
  sessionId?: string;
}): Promise<RemoteCultoState> => {
  if (backendMode === 'legacy_table') {
    return sendLegacyCommand({ command, payload, expectedRevision, actor, sessionId });
  }

  const executeRpc = async (revision: number | null | undefined) => {
    const { data, error } = await supabase.rpc('apply_session_command', {
      p_session_id: sessionId,
      p_command: command,
      p_payload: payload,
      p_expected_revision: revision ?? null,
      p_actor: actor,
    });

    if (error) {
      throw enrichError(error, `Falha ao executar ${command}.`);
    }

    return normalizeRemoteState(data);
  };

  try {
    const next = await executeRpc(expectedRevision ?? null);
    setMode('session_rpc');
    return next;
  } catch (error) {
    if (isRevisionConflict(error)) {
      const latest = await getSessionState(sessionId);
      const retried = await executeRpc(latest.revision);
      setMode('session_rpc');
      return retried;
    }

    if (!isMissingBackendFeature(error)) {
      throw error;
    }

    console.warn('[sync] apply_session_command indisponivel, usando compatibilidade legado.', getErrorText(error));
    setMode('legacy_table');
    return sendLegacyCommand({ command, payload, expectedRevision, actor, sessionId });
  }
};

export const subscribeSessionState = (
  sessionId: string,
  onChange: (state: RemoteCultoState) => void,
  onStatus?: (status: string) => void,
) => {
  const channels = [
    {
      name: `session-state-main-${sessionId}`,
      table: 'session_state',
      filter: `session_id=eq.${sessionId}`,
    },
    {
      name: `session-state-legacy-${sessionId}`,
      table: 'culto_sync_state',
      filter: `id=eq.${sessionId}`,
    },
  ].map(({ name, table, filter }) => supabase
    .channel(name)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table,
      filter,
    }, (payload) => {
      if (!payload.new) return;
      onChange(normalizeRemoteState(payload.new));
    })
    .subscribe((status) => {
      onStatus?.(status);
    }));

  return () => {
    channels.forEach((channel) => {
      void supabase.removeChannel(channel);
    });
  };
};
