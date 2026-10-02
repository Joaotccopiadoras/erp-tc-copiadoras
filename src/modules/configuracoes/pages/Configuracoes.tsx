import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/shared/components/layout/AppLayout";
import { Settings, Lock, Wrench, Printer, Landmark, MapPin, Database, Loader2 } from "lucide-react";

// Importação das fatias (Componentes) do Módulo
import TabSeguranca from "../components/TabSeguranca";
import TabTabelas from "../components/TabTabelas";
import TabEquipe from "../components/TabEquipe";
import TabEmails from "../components/TabEmails";

// Importações Globais
import { useAuth } from "@/shared/contexts/AuthContext";
import { buscarPerfilAtual } from "../api/usuarios";

export default function ConfiguracoesPage() {
  const [abaAtiva, setAbaAtiva] = useState<"seguranca" | "equipe" | "tabelas" | "automacoes">("seguranca");
  
  // Hook de Auth Global garante que a sessão existe
  const { loading: carregandoSessao } = useAuth();
  
  // React Query assume a validação de administrador com cache inteligente
  const { data: perfil, isLoading: carregandoPerfil } = useQuery({
    queryKey: ["perfilUsuarioLogado"],
    queryFn: buscarPerfilAtual,
    staleTime: 1000 * 60 * 30, // Guarda o status de admin na memória por 30 minutos
  });

  const isCurrentUserAdmin = perfil?.is_admin || false;

  // Mostra um spinner enquanto valida silenciosamente se você é chefe
  if (carregandoSessao || carregandoPerfil) {
    return (
      <AppLayout>
        <div className="flex h-[70vh] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="text-sm font-bold tracking-widest text-slate-400 uppercase">Validando Permissões...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto mb-12 animate-in fade-in duration-300">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <Settings className="w-6 h-6 text-indigo-600" /> Governança e Configurações
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Painel central de parametrização e metadados do ERP TC Copiadoras.</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* MENU LATERAL DE GOVERNANÇA */}
          <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0 bg-white p-3 rounded-xl border shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 mb-1">Acessos</h3>
            <button onClick={() => setAbaAtiva("seguranca")} className={`flex items-center p-3 text-sm font-semibold rounded-lg transition-colors ${abaAtiva === "seguranca" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}>
              <Lock className="w-4 h-4 mr-3" /> Segurança e RLS
            </button>

            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 mt-4 mb-1">Operação</h3>
            <button onClick={() => setAbaAtiva("equipe")} className={`flex items-center p-3 text-sm font-semibold rounded-lg transition-colors ${abaAtiva === "equipe" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>
              <Wrench className="w-4 h-4 mr-3" /> Cadastro de Equipe
            </button>
            <button onClick={() => setAbaAtiva("automacoes")} className={`flex items-center p-3 text-sm font-semibold rounded-lg transition-colors ${abaAtiva === "automacoes" ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50"}`}>
              <Database className="w-4 h-4 mr-3" /> Gatilhos e Webhooks
            </button>

            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 mt-4 mb-1">Parâmetros Globais</h3>
            <button onClick={() => setAbaAtiva("tabelas")} className={`flex items-center p-3 text-sm font-semibold rounded-lg transition-colors ${abaAtiva === "tabelas" ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"}`}>
              <Landmark className="w-4 h-4 mr-3" /> Tabelas Auxiliares
            </button>
          </div>

          {/* RENDERIZAÇÃO DINÂMICA DAS FATIAS */}
          <div className="flex-1 w-full min-w-0">
            {abaAtiva === "seguranca" && <TabSeguranca isCurrentUserAdmin={isCurrentUserAdmin} />}
            {abaAtiva === "equipe" && <TabEquipe />}
            {abaAtiva === "tabelas" && <TabTabelas />}
            {abaAtiva === "automacoes" && <TabEmails />}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}