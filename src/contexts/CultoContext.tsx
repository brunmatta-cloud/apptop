import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { Culto, MomentoProgramacao, ExecutionMode, MomentStatus } from '@/types/culto';
import { calcularHorarioTermino } from '@/types/culto';
import { supabase } from '@/integrations/supabase/client';

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
    { id: '1', cultoId: '1', ordem: 0, bloco: 'Abertura', horarioInicio: '09:00', duracao: 5, atividade: 'Vinheta de Abertura', responsavel: 'Equipe de Mídia', ministerio: 'Mídia', funcao: 'Operador', fotoUrl: '', tipoMomento: 'vinheta', tipoMidia: 'video', acaoSonoplastia: 'Iniciar vinheta', observacao: '', antecedenciaChamada: 10, chamado: false },
    { id: '2', cultoId: '1', ordem: 1, bloco: 'Louvor', horarioInicio: '09:05', duracao: 15, atividade: 'Louvor e Adoração', responsavel: 'Maria Silva', ministerio: 'Louvor', funcao: 'Líder de Louvor', fotoUrl: '', tipoMomento: 'musica_ao_vivo', tipoMidia: 'audio', acaoSonoplastia: 'Habilitar microfones do louvor', observacao: 'Repertório confirmado', antecedenciaChamada: 10, chamado: false },
    { id: '3', cultoId: '1', ordem: 2, bloco: 'Louvor', horarioInicio: '09:20', duracao: 10, atividade: 'Louvor Especial', responsavel: 'João Santos', ministerio: 'Louvor', funcao: 'Cantor', fotoUrl: '', tipoMomento: 'musica_ao_vivo', tipoMidia: 'audio', acaoSonoplastia: 'Mic solo', observacao: '', antecedenciaChamada: 10, chamado: false },
    { id: '4', cultoId: '1', ordem: 3, bloco: 'Palavra', horarioInicio: '09:30', duracao: 5, atividade: 'Oração Pastoral', responsavel: 'Pr. Carlos', ministerio: 'Pastoral', funcao: 'Pastor', fotoUrl: '', tipoMomento: 'oracao', tipoMidia: 'nenhum', acaoSonoplastia: 'Fundo musical suave', observacao: '', antecedenciaChamada: 5, chamado: false },
    { id: '5', cultoId: '1', ordem: 4, bloco: 'Palavra', horarioInicio: '09:35', duracao: 5, atividade: 'Avisos da Semana', responsavel: 'Ana Costa', ministerio: 'Comunicação', funcao: 'Apresentadora', fotoUrl: '', tipoMomento: 'aviso', tipoMidia: 'video', acaoSonoplastia: 'Slides de avisos', observacao: '', antecedenciaChamada: 10, chamado: false },
    { id: '6', cultoId: '1', ordem: 5, bloco: 'Palavra', horarioInicio: '09:40', duracao: 40, atividade: 'Mensagem', responsavel: 'Pr. Carlos', ministerio: 'Pastoral', funcao: 'Pregador', fotoUrl: '', tipoMomento: 'fala', tipoMidia: 'nenhum', acaoSonoplastia: 'Mic púlpito', observacao: 'Tema: Fé e Esperança', antecedenciaChamada: 5, chamado: false },
    { id: '7', cultoId: '1', ordem: 6, bloco: 'Encerramento', horarioInicio: '10:20', duracao: 10, atividade: 'Oração Final e Bênção', responsavel: 'Pr. Carlos', ministerio: 'Pastoral', funcao: 'Pastor', fotoUrl: '', tipoMomento: 'oracao', tipoMidia: 'nenhum', acaoSonoplastia: 'Fundo musical', observacao: '', antecedenciaChamada: 5, chamado: false },
    { id: '8', cultoId: '1', ordem: 7, bloco: 'Encerramento', horarioInicio: '10:30', duracao: 5, atividade: 'Vinheta de Encerramento', responsavel: 'Equipe de Mídia', ministerio: 'Mídia', funcao: 'Operador', fotoUrl: '', tipoMomento: 'vinheta', tipoMidia: 'video', acaoSonoplastia: 'Iniciar vinheta final', observacao: '', antecedenciaChamada: 5, chamado: false },
  ],
  '2': [
    { id: '9', cultoId: '2', ordem: 0, bloco: 'Louvor', horarioInicio: '19:30', duracao: 20, atividade: 'Louvor e Adoração', responsavel: 'Maria Silva', ministerio: 'Louvor', funcao: 'Líder de Louvor', fotoUrl: '', tipoMomento: 'musica_ao_vivo', tipoMidia: 'audio', acaoSonoplastia: 'Habilitar microfones', observacao: '', antecedenciaChamada: 10, chamado: false },
    { id: '10', cultoId: '2', ordem: 1, bloco: 'Palavra', horarioInicio: '19:50', duracao: 45, atividade: 'Estudo Bíblico', responsavel: 'Pr. Carlos', ministerio: 'Pastoral', funcao: 'Pastor', fotoUrl: '', tipoMomento: 'fala', tipoMidia: 'nenhum', acaoSonoplastia: 'Mic púlpito', observacao: '', antecedenciaChamada: 5, chamado: false },
  ],
};

