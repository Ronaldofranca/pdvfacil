import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import DashboardPage from "./pages/Dashboard";
import VendasPage from "./pages/Vendas";
import ClientesPage from "./pages/Clientes";
import ProdutosPage from "./pages/Produtos";
import EstoquePage from "./pages/Estoque";
import CatalogoInternalPage from "./pages/Catalogo";
import CatalogoPublicoPage from "./pages/catalogo/CatalogoPublico";
import CatalogoProdutoPage from "./pages/catalogo/CatalogoProduto";
import CatalogoTestemunhosPage from "./pages/catalogo/CatalogoTestemunhos";
import RomaneioPage from "./pages/Romaneio";
import FinanceiroPage from "./pages/Financeiro";
import RelatoriosPage from "./pages/Relatorios";
import UsuariosPage from "./pages/Usuarios";
import EmpresasPage from "./pages/Empresas";
import NotificacoesPage from "./pages/Notificacoes";
import SyncPage from "./pages/Sync";
import BackupPage from "./pages/Backup";
import AuditPage from "./pages/Audit";
import MaisPage from "./pages/Mais";
import LoginPage from "./pages/Login";

import AceitarConvitePage from "./pages/AceitarConvite";
import MapaClientesPage from "./pages/MapaClientes";
import MetasComissoesPage from "./pages/MetasComissoes";
import PrevisaoEstoquePage from "./pages/PrevisaoEstoque";
import AlertasPage from "./pages/Alertas";
import ConfiguracoesPage from "./pages/Configuracoes";
import DocumentacaoPage from "./pages/Documentacao";
import CobrancasPage from "./pages/Cobrancas";
import CaixaPage from "./pages/Caixa";
import ImportacaoPage from "./pages/ImportacaoMassa";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OfflineProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              
              <Route path="/aceitar-convite" element={<AceitarConvitePage />} />
              <Route path="/documentacao" element={<ProtectedRoute><DocumentacaoPage /></ProtectedRoute>} />
              {/* Public catalog routes */}
              <Route path="/catalogo" element={<CatalogoPublicoPage />} />
              <Route path="/catalogo/testemunhos" element={<CatalogoTestemunhosPage />} />
              <Route path="/catalogo/produtos" element={<CatalogoPublicoPage />} />
              <Route path="/catalogo/:id" element={<CatalogoProdutoPage />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/vendas" element={<VendasPage />} />
                <Route path="/clientes" element={<ClientesPage />} />
                <Route path="/produtos" element={<ProdutosPage />} />
                <Route path="/estoque" element={<EstoquePage />} />
                <Route path="/catalogo-interno" element={<CatalogoInternalPage />} />
                <Route path="/romaneio" element={<RomaneioPage />} />
                <Route path="/financeiro" element={<FinanceiroPage />} />
                <Route path="/cobrancas" element={<CobrancasPage />} />
                <Route path="/caixa" element={<CaixaPage />} />
                <Route path="/relatorios" element={<RelatoriosPage />} />
                <Route path="/usuarios" element={<ProtectedRoute requiredRole="admin"><UsuariosPage /></ProtectedRoute>} />
                <Route path="/empresas" element={<ProtectedRoute requiredRole="admin"><EmpresasPage /></ProtectedRoute>} />
                <Route path="/notificacoes" element={<NotificacoesPage />} />
                <Route path="/sync" element={<SyncPage />} />
                <Route path="/backup" element={<ProtectedRoute requiredRole="admin"><BackupPage /></ProtectedRoute>} />
                <Route path="/importacao" element={<ProtectedRoute requiredRole="admin"><ImportacaoPage /></ProtectedRoute>} />
                <Route path="/audit" element={<ProtectedRoute requiredRole="admin"><AuditPage /></ProtectedRoute>} />
                <Route path="/mapa-clientes" element={<MapaClientesPage />} />
                <Route path="/metas" element={<MetasComissoesPage />} />
                <Route path="/previsao-estoque" element={<PrevisaoEstoquePage />} />
                <Route path="/alertas" element={<AlertasPage />} />
                <Route path="/configuracoes" element={<ProtectedRoute requiredRole="admin"><ConfiguracoesPage /></ProtectedRoute>} />
                <Route path="/mais" element={<MaisPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </OfflineProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
