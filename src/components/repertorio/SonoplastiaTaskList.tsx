import { CheckCircle2, List, Music4 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MomentoProgramacao } from '@/types/culto';

type Props = {
  momentos: MomentoProgramacao[];
};

const getTaskColor = (index: number): string => {
  const colors = [
    'border-sky-500/30 bg-sky-500/10 text-sky-300',
    'border-purple-500/30 bg-purple-500/10 text-purple-300',
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    'border-amber-500/30 bg-amber-500/10 text-amber-300',
    'border-rose-500/30 bg-rose-500/10 text-rose-300',
  ];
  return colors[index % colors.length];
};

const getTaskDot = (index: number): string => {
  const colors = ['bg-sky-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
  return colors[index % colors.length];
};

export function SonoplastiaTaskList({ momentos }: Props) {
  // Filtrar apenas momentos que têm ação de sonoplastia
  const tasksWithSonoplastia = momentos.filter((m) => m.acaoSonoplastia);

  if (tasksWithSonoplastia.length === 0) {
    return (
      <div className="glass-card p-4 sm:p-5 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 opacity-30" />
        <p className="text-xs text-muted-foreground">Nenhuma tarefa</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <List className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Afazeres ({tasksWithSonoplastia.length})
        </span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/40">
        {tasksWithSonoplastia.map((task, idx) => (
          <div key={task.id} className={cn('rounded-lg border p-2 text-sm transition-colors hover:brightness-110', getTaskColor(idx))}>
            <div className="flex items-start gap-2">
              <span className={cn('h-2 w-2 rounded-full mt-1.5 shrink-0', getTaskDot(idx))} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate text-xs">{task.atividade}</p>
                <p className="text-[11px] opacity-80 line-clamp-2 mt-1">{task.acaoSonoplastia}</p>
                <p className="text-[10px] opacity-60 mt-1">{task.horarioInicio}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
