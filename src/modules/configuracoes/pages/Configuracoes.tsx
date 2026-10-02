import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/shared/components/layout/AppLayout";
import { Settings, Lock, Wrench, Database, Landmark, Loader2, ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

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
  
  const { session, loading: carregandoSessao } = useAuth();
  const queryClient = useQueryClient();
  
  // React Query com revalidação forçada via refetch
  const { data: perfil, isLoading: carregandoPerfil, refetch } = useQuery({
    queryKey: ["perfilUsuarioLogado"],
    queryFn: buscarPerfilAtual,
    staleTime: 1000 * 60 * 30, // 30 minutos de cache
  });

  const isCurrentUserAdmin = perfil?.is_admin === true;

  // 1. Tela de Carregamento
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

  // 2. Blindagem com Painel de Diagnóstico (Em caso de falha)
  if (!isCurrentUserAdmin) {
    return (
      <AppLayout>
        <div className="flex flex-col justify-center items-center h-[75vh] max-w-xl mx-auto text-center space-y-4 animate-in fade-in">
          <div className="bg-red-50 p-4 rounded-full"><ShieldAlert className="w-16 h-16 text-red-500" /></div>
          <h1 className="text-2xl font-bold text-slate-800">Acesso Restrito</h1>
          <p className="text-slate-600">O sistema não confirmou as suas permissões de Administrador.</p>

          {/* PAINEL DE DIAGNÓSTICO SENIOR */}
          <div className="bg-slate-900 text-left p-6 rounded-xl w-full mt-6 shadow-2xl border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-amber-500"></div>
            <p className="text-amber-400 font-bold text-[11px] uppercase tracking-widest mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
              <Database className="w-4 h-4" /> Diagnóstico de Segurança (Modo Desenvolvedor)
            </p>
            
            <div className="space-y-4 text-sm font-mono text-slate-300">
              <div>
                <span className="text-slate-500 text-xs">1. E-mail lido pelo Sistema (Sessão Atual):</span> <br/>
                <span className="text-white font-bold">{session?.user?.email || "Nenhum e-mail detectado"}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs">2. Perfil correspondente no Banco de Dados:</span> <br/>
                <span className={perfil ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {perfil ? `Localizado (Nome: ${perfil.nome || 'Sem nome'})` : "Nenhum perfil encontrado para este e-mail!"}
                </span>
              </div>
              {perfil && (
                <div>
                  <span className="text-slate-500 text-xs">3. Status da coluna 'is_admin':</span> <br/>
                  <span className={perfil.is_admin ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {perfil.is_admin ? "TRUE (Autorizado)" : "FALSE (Bloqueado)"}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-[10px] text-slate-500 leading-tight">
                Se ajustou o banco recentemente, o cache<br/> pode estar a segurar o bloqueio antigo.
              </p>
              <Button 
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["perfilUsuarioLogado"] });
                  refetch();
                }} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 w-full sm:w-auto"
              >
                <RefreshCw className="w-4 h-4" /> Forçar Revalidação
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // 3. Renderização Principal se Autorizado
  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto mb-12 animate-in fade-in duration-300">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <Settings className="w-6 h-6 text-indigo-600" /> Governança e Configurações
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Painel central de parametrização e metadados do ERP TC Copiadoras.</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
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