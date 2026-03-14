import { useMemo } from "react";
import { useTheme } from "next-themes";
import {
  BellRing,
  CheckCircle2,
  Info,
  Monitor,
  Moon,
  Palette,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Type,
} from "lucide-react";
import { useCronometro } from "@/contexts/CronometroContext";
import { useLiveRemoteState } from "@/contexts/SyncStoreContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type ThemeOptionId = "light" | "dark" | "system";

type ThemeOption = {
  id: ThemeOptionId;
  label: string;
  description: string;
  icon: typeof Sun;
};

type ColorControlProps = {
  label: string;
  description: string;
  value: string;
  onChange: (color: string) => void;
};

type RangeControlProps = {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
};

const themeOptions: ThemeOption[] = [
  {
    id: "light",
    label: "Claro",
    description: "Superficies luminosas, contraste limpo e leitura forte.",
    icon: Sun,
  },
  {
    id: "dark",
    label: "Escuro",
    description: "Visual operacional com profundidade e brilho controlado.",
    icon: Moon,
  },
  {
    id: "system",
    label: "Sistema",
    description: "Segue automaticamente a preferencia do dispositivo.",
    icon: Monitor,
  },
];

const settingsSections = [
  {
    id: "aparencia" as const,
    label: "Aparencia",
    description: "Tema, contraste e leitura",
    icon: Palette,
  },
  {
    id: "cronometro" as const,
    label: "Cronometro",
    description: "Tipografia, alertas e paleta",
    icon: BellRing,
  },
  {
    id: "sistema" as const,
    label: "Sistema",
    description: "Sessao, revisao e garantias",
    icon: Server,
  },
  {
    id: "sobre" as const,
    label: "Sobre",
    description: "Modulos e principios do app",
    icon: Info,
  },
];

const connectionLabel = (status: string) => {
  if (status === "online") return "Sincronizado";
  if (status === "degraded") return "Sincronizacao parcial";
  if (status === "offline") return "Offline";
  return "Conectando";
};

const connectionBadgeClass = (status: string, isLight: boolean) => {
  if (status === "online") return isLight ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-700" : "border-emerald-500/25 bg-emerald-500/12 text-emerald-400";
  if (status === "degraded") return isLight ? "border-amber-500/25 bg-amber-500/12 text-amber-700" : "border-amber-500/25 bg-amber-500/12 text-amber-300";
  if (status === "offline") return "border-destructive/25 bg-destructive/12 text-destructive";
  return "border-border/70 bg-muted/60 text-muted-foreground";
};

