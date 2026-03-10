import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { Culto, ExecutionMode, MomentStatus, MomentoProgramacao } from '@/types/culto';
import { calcularHorarioTermino } from '@/types/culto';

interface CultoContextType {
  cultos: Culto[];
  addCulto: (c: Culto) => void;
  updateCulto: (c: Culto) => void;
  removeCulto: (id: string) => void;
  duplicateCulto: (id: string) => void;
  activeCultoId: string;
  setActiveCultoId: (id: string) => void;
  culto: Culto;
  setCulto: React.Dispatch<React.SetStateAction<Culto>>;
  momentos: MomentoProgramacao[];
  allMomentos: Record<string, MomentoProgramacao[]>;
  setMomentos: React.Dispatch<React.SetStateAction<MomentoProgramacao[]>>;
  currentIndex: number;
  executionMode: ExecutionMode;
  setExecutionMode: (mode: ExecutionMode) => void;
  isPaused: boolean;
  elapsedSeconds: number;
  momentElapsedSeconds: number;
  avancar: () => void;
  voltar: () => void;
  pausar: () => void;
  retomar: () => void;
  pular: () => void;
  iniciarCulto: () => void;
  finalizarCulto: () => void;
  getMomentStatus: (index: number) => MomentStatus;
  marcarChamado: (id: string) => void;
  addMomento: (m: MomentoProgramacao) => void;
  updateMomento: (m: MomentoProgramacao) => void;
  removeMomento: (id: string) => void;
  adjustCurrentMomentDuration: (deltaSeconds: number) => void;
}

type SyncRow = Tables<'culto_sync_state'>;

interface CultoSyncState {
  cultos: Culto[];
  allMomentos: Record<string, MomentoProgramacao[]>;
  activeCultoId: string;
  currentIndex: number;
  executionMode: ExecutionMode;
  isPaused: boolean;
  elapsedBaseSeconds: number;
  momentElapsedBaseSeconds: number;
  timerStartedAt: string | null;
}

const SYNC_ROW_ID = 'main';

const CultoContext = createContext<CultoContextType | null>(null);

const SAMPLE_CULTOS: Culto[] = [
  {
    id: '1',
    nome: 'Culto de Domingo',
    data: new Date().toISOString().split('T')[0],
    horarioInicial: '09:00',
    duracaoPrevista: 120,
    status: 'planejado',
  },
  {
    id: '2',
    nome: 'Culto de Quarta',
    data: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    horarioInicial: '19:30',
    duracaoPrevista: 90,
    status: 'planejado',
  },
];

