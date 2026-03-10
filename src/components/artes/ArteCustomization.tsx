import type { ArteConfig } from './ArtePreview';
import { useState, useRef } from 'react';
import { ChevronUp, ChevronDown, Save, FolderOpen, Image, Type, Trash2, Upload } from 'lucide-react';

interface Palette {
  nome: string;
  corFundo: string;
  corFonte: string;
  corMoldura: string;
}

const PALETTES: Palette[] = [
  { nome: 'Noite Escura', corFundo: '#0f172a', corFonte: '#ffffff', corMoldura: '#3b82f6' },
  { nome: 'Roxo Real', corFundo: '#1a0a2e', corFonte: '#ffffff', corMoldura: '#8b5cf6' },
  { nome: 'Verde Floresta', corFundo: '#0a1f1a', corFonte: '#ffffff', corMoldura: '#10b981' },
  { nome: 'Azul Marinho', corFundo: '#0c1929', corFonte: '#ffffff', corMoldura: '#0ea5e9' },
  { nome: 'Bordô', corFundo: '#1c0a0a', corFonte: '#ffffff', corMoldura: '#ef4444' },
  { nome: 'Modo Claro', corFundo: '#f8fafc', corFonte: '#0f172a', corMoldura: '#3b82f6' },
];

interface ArteCustomizationProps {
  config: ArteConfig;
  setConfig: (c: ArteConfig) => void;
}

