import { Link, useLocation } from "react-router-dom";
import { 
  Package, 
  PackageOpen, 
  Receipt, 
  UploadCloud, 
  Calendar, 
  LayoutDashboard,
  Boxes,
  CalendarClock,
  Workflow,
  Factory,
  ShoppingCart
} from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const path = location.pathname;

  const modulos = [
    {
      titulo: "Geral",
      menus: [
        { nome: "Central", url: "/", icone: LayoutDashboard },
        { nome: "Agenda", url: "/agenda", icone: Calendar },
      ]
    },
    {
      titulo: "Administrativo",
      menus: [
        { nome: "Gestão de Processos", url: "/processos", icone: Workflow },
      ]
    },
    {
      titulo: "Financeiro",
      menus: [
        { nome: "Dashboard Financeiro", url: "/financeiro", icone: Receipt },
        // { nome: "Upload CSV", url: "/upload-csv", icone: UploadCloud },
      ]
    },
    {
      titulo: "Logística e Estoque",
      menus: [
        { nome: "Catálogo", url: "/logistica", icone: Package },
        { nome: "Recebimento (NF-e)", url: "/entradasprodutos", icone: PackageOpen },
        { nome: "Fornecedores", url: "/fornecedores", icone: Factory },
        { nome; "Compras", url: "/compras", icone: ShoppingCart},
        // { nome: "Saídas / OS", url: "/saidas", icone: Boxes },
      ]
    },
    {
      titulo: "Assistência Técnica",
      menus: [
        { nome: "Programação Técnica", url: "/tecnica", icone: CalendarClock },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      
      {/* MENU LATERAL (SIDEBAR) */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-40">
        
        {/* LOGOTIPO */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-white font-bold text-xl shrink-0">
            TC
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">TC COPIADORAS</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Sistema ERP</p>
          </div>
        </div>

        {/* NAVEGAÇÃO MODULAR */}
        <nav className="p-4 flex-1 overflow-y-auto space-y-6">
          {modulos.map((modulo, idx) => (
            <div key={idx}>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">
                {modulo.titulo}
              </h3>
              <ul className="space-y-1">
                {modulo.menus.map((menu, mIdx) => {
                  const Icone = menu.icone;
                  const isAtivo = path === menu.url;
                  
                  return (
                    <li key={mIdx}>
                      <Link 
                        to={menu.url}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isAtivo 
                            ? "bg-emerald-50 text-emerald-700" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <Icone className={`w-5 h-5 ${isAtivo ? "text-emerald-600" : "text-slate-400"}`} />
                        {menu.nome}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* RODAPÉ DO MENU (Opcional: Voltar ao Início / Sair) */}
        <div className="p-4 border-t border-slate-100">
          <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-2 px-3 py-2">
            Voltar ao Início
          </Link>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 ml-64 min-w-0 p-8">
        {children}
      </main>
      
    </div>
  );
}