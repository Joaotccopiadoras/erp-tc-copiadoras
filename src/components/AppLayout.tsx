import { Link, useLocation } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { 
  Boxes,
  Calendar,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Coins,
  Copy,
  Factory,
  FileText,
  Fingerprint,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Network,
  Package, 
  PackageOpen,
  Receipt,
  ScrollText,
  ShoppingBag,
  ShoppingCart,
  UploadCloud,
  Workflow
} from "lucide-react";

// Aqui está a correção: padronizamos todas as listas filhas para se chamarem "itens"
const MENU_GROUPS = [
  {
    titulo: "GERAL",
    itens: [
      { nome: "Central", url: "/", icone: LayoutGrid },
      { nome: "Agenda (Ummense)", url: "/agenda", icone: Calendar },
      { nome: "Agenda (Própria)", url: "/agendakanban", icone: Calendar },
    ]
  },
  {
    titulo: "ADMINISTRATIVO",
    itens: [
      { nome: "Gestão de Processos", url: "/processos", icone: Workflow },
      { nome: "Departamento Pessoal", url: "/deppessoal", icone: Fingerprint}
    ]
  },
  {
    titulo: "FINANCEIRO",
    itens: [
      { nome: "Central Financeira", url: "/financeiro", icone: Coins},
      { nome: "Dashboard Financeiro", url: "/dashboardfinanceiro", icone: Receipt },
    ]
  },
  {
    titulo: "LOGÍSTICA",
    itens: [
      { nome: "Catálogo", url: "/logistica", icone: Package },
      { nome: "Recebimento (NF-e)", url: "/entradasprodutos", icone: PackageOpen },
      { nome: "Fornecedores", url: "/fornecedores", icone: Factory },
      { nome: "Compras", url: "/compras", icone: ShoppingCart},
      { nome: "Requisições", url: "/requisicoes", icone: ScrollText}
    ]
  },
  {
    titulo: "COMERCIAL",
    itens: [
      {nome: "Central Comercial", url: "/comercial", icone: ShoppingBag},
    ]
  },
  {
    titulo: "ASSISTÊNCIA TÉCNICA",
    itens: [
      { nome: "Programação Técnica", url: "/tecnica", icone: CalendarClock },
      { nome: "Ordens de Serviço", url: "/os", icone: FileText}
    ]
  },
  {
    titulo: "TC SERVIÇOS",
    itens: [
      { nome: "PCP", url: "/grafica", icone: Copy },
    ]
  }
];
  
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [menusExpandidos, setMenusExpandidos] = useState<string[]>(["GERAL"])
  const [caminhoAtual, setCaminhoAtual] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCaminhoAtual (window.location.pathname);
    }
  }, []);

  const toggleMenu = (titulo: string) => {
    setMenusExpandidos(prev =>
      prev.includes(titulo)
        ? prev.filter(m => m !== titulo)
        : [...prev, titulo] // AQUI TINHA UM ERRO DE DIGITAÇÃO (ponto no lugar da vírgula), corrigido!
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* BARRA LATERAL (SIDEBAR) */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 flex-shrink-0">
        
        {/* LOGOTIPO */}
        <div className="h-20 flex items-center px-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-lg tracking-tighter">
              TC
            </div>
            <div>
              <h1 className="font-black text-slate-800 leading-tight tracking-tight">TC COPIADORAS</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistema ERP</p>
            </div>
          </div>
        </div>

        {/* ÁREA DE ROLAGEM DOS MENUS */}
        <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          {MENU_GROUPS.map((grupo) => {
            const isExpandido = menusExpandidos.includes(grupo.titulo);

            return (
              <div key={grupo.titulo} className="mb-2">
                {/* TÍTULO DO MÓDULO (BOTÃO ACORDEÃO) */}
                <button 
                  onClick={() => toggleMenu(grupo.titulo)}
                  className="w-full flex items-center justify-between px-6 py-2 text-left group transition-colors hover:bg-slate-50"
                >
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                    {grupo.titulo}
                  </span>
                  {isExpandido ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  )}
                </button>

                {/* LISTA DE PÁGINAS (EXPANDE/CONTRAI) */}
                {isExpandido && (
                  <div className="mt-1 mb-3 px-3 space-y-1 animate-in slide-in-from-top-2 fade-in duration-200">
                    {grupo.itens.map((item) => {
                      // Note que mudei item.href para item.url para casar com a sua lista
                      const isActive = caminhoAtual === item.url;
                      const Icone = item.icone;

                      return (
                        <a 
                          key={item.nome} 
                          href={item.url}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                            isActive 
                              ? "bg-emerald-50 text-emerald-700" 
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <Icone className={`w-4 h-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                          {item.nome}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* RODAPÉ DA SIDEBAR (Sair) */}
        <div className="p-4 border-t border-slate-100 flex-shrink-0">
          <a href="/login" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut className="w-4 h-4" />
            Sair do Sistema
          </a>
        </div>
      </aside>

      {/* ÁREA CENTRAL DO CONTEÚDO */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* CONTEÚDO DA PÁGINA ESPECÍFICA */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {children}
        </div>
      </main>

    </div>
  );
}