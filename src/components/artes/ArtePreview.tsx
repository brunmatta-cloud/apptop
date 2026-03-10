import { calcularHorarioTermino } from '@/types/culto';
import type { MomentoProgramacao } from '@/types/culto';

export interface ArteConfig {
  corFundo: string;
  corFonte: string;
  corMoldura: string;
  imagemFundo: string;
  fonte: string;
  formato: '1080x1080' | '1080x1350';
  bordaFoto: boolean;
  espessuraBorda: number;
  nomeCulto: string;
  dataCulto: string;
  logoUrl: string;
  tamanhoFonteTitulo: number;
  tamanhoFonteNome: number;
  tamanhoFonteMinisterio: number;
  tamanhoFonteAtividade: number;
  tamanhoFonteHorario: number;
}

interface ArtePreviewProps {
  config: ArteConfig;
  momento: MomentoProgramacao;
}

const ArtePreview = ({ config, momento }: ArtePreviewProps) => {
  const horarioSaida = calcularHorarioTermino(momento.horarioInicio, momento.duracao);
  const isPortrait = config.formato === '1080x1350';
  const aspectRatio = isPortrait ? '4/5' : '1/1';

  const initials = momento.responsavel
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const fontFamily = config.fonte === 'Space Grotesk' ? "'Space Grotesk', sans-serif" :
    config.fonte === 'Inter' ? "'Inter', sans-serif" :
    config.fonte === 'Georgia' ? "Georgia, serif" :
    config.fonte === 'Courier' ? "'Courier New', monospace" :
    "'Inter', sans-serif";

  // Scale factor for preview (preview is ~420px, art is 1080px)
  const scale = 420 / 1080;

  return (
    <div
      className="w-full max-w-[420px] mx-auto rounded-xl overflow-hidden relative flex flex-col items-center justify-center"
      style={{
        aspectRatio,
        background: config.imagemFundo
          ? `url(${config.imagemFundo}) center/cover`
          : config.corFundo,
        color: config.corFonte,
        fontFamily,
      }}
    >
      {config.imagemFundo && (
        <div className="absolute inset-0 bg-black/50" />
      )}

      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-6 py-8 gap-3">
        {/* Logo */}
        {config.logoUrl && (
          <img
            src={config.logoUrl}
            alt="Logo"
            className="object-contain mb-1"
            style={{ maxHeight: 50, maxWidth: 120 }}
          />
        )}

        {/* Culto name + date */}
        <div className="text-center space-y-0.5">
          <p
            className="font-bold tracking-widest uppercase opacity-90"
            style={{ fontSize: config.tamanhoFonteTitulo * scale }}
          >
            {config.nomeCulto}
          </p>
          <p className="opacity-60" style={{ fontSize: (config.tamanhoFonteTitulo * 0.7) * scale }}>
            {config.dataCulto}
          </p>
        </div>

        {/* Photo circle */}
        <div
          className="rounded-full flex items-center justify-center mt-2"
          style={{
            width: 110,
            height: 110,
            border: config.bordaFoto ? `${config.espessuraBorda}px solid ${config.corMoldura}` : 'none',
            background: momento.fotoUrl ? 'transparent' : `${config.corMoldura}20`,
          }}
        >
          {momento.fotoUrl ? (
            <img
              src={momento.fotoUrl}
              alt={momento.responsavel}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-4xl font-bold" style={{ color: config.corMoldura }}>
              {initials}
            </span>
          )}
        </div>

        {/* Name */}
        <p
          className="font-bold mt-1 text-center leading-tight"
          style={{ fontSize: config.tamanhoFonteNome * scale }}
        >
          {momento.responsavel}
        </p>

        {/* Ministry + function */}
        <div className="text-center space-y-0.5">
          <p className="opacity-70" style={{ fontSize: config.tamanhoFonteMinisterio * scale }}>
            {momento.ministerio}
          </p>
          <p className="opacity-50" style={{ fontSize: (config.tamanhoFonteMinisterio * 0.8) * scale }}>
            {momento.funcao}
          </p>
        </div>

        {/* Activity */}
        <p
          className="uppercase tracking-wider opacity-60 mt-1"
          style={{ fontSize: config.tamanhoFonteAtividade * scale }}
        >
          {momento.atividade}
        </p>

        {/* Times */}
        <div className="flex items-end gap-6 mt-3">
          <div className="text-center">
            <p className="uppercase tracking-widest opacity-50 mb-1" style={{ fontSize: 10 }}>Entrada</p>
            <p className="font-bold leading-none" style={{ fontSize: config.tamanhoFonteHorario * scale }}>
              {momento.horarioInicio}
            </p>
          </div>
          <div className="text-center">
            <p className="uppercase tracking-widest opacity-50 mb-1" style={{ fontSize: 10 }}>Saída</p>
            <p className="font-bold leading-none" style={{ fontSize: config.tamanhoFonteHorario * scale }}>
              {horarioSaida}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtePreview;
