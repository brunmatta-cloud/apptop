import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CultoProvider } from "@/contexts/CultoContext";
import { CronometroProvider } from "@/contexts/CronometroContext";
import AppLayout from "@/components/layout/AppLayout";
import React, { Suspense } from "react";

// Lazy load all pages for better initial load
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const PainelCerimonialista = React.lazy(() => import("./pages/PainelCerimonialista"));
const PainelSonoplastia = React.lazy(() => import("./pages/PainelSonoplastia"));
const PainelChamada = React.lazy(() => import("./pages/PainelChamada"));
const Programacao = React.lazy(() => import("./pages/Programacao"));
const LinhaDoTempo = React.lazy(() => import("./pages/LinhaDoTempo"));
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CultoProvider>
          <CronometroProvider>
            <AppLayout>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/cerimonialista" element={<PainelCerimonialista />} />
                  <Route path="/sonoplastia" element={<PainelSonoplastia />} />
                  <Route path="/chamada" element={<PainelChamada />} />
                  <Route path="/programacao" element={<Programacao />} />
                  <Route path="/editor" element={<Programacao />} />
                  <Route path="/linha-do-tempo" element={<LinhaDoTempo />} />
                  <Route path="/artes" element={<GeradorArtes />} />
                  <Route path="/foco" element={<ModoFoco />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />
                  <Route path="/estatisticas" element={<Estatisticas />} />
                  <Route path="/cronometro" element={<Cronometro />} />
                  <Route path="/cronometro-controle" element={<CronometroControle />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AppLayout>
          </CronometroProvider>
        </CultoProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
