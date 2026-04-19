import { Link, useLocation } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { 
  ArrowLeft,
  Boxes,
  Briefcase,
  Building2,
  Calendar,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Coins,
  Copy,
  Factory,
  FileSignature,
  FileText,
  Fingerprint,
  HandCoins,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  Network,
  Package, 
  PackageOpen,
  Printer,
  Receipt,
  Recycle,
  ScrollText,
  ShoppingBag,
  ShoppingCart,
  UploadCloud,
  Users,
  Workflow
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const MENU_GROUPS = [
  {
    titulo: "GERAL",
    itens: [
      { nome: "Central", url: "/", icone: LayoutGrid },
      { nome: "Agenda (Ummense)", url: "/agenda", icone: Calendar },
      { nome: "Agenda (Própria)", url: "/kanban", icone: Calendar },
      { nome: "Fornecedores (SRM)", url: "/fornecedores", icone: Factory },
      { nome: "Clientes (CRM)", url: "/crm", icone: Users },
    ]
  },
  {
    titulo: "ADMINISTRATIVO",
    itens: [
      { nome: "Gestão de Processos", url: "/processos", icone: Workflow },
      { nome: "Departamento Pessoal", url: "/deppessoal", icone: Fingerprint},
      { nome: "Gestão de Patrimônio", url: "/patrimonio", icone: Building2}
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
      { nome: "Compras", url: "/compras", icone: ShoppingCart},
      { nome: "Requisições", url: "/requisicoes", icone: ScrollText}
    ]
  },
  {
    titulo: "COMERCIAL",
    itens: [
      {nome: "Central Comercial", url: "/comercial", icone: ShoppingBag},
      {nome: "Contratos", url: "/contratos", icone: HandCoins},
    ]
  },
  {
    titulo: "ASSISTÊNCIA TÉCNICA",
    itens: [
      { nome: "Programação Técnica", url: "/tecnica", icone: CalendarClock },
      { nome: "Gestão de Equipamentos", url: "/equipamentos", icone: Printer },
      { nome: "Ordens de Serviço Técnico", url: "/os", icone: FileText},
      { nome: "Recondicionamento", url: "/recondicionamento", icone: Recycle},
    ]
  },
  {
    titulo: "TC SERVIÇOS",
    itens: [
      { nome: "Ordens de Serviço Gráfico", url: "/grafica", icone: Copy },
    ]
  }
];
  
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [menusExpandidos, setMenusExpandidos] = useState<string[]>([""])
  const [caminhoAtual, setCaminhoAtual] = useState("");
  const [sidebarAberta, setSidebarAberta] = useState(true);

  const [userName, setUserName] = useState("Carregando...");
  const [userEmail, setUserEmail] = useState("");
  const [userInitials, setUserInitials] = useState("--");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCaminhoAtual (window.location.pathname);
    }

  const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Tenta pegar o nome dos metadados (que configuraremos na página de Perfil no futuro)
        // Se não tiver, pega a parte do e-mail antes do @
        const nomeCompleto = user.user_metadata?.nome || user.user_metadata?.full_name || user.email?.split('@')[0] || "Usuário";
        
        setUserName(nomeCompleto);
        setUserEmail(user.email || "");

        // LÓGICA PARA GERAR AS INICIAIS (Ex: "João Gaia" -> "JG")
        const partesNome = nomeCompleto.trim().split(" ");
        if (partesNome.length >= 2) {
          setUserInitials((partesNome[0][0] + partesNome[partesNome.length - 1][0]).toUpperCase());
        } else {
          setUserInitials(nomeCompleto.substring(0, 2).toUpperCase());
        }
      }
    };

    loadUser();
  }, []);

  const toggleMenu = (titulo: string) => {
    setMenusExpandidos(prev =>
      prev.includes(titulo)
        ? prev.filter(m => m !== titulo)
        : [...prev, titulo]
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* BARRA LATERAL (SIDEBAR) COM ANIMAÇÃO DE ENTRADA/SAÍDA */}
      <aside 
        className={`bg-white border-r border-slate-200 flex flex-col shadow-sm z-20 flex-shrink-0 transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden
        ${sidebarAberta ? "w-64" : "w-0 border-none opacity-0"}`}
      >
        
        {/* LOGOTIPO */}
        <div className="h-20 flex items-center px-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo TC" className="w-10 h-10 object-contain rounded-md" 
                 onError={(e) => { e.currentTarget.style.display = 'none'; }} /> 
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

                {isExpandido && (
                  <div className="mt-1 mb-3 px-3 space-y-1 animate-in slide-in-from-top-2 fade-in duration-200">
                    {grupo.itens.map((item) => {
                      const isActive = caminhoAtual === item.url;
                      const Icone = item.icone;

                      return (
                        <a 
                          key={item.nome} 
                          href={item.url}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                            isActive 
                              ? "bg-indigo-50 text-indigo-700" 
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <Icone className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
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

        {/* RODAPÉ (Voltar ao Início) */}
        <div className="p-4 border-t border-slate-100 flex-shrink-0">
          <a href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Início
          </a>
        </div>
      </aside>

      {/* ÁREA CENTRAL DO CONTEÚDO */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/50">
        
        {/* BARRA SUPERIOR (HEADER) DINÂMICA */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm flex-shrink-0 z-10 transition-all">
          
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setSidebarAberta(!sidebarAberta)} 
                className="p-2 rounded-md hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-100"
                title="Alternar Menu Lateral"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {!sidebarAberta && (
                <div className="flex items-center gap-2 animate-in fade-in duration-300">
                     <img src="/logo.png" alt="Logo TC" className="w-8 h-8 object-contain rounded" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> 
                     <span className="font-black text-slate-800 tracking-tight hidden sm:block">TC COPIADORAS</span>
                </div>
            )}
          </div>

          {/* ÁREA DO USUÁRIO LOGADO */}
          <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
            <div className="text-right hidden md:block">
              {/* Exibe o Nome e o E-mail extraídos do Banco */}
              <p className="text-sm font-bold text-slate-800 leading-tight capitalize">{userName}</p>
              <p className="text-xs text-slate-500 font-medium">{userEmail}</p>
            </div>
            {/* Avatar com Iniciais dinâmicas */}
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 shadow-sm uppercase">
              {userInitials}
            </div>
          </div>

        </header>

        {/* CONTEÚDO DA PÁGINA ESPECÍFICA */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {children}
        </div>
      </main>

    </div>
  );
}