const ThemeOptionCard = ({
  option,
  isActive,
  onSelect,
}: {
  option: ThemeOption;
  isActive: boolean;
  onSelect: (id: ThemeOptionId) => void;
}) => {
  const Icon = option.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      className={cn(
        "group relative overflow-hidden rounded-[1.4rem] border p-4 text-left transition-all",
        "bg-background/70 hover:border-primary/40 hover:bg-background",
        isActive
          ? "border-primary/45 shadow-[0_24px_60px_-34px_rgba(37,99,235,0.45)]"
          : "border-border/70"
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-status-next/70 to-status-alert/70 opacity-80" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
              isActive ? "border-primary/30 bg-primary/12 text-primary" : "border-border/60 bg-muted/70 text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{option.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
          </div>
        </div>
        {isActive && <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />}
      </div>
    </button>
  );
};

const RangeControl = ({
  label,
  description,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: RangeControlProps) => (
  <div className="rounded-[1.3rem] border border-border/70 bg-background/55 p-4">
    <div className="mb-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <span className="rounded-full border border-border/70 bg-muted/70 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
        {value.toFixed(step < 1 ? 1 : 0)}
        {unit}
      </span>
    </div>
    <Slider
      value={[value]}
      onValueChange={([nextValue]) => onChange(nextValue)}
      min={min}
      max={max}
      step={step}
      className="w-full"
    />
  </div>
);

const ColorControl = ({ label, description, value, onChange }: ColorControlProps) => (
  <div className="rounded-[1.3rem] border border-border/70 bg-background/55 p-4">
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <input
          type="color"
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-11 cursor-pointer rounded-xl border border-border bg-transparent p-1"
        />
        <span className="min-w-[84px] rounded-full border border-border/70 bg-muted/70 px-2.5 py-1 text-center font-mono text-xs font-semibold text-muted-foreground">
          {value.toUpperCase()}
        </span>
      </div>
    </div>
  </div>
);

const Configuracoes = () => {
  const {
    isBlinking,
    setBlinking,
    topFontSize,
    setTopFontSize,
    bottomFontSize,
    setBottomFontSize,
    timerFontSize,
    setTimerFontSize,
    messageFontSize,
    setMessageFontSize,
    orangeThreshold,
    setOrangeThreshold,
    redThreshold,
    setRedThreshold,
    backgroundColor,
    setBackgroundColor,
    timerTextColor,
    setTimerTextColor,
    topTextColor,
    setTopTextColor,
    bottomTextColor,
    setBottomTextColor,
    messageTextColor,
    setMessageTextColor,
    warningColor,
    setWarningColor,
    dangerColor,
    setDangerColor,
    connectionStatus,
  } = useCronometro();
  const remoteState = useLiveRemoteState();
  const { theme = "dark", resolvedTheme = "dark", setTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const updatedAtLabel = useMemo(() => {
    const parsedDate = Date.parse(remoteState.updatedAt);
    if (!Number.isFinite(parsedDate) || parsedDate <= 0) {
      return "Aguardando primeira sincronizacao";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(parsedDate));
  }, [remoteState.updatedAt]);

  const selectedTheme = theme as ThemeOptionId;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
        <Card className="glass-card overflow-hidden border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Settings className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-2xl font-display">Configuracoes</CardTitle>
                <CardDescription className="mt-2 max-w-2xl text-sm leading-6">
                  Centralize tema, identidade visual do cronometro e informacoes de sistema em uma area unica,
                  sem alterar o fluxo operacional do app.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Tema ativo</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {resolvedTheme === "light" ? "Modo claro" : "Modo escuro"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {theme === "system" ? "Seguindo o sistema" : "Preferencia fixa do usuario"}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Sincronizacao</p>
              <Badge className={cn("mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold", connectionBadgeClass(connectionStatus, isLight))}>
                {connectionLabel(connectionStatus)}
              </Badge>
              <p className="mt-2 text-xs text-muted-foreground">Status da sessao compartilhada em tempo real.</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Fonte do tempo</p>
              <p className="mt-2 text-lg font-semibold text-foreground">Servidor</p>
              <p className="mt-1 text-xs text-muted-foreground">Desktop, tablet e celular usam o mesmo horario de referencia.</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Sessao</p>
              <p className="mt-2 truncate text-sm font-semibold text-foreground">{remoteState.sessionId}</p>
              <p className="mt-1 text-xs text-muted-foreground">Revisao {remoteState.revision}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardDescription className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Preview
              </CardDescription>
            </div>
            <CardTitle className="text-lg font-display">Ambiente visual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.6rem] border border-border/70 bg-card/90 p-4 shadow-[0_24px_50px_-40px_rgba(15,23,42,0.4)]">
              <div className="mb-4 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                <span>Painel</span>
                <span>{isLight ? "Claro" : "Escuro"}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                <div className="rounded-[1.2rem] border border-border/70 bg-sidebar/90 p-3">
                  <div className="space-y-2">
                    <div className="h-2.5 w-16 rounded-full bg-primary/80" />
                    <div className="h-8 rounded-xl bg-primary/10" />
                    <div className="h-8 rounded-xl bg-muted" />
                    <div className="h-8 rounded-xl bg-muted" />
                  </div>
                </div>
                <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-3">
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="h-2.5 w-20 rounded-full bg-foreground/90" />
                        <div className="mt-2 h-2 w-28 rounded-full bg-muted-foreground/50" />
                      </div>
                      <div className={cn(
                        "rounded-full border border-emerald-500/25 bg-emerald-500/12 px-2.5 py-1 text-[11px] font-semibold",
                        isLight ? "text-emerald-700" : "text-emerald-400"
                      )}>
                        Online
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-16 rounded-2xl bg-card shadow-sm" />
                      <div className="h-16 rounded-2xl bg-card shadow-sm" />
                      <div className="h-16 rounded-2xl bg-card shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-border/70 p-4" style={{ background: backgroundColor }}>
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.24em]" style={{ color: topTextColor }}>
                <span>Cronometro</span>
                <span>Preview</span>
              </div>
              <div className="mt-5 text-center">
                <p style={{ color: topTextColor, fontSize: `clamp(1rem, 3vw, ${topFontSize}rem)` }}>Louvor congregacional</p>
                <p
                  className="mt-2 font-mono font-black leading-none"
                  style={{ color: timerTextColor, fontSize: `clamp(3rem, 12vw, ${Math.max(6, timerFontSize * 0.6)}rem)` }}
                >
                  08:32
                </p>
                <p className="mt-3" style={{ color: bottomTextColor, fontSize: `clamp(0.95rem, 2vw, ${bottomFontSize}rem)` }}>
                  Ministerio de Louvor
                </p>
                <p className="mt-4" style={{ color: messageTextColor, fontSize: `clamp(1.1rem, 2.5vw, ${messageFontSize * 0.5}rem)` }}>
                  Equipe pronta
                </p>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-xl px-3 py-2 text-center text-xs font-semibold" style={{ background: timerTextColor, color: backgroundColor }}>
                  Timer
                </div>
                <div className="rounded-xl px-3 py-2 text-center text-xs font-semibold" style={{ background: warningColor, color: "#1f1300" }}>
                  Alerta
                </div>
                <div className="rounded-xl px-3 py-2 text-center text-xs font-semibold" style={{ background: dangerColor, color: "#ffffff" }}>
                  Critico
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="aparencia" className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start">
        <div className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-[1.5rem] border border-border/70 bg-card/70 p-3">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              return (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className={cn(
                    "h-auto justify-start rounded-[1rem] border border-transparent px-4 py-4 text-left",
                    "data-[state=active]:border-primary/25 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                    "data-[state=inactive]:bg-background/50 data-[state=inactive]:text-foreground"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-current/15 bg-current/10">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{section.label}</p>
                      <p className="mt-1 text-xs leading-5 opacity-75">{section.description}</p>
                    </div>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <Card className="glass-card hidden border-border/60 xl:block">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Painel lateral
              </CardDescription>
              <CardTitle className="text-lg font-display">Visao profissional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-[1.15rem] border border-border/70 bg-background/55 p-4">
                <p className="text-sm font-semibold text-foreground">Navegacao clara</p>
                <p className="mt-2 text-sm text-muted-foreground">Secoes fixas na lateral deixam desktop e tablet mais organizados.</p>
              </div>
              <div className="rounded-[1.15rem] border border-border/70 bg-background/55 p-4">
                <p className="text-sm font-semibold text-foreground">Mesmo motor</p>
                <p className="mt-2 text-sm text-muted-foreground">As opcoes continuam usando a mesma logica e os mesmos controles do app.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
        <TabsContent value="aparencia" className="mt-0 space-y-4">
          <Card className="glass-card border-border/60">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <CardDescription className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Interface
                </CardDescription>
              </div>
              <CardTitle className="text-xl font-display">Tema da interface</CardTitle>
              <CardDescription>
                O modo claro foi pensado para leitura forte, contraste controlado e superficies limpas, sem alterar o layout do app.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-3">
              {themeOptions.map((option) => (
                <ThemeOptionCard
                  key={option.id}
                  option={option}
                  isActive={selectedTheme === option.id}
                  onSelect={setTheme}
                />
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card border-border/60">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" />
                <CardDescription className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Leitura
                </CardDescription>
              </div>
              <CardTitle className="text-xl font-display">Direcao visual</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
                <p className="text-sm font-semibold text-foreground">Contraste balanceado</p>
                <p className="mt-2 text-sm text-muted-foreground">Texto principal forte, secundarios suaves e status destacados.</p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
                <p className="text-sm font-semibold text-foreground">Superficies modernas</p>
                <p className="mt-2 text-sm text-muted-foreground">Cards claros com profundidade leve e bordas discretas.</p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
                <p className="text-sm font-semibold text-foreground">Sidebar legivel</p>
                <p className="mt-2 text-sm text-muted-foreground">Navegacao continua consistente no escuro e no claro.</p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
                <p className="text-sm font-semibold text-foreground">Sem mudar a operacao</p>
                <p className="mt-2 text-sm text-muted-foreground">Tema altera apenas apresentacao visual, nao as regras do culto.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cronometro" className="mt-0 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="glass-card border-border/60">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-primary" />
                  <CardDescription className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    Tipografia
                  </CardDescription>
                </div>
                <CardTitle className="text-xl font-display">Escala de fontes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RangeControl label="Timer principal" description="Numero central do cronometro exibido nas telas." value={timerFontSize} min={6} max={40} step={1} unit="rem" onChange={setTimerFontSize} />
                <RangeControl label="Texto superior" description="Bloco e atividade do momento atual." value={topFontSize} min={1.25} max={8} step={0.1} unit="rem" onChange={setTopFontSize} />
                <RangeControl label="Texto inferior" description="Responsavel e suporte de leitura." value={bottomFontSize} min={1} max={6} step={0.1} unit="rem" onChange={setBottomFontSize} />
                <RangeControl label="Mensagem" description="Mensagens publicadas manualmente no cronometro." value={messageFontSize} min={2} max={24} step={0.5} unit="rem" onChange={setMessageFontSize} />
              </CardContent>
            </Card>

            <Card className="glass-card border-border/60">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-primary" />
                  <CardDescription className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    Alertas
                  </CardDescription>
                </div>
                <CardTitle className="text-xl font-display">Estados de atencao</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RangeControl label="Alerta laranja" description="Define quando o cronometro entra em aviso." value={orangeThreshold} min={10} max={600} step={10} unit="s" onChange={setOrangeThreshold} />
                <RangeControl label="Alerta vermelho" description="Define o ponto de atencao maxima." value={redThreshold} min={5} max={300} step={5} unit="s" onChange={setRedThreshold} />

                <Separator />

                <div className="flex items-center justify-between rounded-[1.3rem] border border-border/70 bg-background/55 p-4">
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-foreground">Piscar no alerta final</p>
                    <p className="text-xs text-muted-foreground">
                      Mantem a animacao do cronometro quando o estado critico for atingido.
                    </p>
                  </div>
                  <Switch checked={isBlinking} onCheckedChange={setBlinking} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card border-border/60">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <CardDescription className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Paleta
                </CardDescription>
              </div>
              <CardTitle className="text-xl font-display">Cores do cronometro</CardTitle>
              <CardDescription>
                Todos os ajustes abaixo reutilizam a configuracao ja existente do cronometro publico.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <ColorControl label="Fundo" description="Base da tela do cronometro." value={backgroundColor} onChange={setBackgroundColor} />
              <ColorControl label="Texto principal" description="Cor do numero do timer." value={timerTextColor} onChange={setTimerTextColor} />
              <ColorControl label="Texto superior" description="Bloco e atividade." value={topTextColor} onChange={setTopTextColor} />
              <ColorControl label="Texto inferior" description="Responsavel e apoio." value={bottomTextColor} onChange={setBottomTextColor} />
              <ColorControl label="Mensagem" description="Texto de mensagens manuais." value={messageTextColor} onChange={setMessageTextColor} />
              <ColorControl label="Aviso" description="Cor do estado laranja." value={warningColor} onChange={setWarningColor} />
              <ColorControl label="Critico" description="Cor do estado vermelho." value={dangerColor} onChange={setDangerColor} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sistema" className="mt-0 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="glass-card border-border/60">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  <CardDescription className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    Sessao
                  </CardDescription>
                </div>
                <CardTitle className="text-xl font-display">Estado sincronizado</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Sessao</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{remoteState.sessionId}</p>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Revisao</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{remoteState.revision}</p>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Ultima atualizacao</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{updatedAtLabel}</p>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Conexao</p>
                  <Badge className={cn("mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold", connectionBadgeClass(connectionStatus, isLight))}>
                    {connectionLabel(connectionStatus)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-border/60">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <CardDescription className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    Garantias
                  </CardDescription>
                </div>
                <CardTitle className="text-xl font-display">Como o app opera</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
                  <p className="text-sm font-semibold text-foreground">Fonte de verdade: backend</p>
                  <p className="mt-2 text-sm text-muted-foreground">Os estados do culto e do cronometro continuam vindo da sessao sincronizada no Supabase.</p>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
                  <p className="text-sm font-semibold text-foreground">Tempo alinhado ao servidor</p>
                  <p className="mt-2 text-sm text-muted-foreground">Desktop, tablet e celular usam a mesma referencia de horario para evitar atraso por relogio local.</p>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
                  <p className="text-sm font-semibold text-foreground">Tema desacoplado da operacao</p>
                  <p className="mt-2 text-sm text-muted-foreground">A troca entre claro e escuro afeta apenas apresentacao, sem mudar regras do culto nem comandos.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sobre" className="mt-0 space-y-4">
          <Card className="glass-card border-border/60">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <CardDescription className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Sobre
                </CardDescription>
              </div>
              <CardTitle className="text-xl font-display">Culto ao Vivo</CardTitle>
              <CardDescription>
                Painel operacional para acompanhamento de culto, cronometro, chamada, confirmacao e operacao ao vivo.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
                  <p className="text-sm font-semibold text-foreground">Modulos principais</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">Programacao</Badge>
                    <Badge variant="outline">Cerimonialista</Badge>
                    <Badge variant="outline">Sonoplastia</Badge>
                    <Badge variant="outline">Moderador</Badge>
                    <Badge variant="outline">Cronometro</Badge>
                    <Badge variant="outline">Chamada</Badge>
                    <Badge variant="outline">Confirmacao</Badge>
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
                  <p className="text-sm font-semibold text-foreground">Principios desta tela</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Mais opcoes e contexto de sistema, sem trocar layout geral do produto nem tocar nas logicas de culto.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
                  <p className="text-sm font-semibold text-foreground">Tempo e sincronizacao</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    O motor de tempo permanece baseado no estado do backend. A interface apenas projeta esse estado de forma visual.
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4">
                  <p className="text-sm font-semibold text-foreground">Aparencia moderna</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    O modo claro adiciona uma alternativa luminosa e legivel, mantendo a identidade do app e os mesmos componentes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
