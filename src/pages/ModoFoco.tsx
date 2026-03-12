import { useCulto, useCultoTimer } from '@/contexts/CultoContext';
import { ProgressBar } from '@/components/culto/ProgressBar';
import { Focus, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calcularHorarioTermino } from '@/types/culto';
import { useNavigate } from 'react-router-dom';

const ModoFoco = () => {
  const { culto, momentos, currentIndex } = useCulto();
  const { momentElapsedMs } = useCultoTimer();
  const navigate = useNavigate();
  const currentMoment = currentIndex >= 0 ? momentos[currentIndex] : null;
  const nextMoment = currentIndex >= 0 && currentIndex + 1 < momentos.length ? momentos[currentIndex + 1] : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Back button */}
      <div className="p-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted/50"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {currentMoment ? (
            <motion.div
              key={currentMoment.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl text-center space-y-8"
            >
              <div>
                <p className="text-xs text-status-executing uppercase tracking-[0.3em] mb-2 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-status-executing animate-pulse-glow" />
                  Executando
                </p>
                <h1 className="text-4xl md:text-6xl font-display font-bold">{currentMoment.atividade}</h1>
                <p className="text-xl text-muted-foreground mt-3">{currentMoment.responsavel}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentMoment.horarioInicio} — {calcularHorarioTermino(currentMoment.horarioInicio, currentMoment.duracao)}
                </p>
              </div>
              <div className="max-w-md mx-auto">
                <ProgressBar momento={currentMoment} elapsedMs={momentElapsedMs} />
              </div>
              {nextMoment && (
                <div className="pt-8 border-t border-border/30">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Próximo</p>
                  <p className="text-lg font-display">{nextMoment.atividade}</p>
                  <p className="text-sm text-muted-foreground">{nextMoment.responsavel} • {nextMoment.horarioInicio}</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <Focus className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-2xl font-display text-muted-foreground">Modo Foco</h2>
              <p className="text-muted-foreground">Aguardando início do culto</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ModoFoco;
