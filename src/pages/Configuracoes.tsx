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
  SelectValue 
} from "@/components/ui/select";

export default function ConfiguracoesPage() {
  const [permissoes, setPermissoes] = useState<any[]>([]);
  const [colaboradoresDP, setColaboradoresDP] = useState<any[]>([]);
  const [novoEmail, setNovoEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState<boolean | null>(null);
  
  // Estados para o Modal de Configuração Avançada (RBAC)
  const [usuarioEditando, setUsuarioEditando] = useState<any | null>(null);
  const [salvando, setSalvando] = useState(false);
  
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
      carregarDados();
    } else {
      setIsCurrentUserAdmin(false);
      setLoading(false);
    }
  };

  const carregarDados = async () => {
    // Busca a tabela de permissões e os funcionários do DP para poder vincular
    const [permRes, colabRes] = await Promise.all([
      supabase.from("permissoes").select("*, rh_colaboradores(nome)").order("criado_em", { ascending: true }),
      supabase.from("rh_colaboradores").select("id, nome, cargo").order("nome")
    ]);

    if (!permRes.error && permRes.data) setPermissoes(permRes.data);
    if (!colabRes.error && colabRes.data) setColaboradoresDP(colabRes.data);
    
    setLoading(false);
  };

  const adicionarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoEmail.includes("@")) return;

    const { error } = await supabase.from("permissoes").insert([{
      email: novoEmail.toLowerCase(),
      acesso_financeiro: false,
      is_admin: false,
      departamento: 'Geral',
      perfil_operacional: 'Nenhum'
    }]);
    
    if (error) {
      toast({ title: "Erro", description: "Este e-mail já está cadastrado ou houve uma falha.", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Usuário adicionado com sucesso!" });
      setNovoEmail("");
      carregarDados();
    }
  };

  const removerUsuario = async (id: string) => {
    if (!confirm("Tem certeza que deseja revogar o acesso deste usuário?")) return;
    const { error } = await supabase.from("permissoes").delete().eq("id", id);
    if (!error) {
      toast({ title: "Removido", description: "Acesso revogado com sucesso." });
      carregarDados();
    }
  };

  // --- FUNÇÕES DO MODAL AVANÇADO ---
  const abrirConfiguracoes = (usr: any) => {
    setUsuarioEditando({ ...usr });
  };

  const salvarConfiguracoes = async () => {
    setSalvando(true);
    try {
      const payload = {
        nome: usuarioEditando.nome,
        departamento: usuarioEditando.departamento,
        perfil_operacional: usuarioEditando.perfil_operacional,
        colaborador_id: usuarioEditando.colaborador_id === "nenhum" ? null : usuarioEditando.colaborador_id,
        is_admin: usuarioEditando.is_admin,
        acesso_financeiro: usuarioEditando.acesso_financeiro,
        pode_editar_os: usuarioEditando.pode_editar_os,
        pode_ver_dp_global: usuarioEditando.pode_ver_dp_global
      };

      const { error } = await supabase.from('permissoes').update(payload).eq('id', usuarioEditando.id);
      if (error) throw error;

      // Se ele estiver editando a si mesmo, atualiza o nome no cache do Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email === usuarioEditando.email) {
          await supabase.auth.updateUser({ data: { nome: usuarioEditando.nome } });
      }

      toast({ title: "Sucesso", description: "Perfil e Permissões atualizados!" });
      setUsuarioEditando(null);
      carregarDados();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const TogglePermission = ({ label, desc, checked, onChange }: any) => (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
      <div>
        <p className="text-sm font-bold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={checked || false} onChange={e => onChange(e.target.checked)} />
        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
      </label>
    </div>
  );

  // TELA DE ESPERA / BLOQUEIO
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

  // TELA LIBERADA (ADMIN)
  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto mb-12">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Lock className="w-6 h-6 text-slate-800" />
            Central de Segurança
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerenciamento de usuários, hierarquias, departamentos e permissões.</p>
        </div>

        {/* MODAL DE EDIÇÃO DE USUÁRIO (Aparece por cima) */}
        {usuarioEditando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-600"/> Configurar Perfil e Acessos</h2>
                    <p className="text-xs text-slate-500 font-mono mt-1">{usuarioEditando.email}</p>
                </div>
                <Button variant="ghost" onClick={() => setUsuarioEditando(null)}>Cancelar</Button>
              </div>

              <div className="p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                
                {/* BLOCO 1: IDENTIFICAÇÃO E DEPARTAMENTO */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><User className="w-4 h-4"/> 1. Identidade e Setor</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Nome de Exibição</label><Input value={usuarioEditando.nome || ""} onChange={e => setUsuarioEditando({...usuarioEditando, nome: e.target.value})} placeholder="Ex: João Gaia" /></div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Departamento Principal</label>
                            <Select value={usuarioEditando.departamento || "Geral"} onValueChange={v => setUsuarioEditando({...usuarioEditando, departamento: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent><SelectItem value="Geral">Geral / Sem Setor</SelectItem><SelectItem value="Diretoria">Diretoria</SelectItem><SelectItem value="Administrativo">Administrativo</SelectItem><SelectItem value="Financeiro">Financeiro</SelectItem><SelectItem value="Comercial">Comercial</SelectItem><SelectItem value="Licitações">Licitações</SelectItem><SelectItem value="Técnico">Assistência Técnica</SelectItem><SelectItem value="Gráfica">Produção Gráfica</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* BLOCO 2: VÍNCULOS OPERACIONAIS */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Briefcase className="w-4 h-4"/> 2. Vínculos Operacionais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700" title="Isso permite que ele seja selecionado como Técnico em OS ou Vendedor em Pedidos.">Perfil Operacional (Atuação)</label>
                            <Select value={usuarioEditando.perfil_operacional || "Nenhum"} onValueChange={v => setUsuarioEditando({...usuarioEditando, perfil_operacional: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent><SelectItem value="Nenhum">Nenhum / Apenas Administrativo</SelectItem><SelectItem value="Vendedor">Vendedor (Comercial)</SelectItem><SelectItem value="Técnico Externo">Técnico Externo (Rua)</SelectItem><SelectItem value="Técnico Laboratório">Técnico de Laboratório</SelectItem><SelectItem value="Operador Gráfico">Operador Gráfico</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700" title="Liga este login ao cadastro físico no Módulo de Departamento Pessoal.">Vínculo com Ficha do RH (DP)</label>
                            <Select value={usuarioEditando.colaborador_id || "nenhum"} onValueChange={v => setUsuarioEditando({...usuarioEditando, colaborador_id: v})}>
                                <SelectTrigger><SelectValue placeholder="Selecione o funcionário..."/></SelectTrigger>
                                <SelectContent><SelectItem value="nenhum">Sem vínculo com o RH</SelectItem>{colaboradoresDP.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} ({c.cargo})</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* BLOCO 3: CHAVES DE ACESSO (RBAC) */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Lock className="w-4 h-4"/> 3. Restrições e Acessos Modulares</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TogglePermission 
                            label="Acesso de Administrador" desc="Controle total sobre o sistema." 
                            checked={usuarioEditando.is_admin} onChange={(v:any) => setUsuarioEditando({...usuarioEditando, is_admin: v})} 
                        />
                        <TogglePermission 
                            label="Módulo Financeiro" desc="Permite visualizar caixa e contas." 
                            checked={usuarioEditando.acesso_financeiro} onChange={(v:any) => setUsuarioEditando({...usuarioEditando, acesso_financeiro: v})} 
                        />
                        <TogglePermission 
                            label="Editar Ordens de Serviço" desc="Permite alterar peças e status de OS." 
                            checked={usuarioEditando.pode_editar_os} onChange={(v:any) => setUsuarioEditando({...usuarioEditando, pode_editar_os: v})} 
                        />
                        <TogglePermission 
                            label="Visualizar Todo o DP" desc="Se desligado, verá apenas a própria ficha." 
                            checked={usuarioEditando.pode_ver_dp_global} onChange={(v:any) => setUsuarioEditando({...usuarioEditando, pode_ver_dp_global: v})} 
                        />
                    </div>
                </div>

              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
                <Button onClick={salvarConfiguracoes} disabled={salvando} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8">
                    {salvando ? "Salvando..." : "Salvar Perfil e Permissões"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Formulário para adicionar novo e-mail */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-2">
            <h2 className="text-sm font-bold text-slate-700">Autorizar Novo E-mail de Acesso</h2>
            <Input 
              type="email" 
              placeholder="Ex: tecnico@tccopiadoras.com.br" 
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              className="bg-slate-50"
            />
          </div>
          <Button onClick={adicionarUsuario} className="gap-2 bg-slate-800 hover:bg-slate-900 text-white w-full md:w-auto h-10">
            <UserPlus className="w-4 h-4" /> Cadastrar Login
          </Button>
        </div>

        {/* Tabela de Usuários e Governança */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Usuário / E-mail</th>
                  <th className="px-6 py-4 font-semibold">Departamento</th>
                  <th className="px-6 py-4 font-semibold">Perfil Operacional</th>
                  <th className="px-6 py-4 font-semibold text-center border-l border-slate-100">Tipo de Acesso</th>
                  <th className="px-6 py-4 font-semibold text-center border-l border-slate-100 w-36">Governança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Carregando permissões...</td></tr>
                ) : permissoes.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Nenhum e-mail cadastrado ainda.</td></tr>
                ) : (
                  permissoes.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 text-sm">{p.nome || 'Não definido'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{p.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                          {p.departamento || 'Geral'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-700">{p.perfil_operacional || 'Nenhum'}</p>
                        {p.rh_colaboradores?.nome && (
                            <p className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-1 border border-emerald-100">
                                <Fingerprint className="w-3 h-3"/> Vínculo DP Ativo
                            </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center border-l border-slate-100">
                        {p.is_admin ? (
                            <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-slate-800 text-white shadow-sm flex items-center justify-center gap-1 w-max mx-auto"><Shield className="w-3 h-3"/> Administrador</span>
                        ) : (
                            <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-500 w-max mx-auto border">Padrão</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center border-l border-slate-100">
                        <div className="flex items-center justify-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => abrirConfiguracoes(p)} className="h-8 text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 gap-1 shadow-sm">
                                <Settings className="w-3 h-3"/> Acessos
                            </Button>
                            <button onClick={() => removerUsuario(p.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}