import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client"
import PortalPage from "./pages/PortalPage";
import Financeiro from "./pages/Financeiro";
import Login from "./pages/Login";
import Configuracoes from "./pages/Configuracoes"
import Agenda from "./pages/Agenda"
import Tecnica from "./pages/Tecnica"
import Processos from "./pages/Processos"

const queryClient = new QueryClient();
export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);    
  });

  return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary">
        </div>
      </div>
    )
  }

  const RotaProtegida = ({ children }: { children: React.ReactNode }) => {
    if (!session) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Joga direto pro login */}
          <Route 
            path="/"
            element={
            session? <Navigate to="/interno" replace />: <Login />
          } />

          <Route
            path="/"
            element={
              <Navigate to={session ? "/interno" : "/login"} replace />
            } />
          
          {/* A Rota do inicio */}
          <Route path="/login" element={<Login />} />
          <Route path="/interno" element={<RotaProtegida><PortalPage /></RotaProtegida>} />
          <Route path="/configuracoes" element={<RotaProtegida><Configuracoes /></RotaProtegida>} />

          {/* As Rotas dos Módulos*/}
          <Route path="/financeiro" element={<RotaProtegida><Financeiro /></RotaProtegida>} />
          <Route path="/agenda" element={<RotaProtegida><Agenda /></RotaProtegida>} />
          <Route path="/tecnica" element={<RotaProtegida><Tecnica /></RotaProtegida>} />
          <Route path="/processos" element={<RotaProtegida><Processos /></RotaProtegida>} />
          
          //pagina nao encontrada
          <Route
            path="*"
            element={
              <div className="flex h-screen items-center justify-center text-2xl font-bold text-gray-600">
              Página não encontrada.
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}