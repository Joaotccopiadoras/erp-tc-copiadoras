import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import PortalPage from "./pages/PortalPage";
import FinanceiroPage from "./pages/FinanceiroPage";
import AgendaPage from "./pages/AgendaPage";
import TecnicaPage from "./pages/TecnicaPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota raiz: Futuramente será o seu Site. Por enquanto, joga pro Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* O Login Único */}
        <Route path="/login" element={<LoginPage />} />

        {/* O Portal Interno (após logar) */}
        <Route path="/interno" element={<PortalPage />} />

        {/* Os Módulos do ERP */}
        <Route path="/financeiro" element={<FinanceiroPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/tecnica" element={<TecnicaPage />} />
      </Routes>
    </BrowserRouter>
  );
}