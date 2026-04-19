import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, UserPlus, Phone, Mail, Building2, MessageSquare, Target, Calendar as CalendarIcon, Clock, ShoppingBag, Wrench, Printer, FileSignature, ArrowLeft, Activity, Layers, Loader2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function CrmGlobal() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<any | null>(null);
  const [abaDossie, setAbaDossie] = useState<"timeline" | "comercial" | "tecnica" | "grafica" | "contratos">("timeline");
  const [salvando, setSalvando] = useState(false);

  // Form Novo/Editar Cliente
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novoCliRazao, setNovoCliRazao] = useState("");
  const [novoCliFantasia, setNovoCliFantasia] = useState("");
  const [novoCliCnpj, setNovoCliCnpj] = useState("");
  const [novoCliTelefone, setNovoCliTelefone] = useState("");
  const [novoCliEmail, setNovoCliEmail] = useState("");
  const [novoCliStatus, setNovoCliStatus] = useState("Lead");
  
  // Estado para busca de CNPJ
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);

  // Dados da Visão 360º
  const [historico, setHistorico] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [ordensServico, setOrdensServico] = useState<any[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [ordensProducao, setOrdensProducao] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);

  // Form Interação Timeline
  const [interacaoTipo, setInteracaoTipo] = useState("WhatsApp");
  const [interacaoDesc, setInteracaoDesc] = useState("");
  const [interacaoProxPasso, setInteracaoProxPasso] = useState("");
  const [interacaoDataAgend, setInteracaoDataAgend] = useState("");

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    const { data } = await supabase.from('log_clientes').select('*').order('nome_fantasia');
    if (data) setClientes(data);
  };

  // --- FUNÇÃO DE BUSCA CNPJ (BrasilAPI) ---
  const buscarDadosCnpj = async () => {
    const cnpjLimpo = novoCliCnpj.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) {
      return alert("Digite um CNPJ válido com 14 números.");
    }

    setBuscandoCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (!response.ok) throw new Error("CNPJ não encontrado.");
      
      const data = await response.json();
      
      setNovoCliRazao(data.razao_social || "");
      setNovoCliFantasia(data.nome_fantasia || data.razao_social || "");
      setNovoCliEmail(data.email || "");
      
      if (data.ddd_telefone1) {
          setNovoCliTelefone(`(${data.ddd_telefone1}) ${data.telefone1}`);
      }

      alert("Dados importados com sucesso da Receita Federal!");
    } catch (error: any) {
      alert("Erro ao buscar CNPJ: " + error.message);
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const abrirNovoCliente = () => {
      setEditandoId(null);
      setNovoCliRazao(""); setNovoCliFantasia(""); setNovoCliCnpj(""); setNovoCliTelefone(""); setNovoCliEmail(""); setNovoCliStatus("Lead");
      setMostrarForm(true);
  };

  const abrirEditarCliente = (cli: any) => {
      setEditandoId(cli.id);
      setNovoCliRazao(cli.razao_social || "");
      setNovoCliFantasia(cli.nome_fantasia || "");
      setNovoCliCnpj(cli.cnpj_cpf || "");
      setNovoCliTelefone(cli.telefone || "");
      setNovoCliEmail(cli.email || "");
      setNovoCliStatus(cli.status_funil || "Lead");
      setMostrarForm(true);
  };

  const salvarCliente = async () => {
    if (!novoCliFantasia && !novoCliRazao) return alert("Preencha o Nome Fantasia ou Razão Social.");
    setSalvando(true);
    try {
      const payload = {
        razao_social: novoCliRazao || novoCliFantasia, 
        nome_fantasia: novoCliFantasia || novoCliRazao,
        cnpj_cpf: novoCliCnpj, 
        telefone: novoCliTelefone, 
        email: novoCliEmail, 
        status_funil: novoCliStatus
      };

      if (editandoId) {
          const { error } = await supabase.from('log_clientes').update(payload).eq('id', editandoId);
          if (error) throw error;
          alert("Cliente atualizado com sucesso!");
      } else {
          const { error } = await supabase.from('log_clientes').insert([payload]);
          if (error) throw error;
          alert("Cliente cadastrado com sucesso!");
      }
      
      setMostrarForm(false);
      setEditandoId(null);
      setNovoCliRazao(""); setNovoCliFantasia(""); setNovoCliCnpj(""); setNovoCliTelefone(""); setNovoCliEmail("");
      fetchClientes();
    } catch (e: any) { alert("Erro ao salvar: " + e.message); } finally { setSalvando(false); }
  };

  const abrirVisao360 = async (cliente: any) => {
    setClienteSelecionado(cliente);
    setAbaDossie("timeline");
    
    const [histRes, pedRes, osRes, eqRes, opRes, contRes] = await Promise.all([
      supabase.from('com_crm_historico').select('*').eq('cliente_id', cliente.id).order('data_interacao', { ascending: false }),
      supabase.from('com_pedidos_venda').select('*').eq('cliente_id', cliente.id).order('data_emissao', { ascending: false }),
      supabase.from('srv_ordens_servico').select('*').eq('cliente_id', cliente.id).order('data_abertura', { ascending: false }),
      supabase.from('crm_equipamentos_cliente').select('*').eq('cliente_id', cliente.id),
      supabase.from('prd_ordens_producao').select('*').ilike('cliente_nome', `%${cliente.nome_fantasia}%`).order('data_entrada', { ascending: false }),
      supabase.from('crm_contratos').select('*').eq('cliente_id', cliente.id)
    ]);

    if (histRes.data) setHistorico(histRes.data);
    if (pedRes.data) setPedidos(pedRes.data);
    if (osRes.data) setOrdensServico(osRes.data);
    if (eqRes.data) setEquipamentos(eqRes.data);
    if (opRes.data) setOrdensProducao(opRes.data);
    if (contRes.data) setContratos(contRes.data);
  };

  const atualizarStatusFunil = async (novoStatus: string) => {
    try {
      await supabase.from('log_clientes').update({ status_funil: novoStatus }).eq('id', clienteSelecionado.id);
      setClienteSelecionado({ ...clienteSelecionado, status_funil: novoStatus });
      fetchClientes();
    } catch (e) { console.error(e); }
  };

  const registrarInteracaoCRM = async () => {
    if (!interacaoDesc) return alert("Descreva a interação.");
    setSalvando(true);
    try {
      const payload = { cliente_id: clienteSelecionado.id, tipo: interacaoTipo, descricao: interacaoDesc, proximo_passo: interacaoProxPasso, data_agendamento: interacaoDataAgend || null };
      await supabase.from('com_crm_historico').insert([payload]);
      alert("Interação registrada!");
      setInteracaoDesc(""); setInteracaoProxPasso(""); setInteracaoDataAgend("");
      const { data } = await supabase.from('com_crm_historico').select('*').eq('cliente_id', clienteSelecionado.id).order('data_interacao', { ascending: false });
      if (data) setHistorico(data);
    } catch (e: any) { alert("Erro: " + e.message); } finally { setSalvando(false); }
  };

  const clientesFiltrados = clientes.filter(c => 
    (c.nome_fantasia?.toLowerCase() || "").includes(busca.toLowerCase()) || 
    (c.razao_social?.toLowerCase() || "").includes(busca.toLowerCase()) ||
    (c.cnpj_cpf?.toLowerCase() || "").includes(busca.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto mb-12">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Users className="w-6 h-6 text-indigo-600" /> Central de Clientes (CRM)</h1>
            <p className="text-slate-500">Visão 360º: Cadastros, Interações, Contratos, OS e Produção.</p>
          </div>
        </div>

        {!clienteSelecionado ? (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden animate-in fade-in duration-200">
                <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4 bg-slate-50">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente por nome, CNPJ..." className="pl-9 bg-white" />
                    </div>
                    <Button onClick={abrirNovoCliente} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"><UserPlus className="w-4 h-4"/> Novo Cliente</Button>
                </div>

                {mostrarForm && (
                    <div className="p-6 bg-indigo-50/50 border-b border-indigo-100 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-indigo-800 flex items-center gap-2"><Target className="w-5 h-5"/> {editandoId ? 'Editar Cliente' : 'Nova Ficha de Cliente'}</h3>
                            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                                <Input value={novoCliCnpj} onChange={e => setNovoCliCnpj(e.target.value)} placeholder="CNPJ para busca..." className="h-8 w-44 border-none focus-visible:ring-0 text-xs font-mono" />
                                <Button size="sm" onClick={buscarDadosCnpj} disabled={buscandoCnpj} variant="ghost" className="h-8 text-indigo-600 font-bold gap-2">
                                    {buscandoCnpj ? <Loader2 className="w-3 h-3 animate-spin"/> : <Search className="w-3 h-3"/>}
                                    Puxar da BrasilAPI
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Razão Social</label><Input value={novoCliRazao} onChange={e => setNovoCliRazao(e.target.value)} className="bg-white" /></div>
                            <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Nome Fantasia (Principal)</label><Input value={novoCliFantasia} onChange={e => setNovoCliFantasia(e.target.value)} className="bg-white" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">CNPJ / CPF</label><Input value={novoCliCnpj} onChange={e => setNovoCliCnpj(e.target.value)} className="bg-white" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Telefone / WhatsApp</label><Input value={novoCliTelefone} onChange={e => setNovoCliTelefone(e.target.value)} className="bg-white" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">E-mail</label><Input value={novoCliEmail} onChange={e => setNovoCliEmail(e.target.value)} className="bg-white" /></div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Status no CRM</label>
                                <Select value={novoCliStatus} onValueChange={setNovoCliStatus}>
                                    <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                                    <SelectContent><SelectItem value="Lead">Lead</SelectItem><SelectItem value="Prospecção">Prospecção</SelectItem><SelectItem value="Negociação">Negociação</SelectItem><SelectItem value="Cliente Ativo">Cliente Ativo</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t border-indigo-100">
                            <Button variant="outline" onClick={() => {setMostrarForm(false); setEditandoId(null);}}>Cancelar</Button>
                            <Button onClick={salvarCliente} disabled={salvando} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {editandoId ? 'Atualizar Cliente' : 'Salvar Cliente'}
                            </Button>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto min-h-[500px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                                <th className="p-4 font-semibold border-b">Empresa / Cliente</th>
                                <th className="p-4 font-semibold border-b text-center">Status (Funil)</th>
                                <th className="p-4 font-semibold border-b">Contatos</th>
                                <th className="p-4 font-semibold border-b text-center w-44">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {clientesFiltrados.length === 0 ? (
                                <tr><td colSpan={4} className="p-12 text-center text-slate-500">Nenhum cliente encontrado.</td></tr>
                            ) : (
                                clientesFiltrados.map(cli => {
                                    const corFunil = cli.status_funil === 'Lead' ? 'bg-slate-100 text-slate-700' : cli.status_funil === 'Prospecção' ? 'bg-blue-100 text-blue-700' : cli.status_funil === 'Negociação' ? 'bg-amber-100 text-amber-700' : cli.status_funil === 'Cliente Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
                                    
                                    return (
                                    <tr key={cli.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => abrirVisao360(cli)}>
                                        <td className="p-4">
                                            <p className="font-bold text-slate-800 text-base">{cli.nome_fantasia || cli.razao_social}</p>
                                            <p className="text-xs text-slate-500 mt-0.5 font-mono">{cli.cnpj_cpf}</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase shadow-sm border border-white ${corFunil}`}>{cli.status_funil || 'Lead'}</span>
                                        </td>
                                        <td className="p-4">
                                            {cli.telefone && <p className="text-sm font-medium text-slate-700 flex items-center gap-2"><Phone className="w-3 h-3 text-slate-400"/> {cli.telefone}</p>}
                                            {cli.email && <p className="text-xs text-slate-500 flex items-center gap-2 mt-1"><Mail className="w-3 h-3 text-slate-400"/> {cli.email}</p>}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 group-hover:bg-indigo-50 flex-1 gap-2" onClick={(e) => { e.stopPropagation(); abrirVisao360(cli); }}>
                                                    <Activity className="w-4 h-4"/> Dossiê
                                                </Button>
                                                <Button variant="outline" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={(e) => { e.stopPropagation(); abrirEditarCliente(cli); }} title="Editar Cadastro">
                                                    <Edit className="w-4 h-4"/>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        ) : (
            /* DOSSIÊ 360º DO CLIENTE */
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-200">
                
                {/* CABEÇALHO DO CLIENTE */}
                <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-t-4 border-t-indigo-600">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Button variant="ghost" size="sm" onClick={() => setClienteSelecionado(null)} className="h-8 px-2 text-slate-400 hover:text-slate-700"><ArrowLeft className="w-4 h-4"/></Button>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{clienteSelecionado.nome_fantasia || clienteSelecionado.razao_social}</h2>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-indigo-600" onClick={() => { setClienteSelecionado(null); abrirEditarCliente(clienteSelecionado); }} title="Editar Dados"><Edit className="w-3 h-3"/></Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 ml-12">
                            <span className="flex items-center gap-1 font-semibold"><Building2 className="w-4 h-4 text-slate-400"/> {clienteSelecionado.cnpj_cpf}</span>
                            <span className="flex items-center gap-1"><Phone className="w-4 h-4 text-slate-400"/> {clienteSelecionado.telefone || 'S/ Tel'}</span>
                            <span className="flex items-center gap-1"><Mail className="w-4 h-4 text-slate-400"/> {clienteSelecionado.email || 'S/ Email'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">Status CRM:</span>
                        <Select value={clienteSelecionado.status_funil || 'Lead'} onValueChange={atualizarStatusFunil}>
                            <SelectTrigger className="w-40 bg-white font-bold text-indigo-700 border-indigo-200"><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="Lead">Lead</SelectItem><SelectItem value="Prospecção">Prospecção</SelectItem><SelectItem value="Negociação">Negociação</SelectItem><SelectItem value="Cliente Ativo">Cliente Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent>
                        </Select>
                    </div>
                </div>

                {/* NAVEGAÇÃO DAS ABAS DO DOSSIÊ */}
                <div className="flex bg-white rounded-lg p-1 border shadow-sm overflow-x-auto custom-scrollbar">
                    <button onClick={() => setAbaDossie("timeline")} className={`flex-1 min-w-[120px] py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-md transition-colors ${abaDossie === "timeline" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}><Clock className="w-4 h-4"/> Linha do Tempo</button>
                    <button onClick={() => setAbaDossie("contratos")} className={`flex-1 min-w-[120px] py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-md transition-colors ${abaDossie === "contratos" ? "bg-amber-50 text-amber-700" : "text-slate-500 hover:bg-slate-50"}`}><FileSignature className="w-4 h-4"/> Contratos</button>
                    <button onClick={() => setAbaDossie("comercial")} className={`flex-1 min-w-[120px] py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-md transition-colors ${abaDossie === "comercial" ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"}`}><ShoppingBag className="w-4 h-4"/> Comercial</button>
                    <button onClick={() => setAbaDossie("tecnica")} className={`flex-1 min-w-[120px] py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-md transition-colors ${abaDossie === "tecnica" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}><Wrench className="w-4 h-4"/> Técnica & Equip.</button>
                    <button onClick={() => setAbaDossie("grafica")} className={`flex-1 min-w-[120px] py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-md transition-colors ${abaDossie === "grafica" ? "bg-purple-50 text-purple-700" : "text-slate-500 hover:bg-slate-50"}`}><Layers className="w-4 h-4"/> Gráfica (OSG)</button>
                </div>

                {/* CONTEÚDO DAS ABAS */}
                <div className="bg-white rounded-xl border shadow-sm p-6 min-h-[500px]">
                    
                    {abaDossie === "timeline" && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-6 border-r border-slate-100 pr-6">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-indigo-500"/> Registrar Interação</h3>
                                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Canal</label><Select value={interacaoTipo} onValueChange={setInteracaoTipo}><SelectTrigger className="bg-white h-9"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="WhatsApp">WhatsApp</SelectItem><SelectItem value="Ligação">Ligação</SelectItem><SelectItem value="Email">E-mail</SelectItem><SelectItem value="Visita">Visita</SelectItem></SelectContent></Select></div>
                                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Data Retorno</label><Input type="date" value={interacaoDataAgend} onChange={e => setInteracaoDataAgend(e.target.value)} className="bg-white h-9" /></div>
                                    </div>
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Resumo da Conversa *</label><textarea value={interacaoDesc} onChange={e => setInteracaoDesc(e.target.value)} className="w-full h-24 p-2 border rounded bg-white text-sm resize-none"></textarea></div>
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Próximo Passo Agendado</label><Input value={interacaoProxPasso} onChange={e => setInteracaoProxPasso(e.target.value)} className="bg-white h-9" placeholder="Ex: Ligar para confirmar aprovação" /></div>
                                    <Button onClick={registrarInteracaoCRM} disabled={salvando} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Registrar na Timeline</Button>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><Clock className="w-5 h-5 text-slate-400"/> Histórico de Contatos</h3>
                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {historico.length === 0 ? <p className="text-sm text-slate-400 italic">Nenhum contato registrado.</p> : historico.map(h => (
                                        <div key={h.id} className="bg-white p-4 rounded-lg border shadow-sm hover:border-indigo-200 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wider">{h.tipo}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">{new Date(h.data_interacao).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                            <p className="text-sm text-slate-700 font-medium leading-relaxed">"{h.descricao}"</p>
                                            {h.proximo_passo && <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-indigo-700 bg-indigo-50 p-2 rounded"><strong>Próximo Passo:</strong> {h.proximo_passo} {h.data_agendamento && `(Retornar em ${new Date(h.data_agendamento).toLocaleDateString('pt-BR')})`}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {abaDossie === "contratos" && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileSignature className="w-5 h-5 text-amber-600"/> Contratos Vigentes</h3>
                                <Button size="sm" variant="outline" className="text-amber-700 border-amber-200 hover:bg-amber-50">Gerenciar em Módulo Específico</Button>
                            </div>
                            {contratos.length === 0 ? <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-dashed"><FileSignature className="w-8 h-8 mx-auto mb-2 opacity-50"/> Cliente sem contratos ativos.</div> : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {contratos.map(c => (
                                        <div key={c.id} className="border border-slate-200 p-4 rounded-xl shadow-sm hover:border-amber-300">
                                            <div className="flex justify-between mb-2">
                                                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded uppercase tracking-wider">{c.tipo}</span>
                                                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">{c.status}</span>
                                            </div>
                                            <h4 className="font-bold text-slate-800 text-lg">{c.titulo}</h4>
                                            <div className="flex justify-between mt-4 pt-4 border-t border-slate-100">
                                                <p className="text-xs text-slate-500">Vence em: <br/><strong className="text-slate-700">{new Date(c.data_vencimento).toLocaleDateString('pt-BR')}</strong></p>
                                                <p className="text-xs text-slate-500 text-right">Mensalidade: <br/><strong className="text-amber-600 text-sm">R$ {Number(c.valor_mensal).toFixed(2).replace('.',',')}</strong></p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {abaDossie === "comercial" && (
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><ShoppingBag className="w-5 h-5 text-emerald-600"/> Histórico de Pedidos e Orçamentos</h3>
                            <table className="w-full text-left text-sm border-collapse">
                                <thead><tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider"><th className="p-3">Data</th><th className="p-3">Nº Pedido</th><th className="p-3">Condição Pgto</th><th className="p-3 text-center">Status</th><th className="p-3 text-right">Total</th></tr></thead>
                                <tbody>
                                    {pedidos.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhuma venda realizada.</td></tr> : pedidos.map(p => (
                                        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="p-3 font-medium text-slate-600">{new Date(p.data_emissao).toLocaleDateString('pt-BR')}</td>
                                            <td className="p-3 font-bold text-slate-800">PED-{String(p.numero_pedido).padStart(4,'0')}</td>
                                            <td className="p-3 text-slate-600">{p.condicao_pagamento}</td>
                                            <td className="p-3 text-center"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${p.status === 'Orçamento' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{p.status}</span></td>
                                            <td className="p-3 text-right font-bold text-emerald-600">R$ {Number(p.valor_total).toFixed(2).replace('.',',')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {abaDossie === "tecnica" && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Printer className="w-5 h-5 text-slate-400"/> Parque de Equipamentos</h3>
                                <div className="space-y-3">
                                    {equipamentos.length === 0 ? <p className="text-sm text-slate-400 italic">Nenhum equipamento vinculado.</p> : equipamentos.map(e => (
                                        <div key={e.id} className="p-3 border border-slate-200 rounded-lg hover:border-blue-300 bg-slate-50">
                                            <div className="flex justify-between items-start">
                                                <div><p className="font-bold text-slate-800">{e.equipamento}</p><p className="text-xs text-slate-500 font-mono">S/N: {e.numero_serie || 'Não informado'}</p></div>
                                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase">{e.status}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 uppercase mt-2">Setor: {e.setor_instalacao || 'Geral'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="border-l border-slate-100 pl-6">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Wrench className="w-5 h-5 text-blue-500"/> Últimas Ordens de Serviço</h3>
                                <div className="space-y-3">
                                    {ordensServico.length === 0 ? <p className="text-sm text-slate-400 italic">Nenhuma OS registrada.</p> : ordensServico.map(os => (
                                        <div key={os.id} className="p-3 border border-slate-200 rounded-lg hover:border-blue-300">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="font-bold text-blue-700 text-sm">OS-{String(os.numero_os).padStart(4,'0')}</p>
                                                <span className="text-[9px] font-bold text-slate-500 uppercase">{new Date(os.data_abertura).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                            <p className="text-xs text-slate-700 font-medium line-clamp-1 border-b border-slate-100 pb-2 mb-2">{os.equipamento}</p>
                                            <div className="flex justify-between items-center">
                                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${os.status === 'Concluída' || os.status === 'Faturada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{os.status}</span>
                                                <p className="text-xs font-bold text-slate-800">R$ {Number(os.valor_total).toFixed(2).replace('.',',')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {abaDossie === "grafica" && (
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><Layers className="w-5 h-5 text-purple-600"/> Ordens de Serviço Gráfico (OSG)</h3>
                            <table className="w-full text-left text-sm border-collapse">
                                <thead><tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider"><th className="p-3">Data</th><th className="p-3">Nº OSG</th><th className="p-3">Serviço / Produto</th><th className="p-3 text-center">Status</th><th className="p-3 text-center">Qtd</th></tr></thead>
                                <tbody>
                                    {ordensProducao.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum serviço gráfico encomendado.</td></tr> : ordensProducao.map(op => (
                                        <tr key={op.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="p-3 font-medium text-slate-600">{new Date(op.data_entrada).toLocaleDateString('pt-BR')}</td>
                                            <td className="p-3 font-bold text-slate-800">OSG-{String(op.numero_op).padStart(4,'0')}</td>
                                            <td className="p-3 text-slate-700 font-medium">{op.descricao_servico}</td>
                                            <td className="p-3 text-center"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${op.status === 'Entregue' || op.status === 'Pronto para Entrega' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>{op.status}</span></td>
                                            <td className="p-3 text-center font-bold text-purple-700">{op.quantidade_produzir}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </AppLayout>
  );
}