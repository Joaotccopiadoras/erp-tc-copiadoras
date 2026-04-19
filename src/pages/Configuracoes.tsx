import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase,
  CheckCircle,
  Fingerprint,
  Lock,
  Settings, 
  Shield,
  ShieldAlert, 
  Trash2,
  User,
  UserPlus
  } from "lucide-react";
import {
  Select, 
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from "@/components/ui/select";


type Permissao = {
  id: string;
  email: string;
  acesso_financeiro: boolean;
  is_admin: boolean;
};

export default function ConfiguracoesPage() {
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [novoEmail, setNovoEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    verificarAcessoAdmin();
  }, []);

    const verificarAcessoAdmin = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        setIsCurrentUserAdmin(false);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("permissoes")
        .select("is_admin")
        .eq("email", user.email)
        .single();

      if (data?.is_admin) {
        setIsCurrentUserAdmin(true);
        carregarPermissoes();
      } else {
        setIsCurrentUserAdmin(false);
        setLoading(false);
      };
    }

  const carregarPermissoes = async () => {
    const { data, error } = await supabase.from("permissoes").select("*").order("criado_em", { ascending: true });
    if (!error && data) {
      setPermissoes(data);
    }
    setLoading(false);
  };

  const adicionarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoEmail.includes("@")) return;

    const { error } = await supabase.from("permissoes").insert([{
      email: novoEmail.toLowerCase(),
      acesso_financeiro: false,
      is_admin: false
    }]);
    
    if (error) {
      toast({ title: "Erro", description: "Este e-mail já está cadastrado ou houve uma falha.", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Usuário adicionado com sucesso!" });
      setNovoEmail("");
      carregarPermissoes();
    }
  };

  const alternarPermissao = async (
    id: string,
    campo: 'acesso_financeiro' | 'is_admin',
    valorAtual: boolean) => {
    const { error } = await supabase.from("permissoes").update({ [campo]: !valorAtual }).eq("id", id);
    if (!error)
      carregarPermissoes();
    };

  const removerUsuario = async (id: string) => {
    const { error } = await supabase.from("permissoes").delete().eq("id", id);
    if (!error) {
      toast({ title: "Removido", description: "Acesso revogado com sucesso." });
      carregarPermissoes();
    }
  };

  //tela de espera
  if (isCurrentUserAdmin === false) {
    return (
    <AppLayout>
        <div className="flex flex-col justify-center items-center h-[70vh] max-w-md mx-auto text-center space-y-4">
          <div className="bg-red-50 p-4 rounded-full">
            <ShieldAlert className="w-16 h-16 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Acesso Restrito</h1>
          <p className="text-slate-600">
            Você não tem permissão de Administrador para visualizar ou alterar as configurações do sistema.
          </p>
        </div>
      </AppLayout>
    );
  }

//tela liberada p/ mim e outros admin
  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Lock className="w-6 h-6 text-primary" />
            Central de Segurança
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerenciamento de usuários, administradores e permissões de módulos.</p>
        </div>

        {/* Formulário para adicionar novo e-mail */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-semibold mb-4">Autorizar Novo E-mail</h2>
          <form onSubmit={adicionarUsuario} className="flex gap-3">
            <Input 
              type="email" 
              placeholder="Ex: financeiro@tccopiadoras.com.br" 
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              className="max-w-md"
              required
            />
            <Button type="submit" className="gap-2">
              <UserPlus className="w-4 h-4" /> Cadastrar E-mail
            </Button>
          </form>
        </div>

        {/* Tabela de Usuários */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-medium">E-mail do Usuário</th>
                <th className="px-6 py-4 font-medium text-center">Acesso Financeiro</th>
                <th className="px-6 py-4 font-medium text-center border-l border-slate-200">É Administrador?</th>
                <th className="px-6 py-4 font-medium text-right border-l border-slate-200">Remover</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">Carregando permissões...</td></tr>
              ) : permissoes.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">Nenhum e-mail cadastrado ainda.</td></tr>
              ) : (
                permissoes.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-slate-800 font-medium">{p.email}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => alternarPermissao(p.id, 'acesso_financeiro', p.acesso_financeiro)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          p.acesso_financeiro 
                            ? "bg-green-100 text-green-700 hover:bg-green-200" 
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {p.acesso_financeiro ? "LIBERADO" : "BLOQUEADO"}
                      </button>
                    </td>
                    <td className="px-8 py-4 text-center border-l border-slate-100">
                      <button
                        onClick={() => alternarPermissao(p.id, 'is_admin', p.is_admin)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            p.is_admin ? "bg-primary/20 text-primary hover:bg-primary/30" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {p.is_admin ? "ADMINISTRADOR" : "USUÁRIO COMUM"}
                        </button>
                    </td>
                    <td className="px-6 py-4 text-right border-l border-slate-100">
                      <Button variant="ghost" size="icon" 
                        onClick={() => removerUsuario(p.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}