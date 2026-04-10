import { Wrench, DollarSign, CalendarDays, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client"

export default function PortalPage() {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate ("/login");
  }
  const sistemas = [
    {
      id: 1,
      nome: "Assistência Técnica",
      descricao: "Painel de produtividade e controle de atendimentos técnicos.",
      icone: <Wrench className="h-10 w-10 text-blue-600" />,
      // Rota interna unificado
      link: "/tecnica",
      corBorda: "border-blue-200 hover:border-blue-500",
      corFundo: "hover:bg-blue-50",
    },
    {
      id: 2,
      nome: "Financeiro",
      descricao: "Acompanhamento de faturamento, centros de custo e saúde financeira para planilha de custos.",
      icone: <DollarSign className="h-10 w-10 text-emerald-600" />,
      link: "/financeiro",
      corBorda: "border-emerald-200 hover:border-emerald-500",
      corFundo: "hover:bg-emerald-50",
    },
    {
      id: 3,
      nome: "Agendas Administrativas",
      descricao: "Gestão de projetos, processos e programação de equipes.",
      icone: <CalendarDays className="h-10 w-10 text-red-600" />,
      link: "/agenda",
      corBorda: "border-red-200 hover:border-red-500",
      corFundo: "hover:bg-red-50",
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-16 px-4 font-sans">
      
      {/* Cabeçalho*/}
      <div className="text-center mb-16">
        <div className="bg-white p-4 rounded-2xl inline-block shadow-sm mb-6 border border-slate-100">
          <img src="/logo.png" alt="TC Copiadoras" className="h-16 w-auto object-contain" />
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
          ERP TC Copiadoras
        </h1>
        <p className="text-slate-500 text-lg max-w-lg mx-auto">
          Central de Módulos. Selecione abaixo o módulo que deseja acessar.
        </p>
      </div>

      {/* Grid módulos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
        {sistemas.map((sistema) => (
          <Link
            key={sistema.id}
            to={sistema.link}
            className={`flex flex-col items-center text-center p-10 bg-white rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-xl cursor-pointer transform hover:-translate-y-1 ${sistema.corBorda} ${sistema.corFundo}`}
          >
            <div className="mb-6 bg-white p-4 rounded-full shadow-sm border border-slate-100">
              {sistema.icone}
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">{sistema.nome}</h2>
            <p className="text-slate-500 leading-relaxed">{sistema.descricao}</p>
          </Link>
        ))}
      </div>

      {/* Rodapé */}
      <div className="mt-auto pt-16 text-sm text-slate-400 font-medium">
        &copy; {new Date().getFullYear()} TC Copiadoras. ERP Interno - v1.0
      </div>

      <button
        onClick={() => navigate("/configuracoes")}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-primary-foreground transition-all">
        <Settings className="w-4 h-4" />
        Configurações
      </button>

      <button 
        onClick={handleLogout}
        className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sair do Sistema
      </button>
      
    </div>
  );
}