import { useMemo, useState } from 'react';
import { useCulto } from '@/contexts/CultoContext';
import { calcularHorarioTermino, type ConfirmacaoPresencaStatus, type MomentoProgramacao } from '@/types/culto';
import { ClipboardCheck, AlertTriangle, CheckCircle2, UserRound, Clock3, Users, BadgeCheck, CircleAlert } from 'lucide-react';

const confirmacaoLabel = (status: ConfirmacaoPresencaStatus) => {
  if (status === 'confirmado') return 'Confirmado';
  if (status === 'ausente') return 'Ausente';
  return 'Pendente';
};

const confirmacaoClass = (status: ConfirmacaoPresencaStatus) => {
  if (status === 'confirmado') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
  if (status === 'ausente') return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
  return 'border-border bg-muted/40 text-muted-foreground';
};

const presenceOptionClass = ({
  active,
  tone,
}: {
  active: boolean;
  tone: 'confirmado' | 'ausente';
}) => {
  if (tone === 'confirmado') {
    return active
      ? 'border-emerald-400 bg-emerald-500/18 text-emerald-100 shadow-[0_0_0_1px_rgba(52,211,153,0.28)]'
      : 'border-emerald-500/20 bg-emerald-500/6 text-emerald-200/85 hover:bg-emerald-500/12';
  }

  return active
    ? 'border-amber-400 bg-amber-500/18 text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.24)]'
    : 'border-amber-500/20 bg-amber-500/6 text-amber-100/85 hover:bg-amber-500/12';
};

