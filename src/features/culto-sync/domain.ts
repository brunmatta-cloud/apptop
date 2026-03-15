import type { Tables } from '@/integrations/supabase/types';
import type { Culto, CultoStatus, ExecutionMode, ModeradorCallStatus, MomentStatus, MomentoProgramacao } from '@/types/culto';
import { calcularHorarioTermino } from '@/types/culto';

export type SyncRow = Tables<'culto_sync_state'>;
export type SessionStateRow = Tables<'session_state'>;
export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';
export type ConnectionStatus = 'connecting' | 'online' | 'degraded' | 'offline';

// Type for flexible property access from database (snake_case) or TypeScript (camelCase)
export interface FlexibleRemoteState {
  // camelCase properties
  id?: string;
  sessionId?: string;
  activeCultoId?: string;
  accumulatedMs?: number;
  momentAccumulatedMs?: number;
  timerStatus?: TimerStatus;
  // snake_case properties (from database)
  active_culto_id?: string;
  accumulated_ms?: number;
  moment_accumulated_ms?: number;
  timer_status?: TimerStatus;
  elapsed_seconds?: number;
  moment_elapsed_seconds?: number;
  is_paused?: boolean;
  timer_started_at?: string;
  is_blinking?: boolean;
  orange_threshold?: number;
  red_threshold?: number;
  top_font_size?: number;
  bottom_font_size?: number;
  timer_font_size?: number;
  message_font_size?: number;
  background_color?: string;
  timer_text_color?: string;
  top_text_color?: string;
  bottom_text_color?: string;
  message_text_color?: string;
  warning_color?: string;
  danger_color?: string;
  message?: string;
  show_message?: boolean;
  [key: string]: unknown;
}

export interface CronometroSettings {
  isBlinking: boolean;
  orangeThreshold: number;
  redThreshold: number;
  topFontSize: number;
  bottomFontSize: number;
  timerFontSize: number;
  messageFontSize: number;
  backgroundColor: string;
  timerTextColor: string;
  topTextColor: string;
  bottomTextColor: string;
  messageTextColor: string;
  warningColor: string;
  dangerColor: string;
  message: string;
  showMessage: boolean;
}

export interface RemoteCultoState {
  id: string;
  sessionId: string;
  status: 'planned' | 'live' | 'finished';
  cultos: Culto[];
  allMomentos: Record<string, MomentoProgramacao[]>;
  activeCultoId: string;
  currentIndex: number;
  executionMode: ExecutionMode;
  timerStatus: TimerStatus;
  startedAt: string | null;
  pausedAt: string | null;
  accumulatedMs: number;
  momentStartedAt: string | null;
  momentPausedAt: string | null;
  momentAccumulatedMs: number;
  currentCommand: string;
  nextCommand: string;
  currentStage: string;
  moderadorReleaseActive: boolean;
  moderadorReleaseUpdatedAt: string | null;
  moderadorReleaseBy: string | null;
  moderadorReleasePendingMomentId: string | null;
  moderadorReleaseGrantedMomentId: string | null;
  revision: number;
  updatedAt: string;
  updatedBy: string;
  settings: CronometroSettings;
}

export interface UiSyncState {
  isHydrating: boolean;
  isSubmitting: boolean;
  pendingAction: string | null;
  lastError: string | null;
  connectionStatus: ConnectionStatus;
}

export interface TimerSnapshot {
  elapsedMs: number;
  momentElapsedMs: number;
  elapsedSeconds: number;
  momentElapsedSeconds: number;
  isRunning: boolean;
}

export interface TransitionSuccess {
  ok: true;
  state: RemoteCultoState;
}

export interface TransitionFailure {
  ok: false;
  reason: string;
}

export type TransitionResult = TransitionSuccess | TransitionFailure;

const DEFAULT_TIMESTAMP = new Date(0).toISOString();
const SYNC_ROW_ID = 'main';

// Empty defaults — real data comes from server via SyncStore
const EMPTY_CULTOS: Culto[] = [];
const EMPTY_MOMENTOS: Record<string, MomentoProgramacao[]> = {};

export const defaultSettings: CronometroSettings = {
  isBlinking: false,
  orangeThreshold: 120,
  redThreshold: 20,
  topFontSize: 4,
  bottomFontSize: 2.75,
  timerFontSize: 28,
  messageFontSize: 16,
  backgroundColor: '#000000',
  timerTextColor: '#ffffff',
  topTextColor: '#b8c0d4',
  bottomTextColor: '#99a2b3',
  messageTextColor: '#ffffff',
  warningColor: '#f59e0b',
  dangerColor: '#ef4444',
  message: '',
  showMessage: false,
};

export const defaultRemoteState: RemoteCultoState = {
  id: SYNC_ROW_ID,
  sessionId: SYNC_ROW_ID,
  status: 'planned',
  cultos: EMPTY_CULTOS,
  allMomentos: EMPTY_MOMENTOS,
  activeCultoId: '',
  currentIndex: -1,
  executionMode: 'manual',
  timerStatus: 'idle',
  startedAt: null,
  pausedAt: null,
  accumulatedMs: 0,
  momentStartedAt: null,
  momentPausedAt: null,
  momentAccumulatedMs: 0,
  currentCommand: '',
  nextCommand: '',
  currentStage: '',
  moderadorReleaseActive: false,
  moderadorReleaseUpdatedAt: null,
  moderadorReleaseBy: null,
  moderadorReleasePendingMomentId: null,
  moderadorReleaseGrantedMomentId: null,
  revision: 0,
  updatedAt: DEFAULT_TIMESTAMP,
  updatedBy: 'system',
  settings: defaultSettings,
};

