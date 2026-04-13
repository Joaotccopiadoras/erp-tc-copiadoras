import { Wrench, DollarSign, CalendarDays, LayoutDashboard, LogOut, Settings, IceCreamCone, UsersRound, TrendingUp, Package, Printer } from "lucide-react";
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
      nome: "Administrativo",
      descricao: "Gestão de projetos, processos e programação de equipes.",
      icone: <CalendarDays className="h-10 w-10 text-red-600" />,
      link: "/agenda",
      corBorda: "border-red-200 hover:border-red-500",
      corFundo: "hover:bg-red-50",
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
      nome: "Assistência Técnica",
      descricao: "Painel de produtividade e controle de atendimentos técnicos.",
      icone: <Wrench className="h-10 w-10 text-blue-600" />,
      link: "/tecnica",
      corBorda: "border-blue-200 hover:border-blue-500",
      corFundo: "hover:bg-blue-50",
    },
    {
      id: 4,
      nome: "Departamento Pessoal",
      descricao: "Gestão de pessoas, controle de jornada, recibos, declarações, folha.",
      icone: <UsersRound className="h-10 w-10 text-orange-600"/>,
      link: "/deppessoal",
      corBorda: "border-orange-200 hover:border-orange-500",
      corFundo: "hover:bg-orange-50",
    },
    {
      id: 5,
      nome: "Comercial",
      descricao: "Gestão de clientes, contratos, vendas e locações",
      icone: <TrendingUp className="h-10 w-10 text-yellow-600"/>,
      link: "/comercial",
      corBorda: "border-yellow-200 hover:border-yellow-500",
      corFundo: "hover:bg-yellow-50",
    },
    {
      id: 6,
      nome: "Logística",
      descricao: "Gestão de estoque, produtos, entradas e saídas.",
      icone: <Package className="h-10 w-10 text-brown-600"/>,
      link: "/logistica",
      corBorda: "border-stone-200 hover:border-stone-500",
      corFundo: "hover:bg-stone-50",
    },
    {
      id: 7,
      nome: "Gráfica",
      descricao: "Painel de produção, orçamentos e acabamentos.",
      icone: <Printer className="h-10 w-10 text-pink-600"/>,
      link: "/grafica",
      corBorda: "border-pink-200 hover:border-pink-500",
      corFundo:"hover:bg-pink-50",
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
            className={`flex flex-col items-center text-center p-10 bg-white rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-xl cursor-pointer transform hover:-translate-y-1 ${sistema.corBorda} ${sistema.corFundo} ${sistema.id === 7 ? 'md:col-start-2' : ''}`}
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

      <div className="mt-12 w-full max-w-xs">
        <button
         onClick={() => navigate("/configuracoes")}
          className="group w-full flex justify-center items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 hover:text-slate-900 transition-all duration-300 active:scale-95">
          <Settings className="w-5 h-5 text-slate-400 group-hover:text-slate-800 group-hover:rotate-90 transition-all duration-500" />
         Configurações do Sistema 
        </button>
       </div>

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