const ListaConfirmacao = () => {
  const { culto, momentos, isSubmitting, pendingAction, updateMomento } = useCulto();
  const [substitutos, setSubstitutos] = useState<Record<string, string>>({});

  const momentosOrdenados = useMemo(
    () => [...momentos].sort((a, b) => a.ordem - b.ordem),
    [momentos],
  );

  const confirmarPresenca = (momento: MomentoProgramacao) => {
    updateMomento({
      ...momento,
      confirmacaoStatus: 'confirmado',
    });
  };

  const limparConfirmacao = (momento: MomentoProgramacao) => {
    const confirmarLimpeza = window.confirm('Deseja remover essa marcacao de presenca?');
    if (!confirmarLimpeza) return;

    updateMomento({
      ...momento,
      confirmacaoStatus: 'pendente',
    });
  };

  const marcarAusente = (momento: MomentoProgramacao) => {
    updateMomento({
      ...momento,
      confirmacaoStatus: 'ausente',
      responsavelOriginal: momento.responsavelOriginal ?? momento.responsavel,
    });
  };

  const aplicarSubstituto = (momento: MomentoProgramacao) => {
    const nome = (substitutos[momento.id] ?? '').trim();
    if (!nome) return;

    updateMomento({
      ...momento,
      responsavelOriginal: momento.responsavelOriginal ?? momento.responsavel,
      responsavel: nome,
      confirmacaoStatus: 'confirmado',
      moderadorStatus: 'pendente',
      chamado: false,
    });

    setSubstitutos((current) => ({
      ...current,
      [momento.id]: '',
    }));
  };

  const momentosAusentes = useMemo(
    () => momentosOrdenados.filter((momento) => momento.confirmacaoStatus === 'ausente'),
    [momentosOrdenados],
  );
  const momentosConfirmados = useMemo(
    () => momentosOrdenados.filter((momento) => momento.confirmacaoStatus === 'confirmado'),
    [momentosOrdenados],
  );
  const momentosPendentes = Math.max(0, momentosOrdenados.length - momentosConfirmados.length - momentosAusentes.length);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-emerald-500/15 text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Lista de Confirmacao</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{culto.nome}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Pessoas</p>
            <p className="mt-1 text-xl font-semibold">{momentosOrdenados.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">Confirmados</p>
            <p className="mt-1 text-xl font-semibold text-emerald-200">{momentosConfirmados.length}</p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Pendentes</p>
            <p className="mt-1 text-xl font-semibold">{momentosPendentes}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">Atencao</p>
            <p className="mt-1 text-xl font-semibold text-amber-200">{momentosAusentes.length}</p>
          </div>
        </div>
      </div>

      <section className="glass-card space-y-4 rounded-3xl border p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Presenca</h2>
          </div>
          <p className="text-sm text-muted-foreground">Toque em um status para atualizar a presenca rapidamente.</p>
        </div>

        <div className="space-y-3">
          {momentosOrdenados.map((momento) => {
            const status = momento.confirmacaoStatus ?? 'pendente';

            return (
              <div key={momento.id} className="rounded-[1.5rem] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.01)_100%)] p-4 sm:p-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-start gap-2 sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold sm:text-xl">{momento.responsavel || 'Sem responsavel'}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{momento.funcao || 'Sem funcao'}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${confirmacaoClass(status)}`}>
                        {confirmacaoLabel(status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm xl:grid-cols-4">
                      <div className="rounded-2xl border border-border/60 bg-background/45 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Ministerio</p>
                        <p className="mt-1 truncate text-sm font-semibold text-foreground">{momento.ministerio || 'Nao informado'}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-background/45 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Entrada</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-foreground">{momento.horarioInicio}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-background/45 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Saida</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                          {calcularHorarioTermino(momento.horarioInicio, momento.duracao)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-background/45 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Momento</p>
                        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-foreground">{momento.atividade}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                      <button
                        type="button"
                        onClick={() => (status === 'confirmado' ? limparConfirmacao(momento) : confirmarPresenca(momento))}
                        disabled={isSubmitting}
                        className={`group rounded-[1.35rem] border px-4 py-4 text-left transition-all disabled:pointer-events-none disabled:opacity-50 ${presenceOptionClass({
                          active: status === 'confirmado',
                          tone: 'confirmado',
                        })}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                            status === 'confirmado'
                              ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-200'
                              : 'border-emerald-500/20 bg-black/10 text-emerald-300'
                          }`}>
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">Confirmar presenca</p>
                              {status === 'confirmado' && (
                                <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                                  ativo
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs opacity-80">
                              {status === 'confirmado'
                                ? 'Clique novamente para desmarcar, com confirmacao.'
                                : 'Marca a pessoa como presente e deixa o card visualmente validado.'}
                            </p>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => (status === 'ausente' ? limparConfirmacao(momento) : marcarAusente(momento))}
                        disabled={isSubmitting}
                        className={`group rounded-[1.35rem] border px-4 py-4 text-left transition-all disabled:pointer-events-none disabled:opacity-50 ${presenceOptionClass({
                          active: status === 'ausente',
                          tone: 'ausente',
                        })}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                            status === 'ausente'
                              ? 'border-amber-200/40 bg-amber-300/15 text-amber-100'
                              : 'border-amber-500/20 bg-black/10 text-amber-300'
                          }`}>
                            <CircleAlert className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">Marcar ausente</p>
                              {status === 'ausente' && (
                                <span className="rounded-full border border-amber-200/30 bg-amber-300/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                                  ativo
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs opacity-80">
                              {status === 'ausente'
                                ? 'Clique novamente para desmarcar, com confirmacao.'
                                : 'Envia o momento para a area de atencao e libera a troca por substituto.'}
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className={`rounded-2xl border px-4 py-3 transition-colors ${confirmacaoClass(status)}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.22em] opacity-80">Status atual</p>
                          <p className="mt-1 text-sm font-semibold">{confirmacaoLabel(status)}</p>
                        </div>
                        {status === 'confirmado' ? (
                          <div className="flex items-center gap-2 text-right">
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            <span className="text-xs font-medium opacity-90">Presenca validada</span>
                          </div>
                        ) : status === 'ausente' ? (
                          <div className="flex items-center gap-2 text-right">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <span className="text-xs font-medium opacity-90">Substituicao necessaria</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-right">
                            <BadgeCheck className="h-5 w-5 shrink-0" />
                            <span className="text-xs font-medium opacity-90">Aguardando definicao</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="glass-card space-y-4 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-300" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Momentos que precisam de atencao</h2>
          </div>
          <p className="text-sm text-amber-100/80">Preencha um substituto para atualizar o momento sem sair desta tela.</p>
        </div>

        {momentosAusentes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background/40 px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhum momento precisa de substituicao agora.
          </div>
        ) : (
          <div className="space-y-3">
            {momentosAusentes.map((momento) => (
              <div key={momento.id} className="rounded-[1.5rem] border border-amber-500/20 bg-background/60 p-4 sm:p-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-foreground">{momento.atividade}</p>
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                        Ausente
                      </span>
                    </div>
                    <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="h-4 w-4" />
                        {momento.responsavelOriginal ?? momento.responsavel}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-4 w-4" />
                        {momento.horarioInicio} - {calcularHorarioTermino(momento.horarioInicio, momento.duracao)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ClipboardCheck className="h-4 w-4" />
                        {momento.ministerio || 'Ministerio nao informado'}
                      </span>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2">
                    <input
                      value={substitutos[momento.id] ?? ''}
                      onChange={(event) => setSubstitutos((current) => ({ ...current, [momento.id]: event.target.value }))}
                      placeholder="Nome da pessoa substituta"
                      className="h-12 rounded-2xl border border-border bg-background px-4 text-sm outline-none transition-colors focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => aplicarSubstituto(momento)}
                      disabled={isSubmitting || !(substitutos[momento.id] ?? '').trim()}
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {pendingAction === 'set-momentos' ? 'Salvando...' : 'Aplicar substituto'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ListaConfirmacao;
