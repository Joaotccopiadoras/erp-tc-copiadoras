import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, ArrowDownCircle, ArrowUpCircle, DollarSign, Calendar, Search, Plus, CheckCircle2, Clock, Landmark, FileText, Building2, CreditCard, Edit, Trash2 } from "lucide-react";
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

  // Variável auxiliar para adaptar a tela (Cores, Textos, Filtros)
  const isPagar = abaAtiva === "pagar";

  // ==========================================
  // AUTO-SAVE (RECUPERAÇÃO DE RASCUNHO)
  // ==========================================
  useEffect(() => {
    const rascunho = sessionStorage.getItem("financeiro_rascunho_v2");
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
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    if (mostrarForm || descricao || valor) {
      const draft = { mostrarForm, editandoLancamentoId, descricao, valor, dataEmissao, dataVencimento, fornecedorId, categoriaId, contaId, centroCusto, formaPagamento, documentoOrigem };
      sessionStorage.setItem("financeiro_rascunho_v2", JSON.stringify(draft));
    }
  }, [mostrarForm, editandoLancamentoId, descricao, valor, dataEmissao, dataVencimento, fornecedorId, categoriaId, contaId, centroCusto, formaPagamento, documentoOrigem]);

  const limparFormulario = () => {
    sessionStorage.removeItem("financeiro_rascunho_v2");
    setMostrarForm(false);
    setEditandoLancamentoId(null);
    setDescricao(""); setValor(""); setDataVencimento(""); setDataEmissao(""); setDocumentoOrigem("");
    setFornecedorId("nenhum"); setCentroCusto("Geral"); setFormaPagamento("Boleto"); setCategoriaId("");
  };
  // ==========================================

  useEffect(() => {
    fetchDadosBase();
    fetchLancamentos();
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
      status: editandoLancamentoId ? undefined : 'Pendente' // Preserva status se estiver editando
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

  // Cálculos do Resumo
  const totalPendente = lancamentos.filter(l => l.status === 'Pendente').reduce((acc, l) => acc + Number(l.valor), 0);
  const totalPago = lancamentos.filter(l => l.status === 'Pago').reduce((acc, l) => acc + Number(l.valor), 0);

  const lancamentosFiltrados = lancamentos.filter(l => 
    (l.descricao?.toLowerCase() || "").includes(busca.toLowerCase()) || 
    (l.documento_origem?.toLowerCase() || "").includes(busca.toLowerCase()) ||
    (l.log_fornecedores?.nome_fantasia?.toLowerCase() || "").includes(busca.toLowerCase())
  );

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

        {/* RESUMO RÁPIDO (Cores adaptáveis) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-full ${isPagar ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-600'}`}><Clock className="w-6 h-6"/></div>
            <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{isPagar ? 'A Pagar (Pendente)' : 'A Receber (Pendente)'}</p>
                <p className="text-2xl font-black text-slate-800">R$ {totalPendente.toFixed(2).replace('.', ',')}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-emerald-100 p-3 rounded-full text-emerald-600"><CheckCircle2 className="w-6 h-6"/></div>
            <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{isPagar ? 'Total Pago' : 'Total Recebido'}</p>
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
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b flex flex-wrap gap-4 justify-between items-center bg-slate-50">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder={isPagar ? "Buscar fornecedor, NF ou descrição..." : "Buscar cliente, NF ou descrição..."} className="pl-9 bg-white" />
              </div>
              <Button onClick={abrirNovoLancamento} className={`${isPagar ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white gap-2`}>
                <Plus className="w-4 h-4" /> Novo Lançamento Manual
              </Button>
            </div>

            {/* FORMULÁRIO MANUAL */}
            {mostrarForm && (
              <div className={`p-6 border-b space-y-4 ${isPagar ? 'bg-rose-50/30 border-rose-100' : 'bg-emerald-50/30 border-emerald-100'}`}>
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
                          <SelectContent>
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
                        <SelectContent position="popper" className="z-[99] bg-white"><SelectItem value="Boleto">Boleto Bancário</SelectItem><SelectItem value="PIX">PIX</SelectItem><SelectItem value="Transferência">Transferência Bancária</SelectItem><SelectItem value="Cartão">Cartão de Crédito</SelectItem><SelectItem value="Dinheiro">Dinheiro</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Categoria Financeira <span className="text-red-500">*</span></label>
                    <Select value={categoriaId} onValueChange={setCategoriaId}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Conta Bancária <span className="text-red-500">*</span></label>
                    <Select value={contaId} onValueChange={setContaId}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{contasBancarias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={limparFormulario}>Cancelar</Button>
                  <Button onClick={salvarLancamento} className={`${isPagar ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}>
                      {editandoLancamentoId ? 'Atualizar Lançamento' : 'Salvar Lançamento'}
                  </Button>
                </div>
              </div>
            )}

            {/* TABELA DE LANÇAMENTOS */}
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b w-32">Vencimento</th>
                    <th className="p-4 font-semibold border-b min-w-[250px]">Descrição / Documento</th>
                    <th className="p-4 font-semibold border-b">Classificação (C.Custo)</th>
                    <th className="p-4 font-semibold border-b text-center">Status</th>
                    <th className="p-4 font-semibold border-b text-right">Valor</th>
                    <th className="p-4 font-semibold border-b text-center w-32">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lancamentosFiltrados.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhum lançamento encontrado nesta categoria.</td></tr>
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