const isValidHexColor = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value);

const isExecutionMode = (value: unknown): value is ExecutionMode => value === 'manual' || value === 'automatico';

const normalizeCulto = (value: Partial<Culto> | null | undefined, fallbackId: string): Culto => ({
  id: typeof value?.id === 'string' && value.id.trim() ? value.id : fallbackId,
  nome: typeof value?.nome === 'string' ? value.nome : '',
  data: typeof value?.data === 'string' && value.data ? value.data : new Date().toISOString().split('T')[0],
  horarioInicial: typeof value?.horarioInicial === 'string' && value.horarioInicial.includes(':') ? value.horarioInicial : '00:00',
  duracaoPrevista: Number.isFinite(value?.duracaoPrevista) ? Math.max(0, Number(value.duracaoPrevista)) : 0,
  status: value?.status === 'em_andamento' || value?.status === 'finalizado' ? value.status : 'planejado',
});

const normalizeMomento = (momento: Partial<MomentoProgramacao> | null | undefined, index: number, cultoId = ''): MomentoProgramacao => ({
  id: typeof momento?.id === 'string' && momento.id.trim() ? momento.id : `momento-${cultoId || 'sem-culto'}-${index}`,
  cultoId: typeof momento?.cultoId === 'string' && momento.cultoId.trim() ? momento.cultoId : cultoId,
  ordem: Number.isFinite(momento?.ordem) ? Number(momento.ordem) : index,
  bloco: typeof momento?.bloco === 'string' ? momento.bloco : '',
  horarioInicio: typeof momento?.horarioInicio === 'string' && momento.horarioInicio.includes(':') ? momento.horarioInicio : '00:00',
  duracao: Number.isFinite(momento?.duracao) ? Math.max(0, Number(momento.duracao)) : 0,
  atividade: typeof momento?.atividade === 'string' ? momento.atividade : '',
  responsavel: typeof momento?.responsavel === 'string' ? momento.responsavel : '',
  ministerio: typeof momento?.ministerio === 'string' ? momento.ministerio : '',
  funcao: typeof momento?.funcao === 'string' ? momento.funcao : '',
  fotoUrl: typeof momento?.fotoUrl === 'string' ? momento.fotoUrl : '',
  tipoMomento: momento?.tipoMomento ?? 'nenhum',
  tipoMidia: momento?.tipoMidia ?? 'nenhum',
  acaoSonoplastia: typeof momento?.acaoSonoplastia === 'string' ? momento.acaoSonoplastia : '',
  observacao: typeof momento?.observacao === 'string' ? momento.observacao : '',
  antecedenciaChamada: Number.isFinite(momento?.antecedenciaChamada) ? Math.max(0, Number(momento.antecedenciaChamada)) : 0,
  chamado: Boolean(momento?.chamado),
  duracaoOriginal: Number.isFinite(momento?.duracaoOriginal) ? Number(momento.duracaoOriginal) : undefined,
  moderadorStatus: momento?.moderadorStatus === 'chamado' || momento?.moderadorStatus === 'pronto'
    ? momento.moderadorStatus
    : momento?.chamado
      ? 'chamado'
      : 'pendente',
  confirmacaoStatus: momento?.confirmacaoStatus === 'confirmado' || momento?.confirmacaoStatus === 'ausente'
    ? momento.confirmacaoStatus
    : 'pendente',
  responsavelOriginal: typeof momento?.responsavelOriginal === 'string' ? momento.responsavelOriginal : undefined,
});

const normalizeMomentosRecord = (value: unknown, cultos: Culto[]) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const result: Record<string, MomentoProgramacao[]> = {};

  cultos.forEach((culto) => {
    const rawMomentos = Array.isArray(source[culto.id]) ? (source[culto.id] as unknown[]) : [];
    result[culto.id] = rawMomentos
      .map((momento, index) => normalizeMomento(momento as Partial<MomentoProgramacao>, index, culto.id))
      .sort((a, b) => a.ordem - b.ordem);
  });

  return result;
};

const clampCurrentIndex = (index: number, momentos: MomentoProgramacao[]) => {
  if (!Number.isInteger(index)) return -1;
  if (momentos.length === 0) return -1;
  return Math.max(-1, Math.min(index, momentos.length - 1));
};

