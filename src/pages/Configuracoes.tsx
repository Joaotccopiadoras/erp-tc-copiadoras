import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase, CheckCircle, Fingerprint, Lock, Settings, Shield,
  ShieldAlert, Trash2, User, UserPlus, Landmark, Tags, MapPin,
  Plus, Edit, Save, X, Loader2
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

export default function ConfiguracoesPage() {
  const [abaAtiva, setAbaAtiva] = useState<"seguranca" | "contas" | "categorias" | "locais">("seguranca");
  const { toast } = useToast();

  // ==========================================
  // ESTADOS DA ABA: SEGURANÇA E USUÁRIOS
  // ==========================================
  const [permissoes, setPermissoes] = useState<any[]>([]);
  const [colaboradoresDP, setColaboradoresDP] = useState<any[]>([]);
  const [novoEmail, setNovoEmail] = useState("");
  const [loadingSeguranca, setLoadingSeguranca] = useState(true);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState<boolean | null>(null);
  
  // Modal de Configuração Avançada (RBAC)
  const [usuarioEditando, setUsuarioEditando] = useState<any | null>(null);
  const [salvandoSeguranca, setSalvandoSeguranca] = useState(false);

  // ==========================================
  // ESTADOS DAS ABAS: TABELAS AUXILIARES
  // ==========================================
  const [dadosAuxiliares, setDadosAuxiliares] = useState<any[]>([]);
  const [carregandoAuxiliares, setCarregandoAuxiliares] = useState(false);
  const [salvandoAuxiliar, setSalvandoAuxiliar] = useState(false);

  const [mostrarFormAuxiliar, setMostrarFormAuxiliar] = useState(false);
  const [editandoAuxiliarId, setEditandoAuxiliarId] = useState<string | null>(null);
  const [nomeAuxiliar, setNomeAuxiliar] = useState("");
  const [tipoCategoria, setTipoCategoria] = useState("Despesa");

  // ==========================================
  // EFEITOS E BUSCAS GERAIS
  // ==========================================
  useEffect(() => {
    verificarAcessoAdmin();
  }, []);

  useEffect(() => {
    if (abaAtiva === "seguranca") {
        if (isCurrentUserAdmin) carregarDadosSeguranca();
    } else {
        fetchDadosAuxiliares();
        limparFormularioAuxiliar();
    }
  }, [abaAtiva, isCurrentUserAdmin]);


  // ==========================================
  // LÓGICA DA ABA: SEGURANÇA
  // ==========================================
  const verificarAcessoAdmin = async () => {
    setLoadingSeguranca(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.email) {
      setIsCurrentUserAdmin(false);
      setLoadingSeguranca(false);
      return;
    }

    const { data } = await supabase.from("permissoes").select("is_admin").eq("email", user.email).single();

    if (data?.is_admin) {
      setIsCurrentUserAdmin(true);
      carregarDadosSeguranca();
    } else {
      setIsCurrentUserAdmin(false);
      setLoadingSeguranca(false);
    }
  };

  const carregarDadosSeguranca = async () => {
    const [permRes, colabRes] = await Promise.all([
      supabase.from("permissoes").select("*, rh_colaboradores(nome)").order("criado_em", { ascending: true }),
      supabase.from("rh_colaboradores").select("id, nome, cargo").order("nome")
    ]);

    if (!permRes.error && permRes.data) setPermissoes(permRes.data);
    if (!colabRes.error && colabRes.data) setColaboradoresDP(colabRes.data);
    
    setLoadingSeguranca(false);
  };

  const adicionarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoEmail.includes("@")) return;

    const { error } = await supabase.from("permissoes").insert([{
      email: novoEmail.toLowerCase(), acesso_financeiro: false, is_admin: false,
      departamento: 'Geral', perfil_operacional: 'Nenhum'
    }]);
    
    if (error) toast({ title: "Erro", description: "Este e-mail já está cadastrado ou houve uma falha.", variant: "destructive" });
    else { toast({ title: "Sucesso", description: "Usuário adicionado com sucesso!" }); setNovoEmail(""); carregarDadosSeguranca(); }
  };

  const removerUsuario = async (id: string) => {
    if (!confirm("Tem certeza que deseja revogar o acesso deste usuário?")) return;
    const { error } = await supabase.from("permissoes").delete().eq("id", id);
    if (!error) { toast({ title: "Removido", description: "Acesso revogado com sucesso." }); carregarDadosSeguranca(); }
  };

  const salvarConfiguracoesUsuario = async () => {
    setSalvandoSeguranca(true);
    try {
      const payload = {
        nome: usuarioEditando.nome, departamento: usuarioEditando.departamento,
        perfil_operacional: usuarioEditando.perfil_operacional,
        colaborador_id: usuarioEditando.colaborador_id === "nenhum" ? null : usuarioEditando.colaborador_id,
        is_admin: usuarioEditando.is_admin, acesso_financeiro: usuarioEditando.acesso_financeiro,
        pode_editar_os: usuarioEditando.pode_editar_os, pode_ver_dp_global: usuarioEditando.pode_ver_dp_global
      };

      const { error } = await supabase.from('permissoes').update(payload).eq('id', usuarioEditando.id);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email === usuarioEditando.email) {
          await supabase.auth.updateUser({ data: { nome: usuarioEditando.nome } });
      }

      toast({ title: "Sucesso", description: "Perfil e Permissões atualizados!" });
      setUsuarioEditando(null); carregarDadosSeguranca();
    } catch (e: any) { toast({ title: "Erro", description: e.message, variant: "destructive" }); } 
    finally { setSalvandoSeguranca(false); }
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


  // ==========================================
  // LÓGICA DAS ABAS: TABELAS AUXILIARES
  // ==========================================
  const fetchDadosAuxiliares = async () => {
    setCarregandoAuxiliares(true);
    let table = ""; let orderBy = "nome";

    if (abaAtiva === "contas") table = "fin_contas_bancarias";
    else if (abaAtiva === "categorias") table = "fin_categorias";
    else if (abaAtiva === "locais") table = "log_locais";

    if (!table) return;

    try {
      const { data, error } = await supabase.from(table).select("*").order(orderBy);
      if (error) throw error;
      setDadosAuxiliares(data || []);
    } catch (error: any) { alert("Erro ao carregar dados: " + error.message); } 
    finally { setCarregandoAuxiliares(false); }
  };

  const limparFormularioAuxiliar = () => {
    setMostrarFormAuxiliar(false); setEditandoAuxiliarId(null);
    setNomeAuxiliar(""); setTipoCategoria("Despesa");
  };

  const salvarAuxiliar = async () => {
    if (!nomeAuxiliar.trim()) return alert("O nome é obrigatório!");
    setSalvandoAuxiliar(true);
    
    let table = "";
    if (abaAtiva === "contas") table = "fin_contas_bancarias";
    else if (abaAtiva === "categorias") table = "fin_categorias";
    else if (abaAtiva === "locais") table = "log_locais";

    const payload: any = { nome: nomeAuxiliar.trim() };
    if (abaAtiva === "categorias") payload.tipo = tipoCategoria;

    try {
      if (editandoAuxiliarId) {
        const { error } = await supabase.from(table).update(payload).eq("id", editandoAuxiliarId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert([payload]);
        if (error) throw error;
      }
      toast({ title: "Sucesso", description: "Registro salvo com sucesso!" });
      limparFormularioAuxiliar(); fetchDadosAuxiliares();
    } catch (error: any) { alert("Erro ao salvar: " + error.message); } 
    finally { setSalvandoAuxiliar(false); }
  };

  const excluirAuxiliar = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro?\nSe ele estiver sendo usado, a exclusão pode falhar.")) return;
    
    let table = "";
    if (abaAtiva === "contas") table = "fin_contas_bancarias";
    else if (abaAtiva === "categorias") table = "fin_categorias";
    else if (abaAtiva === "locais") table = "log_locais";

    try {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Registro excluído." });
      fetchDadosAuxiliares();
    } catch (error: any) { alert("Erro ao excluir. Pode estar em uso.\n" + error.message); }
  };


  // ==========================================
  // RENDERIZAÇÃO PRINCIPAL
  // ==========================================
  if (isCurrentUserAdmin === false) {
    return (
    <AppLayout>
        <div className="flex flex-col justify-center items-center h-[70vh] max-w-md mx-auto text-center space-y-4">
          <div className="bg-red-50 p-4 rounded-full"><ShieldAlert className="w-16 h-16 text-red-500" /></div>
          <h1 className="text-2xl font-bold text-slate-800">Acesso Restrito</h1>
          <p className="text-slate-600">Você não tem permissão de Administrador para visualizar ou alterar as configurações do sistema.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto mb-12">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <Settings className="w-6 h-6 text-slate-600" /> Configurações Gerais
            </h1>
            <p className="text-slate-500">Gerencie a segurança, os usuários e as tabelas auxiliares do ERP.</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* MENU LATERAL DE ABAS */}
          <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 mb-1">Acessos</h3>
            <button onClick={() => setAbaAtiva("seguranca")} className={`flex items-center justify-between p-3 text-sm font-semibold rounded-lg transition-colors border ${abaAtiva === "seguranca" ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              <span className="flex items-center gap-3"><Lock className="w-4 h-4" /> Usuários / Segurança</span>
            </button>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 mt-4 mb-1">Tabelas do Sistema</h3>
            <button onClick={() => setAbaAtiva("contas")} className={`flex items-center justify-between p-3 text-sm font-semibold rounded-lg transition-colors border ${abaAtiva === "contas" ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              <span className="flex items-center gap-3"><Landmark className="w-4 h-4" /> Contas Bancárias</span>
            </button>
            <button onClick={() => setAbaAtiva("categorias")} className={`flex items-center justify-between p-3 text-sm font-semibold rounded-lg transition-colors border ${abaAtiva === "categorias" ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              <span className="flex items-center gap-3"><Tags className="w-4 h-4" /> Categorias Financeiras</span>
            </button>
            <button onClick={() => setAbaAtiva("locais")} className={`flex items-center justify-between p-3 text-sm font-semibold rounded-lg transition-colors border ${abaAtiva === "locais" ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              <span className="flex items-center gap-3"><MapPin className="w-4 h-4" /> Locais de Estoque</span>
            </button>
          </div>

          {/* ÁREA DE CONTEÚDO PRINCIPAL */}
          <div className="flex-1 w-full space-y-6">
            
            {/* ======================================================= */}
            {/* ABA: SEGURANÇA E USUÁRIOS */}
            {/* ======================================================= */}
            {abaAtiva === "seguranca" && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full space-y-2">
                            <h2 className="text-sm font-bold text-slate-700">Autorizar Novo E-mail de Acesso ao Sistema</h2>
                            <Input type="email" placeholder="Ex: tecnico@tccopiadoras.com.br" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} className="bg-slate-50" />
                        </div>
                        <Button onClick={adicionarUsuario} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white w-full md:w-auto h-10 shadow-sm">
                            <UserPlus className="w-4 h-4" /> Cadastrar Login
                        </Button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-600"/> Governança e Hierarquia</h2>
                        </div>
                        <div className="overflow-x-auto min-h-[300px]">
                            <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Usuário / E-mail</th>
                                <th className="px-6 py-4 font-semibold">Departamento</th>
                                <th className="px-6 py-4 font-semibold">Perfil Operacional</th>
                                <th className="px-6 py-4 font-semibold text-center border-l border-slate-200">Tipo de Acesso</th>
                                <th className="px-6 py-4 font-semibold text-center border-l border-slate-200 w-36">Configurar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loadingSeguranca ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr>
                                ) : permissoes.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Nenhum e-mail cadastrado.</td></tr>
                                ) : (
                                permissoes.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 align-top">
                                        <p className="font-bold text-slate-800 text-sm">{p.nome || 'Não definido'}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{p.email}</p>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                                        {p.departamento || 'Geral'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <p className="text-sm font-semibold text-slate-700">{p.perfil_operacional || 'Nenhum'}</p>
                                        {p.rh_colaboradores?.nome && (
                                            <p className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-1 border border-emerald-100">
                                                <Fingerprint className="w-3 h-3"/> Vínculo DP Ativo
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center border-l border-slate-100 align-top">
                                        {p.is_admin ? (
                                            <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-slate-800 text-white shadow-sm flex items-center justify-center gap-1 w-max mx-auto"><Shield className="w-3 h-3"/> Admin</span>
                                        ) : (
                                            <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-500 w-max mx-auto border">Padrão</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center border-l border-slate-100 align-top">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setUsuarioEditando({ ...p })} className="h-8 text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 gap-1 shadow-sm">
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

                    {/* MODAL DE EDIÇÃO DE USUÁRIO (Aparece por cima de tudo) */}
                    {usuarioEditando && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                        
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-600"/> Configurar Perfil e Acessos</h2>
                                <p className="text-xs text-slate-500 font-mono mt-1">{usuarioEditando.email}</p>
                            </div>
                            <Button variant="ghost" onClick={() => setUsuarioEditando(null)}><X className="w-5 h-5"/></Button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                            
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><User className="w-4 h-4"/> 1. Identidade e Setor</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Nome de Exibição</label><Input value={usuarioEditando.nome || ""} onChange={e => setUsuarioEditando({...usuarioEditando, nome: e.target.value})} placeholder="Ex: João Gaia" /></div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Departamento Principal</label>
                                        <Select value={usuarioEditando.departamento || "Geral"} onValueChange={v => setUsuarioEditando({...usuarioEditando, departamento: v})}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent className="z-[99999]"><SelectItem value="Geral">Geral / Sem Setor</SelectItem><SelectItem value="Diretoria">Diretoria</SelectItem><SelectItem value="Administrativo">Administrativo</SelectItem><SelectItem value="Financeiro">Financeiro</SelectItem><SelectItem value="Comercial">Comercial</SelectItem><SelectItem value="Licitações">Licitações</SelectItem><SelectItem value="Técnico">Assistência Técnica</SelectItem><SelectItem value="Gráfica">Produção Gráfica</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Briefcase className="w-4 h-4"/> 2. Vínculos Operacionais</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700" title="Isso permite que ele seja selecionado como Técnico em OS ou Vendedor em Pedidos.">Perfil Operacional (Atuação)</label>
                                        <Select value={usuarioEditando.perfil_operacional || "Nenhum"} onValueChange={v => setUsuarioEditando({...usuarioEditando, perfil_operacional: v})}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent className="z-[99999]"><SelectItem value="Nenhum">Nenhum / Apenas Administrativo</SelectItem><SelectItem value="Vendedor">Vendedor (Comercial)</SelectItem><SelectItem value="Técnico Externo">Técnico Externo (Rua)</SelectItem><SelectItem value="Técnico Laboratório">Técnico de Laboratório</SelectItem><SelectItem value="Operador Gráfico">Operador Gráfico</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700" title="Liga este login ao cadastro físico no Módulo de Departamento Pessoal.">Vínculo com Ficha do RH (DP)</label>
                                        <Select value={usuarioEditando.colaborador_id || "nenhum"} onValueChange={v => setUsuarioEditando({...usuarioEditando, colaborador_id: v})}>
                                            <SelectTrigger><SelectValue placeholder="Selecione o funcionário..."/></SelectTrigger>
                                            <SelectContent className="z-[99999]"><SelectItem value="nenhum">Sem vínculo com o RH</SelectItem>{colaboradoresDP.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} ({c.cargo})</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Lock className="w-4 h-4"/> 3. Restrições e Acessos Modulares</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <TogglePermission label="Acesso de Administrador" desc="Controle total sobre o sistema." checked={usuarioEditando.is_admin} onChange={(v:any) => setUsuarioEditando({...usuarioEditando, is_admin: v})} />
                                    <TogglePermission label="Módulo Financeiro" desc="Permite visualizar caixa e contas." checked={usuarioEditando.acesso_financeiro} onChange={(v:any) => setUsuarioEditando({...usuarioEditando, acesso_financeiro: v})} />
                                    <TogglePermission label="Editar Ordens de Serviço" desc="Permite alterar peças e status de OS." checked={usuarioEditando.pode_editar_os} onChange={(v:any) => setUsuarioEditando({...usuarioEditando, pode_editar_os: v})} />
                                    <TogglePermission label="Visualizar Todo o DP" desc="Se desligado, verá apenas a própria ficha." checked={usuarioEditando.pode_ver_dp_global} onChange={(v:any) => setUsuarioEditando({...usuarioEditando, pode_ver_dp_global: v})} />
                                </div>
                            </div>

                        </div>

                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <Button onClick={salvarConfiguracoesUsuario} disabled={salvandoSeguranca} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 shadow-md">
                                {salvandoSeguranca ? <Loader2 className="w-5 h-5 animate-spin"/> : "Salvar Perfil e Permissões"}
                            </Button>
                        </div>
                        </div>
                    </div>
                    )}
                </div>
            )}

            {/* ======================================================= */}
            {/* ABAS: TABELAS AUXILIARES */}
            {/* ======================================================= */}
            {abaAtiva !== "seguranca" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        {abaAtiva === "contas" && <><Landmark className="w-5 h-5 text-emerald-600"/> Gerenciar Contas Bancárias</>}
                        {abaAtiva === "categorias" && <><Tags className="w-5 h-5 text-emerald-600"/> Gerenciar Categorias Financeiras</>}
                        {abaAtiva === "locais" && <><MapPin className="w-5 h-5 text-emerald-600"/> Gerenciar Locais de Estoque</>}
                    </h2>
                    <Button onClick={() => { limparFormularioAuxiliar(); setMostrarFormAuxiliar(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-9 shadow-sm">
                        <Plus className="w-4 h-4" /> Novo Registro
                    </Button>
                    </div>

                    {/* FORMULÁRIO AUXILIAR */}
                    {mostrarFormAuxiliar && (
                    <div className="p-6 bg-emerald-50/50 border-b border-emerald-100 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-emerald-900">{editandoAuxiliarId ? "Editar Registro" : "Criar Novo Registro"}</h3>
                        <Button variant="ghost" size="sm" onClick={limparFormularioAuxiliar} className="h-8 w-8 p-0 text-slate-500 hover:text-red-500"><X className="w-4 h-4"/></Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Nome do Registro *</label>
                            <Input value={nomeAuxiliar} onChange={(e) => setNomeAuxiliar(e.target.value)} placeholder="Digite o nome..." className="bg-white border-emerald-200" />
                        </div>

                        {abaAtiva === "categorias" && (
                            <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Tipo *</label>
                            <Select value={tipoCategoria} onValueChange={setTipoCategoria}>
                                <SelectTrigger className="bg-white border-emerald-200"><SelectValue/></SelectTrigger>
                                <SelectContent className="bg-white">
                                <SelectItem value="Despesa">Despesa (Contas a Pagar)</SelectItem>
                                <SelectItem value="Receita">Receita (Contas a Receber)</SelectItem>
                                </SelectContent>
                            </Select>
                            </div>
                        )}
                        </div>

                        <div className="flex justify-end pt-2">
                        <Button onClick={salvarAuxiliar} disabled={salvandoAuxiliar} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm">
                            {salvandoAuxiliar ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Salvar
                        </Button>
                        </div>
                    </div>
                    )}

                    {/* TABELA AUXILIAR */}
                    <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                            <th className="p-4 font-semibold">Nome</th>
                            {abaAtiva === "categorias" && <th className="p-4 font-semibold w-40">Tipo</th>}
                            <th className="p-4 font-semibold text-center w-24 border-l border-slate-200">Ações</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {carregandoAuxiliares ? (
                            <tr><td colSpan={3} className="p-12 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr>
                        ) : dadosAuxiliares.length === 0 ? (
                            <tr><td colSpan={3} className="p-12 text-center text-slate-500">Nenhum registro encontrado nesta categoria.</td></tr>
                        ) : (
                            dadosAuxiliares.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-4 font-bold text-slate-800 text-sm">{item.nome}</td>
                                
                                {abaAtiva === "categorias" && (
                                <td className="p-4">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${item.tipo === 'Receita' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                    {item.tipo}
                                    </span>
                                </td>
                                )}

                                <td className="p-4 text-center border-l border-slate-100">
                                <div className="flex justify-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" onClick={() => { setEditandoAuxiliarId(item.id); setNomeAuxiliar(item.nome); if(abaAtiva==='categorias') setTipoCategoria(item.tipo); setMostrarFormAuxiliar(true); }} className="h-8 w-8 text-slate-400 hover:text-emerald-600"><Edit className="w-4 h-4"/></Button>
                                    <Button variant="ghost" size="icon" onClick={() => excluirAuxiliar(item.id)} className="h-8 w-8 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></Button>
                                </div>
                                </td>
                            </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                    </div>
                </div>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}