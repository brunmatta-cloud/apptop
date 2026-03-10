import { Settings, Clock } from 'lucide-react';
import { useCronometro } from '@/contexts/CronometroContext';
import { Slider } from '@/components/ui/slider';

const Configuracoes = () => {
  const { 
    topFontSize, setTopFontSize,
    bottomFontSize, setBottomFontSize,
    timerFontSize, setTimerFontSize,
    orangeThreshold, setOrangeThreshold,
    redThreshold, setRedThreshold
  } = useCronometro();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display">Configurações</h1>
          <p className="text-muted-foreground text-sm">Personalize o sistema</p>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold text-primary uppercase tracking-wider">Tamanhos do Cronômetro</h3>
        </div>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Tamanho do Timer Principal</label>
              <span className="text-xs text-muted-foreground font-mono">{timerFontSize}vw</span>
            </div>
            <Slider
              value={[timerFontSize]}
              onValueChange={([val]) => setTimerFontSize(val)}
              min={15}
              max={35}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">Ajusta o tamanho do número do cronômetro</p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Tamanho do Texto Superior</label>
              <span className="text-xs text-muted-foreground font-mono">{topFontSize.toFixed(1)}rem</span>
            </div>
            <Slider
              value={[topFontSize]}
              onValueChange={([val]) => setTopFontSize(val)}
              min={1}
              max={5}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">Nome do bloco e atividade</p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Tamanho do Texto Inferior</label>
              <span className="text-xs text-muted-foreground font-mono">{bottomFontSize.toFixed(1)}rem</span>
            </div>
            <Slider
              value={[bottomFontSize]}
              onValueChange={([val]) => setBottomFontSize(val)}
              min={1}
              max={5}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">Nome do responsável</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Alertas de Tempo</h3>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Alerta Laranja (segundos)</label>
              <span className="text-xs text-muted-foreground font-mono">{orangeThreshold}s</span>
            </div>
            <Slider
              value={[orangeThreshold]}
              onValueChange={([val]) => setOrangeThreshold(val)}
              min={30}
              max={300}
              step={10}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">Quando o cronômetro fica laranja</p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Alerta Vermelho (segundos)</label>
              <span className="text-xs text-muted-foreground font-mono">{redThreshold}s</span>
            </div>
            <Slider
              value={[redThreshold]}
              onValueChange={([val]) => setRedThreshold(val)}
              min={5}
              max={120}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">Quando o cronômetro fica vermelho e pisca</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Sobre</h3>
        <p className="text-sm text-muted-foreground">Culto ao Vivo — Sistema de Gestão de Cultos v1.0</p>
      </div>
    </div>
  );
};

export default Configuracoes;
