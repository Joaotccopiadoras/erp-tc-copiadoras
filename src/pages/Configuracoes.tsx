import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserPlus, Trash2 } from "lucide-react";

type Permissao = {
  id: string;
  email: string;
  acesso_financeiro: boolean;
};

export default function ConfiguracoesPage() {
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [novoEmail, setNovoEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    carregarPermissoes();
  }, []);

  const carregarPermissoes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("permissoes").select("*").order("criado_em", { ascending: true });
    if (!error && data) {
      setPermissoes(data);
    }
    setLoading(false);
  };

  const adicionarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoEmail.includes("@")) return;

    const { error } = await supabase.from("permissoes").insert([{ email: novoEmail.toLowerCase(), acesso_financeiro: false }]);
    
    if (error) {
      toast({ title: "Erro", description: "Este e-mail já está cadastrado ou houve uma falha.", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Usuário adicionado com sucesso!" });
      setNovoEmail("");
      carregarPermissoes();
    }
  };

  const alternarAcessoFinanceiro = async (id: string, valorAtual: boolean) => {
    const { error } = await supabase.from("permissoes").update({ acesso_financeiro: !valorAtual }).eq("id", id);
    if (!error) {
      carregarPermissoes(); // Recarrega a lista para mostrar o botão atualizado
    }
  };

  const removerUsuario = async (id: string) => {
    const { error } = await supabase.from("permissoes").delete().eq("id", id);
    if (!error) {
      toast({ title: "Removido", description: "Acesso revogado com sucesso." });
      carregarPermissoes();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Controle de Acessos
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie quais usuários podem acessar cada módulo do ERP.</p>
        </div>

        {/* Formulário para adicionar novo e-mail */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-semibold mb-4">Autorizar Novo E-mail</h2>
          <form onSubmit={adicionarUsuario} className="flex gap-3">
            <Input 
              type="email" 
              placeholder="Ex: joao@tccopiadoras.com.br" 
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
                <th className="px-6 py-4 font-medium text-right">Ações</th>
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
                        onClick={() => alternarAcessoFinanceiro(p.id, p.acesso_financeiro)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          p.acesso_financeiro 
                            ? "bg-green-100 text-green-700 hover:bg-green-200" 
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {p.acesso_financeiro ? "LIBERADO" : "BLOQUEADO"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => removerUsuario(p.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
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