const normalizeSettings = (
  value?: Partial<SyncRow> | Partial<SessionStateRow> | Partial<CronometroSettings> | Partial<FlexibleRemoteState> | null,
  nestedSettings?: Partial<CronometroSettings> | null,
): CronometroSettings => {
  const flexValue = value as Partial<FlexibleRemoteState> | undefined;
  const settings = {
    ...(nestedSettings && typeof nestedSettings === 'object' ? nestedSettings : {}),
    ...(value && typeof value === 'object' ? value as Partial<CronometroSettings> : {}),
  };

  return {
    isBlinking: typeof flexValue?.is_blinking === 'boolean' ? flexValue.is_blinking : Boolean(settings?.isBlinking),
    orangeThreshold: Number.isFinite(flexValue?.orange_threshold as any) ? Math.max(10, Math.min(600, Number(flexValue.orange_threshold))) : Number.isFinite(settings?.orangeThreshold) ? Math.max(10, Math.min(600, Number(settings.orangeThreshold))) : defaultSettings.orangeThreshold,
    redThreshold: Number.isFinite(flexValue?.red_threshold as any) ? Math.max(5, Math.min(300, Number(flexValue.red_threshold))) : Number.isFinite(settings?.redThreshold) ? Math.max(5, Math.min(300, Number(settings.redThreshold))) : defaultSettings.redThreshold,
    topFontSize: Number.isFinite(flexValue?.top_font_size as any) ? Math.max(1.25, Math.min(8, Number(flexValue.top_font_size))) : Number.isFinite(settings?.topFontSize) ? Math.max(1.25, Math.min(8, Number(settings.topFontSize))) : defaultSettings.topFontSize,
    bottomFontSize: Number.isFinite(flexValue?.bottom_font_size as any) ? Math.max(1, Math.min(6, Number(flexValue.bottom_font_size))) : Number.isFinite(settings?.bottomFontSize) ? Math.max(1, Math.min(6, Number(settings.bottomFontSize))) : defaultSettings.bottomFontSize,
    timerFontSize: Number.isFinite(flexValue?.timer_font_size as any) ? Math.max(6, Math.min(40, Number(flexValue.timer_font_size))) : Number.isFinite(settings?.timerFontSize) ? Math.max(6, Math.min(40, Number(settings.timerFontSize))) : defaultSettings.timerFontSize,
    messageFontSize: Number.isFinite(flexValue?.message_font_size as any) ? Math.max(2, Math.min(24, Number(flexValue.message_font_size))) : Number.isFinite(settings?.messageFontSize) ? Math.max(2, Math.min(24, Number(settings.messageFontSize))) : defaultSettings.messageFontSize,
    backgroundColor: isValidHexColor(String(flexValue?.background_color ?? '')) ? String(flexValue.background_color) : isValidHexColor(String(settings?.backgroundColor ?? '')) ? String(settings.backgroundColor) : defaultSettings.backgroundColor,
    timerTextColor: isValidHexColor(String(flexValue?.timer_text_color ?? '')) ? String(flexValue.timer_text_color) : isValidHexColor(String(settings?.timerTextColor ?? '')) ? String(settings.timerTextColor) : defaultSettings.timerTextColor,
    topTextColor: isValidHexColor(String(flexValue?.top_text_color ?? '')) ? String(flexValue.top_text_color) : isValidHexColor(String(settings?.topTextColor ?? '')) ? String(settings.topTextColor) : defaultSettings.topTextColor,
    bottomTextColor: isValidHexColor(String(flexValue?.bottom_text_color ?? '')) ? String(flexValue.bottom_text_color) : isValidHexColor(String(settings?.bottomTextColor ?? '')) ? String(settings.bottomTextColor) : defaultSettings.bottomTextColor,
    messageTextColor: isValidHexColor(String(flexValue?.message_text_color ?? '')) ? String(flexValue.message_text_color) : isValidHexColor(String(settings?.messageTextColor ?? '')) ? String(settings.messageTextColor) : defaultSettings.messageTextColor,
    warningColor: isValidHexColor(String(flexValue?.warning_color ?? '')) ? String(flexValue.warning_color) : isValidHexColor(String(settings?.warningColor ?? '')) ? String(settings.warningColor) : defaultSettings.warningColor,
    dangerColor: isValidHexColor(String(flexValue?.danger_color ?? '')) ? String(flexValue.danger_color) : isValidHexColor(String(settings?.dangerColor ?? '')) ? String(settings.dangerColor) : defaultSettings.dangerColor,
    message: typeof flexValue?.message === 'string' ? flexValue.message : typeof settings?.message === 'string' ? settings.message : defaultSettings.message,
    showMessage: typeof flexValue?.show_message === 'boolean' ? flexValue.show_message : Boolean(settings?.showMessage),
  };
};

