import { useCulto } from '@/contexts/CultoContext';
import { calcularHorarioTermino } from '@/types/culto';
import { useState, useRef } from 'react';
import { Download, Sparkles, Users, Camera, Trash2 } from 'lucide-react';
import ArtePreview from '@/components/artes/ArtePreview';
import ArteCustomization from '@/components/artes/ArteCustomization';
import type { ArteConfig } from '@/components/artes/ArtePreview';

const GeradorArtes = () => {
  const { culto, momentos, updateMomento } = useCulto();
  const [config, setConfig] = useState<ArteConfig>({
    corFundo: '#0f172a',
    corFonte: '#ffffff',
    corMoldura: '#3b82f6',
    imagemFundo: '',
    fonte: 'Inter',
    formato: '1080x1080',
    bordaFoto: true,
    espessuraBorda: 6,
    nomeCulto: culto.nome,
    dataCulto: culto.data,
    logoUrl: '',
    tamanhoFonteTitulo: 32,
    tamanhoFonteNome: 48,
    tamanhoFonteMinisterio: 28,
    tamanhoFonteAtividade: 22,
    tamanhoFonteHorario: 64,
  });
  const [artes, setArtes] = useState<{ nome: string; dataUrl: string; momento: typeof momentos[0] }[]>([]);
  const [selectedMomento, setSelectedMomento] = useState(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const previewMomento = momentos[selectedMomento] || momentos[0];

  const handleFotoUpload = (momentoId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const momento = momentos.find(m => m.id === momentoId);
      if (momento) {
        updateMomento({ ...momento, fotoUrl: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  const removeFoto = (momentoId: string) => {
    const momento = momentos.find(m => m.id === momentoId);
    if (momento) {
      updateMomento({ ...momento, fotoUrl: '' });
    }
  };

  const gerarArteCanvas = async (m: typeof momentos[0]): Promise<string> => {
    const w = 1080;
    const h = config.formato === '1080x1350' ? 1350 : 1080;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Background
    if (config.imagemFundo) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = config.imagemFundo;
        });
        ctx.drawImage(img, 0, 0, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, w, h);
      } catch {
        ctx.fillStyle = config.corFundo;
        ctx.fillRect(0, 0, w, h);
      }
    } else {
      ctx.fillStyle = config.corFundo;
      ctx.fillRect(0, 0, w, h);
    }

    const fontBase = config.fonte === 'Space Grotesk' ? "'Space Grotesk'" :
      config.fonte === 'Georgia' ? 'Georgia' :
      config.fonte === 'Courier' ? "'Courier New'" : "'Inter'";

    const cx = w / 2;
    let cursorY = h * 0.05;

    // Logo
    if (config.logoUrl) {
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = reject;
          logoImg.src = config.logoUrl;
        });
        const logoMaxH = 100;
        const logoMaxW = 300;
        const ratio = Math.min(logoMaxW / logoImg.width, logoMaxH / logoImg.height);
        const lw = logoImg.width * ratio;
        const lh = logoImg.height * ratio;
        ctx.drawImage(logoImg, cx - lw / 2, cursorY, lw, lh);
        cursorY += lh + 15;
      } catch {
        // skip logo on error
      }
    }

    // Culto name
    ctx.fillStyle = config.corFonte;
    ctx.globalAlpha = 0.9;
    ctx.font = `700 ${config.tamanhoFonteTitulo}px ${fontBase}, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(config.nomeCulto.toUpperCase(), cx, cursorY + config.tamanhoFonteTitulo);
    cursorY += config.tamanhoFonteTitulo + 10;

    // Date
    ctx.globalAlpha = 0.6;
    const dateSize = Math.round(config.tamanhoFonteTitulo * 0.7);
    ctx.font = `400 ${dateSize}px ${fontBase}, sans-serif`;
    ctx.fillText(config.dataCulto, cx, cursorY + dateSize);
    ctx.globalAlpha = 1;
    cursorY += dateSize + 30;

    // Photo circle
    const photoY = cursorY + 90;
    const photoR = 90;

    if (m.fotoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = m.fotoUrl;
        });
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, photoY, photoR, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, cx - photoR, photoY - photoR, photoR * 2, photoR * 2);
        ctx.restore();
      } catch {
        drawInitials(ctx, cx, photoY, photoR, m, config);
      }
    } else {
      drawInitials(ctx, cx, photoY, photoR, m, config);
    }

    // Border
    if (config.bordaFoto) {
      ctx.beginPath();
      ctx.arc(cx, photoY, photoR + config.espessuraBorda / 2, 0, Math.PI * 2);
      ctx.strokeStyle = config.corMoldura;
      ctx.lineWidth = config.espessuraBorda;
      ctx.stroke();
    }

    // Name
    const nameY = photoY + photoR + 60;
    ctx.fillStyle = config.corFonte;
    ctx.font = `700 ${config.tamanhoFonteNome}px ${fontBase}, sans-serif`;
    ctx.fillText(m.responsavel, cx, nameY);

    // Ministry
    ctx.globalAlpha = 0.7;
    ctx.font = `400 ${config.tamanhoFonteMinisterio}px ${fontBase}, sans-serif`;
    ctx.fillText(m.ministerio, cx, nameY + config.tamanhoFonteNome * 0.9);

    // Function
    const funcSize = Math.round(config.tamanhoFonteMinisterio * 0.8);
    ctx.globalAlpha = 0.5;
    ctx.font = `400 ${funcSize}px ${fontBase}, sans-serif`;
    ctx.fillText(m.funcao, cx, nameY + config.tamanhoFonteNome * 0.9 + config.tamanhoFonteMinisterio + 10);
    ctx.globalAlpha = 1;

    // Activity
    ctx.globalAlpha = 0.6;
    ctx.font = `500 ${config.tamanhoFonteAtividade}px ${fontBase}, sans-serif`;
    ctx.fillText(m.atividade.toUpperCase(), cx, nameY + config.tamanhoFonteNome * 0.9 + config.tamanhoFonteMinisterio + funcSize + 30);
    ctx.globalAlpha = 1;

    // Times
    const timeY = h * 0.78;
    const horarioSaida = calcularHorarioTermino(m.horarioInicio, m.duracao);
    const timeLabelSize = Math.round(config.tamanhoFonteHorario * 0.28);

    ctx.globalAlpha = 0.5;
    ctx.font = `500 ${timeLabelSize}px ${fontBase}, sans-serif`;
    ctx.fillStyle = config.corFonte;
    ctx.fillText('ENTRADA', cx - 140, timeY);
    ctx.globalAlpha = 1;
    ctx.font = `700 ${config.tamanhoFonteHorario}px ${fontBase}, sans-serif`;
    ctx.fillText(m.horarioInicio, cx - 140, timeY + config.tamanhoFonteHorario + 5);

    ctx.globalAlpha = 0.5;
    ctx.font = `500 ${timeLabelSize}px ${fontBase}, sans-serif`;
    ctx.fillText('SAÍDA', cx + 140, timeY);
    ctx.globalAlpha = 1;
    ctx.font = `700 ${config.tamanhoFonteHorario}px ${fontBase}, sans-serif`;
    ctx.fillText(horarioSaida, cx + 140, timeY + config.tamanhoFonteHorario + 5);

    return canvas.toDataURL('image/png');
  };

  const gerarTodas = async () => {
    const results = [];
    for (const m of momentos) {
      const dataUrl = await gerarArteCanvas(m);
      results.push({ nome: m.responsavel, dataUrl, momento: m });
    }
    setArtes(results);
  };

  const downloadArte = (dataUrl: string, nome: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `arte-${nome.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          Gerador de Artes
        </h1>
      </div>

      {/* Culto info */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Culto</p>
            <p className="font-semibold">{culto.nome} — {culto.data}</p>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Users className="w-4 h-4" />
            {momentos.length} participante{momentos.length !== 1 ? 's' : ''} na programação
          </p>
        </div>
      </div>

      {/* Fotos dos participantes */}
      <div className="glass-card p-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Camera className="w-4 h-4" /> Fotos dos Participantes
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {momentos.map((m) => (
            <div key={m.id} className="flex flex-col items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => fileInputRefs.current[m.id]?.click()}
                  className="w-16 h-16 rounded-full border-2 border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center overflow-hidden"
                >
                  {m.fotoUrl ? (
                    <img src={m.fotoUrl} alt={m.responsavel} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <Camera className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
                {m.fotoUrl && (
                  <button
                    onClick={() => removeFoto(m.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 transition-colors"
                    title="Remover foto"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-xs text-center text-muted-foreground truncate w-full">{m.responsavel}</p>
              <input
                ref={(el) => { fileInputRefs.current[m.id] = el; }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFotoUpload(m.id, file);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Layout: Preview + Customization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Pré-visualização da Arte
            </h3>
            {previewMomento && <ArtePreview config={config} momento={previewMomento} />}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {momentos.map((m, i) => (
              <button
                key={m.id}
                onClick={() => setSelectedMomento(i)}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors border ${
                  i === selectedMomento
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted border-border hover:border-primary/30'
                }`}
              >
                {m.responsavel}
              </button>
            ))}
          </div>

          <button
            onClick={gerarTodas}
            className="w-full py-4 rounded-xl font-semibold text-lg transition-all bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Gerar Artes da Programação
          </button>
        </div>

        <ArteCustomization config={config} setConfig={setConfig} />
      </div>

      {/* Gallery */}
      {artes.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Artes Geradas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {artes.map((arte, i) => (
              <div key={i} className="glass-card p-3 space-y-3">
                <img src={arte.dataUrl} alt={arte.nome} className="w-full rounded-lg" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{arte.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {arte.momento.horarioInicio} — {calcularHorarioTermino(arte.momento.horarioInicio, arte.momento.duracao)}
                    </p>
                  </div>
                  <button
                    onClick={() => downloadArte(arte.dataUrl, arte.nome)}
                    className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function drawInitials(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  m: { responsavel: string },
  config: { corMoldura: string; corFonte: string }
) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = config.corMoldura + '20';
  ctx.fill();
  const initials = m.responsavel.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  ctx.fillStyle = config.corMoldura;
  ctx.font = "bold 56px 'Inter', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, cx, cy);
  ctx.textBaseline = 'alphabetic';
}

export default GeradorArtes;
