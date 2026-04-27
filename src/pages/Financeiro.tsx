import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Wallet, ArrowDownCircle, ArrowUpCircle, DollarSign, Calendar, Search, 
  Plus, CheckCircle2, Clock, Landmark, FileText, Building2, CreditCard, 
  Edit, Trash2, Filter, X, Table as TableIcon, ArrowUp, ArrowDown 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export default function Financeiro() {
  const [abaAtiva, setAbaAtiva] = useState<"dashboard" | "pagar" | "receber">("pagar");
  
  // Estados do Banco de Dados
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [busca, setBusca] = useState("");

  // Estados de UI
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoLancamentoId, setEditandoLancamentoId] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Estados do Formulário
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

  // Estados de Filtros Avançados
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
  // AUTO-SAVE E FETCH DATA
  // ==========================================
  useEffect(() => {
    const rascunho = sessionStorage.getItem("financeiro_rascunho_v5");
    if (rascunho) {
      try {
        const draft = JSON.parse(rascunho);
        if (draft.mostrarForm !== undefined) setMostrarForm(draft.mostrarForm);
        if (draft.editandoLancamentoId !== undefined) setEditandoLancamentoId(draft.editandoLancamentoId);
        setDescricao(draft.descricao || ""); setValor(draft.valor || "");
        setDataEmissao(draft.dataEmissao || ""); setDataVencimento(draft.dataVencimento || "");
        setFornecedorId(draft.fornecedorId || "nenhum"); setCategoriaId(draft.categoriaId || "");
        setContaId(draft.contaId || ""); setCentroCusto(draft.centroCusto || "Geral");
        setFormaPagamento(draft.formaPagamento || "Boleto"); setDocumentoOrigem(draft.documentoOrigem || "");
        setMostrarFiltros(draft.mostrarFiltros || false);
        if (draft.sortConfig !== undefined) setSortConfig(draft.sortConfig);
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    const draft = { 
      mostrarForm, editandoLancamentoId, descricao, valor, dataEmissao, dataVencimento, 
      fornecedorId, categoriaId, contaId, centroCusto, formaPagamento, documentoOrigem, mostrarFiltros, sortConfig
    };
    sessionStorage.setItem("financeiro_rascunho_v5", JSON.stringify(draft));
  }, [mostrarForm, editandoLancamentoId, descricao, valor, dataEmissao, dataVencimento, fornecedorId, categoriaId, contaId, centroCusto, formaPagamento, documentoOrigem, mostrarFiltros, sortConfig]);

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
    if (contas.data) setContasBancarias(contas.data);
    if (cats.data) setCategorias(cats.data);
    if (forns.data) setFornecedores(forns.data);
  };

  const fetchLancamentos = async () => {
    const tipoFiltro = isPagar ? 'Despesa' : 'Receita';
    const { data } = await supabase.from('fin_lancamentos').select(`*, log_fornecedores(nome_fantasia), fin_categorias(nome)`).eq('tipo', tipoFiltro).order('data_vencimento', { ascending: true });
    if (data) setLancamentos(data);
  };

  const limparFormulario = () => {
    setMostrarForm(false); setEditandoLancamentoId(null);
    setDescricao(""); setValor(""); setDataVencimento(""); setDataEmissao(""); setDocumentoOrigem("");
    setFornecedorId("nenhum"); setCentroCusto("Geral"); setFormaPagamento("Boleto"); setCategoriaId("");
  };

  const limparFiltros = () => {
    setFiltroVencInicio(""); setFiltroVencFim(""); setFiltroEmiInicio(""); setFiltroEmiFim("");
    setFiltroPagInicio(""); setFiltroPagFim(""); setFiltroCentroCusto("todos");
    setFiltroFornecedor("todos"); setFiltroCliente(""); setFiltroStatus("todos");
    setFiltroValorMin(""); setFiltroValorMax(""); setBusca("");
    setSortConfig(null);
  };

  // --- AÇÕES ---
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
    if (!descricao || !valor || !dataVencimento || !categoriaId || !contaId) return alert("Preencha os campos obrigatórios.");
    const payload = {
      tipo: isPagar ? 'Despesa' : 'Receita', descricao, valor: parseFloat(valor),
      data_emissao: dataEmissao || null, data_vencimento: dataVencimento,
      categoria_id: categoriaId, conta_bancaria_id: contaId,
      fornecedor_id: (isPagar && fornecedorId !== "nenhum") ? fornecedorId : null,
      centro_custo: centroCusto, forma_pagamento: formaPagamento, documento_origem: documentoOrigem
    };
    const { error } = editandoLancamentoId 
        ? await supabase.from('fin_lancamentos').update(payload).eq('id', editandoLancamentoId) 
        : await supabase.from('fin_lancamentos').insert([{...payload, status: 'Pendente'}]);
        
    if (!error) { 
        alert("Sucesso!"); 
        limparFormulario(); 
        fetchLancamentos(); 
    } else alert(error.message);
  };

  const deletarLancamento = async (id: string) => {
    if (!confirm("Excluir definitivamente?")) return;
    await supabase.from('fin_lancamentos').delete().eq('id', id);
    fetchLancamentos();
  };

  const darBaixa = async (id: string) => {
    if (!confirm(`Confirmar baixa do título?`)) return;
    await supabase.from('fin_lancamentos').update({ status: 'Pago', data_pagamento: new Date().toISOString().split('T')[0] }).eq('id', id);
    fetchLancamentos();
  };

  // ==========================================
  // MOTOR DE FILTROS, ORDENAÇÃO E CÁLCULOS
  // ==========================================
  const getComputedStatus = (lanc: any) => {
    if (lanc.status === 'Pago') return 'Pago';
    const isAtrasado = new Date(lanc.data_vencimento) < new Date(new Date().setHours(0,0,0,0));
    return isAtrasado ? 'Atrasado' : 'Pendente';
  };

  let lancamentosFiltrados = lancamentos.filter(l => {
    if (busca) {
      const termo = busca.toLowerCase();
      if (!((l.descricao||"").toLowerCase().includes(termo) || (l.documento_origem||"").toLowerCase().includes(termo) || (l.log_fornecedores?.nome_fantasia||"").toLowerCase().includes(termo))) return false;
    }
    if (filtroVencInicio && l.data_vencimento < filtroVencInicio) return false;
    if (filtroVencFim && l.data_vencimento > filtroVencFim) return false;
    if (filtroEmiInicio && (!l.data_emissao || l.data_emissao < filtroEmiInicio)) return false;
    if (filtroEmiFim && (!l.data_emissao || l.data_emissao > filtroEmiFim)) return false;
    if (filtroPagInicio && (!l.data_pagamento || l.data_pagamento < filtroPagInicio)) return false;
    if (filtroPagFim && (!l.data_pagamento || l.data_pagamento > filtroPagFim)) return false;
    if (filtroCentroCusto !== "todos" && l.centro_custo !== filtroCentroCusto) return false;
    if (isPagar && filtroFornecedor !== "todos" && l.fornecedor_id !== filtroFornecedor) return false;
    if (!isPagar && filtroCliente && !(l.descricao||"").toLowerCase().includes(filtroCliente.toLowerCase())) return false;
    if (filtroValorMin && Number(l.valor) < Number(filtroValorMin)) return false;
    if (filtroValorMax && Number(l.valor) > Number(filtroValorMax)) return false;
    
    const statusReal = getComputedStatus(l);
    if (filtroStatus !== "todos" && statusReal !== filtroStatus) return false;
    
    return true;
  });

  // Aplicar Ordenação Customizada
  if (sortConfig !== null) {
    lancamentosFiltrados.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (sortConfig.key) {
        case 'emissao':
          valA = a.data_emissao ? new Date(a.data_emissao).getTime() : 0;
          valB = b.data_emissao ? new Date(b.data_emissao).getTime() : 0;
          break;
        case 'fornecedor':
          valA = (a.log_fornecedores?.nome_fantasia || "").toLowerCase();
          valB = (b.log_fornecedores?.nome_fantasia || "").toLowerCase();
          break;
        case 'documento':
          valA = (a.documento_origem || "").toLowerCase();
          valB = (b.documento_origem || "").toLowerCase();
          break;
        case 'vencimento':
          valA = new Date(a.data_vencimento).getTime();
          valB = new Date(b.data_vencimento).getTime();
          break;
        case 'pagamento':
          valA = a.data_pagamento ? new Date(a.data_pagamento).getTime() : 0;
          valB = b.data_pagamento ? new Date(b.data_pagamento).getTime() : 0;
          break;
        case 'status':
          valA = getComputedStatus(a);
          valB = getComputedStatus(b);
          break;
        case 'valor':
          valA = Number(a.valor);
          valB = Number(b.valor);
          break;
        case 'classificacao':
          valA = (a.fin_categorias?.nome || "").toLowerCase();
          valB = (b.fin_categorias?.nome || "").toLowerCase();
          break;
        case 'descricao':
          valA = (a.descricao || "").toLowerCase();
          valB = (b.descricao || "").toLowerCase();
          break;
        default:
          break;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev && prev.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : null; 
      }
      return { key, direction: 'asc' };
    });
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key === key) {
      return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 inline ml-1 text-slate-600" /> : <ArrowDown className="w-3 h-3 inline ml-1 text-slate-600" />;
    }
    return <ArrowDown className="w-3 h-3 inline ml-1 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
  };

  const totalPendente = lancamentosFiltrados.filter(l => l.status === 'Pendente').reduce((acc, l) => acc + Number(l.valor), 0);
  const totalPago = lancamentosFiltrados.filter(l => l.status === 'Pago').reduce((acc, l) => acc + Number(l.valor), 0);
  const centrosDeCusto = Array.from(new Set(lancamentos.map(l => l.centro_custo).filter(Boolean))).sort();
  const temFiltroAtivo = filtroVencInicio || filtroVencFim || filtroEmiInicio || filtroEmiFim || filtroPagInicio || filtroPagFim || filtroCentroCusto !== "todos" || filtroFornecedor !== "todos" || filtroCliente || filtroStatus !== "todos" || filtroValorMin || filtroValorMax || busca;

  // ==========================================
  // FUNÇÕES DE EXPORTAÇÃO
  // ==========================================
  const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
    try {
      const res = await fetch(imageUrl); if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) { return null; }
  };

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const doc = new jsPDF("landscape");
      const logo = await getBase64ImageFromUrl("/logo.png");
      const tituloRelatorio = isPagar ? "Relatório de Contas a Pagar" : "Relatório de Contas a Receber";
      
      if (logo) doc.addImage(logo, "PNG", 14, 10, 40, 15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(tituloRelatorio, 280, 20, { align: "right" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 280, 26, { align: "right" });

      // Ordem rigorosa: Emissão, Fornecedor, Documento, Vencimento, Pagamento, Status, Valor, Classificação, Descrição
      const tableColumn = ["Emissão", "Fornecedor / Cliente", "Documento", "Vencimento", "Pagamento", "Status", "Valor", "Classificação", "Descrição"];
      
      const tableRows = lancamentosFiltrados.map(l => [
        l.data_emissao ? new Date(l.data_emissao).toLocaleDateString('pt-BR', {timeZone:'UTC'}) : '-',
        l.log_fornecedores?.nome_fantasia || '-',
        l.documento_origem || '-',
        new Date(l.data_vencimento).toLocaleDateString('pt-BR', {timeZone:'UTC'}),
        l.data_pagamento ? new Date(l.data_pagamento).toLocaleDateString('pt-BR', {timeZone:'UTC'}) : '-',
        getComputedStatus(l).toUpperCase(),
        `R$ ${Number(l.valor).toFixed(2).replace('.',',')}`,
        `${l.fin_categorias?.nome || '-'}\nC.C: ${l.centro_custo || 'Geral'}`,
        l.descricao || '-'
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        columnStyles: {
            1: { cellWidth: 35 }, 
            7: { cellWidth: 35 }, 
            8: { cellWidth: 50 }
        },
        headStyles: { fillColor: isPagar ? [190, 18, 60] : [5, 150, 105], textColor: 255 },
      });

      const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY : 35;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`TOTAL PENDENTE: R$ ${totalPendente.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 280, finalY + 10, { align: "right" });
      doc.text(`TOTAL ${isPagar ? 'PAGO' : 'RECEBIDO'}: R$ ${totalPago.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 280, finalY + 17, { align: "right" });

      doc.save(`Financeiro_TC_${abaAtiva}_${Date.now()}.pdf`);
    } catch (e) { console.error(e); alert("Erro ao gerar PDF."); } finally { setExportando(false); }
  };

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(isPagar ? "Contas a Pagar" : "Contas a Receber");
      
      // Ordem rigorosa
      worksheet.columns = [
        { header: "Data de Emissão", key: "emissao", width: 15 },
        { header: "Fornecedor / Cliente", key: "ent", width: 30 },
        { header: "Documento", key: "doc", width: 15 },
        { header: "Vencimento", key: "venc", width: 15 },
        { header: "Data de Pagamento", key: "pag", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Valor (R$)", key: "valor", width: 15 },
        { header: "Classificação", key: "cat", width: 25 },
        { header: "Descrição", key: "desc", width: 40 }
      ];

      lancamentosFiltrados.forEach(l => {
        worksheet.addRow({
          emissao: l.data_emissao ? new Date(l.data_emissao).toLocaleDateString('pt-BR', {timeZone:'UTC'}) : '-',
          ent: l.log_fornecedores?.nome_fantasia || '-',
          doc: l.documento_origem || '-',
          venc: new Date(l.data_vencimento).toLocaleDateString('pt-BR', {timeZone:'UTC'}),
          pag: l.data_pagamento ? new Date(l.data_pagamento).toLocaleDateString('pt-BR', {timeZone:'UTC'}) : '-',
          status: getComputedStatus(l).toUpperCase(),
          valor: Number(l.valor),
          cat: `${l.fin_categorias?.nome || '-'} (C.C: ${l.centro_custo || 'Geral'})`,
          desc: l.descricao
        });
      });

      worksheet.getRow(1).font = { bold: true };
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Financeiro_TC_${abaAtiva}.xlsx`);
    } catch (e) { console.error(e); alert("Erro ao gerar Excel."); } finally { setExportando(false); }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto mb-12">
        
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

        {/* RESUMO RÁPIDO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-full ${isPagar ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-600'}`}><Clock className="w-6 h-6"/></div>
            <div><p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{isPagar ? 'A Pagar (Filtro)' : 'A Receber (Filtro)'}</p><p className="text-2xl font-black text-slate-800">R$ {totalPendente.toFixed(2).replace('.', ',')}</p></div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-emerald-100 p-3 rounded-full text-emerald-600"><CheckCircle2 className="w-6 h-6"/></div>
            <div><p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{isPagar ? 'Total Pago (Filtro)' : 'Total Recebido (Filtro)'}</p><p className="text-2xl font-black text-slate-800">R$ {totalPago.toFixed(2).replace('.', ',')}</p></div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-indigo-100 p-3 rounded-full text-indigo-600"><Landmark className="w-6 h-6"/></div>
            <div><p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Saldo Geral</p><p className="text-2xl font-black text-slate-800">R$ 0,00</p></div>
          </div>
        </div>

        {/* ÁREA PRINCIPAL */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b flex flex-wrap gap-4 justify-between items-center bg-slate-50 rounded-t-xl">
            <div className="flex gap-2 w-full md:w-auto flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder={isPagar ? "Buscar fornecedor, NF ou descrição..." : "Buscar cliente, NF ou descrição..."} className="pl-9 bg-white" />
              </div>
              <Button variant={mostrarFiltros ? "default" : "outline"} onClick={() => setMostrarFiltros(!mostrarFiltros)} className={`gap-2 ${mostrarFiltros ? (isPagar ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white') : 'bg-white text-slate-600 border-slate-300'}`}>
                  <Filter className="w-4 h-4"/> Filtros
              </Button>
              {temFiltroAtivo && !mostrarFiltros && (
                  <Button variant="ghost" onClick={limparFiltros} className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2" title="Limpar Filtros"><X className="w-4 h-4"/></Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportarExcel} disabled={exportando} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2"><TableIcon className="w-4 h-4"/> Excel</Button>
              <Button variant="outline" onClick={exportarPDF} disabled={exportando} className="border-rose-200 text-rose-700 hover:bg-rose-50 gap-2"><FileText className="w-4 h-4"/> PDF</Button>
              <Button onClick={abrirNovoLancamento} className={`${isPagar ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white gap-2 shadow-sm`}>
                <Plus className="w-4 h-4" /> Novo Lançamento
              </Button>
            </div>
          </div>

          {/* PAINEL DE FILTROS */}
          {mostrarFiltros && (
              <div className={`p-5 border-b grid grid-cols-1 md:grid-cols-4 gap-5 relative z-30 ${isPagar ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                  <div className="col-span-full flex justify-between items-center"><h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Filter className="w-4 h-4"/> Filtros Avançados</h4><Button variant="ghost" size="sm" onClick={limparFiltros} className="text-red-500 h-8 px-2 text-xs">Limpar Filtros</Button></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Vencimento Início</label><Input type="date" value={filtroVencInicio} onChange={e=>setFiltroVencInicio(e.target.value)} className="bg-white h-9" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Vencimento Fim</label><Input type="date" value={filtroVencFim} onChange={e=>setFiltroVencFim(e.target.value)} className="bg-white h-9" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Status</label><Select value={filtroStatus} onValueChange={setFiltroStatus}><SelectTrigger className="bg-white h-9"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[9999]"><SelectItem value="todos">Todos</SelectItem><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Atrasado">Atrasado</SelectItem><SelectItem value="Pago">Pago/Recebido</SelectItem></SelectContent></Select></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Centro de Custo</label><Select value={filtroCentroCusto} onValueChange={setFiltroCentroCusto}><SelectTrigger className="bg-white h-9"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[9999]"><SelectItem value="todos">Todos</SelectItem>{centrosDeCusto.map((cc:any) => <SelectItem key={cc} value={cc}>{cc}</SelectItem>)}</SelectContent></Select></div>
                  
                  {isPagar && (
                    <div className="space-y-1 md:col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Fornecedor</label><Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}><SelectTrigger className="bg-white h-9"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[9999]"><SelectItem value="todos">Todos</SelectItem><SelectItem value="nenhum">Sem Fornecedor</SelectItem>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</SelectItem>)}</SelectContent></Select></div>
                  )}
                  {!isPagar && (
                    <div className="space-y-1 md:col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Nome do Cliente</label><Input value={filtroCliente} onChange={e=>setFiltroCliente(e.target.value)} placeholder="Digite parte do nome..." className="bg-white h-9" /></div>
                  )}
                  <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Valor Mínimo (R$)</label><Input type="number" step="0.01" value={filtroValorMin} onChange={e=>setFiltroValorMin(e.target.value)} className="bg-white h-9" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Valor Máximo (R$)</label><Input type="number" step="0.01" value={filtroValorMax} onChange={e=>setFiltroValorMax(e.target.value)} className="bg-white h-9" /></div>
              </div>
          )}

          {/* FORMULÁRIO MANUAL */}
          {mostrarForm && (
            <div className={`p-6 border-b space-y-4 relative z-20 ${isPagar ? 'bg-rose-50' : 'bg-emerald-50'} shadow-inner`}>
              <div className="flex justify-between items-center mb-4"><h3 className="font-bold flex items-center gap-2">{editandoLancamentoId ? <Edit className="w-5 h-5"/> : <DollarSign className="w-5 h-5"/>} {editandoLancamentoId ? 'Editar Lançamento' : 'Novo Lançamento Manual'}</h3><Button variant="ghost" onClick={limparFormulario}><X className="w-5 h-5"/></Button></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Descrição *</label><Input value={descricao} onChange={e => setDescricao(e.target.value)} className="bg-white" /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Valor *</label><Input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="bg-white" /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Vencimento *</label><Input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} className="bg-white" /></div>
                {isPagar && (
                  <div className="md:col-span-2 space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Fornecedor</label><Select value={fornecedorId} onValueChange={setFornecedorId}><SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..."/></SelectTrigger><SelectContent className="bg-white z-[9999]"><SelectItem value="nenhum">Avulso</SelectItem>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome_fantasia}</SelectItem>)}</SelectContent></Select></div>
                )}
                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Categoria *</label><Select value={categoriaId} onValueChange={setCategoriaId}><SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..."/></SelectTrigger><SelectContent className="bg-white z-[9999]">{categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Conta Bancária *</label><Select value={contaId} onValueChange={setContaId}><SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..."/></SelectTrigger><SelectContent className="bg-white z-[9999]">{contasBancarias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-4"><Button variant="outline" onClick={limparFormulario}>Cancelar</Button><Button onClick={salvarLancamento} className={isPagar ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}>{editandoLancamentoId ? 'Atualizar' : 'Salvar'}</Button></div>
            </div>
          )}

          {/* TABELA (Com a nova ordem solicitada) */}
          <div className="overflow-x-auto min-h-[400px] relative z-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider">
                  <th className="p-4 font-semibold border-b cursor-pointer hover:bg-slate-200 transition-colors group whitespace-nowrap" onClick={() => handleSort('emissao')}>
                      Emissão {renderSortIcon('emissao')}
                  </th>
                  <th className="p-4 font-semibold border-b min-w-[200px] cursor-pointer hover:bg-slate-200 transition-colors group" onClick={() => handleSort('fornecedor')}>
                      Fornecedor / Cliente {renderSortIcon('fornecedor')}
                  </th>
                  <th className="p-4 font-semibold border-b cursor-pointer hover:bg-slate-200 transition-colors group" onClick={() => handleSort('documento')}>
                      Documento {renderSortIcon('documento')}
                  </th>
                  <th className="p-4 font-semibold border-b cursor-pointer hover:bg-slate-200 transition-colors group whitespace-nowrap" onClick={() => handleSort('vencimento')}>
                      Vencimento {renderSortIcon('vencimento')}
                  </th>
                  <th className="p-4 font-semibold border-b cursor-pointer hover:bg-slate-200 transition-colors group whitespace-nowrap" onClick={() => handleSort('pagamento')}>
                      Pagamento {renderSortIcon('pagamento')}
                  </th>
                  <th className="p-4 font-semibold border-b text-center cursor-pointer hover:bg-slate-200 transition-colors group" onClick={() => handleSort('status')}>
                      Status {renderSortIcon('status')}
                  </th>
                  <th className="p-4 font-semibold border-b text-right cursor-pointer hover:bg-slate-200 transition-colors group" onClick={() => handleSort('valor')}>
                      Valor {renderSortIcon('valor')}
                  </th>
                  <th className="p-4 font-semibold border-b cursor-pointer hover:bg-slate-200 transition-colors group" onClick={() => handleSort('classificacao')}>
                      Classificação {renderSortIcon('classificacao')}
                  </th>
                  <th className="p-4 font-semibold border-b min-w-[200px] cursor-pointer hover:bg-slate-200 transition-colors group" onClick={() => handleSort('descricao')}>
                      Descrição {renderSortIcon('descricao')}
                  </th>
                  <th className="p-4 font-semibold border-b text-center w-24">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lancamentosFiltrados.map(lanc => {
                  const statusAtual = getComputedStatus(lanc);
                  const isAtrasado = statusAtual === 'Atrasado';
                  
                  return (
                    <tr key={lanc.id} className="hover:bg-slate-50 transition-colors group">
                      
                      {/* 1. Emissão */}
                      <td className="p-4 text-sm align-top whitespace-nowrap text-slate-500">
                        {lanc.data_emissao ? new Date(lanc.data_emissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '--'}
                      </td>

                      {/* 2. Fornecedor / Cliente */}
                      <td className="p-4 align-top">
                        <p className="text-sm font-bold text-slate-700">
                            {isPagar ? (lanc.log_fornecedores?.nome_fantasia || '--') : '--'}
                        </p>
                      </td>

                      {/* 3. Documento */}
                      <td className="p-4 align-top whitespace-nowrap">
                        {lanc.documento_origem ? (
                            <span className="text-[11px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold flex items-center w-fit gap-1"><FileText className="w-3 h-3"/> {lanc.documento_origem}</span>
                        ) : '--'}
                      </td>

                      {/* 4. Vencimento */}
                      <td className="p-4 text-sm font-medium align-top whitespace-nowrap">
                        <span className={`flex items-center gap-1.5 ${isAtrasado ? 'text-rose-600 font-bold' : 'text-slate-700 font-bold'}`}>
                          <Calendar className="w-4 h-4"/> {new Date(lanc.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </span>
                        {isAtrasado && <span className="text-[10px] text-rose-500 uppercase mt-0.5 block ml-5">Vencido</span>}
                      </td>

                      {/* 5. Pagamento */}
                      <td className="p-4 text-sm align-top whitespace-nowrap">
                        {lanc.data_pagamento ? (
                            <span className="text-emerald-700 font-bold">{new Date(lanc.data_pagamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                        ) : '--'}
                      </td>

                      {/* 6. Status */}
                      <td className="p-4 text-center align-top">
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${statusAtual === 'Pago' ? 'bg-emerald-100 text-emerald-700' : isAtrasado ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                          {statusAtual}
                        </span>
                      </td>
                      
                      {/* 7. Valor */}
                      <td className="p-4 text-right align-top whitespace-nowrap">
                        <p className={`font-bold text-base ${isPagar ? 'text-rose-600' : 'text-emerald-600'}`}>
                            R$ {Number(lanc.valor).toFixed(2).replace('.', ',')}
                        </p>
                      </td>

                      {/* 8. Classificação */}
                      <td className="p-4 align-top">
                        <p className="text-xs font-semibold text-slate-700 mb-1">{lanc.fin_categorias?.nome || 'Sem Categoria'}</p>
                        <p className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-block mb-1 border">C.C: {lanc.centro_custo || 'Geral'}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1"><CreditCard className="w-3 h-3"/> {lanc.forma_pagamento || 'Boleto'}</p>
                      </td>

                      {/* 9. Descrição */}
                      <td className="p-4 align-top">
                        <p className="text-sm text-slate-800 leading-tight">{lanc.descricao}</p>
                      </td>
                      
                      {/* 10. Ação */}
                      <td className="p-4 text-center align-top">
                        {lanc.status === 'Pendente' ? (
                          <div className="space-y-2">
                            <Button size="sm" onClick={() => darBaixa(lanc.id)} className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-[10px] h-7">Baixar</Button>
                            <div className="flex justify-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => abrirEditarLancamento(lanc)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit className="w-3.5 h-3.5"/></button>
                              <button onClick={() => deletarLancamento(lanc.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                            </div>
                          </div>
                        ) : (
                            <div className="flex justify-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                              <button onClick={() => abrirEditarLancamento(lanc)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit className="w-3.5 h-3.5"/></button>
                              <button onClick={() => deletarLancamento(lanc.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                            </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}