export const normalizeRemoteState = (row?: Partial<SyncRow> | Partial<SessionStateRow> | Partial<RemoteCultoState> | null): RemoteCultoState => {
  const flexRow = row as Partial<FlexibleRemoteState> | undefined;
  const rowState = row as Partial<RemoteCultoState> | undefined;
  const cultosSource = Array.isArray(row?.cultos) ? row.cultos : Array.isArray(rowState?.cultos) ? rowState.cultos : EMPTY_CULTOS;
  const cultos = (cultosSource as unknown[]).map((item, index) => normalizeCulto(item as Partial<Culto>, `culto-${index + 1}`));
  const safeCultos = cultos;
  const activeCultoIdRaw = typeof flexRow?.active_culto_id === 'string' ? flexRow.active_culto_id : typeof rowState?.activeCultoId === 'string' ? rowState.activeCultoId : safeCultos[0]?.id ?? '';
  const activeCultoId = safeCultos.some((culto) => culto.id === activeCultoIdRaw) ? activeCultoIdRaw : (safeCultos[0]?.id ?? '');
  const allMomentos = normalizeMomentosRecord(flexRow?.all_momentos ?? rowState?.allMomentos ?? EMPTY_MOMENTOS, safeCultos);
  const activeMomentos = allMomentos[activeCultoId] || [];
  const accumulatedMs = Number.isFinite(flexRow?.accumulated_ms as any) ? Math.max(0, Number(flexRow.accumulated_ms)) : Number.isFinite(rowState?.accumulatedMs) ? Math.max(0, Number(rowState.accumulatedMs)) : Number.isFinite(flexRow?.elapsed_seconds as any) ? Math.max(0, Number(flexRow.elapsed_seconds) * 1000) : 0;
  const momentAccumulatedMs = Number.isFinite(flexRow?.moment_accumulated_ms as any) ? Math.max(0, Number(flexRow.moment_accumulated_ms)) : Number.isFinite(rowState?.momentAccumulatedMs) ? Math.max(0, Number(rowState.momentAccumulatedMs)) : Number.isFinite(flexRow?.moment_elapsed_seconds as any) ? Math.max(0, Number(flexRow.moment_elapsed_seconds) * 1000) : 0;
  const timerStatus = flexRow?.timer_status === 'running' || flexRow?.timer_status === 'paused' || flexRow?.timer_status === 'finished' || flexRow?.timer_status === 'idle'
    ? (flexRow.timer_status as TimerStatus)
    : rowState?.timerStatus ?? (
      safeCultos.find((culto) => culto.id === activeCultoId)?.status === 'finalizado'
        ? 'finished'
        : typeof flexRow?.is_paused === 'boolean' && flexRow.is_paused
          ? 'paused'
          : flexRow?.timer_started_at
            ? 'running'
            : 'idle'
    );

  const state: RemoteCultoState = {
    id: typeof row?.id === 'string' ? row.id : rowState?.id ?? SYNC_ROW_ID,
    sessionId: typeof flexRow?.session_id === 'string' ? flexRow.session_id : typeof rowState?.sessionId === 'string' ? rowState.sessionId : SYNC_ROW_ID,
    status: flexRow?.status === 'live' || flexRow?.status === 'finished' || flexRow?.status === 'planned'
      ? (flexRow.status as any)
      : rowState?.status ?? 'planned',
    cultos: safeCultos,
    allMomentos,
    activeCultoId,
    currentIndex: clampCurrentIndex(
      typeof flexRow?.current_index === 'number' ? flexRow.current_index : Number(rowState?.currentIndex ?? -1),
      activeMomentos,
    ),
    executionMode: isExecutionMode(flexRow?.execution_mode) ? flexRow.execution_mode : isExecutionMode(rowState?.executionMode) ? rowState.executionMode : 'manual',
    timerStatus,
    startedAt: typeof flexRow?.started_at === 'string' ? flexRow.started_at : typeof rowState?.startedAt === 'string' ? rowState.startedAt : typeof flexRow?.timer_started_at === 'string' ? flexRow.timer_started_at : null,
    pausedAt: typeof flexRow?.paused_at === 'string' ? flexRow.paused_at : typeof rowState?.pausedAt === 'string' ? rowState.pausedAt : null,
    accumulatedMs,
    momentStartedAt: typeof flexRow?.moment_started_at === 'string' ? flexRow.moment_started_at : typeof rowState?.momentStartedAt === 'string' ? rowState.momentStartedAt : typeof flexRow?.timer_started_at === 'string' ? flexRow.timer_started_at : null,
    momentPausedAt: typeof flexRow?.moment_paused_at === 'string' ? flexRow.moment_paused_at : typeof rowState?.momentPausedAt === 'string' ? rowState.momentPausedAt : null,
    momentAccumulatedMs,
    currentCommand: typeof flexRow?.current_command === 'string' ? flexRow.current_command : typeof rowState?.currentCommand === 'string' ? rowState.currentCommand : '',
    nextCommand: typeof flexRow?.next_command === 'string' ? flexRow.next_command : typeof rowState?.nextCommand === 'string' ? rowState.nextCommand : '',
    currentStage: typeof flexRow?.current_stage === 'string' ? flexRow.current_stage : typeof rowState?.currentStage === 'string' ? rowState.currentStage : '',
    moderadorReleaseActive: typeof flexRow?.moderador_release_active === 'boolean'
      ? Boolean(flexRow.moderador_release_active)
      : typeof rowState?.moderadorReleaseActive === 'boolean'
        ? rowState.moderadorReleaseActive
        : false,
    moderadorReleaseUpdatedAt: typeof flexRow?.moderador_release_updated_at === 'string'
      ? String(flexRow.moderador_release_updated_at)
      : typeof rowState?.moderadorReleaseUpdatedAt === 'string'
        ? rowState.moderadorReleaseUpdatedAt
        : null,
    moderadorReleaseBy: typeof flexRow?.moderador_release_by === 'string'
      ? String(flexRow.moderador_release_by)
      : typeof rowState?.moderadorReleaseBy === 'string'
        ? rowState.moderadorReleaseBy
        : null,
    moderadorReleasePendingMomentId: typeof flexRow?.moderador_release_pending_moment_id === 'string'
      ? String(flexRow.moderador_release_pending_moment_id)
      : typeof rowState?.moderadorReleasePendingMomentId === 'string'
        ? rowState.moderadorReleasePendingMomentId
        : null,
    moderadorReleaseGrantedMomentId: typeof flexRow?.moderador_release_granted_moment_id === 'string'
      ? String(flexRow.moderador_release_granted_moment_id)
      : typeof rowState?.moderadorReleaseGrantedMomentId === 'string'
        ? rowState.moderadorReleaseGrantedMomentId
        : null,
    revision: Number.isFinite(flexRow?.revision as any) ? Math.max(0, Number(flexRow.revision)) : Number.isFinite(rowState?.revision) ? Math.max(0, Number(rowState.revision)) : 0,
    updatedAt: typeof flexRow?.updated_at === 'string' ? flexRow.updated_at : typeof rowState?.updatedAt === 'string' ? rowState.updatedAt : DEFAULT_TIMESTAMP,
    updatedBy: typeof flexRow?.updated_by === 'string' && flexRow.updated_by ? flexRow.updated_by : typeof rowState?.updatedBy === 'string' && rowState.updatedBy ? rowState.updatedBy : 'system',
    settings: normalizeSettings(
      row ?? rowState,
      ((row as { settings?: unknown } | undefined)?.settings && typeof (row as { settings?: unknown }).settings === 'object'
        ? (row as { settings?: Partial<CronometroSettings> }).settings
        : undefined)
      ?? ((rowState as { settings?: unknown } | undefined)?.settings && typeof (rowState as { settings?: unknown }).settings === 'object'
        ? (rowState as { settings?: Partial<CronometroSettings> }).settings
        : undefined),
    ),
  };

  return refreshCommands(state);
};

