import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/shared/contexts/AuthContext";
import { Loader2 } from "lucide-react";

// 1. Instância Global do React Query (Cache Inteligente)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Mantém dados em cache por 5 minutos
      refetchOnWindowFocus: false, // Evita requisições ao Supabase só por mudar de aba
    },
  },
});

// 2. Code Splitting (FSD) - Importações Dinâmicas
// Módulos já migrados para a nova arquitetura
const Login = lazy(() => import("@/modules/auth/pages/Login"));
const Configuracoes = lazy(() => import("@/modules/configuracoes/pages/Configuracoes"));

// Módulos Legados (Preservando suas rotas antigas até migrarmos um a um)
const PortalPage = lazy(() => import("@/pages/PortalPage"));
const AgendaUmmense = lazy(() => import("@/pages/AgendaUmmense"));
const AgendaKanban = lazy(() => import("@/pages/AgendaKanban"));
const Fornecedores = lazy(() => import("@/pages/Fornecedores"));
const Crm = lazy(() => import("@/pages/Crm"));
const Processos = lazy(() => import("@/pages/Processos"));
const DepartamentoPessoal = lazy(() => import("@/pages/DepartamentoPessoal"));
const Comissoes = lazy(() => import("@/pages/Comissoes"));
const GestaoPatrimonio = lazy(() => import("@/pages/GestaoPatrimonio"));
const Financeiro = lazy(() => import("@/pages/Financeiro"));
const DashboardFinanceiro = lazy(() => import("@/pages/DashboardFinanceiro"));
const Logistica = lazy(() => import("@/pages/Logistica"));
const EntradasProdutos = lazy(() => import("@/pages/EntradasProdutos"));
const Compras = lazy(() => import("@/pages/Compras"));
const Requisicoes = lazy(() => import("@/pages/Requisicoes"));
const Comercial = lazy(() => import("@/pages/Comercial"));
const GestaoContratos = lazy(() => import("@/pages/GestaoContratos"));
const Tecnica = lazy(() => import("@/pages/ProgramacaoTecnica"));
const GestaoEquipamentos = lazy(() => import("@/pages/GestaoEquipamentos"));
const OrdensdeServico = lazy(() => import("@/pages/OrdensdeServico"));
const Recondicionamento = lazy(() => import("@/pages/Recondicionamento"));
const Grafica = lazy(() => import("@/pages/Grafica"));

// Componente de Tela de Carregamento para o Suspense
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Carregando Módulo...</span>
    </div>
  </div>
);

// Rota Protegida Global (Agora separada do App para não re-renderizar desnecessariamente)
const RotaProtegida = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  
  if (loading) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Rota Raiz */}
              <Route path="/" element={<Navigate to="/interno" replace />} />
              
              {/* Rotas Públicas */}
              <Route path="/login" element={<Login />} />
              
              {/* Rotas Privadas (Módulos Refatorados) */}
              <Route path="/interno" element={<RotaProtegida><PortalPage /></RotaProtegida>} />
              <Route path="/configuracoes" element={<RotaProtegida><Configuracoes /></RotaProtegida>} />

              {/* Rotas Privadas (Legado - Mantidas Exatamente como no original) */}
              <Route path="/agenda" element={<RotaProtegida><AgendaUmmense /></RotaProtegida>} />
              <Route path="/financeiro" element={<RotaProtegida><Financeiro /></RotaProtegida>} />
              <Route path="/logistica" element={<RotaProtegida><Logistica /></RotaProtegida>} />
              <Route path="/comercial" element={<RotaProtegida><Comercial /></RotaProtegida>} />
              <Route path="/tecnica" element={<RotaProtegida><Tecnica /></RotaProtegida>} />
              <Route path="/kanban" element={<RotaProtegida><AgendaKanban /></RotaProtegida>} />
              <Route path="/fornecedores" element={<RotaProtegida><Fornecedores /></RotaProtegida>} />
              <Route path="/crm" element={<RotaProtegida><Crm /></RotaProtegida>} />
              <Route path="/processos" element={<RotaProtegida><Processos /></RotaProtegida>} />
              <Route path="/deppessoal" element={<RotaProtegida><DepartamentoPessoal /></RotaProtegida>} />
              <Route path="/comissoes" element={<RotaProtegida><Comissoes /></RotaProtegida>} />
              <Route path="/patrimonio" element={<RotaProtegida><GestaoPatrimonio /></RotaProtegida>} />
              <Route path="/dashboardfinanceiro" element={<RotaProtegida><DashboardFinanceiro /></RotaProtegida>} />
              <Route path="/entradasprodutos" element={<RotaProtegida><EntradasProdutos /></RotaProtegida>} />
              <Route path="/compras" element={<RotaProtegida><Compras /></RotaProtegida>} />
              <Route path="/requisicoes" element={<RotaProtegida><Requisicoes /></RotaProtegida>} />
              <Route path="/contratos" element={<RotaProtegida><GestaoContratos /></RotaProtegida>} />
              <Route path="/equipamentos" element={<RotaProtegida><GestaoEquipamentos /></RotaProtegida>} />
              <Route path="/os" element={<RotaProtegida><OrdensdeServico /></RotaProtegida>} />
              <Route path="/recondicionamento" element={<RotaProtegida><Recondicionamento /></RotaProtegida>} />
              <Route path="/grafica" element={<RotaProtegida><Grafica /></RotaProtegida>} />
              
              {/* Página 404 */}
              <Route path="*" element={
                <div className="flex h-screen items-center justify-center text-xl font-bold text-slate-400">
                  404 | Página não encontrada ou módulo inexistente.
                </div>
              } />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}