const SAMPLE_MOMENTOS: Record<string, MomentoProgramacao[]> = {
  '1': [
    { id: '1', cultoId: '1', ordem: 0, bloco: 'Abertura', horarioInicio: '09:00', duracao: 5, atividade: 'Vinheta de Abertura', responsavel: 'Equipe de Midia', ministerio: 'Midia', funcao: 'Operador', fotoUrl: '', tipoMomento: 'vinheta', tipoMidia: 'video', acaoSonoplastia: 'Iniciar vinheta', observacao: '', antecedenciaChamada: 10, chamado: false },
    { id: '2', cultoId: '1', ordem: 1, bloco: 'Louvor', horarioInicio: '09:05', duracao: 15, atividade: 'Louvor e Adoracao', responsavel: 'Maria Silva', ministerio: 'Louvor', funcao: 'Lider de Louvor', fotoUrl: '', tipoMomento: 'musica_ao_vivo', tipoMidia: 'audio', acaoSonoplastia: 'Habilitar microfones do louvor', observacao: 'Repertorio confirmado', antecedenciaChamada: 10, chamado: false },
    { id: '3', cultoId: '1', ordem: 2, bloco: 'Louvor', horarioInicio: '09:20', duracao: 10, atividade: 'Louvor Especial', responsavel: 'Joao Santos', ministerio: 'Louvor', funcao: 'Cantor', fotoUrl: '', tipoMomento: 'musica_ao_vivo', tipoMidia: 'audio', acaoSonoplastia: 'Mic solo', observacao: '', antecedenciaChamada: 10, chamado: false },
    { id: '4', cultoId: '1', ordem: 3, bloco: 'Palavra', horarioInicio: '09:30', duracao: 5, atividade: 'Oracao Pastoral', responsavel: 'Pr. Carlos', ministerio: 'Pastoral', funcao: 'Pastor', fotoUrl: '', tipoMomento: 'oracao', tipoMidia: 'nenhum', acaoSonoplastia: 'Fundo musical suave', observacao: '', antecedenciaChamada: 5, chamado: false },
    { id: '5', cultoId: '1', ordem: 4, bloco: 'Palavra', horarioInicio: '09:35', duracao: 5, atividade: 'Avisos da Semana', responsavel: 'Ana Costa', ministerio: 'Comunicacao', funcao: 'Apresentadora', fotoUrl: '', tipoMomento: 'aviso', tipoMidia: 'video', acaoSonoplastia: 'Slides de avisos', observacao: '', antecedenciaChamada: 10, chamado: false },
    { id: '6', cultoId: '1', ordem: 5, bloco: 'Palavra', horarioInicio: '09:40', duracao: 40, atividade: 'Mensagem', responsavel: 'Pr. Carlos', ministerio: 'Pastoral', funcao: 'Pregador', fotoUrl: '', tipoMomento: 'fala', tipoMidia: 'nenhum', acaoSonoplastia: 'Mic pulpito', observacao: 'Tema: Fe e Esperanca', antecedenciaChamada: 5, chamado: false },
    { id: '7', cultoId: '1', ordem: 6, bloco: 'Encerramento', horarioInicio: '10:20', duracao: 10, atividade: 'Oracao Final e Bencao', responsavel: 'Pr. Carlos', ministerio: 'Pastoral', funcao: 'Pastor', fotoUrl: '', tipoMomento: 'oracao', tipoMidia: 'nenhum', acaoSonoplastia: 'Fundo musical', observacao: '', antecedenciaChamada: 5, chamado: false },
    { id: '8', cultoId: '1', ordem: 7, bloco: 'Encerramento', horarioInicio: '10:30', duracao: 5, atividade: 'Vinheta de Encerramento', responsavel: 'Equipe de Midia', ministerio: 'Midia', funcao: 'Operador', fotoUrl: '', tipoMomento: 'vinheta', tipoMidia: 'video', acaoSonoplastia: 'Iniciar vinheta final', observacao: '', antecedenciaChamada: 5, chamado: false },
  ],
  '2': [
    { id: '9', cultoId: '2', ordem: 0, bloco: 'Louvor', horarioInicio: '19:30', duracao: 20, atividade: 'Louvor e Adoracao', responsavel: 'Maria Silva', ministerio: 'Louvor', funcao: 'Lider de Louvor', fotoUrl: '', tipoMomento: 'musica_ao_vivo', tipoMidia: 'audio', acaoSonoplastia: 'Habilitar microfones', observacao: '', antecedenciaChamada: 10, chamado: false },
    { id: '10', cultoId: '2', ordem: 1, bloco: 'Palavra', horarioInicio: '19:50', duracao: 45, atividade: 'Estudo Biblico', responsavel: 'Pr. Carlos', ministerio: 'Pastoral', funcao: 'Pastor', fotoUrl: '', tipoMomento: 'fala', tipoMidia: 'nenhum', acaoSonoplastia: 'Mic pulpito', observacao: '', antecedenciaChamada: 5, chamado: false },
  ],
};

const defaultSyncState: CultoSyncState = {
  cultos: SAMPLE_CULTOS,
  allMomentos: SAMPLE_MOMENTOS,
  activeCultoId: SAMPLE_CULTOS[0]?.id ?? '',
  currentIndex: -1,
  executionMode: 'manual',
  isPaused: false,
  elapsedBaseSeconds: 0,
  momentElapsedBaseSeconds: 0,
  timerStartedAt: null,
};

