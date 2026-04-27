import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, ArrowDownCircle, ArrowUpCircle, DollarSign, Calendar, Search, Plus, CheckCircle2, Clock, Landmark, FileText, Building2, CreditCard, Edit, Trash2, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Financeiro() {
  const [abaAtiva, setAbaAtiva] = useState<"dashboard" | "pagar" | "receber">("pagar");
  
  // Estados do Banco de Dados
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [busca, setBusca] = useState("");

  // Estados do Novo Lançamento Manual (Modal/Form)
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoLancamentoId, setEditandoLancamentoId] = useState<string | null>(null);
  
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [fornecedorId, setFornecedorId] = useState("nenhum");
  const [categoriaId, setCategoriaId] = useState("");
  const [contaId, setContaId] = useState("");
  const [centroCusto, setCentroCusto] = useState("Geral");
  const [formaPagamento, setFormaPagamento] = useState("Boleto");
  const [documentoOrigem, setDocumentoOrigem] = useState("");

  // ==========================================
  // ESTADOS DE FILTROS AVANÇADOS
  // ==========================================
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroVencInicio, setFiltroVencInicio] = useState("");
  const [filtroVencFim, setFiltroVencFim] = useState("");
  const [filtroEmiInicio, setFiltroEmiInicio] = useState("");
  const [filtroEmiFim, setFiltroEmiFim] = useState("");
  const [filtroPagInicio, setFiltroPagInicio] = useState("");
  const [filtroPagFim, setFiltroPagFim] = useState("");
  const [filtroCentroCusto, setFiltroCentroCusto] = useState("todos");
  const [filtroFornecedor, setFiltroFornecedor] = useState("todos");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroValorMin, setFiltroValorMin] = useState("");
  const [filtroValorMax, setFiltroValorMax] = useState("");

  const isPagar = abaAtiva === "pagar";

  // ==========================================
  // AUTO-SAVE (RECUPERAÇÃO DE RASCUNHO E FILTROS)
  // ==========================================
  useEffect(() => {
    const rascunho = sessionStorage.getItem("financeiro_rascunho_v3");
    if (rascunho) {
      try {
        const draft = JSON.parse(rascunho);
        if (draft.mostrarForm !== undefined) setMostrarForm(draft.mostrarForm);
        if (draft.editandoLancamentoId !== undefined) setEditandoLancamentoId(draft.editandoLancamentoId);
        if (draft.descricao) setDescricao(draft.descricao);
        if (draft.valor) setValor(draft.valor);
        if (draft.dataEmissao) setDataEmissao(draft.dataEmissao);
        if (draft.dataVencimento) setDataVencimento(draft.dataVencimento);
        if (draft.fornecedorId) setFornecedorId(draft.fornecedorId);
        if (draft.categoriaId) setCategoriaId(draft.categoriaId);
        if (draft.contaId) setContaId(draft.contaId);
        if (draft.centroCusto) setCentroCusto(draft.centroCusto);
        if (draft.formaPagamento) setFormaPagamento(draft.formaPagamento);
        if (draft.documentoOrigem) setDocumentoOrigem(draft.documentoOrigem);
        
        // Filtros
        if (draft.mostrarFiltros !== undefined) setMostrarFiltros(draft.mostrarFiltros);
        if (draft.filtroVencInicio) setFiltroVencInicio(draft.filtroVencInicio);
        if (draft.filtroVencFim) setFiltroVencFim(draft.filtroVencFim);
        if (draft.filtroEmiInicio) setFiltroEmiInicio(draft.filtroEmiInicio);
        if (draft.filtroEmiFim) setFiltroEmiFim(draft.filtroEmiFim);
        if (draft.filtroPagInicio) setFiltroPagInicio(draft.filtroPagInicio);
        if (draft.filtroPagFim) setFiltroPagFim(draft.filtroPagFim);
        if (draft.filtroCentroCusto) setFiltroCentroCusto(draft.filtroCentroCusto);
        if (draft.filtroFornecedor) setFiltroFornecedor(draft.filtroFornecedor);
        if (draft.filtroCliente) setFiltroCliente(draft.filtroCliente);
        if (draft.filtroStatus) setFiltroStatus(draft.filtroStatus);
        if (draft.filtroValorMin) setFiltroValorMin(draft.filtroValorMin);
        if (draft.filtroValorMax) setFiltroValorMax(draft.filtroValorMax);
        if (draft.busca) setBusca(draft.busca);
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    const draft = { 
      mostrarForm, editandoLancamentoId, descricao, valor, dataEmissao, dataVencimento, 
      fornecedorId, categoriaId, contaId, centroCusto, formaPagamento, documentoOrigem,
      mostrarFiltros, filtroVencInicio, filtroVencFim, filtroEmiInicio, filtroEmiFim, 
      filtroPagInicio, filtroPagFim, filtroCentroCusto, filtroFornecedor, filtroCliente, 
      filtroStatus, filtroValorMin, filtroValorMax, busca
    };
    sessionStorage.setItem("financeiro_rascunho_v3", JSON.stringify(draft));
  }, [
    mostrarForm, editandoLancamentoId, descricao, valor, dataEmissao, dataVencimento, 
    fornecedorId, categoriaId, contaId, centroCusto, formaPagamento, documentoOrigem,
    mostrarFiltros, filtroVencInicio, filtroVencFim, filtroEmiInicio, filtroEmiFim, 
    filtroPagInicio, filtroPagFim, filtroCentroCusto, filtroFornecedor, filtroCliente, 
    filtroStatus, filtroValorMin, filtroValorMax, busca
  ]);

  const limparFormulario = () => {
    setMostrarForm(false);
    setEditandoLancamentoId(null);
    setDescricao(""); setValor(""); setDataVencimento(""); setDataEmissao(""); setDocumentoOrigem("");
    setFornecedorId("nenhum"); setCentroCusto("Geral"); setFormaPagamento("Boleto"); setCategoriaId("");
  };

  const limparFiltros = () => {
    setFiltroVencInicio(""); setFiltroVencFim("");
    setFiltroEmiInicio(""); setFiltroEmiFim("");
    setFiltroPagInicio(""); setFiltroPagFim("");
    setFiltroCentroCusto("todos"); setFiltroFornecedor("todos");
    setFiltroCliente(""); setFiltroStatus("todos");
    setFiltroValorMin(""); setFiltroValorMax("");
    setBusca("");
  };
  // ==========================================

  useEffect(() => {
    fetchDadosBase();
    fetchLancamentos();
    limparFiltros(); // Limpa filtros ao trocar de aba
  }, [abaAtiva]);

  const fetchDadosBase = async () => {
    const tipoFiltro = isPagar ? 'Despesa' : 'Receita';
    const [contas, cats, forns] = await Promise.all([
      supabase.from('fin_contas_bancarias').select('*'),
      supabase.from('fin_categorias').select('*').eq('tipo', tipoFiltro),
      supabase.from('log_fornecedores').select('id, razao_social, nome_fantasia')
    ]);
    if (contas.data) {
        setContasBancarias(contas.data);
        if (contas.data.length > 0 && !contaId) setContaId(contas.data[0].id);
    }
    if (cats.data) setCategorias(cats.data);
    if (forns.data) setFornecedores(forns.data);
  };

  const fetchLancamentos = async () => {
    const tipoFiltro = isPagar ? 'Despesa' : 'Receita';
    const { data, error } = await supabase
      .from('fin_lancamentos')
      .select(`*, log_fornecedores(nome_fantasia), fin_categorias(nome)`)
      .eq('tipo', tipoFiltro)
      .order('data_vencimento', { ascending: true });
      
    if (data) setLancamentos(data);
    if (error) console.error("Erro ao buscar lançamentos:", error);
  };

  const abrirNovoLancamento = () => {
    limparFormulario();
    setMostrarForm(true);
  };

  const abrirEditarLancamento = (lanc: any) => {
    setEditandoLancamentoId(lanc.id);
    setDescricao(lanc.descricao || "");
    setValor(lanc.valor?.toString() || "");
    setDataEmissao(lanc.data_emissao || "");
    setDataVencimento(lanc.data_vencimento || "");
    setFornecedorId(lanc.fornecedor_id || "nenhum");
    setCategoriaId(lanc.categoria_id || "");
    setContaId(lanc.conta_bancaria_id || (contasBancarias.length > 0 ? contasBancarias[0].id : ""));
    setCentroCusto(lanc.centro_custo || "Geral");
    setFormaPagamento(lanc.forma_pagamento || "Boleto");
    setDocumentoOrigem(lanc.documento_origem || "");
    setMostrarForm(true);
  };

  const salvarLancamento = async () => {
    if (!descricao || !valor || !dataVencimento || !categoriaId || !contaId) {
      return alert("Preencha todos os campos obrigatórios (Descricão, Valor, Vencimento, Categoria e Conta Bancária).");
    }

    const payload = {
      tipo: isPagar ? 'Despesa' : 'Receita',
      descricao,
      valor: parseFloat(valor),
      data_emissao: dataEmissao || null,
      data_vencimento: dataVencimento,
      categoria_id: categoriaId,
      conta_bancaria_id: contaId,
      fornecedor_id: (isPagar && fornecedorId !== "nenhum") ? fornecedorId : null,
      centro_custo: centroCusto,
      forma_pagamento: formaPagamento,
      documento_origem: documentoOrigem,
      status: editandoLancamentoId ? undefined : 'Pendente' 
    };

    let error;
    if (editandoLancamentoId) {
        const result = await supabase.from('fin_lancamentos').update(payload).eq('id', editandoLancamentoId);
        error = result.error;
    } else {
        const result = await supabase.from('fin_lancamentos').insert([payload]);
        error = result.error;
    }
    
    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      alert(editandoLancamentoId ? "Lançamento atualizado com sucesso!" : "Lançamento registrado com sucesso!");
      limparFormulario();
      fetchLancamentos();
    }
  };

  const deletarLancamento = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento permanentemente?")) return;
    const { error } = await supabase.from('fin_lancamentos').delete().eq('id', id);
    if (!error) fetchLancamentos();
    else alert("Erro ao excluir: " + error.message);
  };

  const darBaixa = async (id: string) => {
    const acao = isPagar ? "PAGAMENTO desta despesa" : "RECEBIMENTO desta receita";
    if (!confirm(`Confirmar o ${acao}?`)) return;
    
    const { error } = await supabase
      .from('fin_lancamentos')
      .update({ status: 'Pago', data_pagamento: new Date().toISOString().split('T')[0] })
      .eq('id', id);

    if (!error) fetchLancamentos();
    else alert("Erro ao baixar título: " + error.message);
  };

  // ==========================================
  // MOTOR DE FILTROS AVANÇADOS
  // ==========================================
  const lancamentosFiltrados = lancamentos.filter(l => {
    // 1. Busca Global
    if (busca) {
      const termo = busca.toLowerCase();
      const matchDesc = (l.descricao || "").toLowerCase().includes(termo);
      const matchDoc = (l.documento_origem || "").toLowerCase().includes(termo);
      const matchForn = (l.log_fornecedores?.nome_fantasia || "").toLowerCase().includes(termo);
      if (!matchDesc && !matchDoc && !matchForn) return false;
    }

    // 2. Datas de Vencimento
    if (filtroVencInicio && l.data_vencimento < filtroVencInicio) return false;
    if (filtroVencFim && l.data_vencimento > filtroVencFim) return false;

    // 3. Datas de Emissão
    if (filtroEmiInicio && (!l.data_emissao || l.data_emissao < filtroEmiInicio)) return false;
    if (filtroEmiFim && (!l.data_emissao || l.data_emissao > filtroEmiFim)) return false;

    // 4. Datas de Pagamento
    if (filtroPagInicio && (!l.data_pagamento || l.data_pagamento < filtroPagInicio)) return false;
    if (filtroPagFim && (!l.data_pagamento || l.data_pagamento > filtroPagFim)) return false;

    // 5. Centro de Custo
    if (filtroCentroCusto !== "todos" && l.centro_custo !== filtroCentroCusto) return false;

    // 6. Fornecedor (Pagar)
    if (isPagar && filtroFornecedor !== "todos" && l.fornecedor_id !== filtroFornecedor) return false;

    // 7. Cliente (Receber)
    if (!isPagar && filtroCliente) {
      const nomeClienteBusca = filtroCliente.toLowerCase();
      if (!(l.descricao || "").toLowerCase().includes(nomeClienteBusca)) return false;
    }

    // 8. Faixa de Valor
    if (filtroValorMin && Number(l.valor) < Number(filtroValorMin)) return false;
    if (filtroValorMax && Number(l.valor) > Number(filtroValorMax)) return false;

    // 9. Status
    const isAtrasado = new Date(l.data_vencimento) < new Date(new Date().setHours(0,0,0,0)) && l.status === 'Pendente';
    if (filtroStatus === "Pago" && l.status !== 'Pago') return false;
    if (filtroStatus === "Pendente" && (l.status !== 'Pendente' || isAtrasado)) return false; 
    if (filtroStatus === "Atrasado" && !isAtrasado) return false;

    return true;
  });

  // Cálculos do Resumo AGORA RESPEITAM OS FILTROS
  const totalPendente = lancamentosFiltrados.filter(l => l.status === 'Pendente').reduce((acc, l) => acc + Number(l.valor), 0);
  const totalPago = lancamentosFiltrados.filter(l => l.status === 'Pago').reduce((acc, l) => acc + Number(l.valor), 0);

  // Lista de Centros de Custo dinâmicos
  const centrosDeCusto = Array.from(new Set(lancamentos.map(l => l.centro_custo).filter(Boolean))).sort();

  const temFiltroAtivo = filtroVencInicio || filtroVencFim || filtroEmiInicio || filtroEmiFim || filtroPagInicio || filtroPagFim || filtroCentroCusto !== "todos" || filtroFornecedor !== "todos" || filtroCliente || filtroStatus !== "todos" || filtroValorMin || filtroValorMax || busca;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto mb-12">
        
        {/* CABEÇALHO DINÂMICO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <Wallet className="w-6 h-6 text-emerald-600" /> Gestão Financeira
            </h1>
            <p className="text-slate-500">Controle de Contas a Pagar, Receber e Fluxo de Caixa.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => { setAbaAtiva("pagar"); limparFormulario(); }} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "pagar" ? "bg-white shadow-sm text-rose-700" : "text-slate-600 hover:text-slate-900"}`}><ArrowDownCircle className="w-4 h-4"/> Contas a Pagar</button>
            <button onClick={() => { setAbaAtiva("receber"); limparFormulario(); }} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "receber" ? "bg-white shadow-sm text-emerald-700" : "text-slate-600 hover:text-slate-900"}`}><ArrowUpCircle className="w-4 h-4"/> Contas a Receber</button>
          </div>
        </div>

        {/* RESUMO RÁPIDO (Respeitando filtros) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-full ${isPagar ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-600'}`}><Clock className="w-6 h-6"/></div>
            <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{isPagar ? 'A Pagar (Filtro)' : 'A Receber (Filtro)'}</p>
                <p className="text-2xl font-black text-slate-800">R$ {totalPendente.toFixed(2).replace('.', ',')}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-emerald-100 p-3 rounded-full text-emerald-600"><CheckCircle2 className="w-6 h-6"/></div>
            <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{isPagar ? 'Total Pago (Filtro)' : 'Total Recebido (Filtro)'}</p>
                <p className="text-2xl font-black text-slate-800">R$ {totalPago.toFixed(2).replace('.', ',')}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-indigo-100 p-3 rounded-full text-indigo-600"><Landmark className="w-6 h-6"/></div>
            <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Saldo Geral</p>
                <p className="text-2xl font-black text-slate-800">R$ 0,00</p>
            </div>
          </div>
        </div>

        {/* ÁREA PRINCIPAL UNIFICADA (PAGAR / RECEBER) */}
        {(abaAtiva === "pagar" || abaAtiva === "receber") && (
          <div className="bg-white rounded-xl border shadow-sm">
            
            {/* Cabecalho da Tabela e Buscas Simples */}
            <div className="p-4 border-b flex flex-wrap gap-4 justify-between items-center bg-slate-50 rounded-t-xl">
              <div className="flex gap-2 w-full md:w-auto flex-1 max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder={isPagar ? "Buscar fornecedor, NF ou descrição..." : "Buscar cliente, NF ou descrição..."} className="pl-9 bg-white" />
                </div>
                <Button variant={mostrarFiltros ? "default" : "outline"} onClick={() => setMostrarFiltros(!mostrarFiltros)} className={`gap-2 ${mostrarFiltros ? (isPagar ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white') : 'bg-white text-slate-600 border-slate-300'}`}>
                    <Filter className="w-4 h-4"/> Filtros
                </Button>
                {temFiltroAtivo && !mostrarFiltros && (
                    <Button variant="ghost" onClick={limparFiltros} className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2" title="Limpar Filtros"><X className="w-4 h-4"/></Button>
                )}
              </div>
              <Button onClick={abrirNovoLancamento} className={`${isPagar ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white gap-2 shadow-sm`}>
                <Plus className="w-4 h-4" /> Novo Lançamento Manual
              </Button>
            </div>

            {/* PAINEL DE FILTROS AVANÇADOS */}
            {mostrarFiltros && (
                <div className={`p-5 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-5 ${isPagar ? 'bg-rose-50/30' : 'bg-emerald-50/30'}`}>
                    <div className="col-span-1 md:col-span-4 flex justify-between items-center mb-[-10px]">
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Filter className="w-4 h-4 opacity-50"/> Filtros Avançados</h4>
                        <Button variant="ghost" size="sm" onClick={limparFiltros} className="text-red-500 hover:bg-red-50 h-8 px-2 text-xs font-semibold">Limpar Filtros</Button>
                    </div>
                    
                    {/* Linha 1: Datas */}
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Data de Vencimento</label>
                        <div className="flex items-center gap-2">
                            <Input type="date" value={filtroVencInicio} onChange={e=>setFiltroVencInicio(e.target.value)} className="bg-white h-9" />
                            <span className="text-xs text-slate-400">até</span>
                            <Input type="date" value={filtroVencFim} onChange={e=>setFiltroVencFim(e.target.value)} className="bg-white h-9" />
                        </div>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Data de Emissão</label>
                        <div className="flex items-center gap-2">
                            <Input type="date" value={filtroEmiInicio} onChange={e=>setFiltroEmiInicio(e.target.value)} className="bg-white h-9" />
                            <span className="text-xs text-slate-400">até</span>
                            <Input type="date" value={filtroEmiFim} onChange={e=>setFiltroEmiFim(e.target.value)} className="bg-white h-9" />
                        </div>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Data de {isPagar ? 'Pagamento' : 'Recebimento'}</label>
                        <div className="flex items-center gap-2">
                            <Input type="date" value={filtroPagInicio} onChange={e=>setFiltroPagInicio(e.target.value)} className="bg-white h-9" />
                            <span className="text-xs text-slate-400">até</span>
                            <Input type="date" value={filtroPagFim} onChange={e=>setFiltroPagFim(e.target.value)} className="bg-white h-9" />
                        </div>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Faixa de Valor (R$)</label>
                        <div className="flex items-center gap-2">
                            <Input type="number" step="0.01" value={filtroValorMin} onChange={e=>setFiltroValorMin(e.target.value)} placeholder="Mínimo" className="bg-white h-9" />
                            <span className="text-xs text-slate-400">até</span>
                            <Input type="number" step="0.01" value={filtroValorMax} onChange={e=>setFiltroValorMax(e.target.value)} placeholder="Máximo" className="bg-white h-9" />
                        </div>
                    </div>

                    {/* Linha 2: Entidades e Status */}
                    <div className="space-y-1.5 md:col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
                        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                            <SelectTrigger className="bg-white h-9"><SelectValue/></SelectTrigger>
                            <SelectContent className="z-[9999]">
                                <SelectItem value="todos">Todos os Status</SelectItem>
                                <SelectItem value="Pendente">Pendente (No Prazo)</SelectItem>
                                <SelectItem value="Atrasado">Atrasado / Vencido</SelectItem>
                                <SelectItem value="Pago">{isPagar ? 'Pago' : 'Recebido'}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5 md:col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Centro de Custo</label>
                        <Select value={filtroCentroCusto} onValueChange={setFiltroCentroCusto}>
                            <SelectTrigger className="bg-white h-9"><SelectValue/></SelectTrigger>
                            <SelectContent className="z-[9999]">
                                <SelectItem value="todos">Todos os Centros</SelectItem>
                                {centrosDeCusto.map((cc:any) => <SelectItem key={cc} value={cc}>{cc}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        {isPagar ? (
                            <>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Fornecedor</label>
                                <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
                                    <SelectTrigger className="bg-white h-9"><SelectValue/></SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        <SelectItem value="todos">Todos os Fornecedores</SelectItem>
                                        <SelectItem value="nenhum">Sem Fornecedor Vinculado</SelectItem>
                                        {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </>
                        ) : (
                            <>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Nome do Cliente</label>
                                <Input value={filtroCliente} onChange={e=>setFiltroCliente(e.target.value)} placeholder="Digite parte do nome..." className="bg-white h-9" />
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* FORMULÁRIO MANUAL */}
            {mostrarForm && (
              <div className={`p-6 border-b space-y-4 ${isPagar ? 'bg-rose-50/80 border-rose-100' : 'bg-emerald-50/80 border-emerald-100'} shadow-inner`}>
                <div className="flex justify-between items-center mb-4">
                   <h3 className={`font-bold flex items-center gap-2 ${isPagar ? 'text-rose-800' : 'text-emerald-800'}`}>
                       {editandoLancamentoId ? <Edit className="w-5 h-5"/> : <DollarSign className="w-5 h-5"/>} 
                       {editandoLancamentoId ? (isPagar ? 'Editar Despesa' : 'Editar Receita') : (isPagar ? 'Registrar Despesa Avulsa' : 'Registrar Receita Avulsa')}
                   </h3>
                   <span className={`text-xs font-medium italic ${isPagar ? 'text-rose-500' : 'text-emerald-500'}`}>Rascunho salvo automaticamente</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">{isPagar ? 'Descrição' : 'Descrição / Cliente'} <span className="text-red-500">*</span></label>
                      <Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder={isPagar ? "Ex: Conta de Luz, Aluguel..." : "Ex: Mensalidade Avulsa Cliente X..."} className="bg-white" />
                  </div>
                  <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Valor (R$) <span className="text-red-500">*</span></label><Input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" className="bg-white" /></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Vencimento <span className="text-red-500">*</span></label><Input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} className="bg-white" /></div>
                  
                  <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Data de Emissão</label><Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} className="bg-white" /></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Documento / NF</label><Input value={documentoOrigem} onChange={e => setDocumentoOrigem(e.target.value)} placeholder="Ex: Fatura 1029" className="bg-white" /></div>
                  
                  {isPagar ? (
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Fornecedor / Credor</label>
                        <Select value={fornecedorId} onValueChange={setFornecedorId}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent className="bg-white z-[9999]">
                            <SelectItem value="nenhum">Avulso / Sem Fornecedor</SelectItem>
                            {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                  ) : (
                      <div className="md:col-span-2"></div>
                  )}

                  <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Centro de Custo / Setor</label><Input value={centroCusto} onChange={e => setCentroCusto(e.target.value)} placeholder="Ex: Administrativo" className="bg-white" /></div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Forma de Pagamento</label>
                    <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white z-[9999]">
                            <SelectItem value="Boleto">Boleto Bancário</SelectItem>
                            <SelectItem value="PIX">PIX</SelectItem>
                            <SelectItem value="Transferência">Transferência Bancária</SelectItem>
                            <SelectItem value="Cartão">Cartão de Crédito</SelectItem>
                            <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Categoria Financeira <span className="text-red-500">*</span></label>
                    <Select value={categoriaId} onValueChange={setCategoriaId}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent className="bg-white z-[9999]">
                          {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Conta Bancária <span className="text-red-500">*</span></label>
                    <Select value={contaId} onValueChange={setContaId}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent className="bg-white z-[9999]">
                          {contasBancarias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/50 mt-4">
                  <Button variant="outline" onClick={limparFormulario} className="bg-white">Cancelar</Button>
                  <Button onClick={salvarLancamento} className={`${isPagar ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white shadow-md`}>
                      {editandoLancamentoId ? 'Atualizar Lançamento' : 'Salvar Lançamento'}
                  </Button>
                </div>
              </div>
            )}

            {/* TABELA DE LANÇAMENTOS (Com scroll independente para não quebrar cards) */}
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b w-32">Vencimento</th>
                    <th className="p-4 font-semibold border-b min-w-[250px]">Descrição / Documento</th>
                    <th className="p-4 font-semibold border-b">Classificação (C.Custo)</th>
                    <th className="p-4 font-semibold border-b text-center">Status</th>
                    <th className="p-4 font-semibold border-b text-right">Valor</th>
                    <th className="p-4 font-semibold border-b text-center w-24">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lancamentosFiltrados.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhum lançamento corresponde aos filtros aplicados.</td></tr>
                  ) : (
                    lancamentosFiltrados.map(lanc => {
                      const isAtrasado = new Date(lanc.data_vencimento) < new Date(new Date().setHours(0,0,0,0)) && lanc.status === 'Pendente';
                      
                      return (
                        <tr key={lanc.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-4 text-sm font-medium align-top">
                            <span className={`flex items-center gap-1.5 ${isAtrasado ? 'text-rose-600 font-bold' : 'text-slate-700 font-bold'}`}>
                              <Calendar className="w-4 h-4"/> {new Date(lanc.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                            </span>
                            {isAtrasado && <span className="text-[10px] text-rose-500 uppercase mt-0.5 block ml-5">Vencido</span>}
                          </td>
                          
                          <td className="p-4 align-top">
                            <p className="font-bold text-slate-800 text-sm mb-1 leading-tight">{lanc.descricao}</p>
                            {lanc.log_fornecedores?.nome_fantasia && (
                                <p className="text-xs text-slate-600 flex items-center gap-1"><Building2 className="w-3 h-3 text-slate-400"/> {lanc.log_fornecedores.nome_fantasia}</p>
                            )}
                            <div className="flex gap-2 mt-1.5">
                                {lanc.documento_origem && <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1"><FileText className="w-3 h-3"/> Ref: {lanc.documento_origem}</span>}
                                {lanc.data_emissao && <span className="text-[10px] text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">Emissão: {new Date(lanc.data_emissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>}
                            </div>
                          </td>

                          <td className="p-4 align-top">
                            <p className="text-xs font-semibold text-slate-700 mb-1">{lanc.fin_categorias?.nome || 'Sem Categoria'}</p>
                            <p className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-block mb-1 border">C. Custo: {lanc.centro_custo || 'Geral'}</p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1"><CreditCard className="w-3 h-3"/> {lanc.forma_pagamento || 'Boleto'}</p>
                          </td>

                          <td className="p-4 text-center align-top">
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${lanc.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : isAtrasado ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                              {isAtrasado ? 'Atrasado' : (lanc.status === 'Pago' ? (isPagar ? 'Pago' : 'Recebido') : lanc.status)}
                            </span>
                          </td>
                          
                          <td className="p-4 text-right align-top">
                            <p className={`font-bold text-base ${isPagar ? 'text-rose-600' : 'text-emerald-600'}`}>
                                R$ {Number(lanc.valor).toFixed(2).replace('.', ',')}
                            </p>
                            {lanc.valor_impostos > 0 && <p className="text-[10px] text-slate-400 mt-1">Inc. R$ {Number(lanc.valor_impostos).toFixed(2).replace('.',',')} Trib.</p>}
                          </td>
                          
                          <td className="p-4 text-center align-top">
                            {lanc.status === 'Pendente' ? (
                                <div className="space-y-2">
                                    <Button variant="outline" size="sm" onClick={() => darBaixa(lanc.id)} className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 text-xs h-8 shadow-sm">
                                        {isPagar ? 'Pagar' : 'Receber'}
                                    </Button>
                                    <div className="flex justify-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" onClick={() => abrirEditarLancamento(lanc)} className="h-7 w-7 text-slate-400 hover:text-indigo-600" title="Editar Lançamento"><Edit className="w-3.5 h-3.5"/></Button>
                                        <Button variant="ghost" size="icon" onClick={() => deletarLancamento(lanc.id)} className="h-7 w-7 text-slate-300 hover:text-red-500" title="Excluir Lançamento"><Trash2 className="w-3.5 h-3.5"/></Button>
                                    </div>
                                </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">{isPagar ? 'Pago em' : 'Recebido em'}</span>
                                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 mb-2">{new Date(lanc.data_pagamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                                  <div className="flex justify-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" onClick={() => abrirEditarLancamento(lanc)} className="h-7 w-7 text-slate-400 hover:text-indigo-600" title="Editar Lançamento"><Edit className="w-3.5 h-3.5"/></Button>
                                      <Button variant="ghost" size="icon" onClick={() => deletarLancamento(lanc.id)} className="h-7 w-7 text-slate-300 hover:text-red-500" title="Excluir Lançamento"><Trash2 className="w-3.5 h-3.5"/></Button>
                                  </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}