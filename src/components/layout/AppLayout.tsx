import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Radio, Volume2, List, Settings, Image, Focus, BarChart3, Menu, X, ChevronRight, Users, Clock, Timer, SlidersHorizontal
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/programacao', label: 'Programação', icon: List },
  { to: '/cerimonialista', label: 'Cerimonialista', icon: Radio },
  { to: '/sonoplastia', label: 'Sonoplastia', icon: Volume2 },
  { to: '/chamada', label: 'Chamada', icon: Users },
  { to: '/linha-do-tempo', label: 'Linha do Tempo', icon: Clock },
  { to: '/cronometro', label: 'Cronômetro', icon: Timer },
  { to: '/cronometro-controle', label: 'Controle Timer', icon: SlidersHorizontal },
  { to: '/foco', label: 'Modo Foco', icon: Focus },
  { to: '/artes', label: 'Gerador de Artes', icon: Image },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Full-screen pages without layout
  if (location.pathname === '/foco' || location.pathname === '/cronometro') {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar border-r border-sidebar-border fixed inset-y-0 left-0 z-30">
        <div className="p-5 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Radio className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-foreground">Culto ao Vivo</h2>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Sistema de Gestão</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-sidebar/95 backdrop-blur-xl border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Radio className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-sm">Culto ao Vivo</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            className="lg:hidden fixed inset-0 z-40 bg-background/98 backdrop-blur-xl pt-16"
          >
            <nav className="p-4 space-y-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-colors ${
                      isActive
                        ? 'bg-primary/15 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                  <ChevronRight className="w-4 h-4 ml-auto opacity-30" />
                </NavLink>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
