import { useState, useEffect } from "react";
import AppLayout from "@/shared/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase, CheckCircle, Fingerprint, Lock, Settings, Shield,
  ShieldAlert, Trash2, User, UserPlus, Landmark, Tags, MapPin,
  Plus, Edit, Save, X, Loader2, CreditCard, Network, BriefcaseBusiness, Wrench, Printer, Eye, EyeOff, Mail
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

export default function ConfiguracoesPage() {
  const [abaAtiva, setAbaAtiva] = useState<"seguranca" | "emails" | "contas" | "transacoes" | "centros" | "segmentos" | "formas" | "locais" | "tecnicos" | "operadores">("seguranca");
  const { toast } = useToast();

  // ==========================================
  // ESTADOS DA ABA: SEGURANÇA E USUÁRIO
  // ==========================================
  const [permissoes, setPermissoes] = useState<any[]>([]);
  const [colaboradoresDP, setColaboradoresDP] = useState<any[]>([]);
  
  // Novos campos de registo corporativo
  const [novoNomeUsuario, setNovoNomeUsuario] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [mostrarSenhaCadastro, setMostrarSenhaCadastro] = useState(false);
  
  const [loadingSeguranca, setLoadingSeguranca] = useState(true);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState<boolean | null>(null);
  const [usuarioEditando, setUsuarioEditando] = useState<any | null>(null);
  const [salvandoSeguranca, setSalvandoSeguranca] = useState(false);

  // ==========================================
  // ESTADOS DA ABA: AUTOMAÇÃO DE E-MAILS
  // ==========================================
  const [emailTriggers, setEmailTriggers] = useState<any[]>([]);
  const [novoGatilho, setNovoGatilho] = useState({ modulo: 'Grafica', status_gatilho: '', assunto: '', corpo_texto: '' });
  const [salvandoTrigger, setSalvandoTrigger] = useState(false);

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
  // ESTADOS DA ABA: GESTÃO DE TÉCNICOS
  // ==========================================
  const [tecnicosBD, setTecnicosBD] = useState<any[]>([]);
  const [mostrarFormTecnico, setMostrarFormTecnico] = useState(false);
  const [formTecnico, setFormTecnico] = useState({ nome: "", cpf: "", idade: "", endereco: "", formacao: "", data_admissao: "", tipo_cnh: "Nenhuma", valor_hora: "", usuario_id: "nenhum" });

  // ==========================================
  // ESTADOS DA ABA: GESTÃO DE OPERADORES GRÁFICOS
  // ==========================================
  const [operadoresBD, setOperadoresBD] = useState<any[]>([]);
  const [mostrarFormOperador, setMostrarFormOperador] = useState(false);
  const [formOperador, setFormOperador] = useState({ nome: "", cpf: "", idade: "", endereco: "", data_admissao: "", valor_hora: "", login_vinculado: "nenhum" });

  useEffect(() => { verificarAcessoAdmin(); }, []);

  useEffect(() => {
    if (abaAtiva === "seguranca") {
        if (isCurrentUserAdmin) carregarDadosSeguranca();
    } else if (abaAtiva === "emails") {
        fetchTriggers();
    } else if (abaAtiva === "tecnicos") {
        fetchTecnicos(); limparFormTecnico();
    } else if (abaAtiva === "operadores") {
        fetchOperadores(); limparFormOperador();
    } else {
        fetchDadosAuxiliares(); limparFormularioAuxiliar();
    }
  }, [abaAtiva, isCurrentUserAdmin]);

  // ==========================================
  // LÓGICA: SEGURANÇA E REGISTO AVANÇADO
  // ==========================================
  const verificarAcessoAdmin = async () => {
    setLoadingSeguranca(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setIsCurrentUserAdmin(false); setLoadingSeguranca(false); return; }
    const { data } = await supabase.from("permissoes").select("is_admin").eq("email", user.email).single();
    if (data?.is_admin) { setIsCurrentUserAdmin(true); carregarDadosSeguranca(); } 
    else { setIsCurrentUserAdmin(false); setLoadingSeguranca(false); }
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

// ==========================================
  // LÓGICA DE CADASTRO CORRIGIDA (SEM ERRO DE ENV)
  // ==========================================
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

      // Cria um pseudo-email único nos bastidores para burlar a trava de e-mails únicos do Auth
      const emailAutenticacao = `${novoNomeUsuario.toLowerCase().trim().replace(/\s+/g, '')}@sistema.local`;
      
      // 1. Cadastra no Auth utilizando o CLIENT PRINCIPAL (que já está configurado e injetado pelo Vite globalmente)
      // Como a chave anon é usada, a inserção só passará se você desativou o "Confirm email" no painel.
      const { error: authError } = await supabase.auth.signUp({
        email: emailAutenticacao,
        password: novaSenha,
      });

      if (authError) throw new Error("Erro no Supabase Auth: " + authError.message);

      // 2. Salva na tabela com o e-mail real partilhado e a chave oculta de auth
      const { error: dbError } = await supabase.from("permissoes").insert([{ 
        email: novoEmail.toLowerCase().trim(), 
        email_auth: emailAutenticacao,
        nome_usuario: novoNomeUsuario.toLowerCase().trim(),
        acesso_financeiro: false, 
        is_admin: false, 
        departamento: 'Geral', 
        perfil_operacional: 'Nenhum' 
      }]);
      
      if (dbError) throw new Error("Erro na tabela de permissões: " + dbError.message);

      window.alert("🎉 Utilizador adicionado com sucesso (E-mails partilhados ativados)!");
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
    if (!confirm("Tem certeza que deseja revogar o acesso deste utilizador? (Isto apaga as permissões, mas o login continuará no Supabase Auth)")) return;
    await supabase.from("permissoes").delete().eq("id", id);
    toast({ title: "Removido", description: "Acesso revogado com sucesso." }); carregarDadosSeguranca();
  };

  const salvarConfiguracoesUsuario = async () => {
    setSalvandoSeguranca(true);
    try {
      const payload = {
        nome: usuarioEditando.nome, departamento: usuarioEditando.departamento, perfil_operacional: usuarioEditando.perfil_operacional,
        colaborador_id: usuarioEditando.colaborador_id === "nenhum" ? null : usuarioEditando.colaborador_id,
        is_admin: usuarioEditando.is_admin, acesso_financeiro: usuarioEditando.acesso_financeiro,
        pode_editar_os: usuarioEditando.pode_editar_os, pode_ver_dp_global: usuarioEditando.pode_ver_dp_global
      };
      await supabase.from('permissoes').update(payload).eq('id', usuarioEditando.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email === usuarioEditando.email) await supabase.auth.updateUser({ data: { nome: usuarioEditando.nome } });
      toast({ title: "Sucesso", description: "Perfil e Permissões atualizados!" });
      setUsuarioEditando(null); carregarDadosSeguranca();
    } catch (e: any) { toast({ title: "Erro", description: e.message, variant: "destructive" }); } 
    finally { setSalvandoSeguranca(false); }
  };

  const TogglePermission = ({ label, desc, checked, onChange }: any) => (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
      <div><p className="text-sm font-bold text-slate-800">{label}</p><p className="text-xs text-slate-500">{desc}</p></div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={checked || false} onChange={e => onChange(e.target.checked)} />
        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500"></div>
      </label>
    </div>
  );

  // ==========================================
  // LÓGICA: AUTOMAÇÃO DE E-MAILS
  // ==========================================
  const fetchTriggers = async () => {
    const { data } = await supabase.from('cfg_email_triggers').select('*').order('modulo');
    if (data) setEmailTriggers(data);
  };

  const salvarTrigger = async () => {
    if (!novoGatilho.status_gatilho || !novoGatilho.corpo_texto || !novoGatilho.assunto) {
      return toast({ title: "Atenção", description: "Preencha o Status, o Assunto e o Texto da mensagem.", variant: "destructive" });
    }
    setSalvandoTrigger(true);
    try {
      await supabase.from('cfg_email_triggers').insert([novoGatilho]);
      setNovoGatilho({ modulo: 'Grafica', status_gatilho: '', assunto: '', corpo_texto: '' });
      toast({ title: "Sucesso", description: "Automação de e-mail salva com sucesso!" });
      fetchTriggers();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSalvandoTrigger(false);
    }
  };

  const deletarTrigger = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta automação de e-mail?")) return;
    await supabase.from('cfg_email_triggers').delete().eq('id', id);
    toast({ title: "Removido", description: "Automação excluída com sucesso." });
    fetchTriggers();
  };

  // ==========================================
  // LÓGICA: TABELAS AUXILIARES
  // ==========================================
  const getTabelaAtual = () => {
    switch (abaAtiva) {
      case "contas": return "fin_contas_bancarias";
      case "transacoes": return "fin_categorias";
      case "centros": return "fin_centros_custo";
      case "segmentos": return "fin_segmentos_negocio";
      case "formas": return "fin_formas_pagamento";
      case "locais": return "log_locais";
      default: return "";
    }
  };

  const fetchDadosAuxiliares = async () => {
    const table = getTabelaAtual();
    if (!table) return;
    setCarregandoAuxiliares(true);
    try {
      const { data } = await supabase.from(table).select("*").order("nome");
      setDadosAuxiliares(data || []);
    } catch (error: any) { alert("Erro ao carregar: " + error.message); } 
    finally { setCarregandoAuxiliares(false); }
  };

  const limparFormularioAuxiliar = () => { setMostrarFormAuxiliar(false); setEditandoAuxiliarId(null); setNomeAuxiliar(""); setTipoCategoria("Despesa"); };

  const salvarAuxiliar = async () => {
    if (!nomeAuxiliar.trim()) return alert("O nome é obrigatório!");
    setSalvandoAuxiliar(true);
    const table = getTabelaAtual();
    const payload: any = { nome: nomeAuxiliar.trim() };
    if (abaAtiva === "transacoes") payload.tipo = tipoCategoria;

    try {
      if (editandoAuxiliarId) await supabase.from(table).update(payload).eq("id", editandoAuxiliarId);
      else await supabase.from(table).insert([payload]);
      toast({ title: "Sucesso", description: "Registo salvo com sucesso!" });
      limparFormularioAuxiliar(); fetchDadosAuxiliares();
    } catch (error: any) { alert("Erro ao salvar: " + error.message); } 
    finally { setSalvandoAuxiliar(false); }
  };

  const excluirAuxiliar = async (id: string) => {
    if (!confirm("Excluir este registo? Pode falhar se já estiver em uso.")) return;
    try { await supabase.from(getTabelaAtual()).delete().eq("id", id); toast({ title: "Sucesso", description: "Registo excluído." }); fetchDadosAuxiliares(); } 
    catch (error: any) { alert("Erro ao excluir.\n" + error.message); }
  };

  // --- Funções Restantes de Técnicos e Operadores ---
  const fetchTecnicos = async () => { setCarregandoAuxiliares(true); try { const [tecRes, userRes] = await Promise.all([supabase.from("srv_tecnicos").select("*, permissoes(nome, email)").order("nome"), supabase.from("permissoes").select("id, nome, email").order("nome")]); if (tecRes.data) setTecnicosBD(tecRes.data); if (userRes.data) setPermissoes(userRes.data); } catch (error) {} finally { setCarregandoAuxiliares(false); } };
  const limparFormTecnico = () => { setMostrarFormTecnico(false); setEditandoAuxiliarId(null); setFormTecnico({ nome: "", cpf: "", idade: "", endereco: "", formacao: "", data_admissao: "", tipo_cnh: "Nenhuma", valor_hora: "", usuario_id: "nenhum" }); };
  const editarTecnico = (t: any) => { setEditandoAuxiliarId(t.id); setFormTecnico({ nome: t.nome || "", cpf: t.cpf || "", idade: t.idade ? String(t.idade) : "", endereco: t.endereco || "", formacao: t.formacao || "", data_admissao: t.data_admissao || "", tipo_cnh: t.tipo_cnh || "Nenhuma", valor_hora: t.valor_hora ? String(t.valor_hora) : "", usuario_id: t.usuario_id || "nenhum" }); setMostrarFormTecnico(true); };
  const salvarTecnico = async () => { setSalvandoAuxiliar(true); try { const payload = { nome: formTecnico.nome.trim(), cpf: formTecnico.cpf.trim() || null, idade: formTecnico.idade ? parseInt(formTecnico.idade) : null, endereco: formTecnico.endereco.trim() || null, formacao: formTecnico.formacao.trim() || null, data_admissao: formTecnico.data_admissao || null, tipo_cnh: formTecnico.tipo_cnh === "Nenhuma" ? null : (formTecnico.tipo_cnh || null), valor_hora: formTecnico.valor_hora ? parseFloat(formTecnico.valor_hora.replace(',', '.')) : null, usuario_id: formTecnico.usuario_id === "nenhum" ? null : formTecnico.usuario_id }; if (editandoAuxiliarId) { await supabase.from("srv_tecnicos").update(payload).eq("id", editandoAuxiliarId); } else { await supabase.from("srv_tecnicos").insert([payload]); } toast({ title: "Sucesso", description: "Ficha salva." }); limparFormTecnico(); fetchTecnicos(); } catch (error) {} finally { setSalvandoAuxiliar(false); } };
  const excluirTecnico = async (id: string) => { if (!confirm("Excluir técnico?")) return; await supabase.from("srv_tecnicos").delete().eq("id", id); fetchTecnicos(); };

  const fetchOperadores = async () => { setCarregandoAuxiliares(true); try { const [opRes, userRes] = await Promise.all([supabase.from("grafica_operadores").select("*").order("nome"), supabase.from("permissoes").select("id, nome, email").order("nome")]); if (opRes.data) setOperadoresBD(opRes.data); if (userRes.data) setPermissoes(userRes.data); } catch (error) {} finally { setCarregandoAuxiliares(false); } };
  const limparFormOperador = () => { setMostrarFormOperador(false); setEditandoAuxiliarId(null); setFormOperador({ nome: "", cpf: "", idade: "", endereco: "", data_admissao: "", valor_hora: "", login_vinculado: "nenhum" }); };
  const editarOperador = (op: any) => { setEditandoAuxiliarId(op.id); setFormOperador({ nome: op.nome || "", cpf: op.cpf || "", idade: op.idade ? String(op.idade) : "", endereco: op.endereco || "", data_admissao: op.data_admissao || "", valor_hora: op.valor_hora ? String(op.valor_hora) : "", login_vinculado: op.login_vinculado || "nenhum" }); setMostrarFormOperador(true); };
  const salvarOperador = async () => { setSalvandoAuxiliar(true); try { const payload = { nome: formOperador.nome.trim(), cpf: formOperador.cpf.trim() || null, idade: formOperador.idade ? parseInt(formOperador.idade) : null, endereco: formOperador.endereco.trim() || null, data_admissao: formOperador.data_admissao || null, valor_hora: formOperador.valor_hora ? parseFloat(formOperador.valor_hora.replace(',', '.')) : null, login_vinculado: formOperador.login_vinculado === "nenhum" ? null : formOperador.login_vinculado }; if (editandoAuxiliarId) { await supabase.from("grafica_operadores").update(payload).eq("id", editandoAuxiliarId); } else { await supabase.from("grafica_operadores").insert([payload]); } toast({ title: "Sucesso", description: "Ficha salva." }); limparFormOperador(); fetchOperadores(); } catch (error) {} finally { setSalvandoAuxiliar(false); } };
  const excluirOperador = async (id: string) => { if (!confirm("Excluir operador?")) return; await supabase.from("grafica_operadores").delete().eq("id", id); fetchOperadores(); };

  if (isCurrentUserAdmin === false) {
    return (
    <AppLayout>
        <div className="flex flex-col justify-center items-center h-[70vh] max-w-md mx-auto text-center space-y-4">
          <div className="bg-red-50 p-4 rounded-full"><ShieldAlert className="w-16 h-16 text-red-500" /></div>
          <h1 className="text-2xl font-bold text-slate-800">Acesso Restrito</h1>
          <p className="text-slate-600">Não possui permissões de Administrador para visualizar estas configurações.</p>
        </div>
      </AppLayout>
    );
  }

  const tituloTabelaAtual: Record<string, string> = { contas: "Contas Bancárias", transacoes: "Transações Financeiras", centros: "Centros de Custo", segmentos: "Segmentos de Negócio", formas: "Formas de Pagamento", locais: "Locais de Estoque", tecnicos: "Técnicos (Assistência Técnica)", operadores: "Operadores Gráficos" };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div><h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Settings className="w-6 h-6 text-slate-600" /> Configurações Gerais</h1><p className="text-slate-500">Gira a segurança, os utilizadores e as tabelas auxiliares do ERP.</p></div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* MENU LATERAL */}
          <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 mb-1">Acessos e Segurança</h3>
            <button onClick={() => setAbaAtiva("seguranca")} className={`flex items-center justify-between p-3 text-sm font-semibold rounded-lg transition-colors border ${abaAtiva === "seguranca" ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}><span className="flex items-center gap-3"><Lock className="w-4 h-4" /> Utilizadores e Perfis</span></button>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 mt-4 mb-1">Comunicação e Alertas</h3>
            <button onClick={() => setAbaAtiva("emails")} className={`flex items-center p-3 text-sm font-semibold rounded-lg transition-colors border ${abaAtiva === "emails" ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}><Mail className="w-4 h-4 mr-3" /> Automação de E-mails</button>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 mt-4 mb-1">Equipa e Operação</h3>
            <button onClick={() => setAbaAtiva("tecnicos")} className={`flex items-center p-3 text-sm font-semibold rounded-lg transition-colors border ${abaAtiva === "tecnicos" ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}><Wrench className="w-4 h-4 mr-3" /> Gestão de Técnicos</button>
            <button onClick={() => setAbaAtiva("operadores")} className={`flex items-center p-3 text-sm font-semibold rounded-lg transition-colors border ${abaAtiva === "operadores" ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}><Printer className="w-4 h-4 mr-3" /> Operadores Gráficos</button>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 mt-4 mb-1">Tabelas Financeiras</h3>
            <button onClick={() => setAbaAtiva("contas")} className={`flex items-center p-3 text-sm font-semibold rounded-lg transition-colors border ${abaAtiva === "contas" ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}><Landmark className="w-4 h-4 mr-3" /> Contas Bancárias</button>
            <button onClick={() => setAbaAtiva("transacoes")} className={`flex items-center p-3 text-sm font-semibold rounded-lg transition-colors border ${abaAtiva === "transacoes" ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}><Tags className="w-4 h-4 mr-3" /> Transações Financeiras</button>
            <button onClick={() => setAbaAtiva("centros")} className={`flex items-center p-3 text-sm font-semibold rounded-lg transition-colors border ${abaAtiva === "centros" ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}><Network className="w-4 h-4 mr-3" /> Centros de Custo</button>
            <button onClick={() => setAbaAtiva("segmentos")} className={`flex items-center p-3 text-sm font-semibold rounded-lg transition-colors border ${abaAtiva === "segmentos" ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}><BriefcaseBusiness className="w-4 h-4 mr-3" /> Segmentos de Negócio</button>
            <button onClick={() => setAbaAtiva("formas")} className={`flex items-center p-3 text-sm font-semibold rounded-lg transition-colors border ${abaAtiva === "formas" ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}><CreditCard className="w-4 h-4 mr-3" /> Formas de Pagamento</button>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 mt-4 mb-1">Tabelas Logísticas</h3>
            <button onClick={() => setAbaAtiva("locais")} className={`flex items-center p-3 text-sm font-semibold rounded-lg transition-colors border ${abaAtiva === "locais" ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}><MapPin className="w-4 h-4 mr-3" /> Locais de Estoque</button>
          </div>

          {/* CONTEÚDO PRINCIPAL */}
          <div className="flex-1 w-full space-y-6">
            
            {/* ABA: SEGURANÇA */}
            {abaAtiva === "seguranca" && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                    
                    <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4 border-l-4 border-l-indigo-600">
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">Cadastrar Novo Utilizador</h2>
                            <p className="text-xs text-slate-500">Defina o nome de utilizador, o e-mail associado e a palavra-passe inicial do colaborador.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input placeholder="Nome de Utilizador (ex: joao.silva)" value={novoNomeUsuario} onChange={(e) => setNovoNomeUsuario(e.target.value)} className="bg-slate-50 font-medium text-indigo-700" />
                            <Input type="email" placeholder="E-mail (ex: joao@empresa.com)" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} className="bg-slate-50" />
                            <div className="relative">
                              <Input 
                                type={mostrarSenhaCadastro ? "text" : "password"} 
                                placeholder="Palavra-passe (Mín. 6 carateres)" 
                                value={novaSenha} 
                                onChange={(e) => setNovaSenha(e.target.value)} 
                                className="bg-slate-50 pr-10" 
                              />
                              <button
                                type="button"
                                onClick={() => setMostrarSenhaCadastro(!mostrarSenhaCadastro)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {mostrarSenhaCadastro ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button 
  type="button" 
  onClick={() => adicionarUsuario()} 
  disabled={salvandoSeguranca} 
  className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer"
>
  {salvandoSeguranca ? <Loader2 className="w-4 h-4 animate-spin"/> : <UserPlus className="w-4 h-4" />} 
  Cadastrar Sistema
</Button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50"><h2 className="font-bold text-slate-800 flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-600"/> Governança e Hierarquia</h2></div>
                        <div className="overflow-x-auto min-h-[300px]">
                            <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 border-b text-slate-600 text-[11px] uppercase tracking-wider">
                                  <th className="px-4 py-4 font-semibold">Utilizador</th>
                                  <th className="px-4 py-4 font-semibold">Departamento</th>
                                  <th className="px-4 py-4 font-semibold text-center">Acesso</th>
                                  <th className="px-4 py-4 font-semibold text-center w-36">Configurar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loadingSeguranca ? ( <tr><td colSpan={4} className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr>
                                ) : permissoes.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-4 py-4 align-top">
                                          <p className="font-bold text-slate-800 text-sm">{p.nome || 'Não definido'}</p>
                                          <p className="text-xs font-mono text-indigo-600 font-semibold mt-0.5">@{p.nome_usuario || 'legado'}</p>
                                          <p className="text-[10px] text-slate-400 mt-0.5">{p.email}</p>
                                      </td>
                                      <td className="px-4 py-4 align-top"><span className="text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">{p.departamento || 'Geral'}</span></td>
                                      <td className="px-4 py-4 text-center align-top">{p.is_admin ? <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-slate-800 text-white shadow-sm inline-flex items-center gap-1"><Shield className="w-3 h-3"/> Admin</span> : <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-500 border">Padrão</span>}</td>
                                      <td className="px-4 py-4 text-center align-top">
                                          <div className="flex justify-center gap-2">
                                              <Button variant="outline" size="sm" onClick={() => setUsuarioEditando({ ...p })} className="h-8 text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 gap-1 shadow-sm"><Settings className="w-3 h-3"/> Acessos</Button>
                                              <button onClick={() => removerUsuario(p.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4"/></button>
                                          </div>
                                      </td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    </div>

                    {/* MODAL UTILIZADOR */}
                    {usuarioEditando && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div><h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-600"/> Configurar Perfil e Acessos</h2><p className="text-xs text-slate-500 font-mono mt-1">Utilizador: {usuarioEditando.nome_usuario || usuarioEditando.email}</p></div>
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
                                            <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[99999]"><SelectItem value="Geral">Geral / Sem Setor</SelectItem><SelectItem value="Diretoria">Diretoria</SelectItem><SelectItem value="Administrativo">Administrativo</SelectItem><SelectItem value="Financeiro">Financeiro</SelectItem><SelectItem value="Comercial">Comercial</SelectItem><SelectItem value="Licitações">Licitações</SelectItem><SelectItem value="Técnico">Assistência Técnica</SelectItem><SelectItem value="Gráfica">Produção Gráfica</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Briefcase className="w-4 h-4"/> 2. Vínculos Operacionais</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Perfil Operacional (Atuação)</label>
                                        <Select value={usuarioEditando.perfil_operacional || "Nenhum"} onValueChange={v => setUsuarioEditando({...usuarioEditando, perfil_operacional: v})}>
                                            <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[99999]"><SelectItem value="Nenhum">Nenhum / Apenas Administrativo</SelectItem><SelectItem value="Vendedor">Vendedor (Comercial)</SelectItem><SelectItem value="Técnico Externo">Técnico Externo (Rua)</SelectItem><SelectItem value="Técnico Laboratório">Técnico de Laboratório</SelectItem><SelectItem value="Operador Gráfico">Operador Gráfico</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Vínculo com Ficha do RH (DP)</label>
                                        <Select value={usuarioEditando.colaborador_id || "nenhum"} onValueChange={v => setUsuarioEditando({...usuarioEditando, colaborador_id: v})}>
                                            <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione o funcionário..."/></SelectTrigger>
                                            <SelectContent className="bg-white z-[99999]"><SelectItem value="nenhum">Sem vínculo com o RH</SelectItem>{colaboradoresDP.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} ({c.cargo})</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Lock className="w-4 h-4"/> 3. Restrições e Acessos</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <TogglePermission label="Acesso de Administrador" desc="Controlo total sobre o sistema." checked={usuarioEditando.is_admin} onChange={(v:any) => setUsuarioEditando({...usuarioEditando, is_admin: v})} />
                                    <TogglePermission label="Módulo Financeiro" desc="Permite visualizar caixa e contas." checked={usuarioEditando.acesso_financeiro} onChange={(v:any) => setUsuarioEditando({...usuarioEditando, acesso_financeiro: v})} />
                                    <TogglePermission label="Editar Ordens de Serviço" desc="Permite alterar peças e status de OS." checked={usuarioEditando.pode_editar_os} onChange={(v:any) => setUsuarioEditando({...usuarioEditando, pode_editar_os: v})} />
                                    <TogglePermission label="Visualizar Todo o DP" desc="Se desligado, verá apenas a própria ficha." checked={usuarioEditando.pode_ver_dp_global} onChange={(v:any) => setUsuarioEditando({...usuarioEditando, pode_ver_dp_global: v})} />
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <Button onClick={salvarConfiguracoesUsuario} disabled={salvandoSeguranca} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 shadow-md">{salvandoSeguranca ? <Loader2 className="w-5 h-5 animate-spin"/> : "Salvar Perfil e Permissões"}</Button>
                        </div>
                        </div>
                    </div>
                    )}
                </div>
            )}

            {/* ABA: AUTOMAÇÃO DE E-MAILS */}
            {abaAtiva === "emails" && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Mail className="w-5 h-5 text-indigo-600"/> Automação de E-mails com o Cliente</h2>
                      <p className="text-sm text-slate-500">Configure as mensagens disparadas automaticamente conforme a mudança de etapa no Kanban. Use as variáveis <b>{`{numero_osg}`}</b>, <b>{`{solicitante}`}</b> e <b>{`{status}`}</b> no texto.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border">
                          <Select value={novoGatilho.status_gatilho} onValueChange={v => setNovoGatilho({...novoGatilho, status_gatilho: v})}>
                              <SelectTrigger className="bg-white"><SelectValue placeholder="Status Gatilho (Ex: Levantamento de Material)"/></SelectTrigger>
                              <SelectContent className="bg-white z-[99999]">
                                  <SelectItem value="Levantamento de Material">Levantamento de Material</SelectItem>
                                  <SelectItem value="Impressão">Impressão</SelectItem>
                                  <SelectItem value="Pronto para Expedição">Pronto para Expedição</SelectItem>
                              </SelectContent>
                          </Select>
                          <Input placeholder="Assunto do E-mail" value={novoGatilho.assunto} onChange={e => setNovoGatilho({...novoGatilho, assunto: e.target.value})} className="bg-white" />
                          <div className="md:col-span-2">
                              <textarea 
                                  placeholder="Prezado {solicitante}, sua OSG {numero_osg} acaba de entrar em {status}..." 
                                  value={novoGatilho.corpo_texto} onChange={e => setNovoGatilho({...novoGatilho, corpo_texto: e.target.value})} 
                                  className="w-full min-h-[100px] p-3 border border-slate-200 rounded-md text-sm custom-scrollbar focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                          </div>
                          <Button onClick={salvarTrigger} disabled={salvandoTrigger} className="md:col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white gap-2">{salvandoTrigger ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Salvar Automação</Button>
                      </div>

                      <div className="space-y-2 mt-6">
                          {emailTriggers.map(t => (
                              <div key={t.id} className="p-4 border border-slate-200 rounded-lg flex justify-between items-start hover:border-indigo-300 bg-white shadow-sm transition-colors">
                                  <div>
                                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-200">{t.modulo} : {t.status_gatilho}</span>
                                      <p className="font-bold text-slate-800 mt-3">{t.assunto}</p>
                                      <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{t.corpo_texto}</p>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={() => deletarTrigger(t.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 p-0"><Trash2 className="w-4 h-4"/></Button>
                              </div>
                          ))}
                          {emailTriggers.length === 0 && <p className="text-sm text-slate-400 text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">Nenhuma automação de e-mail configurada.</p>}
                      </div>
                    </div>
                </div>
            )}

            {/* ABAS RESTANTES OCULTADAS PARA BREVIDADE (Mantêm o funcionamento idêntico ao original) */}
            {abaAtiva !== "seguranca" && abaAtiva !== "emails" && abaAtiva !== "tecnicos" && abaAtiva !== "operadores" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide text-sm">Gerir {tituloTabelaAtual[abaAtiva]}</h2>
                        <Button onClick={() => { limparFormularioAuxiliar(); setMostrarFormAuxiliar(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-9 shadow-sm"><Plus className="w-4 h-4" /> Novo Registo</Button>
                    </div>

                    {mostrarFormAuxiliar && (
                    <div className="p-6 bg-emerald-50/50 border-b border-emerald-100 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-emerald-900">{editandoAuxiliarId ? "Editar Registo" : "Criar Novo Registo"}</h3>
                        <Button variant="ghost" size="sm" onClick={limparFormularioAuxiliar} className="h-8 w-8 p-0 text-slate-500 hover:text-red-500"><X className="w-4 h-4"/></Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Nome do Registo *</label><Input value={nomeAuxiliar} onChange={(e) => setNomeAuxiliar(e.target.value)} className="bg-white border-emerald-200" /></div>
                        {abaAtiva === "transacoes" && (
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Tipo *</label><Select value={tipoCategoria} onValueChange={setTipoCategoria}><SelectTrigger className="bg-white border-emerald-200"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[99999]"><SelectItem value="Despesa">Despesa (Contas a Pagar)</SelectItem><SelectItem value="Receita">Receita (Contas a Receber)</SelectItem></SelectContent></Select></div>
                        )}
                        </div>
                        <div className="flex justify-end pt-2"><Button onClick={salvarAuxiliar} disabled={salvandoAuxiliar} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm">{salvandoAuxiliar ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Salvar</Button></div>
                    </div>
                    )}

                    <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                            <th className="p-4 font-semibold">Nome</th>
                            {abaAtiva === "transacoes" && <th className="p-4 font-semibold w-40">Tipo</th>}
                            <th className="p-4 font-semibold text-center w-24 border-l border-slate-200">Ações</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {carregandoAuxiliares ? (<tr><td colSpan={3} className="p-12 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr>) : dadosAuxiliares.length === 0 ? (<tr><td colSpan={3} className="p-12 text-center text-slate-500">Nenhum registo encontrado.</td></tr>) : (dadosAuxiliares.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-4 font-semibold text-slate-800 text-sm">{item.nome}</td>
                                {abaAtiva === "transacoes" && (<td className="p-4"><span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${item.tipo === 'Receita' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>{item.tipo}</span></td>)}
                                <td className="p-4 text-center border-l border-slate-100"><div className="flex justify-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" onClick={() => { setEditandoAuxiliarId(item.id); setNomeAuxiliar(item.nome); if(abaAtiva==='transacoes') setTipoCategoria(item.tipo); setMostrarFormAuxiliar(true); }} className="h-8 w-8 text-slate-400 hover:text-emerald-600"><Edit className="w-4 h-4"/></Button><Button variant="ghost" size="icon" onClick={() => excluirAuxiliar(item.id)} className="h-8 w-8 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></Button></div></td>
                            </tr>
                        )))}
                        </tbody>
                    </table>
                    </div>
                </div>
            )}
            
            {/* ABAS TÉCNICOS E OPERADORES */}
            {abaAtiva === "tecnicos" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide text-sm">Gerir Técnicos Operacionais</h2>
                        <Button onClick={() => { limparFormTecnico(); setMostrarFormTecnico(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-9 shadow-sm"><Plus className="w-4 h-4" /> Novo Técnico</Button>
                    </div>

                    {mostrarFormTecnico && (
                    <div className="p-6 bg-blue-50/40 border-b border-blue-100 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-blue-900">{editandoAuxiliarId ? "Editar Ficha do Técnico" : "Cadastrar Novo Técnico"}</h3>
                            <Button variant="ghost" size="sm" onClick={limparFormTecnico} className="h-8 w-8 p-0 text-slate-500 hover:text-red-500"><X className="w-4 h-4"/></Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Nome Completo *</label><Input value={formTecnico.nome} onChange={(e) => setFormTecnico({...formTecnico, nome: e.target.value})} className="bg-white border-blue-200" /></div>
                            <div className="space-y-2 md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase">CPF</label><Input value={formTecnico.cpf} onChange={(e) => setFormTecnico({...formTecnico, cpf: e.target.value})} className="bg-white border-blue-200" /></div>
                            <div className="space-y-2 md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase">Idade</label><Input type="number" value={formTecnico.idade} onChange={(e) => setFormTecnico({...formTecnico, idade: e.target.value})} className="bg-white border-blue-200" /></div>
                            <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Endereço Completo</label><Input value={formTecnico.endereco} onChange={(e) => setFormTecnico({...formTecnico, endereco: e.target.value})} className="bg-white border-blue-200" /></div>
                            <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Formação / Especialidade</label><Input value={formTecnico.formacao} onChange={(e) => setFormTecnico({...formTecnico, formacao: e.target.value})} className="bg-white border-blue-200" /></div>
                            <div className="space-y-2 md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase">Data de Admissão</label><Input type="date" value={formTecnico.data_admissao} onChange={(e) => setFormTecnico({...formTecnico, data_admissao: e.target.value})} className="bg-white border-blue-200" /></div>
                            <div className="space-y-2 md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase">Tipo CNH</label><Select value={formTecnico.tipo_cnh} onValueChange={v => setFormTecnico({...formTecnico, tipo_cnh: v})}><SelectTrigger className="bg-white border-blue-200"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[99999]"><SelectItem value="A">A (Moto)</SelectItem><SelectItem value="B">B (Carro)</SelectItem><SelectItem value="AB">AB (Moto e Carro)</SelectItem><SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem><SelectItem value="Nenhuma">Nenhuma</SelectItem></SelectContent></Select></div>
                            <div className="space-y-2 md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase">Valor Hora Técnica (R$)</label><Input value={formTecnico.valor_hora} onChange={(e) => setFormTecnico({...formTecnico, valor_hora: e.target.value})} className="bg-white border-blue-200" /></div>
                            <div className="space-y-2 md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase">Login (Sistema)</label><Select value={formTecnico.usuario_id} onValueChange={v => setFormTecnico({...formTecnico, usuario_id: v})}><SelectTrigger className="bg-white border-blue-200"><SelectValue placeholder="Sem login"/></SelectTrigger><SelectContent className="bg-white z-[99999] max-h-60 overflow-y-auto"><SelectItem value="nenhum">Sem login</SelectItem>{permissoes.map(p => <SelectItem key={p.id} value={p.id}>{p.nome || p.email}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                        <div className="flex justify-end pt-2 border-t border-blue-100 mt-4"><Button onClick={salvarTecnico} disabled={salvandoAuxiliar} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm">{salvandoAuxiliar ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Salvar Ficha</Button></div>
                    </div>
                    )}

                    <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                            <th className="p-4 font-semibold">Nome do Técnico</th>
                            <th className="p-4 font-semibold">Formação</th>
                            <th className="p-4 font-semibold text-center">Login Vinculado</th>
                            <th className="p-4 font-semibold text-center w-24 border-l border-slate-200">Ações</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {carregandoAuxiliares ? (<tr><td colSpan={4} className="p-12 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr>) : tecnicosBD.length === 0 ? (<tr><td colSpan={4} className="p-12 text-center text-slate-500">Nenhum técnico registado.</td></tr>) : (tecnicosBD.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-4"><p className="font-semibold text-slate-800 text-sm">{item.nome}</p>{item.cpf && <p className="text-xs text-slate-400 font-mono mt-0.5">CPF: {item.cpf}</p>}</td>
                                <td className="p-4 text-xs text-slate-600 font-medium">{item.formacao || '-'}</td>
                                <td className="p-4 text-center text-xs text-slate-500 font-medium">{item.permissoes ? (item.permissoes.nome || item.permissoes.email) : '-'}</td>
                                <td className="p-4 text-center border-l border-slate-100"><div className="flex justify-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" onClick={() => editarTecnico(item)} className="h-8 w-8 text-slate-400 hover:text-blue-600"><Edit className="w-4 h-4"/></Button><Button variant="ghost" size="icon" onClick={() => excluirTecnico(item.id)} className="h-8 w-8 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></Button></div></td>
                            </tr>
                        )))}
                        </tbody>
                    </table>
                    </div>
                </div>
            )}

            {abaAtiva === "operadores" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide text-sm">Gerir Operadores Gráficos</h2>
                        <Button onClick={() => { limparFormOperador(); setMostrarFormOperador(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-9 shadow-sm"><Plus className="w-4 h-4" /> Novo Operador</Button>
                    </div>

                    {mostrarFormOperador && (
                    <div className="p-6 bg-blue-50/40 border-b border-blue-100 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-blue-900">{editandoAuxiliarId ? "Editar Ficha do Operador" : "Cadastrar Novo Operador"}</h3>
                            <Button variant="ghost" size="sm" onClick={limparFormOperador} className="h-8 w-8 p-0 text-slate-500 hover:text-red-500"><X className="w-4 h-4"/></Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Nome Completo *</label><Input value={formOperador.nome} onChange={(e) => setFormOperador({...formOperador, nome: e.target.value})} className="bg-white border-blue-200" /></div>
                            <div className="space-y-2 md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase">CPF</label><Input value={formOperador.cpf} onChange={(e) => setFormOperador({...formOperador, cpf: e.target.value})} className="bg-white border-blue-200" /></div>
                            <div className="space-y-2 md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase">Idade</label><Input type="number" value={formOperador.idade} onChange={(e) => setFormOperador({...formOperador, idade: e.target.value})} className="bg-white border-blue-200" /></div>
                            <div className="space-y-2 md:col-span-4"><label className="text-xs font-bold text-slate-500 uppercase">Endereço Completo</label><Input value={formOperador.endereco} onChange={(e) => setFormOperador({...formOperador, endereco: e.target.value})} className="bg-white border-blue-200" /></div>
                            <div className="space-y-2 md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase">Data de Admissão</label><Input type="date" value={formOperador.data_admissao} onChange={(e) => setFormOperador({...formOperador, data_admissao: e.target.value})} className="bg-white border-blue-200" /></div>
                            <div className="space-y-2 md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase">Valor Hora (R$)</label><Input value={formOperador.valor_hora} onChange={(e) => setFormOperador({...formOperador, valor_hora: e.target.value})} className="bg-white border-blue-200" /></div>
                            <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Login (Sistema)</label><Select value={formOperador.login_vinculado} onValueChange={v => setFormOperador({...formOperador, login_vinculado: v})}><SelectTrigger className="bg-white border-blue-200"><SelectValue placeholder="Sem login"/></SelectTrigger><SelectContent className="bg-white z-[99999] max-h-60 overflow-y-auto"><SelectItem value="nenhum">Sem login</SelectItem>{permissoes.map(p => <SelectItem key={p.id} value={p.id}>{p.nome || p.email}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                        <div className="flex justify-end pt-2 border-t border-blue-100 mt-4"><Button onClick={salvarOperador} disabled={salvandoAuxiliar} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm">{salvandoAuxiliar ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Salvar Ficha</Button></div>
                    </div>
                    )}

                    <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                            <th className="p-4 font-semibold">Nome do Operador</th>
                            <th className="p-4 font-semibold text-center">Data Admissão</th>
                            <th className="p-4 font-semibold text-center">Valor Hora</th>
                            <th className="p-4 font-semibold text-center w-24 border-l border-slate-200">Ações</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {carregandoAuxiliares ? (<tr><td colSpan={4} className="p-12 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr>) : operadoresBD.length === 0 ? (<tr><td colSpan={4} className="p-12 text-center text-slate-500">Nenhum operador registado.</td></tr>) : (operadoresBD.map((item) => {
                                const vinculado = permissoes.find(p => p.id === item.login_vinculado);
                                return (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4"><p className="font-semibold text-slate-800 text-sm">{item.nome}</p><p className="text-xs text-slate-400 font-medium mt-0.5">{vinculado ? `Login: ${vinculado.nome || vinculado.email}` : 'Sem acesso ao sistema'}</p></td>
                                    <td className="p-4 text-center text-xs text-slate-600 font-medium">{item.data_admissao ? new Date(item.data_admissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                                    <td className="p-4 text-center text-xs text-emerald-600 font-bold">{item.valor_hora ? `R$ ${Number(item.valor_hora).toFixed(2).replace('.', ',')}` : '-'}</td>
                                    <td className="p-4 text-center border-l border-slate-100"><div className="flex justify-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" onClick={() => editarOperador(item)} className="h-8 w-8 text-slate-400 hover:text-blue-600"><Edit className="w-4 h-4"/></Button><Button variant="ghost" size="icon" onClick={() => excluirOperador(item.id)} className="h-8 w-8 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></Button></div></td>
                                </tr>
                                )
                            }))}
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