export const getActiveCulto = (state: RemoteCultoState) =>
  ({
    ...(state.cultos.find((item) => item.id === state.activeCultoId) ?? state.cultos[0] ?? { id: '', nome: '', data: '', horarioInicial: '00:00', duracaoPrevista: 0, status: 'planejado' as const }),
    status: state.status === 'live' ? 'em_andamento' : state.status === 'finished' ? 'finalizado' : 'planejado',
  });

export const getActiveMomentos = (state: RemoteCultoState) => state.allMomentos[state.activeCultoId] ?? [];

export const getCurrentMoment = (state: RemoteCultoState) => {
  const momentos = getActiveMomentos(state);
  return state.currentIndex >= 0 && state.currentIndex < momentos.length ? momentos[state.currentIndex] : null;
};

export const getNextMoment = (state: RemoteCultoState) => {
  const momentos = getActiveMomentos(state);
  const nextIndex = state.currentIndex + 1;
  return nextIndex >= 0 && nextIndex < momentos.length ? momentos[nextIndex] : null;
};

const parseTimestamp = (value: string | null) => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const getRunningDelta = (startedAt: string | null, nowMs: number) => {
  const startedMs = parseTimestamp(startedAt);
  return startedMs == null ? 0 : Math.max(0, nowMs - startedMs);
};

export const getTimerSnapshot = (state: RemoteCultoState, nowMs = Date.now()): TimerSnapshot => {
  const running = state.timerStatus === 'running';

  const elapsedMs = running
    ? state.accumulatedMs + getRunningDelta(state.startedAt, nowMs)
    : state.accumulatedMs;

  const momentElapsedMs = running
    ? state.momentAccumulatedMs + getRunningDelta(state.momentStartedAt, nowMs)
    : state.momentAccumulatedMs;

  return {
    elapsedMs,
    momentElapsedMs,
    elapsedSeconds: Math.floor(elapsedMs / 1000),
    momentElapsedSeconds: Math.floor(momentElapsedMs / 1000),
    isRunning: running,
  };
};

const setCultoStatus = (state: RemoteCultoState, status: CultoStatus) => ({
  ...state,
  cultos: state.cultos.map((culto) => culto.id === state.activeCultoId ? { ...culto, status } : culto),
});

const refreshCommands = (state: RemoteCultoState): RemoteCultoState => {
  const currentMoment = getCurrentMoment(state);
  const nextMoment = getNextMoment(state);
  const currentMomentId = currentMoment?.id ?? null;
  const grantedForCurrentMoment = currentMomentId != null && state.moderadorReleaseGrantedMomentId === currentMomentId;
  return {
    ...state,
    currentCommand: currentMoment?.atividade ?? '',
    nextCommand: nextMoment?.atividade ?? '',
    moderadorReleasePendingMomentId: currentMomentId && !grantedForCurrentMoment ? currentMomentId : null,
    moderadorReleaseGrantedMomentId: grantedForCurrentMoment ? currentMomentId : currentMomentId == null ? null : state.moderadorReleaseGrantedMomentId,
    moderadorReleaseActive: currentMomentId == null ? false : state.moderadorReleaseActive,
  };
};

const recalcStartTimes = (moms: MomentoProgramacao[], fromIndex: number): MomentoProgramacao[] => {
  const result = [...moms];
  for (let i = fromIndex; i < result.length; i += 1) {
    if (i === 0) continue;
    const prev = result[i - 1];
    result[i] = { ...result[i], horarioInicio: calcularHorarioTermino(prev.horarioInicio, prev.duracao) };
  }
  return result;
};

const resetMomentTimer = (state: RemoteCultoState, nowIso: string, nextStatus: TimerStatus) => ({
  ...state,
  timerStatus: nextStatus,
  startedAt: nextStatus === 'running' ? nowIso : null,
  pausedAt: nextStatus === 'paused' ? nowIso : null,
  momentStartedAt: nextStatus === 'running' ? nowIso : null,
  momentPausedAt: nextStatus === 'paused' ? nowIso : null,
  momentAccumulatedMs: 0,
});

const applyPauseToAccumulators = (state: RemoteCultoState, nowIso: string, nowMs: number): RemoteCultoState => {
  const snapshot = getTimerSnapshot(state, nowMs);
  return {
    ...state,
    timerStatus: 'paused',
    startedAt: null,
    pausedAt: nowIso,
    accumulatedMs: snapshot.elapsedMs,
    momentStartedAt: null,
    momentPausedAt: nowIso,
    momentAccumulatedMs: snapshot.momentElapsedMs,
  };
};

export const withMutationMetadata = (state: RemoteCultoState, actorId: string, nowIso: string) => ({
  ...refreshCommands(state),
  revision: state.revision + 1,
  updatedAt: nowIso,
  updatedBy: actorId,
});

export const startCultoTransition = (state: RemoteCultoState, nowIso: string): TransitionResult => {
  const momentos = getActiveMomentos(state);
  const activeCulto = getActiveCulto(state);
  if (activeCulto.status === 'em_andamento' && state.timerStatus !== 'finished') {
    return { ok: false, reason: 'O culto ja esta em andamento.' };
  }

  const nextMomentos = momentos.map((momento) => ({
    ...momento,
    duracaoOriginal: momento.duracaoOriginal ?? momento.duracao,
    chamado: false,
  }));

  const nextState = refreshCommands(resetMomentTimer({
      ...setCultoStatus({
      ...state,
      allMomentos: {
        ...state.allMomentos,
        [state.activeCultoId]: nextMomentos,
      },
      currentIndex: nextMomentos.length > 0 ? 0 : -1,
      accumulatedMs: 0,
      momentAccumulatedMs: 0,
      moderadorReleaseActive: false,
      moderadorReleasePendingMomentId: null,
      moderadorReleaseGrantedMomentId: null,
    }, 'em_andamento'),
  }, nowIso, nextMomentos.length > 0 ? 'running' : 'idle'));

  return { ok: true, state: nextState };
};