const isExecutionMode = (value: unknown): value is ExecutionMode => value === 'manual' || value === 'automatico';

const normalizeCulto = (value: Partial<Culto> | null | undefined, fallbackId: string): Culto => ({
  id: typeof value?.id === 'string' && value.id.trim() ? value.id : fallbackId,
  nome: typeof value?.nome === 'string' ? value.nome : '',
  data: typeof value?.data === 'string' && value.data ? value.data : new Date().toISOString().split('T')[0],
  horarioInicial: typeof value?.horarioInicial === 'string' && value.horarioInicial.includes(':') ? value.horarioInicial : '00:00',
  duracaoPrevista: Number.isFinite(value?.duracaoPrevista) ? Math.max(0, Number(value?.duracaoPrevista)) : 0,
  status: value?.status === 'em_andamento' || value?.status === 'finalizado' ? value.status : 'planejado',
});

const normalizeMomento = (momento: Partial<MomentoProgramacao> | null | undefined, index: number, cultoId = ''): MomentoProgramacao => ({
  id: typeof momento?.id === 'string' && momento.id.trim() ? momento.id : `momento-${cultoId || 'sem-culto'}-${index}`,
  cultoId: typeof momento?.cultoId === 'string' && momento.cultoId.trim() ? momento.cultoId : cultoId,
  ordem: Number.isFinite(momento?.ordem) ? Number(momento?.ordem) : index,
  bloco: typeof momento?.bloco === 'string' ? momento.bloco : '',
  horarioInicio: typeof momento?.horarioInicio === 'string' && momento.horarioInicio.includes(':') ? momento.horarioInicio : '00:00',
  duracao: Number.isFinite(momento?.duracao) ? Math.max(0, Number(momento?.duracao)) : 0,
  atividade: typeof momento?.atividade === 'string' ? momento.atividade : '',
  responsavel: typeof momento?.responsavel === 'string' ? momento.responsavel : '',
  ministerio: typeof momento?.ministerio === 'string' ? momento.ministerio : '',
  funcao: typeof momento?.funcao === 'string' ? momento.funcao : '',
  fotoUrl: typeof momento?.fotoUrl === 'string' ? momento.fotoUrl : '',
  tipoMomento: momento?.tipoMomento ?? 'nenhum',
  tipoMidia: momento?.tipoMidia ?? 'nenhum',
  acaoSonoplastia: typeof momento?.acaoSonoplastia === 'string' ? momento.acaoSonoplastia : '',
  observacao: typeof momento?.observacao === 'string' ? momento.observacao : '',
  antecedenciaChamada: Number.isFinite(momento?.antecedenciaChamada) ? Math.max(0, Number(momento?.antecedenciaChamada)) : 0,
  chamado: Boolean(momento?.chamado),
  duracaoOriginal: Number.isFinite(momento?.duracaoOriginal) ? Number(momento?.duracaoOriginal) : undefined,
});

