import { Printer, Upload, LayoutDashboard, Settings, Database, LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Upload, label: "Upload CSV", path: "/upload" },
  { icon: Database, label: "Registros", path: "/records" },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const handleVoltar = () => {
    navigate("/interno");
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar-bg border-r border-sidebar-border flex flex-col z-50">
      {/* CABEÇALHO COM LOGO E NOME */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="TC Copiadoras" 
            className="h-9 w-auto object-contain drop-shadow-sm rounded-md"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
             <Printer className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-sidebar-primary-foreground tracking-tight uppercase leading-tight">
              TC Copiadoras
            </h1>
            <p className="text-[11px] text-sidebar-fg/60">Gestão Financeira</p>
          </div>
        </div>
      </div>

      {/* NAVEGAÇÃO */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-primary-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* RODAPÉ COM CONFIGURAÇÕES E voltar */}
      <div className="p-3 border-t border-sidebar-border flex flex-col gap-1">
        <button
          onClick={() => navigate("/settings")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-primary-foreground transition-all"
        >
          <Settings className="w-4 h-4" />
          Configurações
        </button>
        
        {/* NOVO BOTÃO DE voltar */}
        <button
          onClick={handleVoltar}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 hover:text-destructive transition-all font-medium mt-1"
        >
          <LogOut className="w-4 h-4" />
          Voltar ao Início
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;