export const pauseCultoTransition = (state: RemoteCultoState, nowIso: string, nowMs: number): TransitionResult => {
  if (state.timerStatus !== 'running') {
    return { ok: false, reason: 'Nao ha cronometro rodando para pausar.' };
  }
  return { ok: true, state: refreshCommands(applyPauseToAccumulators(state, nowIso, nowMs)) };
};

export const resumeCultoTransition = (state: RemoteCultoState, nowIso: string): TransitionResult => {
  const activeCulto = getActiveCulto(state);
  if (activeCulto.status !== 'em_andamento') {
    return { ok: false, reason: 'Somente um culto em andamento pode ser retomado.' };
  }
  if (state.timerStatus !== 'paused') {
    return { ok: false, reason: 'O cronometro nao esta pausado.' };
  }
  return {
    ok: true,
    state: refreshCommands({
      ...state,
      timerStatus: 'running',
      startedAt: nowIso,
      pausedAt: null,
      momentStartedAt: nowIso,
      momentPausedAt: null,
    }),
  };
};

export const finishCultoTransition = (state: RemoteCultoState, nowIso: string, nowMs: number): TransitionResult => {
  const pausedState = state.timerStatus === 'running' ? applyPauseToAccumulators(state, nowIso, nowMs) : state;
  return {
    ok: true,
    state: refreshCommands({
      ...setCultoStatus(pausedState, 'finalizado'),
      timerStatus: 'finished',
      startedAt: null,
      pausedAt: nowIso,
      momentStartedAt: null,
      momentPausedAt: nowIso,
      moderadorReleaseActive: false,
      moderadorReleasePendingMomentId: null,
      moderadorReleaseGrantedMomentId: null,
    }),
  };
};

export const advanceCultoTransition = (state: RemoteCultoState, nowIso: string, nowMs: number): TransitionResult => {
  const momentos = getActiveMomentos(state);
  const activeCulto = getActiveCulto(state);
  if (activeCulto.status !== 'em_andamento') {
    return { ok: false, reason: 'O culto precisa estar em andamento para avancar.' };
  }
  if (state.currentIndex < 0) {
    return { ok: false, reason: 'Nao existe momento atual para avancar.' };
  }

  const snapshot = getTimerSnapshot(state, nowMs);
  if (state.currentIndex >= momentos.length - 1) {
    return finishCultoTransition({
      ...state,
      accumulatedMs: snapshot.elapsedMs,
      momentAccumulatedMs: snapshot.momentElapsedMs,
    }, nowIso, nowMs);
  }

  const nextStatus: TimerStatus = state.timerStatus === 'paused' ? 'paused' : 'running';
  return {
    ok: true,
    state: refreshCommands(resetMomentTimer({
      ...state,
      currentIndex: state.currentIndex + 1,
      accumulatedMs: snapshot.elapsedMs,
      moderadorReleaseActive: false,
      moderadorReleasePendingMomentId: null,
      moderadorReleaseGrantedMomentId: null,
    }, nowIso, nextStatus)),
  };
};

export const backCultoTransition = (state: RemoteCultoState, nowIso: string, nowMs: number): TransitionResult => {
  const activeCulto = getActiveCulto(state);
  if (activeCulto.status !== 'em_andamento') {
    return { ok: false, reason: 'O culto precisa estar em andamento para voltar.' };
  }
  if (state.currentIndex <= 0) {
    return { ok: false, reason: 'Ja esta no primeiro momento.' };
  }

  const snapshot = getTimerSnapshot(state, nowMs);
  const nextStatus: TimerStatus = state.timerStatus === 'paused' ? 'paused' : 'running';
  return {
    ok: true,
    state: refreshCommands(resetMomentTimer({
      ...state,
      currentIndex: state.currentIndex - 1,
      accumulatedMs: snapshot.elapsedMs,
      moderadorReleaseActive: false,
      moderadorReleasePendingMomentId: null,
      moderadorReleaseGrantedMomentId: null,
    }, nowIso, nextStatus)),
  };
};

export const markCalledTransition = (state: RemoteCultoState, id: string): TransitionResult => ({
  ok: true,
  state: {
    ...state,
    allMomentos: {
      ...state.allMomentos,
      [state.activeCultoId]: getActiveMomentos(state).map((momento) => momento.id === id ? { ...momento, chamado: true, moderadorStatus: 'chamado' } : momento),
    },
  },
});

export const toggleModeradorReleaseTransition = (state: RemoteCultoState, active: boolean, actorId: string, nowIso: string): TransitionResult => ({
  ok: true,
  state: refreshCommands({
    ...state,
    moderadorReleaseActive: active,
    moderadorReleaseUpdatedAt: nowIso,
    moderadorReleaseBy: actorId,
    moderadorReleasePendingMomentId: active ? null : state.moderadorReleasePendingMomentId,
    moderadorReleaseGrantedMomentId: active ? getCurrentMoment(state)?.id ?? state.moderadorReleaseGrantedMomentId : state.moderadorReleaseGrantedMomentId,
  }),
});

