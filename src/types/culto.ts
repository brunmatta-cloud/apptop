export type CultoStatus = 'planejado' | 'em_andamento' | 'finalizado';

export type MomentStatus = 'concluido' | 'executando' | 'proximo' | 'futuro';

export type TipoMomento =
  | 'musica_ao_vivo'
  | 'playback'
  | 'video'
  | 'vinheta'
  | 'oracao'
  | 'fala'
  | 'aviso'
  | 'fundo_musical'
  | 'nenhum';

export type TipoMidia = 'audio' | 'video' | 'nenhum';

export type ExecutionMode = 'automatico' | 'manual';
export type ModeradorCallStatus = 'pendente' | 'chamado' | 'pronto';
export type ConfirmacaoPresencaStatus = 'pendente' | 'confirmado' | 'ausente';

export type UserRole = 'admin' | 'cerimonialista' | 'sonoplastia' | 'participante';

export interface Culto {
  id: string;
  nome: string;
  data: string;
  horarioInicial: string; // "HH:mm"
  duracaoPrevista: number; // minutes
  status: CultoStatus;
}

export interface MomentoProgramacao {
  id: string;
  cultoId: string;
  ordem: number;
  bloco: string;
  horarioInicio: string; // "HH:mm"
  duracao: number; // minutes
  atividade: string;
  responsavel: string;
  ministerio: string;
  funcao: string;
  fotoUrl: string;
  tipoMomento: TipoMomento;
  tipoMidia: TipoMidia;
  acaoSonoplastia: string;
  observacao: string;
  antecedenciaChamada: number; // minutes
  chamado: boolean;
  duracaoOriginal?: number; // minutes - original duration before adjustments
  moderadorStatus?: ModeradorCallStatus;
  confirmacaoStatus?: ConfirmacaoPresencaStatus;
  responsavelOriginal?: string;
}

export interface ArteModelo {
  id: string;
  nome: string;
  corFundo: string;
  corTexto: string;
  corMoldura: string;
  fonte: string;
  imagemFundo: string;
}

// Computed helpers
export function calcularHorarioTermino(horarioInicio: string, duracao: number): string {
  const [h, m] = horarioInicio.split(':').map(Number);
  const totalMin = h * 60 + m + duracao;
  const hFinal = Math.floor(totalMin / 60) % 24;
  const mFinal = totalMin % 60;
  return `${String(hFinal).padStart(2, '0')}:${String(mFinal).padStart(2, '0')}`;
}

export function tipoMomentoLabel(tipo: TipoMomento): string {
  const labels: Record<TipoMomento, string> = {
    musica_ao_vivo: 'Música ao Vivo',
    playback: 'Playback',
    video: 'Vídeo',
    vinheta: 'Vinheta',
    oracao: 'Oração',
    fala: 'Fala',
    aviso: 'Aviso',
    fundo_musical: 'Fundo Musical',
    nenhum: 'Nenhum',
  };
  return labels[tipo];
}

export function statusLabel(status: MomentStatus): string {
  const labels: Record<MomentStatus, string> = {
    concluido: 'Concluído',
    executando: 'Executando',
    proximo: 'Próximo',
    futuro: 'Futuro',
  };
  return labels[status];
}
