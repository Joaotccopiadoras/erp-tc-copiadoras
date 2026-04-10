import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PortalPage from "./pages/PortalPage";
import FinanceiroPage from "./pages/FinanceiroPage";
//import AgendaPage from "./pages/AgendaPage"
//import TecnicaPage from "./pages/TecnicaPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Joga direto pro inicio */}
        <Route path="/" element={<Navigate to="/interno" replace />} />
        
        {/* A Rota do Portal */}
        <Route path="/interno" element={<PortalPage />} />

        {/* As Rotas dos Módulos*/}
        <Route path="/financeiro" element={<FinanceiroPage />} />
        {/* <Route path="/agenda" element={<AgendaPage />} /> */}
        
        <Route path="*" element={
          <div className="flex h-screen items-center justify-center text-2xl font-bold text-gray-600">
            Página não encontrada.
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}