export const updateModeradorStatusTransition = (state: RemoteCultoState, id: string, status: ModeradorCallStatus): TransitionResult => ({
  ok: true,
  state: {
    ...state,
    allMomentos: {
      ...state.allMomentos,
      [state.activeCultoId]: getActiveMomentos(state).map((momento) => (
        momento.id === id
          ? {
              ...momento,
              chamado: status === 'pendente' ? false : true,
              moderadorStatus: status,
            }
          : momento
      )),
    },
  },
});

export const setExecutionModeTransition = (state: RemoteCultoState, mode: ExecutionMode): TransitionResult => ({
  ok: true,
  state: { ...state, executionMode: mode },
});

export const adjustCurrentMomentDurationTransition = (state: RemoteCultoState, deltaSeconds: number): TransitionResult => {
  if (state.currentIndex < 0) {
    return { ok: false, reason: 'Nao existe momento atual para ajustar.' };
  }

  const activeMomentos = [...getActiveMomentos(state)];
  const currentMoment = activeMomentos[state.currentIndex];
  if (!currentMoment) {
    return { ok: false, reason: 'Momento atual invalido.' };
  }

  activeMomentos[state.currentIndex] = {
    ...currentMoment,
    duracao: Math.max(0, currentMoment.duracao + deltaSeconds / 60),
    duracaoOriginal: currentMoment.duracaoOriginal ?? currentMoment.duracao,
  };

  return {
    ok: true,
    state: {
      ...state,
      allMomentos: {
        ...state.allMomentos,
        [state.activeCultoId]: recalcStartTimes(activeMomentos, state.currentIndex + 1),
      },
    },
  };
};

export const setActiveCultoTransition = (state: RemoteCultoState, id: string): TransitionResult => {
  if (!state.cultos.some((culto) => culto.id === id)) {
    return { ok: false, reason: 'Culto selecionado nao existe.' };
  }
  return {
    ok: true,
    state: refreshCommands({
      ...state,
      activeCultoId: id,
      currentIndex: clampCurrentIndex(-1, state.allMomentos[id] ?? []),
      timerStatus: 'idle',
      startedAt: null,
      pausedAt: null,
      accumulatedMs: 0,
      momentStartedAt: null,
      momentPausedAt: null,
      momentAccumulatedMs: 0,
      moderadorReleaseActive: false,
      moderadorReleasePendingMomentId: null,
      moderadorReleaseGrantedMomentId: null,
    }),
  };
};

export const setCultoTransition = (state: RemoteCultoState, updater: Culto | ((current: Culto) => Culto)): TransitionResult => ({
  ok: true,
  state: {
    ...state,
    cultos: state.cultos.map((item) => (
      item.id === state.activeCultoId
        ? normalizeCulto(typeof updater === 'function' ? updater(item) : updater, item.id)
        : item
    )),
  },
});

export const setMomentosTransition = (state: RemoteCultoState, updater: MomentoProgramacao[] | ((current: MomentoProgramacao[]) => MomentoProgramacao[])): TransitionResult => {
  const currentMomentos = getActiveMomentos(state);
  const nextMomentos = typeof updater === 'function' ? updater(currentMomentos) : updater;
  return {
    ok: true,
    state: {
      ...state,
      allMomentos: {
        ...state.allMomentos,
        [state.activeCultoId]: [...nextMomentos].sort((a, b) => a.ordem - b.ordem),
      },
    },
  };
};

export const addCultoTransition = (state: RemoteCultoState, culto: Culto): TransitionResult => {
  const nextCulto = normalizeCulto(culto, culto.id || crypto.randomUUID());
  return {
    ok: true,
    state: {
      ...state,
      cultos: [...state.cultos, nextCulto],
      allMomentos: {
        ...state.allMomentos,
        [nextCulto.id]: state.allMomentos[nextCulto.id] || [],
      },
      activeCultoId: nextCulto.id,
      currentIndex: -1,
      timerStatus: 'idle',
      startedAt: null,
      pausedAt: null,
      accumulatedMs: 0,
      momentStartedAt: null,
      momentPausedAt: null,
      momentAccumulatedMs: 0,
      moderadorReleaseActive: false,
      moderadorReleasePendingMomentId: null,
      moderadorReleaseGrantedMomentId: null,
    },
  };
};

export const updateCultoTransition = (state: RemoteCultoState, culto: Culto): TransitionResult => ({
  ok: true,
  state: {
    ...state,
    cultos: state.cultos.map((existing) => existing.id === culto.id ? normalizeCulto(culto, culto.id) : existing),
  },
});

export const removeCultoTransition = (state: RemoteCultoState, id: string): TransitionResult => {
  const nextCultos = state.cultos.filter((item) => item.id !== id);
  if (nextCultos.length === 0) {
    return { ok: false, reason: 'O aplicativo precisa manter ao menos um culto.' };
  }
  const nextAllMomentos = { ...state.allMomentos };
  delete nextAllMomentos[id];
  const nextActiveCultoId = state.activeCultoId === id ? nextCultos[0].id : state.activeCultoId;
  return {
    ok: true,
    state: {
      ...state,
      cultos: nextCultos,
      allMomentos: nextAllMomentos,
      activeCultoId: nextActiveCultoId,
      currentIndex: state.activeCultoId === id ? -1 : state.currentIndex,
      timerStatus: state.activeCultoId === id ? 'idle' : state.timerStatus,
      startedAt: state.activeCultoId === id ? null : state.startedAt,
      pausedAt: state.activeCultoId === id ? null : state.pausedAt,
      accumulatedMs: state.activeCultoId === id ? 0 : state.accumulatedMs,
      momentStartedAt: state.activeCultoId === id ? null : state.momentStartedAt,
      momentPausedAt: state.activeCultoId === id ? null : state.momentPausedAt,
      momentAccumulatedMs: state.activeCultoId === id ? 0 : state.momentAccumulatedMs,
      moderadorReleaseActive: state.activeCultoId === id ? false : state.moderadorReleaseActive,
      moderadorReleasePendingMomentId: state.activeCultoId === id ? null : state.moderadorReleasePendingMomentId,
      moderadorReleaseGrantedMomentId: state.activeCultoId === id ? null : state.moderadorReleaseGrantedMomentId,
    },
  };
};