const normalizeMomentosRecord = (value: unknown, cultos: Culto[]) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const result: Record<string, MomentoProgramacao[]> = {};

  cultos.forEach((culto) => {
    const rawMomentos = Array.isArray(source[culto.id]) ? source[culto.id] : [];
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

const normalizeSyncState = (row?: Partial<SyncRow> | Partial<CultoSyncState> | null): CultoSyncState => {
  const rowState = row as Partial<CultoSyncState> | undefined;
  const cultosSource = Array.isArray(row?.cultos)
    ? row.cultos
    : Array.isArray(rowState?.cultos)
      ? rowState.cultos
      : SAMPLE_CULTOS;
  const cultos = (cultosSource as unknown[]).map((item, index) => normalizeCulto(item as Partial<Culto>, `culto-${index + 1}`));
  const safeCultos = cultos.length > 0 ? cultos : SAMPLE_CULTOS;
  const activeCultoIdRaw = typeof row?.active_culto_id === 'string'
    ? row.active_culto_id
    : typeof rowState?.activeCultoId === 'string'
      ? rowState.activeCultoId
      : safeCultos[0]?.id ?? '';
  const activeCultoId = safeCultos.some((culto) => culto.id === activeCultoIdRaw) ? activeCultoIdRaw : (safeCultos[0]?.id ?? '');
  const allMomentos = normalizeMomentosRecord(row?.all_momentos ?? rowState?.allMomentos ?? SAMPLE_MOMENTOS, safeCultos);
  const activeMomentos = allMomentos[activeCultoId] || [];

  return {
    cultos: safeCultos,
    allMomentos,
    activeCultoId,
    currentIndex: clampCurrentIndex(
      typeof row?.current_index === 'number' ? row.current_index : Number(rowState?.currentIndex ?? -1),
      activeMomentos,
    ),
    executionMode: isExecutionMode(row?.execution_mode) ? row.execution_mode : isExecutionMode(rowState?.executionMode) ? rowState.executionMode : 'manual',
    isPaused: typeof row?.is_paused === 'boolean' ? row.is_paused : Boolean(rowState?.isPaused),
    elapsedBaseSeconds: Number.isFinite(row?.elapsed_seconds) ? Math.max(0, Number(row.elapsed_seconds)) : Number.isFinite(rowState?.elapsedBaseSeconds) ? Math.max(0, Number(rowState?.elapsedBaseSeconds)) : 0,
    momentElapsedBaseSeconds: Number.isFinite(row?.moment_elapsed_seconds) ? Math.max(0, Number(row.moment_elapsed_seconds)) : Number.isFinite(rowState?.momentElapsedBaseSeconds) ? Math.max(0, Number(rowState?.momentElapsedBaseSeconds)) : 0,
    timerStartedAt: typeof row?.timer_started_at === 'string' ? row.timer_started_at : typeof rowState?.timerStartedAt === 'string' ? rowState.timerStartedAt : null,
  };
};

const isTimerRunning = (state: CultoSyncState) => {
  const activeCulto = state.cultos.find((item) => item.id === state.activeCultoId);
  return activeCulto?.status === 'em_andamento' && !state.isPaused && state.currentIndex >= 0 && Boolean(state.timerStartedAt);
};

const computeElapsed = (state: CultoSyncState) => {
  if (!isTimerRunning(state) || !state.timerStartedAt) {
    return {
      elapsed: Math.max(0, state.elapsedBaseSeconds),
      momentElapsed: Math.max(0, state.momentElapsedBaseSeconds),
    };
  }

  const startedAt = Date.parse(state.timerStartedAt);
  if (!Number.isFinite(startedAt)) {
    return {
      elapsed: Math.max(0, state.elapsedBaseSeconds),
      momentElapsed: Math.max(0, state.momentElapsedBaseSeconds),
    };
  }

  const delta = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  return {
    elapsed: Math.max(0, state.elapsedBaseSeconds + delta),
    momentElapsed: Math.max(0, state.momentElapsedBaseSeconds + delta),
  };
};

const buildPayload = (state: CultoSyncState) => ({
  id: SYNC_ROW_ID,
  cultos: state.cultos,
  all_momentos: state.allMomentos,
  active_culto_id: state.activeCultoId,
  current_index: state.currentIndex,
  execution_mode: state.executionMode,
  is_paused: state.isPaused,
  elapsed_seconds: state.elapsedBaseSeconds,
  moment_elapsed_seconds: state.momentElapsedBaseSeconds,
  timer_started_at: state.timerStartedAt,
  updated_at: new Date().toISOString(),
});

const recalcStartTimes = (moms: MomentoProgramacao[], fromIndex: number): MomentoProgramacao[] => {
  const result = [...moms];
  for (let i = fromIndex; i < result.length; i += 1) {
    if (i === 0) continue;
    const prev = result[i - 1];
    result[i] = { ...result[i], horarioInicio: calcularHorarioTermino(prev.horarioInicio, prev.duracao) };
  }
  return result;
};

export const CultoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [syncState, setSyncState] = useState<CultoSyncState>(defaultSyncState);
  const [displayElapsed, setDisplayElapsed] = useState(0);
  const [displayMomentElapsed, setDisplayMomentElapsed] = useState(0);
  const syncStateRef = useRef(syncState);
  const doAvancarRef = useRef<() => void>(() => {});

  const applySyncState = useCallback((next: CultoSyncState) => {
    syncStateRef.current = next;
    setSyncState(next);
    const computed = computeElapsed(next);
    setDisplayElapsed(computed.elapsed);
    setDisplayMomentElapsed(computed.momentElapsed);
  }, []);

  const publishState = useCallback(async (next: CultoSyncState) => {
    const { error } = await supabase
      .from('culto_sync_state')
      .upsert(buildPayload(next), { onConflict: 'id' });

    if (error) {
      console.error('Falha ao sincronizar estado do culto:', error);
    }
  }, []);

  const commitState = useCallback((updater: (current: CultoSyncState) => CultoSyncState) => {
    const next = normalizeSyncState(updater(syncStateRef.current));
    applySyncState(next);
    void publishState(next);
  }, [applySyncState, publishState]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const { data, error } = await supabase
        .from('culto_sync_state')
        .select('*')
        .eq('id', SYNC_ROW_ID)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error('Falha ao carregar estado sincronizado do culto:', error);
        applySyncState(defaultSyncState);
        return;
      }

      if (!data) {
        const next = normalizeSyncState(defaultSyncState);
        applySyncState(next);
        await publishState(next);
        return;
      }

      applySyncState(normalizeSyncState(data));
    };

    void bootstrap();

    const channel = supabase
      .channel('culto-sync-state')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'culto_sync_state',
        filter: `id=eq.${SYNC_ROW_ID}`,
      }, (payload) => {
        if (!active || !payload.new) return;
        applySyncState(normalizeSyncState(payload.new as Partial<SyncRow>));
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [applySyncState, publishState]);

  useEffect(() => {
    let lastAutoSecond = -1;
    const interval = window.setInterval(() => {
      const current = syncStateRef.current;
      const computed = computeElapsed(current);
      setDisplayElapsed((prev) => (prev === computed.elapsed ? prev : computed.elapsed));
      setDisplayMomentElapsed((prev) => (prev === computed.momentElapsed ? prev : computed.momentElapsed));

      if (
        current.executionMode === 'automatico' &&
        isTimerRunning(current) &&
        Math.floor(computed.momentElapsed) !== lastAutoSecond
      ) {
        lastAutoSecond = Math.floor(computed.momentElapsed);
        const activeMomentos = current.allMomentos[current.activeCultoId] || [];
        const currentMoment = activeMomentos[current.currentIndex];
        if (currentMoment && computed.momentElapsed >= currentMoment.duracao * 60) {
          doAvancarRef.current();
        }
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, []);

  const cultos = syncState.cultos;
  const activeCultoId = syncState.activeCultoId;
  const culto = useMemo(
    () => cultos.find((item) => item.id === activeCultoId) || cultos[0] || SAMPLE_CULTOS[0],
    [cultos, activeCultoId],
  );
  const allMomentos = syncState.allMomentos;
  const momentos = useMemo(
    () => allMomentos[activeCultoId] || [],
    [allMomentos, activeCultoId],
  );

  const setCulto: React.Dispatch<React.SetStateAction<Culto>> = useCallback((valueOrFn) => {
    commitState((current) => ({
      ...current,
      cultos: current.cultos.map((item) => (
        item.id === current.activeCultoId
          ? typeof valueOrFn === 'function'
            ? valueOrFn(item)
            : valueOrFn
          : item
      )),
    }));
  }, [commitState]);

  const setMomentos: React.Dispatch<React.SetStateAction<MomentoProgramacao[]>> = useCallback((valueOrFn) => {
    commitState((current) => {
      const currentMomentos = current.allMomentos[current.activeCultoId] || [];
      const nextMomentos = typeof valueOrFn === 'function' ? valueOrFn(currentMomentos) : valueOrFn;
      return {
        ...current,
        allMomentos: {
          ...current.allMomentos,
          [current.activeCultoId]: [...nextMomentos].sort((a, b) => a.ordem - b.ordem),
        },
      };
    });
  }, [commitState]);

  const addCulto = useCallback((c: Culto) => {
    commitState((current) => ({
      ...current,
      cultos: [...current.cultos, normalizeCulto(c, c.id || crypto.randomUUID())],
      allMomentos: {
        ...current.allMomentos,
        [c.id]: current.allMomentos[c.id] || [],
      },
      activeCultoId: c.id,
      currentIndex: -1,
      elapsedBaseSeconds: 0,
      momentElapsedBaseSeconds: 0,
      timerStartedAt: null,
      isPaused: false,
    }));
  }, [commitState]);

  const updateCulto = useCallback((c: Culto) => {
    commitState((current) => ({
      ...current,
      cultos: current.cultos.map((existing) => existing.id === c.id ? normalizeCulto(c, c.id) : existing),
    }));
  }, [commitState]);

  const removeCulto = useCallback((id: string) => {
    commitState((current) => {
      const nextCultos = current.cultos.filter((item) => item.id !== id);
      const nextAllMomentos = { ...current.allMomentos };
      delete nextAllMomentos[id];
      const nextActiveCultoId = current.activeCultoId === id ? (nextCultos[0]?.id ?? current.activeCultoId) : current.activeCultoId;

      return {
        ...current,
        cultos: nextCultos.length > 0 ? nextCultos : current.cultos,
        allMomentos: Object.keys(nextAllMomentos).length > 0 ? nextAllMomentos : current.allMomentos,
        activeCultoId: nextActiveCultoId,
        currentIndex: current.activeCultoId === id ? -1 : current.currentIndex,
        elapsedBaseSeconds: current.activeCultoId === id ? 0 : current.elapsedBaseSeconds,
        momentElapsedBaseSeconds: current.activeCultoId === id ? 0 : current.momentElapsedBaseSeconds,
        timerStartedAt: current.activeCultoId === id ? null : current.timerStartedAt,
        isPaused: current.activeCultoId === id ? false : current.isPaused,
      };
    });
  }, [commitState]);

  const duplicateCulto = useCallback((id: string) => {
    commitState((current) => {
      const original = current.cultos.find((item) => item.id === id);
      if (!original) return current;

      const newId = crypto.randomUUID();
      const clonedCulto: Culto = {
        ...original,
        id: newId,
        nome: `${original.nome} (Copia)`,
        status: 'planejado',
      };
      const clonedMomentos = (current.allMomentos[id] || []).map((momento, index) => normalizeMomento({
        ...momento,
        id: crypto.randomUUID(),
        cultoId: newId,
        chamado: false,
        duracaoOriginal: undefined,
      }, index, newId));

      return {
        ...current,
        cultos: [...current.cultos, clonedCulto],
        allMomentos: {
          ...current.allMomentos,
          [newId]: clonedMomentos,
        },
      };
    });
  }, [commitState]);

  const doAvancar = useCallback(() => {
    commitState((current) => {
      const activeMomentos = current.allMomentos[current.activeCultoId] || [];
      const computed = computeElapsed(current);

      if (current.currentIndex < activeMomentos.length - 1) {
        return {
          ...current,
          currentIndex: current.currentIndex + 1,
          elapsedBaseSeconds: computed.elapsed,
          momentElapsedBaseSeconds: 0,
          timerStartedAt: new Date().toISOString(),
          isPaused: false,
        };
      }

      return {
        ...current,
        cultos: current.cultos.map((item) => item.id === current.activeCultoId ? { ...item, status: 'finalizado' } : item),
        elapsedBaseSeconds: computed.elapsed,
        momentElapsedBaseSeconds: computed.momentElapsed,
        timerStartedAt: null,
        isPaused: true,
      };
    });
  }, [commitState]);

  doAvancarRef.current = doAvancar;

  const avancar = useCallback(() => {
    doAvancar();
  }, [doAvancar]);

  const voltar = useCallback(() => {
    commitState((current) => {
      if (current.currentIndex <= 0) return current;
      const computed = computeElapsed(current);
      return {
        ...current,
        currentIndex: current.currentIndex - 1,
        elapsedBaseSeconds: computed.elapsed,
        momentElapsedBaseSeconds: 0,
        timerStartedAt: new Date().toISOString(),
        isPaused: false,
      };
    });
  }, [commitState]);

  const pausar = useCallback(() => {
    commitState((current) => {
      const computed = computeElapsed(current);
      return {
        ...current,
        elapsedBaseSeconds: computed.elapsed,
        momentElapsedBaseSeconds: computed.momentElapsed,
        timerStartedAt: null,
        isPaused: true,
      };
    });
  }, [commitState]);

  const retomar = useCallback(() => {
    commitState((current) => {
      const activeCultoItem = current.cultos.find((item) => item.id === current.activeCultoId);
      if (activeCultoItem?.status !== 'em_andamento') return current;
      return {
        ...current,
        timerStartedAt: new Date().toISOString(),
        isPaused: false,
      };
    });
  }, [commitState]);

  const pular = useCallback(() => {
    doAvancar();
  }, [doAvancar]);

  const iniciarCulto = useCallback(() => {
    commitState((current) => {
      const nextMomentos = (current.allMomentos[current.activeCultoId] || []).map((momento) => ({
        ...momento,
        duracaoOriginal: momento.duracaoOriginal ?? momento.duracao,
        chamado: false,
      }));

      return {
        ...current,
        cultos: current.cultos.map((item) => item.id === current.activeCultoId ? { ...item, status: 'em_andamento' } : item),
        allMomentos: {
          ...current.allMomentos,
          [current.activeCultoId]: nextMomentos,
        },
        currentIndex: nextMomentos.length > 0 ? 0 : -1,
        elapsedBaseSeconds: 0,
        momentElapsedBaseSeconds: 0,
        timerStartedAt: nextMomentos.length > 0 ? new Date().toISOString() : null,
        isPaused: false,
      };
    });
  }, [commitState]);

  const finalizarCulto = useCallback(() => {
    commitState((current) => {
      const computed = computeElapsed(current);
      return {
        ...current,
        cultos: current.cultos.map((item) => item.id === current.activeCultoId ? { ...item, status: 'finalizado' } : item),
        elapsedBaseSeconds: computed.elapsed,
        momentElapsedBaseSeconds: computed.momentElapsed,
        timerStartedAt: null,
        isPaused: true,
      };
    });
  }, [commitState]);

  const getMomentStatus = useCallback((index: number): MomentStatus => {
    const currentIndex = syncState.currentIndex;
    if (currentIndex < 0) return index === 0 ? 'proximo' : 'futuro';
    if (index < currentIndex) return 'concluido';
    if (index === currentIndex) return 'executando';
    if (index === currentIndex + 1) return 'proximo';
    return 'futuro';
  }, [syncState.currentIndex]);

  const marcarChamado = useCallback((id: string) => {
    commitState((current) => ({
      ...current,
      allMomentos: {
        ...current.allMomentos,
        [current.activeCultoId]: (current.allMomentos[current.activeCultoId] || []).map((momento) => (
          momento.id === id ? { ...momento, chamado: true } : momento
        )),
      },
    }));
  }, [commitState]);

  const addMomento = useCallback((m: MomentoProgramacao) => {
    commitState((current) => ({
      ...current,
      allMomentos: {
        ...current.allMomentos,
        [current.activeCultoId]: [...(current.allMomentos[current.activeCultoId] || []), normalizeMomento(m, (current.allMomentos[current.activeCultoId] || []).length, current.activeCultoId)]
          .sort((a, b) => a.ordem - b.ordem),
      },
    }));
  }, [commitState]);

  const updateMomento = useCallback((m: MomentoProgramacao) => {
    commitState((current) => ({
      ...current,
      allMomentos: {
        ...current.allMomentos,
        [current.activeCultoId]: (current.allMomentos[current.activeCultoId] || []).map((existing, index) => (
          existing.id === m.id ? normalizeMomento(m, index, current.activeCultoId) : existing
        )),
      },
    }));
  }, [commitState]);

  const removeMomento = useCallback((id: string) => {
    commitState((current) => ({
      ...current,
      allMomentos: {
        ...current.allMomentos,
        [current.activeCultoId]: (current.allMomentos[current.activeCultoId] || []).filter((momento) => momento.id !== id),
      },
    }));
  }, [commitState]);

  const adjustCurrentMomentDuration = useCallback((deltaSeconds: number) => {
    commitState((current) => {
      if (current.currentIndex < 0) return current;
      const activeMomentos = [...(current.allMomentos[current.activeCultoId] || [])];
      const currentMoment = activeMomentos[current.currentIndex];
      if (!currentMoment) return current;

      activeMomentos[current.currentIndex] = {
        ...currentMoment,
        duracao: Math.max(0, currentMoment.duracao + deltaSeconds / 60),
        duracaoOriginal: currentMoment.duracaoOriginal ?? currentMoment.duracao,
      };

      return {
        ...current,
        allMomentos: {
          ...current.allMomentos,
          [current.activeCultoId]: recalcStartTimes(activeMomentos, current.currentIndex + 1),
        },
      };
    });
  }, [commitState]);

  const setExecutionMode = useCallback((mode: ExecutionMode) => {
    commitState((current) => ({ ...current, executionMode: mode }));
  }, [commitState]);

  const handleSetActiveCultoId = useCallback((id: string) => {
    commitState((current) => ({
      ...current,
      activeCultoId: current.cultos.some((item) => item.id === id) ? id : current.activeCultoId,
    }));
  }, [commitState]);

  const value = useMemo<CultoContextType>(() => ({
    cultos,
    addCulto,
    updateCulto,
    removeCulto,
    duplicateCulto,
    activeCultoId,
    setActiveCultoId: handleSetActiveCultoId,
    culto,
    setCulto,
    momentos,
    allMomentos,
    setMomentos,
    currentIndex: syncState.currentIndex,
    executionMode: syncState.executionMode,
    setExecutionMode,
    isPaused: syncState.isPaused,
    elapsedSeconds: displayElapsed,
    momentElapsedSeconds: displayMomentElapsed,
    avancar,
    voltar,
    pausar,
    retomar,
    pular,
    iniciarCulto,
    finalizarCulto,
    getMomentStatus,
    marcarChamado,
    addMomento,
    updateMomento,
    removeMomento,
    adjustCurrentMomentDuration,
  }), [
    cultos,
    addCulto,
    updateCulto,
    removeCulto,
    duplicateCulto,
    activeCultoId,
    handleSetActiveCultoId,
    culto,
    setCulto,
    momentos,
    allMomentos,
    setMomentos,
    syncState.currentIndex,
    syncState.executionMode,
    syncState.isPaused,
    setExecutionMode,
    displayElapsed,
    displayMomentElapsed,
    avancar,
    voltar,
    pausar,
    retomar,
    pular,
    iniciarCulto,
    finalizarCulto,
    getMomentStatus,
    marcarChamado,
    addMomento,
    updateMomento,
    removeMomento,
    adjustCurrentMomentDuration,
  ]);

  return (
    <CultoContext.Provider value={value}>
      {children}
    </CultoContext.Provider>
  );
};

export const useCulto = () => {
  const ctx = useContext(CultoContext);
  if (!ctx) throw new Error('useCulto must be used within CultoProvider');
  return ctx;
};
