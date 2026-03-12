import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Radio, Volume2, List, Settings, Image, Focus, Menu, X, ChevronRight, Users, Clock, Timer, SlidersHorizontal, ShieldCheck, PanelLeftClose, PanelLeftOpen, ClipboardCheck,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

const navItems = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/programacao', label: 'Programacao', icon: List },
  { to: '/cerimonialista', label: 'Cerimonialista', icon: Radio },
  { to: '/sonoplastia', label: 'Sonoplastia', icon: Volume2 },
  { to: '/chamada', label: 'Chamada', icon: Users },
  { to: '/confirmacao', label: 'Confirmacao', icon: ClipboardCheck },
  { to: '/moderador', label: 'Moderador', icon: ShieldCheck },
  { to: '/linha-do-tempo', label: 'Linha do Tempo', icon: Clock },
  { to: '/cronometro', label: 'Cronometro', icon: Timer },
  { to: '/cronometro-controle', label: 'Controle Timer', icon: SlidersHorizontal },
  { to: '/foco', label: 'Modo Foco', icon: Focus },
  { to: '/artes', label: 'Gerador de Artes', icon: Image },
  { to: '/configuracoes', label: 'Configuracoes', icon: Settings },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopMenuHidden, setDesktopMenuHidden] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const currentNav = navItems.find((item) => item.to === location.pathname);

  useEffect(() => {
    const stored = window.localStorage.getItem('app.desktopMenuHidden');
    if (stored === 'true') {
      setDesktopMenuHidden(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('app.desktopMenuHidden', String(desktopMenuHidden));
  }, [desktopMenuHidden]);

  useEffect(() => {
    if (!isMobile) return;
    setDesktopMenuHidden(false);
  }, [isMobile]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, isMobile]);

  useEffect(() => {
    document.documentElement.dataset.mobile = String(isMobile);
    document.body.dataset.mobile = String(isMobile);
    return () => {
      delete document.documentElement.dataset.mobile;
      delete document.body.dataset.mobile;
    };
  }, [isMobile]);

  if (location.pathname === '/foco' || location.pathname === '/cronometro') {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div data-mobile={isMobile} className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <aside className={`hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col overflow-hidden bg-sidebar border-r border-sidebar-border transition-all duration-200 ${desktopMenuHidden ? 'w-0 border-r-0' : 'w-64'}`}>
        <div className="p-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
                <Radio className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-display text-base font-bold text-foreground">Culto ao Vivo</h2>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Sistema de Gestao</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDesktopMenuHidden(true)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent/70 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Ocultar menu"
              title="Ocultar menu"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-4">
          <div className="h-px bg-sidebar-border" />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
                }`
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
          </div>
        </nav>

        <div className="px-4 pb-4">
          <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-3 text-xs text-muted-foreground">
            Recolha o menu para ganhar mais espaco na area principal.
          </div>
        </div>
      </aside>

      <div className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between border-b border-sidebar-border bg-sidebar/95 px-3 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Radio className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <span className="block truncate font-display text-sm font-bold">Culto ao Vivo</span>
            <span className="block truncate text-[11px] text-muted-foreground">{currentNav?.label ?? 'Painel'}</span>
          </div>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2 transition-colors hover:bg-muted">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/70 pt-16 backdrop-blur-xl lg:hidden"
          >
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
            className="h-full w-[88vw] max-w-[360px] border-r border-border bg-card shadow-2xl"
            >
              <nav className="h-full space-y-1 overflow-y-auto p-3 pb-8">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => (
                      `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
                        isActive
                          ? 'bg-primary/15 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                    <ChevronRight className="ml-auto h-4 w-4 opacity-30" />
                  </NavLink>
                ))}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {desktopMenuHidden && (
        <button
          type="button"
          onClick={() => setDesktopMenuHidden(false)}
          className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 items-center gap-2 rounded-r-2xl rounded-l-xl border border-border bg-card/90 px-2.5 py-3 text-muted-foreground shadow-lg backdrop-blur hover:bg-card hover:text-foreground lg:flex"
          aria-label="Mostrar menu"
          title="Mostrar menu"
        >
          <PanelLeftOpen className="h-4 w-4" />
          <span className="text-xs font-medium">Menu</span>
        </button>
      )}

      <main className={`min-w-0 flex-1 overflow-x-hidden pt-14 transition-all duration-200 lg:pt-0 ${desktopMenuHidden ? 'lg:ml-0' : 'lg:ml-64'}`}>
        <div
          key={`${location.pathname}-${isMobile ? 'mobile' : 'desktop'}`}
          data-mobile={isMobile}
          className="mx-auto w-full max-w-[1600px] min-w-0 px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5 lg:px-6 lg:py-6 xl:px-8 xl:py-8"
        >
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
