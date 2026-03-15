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
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import React, { Suspense } from "react";

// Lazy load all pages for better initial load
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const PainelCerimonialista = React.lazy(() => import("./pages/PainelCerimonialista"));
const PainelSonoplastia = React.lazy(() => import("./pages/PainelSonoplastia"));
const PainelChamada = React.lazy(() => import("./pages/PainelChamada"));
const ListaConfirmacao = React.lazy(() => import("./pages/ListaConfirmacao"));
const Programacao = React.lazy(() => import("./pages/Programacao"));
const LinhaDoTempo = React.lazy(() => import("./pages/LinhaDoTempo"));
const Moderador = React.lazy(() => import("./pages/Moderador"));
const GeradorArtes = React.lazy(() => import("./pages/GeradorArtes"));
const ModoFoco = React.lazy(() => import("./pages/ModoFoco"));
const Configuracoes = React.lazy(() => import("./pages/Configuracoes"));
const Estatisticas = React.lazy(() => import("./pages/Estatisticas"));
const Cronometro = React.lazy(() => import("./pages/Cronometro"));
const CronometroControle = React.lazy(() => import("./pages/CronometroControle"));
const MusicaMomento = React.lazy(() => import("./pages/MusicaMomento"));
const MusicaEquipe = React.lazy(() => import("./pages/MusicaEquipe"));
const CadastroPessoas = React.lazy(() => import("./pages/CadastroPessoas"));
const DebugTokens = React.lazy(() => import("./pages/DebugTokens"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const UploadMusica = React.lazy(() => import("./pages/UploadMusica"));
const UploadMedia = React.lazy(() => import("./pages/UploadMedia"));
const BibliotecaMusicas = React.lazy(() => import("./pages/BibliotecaMusicas"));
const BibliotecaMedia = React.lazy(() => import("./pages/BibliotecaMedia"));
const MediaControl = React.lazy(() => import("./pages/MediaControl"));
const DisplayView = React.lazy(() => import("./pages/DisplayView"));
const DisplayManager = React.lazy(() => import("./pages/DisplayManager"));
const GerenciarBases = React.lazy(() => import("./pages/GerenciarBases"));
const SlidesControl = React.lazy(() => import("./pages/SlidesControl"));
const EditorProgramacao = React.lazy(() => import("./pages/EditorProgramacao"));

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
    <AppThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="culto-ui-theme" disableTransitionOnChange>
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
                      <Route path="/confirmacao" element={withPageGuard(<ListaConfirmacao />)} />
                      <Route path="/programacao" element={withPageGuard(<Programacao />)} />
                      <Route path="/editor" element={withPageGuard(<EditorProgramacao />, "O editor de programacao encontrou um erro.")} />
                      <Route path="/linha-do-tempo" element={withPageGuard(<LinhaDoTempo />)} />
                      <Route path="/moderador" element={withPageGuard(<Moderador />)} />
                      <Route path="/artes" element={withPageGuard(<GeradorArtes />)} />
                      <Route path="/foco" element={withPageGuard(<ModoFoco />)} />
                      <Route path="/configuracoes" element={withPageGuard(<Configuracoes />)} />
                      <Route path="/estatisticas" element={withPageGuard(<Estatisticas />)} />
                      <Route path="/cronometro" element={withPageGuard(<Cronometro />, "O cronometro falhou ao renderizar. A tela foi contida para evitar pagina preta.")} />
                      <Route path="/cronometro-controle" element={withPageGuard(<CronometroControle />, "O controle do cronometro falhou ao renderizar. A aplicacao foi mantida ativa.")} />
                      <Route path="/pessoas" element={withPageGuard(<CadastroPessoas />)} />
                      <Route path="/debug-tokens" element={withPageGuard(<DebugTokens />, "A ferramenta de debug encontrou um erro.")} />
                      <Route path="/musica/:token" element={withPageGuard(<MusicaMomento />, "A pagina externa do repertorio falhou ao renderizar, mas o restante do app segue ativo.")} />
                      <Route path="/equipe-musica/:token" element={withPageGuard(<MusicaEquipe />, "A pagina da equipe musical falhou ao renderizar, mas o restante do app segue ativo.")} />

                      {/* Media Library Routes */}
                      <Route path="/media/upload" element={withPageGuard(<UploadMusica />, "A pagina de upload de musica encontrou um erro.")} />
                      <Route path="/media/upload-media" element={withPageGuard(<UploadMedia />, "A pagina de upload de midia encontrou um erro.")} />
                      <Route path="/media/audio" element={withPageGuard(<BibliotecaMusicas />, "A biblioteca de musicas encontrou um erro.")} />
                      <Route path="/media/:tipo" element={withPageGuard(<BibliotecaMedia />, "A biblioteca de midia encontrou um erro.")} />
                      <Route path="/media" element={withPageGuard(<BibliotecaMedia />, "A biblioteca de midia encontrou um erro.")} />
                      <Route path="/media-control" element={withPageGuard(<MediaControl />, "O controle de midia encontrou um erro.")} />

                      {/* Display Routes */}
                      <Route path="/displays" element={withPageGuard(<DisplayManager />, "O gerenciador de displays encontrou um erro.")} />
                      <Route path="/display/:tipo" element={withPageGuard(<DisplayView />, "O display encontrou um erro.")} />
                      <Route path="/slides-control" element={withPageGuard(<SlidesControl />, "O passador de slides encontrou um erro.")} />

                      {/* Settings Routes */}
                      <Route path="/settings/bases" element={withPageGuard(<GerenciarBases />, "O gerenciamento de bases encontrou um erro.")} />

                      <Route path="*" element={withPageGuard(<NotFound />)} />
                    </Routes>
                  </Suspense>
                </AppLayout>
              </CronometroProvider>
            </CultoProvider>
          </SyncStoreProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AppThemeProvider>
  </QueryClientProvider>
);

export default App;