export const CultoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cultos, setCultos] = useState<Culto[]>(SAMPLE_CULTOS);
  const [allMomentos, setAllMomentos] = useState<Record<string, MomentoProgramacao[]>>(SAMPLE_MOMENTOS);
  const [activeCultoId, setActiveCultoId] = useState<string>(SAMPLE_CULTOS[0].id);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('manual');
  const [isPaused, setIsPaused] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Timestamp-based timer state
  // elapsedBase/momentElapsedBase = accumulated seconds before the last resume
  // timerStartedAt = Date.now() when the timer was last resumed (0 if paused/stopped)
  const [elapsedBase, setElapsedBase] = useState(0);
  const [momentElapsedBase, setMomentElapsedBase] = useState(0);
  const [timerStartedAt, setTimerStartedAt] = useState(0);
  
  // Display values updated via requestAnimationFrame
  const [displayElapsed, setDisplayElapsed] = useState(0);
  const [displayMomentElapsed, setDisplayMomentElapsed] = useState(0);
  
  const rafRef = useRef<number>(0);
  const isSyncingRef = useRef(false);
  const lastLocalUpdateRef = useRef(0);
  const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper: mark that a local action just happened so realtime ignores incoming stale data
  const markLocalAction = useCallback(() => {
    lastLocalUpdateRef.current = Date.now();
  }, []);

  // Refs for stale closure avoidance
  const momentosRef = useRef<MomentoProgramacao[]>([]);
  const currentIndexRef = useRef(-1);
  const executionModeRef = useRef<ExecutionMode>('manual');
  const timerStartedAtRef = useRef(0);
  const elapsedBaseRef = useRef(0);
  const momentElapsedBaseRef = useRef(0);
  const isRunningRef = useRef(false);
  const doAvancarRef = useRef<() => void>(() => {});

  const safeCultos = Array.isArray(cultos) ? cultos : SAMPLE_CULTOS;
  const safeAllMomentos = (allMomentos && typeof allMomentos === 'object' && !Array.isArray(allMomentos)) ? allMomentos : SAMPLE_MOMENTOS;
  const culto = safeCultos.find(c => c.id === activeCultoId) || safeCultos[0];
  const momentos = safeAllMomentos[activeCultoId] || [];
  
  // Ref for activeCultoId to avoid stale closures in memoized callbacks
  const activeCultoIdRef = useRef(activeCultoId);
  activeCultoIdRef.current = activeCultoId;
  
  // Keep refs in sync
  momentosRef.current = momentos;
  currentIndexRef.current = currentIndex;
  executionModeRef.current = executionMode;
  timerStartedAtRef.current = timerStartedAt;
  elapsedBaseRef.current = elapsedBase;
  momentElapsedBaseRef.current = momentElapsedBase;

  const isRunning = culto.status === 'em_andamento' && !isPaused && currentIndex >= 0;
  isRunningRef.current = isRunning;

  // Compute current elapsed values from timestamp
  const computeElapsed = useCallback(() => {
    const startedAt = timerStartedAtRef.current;
    if (startedAt <= 0) {
      return {
        elapsed: Math.max(0, elapsedBaseRef.current),
        momentElapsed: Math.max(0, momentElapsedBaseRef.current),
      };
    }
    const now = Date.now();
    if (now < startedAt) {
      // Safety: clock skew or reset
      return {
        elapsed: Math.max(0, elapsedBaseRef.current),
        momentElapsed: Math.max(0, momentElapsedBaseRef.current),
      };
    }
    const delta = Math.floor((now - startedAt) / 1000);
    return {
      elapsed: Math.max(0, elapsedBaseRef.current + delta),
      momentElapsed: Math.max(0, momentElapsedBaseRef.current + delta),
    };
  }, []);

  // Single rAF loop that runs for the lifetime of the component — reads refs, no restarts
  useEffect(() => {
    let lastSecond = -1;
    let active = true;

    const tick = () => {
      if (!active) return;

      if (isRunningRef.current) {
        const startedAt = timerStartedAtRef.current;
        if (startedAt > 0) {
          const now = Date.now();
          // Sanity check: clock skew protection
          if (now >= startedAt) {
            const delta = Math.floor((now - startedAt) / 1000);
            const elapsed = Math.max(0, elapsedBaseRef.current + delta);
            const momentElapsed = Math.max(0, momentElapsedBaseRef.current + delta);

            if (Math.floor(momentElapsed) !== lastSecond) {
              lastSecond = Math.floor(momentElapsed);
              setDisplayElapsed(elapsed);
              setDisplayMomentElapsed(momentElapsed);

              // Auto-advance check - use current ref values
              if (executionModeRef.current === 'automatico') {
                const idx = currentIndexRef.current;
                const moms = momentosRef.current;
                if (idx >= 0 && idx < moms.length && moms.length > 0) {
                  const currentMom = moms[idx];
                  if (currentMom && typeof currentMom.duracao === 'number') {
                    const dur = currentMom.duracao * 60;
                    if (momentElapsed >= dur && doAvancarRef.current) {
                      // Call avancar with no args - it reads refs internally
                      doAvancarRef.current();
                    }
                  }
                }
              }
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []); // Never restarts — reads everything from refs

  // When not running, sync display to base values immediately
  useEffect(() => {
    if (!isRunning) {
      setDisplayElapsed(elapsedBase);
      setDisplayMomentElapsed(momentElapsedBase);
    }
  }, [isRunning, elapsedBase, momentElapsedBase]);

  // Load initial state from database
  useEffect(() => {
    const loadState = async () => {
      try {
        const { data, error } = await supabase
          .from('culto_sync_state')
          .select('*')
          .eq('id', 'main')
          .single();

        if (!error && data && data.cultos && Array.isArray(data.cultos) && data.cultos.length > 0) {
          const loadedCultos = Array.isArray(data.cultos) ? (data.cultos as unknown as Culto[]) : SAMPLE_CULTOS;
          const loadedMomentos = (data.all_momentos && typeof data.all_momentos === 'object' && !Array.isArray(data.all_momentos))
            ? (data.all_momentos as unknown as Record<string, MomentoProgramacao[]>)
            : SAMPLE_MOMENTOS;
          setCultos(loadedCultos);
          setAllMomentos(loadedMomentos);
          setActiveCultoId(data.active_culto_id || SAMPLE_CULTOS[0].id);
          setCurrentIndex(data.current_index ?? -1);
          setExecutionMode((data.execution_mode as ExecutionMode) || 'manual');
          setIsPaused(data.is_paused ?? false);
          
          // Restore timer state: if was running (!paused, em_andamento), compute start time
          const wasRunning = !data.is_paused && data.current_index >= 0;
          const cultosData = data.cultos as unknown as Culto[];
          const activeId = data.active_culto_id || SAMPLE_CULTOS[0].id;
          const activeCultoData = cultosData.find(c => c.id === activeId);
          const wasEmAndamento = activeCultoData?.status === 'em_andamento';
          
          if (wasRunning && wasEmAndamento) {
            // Timer was running. Use updated_at to compute how much time passed since last save.
            const lastUpdate = new Date(data.updated_at).getTime();
            const now = Date.now();
            const deltaSinceLastSave = Math.floor((now - lastUpdate) / 1000);
            
            setElapsedBase((data.elapsed_seconds || 0) + deltaSinceLastSave);
            setMomentElapsedBase((data.moment_elapsed_seconds || 0) + deltaSinceLastSave);
            setTimerStartedAt(now);
          } else {
            setElapsedBase(data.elapsed_seconds || 0);
            setMomentElapsedBase(data.moment_elapsed_seconds || 0);
            setTimerStartedAt(0);
          }
          
          setDisplayElapsed(data.elapsed_seconds || 0);
          setDisplayMomentElapsed(data.moment_elapsed_seconds || 0);
        }
      } catch (e) {
        console.error('Failed to load state from database:', e);
      }
      setIsInitialized(true);
    };
    loadState();
  }, []);

  const setCulto: React.Dispatch<React.SetStateAction<Culto>> = useCallback((valOrFn) => {
    setCultos(prev => prev.map(c => {
      if (c.id !== activeCultoIdRef.current) return c;
      return typeof valOrFn === 'function' ? valOrFn(c) : valOrFn;
    }));
  }, []);

  const setMomentos: React.Dispatch<React.SetStateAction<MomentoProgramacao[]>> = useCallback((valOrFn) => {
    setAllMomentos(prev => ({
      ...prev,
      [activeCultoIdRef.current]: typeof valOrFn === 'function' ? valOrFn(prev[activeCultoIdRef.current] || []) : valOrFn,
    }));
  }, []);

  const addCulto = useCallback((c: Culto) => {
    setCultos(prev => [...prev, c]);
    setAllMomentos(prev => ({ ...prev, [c.id]: [] }));
  }, []);

  const updateCulto = useCallback((c: Culto) => {
    setCultos(prev => prev.map(existing => existing.id === c.id ? c : existing));
  }, []);

  const removeCulto = useCallback((id: string) => {
    setCultos(prev => {
      const next = prev.filter(c => c.id !== id);
      if (activeCultoId === id && next.length > 0) {
        setActiveCultoId(next[0].id);
      }
      return next;
    });
    setAllMomentos(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [activeCultoId]);

  const duplicateCulto = useCallback((id: string) => {
    setCultos(prev => {
      const original = prev.find(c => c.id === id);
      if (!original) return prev;
      const newId = crypto.randomUUID();
      const newCulto: Culto = { ...original, id: newId, nome: original.nome + ' (Cópia)', status: 'planejado' };
      setAllMomentos(prevM => {
        const originalMomentos = prevM[id] || [];
        const newMomentos = originalMomentos.map(m => ({ ...m, id: crypto.randomUUID(), cultoId: newId, chamado: false }));
        return { ...prevM, [newId]: newMomentos };
      });
      return [...prev, newCulto];
    });
  }, []);

  // --- SAVE LOGIC ---
  const saveToDb = useCallback(async (overrideElapsed?: { elapsed: number; momentElapsed: number }) => {
    if (isSyncingRef.current) return;
    lastLocalUpdateRef.current = Date.now();
    
    // Compute current elapsed for saving
    const currentElapsed = overrideElapsed || computeElapsed();
    
    try {
      const { error } = await supabase
        .from('culto_sync_state')
        .upsert({
          id: 'main',
          cultos: cultos as any,
          all_momentos: allMomentos as any,
          active_culto_id: activeCultoId,
          current_index: currentIndex,
          execution_mode: executionMode,
          is_paused: isPaused,
          elapsed_seconds: currentElapsed.elapsed,
          moment_elapsed_seconds: currentElapsed.momentElapsed,
          updated_at: new Date().toISOString(),
        });
      if (error) console.error('Save error:', error);
    } catch (e) {
      console.error('Save failed:', e);
    }
  }, [cultos, allMomentos, activeCultoId, currentIndex, executionMode, isPaused, computeElapsed]);

  // Save user-action state changes with short debounce
  useEffect(() => {
    if (!isInitialized) return;
    if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
    pendingSaveRef.current = setTimeout(() => {
      saveToDb();
    }, 300);
    return () => {
      if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
    };
  }, [cultos, allMomentos, activeCultoId, currentIndex, executionMode, isPaused, isInitialized]);

  // Save timer state periodically (every 5s) while running
  useEffect(() => {
    if (!isInitialized || !isRunning) return;
    const interval = setInterval(() => {
      saveToDb();
    }, 5000);
    return () => clearInterval(interval);
  }, [isInitialized, isRunning, saveToDb]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!isInitialized) return;
    const channel = supabase
      .channel('culto-sync')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'culto_sync_state', filter: 'id=eq.main' },
        (payload) => {
          // Guard: ignore realtime updates for 3s after any local action
          if (Date.now() - lastLocalUpdateRef.current < 3000) return;

          isSyncingRef.current = true;
          const data = payload.new;
          const remoteCultosRaw = Array.isArray(data.cultos) ? (data.cultos as unknown as Culto[]) : null;
          const remoteMomentosRaw = (data.all_momentos && typeof data.all_momentos === 'object' && !Array.isArray(data.all_momentos))
            ? (data.all_momentos as unknown as Record<string, MomentoProgramacao[]>)
            : null;
          if (!remoteCultosRaw || remoteCultosRaw.length === 0) {
            isSyncingRef.current = false;
            return;
          }
          setCultos(remoteCultosRaw);
          if (remoteMomentosRaw) setAllMomentos(remoteMomentosRaw);
          setActiveCultoId(data.active_culto_id || remoteCultosRaw[0].id);
          setCurrentIndex(data.current_index);
          setExecutionMode(data.execution_mode as ExecutionMode);
          setIsPaused(data.is_paused);
          
          // Restore timer from remote
          const wasRunning = !data.is_paused && data.current_index >= 0;
          const remoteActive = remoteCultosRaw.find(c => c.id === data.active_culto_id);
          const remoteEmAndamento = remoteActive?.status === 'em_andamento';
          
          if (wasRunning && remoteEmAndamento) {
            const lastUpdate = new Date(data.updated_at).getTime();
            const delta = Math.floor((Date.now() - lastUpdate) / 1000);
            setElapsedBase((data.elapsed_seconds || 0) + delta);
            setMomentElapsedBase((data.moment_elapsed_seconds || 0) + delta);
            setTimerStartedAt(Date.now());
          } else {
            setElapsedBase(data.elapsed_seconds || 0);
            setMomentElapsedBase(data.moment_elapsed_seconds || 0);
            setTimerStartedAt(0);
          }

          setTimeout(() => { isSyncingRef.current = false; }, 600);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isInitialized]);

  // Advance function
  const doAvancar = useCallback(() => {
    markLocalAction();
    setCurrentIndex(prev => {
      const moms = momentosRef.current;
      if (prev < moms.length - 1) {
        // Reset moment timer for next moment
        setMomentElapsedBase(0);
        setTimerStartedAt(Date.now());
        return prev + 1;
      }
      // Finalize
      setCultos(prevCultos => prevCultos.map(c => {
        if (c.id !== activeCultoId) return c;
        return { ...c, status: 'finalizado' as const };
      }));
      setTimerStartedAt(0);
      return prev;
    });
  }, [activeCultoId, markLocalAction]);
  doAvancarRef.current = doAvancar;

  // Start running timer when isRunning becomes true
  useEffect(() => {
    if (isRunning && timerStartedAt <= 0) {
      setTimerStartedAt(Date.now());
    }
  }, [isRunning]);

  const avancar = useCallback(() => doAvancar(), [doAvancar]);

  const voltar = useCallback(() => {
    markLocalAction();
    setCurrentIndex(prev => {
      if (prev > 0) {
        setMomentElapsedBase(0);
        setTimerStartedAt(Date.now());
        return prev - 1;
      }
      return prev;
    });
  }, [markLocalAction]);

  const pausar = useCallback(() => {
    markLocalAction();
    const { elapsed, momentElapsed } = computeElapsed();
    setElapsedBase(elapsed);
    setMomentElapsedBase(momentElapsed);
    setTimerStartedAt(0);
    setIsPaused(true);
  }, [computeElapsed, markLocalAction]);

  const retomar = useCallback(() => {
    markLocalAction();
    setTimerStartedAt(Date.now());
    setIsPaused(false);
  }, [markLocalAction]);

  const pular = useCallback(() => doAvancar(), [doAvancar]);

  const iniciarCulto = useCallback(() => {
    markLocalAction();
    setMomentos(prev => prev.map(m => ({ ...m, duracaoOriginal: m.duracaoOriginal ?? m.duracao })));
    setCulto(c => ({ ...c, status: 'em_andamento' }));
    setCurrentIndex(0);
    setElapsedBase(0);
    setMomentElapsedBase(0);
    // Start timer immediately - do NOT delay
    setTimerStartedAt(Date.now());
    setIsPaused(false);
  }, [markLocalAction]);

  const finalizarCulto = useCallback(() => {
    markLocalAction();
    const { elapsed, momentElapsed } = computeElapsed();
    setElapsedBase(elapsed);
    setMomentElapsedBase(momentElapsed);
    setTimerStartedAt(0); // Stop timer before state changes
    setCulto(c => ({ ...c, status: 'finalizado' }));
    setIsPaused(true);
  }, [computeElapsed, markLocalAction]);

  const getMomentStatus = useCallback((index: number): MomentStatus => {
    if (currentIndex < 0) return index === 0 ? 'proximo' : 'futuro';
    if (index < currentIndex) return 'concluido';
    if (index === currentIndex) return 'executando';
    if (index === currentIndex + 1) return 'proximo';
    return 'futuro';
  }, [currentIndex]);

  const marcarChamado = useCallback((id: string) => {
    markLocalAction();
    setMomentos(prev => prev.map(m => m.id === id ? { ...m, chamado: true } : m));
  }, [markLocalAction]);

  const addMomento = useCallback((m: MomentoProgramacao) => {
    markLocalAction();
    setMomentos(prev => [...prev, m].sort((a, b) => a.ordem - b.ordem));
  }, [markLocalAction]);

  const updateMomento = useCallback((m: MomentoProgramacao) => {
    markLocalAction();
    setMomentos(prev => prev.map(existing => existing.id === m.id ? m : existing));
  }, [markLocalAction]);

  const removeMomento = useCallback((id: string) => {
    markLocalAction();
    setMomentos(prev => prev.filter(m => m.id !== id));
  }, [markLocalAction]);

  const recalcStartTimes = (moms: MomentoProgramacao[], fromIndex: number): MomentoProgramacao[] => {
    const result = [...moms];
    for (let i = fromIndex; i < result.length; i++) {
      if (i === 0) continue;
      const prev = result[i - 1];
      result[i] = { ...result[i], horarioInicio: calcularHorarioTermino(prev.horarioInicio, prev.duracao) };
    }
    return result;
  };

  const adjustCurrentMomentDuration = useCallback((deltaSeconds: number) => {
    if (currentIndex < 0) return;
    markLocalAction();
    setMomentos(prev => {
      const updated = [...prev];
      const m = updated[currentIndex];
      const newDuracao = Math.max(0, m.duracao + deltaSeconds / 60);
      updated[currentIndex] = {
        ...m,
        duracao: newDuracao,
        duracaoOriginal: m.duracaoOriginal ?? m.duracao,
      };
      return recalcStartTimes(updated, currentIndex + 1);
    });
  }, [currentIndex, markLocalAction]);

  // Expose displayElapsed as elapsedSeconds and displayMomentElapsed as momentElapsedSeconds
  return (
    <CultoContext.Provider value={{
      cultos, addCulto, updateCulto, removeCulto, duplicateCulto,
      activeCultoId, setActiveCultoId,
      culto, setCulto, momentos, allMomentos, setMomentos, currentIndex,
      executionMode, setExecutionMode, isPaused,
      elapsedSeconds: displayElapsed,
      momentElapsedSeconds: displayMomentElapsed,
      avancar, voltar, pausar, retomar, pular, iniciarCulto, finalizarCulto,
      getMomentStatus, marcarChamado, addMomento, updateMomento, removeMomento,
      adjustCurrentMomentDuration,
    }}>
      {children}
    </CultoContext.Provider>
  );
};

export const useCulto = () => {
  const ctx = useContext(CultoContext);
  if (!ctx) throw new Error('useCulto must be used within CultoProvider');
  return ctx;
};
