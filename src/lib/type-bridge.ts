// =============================================================================
// Type Bridge: Culto (legacy) <-> Platform (new)
// Conversion functions between the two type systems.
// =============================================================================

import type { Culto, CultoStatus, MomentoProgramacao, TipoMomento, TipoMidia } from '@/types/culto';
import type { Session, SessionStatus, Moment, MomentType } from '@/domains/platform/types';

// -------------------------------------------------------
// Status mappings
// -------------------------------------------------------

const cultoStatusToSessionStatus: Record<CultoStatus, SessionStatus> = {
  planejado: 'planned',
  em_andamento: 'live',
  finalizado: 'finished',
};

const sessionStatusToCultoStatus: Record<SessionStatus, CultoStatus> = {
  draft: 'planejado',
  planned: 'planejado',
  live: 'em_andamento',
  paused: 'em_andamento',
  finished: 'finalizado',
  archived: 'finalizado',
};

// -------------------------------------------------------
// TipoMomento <-> MomentType mappings
// -------------------------------------------------------

const tipoMomentoToMomentType: Record<TipoMomento, MomentType> = {
  musica_ao_vivo: 'musica_ao_vivo',
  playback: 'playback',
  video: 'video',
  vinheta: 'vinheta',
  oracao: 'oracao',
  fala: 'fala',
  aviso: 'aviso',
  fundo_musical: 'playback',
  nenhum: 'nenhum',
};

const momentTypeToTipoMomento: Record<MomentType, TipoMomento> = {
  musica_ao_vivo: 'musica_ao_vivo',
  playback: 'playback',
  video: 'video',
  vinheta: 'vinheta',
  oracao: 'oracao',
  fala: 'fala',
  aviso: 'aviso',
  leitura: 'fala',
  ceia: 'nenhum',
  ofertorio: 'nenhum',
  batismo: 'nenhum',
  outro: 'nenhum',
  nenhum: 'nenhum',
};

// -------------------------------------------------------
// TipoMidia -> trigger flags
// -------------------------------------------------------

function tipoMidiaToFlags(tipoMidia: TipoMidia): { trigger_media: boolean; trigger_alert: boolean } {
  switch (tipoMidia) {
    case 'audio':
      return { trigger_media: true, trigger_alert: false };
    case 'video':
      return { trigger_media: true, trigger_alert: false };
    default:
      return { trigger_media: false, trigger_alert: false };
  }
}

function flagsToTipoMidia(moment: Moment): TipoMidia {
  if (!moment.trigger_media) return 'nenhum';
  if (moment.type === 'video' || moment.type === 'vinheta') return 'video';
  if (moment.type === 'musica_ao_vivo' || moment.type === 'playback') return 'audio';
  return 'audio';
}

// -------------------------------------------------------
// Culto -> Session
// -------------------------------------------------------

const DEFAULT_ORG = '00000000-0000-0000-0000-000000000000';

export function cultoToSession(culto: Culto): Session {
  const now = new Date().toISOString();
  return {
    id: culto.id,
    organization_id: DEFAULT_ORG,
    title: culto.nome,
    date: culto.data,
    status: cultoStatusToSessionStatus[culto.status],
    auto_mode: false,
    current_moment_id: null,
    revision: 0,
    active_base_id: null,
    sync_session_id: null,
    created_at: now,
    updated_at: now,
    updated_by: 'system',
  };
}

// -------------------------------------------------------
// Session -> Culto
// -------------------------------------------------------

export function sessionToCulto(session: Session): Culto {
  return {
    id: session.id,
    nome: session.title,
    data: session.date,
    horarioInicial: '00:00',
    duracaoPrevista: 120,
    status: sessionStatusToCultoStatus[session.status],
  };
}

// -------------------------------------------------------
// MomentoProgramacao -> Moment
// -------------------------------------------------------

export function momentoToMoment(m: MomentoProgramacao, sessionId: string): Moment {
  const { trigger_media, trigger_alert } = tipoMidiaToFlags(m.tipoMidia);
  const now = new Date().toISOString();
  return {
    id: m.id,
    session_id: sessionId,
    title: m.atividade,
    type: tipoMomentoToMomentType[m.tipoMomento],
    sort_order: m.ordem,
    planned_start: m.horarioInicio || null,
    planned_duration_seconds: m.duracao * 60,
    requires_manual_confirmation: m.antecedenciaChamada > 0,
    auto_advance: false,
    trigger_media,
    trigger_alert,
    responsible: m.responsavel || null,
    ministry: m.ministerio || null,
    notes: [m.observacao, m.acaoSonoplastia].filter(Boolean).join(' | ') || null,
    created_at: now,
    updated_at: now,
  };
}

// -------------------------------------------------------
// Moment -> MomentoProgramacao
// -------------------------------------------------------

export function momentToMomento(m: Moment, cultoId: string): MomentoProgramacao {
  return {
    id: m.id,
    cultoId,
    ordem: m.sort_order,
    bloco: '',
    horarioInicio: m.planned_start ?? '00:00',
    duracao: Math.round(m.planned_duration_seconds / 60),
    atividade: m.title,
    responsavel: m.responsible ?? '',
    ministerio: m.ministry ?? '',
    funcao: '',
    fotoUrl: '',
    tipoMomento: momentTypeToTipoMomento[m.type],
    tipoMidia: flagsToTipoMidia(m),
    acaoSonoplastia: '',
    observacao: m.notes ?? '',
    antecedenciaChamada: m.requires_manual_confirmation ? 10 : 0,
    chamado: false,
  };
}

// -------------------------------------------------------
// Batch helpers
// -------------------------------------------------------

export function momentosToMoments(momentos: MomentoProgramacao[], sessionId: string): Moment[] {
  return momentos.map((m) => momentoToMoment(m, sessionId));
}

export function momentsToMomentos(moments: Moment[], cultoId: string): MomentoProgramacao[] {
  return moments.map((m) => momentToMomento(m, cultoId));
}

// -------------------------------------------------------
// MomentoProgramacao ID extractor (for queries)
// -------------------------------------------------------

export function getMomentoIds(momentos: MomentoProgramacao[]): string[] {
  return momentos.map((m) => m.id);
}