const ArteCustomization = ({ config, setConfig }: ArteCustomizationProps) => {
  const [expanded, setExpanded] = useState(true);
  const [modelos, setModelos] = useState<{ nome: string; config: ArteConfig }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('arte-modelos') || '[]');
    } catch { return []; }
  });
  const [nomeModelo, setNomeModelo] = useState('');
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bgInputRef = useRef<HTMLInputElement | null>(null);

  const salvarModelo = () => {
    if (!nomeModelo.trim()) return;
    const novo = [...modelos, { nome: nomeModelo.trim(), config: { ...config } }];
    setModelos(novo);
    localStorage.setItem('arte-modelos', JSON.stringify(novo));
    setNomeModelo('');
  };

  const carregarModelo = (m: { nome: string; config: ArteConfig }) => {
    setConfig({ ...m.config });
  };

  const removerModelo = (index: number) => {
    const novo = modelos.filter((_, i) => i !== index);
    setModelos(novo);
    localStorage.setItem('arte-modelos', JSON.stringify(novo));
  };

  const update = (partial: Partial<ArteConfig>) => setConfig({ ...config, ...partial });

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      update({ logoUrl: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleBgUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      update({ imagemFundo: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const labelClass = "text-xs text-muted-foreground font-medium mb-1 block uppercase tracking-wider";
  const inputClass = "w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          Personalização do Modelo
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {expanded ? <><ChevronUp className="w-4 h-4" /> Ocultar</> : <><ChevronDown className="w-4 h-4" /> Mostrar</>}
        </span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-6">
          {/* Modelos salvos */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> Modelos Salvos
            </h4>
            <div className="flex flex-wrap gap-2">
              {modelos.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum modelo salvo</p>
              )}
              {modelos.map((m, i) => (
                <div key={i} className="flex items-center gap-1">
                  <button
                    onClick={() => carregarModelo(m)}
                    className="px-3 py-1.5 rounded-lg bg-muted text-sm hover:bg-muted/80 transition-colors border border-border"
                  >
                    {m.nome}
                  </button>
                  <button
                    onClick={() => removerModelo(i)}
                    className="text-xs text-destructive hover:text-destructive/80 px-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Logo */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Image className="w-4 h-4" /> Logo
            </h4>
            <div className="flex items-center gap-3">
              <button
                onClick={() => logoInputRef.current?.click()}
                className="px-4 py-2 rounded-lg bg-muted text-sm hover:bg-muted/80 transition-colors border border-border flex items-center gap-2"
              >
                <Image className="w-4 h-4" />
                {config.logoUrl ? 'Trocar Logo' : 'Adicionar Logo'}
              </button>
              {config.logoUrl && (
                <>
                  <img src={config.logoUrl} alt="Logo" className="h-10 object-contain rounded" />
                  <button
                    onClick={() => update({ logoUrl: '' })}
                    className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                    title="Remover logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
                }}
              />
            </div>
          </div>

          {/* Paletas */}
          <div>
            <h4 className={labelClass}>Paletas</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PALETTES.map((p) => (
                <button
                  key={p.nome}
                  onClick={() => update({ corFundo: p.corFundo, corFonte: p.corFonte, corMoldura: p.corMoldura })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border hover:border-primary/50 transition-colors text-left"
                  style={{ background: `${p.corFundo}40` }}
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.corMoldura }} />
                  <span className="text-xs font-medium">{p.nome}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tamanho das Fontes */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Type className="w-4 h-4" /> Tamanho das Fontes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Título do Culto ({config.tamanhoFonteTitulo}px)</label>
                <input
                  type="range"
                  min={16}
                  max={64}
                  value={config.tamanhoFonteTitulo}
                  onChange={(e) => update({ tamanhoFonteTitulo: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <label className={labelClass}>Nome ({config.tamanhoFonteNome}px)</label>
                <input
                  type="range"
                  min={24}
                  max={80}
                  value={config.tamanhoFonteNome}
                  onChange={(e) => update({ tamanhoFonteNome: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <label className={labelClass}>Ministério ({config.tamanhoFonteMinisterio}px)</label>
                <input
                  type="range"
                  min={14}
                  max={48}
                  value={config.tamanhoFonteMinisterio}
                  onChange={(e) => update({ tamanhoFonteMinisterio: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <label className={labelClass}>Atividade ({config.tamanhoFonteAtividade}px)</label>
                <input
                  type="range"
                  min={14}
                  max={40}
                  value={config.tamanhoFonteAtividade}
                  onChange={(e) => update({ tamanhoFonteAtividade: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Horário ({config.tamanhoFonteHorario}px)</label>
                <input
                  type="range"
                  min={24}
                  max={96}
                  value={config.tamanhoFonteHorario}
                  onChange={(e) => update({ tamanhoFonteHorario: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </div>

          {/* Personalização */}
          <div>
            <h4 className={labelClass}>Personalização</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Cor de Fundo</label>
                <div className="flex gap-2">
                  <input type="color" value={config.corFundo} onChange={(e) => update({ corFundo: e.target.value })} className="w-10 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0" />
                  <input className={inputClass} value={config.corFundo} onChange={(e) => update({ corFundo: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Cor da Fonte</label>
                <div className="flex gap-2">
                  <input type="color" value={config.corFonte} onChange={(e) => update({ corFonte: e.target.value })} className="w-10 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0" />
                  <input className={inputClass} value={config.corFonte} onChange={(e) => update({ corFonte: e.target.value })} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Imagem de Fundo</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => bgInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-muted text-sm hover:bg-muted/80 transition-colors border border-border flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {config.imagemFundo ? 'Trocar Imagem' : 'Carregar Imagem'}
                  </button>
                  {config.imagemFundo && (
                    <>
                      <img src={config.imagemFundo} alt="Fundo" className="h-10 w-16 object-cover rounded border border-border" />
                      <button
                        onClick={() => update({ imagemFundo: '' })}
                        className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remover imagem de fundo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <input
                    ref={bgInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBgUpload(file);
                    }}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Fonte</label>
                <select className={inputClass} value={config.fonte} onChange={(e) => update({ fonte: e.target.value })}>
                  <option value="Inter">Inter (Padrão)</option>
                  <option value="Space Grotesk">Space Grotesk</option>
                  <option value="Georgia">Georgia (Serif)</option>
                  <option value="Courier">Courier (Mono)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Formato</label>
                <select className={inputClass} value={config.formato} onChange={(e) => update({ formato: e.target.value as ArteConfig['formato'] })}>
                  <option value="1080x1080">1080×1080 (Quadrado)</option>
                  <option value="1080x1350">1080×1350 (Retrato)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Cor da Moldura da Foto</label>
                <div className="flex gap-2">
                  <input type="color" value={config.corMoldura} onChange={(e) => update({ corMoldura: e.target.value })} className="w-10 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0" />
                  <input className={inputClass} value={config.corMoldura} onChange={(e) => update({ corMoldura: e.target.value })} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Borda na Foto</label>
                  <button
                    onClick={() => update({ bordaFoto: !config.bordaFoto })}
                    className={`w-10 h-5 rounded-full transition-colors ${config.bordaFoto ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${config.bordaFoto ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {config.bordaFoto && (
                  <div>
                    <label className={labelClass}>Espessura da Borda (px)</label>
                    <input type="number" min={1} max={20} className={inputClass} value={config.espessuraBorda} onChange={(e) => update({ espessuraBorda: Number(e.target.value) })} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Salvar Modelo */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Save className="w-4 h-4" /> Salvar Modelo
            </h4>
            <div className="flex gap-2">
              <input className={inputClass} placeholder="Nome do modelo..." value={nomeModelo} onChange={(e) => setNomeModelo(e.target.value)} />
              <button onClick={salvarModelo} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap">
                + Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArteCustomization;
