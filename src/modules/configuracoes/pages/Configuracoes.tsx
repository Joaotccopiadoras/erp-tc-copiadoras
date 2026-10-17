import { useState, useEffect } from "react";
import AppLayout from "@/shared/components/layout/AppLayout";
import { supabase } from "@/shared/lib/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/hooks/use-toast";
import { 
  Lock, Settings, UserPlus, Users, Wrench, Printer, Database, 
  Activity, Webhook, Trash2, Edit2, Loader2, Eye, EyeOff, Save, Link
} from "lucide-react";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/shared/components/ui/select";
import TabLogs from "../components/TabLogs"; // Importação da aba de auditoria criada anteriormente

export default function Configuracoes() {
  const [abaAtiva, setAbaAtiva] = useState("seguranca");
  const [loading, setLoading] = useState(true);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState<boolean | null>(null);
  const { toast } = useToast();

  // --- ESTADOS: SEGURANÇA E USUÁRIOS ---
  const [permissoes, setPermissoes] = useState<any[]>([]);
  const [colaboradoresDP, setColaboradoresDP] = useState<any[]>([]);
  const [novoNomeUsuario, setNovoNomeUsuario] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [mostrarSenhaCadastro, setMostrarSenhaCadastro] = useState(false);
  const [salvandoSeguranca, setSalvandoSeguranca] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<any | null>(null);

  // --- ESTADOS: WEBHOOKS ---
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [nomeWebhook, setNomeWebhook] = useState("");
  const [eventoWebhook, setEventoWebhook] = useState("");
  const [urlWebhook, setUrlWebhook] = useState("");
  const [salvandoWebhook, setSalvandoWebhook] = useState(false);

  useEffect(() => {
    verificarAcessoAdmin();
  }, []);

  useEffect(() => {
    if (abaAtiva === "webhooks") carregarWebhooks();
  }, [abaAtiva]);

  const verificarAcessoAdmin = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setIsCurrentUserAdmin(false);
      setLoading(false);
      return;
    }

    // A busca verifica se o usuário logado possui is_admin
    const { data } = await supabase.from("permissoes").select("is_admin").or(`email.eq.${user.email},email_auth.eq.${user.email}`).limit(1).single();

    if (data?.is_admin) {
      setIsCurrentUserAdmin(true);
      carregarDadosSeguranca();
    } else {
      setIsCurrentUserAdmin(false);
      setLoading(false);
    }
  };

  const carregarDadosSeguranca = async () => {
    const [permRes, colabRes] = await Promise.all([
      supabase.from("permissoes").select("*").order("nome_usuario"),
      supabase.from("rh_colaboradores").select("id, nome, cargo").order("nome")
    ]);
    if (permRes.data) setPermissoes(permRes.data);
    if (colabRes.data) setColaboradoresDP(colabRes.data);
    setLoading(false);
  };

  const carregarWebhooks = async () => {
    const { data } = await supabase.from("sistema_webhooks").select("*").order("criado_em", { ascending: false });
    if (data) setWebhooks(data);
  };

  const adicionarUsuario = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();

    try {
      if (!novoEmail || !novoEmail.includes("@") || !novoNomeUsuario || !novoNomeUsuario.trim() || !novaSenha || !novaSenha.trim()) {
        window.alert("⚠️ Erro: Preencha todos os campos obrigatórios (Nome, E-mail válido e Senha).");
        return;
      }
      if (novaSenha.length < 6) {
        window.alert("⚠️ Erro: A palavra-passe deve ter pelo menos 6 caracteres.");
        return;
      }

      setSalvandoSeguranca(true);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        window.alert("❌ Erro Crítico: Chaves do Supabase não encontradas.");
        setSalvandoSeguranca(false);
        return;
      }

      // Descobre o tenant_id do Administrador que está a fazer o cadastro
      const { data: adminData } = await supabase
        .from('permissoes')
        .select('tenant_id')
        .or(`email.eq.${usuarioAtual},nome_usuario.eq.${usuarioAtual}`)
        .limit(1)
        .single();
      
      const adminTenantId = adminData?.tenant_id;

      if (!adminTenantId) {
         throw new Error("Erro de Segurança: O seu utilizador não possui um Tenant ID atrelado. Impossível vincular o novo colaborador à sua empresa.");
      }

      // Cliente fantasma para criar o utilizador sem deslogar o Administrador
      const authGhost = createClient(supabaseUrl, supabaseKey, { 
        auth: { persistSession: false, autoRefreshToken: false } 
      });

      // Cadastra no Supabase Auth
      const { error: authError } = await authGhost.auth.signUp({
        email: novoEmail.toLowerCase().trim(),
        password: novaSenha,
      });

      if (authError) {
        throw new Error(`Erro do Supabase: ${authError.message}`);
      }

      // Salva a Ficha do Utilizador na Tabela de Permissões enviando o tenant_id da sua empresa
      const { error: dbError } = await supabase.from("permissoes").insert([{ 
        tenant_id: adminTenantId,
        email: novoEmail.toLowerCase().trim(), 
        nome_usuario: novoNomeUsuario.toLowerCase().trim(),
        acesso_financeiro: false, 
        is_admin: false, 
        departamento: 'Geral', 
        perfil_operacional: 'Nenhum' 
      }]);
      
      if (dbError) throw new Error("Erro na tabela de permissões: " + dbError.message);

      window.alert("🎉 Utilizador cadastrado com sucesso!");
      toast({ title: "Sucesso", description: "Utilizador criado com sucesso!" });
      
      setNovoEmail(""); 
      setNovoNomeUsuario(""); 
      setNovaSenha("");
      carregarDadosSeguranca();
      
    } catch (erro: any) { 
      window.alert("❌ Falha ao cadastrar: " + erro.message);
      toast({ title: "Erro no Cadastro", description: erro.message, variant: "destructive" }); 
    } finally {
      setSalvandoSeguranca(false);
    }
  };

  const removerUsuario = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja revogar o acesso deste usuário?")) return;
    const { error } = await supabase.from("permissoes").delete().eq("id", id);
    if (!error) {
      toast({ title: "Removido", description: "Acesso revogado com sucesso." });
      carregarDadosSeguranca();
    }
  };

  const salvarConfiguracoesRBAC = async () => {
    setSalvandoSeguranca(true);
    try {
      const payload = {
        nome_usuario: usuarioEditando.nome_usuario,
        departamento: usuarioEditando.departamento,
        perfil_operacional: usuarioEditando.perfil_operacional,
        colaborador_id: usuarioEditando.colaborador_id === "nenhum" ? null : usuarioEditando.colaborador_id,
        is_admin: usuarioEditando.is_admin,
        acesso_financeiro: usuarioEditando.acesso_financeiro
      };
      const { error } = await supabase.from('permissoes').update(payload).eq('id', usuarioEditando.id);
      if (error) throw error;

      toast({ title: "Sucesso", description: "Perfil e Permissões atualizados!" });
      setUsuarioEditando(null);
      carregarDadosSeguranca();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSalvandoSeguranca(false);
    }
  };

  // ==========================================
  // LÓGICA DE WEBHOOKS E N8N
  // ==========================================
  const salvarWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeWebhook || !eventoWebhook || !urlWebhook) return alert("Preencha todos os campos do webhook.");
    
    setSalvandoWebhook(true);
    try {
      const { error } = await supabase.from('sistema_webhooks').insert([{
        nome: nomeWebhook,
        evento: eventoWebhook,
        url: urlWebhook,
        ativo: true
      }]);
      if (error) throw error;
      
      toast({ title: "Gatilho Criado", description: "O webhook foi integrado com sucesso." });
      setNomeWebhook(""); setEventoWebhook(""); setUrlWebhook("");
      carregarWebhooks();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSalvandoWebhook(false);
    }
  };

  const removerWebhook = async (id: string) => {
    if (!window.confirm("Remover esta automação? O n8n deixará de receber os dados deste evento.")) return;
    await supabase.from('sistema_webhooks').delete().eq('id', id);
    carregarWebhooks();
  };

  if (loading) return <AppLayout><div className="p-8 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-4" /> Carregando configurações de Administrator...</div></AppLayout>;
  
  if (isCurrentUserAdmin === false) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Lock className="w-16 h-16 text-rose-500 mb-6" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Acesso Restrito</h1>
        <p className="text-slate-500 max-w-md">Seu perfil operacional não possui privilégios de Administrador. Apenas gestores autorizados podem modificar configurações do ERP.</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-6 h-6 text-indigo-600" /> Governança e Configurações
            </h1>
            <p className="text-sm text-slate-500 mt-1">Painel central de parametrização SaaS, segurança e automações do ERP.</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* MENU LATERAL */}
          <div className="w-full lg:w-64 shrink-0 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Acessos</div>
            <button onClick={() => setAbaAtiva("seguranca")} className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${abaAtiva === "seguranca" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}>
              <Lock className="w-4 h-4 mr-3" /> Segurança e RLS
            </button>
            
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mt-6 mb-2">Equipe e Operação</div>
            <button onClick={() => setAbaAtiva("tecnicos")} className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${abaAtiva === "tecnicos" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}>
              <Wrench className="w-4 h-4 mr-3" /> Gestão de Técnicos
            </button>
            <button onClick={() => setAbaAtiva("operadores")} className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${abaAtiva === "operadores" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}>
              <Printer className="w-4 h-4 mr-3" /> Operadores Gráficos
            </button>

            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mt-6 mb-2">Inteligência SaaS</div>
            <button onClick={() => setAbaAtiva("webhooks")} className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${abaAtiva === "webhooks" ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"}`}>
              <Webhook className="w-4 h-4 mr-3" /> Gatilhos e Webhooks
            </button>
            <button onClick={() => setAbaAtiva("logs")} className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${abaAtiva === "logs" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              <Activity className="w-4 h-4 mr-3" /> Logs e Auditoria
            </button>
          </div>

          {/* ÁREA PRINCIPAL */}
          <div className="flex-1 min-w-0">

            {/* ABA 1: SEGURANÇA E USUÁRIOS */}
            {abaAtiva === "seguranca" && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4 border-l-4 border-l-indigo-600">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Cadastrar Novo Utilizador v2.0</h2>
                    <p className="text-xs text-slate-500">Defina o nome de utilizador, o e-mail real associado e a palavra-passe inicial do colaborador.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input placeholder="Nome de Utilizador (ex: joao.silva)" value={novoNomeUsuario} onChange={(e) => setNovoNomeUsuario(e.target.value)} className="bg-slate-50 font-medium text-indigo-700" />
                    <Input type="email" placeholder="E-mail Real (ex: joao@empresa.com)" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} className="bg-slate-50" />
                    <div className="relative">
                      <Input 
                        type={mostrarSenhaCadastro ? "text" : "password"} 
                        placeholder="Palavra-passe (Mín. 6 carateres)" 
                        value={novaSenha} 
                        onChange={(e) => setNovaSenha(e.target.value)} 
                        className="bg-slate-50 pr-10" 
                      />
                      <button type="button" onClick={() => setMostrarSenhaCadastro(!mostrarSenhaCadastro)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {mostrarSenhaCadastro ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="button" onClick={adicionarUsuario} disabled={salvandoSeguranca} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer">
                      {salvandoSeguranca ? <Loader2 className="w-4 h-4 animate-spin"/> : <UserPlus className="w-4 h-4" />} Cadastrar Sistema
                    </Button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div className="p-4 border-b bg-slate-50"><h2 className="font-bold text-slate-800 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-600"/> Governança e Hierarquia</h2></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b text-slate-500 text-[10px] uppercase tracking-wider">
                          <th className="px-4 py-3 font-semibold">Utilizador</th>
                          <th className="px-4 py-3 font-semibold">Departamento</th>
                          <th className="px-4 py-3 font-semibold text-center">Acesso</th>
                          <th className="px-4 py-3 font-semibold text-right">Configurar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {permissoes.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-700">{p.nome_usuario || 'Não definido'}</p>
                              <p className="text-xs text-slate-400">{p.email}</p>
                            </td>
                            <td className="px-4 py-3"><span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{p.departamento || 'Geral'}</span></td>
                            <td className="px-4 py-3 text-center">{p.is_admin ? <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-full">ADMIN</span> : <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-full">PADRÃO</span>}</td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <Button variant="outline" size="sm" className="h-8 gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => setUsuarioEditando({ ...p })}>
                                <Settings className="w-3.5 h-3.5" /> Acessos
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => removerUsuario(p.id)}><Trash2 className="w-4 h-4" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 4: GATILHOS E WEBHOOKS (n8n) */}
            {abaAtiva === "webhooks" && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-white p-6 rounded-xl border shadow-sm border-l-4 border-l-orange-500">
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Webhook className="w-5 h-5 text-orange-600"/> Integrações e Webhooks (n8n)</h2>
                    <p className="text-sm text-slate-500 mt-1">Conecte o ERP a fluxos do n8n ou Zapier para automatizar relatórios e alertas de WhatsApp/E-mail.</p>
                  </div>
                  <form onSubmit={salvarWebhook} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Nome do Gatilho</label>
                      <Input placeholder="Ex: Aviso WhatsApp Cliente" value={nomeWebhook} onChange={e => setNomeWebhook(e.target.value)} required className="bg-slate-50" />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Aguardar pelo Evento</label>
                      <Select value={eventoWebhook} onValueChange={setEventoWebhook} required>
                        <SelectTrigger className="bg-slate-50 z-[99999]"><SelectValue placeholder="Selecione o evento..."/></SelectTrigger>
                        <SelectContent className="bg-white z-[99999]">
                          <SelectItem value="exportacao_relatorio">Exportação Assíncrona de Relatórios (PDF/Excel)</SelectItem>
                          <SelectItem value="nova_os_tecnica">Nova OS Técnica Aberta</SelectItem>
                          <SelectItem value="os_tecnica_concluida">OS Técnica Concluída</SelectItem>
                          <SelectItem value="nova_osg_grafica">Nova OS Gráfica</SelectItem>
                          <SelectItem value="osg_grafica_concluida">OS Gráfica Concluída</SelectItem>
                          <SelectItem value="estoque_minimo">Alerta de Estoque Mínimo</SelectItem>
                          <SelectItem value="relatorio_financeiro">Exportar Relatório PDF (Assíncrono)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-4 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">URL do Webhook de Destino</label>
                      <div className="relative">
                        <Link className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input type="url" placeholder="https://seu-n8n.com/webhook/xyz" value={urlWebhook} onChange={e => setUrlWebhook(e.target.value)} required className="pl-9 bg-slate-50" />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Button type="submit" disabled={salvandoWebhook} className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2">
                        {salvandoWebhook ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Conectar
                      </Button>
                    </div>
                  </form>
                </div>

                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b text-slate-500 text-[10px] uppercase tracking-wider">
                        <th className="px-4 py-3 font-semibold w-40">Evento Assistido</th>
                        <th className="px-4 py-3 font-semibold">Nome da Automação</th>
                        <th className="px-4 py-3 font-semibold">URL de Roteamento</th>
                        <th className="px-4 py-3 font-semibold text-center w-24">Status</th>
                        <th className="px-4 py-3 font-semibold text-right w-16">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {webhooks.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-xs font-bold text-orange-600">{w.evento}</td>
                          <td className="px-4 py-3 font-medium text-slate-700">{w.nome}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[200px]" title={w.url}>{w.url}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Ativo</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => removerWebhook(w.id)}><Trash2 className="w-4 h-4" /></Button>
                          </td>
                        </tr>
                      ))}
                      {webhooks.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum webhook configurado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA: LOGS DE AUDITORIA */}
            {abaAtiva === "logs" && <TabLogs />}

            {/* PLACEHOLDERS DE OUTRAS ABAS */}
            {abaAtiva === "tecnicos" && <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-dashed">Interface de Gestão de Técnicos ativa e em operação...</div>}
            {abaAtiva === "operadores" && <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-dashed">Interface de Operadores Gráficos ativa e em operação...</div>}

          </div>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO DE USUÁRIO (RBAC) */}
      {usuarioEditando && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-600"/> Configurar Acessos</h2>
                <p className="text-xs text-slate-500 font-mono mt-1">{usuarioEditando.email}</p>
              </div>
              <Button variant="ghost" onClick={() => setUsuarioEditando(null)}>Cancelar</Button>
            </div>
            <div className="p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Nome de Exibição</label><Input value={usuarioEditando.nome_usuario || ""} onChange={e => setUsuarioEditando({...usuarioEditando, nome_usuario: e.target.value})} /></div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Departamento Principal</label>
                    <Select value={usuarioEditando.departamento || "Geral"} onValueChange={v => setUsuarioEditando({...usuarioEditando, departamento: v})}>
                        <SelectTrigger className="z-[99999] bg-white"><SelectValue/></SelectTrigger>
                        <SelectContent className="z-[99999] bg-white"><SelectItem value="Geral">Geral</SelectItem><SelectItem value="Administrativo">Administrativo</SelectItem><SelectItem value="Técnico">Técnico</SelectItem><SelectItem value="Comercial">Comercial</SelectItem></SelectContent>
                    </Select>
                </div>
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Privilégio de Sistema</label>
                  <Select value={usuarioEditando.is_admin ? "admin" : "padrao"} onValueChange={v => setUsuarioEditando({...usuarioEditando, is_admin: v === "admin"})}>
                      <SelectTrigger className="z-[99999] bg-white"><SelectValue/></SelectTrigger>
                      <SelectContent className="z-[99999] bg-white"><SelectItem value="padrao">Padrão</SelectItem><SelectItem value="admin">Administrador Total</SelectItem></SelectContent>
                  </Select>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button onClick={salvarConfiguracoesRBAC} disabled={salvandoSeguranca} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8">
                  {salvandoSeguranca ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}