export const duplicateCultoTransition = (state: RemoteCultoState, id: string): TransitionResult => {
  const original = state.cultos.find((item) => item.id === id);
  if (!original) {
    return { ok: false, reason: 'Culto original nao encontrado.' };
  }

  const newId = crypto.randomUUID();
  const clonedCulto: Culto = {
    ...original,
    id: newId,
    nome: `${original.nome} (Copia)`,
    status: 'planejado',
  };
  const clonedMomentos = (state.allMomentos[id] || []).map((momento, index) => normalizeMomento({
    ...momento,
    id: crypto.randomUUID(),
    cultoId: newId,
    chamado: false,
    duracaoOriginal: undefined,
  }, index, newId));

  return {
    ok: true,
    state: {
      ...state,
      cultos: [...state.cultos, clonedCulto],
      allMomentos: {
        ...state.allMomentos,
        [newId]: clonedMomentos,
      },
    },
  };
};

export const addMomentoTransition = (state: RemoteCultoState, momento: MomentoProgramacao): TransitionResult => ({
  ok: true,
  state: {
    ...state,
    allMomentos: {
      ...state.allMomentos,
      [state.activeCultoId]: [...getActiveMomentos(state), normalizeMomento(momento, getActiveMomentos(state).length, state.activeCultoId)]
        .sort((a, b) => a.ordem - b.ordem),
    },
  },
});

export const updateMomentoTransition = (state: RemoteCultoState, momento: MomentoProgramacao): TransitionResult => ({
  ok: true,
  state: {
    ...state,
    allMomentos: {
      ...state.allMomentos,
      [state.activeCultoId]: getActiveMomentos(state).map((existing, index) => existing.id === momento.id ? normalizeMomento(momento, index, state.activeCultoId) : existing),
    },
  },
});

export const removeMomentoTransition = (state: RemoteCultoState, id: string): TransitionResult => ({
  ok: true,
  state: {
    ...state,
    allMomentos: {
      ...state.allMomentos,
      [state.activeCultoId]: getActiveMomentos(state).filter((momento) => momento.id !== id),
    },
  },
});

export const patchSettingsTransition = (state: RemoteCultoState, patch: Partial<CronometroSettings>): TransitionResult => ({
  ok: true,
  state: {
    ...state,
    settings: normalizeSettings({ ...state.settings, ...patch }),
  },
});

export const getMomentStatus = (state: RemoteCultoState, index: number): MomentStatus => {
  const currentIndex = state.currentIndex;
  if (currentIndex < 0) return index === 0 ? 'proximo' : 'futuro';
  if (index < currentIndex) return 'concluido';
  if (index === currentIndex) return 'executando';
  if (index === currentIndex + 1) return 'proximo';
  return 'futuro';
};

export const buildRowPayload = (state: RemoteCultoState) => {
  const snapshot = getTimerSnapshot(state);
  return {
    id: state.id,
    cultos: state.cultos,
    all_momentos: state.allMomentos,
    active_culto_id: state.activeCultoId,
    current_index: state.currentIndex,
    execution_mode: state.executionMode,
    is_paused: state.timerStatus === 'paused',
    elapsed_seconds: Math.floor(snapshot.elapsedMs / 1000),
    moment_elapsed_seconds: Math.floor(snapshot.momentElapsedMs / 1000),
    timer_started_at: state.startedAt,
    started_at: state.startedAt,
    paused_at: state.pausedAt,
    accumulated_ms: state.accumulatedMs,
    timer_status: state.timerStatus,
    moment_started_at: state.momentStartedAt,
    moment_paused_at: state.momentPausedAt,
    moment_accumulated_ms: state.momentAccumulatedMs,
    current_command: state.currentCommand,
    next_command: state.nextCommand,
    moderador_release_active: state.moderadorReleaseActive,
    moderador_release_updated_at: state.moderadorReleaseUpdatedAt,
    moderador_release_by: state.moderadorReleaseBy,
    moderador_release_pending_moment_id: state.moderadorReleasePendingMomentId,
    moderador_release_granted_moment_id: state.moderadorReleaseGrantedMomentId,
    revision: state.revision,
    updated_at: state.updatedAt,
    updated_by: state.updatedBy,
    is_blinking: state.settings.isBlinking,
    orange_threshold: state.settings.orangeThreshold,
    red_threshold: state.settings.redThreshold,
    top_font_size: state.settings.topFontSize,
    bottom_font_size: state.settings.bottomFontSize,
    timer_font_size: state.settings.timerFontSize,
    message_font_size: state.settings.messageFontSize,
    background_color: state.settings.backgroundColor,
    timer_text_color: state.settings.timerTextColor,
    top_text_color: state.settings.topTextColor,
    bottom_text_color: state.settings.bottomTextColor,
    message_text_color: state.settings.messageTextColor,
    warning_color: state.settings.warningColor,
    danger_color: state.settings.dangerColor,
    message: state.settings.message,
    show_message: state.settings.showMessage,
  };
};
