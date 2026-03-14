import { Layout } from 'lucide-react';

export function SonoplastiaLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-3 sm:p-4">
      {/* Estrutura Principal - Responsiva */}
      <div className="mx-auto max-w-8xl space-y-3 sm:space-y-4">
        
        {/* ====== SEÇÃO TOP: MOMENTO ATUAL ====== */}
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
          {/* Momento em Execução (espera ocupar mais espaço) */}
          <div className="glass-card p-4 sm:p-5 lg:col-span-1">
            {/* Componente: CurrentSoundMomentCard */}
          </div>

          {/* Próxima Ação (lado) */}
          <div className="glass-card p-4 sm:p-5 lg:col-span-1">
            {/* Componente: NextActionCompact */}
          </div>
        </div>

        {/* ====== SEÇÃO MEIO: FILA + LISTA DE TAREFAS ====== */}
        <div className="grid gap-3 lg:grid-cols-3">
          
          {/* Próxima Ação com Músicas (2/3 da largura) */}
          <div className="lg:col-span-2">
            {/* Componente: NextActionFullWithSongs */}
          </div>

          {/* Lista de Tarefas (1/3 da largura) */}
          <div className="lg:col-span-1">
            {/* Componente: SonoplastiaTaskList */}
          </div>
        </div>

        {/* ====== SEÇÃO BOTTOM: MÚSICAS COMPACTAS + RESUMO MOMENTOS ====== */}
        <div className="grid gap-3 lg:grid-cols-2">
          
          {/* Painel Compacto de Músicas */}
          <div>
            {/* Componente: SonoplastiaMusicCompact */}
          </div>

          {/* Resumo de Momentos por Vir */}
          <div>
            {/* Componente: UpcomingMomentsPreview */}
          </div>
        </div>

      </div>
    </div>
  );
}
