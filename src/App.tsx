import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CultoProvider } from "@/contexts/CultoContext";
import { CronometroProvider } from "@/contexts/CronometroContext";
import { SyncStoreProvider } from "@/contexts/SyncStoreContext";
import AppErrorBoundary from "@/components/app/AppErrorBoundary";
import AppLayout from "@/components/layout/AppLayout";
import React, { Suspense } from "react";

// Lazy load all pages for better initial load
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const PainelCerimonialista = React.lazy(() => import("./pages/PainelCerimonialista"));
const PainelSonoplastia = React.lazy(() => import("./pages/PainelSonoplastia"));
const PainelChamada = React.lazy(() => import("./pages/PainelChamada"));
const Programacao = React.lazy(() => import("./pages/Programacao"));
const LinhaDoTempo = React.lazy(() => import("./pages/LinhaDoTempo"));
const Moderador = React.lazy(() => import("./pages/Moderador"));
const GeradorArtes = React.lazy(() => import("./pages/GeradorArtes"));
const ModoFoco = React.lazy(() => import("./pages/ModoFoco"));
const Configuracoes = React.lazy(() => import("./pages/Configuracoes"));
const Estatisticas = React.lazy(() => import("./pages/Estatisticas"));
const Cronometro = React.lazy(() => import("./pages/Cronometro"));
const CronometroControle = React.lazy(() => import("./pages/CronometroControle"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const withPageGuard = (element: React.ReactNode, description?: string) => (
  <AppErrorBoundary description={description}>
    {element}
  </AppErrorBoundary>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SyncStoreProvider>
          <CultoProvider>
            <CronometroProvider>
              <AppLayout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={withPageGuard(<Dashboard />)} />
                    <Route path="/cerimonialista" element={withPageGuard(<PainelCerimonialista />, "O painel do cerimonialista encontrou um erro, mas a navegacao foi preservada.")} />
                    <Route path="/sonoplastia" element={withPageGuard(<PainelSonoplastia />)} />
                    <Route path="/chamada" element={withPageGuard(<PainelChamada />)} />
                    <Route path="/programacao" element={withPageGuard(<Programacao />)} />
                    <Route path="/editor" element={withPageGuard(<Programacao />)} />
                    <Route path="/linha-do-tempo" element={withPageGuard(<LinhaDoTempo />)} />
                    <Route path="/moderador" element={withPageGuard(<Moderador />)} />
                    <Route path="/artes" element={withPageGuard(<GeradorArtes />)} />
                    <Route path="/foco" element={withPageGuard(<ModoFoco />)} />
                    <Route path="/configuracoes" element={withPageGuard(<Configuracoes />)} />
                    <Route path="/estatisticas" element={withPageGuard(<Estatisticas />)} />
                    <Route path="/cronometro" element={withPageGuard(<Cronometro />, "O cronometro falhou ao renderizar. A tela foi contida para evitar pagina preta.")} />
                    <Route path="/cronometro-controle" element={withPageGuard(<CronometroControle />, "O controle do cronometro falhou ao renderizar. A aplicacao foi mantida ativa.")} />
                    <Route path="*" element={withPageGuard(<NotFound />)} />
                  </Routes>
                </Suspense>
              </AppLayout>
            </CronometroProvider>
          </CultoProvider>
        </SyncStoreProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
