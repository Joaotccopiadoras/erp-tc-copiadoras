import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Wallet, ArrowDownCircle, ArrowUpCircle, DollarSign, Calendar, Search, 
  Plus, CheckCircle2, Clock, Landmark, FileText, Building2, CreditCard, 
  Edit, Trash2, Filter, X, Table as TableIcon, ArrowUp, ArrowDown, PackageSearch,
  UploadCloud, AlertTriangle, Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";

type OfxTransaction = {
  id: string; tipo: "Despesa" | "Receita"; data: string; valor: number;
  descricao: string; documento: string; conciliado: boolean;
};

export default function Financeiro() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<"dashboard" | "pagar" | "receber" | "conciliacao">("pagar");
  
  // Estados do Banco de Dados
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [transacoesBD, setTransacoesBD] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  
  // Novas Tabelas Auxiliares
  const [centrosCustoBD, setCentrosCustoBD] = useState<any[]>([]);
  const [segmentosBD, setSegmentosBD] = useState<any[]>([]);
  const [formasPagamentoBD, setFormasPagamentoBD] = useState<any[]>([]);

  const [busca, setBusca] = useState("");

  // Estados de UI
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoLancamentoId, setEditandoLancamentoId] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Estados do Formulário
  const [descricao, setDescricao] = useState("");
  const [valorBruto, setValorBruto] = useState("");
  const [valorJuros, setValorJuros] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [fornecedorId, setFornecedorId] = useState("nenhum");
  const [transacaoId, setTransacaoId] = useState(""); // Antiga Categoria
  const [contaId, setContaId] = useState("");
  const [centroCusto, setCentroCusto] = useState(""); // Agora pega do BD
  const [segmentoNegocio, setSegmentoNegocio] = useState(""); // Novo
  const [formaPagamento, setFormaPagamento] = useState(""); // Agora pega do BD
  const [documentoOrigem, setDocumentoOrigem] = useState("");

  // Calculado dinamicamente
  const valorTotal = (parseFloat(valorBruto || "0") + parseFloat(valorJuros || "0")).toFixed(2);

  // Estados de Filtros Avançados
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroEmiInicio, setFiltroEmiInicio] = useState("");
  const [filtroEmiFim, setFiltroEmiFim] = useState("");
  const [filtroVencInicio, setFiltroVencInicio] = useState("");
  const [filtroVencFim, setFiltroVencFim] = useState("");
  const [filtroPagInicio, setFiltroPagInicio] = useState("");
  const [filtroPagFim, setFiltroPagFim] = useState("");
  
  const [filtroTransacao, setFiltroTransacao] = useState("todos");
  const [filtroSegmento, setFiltroSegmento] = useState("todos");
  const [filtroCentroCusto, setFiltroCentroCusto] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroFornecedor, setFiltroFornecedor] = useState("todos");
  
  const [filtroValorMin, setFiltroValorMin] = useState("");
  const [filtroValorMax, setFiltroValorMax] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");

  // Estados da Conciliação (OFX)
  const ofxInputRef = useRef<HTMLInputElement>(null);
  const [ofxTransactions, setOfxTransactions] = useState<OfxTransaction[]>([]);
  const [contaConciliacaoId, setContaConciliacaoId] = useState("");

  const isPagar = abaAtiva === "pagar";

  // ==========================================
  // AUTO-SAVE BLINDADO
  // ==========================================
  useEffect(() => {
    const rascunho = sessionStorage.getItem("financeiro_rascunho_v7");
    if (rascunho) {
      try {
        const draft = JSON.parse(rascunho);
        if (draft.abaAtiva) setAbaAtiva(draft.abaAtiva);
        if (draft.mostrarForm !== undefined) setMostrarForm(draft.mostrarForm);
        if (draft.editandoLancamentoId !== undefined) setEditandoLancamentoId(draft.editandoLancamentoId);
        
        setDescricao(draft.descricao || ""); setValorBruto(draft.valorBruto || ""); setValorJuros(draft.valorJuros || "");
        setDataEmissao(draft.dataEmissao || ""); setDataVencimento(draft.dataVencimento || "");
        setFornecedorId(draft.fornecedorId || "nenhum"); setTransacaoId(draft.transacaoId || "");
        setContaId(draft.contaId || ""); setCentroCusto(draft.centroCusto || "");
        setSegmentoNegocio(draft.segmentoNegocio || ""); setFormaPagamento(draft.formaPagamento || ""); 
        setDocumentoOrigem(draft.documentoOrigem || "");
        
        setMostrarFiltros(draft.mostrarFiltros || false);
        if (draft.sortConfig !== undefined) setSortConfig(draft.sortConfig);
        if (draft.ofxTransactions) setOfxTransactions(draft.ofxTransactions);
        if (draft.contaConciliacaoId) setContaConciliacaoId(draft.contaConciliacaoId);
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    const draft = { 
      abaAtiva, mostrarForm, editandoLancamentoId, descricao, valorBruto, valorJuros, dataEmissao, dataVencimento, 
      fornecedorId, transacaoId, contaId, centroCusto, segmentoNegocio, formaPagamento, documentoOrigem, 
      mostrarFiltros, sortConfig, ofxTransactions, contaConciliacaoId
    };
    sessionStorage.setItem("financeiro_rascunho_v7", JSON.stringify(draft));
  }, [abaAtiva, mostrarForm, editandoLancamentoId, descricao, valorBruto, valorJuros, dataEmissao, dataVencimento, fornecedorId, transacaoId, contaId, centroCusto, segmentoNegocio, formaPagamento, documentoOrigem, mostrarFiltros, sortConfig, ofxTransactions, contaConciliacaoId]);

  useEffect(() => {
    fetchDadosBase();
    fetchLancamentos();
  }, [abaAtiva]);

  const fetchDadosBase = async () => {
    const tipoFiltro = abaAtiva === 'conciliacao' ? null : (isPagar ? 'Despesa' : 'Receita');
    let catsQuery = supabase.from('fin_categorias').select('*'); // Transações Financeiras (Categorias no BD)
    if (tipoFiltro) catsQuery = catsQuery.eq('tipo', tipoFiltro);

    const [contas, transacoes, forns, centros, segmentos, formas] = await Promise.all([
      supabase.from('fin_contas_bancarias').select('*').order('nome'),
      catsQuery.order('nome'),
      supabase.from('log_fornecedores').select('id, razao_social, nome_fantasia').order('nome_fantasia'),
      supabase.from('fin_centros_custo').select('*').order('nome'),
      supabase.from('fin_segmentos_negocio').select('*').order('nome'),
      supabase.from('fin_formas_pagamento').select('*').order('nome')
    ]);

    if (contas.data) {
        setContasBancarias(contas.data);
        if (contas.data.length > 0 && !contaId) setContaId(contas.data[0].id);
        if (contas.data.length > 0 && !contaConciliacaoId) setContaConciliacaoId(contas.data[0].id);
    }
    if (transacoes.data) setTransacoesBD(transacoes.data);
    if (forns.data) setFornecedores(forns.data);
    if (centros.data) setCentrosCustoBD(centros.data);
    if (segmentos.data) setSegmentosBD(segmentos.data);
    if (formas.data) setFormasPagamentoBD(formas.data);
  };

  const fetchLancamentos = async () => {
    let query = supabase.from('fin_lancamentos').select(`*, log_fornecedores(nome_fantasia), fin_categorias(nome)`).order('data_vencimento', { ascending: true });
    if (abaAtiva !== 'conciliacao') query = query.eq('tipo', isPagar ? 'Despesa' : 'Receita');
    const { data } = await query;
    if (data) setLancamentos(data);
  };

  const limparFormulario = () => {
    setMostrarForm(false); setEditandoLancamentoId(null);
    setDescricao(""); setValorBruto(""); setValorJuros(""); setDataVencimento(""); setDataEmissao(""); setDocumentoOrigem("");
    setFornecedorId("nenhum"); setCentroCusto(""); setSegmentoNegocio(""); setFormaPagamento(""); setTransacaoId("");
  };

  const limparFiltros = () => {
    setFiltroVencInicio(""); setFiltroVencFim(""); setFiltroEmiInicio(""); setFiltroEmiFim(""); setFiltroPagInicio(""); setFiltroPagFim(""); 
    setFiltroCentroCusto("todos"); setFiltroSegmento("todos"); setFiltroTransacao("todos"); setFiltroFornecedor("todos"); 
    setFiltroCliente(""); setFiltroStatus("todos"); setFiltroValorMin(""); setFiltroValorMax(""); setBusca("");
    setSortConfig(null);
  };

  // --- AÇÕES DO FORMULÁRIO GERAL ---
  const abrirNovoLancamento = () => { limparFormulario(); setMostrarForm(true); };

  const abrirEditarLancamento = (lanc: any) => {
    setEditandoLancamentoId(lanc.id);
    setDescricao(lanc.descricao || "");
    setValorBruto(lanc.valor_bruto?.toString() || lanc.valor?.toString() || "");
    setValorJuros(lanc.valor_juros?.toString() || "0");
    setDataEmissao(lanc.data_emissao || "");
    setDataVencimento(lanc.data_vencimento || "");
    setFornecedorId(lanc.fornecedor_id || "nenhum");
    setTransacaoId(lanc.categoria_id || "");
    setContaId(lanc.conta_bancaria_id || (contasBancarias.length > 0 ? contasBancarias[0].id : ""));
    setCentroCusto(lanc.centro_custo || "");
    setSegmentoNegocio(lanc.segmento_negocio || "");
    setFormaPagamento(lanc.forma_pagamento || "");
    setDocumentoOrigem(lanc.documento_origem || "");
    setMostrarForm(true);
  };

  const salvarLancamento = async () => {
    if (!descricao || !valorBruto || !dataVencimento || !transacaoId || !contaId) return alert("Preencha os campos obrigatórios (marcados com *).");
    
    const vBrutoNum = parseFloat(valorBruto) || 0;
    const vJurosNum = parseFloat(valorJuros) || 0;
    const tipoLancamento = abaAtiva === 'conciliacao' ? (vBrutoNum < 0 ? 'Despesa' : 'Receita') : (isPagar ? 'Despesa' : 'Receita');
    const valorRealFinal = Math.abs(vBrutoNum) + Math.abs(vJurosNum);

    const payload = {
      tipo: tipoLancamento, descricao, valor: valorRealFinal, valor_bruto: Math.abs(vBrutoNum), valor_juros: Math.abs(vJurosNum),
      data_emissao: dataEmissao || null, data_vencimento: dataVencimento,
      categoria_id: transacaoId, conta_bancaria_id: contaId,
      fornecedor_id: (tipoLancamento === 'Despesa' && fornecedorId !== "nenhum") ? fornecedorId : null,
      centro_custo: centroCusto, segmento_negocio: segmentoNegocio, forma_pagamento: formaPagamento, documento_origem: documentoOrigem
    };
    
    const statusFinal = abaAtiva === 'conciliacao' ? 'Pago' : 'Pendente';
    const dataPag = abaAtiva === 'conciliacao' ? dataVencimento : null;

    const finalPayload = editandoLancamentoId ? payload : { ...payload, status: statusFinal, data_pagamento: dataPag };

    const { error } = editandoLancamentoId 
        ? await supabase.from('fin_lancamentos').update(finalPayload).eq('id', editandoLancamentoId) 
        : await supabase.from('fin_lancamentos').insert([finalPayload]);
        
    if (!error) { 
        alert("Lançamento Registrado!"); limparFormulario(); fetchLancamentos(); 
    } else alert(error.message);
  };

  const deletarLancamento = async (id: string) => {
    if (!confirm("Excluir definitivamente?")) return;
    await supabase.from('fin_lancamentos').delete().eq('id', id); fetchLancamentos();
  };

  const darBaixa = async (id: string, dataPagamento: string = new Date().toISOString().split('T')[0]) => {
    if (abaAtiva !== 'conciliacao' && !confirm(`Confirmar baixa do título?`)) return;
    await supabase.from('fin_lancamentos').update({ status: 'Pago', data_pagamento: dataPagamento }).eq('id', id);
    fetchLancamentos();
  };

  const irParaLogistica = (documentoOrigem: string) => {
      try { sessionStorage.setItem("entradasprodutos_rascunho", JSON.stringify({ abaAtiva: "historico", busca: documentoOrigem })); } catch (e) {}
      navigate(`/entradasprodutos?busca=${encodeURIComponent(documentoOrigem)}`);
  };

  // ==========================================
  // MOTOR DE CONCILIAÇÃO BANCÁRIA (OFX PARSER)
  // ==========================================
  const handleOfxUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        const transactions: OfxTransaction[] = [];
        const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
        let match;
        
        while ((match = trnRegex.exec(text)) !== null) {
            const block = match[1];
            const typeMatch = block.match(/<TRNTYPE>(.*?)(?:\r|\n|<)/);
            const dateMatch = block.match(/<DTPOSTED>(.*?)(?:\r|\n|<)/);
            const amtMatch = block.match(/<TRNAMT>(.*?)(?:\r|\n|<)/);
            const memoMatch = block.match(/<MEMO>(.*?)(?:\r|\n|<)/);
            const chkMatch = block.match(/<CHKNUM>(.*?)(?:\r|\n|<)/);
            const fitidMatch = block.match(/<FITID>(.*?)(?:\r|\n|<)/);

            if (amtMatch && dateMatch) {
                const amount = parseFloat(amtMatch[1]);
                const dateRaw = dateMatch[1].substring(0, 8); // YYYYMMDD
                const dateFormatted = `${dateRaw.substring(0,4)}-${dateRaw.substring(4,6)}-${dateRaw.substring(6,8)}`;
                
                transactions.push({
                    id: fitidMatch ? fitidMatch[1] : Math.random().toString(),
                    tipo: amount < 0 ? 'Despesa' : 'Receita',
                    data: dateFormatted,
                    valor: Math.abs(amount),
                    descricao: memoMatch ? memoMatch[1] : 'Transação Bancária',
                    documento: chkMatch ? chkMatch[1] : '',
                    conciliado: false
                });
            }
        }
        if (transactions.length > 0) { setOfxTransactions(transactions); setAbaAtiva("conciliacao"); } 
        else alert("Nenhuma transação financeira válida encontrada neste arquivo OFX.");
    };
    reader.readAsText(file);
    if (ofxInputRef.current) ofxInputRef.current.value = "";
  };

  const sugerirCorrespondencia = (ofxTx: OfxTransaction) => {
      const candidatos = lancamentos.filter(l => l.status === 'Pendente' && l.tipo === ofxTx.tipo && Math.abs(Number(l.valor) - ofxTx.valor) < 0.05);
      if (candidatos.length === 0) return null;
      candidatos.sort((a, b) => Math.abs(new Date(a.data_vencimento).getTime() - new Date(ofxTx.data).getTime()) - Math.abs(new Date(b.data_vencimento).getTime() - new Date(ofxTx.data).getTime()));
      return candidatos[0]; 
  };

  const confirmarConciliacao = async (ofxTx: OfxTransaction, lancamentoId: string) => {
      await darBaixa(lancamentoId, ofxTx.data);
      setOfxTransactions(prev => prev.map(tx => tx.id === ofxTx.id ? { ...tx, conciliado: true } : tx));
  };

  const criarLancamentoDoOfx = (ofxTx: OfxTransaction) => {
      setDescricao(ofxTx.descricao);
      setValorBruto((ofxTx.tipo === 'Despesa' ? -ofxTx.valor : ofxTx.valor).toString());
      setValorJuros("0");
      setDataVencimento(ofxTx.data); setDataEmissao(ofxTx.data); setDocumentoOrigem(ofxTx.documento);
      setContaId(contaConciliacaoId);
      
      // Auto-seleciona "Transferência" se existir no BD
      const transfOpt = formasPagamentoBD.find(f => f.nome.toLowerCase().includes("transferência"));
      if (transfOpt) setFormaPagamento(transfOpt.nome);
      
      setMostrarForm(true); window.scrollTo(0, 0); 
  };


  // ==========================================
  // MOTOR DE FILTROS E ORDENAÇÃO GERAL
  // ==========================================
  const getComputedStatus = (lanc: any) => {
    if (lanc.status === 'Pago') return 'Pago';
    const isAtrasado = new Date(lanc.data_vencimento) < new Date(new Date().setHours(0,0,0,0));
    return isAtrasado ? 'Atrasado' : 'Pendente';
  };

  let lancamentosFiltrados = lancamentos.filter(l => {
    if (abaAtiva === 'conciliacao') return false; 
    
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
    if (filtroSegmento !== "todos" && l.segmento_negocio !== filtroSegmento) return false;
    if (filtroTransacao !== "todos" && l.categoria_id !== filtroTransacao) return false;

    if (isPagar && filtroFornecedor !== "todos" && l.fornecedor_id !== filtroFornecedor) return false;
    if (!isPagar && filtroCliente && !(l.descricao||"").toLowerCase().includes(filtroCliente.toLowerCase())) return false;
    
    if (filtroValorMin && Number(l.valor) < Number(filtroValorMin)) return false;
    if (filtroValorMax && Number(l.valor) > Number(filtroValorMax)) return false;
    
    const statusReal = getComputedStatus(l);
    if (filtroStatus !== "todos" && statusReal !== filtroStatus) return false;
    
    return true;
  });

  if (sortConfig !== null && abaAtiva !== 'conciliacao') {
    lancamentosFiltrados.sort((a, b) => {
      let valA: any = ""; let valB: any = "";
      switch (sortConfig.key) {
        case 'emissao': valA = a.data_emissao ? new Date(a.data_emissao).getTime() : 0; valB = b.data_emissao ? new Date(b.data_emissao).getTime() : 0; break;
        case 'fornecedor': valA = (a.log_fornecedores?.nome_fantasia || "").toLowerCase(); valB = (b.log_fornecedores?.nome_fantasia || "").toLowerCase(); break;
        case 'documento': valA = (a.documento_origem || "").toLowerCase(); valB = (b.documento_origem || "").toLowerCase(); break;
        case 'vencimento': valA = new Date(a.data_vencimento).getTime(); valB = new Date(b.data_vencimento).getTime(); break;
        case 'pagamento': valA = a.data_pagamento ? new Date(a.data_pagamento).getTime() : 0; valB = b.data_pagamento ? new Date(b.data_pagamento).getTime() : 0; break;
        case 'status': valA = getComputedStatus(a); valB = getComputedStatus(b); break;
        case 'valor': valA = Number(a.valor); valB = Number(b.valor); break;
        case 'transacao': valA = (a.fin_categorias?.nome || "").toLowerCase(); valB = (b.fin_categorias?.nome || "").toLowerCase(); break;
        case 'descricao': valA = (a.descricao || "").toLowerCase(); valB = (b.descricao || "").toLowerCase(); break;
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev && prev.key === key) return prev.direction === 'asc' ? { key, direction: 'desc' } : null; 
      return { key, direction: 'asc' };
    });
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key === key) return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 inline ml-1 text-slate-600" /> : <ArrowDown className="w-3 h-3 inline ml-1 text-slate-600" />;
    return <ArrowDown className="w-3 h-3 inline ml-1 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
  };

  const totalPendente = lancamentosFiltrados.filter(l => l.status === 'Pendente').reduce((acc, l) => acc + Number(l.valor), 0);
  const totalPago = lancamentosFiltrados.filter(l => l.status === 'Pago').reduce((acc, l) => acc + Number(l.valor), 0);
  
  const temFiltroAtivo = filtroVencInicio || filtroVencFim || filtroEmiInicio || filtroEmiFim || filtroPagInicio || filtroPagFim || filtroCentroCusto !== "todos" || filtroSegmento !== "todos" || filtroTransacao !== "todos" || filtroFornecedor !== "todos" || filtroCliente || filtroStatus !== "todos" || filtroValorMin || filtroValorMax || busca;

  // ==========================================
  // FUNÇÕES DE EXPORTAÇÃO
  // ==========================================
  const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
    try {
      const res = await fetch(imageUrl); if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.onerror = () => resolve(null); reader.readAsDataURL(blob);
      });
    } catch (e) { return null; }
  };

  const getSortLabel = (key: string) => {
    const labels: any = { 'emissao': 'Data de Emissão', 'fornecedor': isPagar ? 'Fornecedor' : 'Cliente', 'documento': 'Documento', 'vencimento': 'Data de Vencimento', 'pagamento': 'Data de Pagamento', 'status': 'Status', 'valor': 'Valor Total', 'transacao': 'Transação Financeira', 'descricao': 'Descrição' };
    return labels[key] || 'Grupo';
  };

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const doc = new jsPDF("landscape");
      const logo = await getBase64ImageFromUrl("/logo.png");
      const tituloRelatorio = isPagar ? "Relatório de Contas a Pagar" : "Relatório de Contas a Receber";
      
      if (logo) doc.addImage(logo, "PNG", 14, 10, 40, 15);
      doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text(tituloRelatorio, 280, 20, { align: "right" });
      doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 280, 26, { align: "right" });

      const tableColumn = ["Emissão", "Fornecedor / Cliente", "Documento", "Vencimento", "Pagamento", "Status", "Valor Total", "Transação / C. Custo", "Segmento / Negócio"];
      const tableRows: any[] = [];
      let currentGroupValue: string | null = null;
      let currentGroupSubtotal = 0;

      lancamentosFiltrados.forEach(l => {
        if (sortConfig) {
            let rowGroupValue = "";
            switch (sortConfig.key) {
                case 'emissao': rowGroupValue = l.data_emissao ? new Date(l.data_emissao).toLocaleDateString('pt-BR', {timeZone:'UTC'}) : 'Sem Emissão'; break;
                case 'fornecedor': rowGroupValue = l.log_fornecedores?.nome_fantasia || 'Avulso / Sem Fornecedor'; break;
                case 'documento': rowGroupValue = l.documento_origem || 'Sem Documento'; break;
                case 'vencimento': rowGroupValue = new Date(l.data_vencimento).toLocaleDateString('pt-BR', {timeZone:'UTC'}); break;
                case 'pagamento': rowGroupValue = l.data_pagamento ? new Date(l.data_pagamento).toLocaleDateString('pt-BR', {timeZone:'UTC'}) : 'Pendente'; break;
                case 'status': rowGroupValue = getComputedStatus(l).toUpperCase(); break;
                case 'valor': rowGroupValue = `R$ ${Number(l.valor).toFixed(2).replace('.',',')}`; break;
                case 'transacao': rowGroupValue = l.fin_categorias?.nome || 'Sem Categoria'; break;
                case 'descricao': rowGroupValue = l.descricao || 'Sem Descrição'; break;
            }

            if (rowGroupValue !== currentGroupValue) {
                if (currentGroupValue !== null) {
                    tableRows.push([
                        { content: `SUBTOTAL:`, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
                        { content: `R$ ${currentGroupSubtotal.toFixed(2).replace('.',',')}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
                        { content: '', colSpan: 2, styles: { fillColor: [241, 245, 249] } }
                    ]);
                }
                tableRows.push([{ content: `${getSortLabel(sortConfig.key).toUpperCase()}: ${rowGroupValue}`, colSpan: 9, styles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'left' } }]);
                currentGroupValue = rowGroupValue; currentGroupSubtotal = 0; 
            }
        }

        if (sortConfig) currentGroupSubtotal += Number(l.valor) || 0;

        tableRows.push([
          l.data_emissao ? new Date(l.data_emissao).toLocaleDateString('pt-BR', {timeZone:'UTC'}) : '-',
          l.log_fornecedores?.nome_fantasia || '-', l.documento_origem || '-',
          new Date(l.data_vencimento).toLocaleDateString('pt-BR', {timeZone:'UTC'}),
          l.data_pagamento ? new Date(l.data_pagamento).toLocaleDateString('pt-BR', {timeZone:'UTC'}) : '-',
          getComputedStatus(l).toUpperCase(),
          `R$ ${Number(l.valor).toFixed(2).replace('.',',')}`,
          `${l.fin_categorias?.nome || '-'}\nC.C: ${l.centro_custo || 'Geral'}`,
          `${l.segmento_negocio || '-'}`
        ]);
      });

      if (sortConfig && currentGroupValue !== null) {
          tableRows.push([
              { content: `SUBTOTAL:`, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
              { content: `R$ ${currentGroupSubtotal.toFixed(2).replace('.',',')}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
              { content: '', colSpan: 2, styles: { fillColor: [241, 245, 249] } }
          ]);
      }

      autoTable(doc, { head: [tableColumn], body: tableRows, startY: 35, theme: 'grid', styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }, columnStyles: { 1: { cellWidth: 35 }, 7: { cellWidth: 35 }, 8: { cellWidth: 40 } }, headStyles: { fillColor: isPagar ? [190, 18, 60] : [5, 150, 105], textColor: 255 } });
      const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY : 35;
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
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
      
      worksheet.columns = [
        { header: "Data de Emissão", key: "emissao", width: 15 }, { header: "Fornecedor / Cliente", key: "ent", width: 30 },
        { header: "Documento", key: "doc", width: 15 }, { header: "Vencimento", key: "venc", width: 15 },
        { header: "Data de Pagamento", key: "pag", width: 15 }, { header: "Status", key: "status", width: 15 },
        { header: "Valor Bruto (R$)", key: "vBruto", width: 15 }, { header: "Juros/Multa (R$)", key: "vJuros", width: 15 },
        { header: "Valor Total (R$)", key: "valor", width: 15 }, { header: "Transação", key: "transacao", width: 25 },
        { header: "Centro de Custo", key: "cc", width: 20 }, { header: "Segmento de Negócio", key: "seg", width: 20 },
        { header: "Descrição", key: "desc", width: 40 }
      ];

      lancamentosFiltrados.forEach(l => {
        worksheet.addRow({
          emissao: l.data_emissao ? new Date(l.data_emissao).toLocaleDateString('pt-BR', {timeZone:'UTC'}) : '-',
          ent: l.log_fornecedores?.nome_fantasia || '-', doc: l.documento_origem || '-',
          venc: new Date(l.data_vencimento).toLocaleDateString('pt-BR', {timeZone:'UTC'}),
          pag: l.data_pagamento ? new Date(l.data_pagamento).toLocaleDateString('pt-BR', {timeZone:'UTC'}) : '-',
          status: getComputedStatus(l).toUpperCase(), 
          vBruto: Number(l.valor_bruto || 0), vJuros: Number(l.valor_juros || 0), valor: Number(l.valor),
          transacao: l.fin_categorias?.nome || '-', cc: l.centro_custo || 'Geral', seg: l.segmento_negocio || '-', desc: l.descricao
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
        <input type="file" accept=".ofx" ref={ofxInputRef} className="hidden" onChange={handleOfxUpload} />

        {/* CABEÇALHO DINÂMICO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <Wallet className="w-6 h-6 text-emerald-600" /> Gestão Financeira
            </h1>
            <p className="text-slate-500">Controle de Contas a Pagar, Receber, Fluxo de Caixa e Conciliação.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => { setAbaAtiva("pagar"); limparFormulario(); }} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "pagar" ? "bg-white shadow-sm text-rose-700" : "text-slate-600 hover:text-slate-900"}`}><ArrowDownCircle className="w-4 h-4"/> Contas a Pagar</button>
            <button onClick={() => { setAbaAtiva("receber"); limparFormulario(); }} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "receber" ? "bg-white shadow-sm text-emerald-700" : "text-slate-600 hover:text-slate-900"}`}><ArrowUpCircle className="w-4 h-4"/> Contas a Receber</button>
            <button onClick={() => { if(ofxTransactions.length>0) setAbaAtiva("conciliacao"); else ofxInputRef.current?.click(); }} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "conciliacao" ? "bg-indigo-600 shadow-sm text-white" : "text-slate-600 hover:text-slate-900"}`}>
                <UploadCloud className="w-4 h-4"/> {ofxTransactions.length > 0 ? "Continuar Conciliação" : "Importar OFX"}
            </button>
          </div>
        </div>

        {/* ABA DE CONCILIAÇÃO OFX */}
        {abaAtiva === "conciliacao" && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between gap-4 items-center">
                    <div>
                        <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Conciliação Bancária Ativa</h2>
                        <p className="text-sm text-indigo-700 mt-1">O sistema leu {ofxTransactions.length} transações do extrato e tentou combiná-las com seus registros pendentes no ERP.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="space-y-1 text-right">
                            <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Conta a movimentar</label>
                            <Select value={contaConciliacaoId} onValueChange={setContaConciliacaoId}>
                                <SelectTrigger className="w-64 bg-white border-indigo-200 shadow-sm"><SelectValue placeholder="Selecione a conta..."/></SelectTrigger>
                                <SelectContent className="bg-white z-[9999]">{contasBancarias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <Button variant="outline" className="border-indigo-300 text-indigo-700 bg-white" onClick={() => { setOfxTransactions([]); setAbaAtiva("pagar"); }}>Cancelar / Fechar</Button>
                    </div>
                </div>

                {/* FORMULÁRIO MANUAL (Para cadastrar os não encontrados) */}
                {mostrarForm && (
                  <div className={`p-6 rounded-xl border space-y-4 relative z-20 ${parseFloat(valorBruto) < 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'} shadow-inner animate-in fade-in`}>
                    <div className="flex justify-between items-center mb-4"><h3 className={`font-bold flex items-center gap-2 ${parseFloat(valorBruto) < 0 ? 'text-rose-800' : 'text-emerald-800'}`}><DollarSign className="w-5 h-5"/> Registrar Transação não encontrada</h3><Button variant="ghost" onClick={() => setMostrarForm(false)}><X className="w-5 h-5"/></Button></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2 space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Descrição *</label><Input value={descricao} onChange={e => setDescricao(e.target.value)} className="bg-white" /></div>
                      <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Valor Bruto *</label><Input type="number" step="0.01" value={valorBruto} onChange={e => setValorBruto(e.target.value)} className="bg-white" /></div>
                      <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Vencimento/Pagamento *</label><Input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} className="bg-white" /></div>
                      {parseFloat(valorBruto) < 0 && (
                        <div className="md:col-span-2 space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Fornecedor</label><Select value={fornecedorId} onValueChange={setFornecedorId}><SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..."/></SelectTrigger><SelectContent className="bg-white z-[9999]"><SelectItem value="nenhum">Avulso</SelectItem>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome_fantasia}</SelectItem>)}</SelectContent></Select></div>
                      )}
                      <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Transação Financeira *</label><Select value={categoriaId} onValueChange={setCategoriaId}><SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..."/></SelectTrigger><SelectContent className="bg-white z-[9999]">{transacoesBD.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Conta Bancária *</label><Select value={contaId} disabled><SelectTrigger className="bg-slate-100"><SelectValue/></SelectTrigger><SelectContent><SelectItem value={contaId}>Travada pelo Extrato</SelectItem></SelectContent></Select></div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-4"><Button variant="outline" onClick={() => setMostrarForm(false)} className="bg-white">Cancelar</Button><Button onClick={salvarLancamento} className={parseFloat(valorBruto) < 0 ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}>Gravar Lançamento Direto</Button></div>
                  </div>
                )}

                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800 text-white text-[11px] uppercase tracking-wider">
                                    <th className="p-4 font-semibold">Data Banco</th>
                                    <th className="p-4 font-semibold">Tipo / Valor (OFX)</th>
                                    <th className="p-4 font-semibold">Descrição do Extrato</th>
                                    <th className="p-4 font-semibold bg-slate-900 border-l border-slate-700">Análise de IA e Correspondência no ERP</th>
                                    <th className="p-4 font-semibold bg-slate-900 text-center w-40">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {ofxTransactions.map((tx) => {
                                    const sugestao = sugerirCorrespondencia(tx);
                                    return (
                                        <tr key={tx.id} className={`transition-colors ${tx.conciliado ? 'bg-slate-50 opacity-50' : 'hover:bg-slate-50'}`}>
                                            <td className="p-4 align-top font-medium text-sm text-slate-600"><Calendar className="w-4 h-4 inline mr-1 text-slate-400"/> {new Date(tx.data).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</td>
                                            <td className="p-4 align-top">
                                                <p className={`font-black text-base ${tx.tipo === 'Despesa' ? 'text-rose-600' : 'text-emerald-600'}`}>R$ {tx.valor.toFixed(2).replace('.',',')}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{tx.tipo}</p>
                                            </td>
                                            <td className="p-4 align-top">
                                                <p className="font-semibold text-slate-800 text-sm max-w-sm break-words">{tx.descricao}</p>
                                                {tx.documento && <p className="text-xs text-slate-500 font-mono mt-1">Ref: {tx.documento}</p>}
                                            </td>
                                            <td className="p-4 align-top bg-slate-50/50 border-l border-slate-100">
                                                {tx.conciliado ? (
                                                    <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100"><CheckCircle2 className="w-5 h-5"/> Conciliado e Baixado!</div>
                                                ) : sugestao ? (
                                                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                                                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1 flex items-center gap-1"><Check className="w-3 h-3"/> Combinação Encontrada</p>
                                                        <p className="font-bold text-sm text-slate-800 leading-tight">{sugestao.descricao}</p>
                                                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 font-medium">
                                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> Venceu em: {new Date(sugestao.data_vencimento).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</span>
                                                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3"/> R$ {Number(sugestao.valor).toFixed(2).replace('.',',')}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
                                                        <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Sem Correspondência</p>
                                                        <p className="text-xs text-rose-800 font-medium">Não há lançamentos pendentes no ERP com este valor aproximado.</p>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-center align-top bg-slate-50/50">
                                                {tx.conciliado ? (
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Resolvido</span>
                                                ) : sugestao ? (
                                                    <Button size="sm" onClick={() => confirmarConciliacao(tx, sugestao.id)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9">Baixar no ERP</Button>
                                                ) : (
                                                    <Button variant="outline" size="sm" onClick={() => criarLancamentoDoOfx(tx)} className="w-full text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-bold h-9">Registrar Novo</Button>
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
        )}

        {/* ========================================================================= */}
        {/* ABA NORMAL (PAGAR / RECEBER) */}
        {/* ========================================================================= */}
        {abaAtiva !== "conciliacao" && (
            <>
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

                  {/* PAINEL DE FILTROS AVANÇADOS */}
                  {mostrarFiltros && (
                      <div className={`p-5 border-b grid grid-cols-1 md:grid-cols-4 gap-5 relative z-30 ${isPagar ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                          <div className="col-span-full flex justify-between items-center"><h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Filter className="w-4 h-4"/> Filtros Avançados</h4><Button variant="ghost" size="sm" onClick={limparFiltros} className="text-red-500 h-8 px-2 text-xs">Limpar Filtros</Button></div>
                          
                          <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Data de Emissão (Início)</label><Input type="date" value={filtroEmiInicio} onChange={e=>setFiltroEmiInicio(e.target.value)} className="bg-white h-9" /></div>
                          <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Data de Emissão (Fim)</label><Input type="date" value={filtroEmiFim} onChange={e=>setFiltroEmiFim(e.target.value)} className="bg-white h-9" /></div>
                          <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Transação Financeira</label><Select value={filtroTransacao} onValueChange={setFiltroTransacao}><SelectTrigger className="bg-white h-9"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[9999]"><SelectItem value="todos">Todos</SelectItem>{transacoesBD.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent></Select></div>
                          <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Segmento de Negócio</label><Select value={filtroSegmento} onValueChange={setFiltroSegmento}><SelectTrigger className="bg-white h-9"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[9999]"><SelectItem value="todos">Todos</SelectItem>{segmentosBD.map(s => <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>)}</SelectContent></Select></div>

                          <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Vencimento (Início)</label><Input type="date" value={filtroVencInicio} onChange={e=>setFiltroVencInicio(e.target.value)} className="bg-white h-9" /></div>
                          <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Vencimento (Fim)</label><Input type="date" value={filtroVencFim} onChange={e=>setFiltroVencFim(e.target.value)} className="bg-white h-9" /></div>
                          <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Data Pagamento (Início)</label><Input type="date" value={filtroPagInicio} onChange={e=>setFiltroPagInicio(e.target.value)} className="bg-white h-9" /></div>
                          <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Data Pagamento (Fim)</label><Input type="date" value={filtroPagFim} onChange={e=>setFiltroPagFim(e.target.value)} className="bg-white h-9" /></div>

                          {isPagar && (
                            <div className="space-y-1 md:col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Fornecedor</label><Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}><SelectTrigger className="bg-white h-9"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[9999]"><SelectItem value="todos">Todos</SelectItem><SelectItem value="nenhum">Sem Fornecedor</SelectItem>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</SelectItem>)}</SelectContent></Select></div>
                          )}
                          {!isPagar && (
                            <div className="space-y-1 md:col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Nome do Cliente</label><Input value={filtroCliente} onChange={e=>setFiltroCliente(e.target.value)} placeholder="Digite parte do nome..." className="bg-white h-9" /></div>
                          )}
                          
                          <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Status</label><Select value={filtroStatus} onValueChange={setFiltroStatus}><SelectTrigger className="bg-white h-9"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[9999]"><SelectItem value="todos">Todos</SelectItem><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Atrasado">Atrasado</SelectItem><SelectItem value="Pago">Pago/Recebido</SelectItem></SelectContent></Select></div>
                          <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Centro de Custo</label><Select value={filtroCentroCusto} onValueChange={setFiltroCentroCusto}><SelectTrigger className="bg-white h-9"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[9999]"><SelectItem value="todos">Todos</SelectItem>{centrosCustoBD.map((cc:any) => <SelectItem key={cc.id} value={cc.nome}>{cc.nome}</SelectItem>)}</SelectContent></Select></div>
                      </div>
                  )}

                  {/* FORMULÁRIO MANUAL */}
                  {mostrarForm && (
                    <div className={`p-6 border-b space-y-4 relative z-20 ${isPagar ? 'bg-rose-50' : 'bg-emerald-50'} shadow-inner`}>
                      <div className="flex justify-between items-center mb-4"><h3 className="font-bold flex items-center gap-2">{editandoLancamentoId ? <Edit className="w-5 h-5"/> : <DollarSign className="w-5 h-5"/>} {editandoLancamentoId ? 'Editar Lançamento' : 'Novo Lançamento Manual'}</h3><Button variant="ghost" onClick={limparFormulario}><X className="w-5 h-5"/></Button></div>
                      
                      {/* LINHA 1 */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Descrição *</label><Input value={descricao} onChange={e => setDescricao(e.target.value)} className="bg-white" /></div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Transação Financeira *</label>
                            <Select value={transacaoId} onValueChange={setTransacaoId}>
                                <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                                <SelectContent className="bg-white z-[9999]">{transacoesBD.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Conta Bancária *</label>
                            <Select value={contaId} onValueChange={setContaId}>
                                <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                                <SelectContent className="bg-white z-[9999]">{contasBancarias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                      </div>

                      {/* LINHA 2 */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">{isPagar ? "Fornecedor / Credor" : "Cliente"}</label>
                            {isPagar ? (
                                <Select value={fornecedorId} onValueChange={setFornecedorId}><SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..."/></SelectTrigger><SelectContent className="bg-white z-[9999]"><SelectItem value="nenhum">Avulso</SelectItem>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome_fantasia}</SelectItem>)}</SelectContent></Select>
                            ) : (
                                <Input disabled placeholder="Vem da descrição..." className="bg-slate-100 text-slate-400" />
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Centro de Custo</label>
                            <Select value={centroCusto} onValueChange={setCentroCusto}>
                                <SelectTrigger className="bg-white"><SelectValue placeholder="Opcional"/></SelectTrigger>
                                <SelectContent className="bg-white z-[9999]"><SelectItem value="nenhum">Nenhum</SelectItem>{centrosCustoBD.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Segmento de Negócio</label>
                            <Select value={segmentoNegocio} onValueChange={setSegmentoNegocio}>
                                <SelectTrigger className="bg-white"><SelectValue placeholder="Opcional"/></SelectTrigger>
                                <SelectContent className="bg-white z-[9999]"><SelectItem value="nenhum">Nenhum</SelectItem>{segmentosBD.map(s => <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Forma de Pagamento</label>
                            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                                <SelectTrigger className="bg-white"><SelectValue placeholder="Opcional"/></SelectTrigger>
                                <SelectContent className="bg-white z-[9999]"><SelectItem value="nenhum">Não Especificado</SelectItem>{formasPagamentoBD.map(f => <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                      </div>

                      {/* LINHA 3 */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2 border-t border-slate-200/50">
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Data de Emissão</label><Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} className="bg-white" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Data Vencimento *</label><Input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} className="bg-white" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Valor Bruto (R$) *</label><Input type="number" step="0.01" value={valorBruto} onChange={e => setValorBruto(e.target.value)} className="bg-white" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Juros/Multa (R$)</label><Input type="number" step="0.01" value={valorJuros} onChange={e => setValorJuros(e.target.value)} className="bg-white text-rose-600 font-bold" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Valor Total (R$)</label><Input readOnly value={valorTotal} className="bg-slate-100 font-black text-lg text-slate-700" /></div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-4"><Button variant="outline" onClick={limparFormulario} className="bg-white">Cancelar</Button><Button onClick={salvarLancamento} className={isPagar ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}>{editandoLancamentoId ? 'Atualizar' : 'Salvar Lançamento'}</Button></div>
                    </div>
                  )}

                  {/* TABELA PRINCIPAL */}
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
                              Valor Total {renderSortIcon('valor')}
                          </th>
                          <th className="p-4 font-semibold border-b cursor-pointer hover:bg-slate-200 transition-colors group" onClick={() => handleSort('transacao')}>
                              Transação Financeira {renderSortIcon('transacao')}
                          </th>
                          <th className="p-4 font-semibold border-b min-w-[200px] cursor-pointer hover:bg-slate-200 transition-colors group" onClick={() => handleSort('descricao')}>
                              Descrição {renderSortIcon('descricao')}
                          </th>
                          <th className="p-4 font-semibold border-b text-center w-24">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lancamentosFiltrados.length === 0 ? <tr><td colSpan={10} className="p-12 text-center text-slate-500">Nenhum lançamento correspondente encontrado.</td></tr> : lancamentosFiltrados.map(lanc => {
                          const statusAtual = getComputedStatus(lanc);
                          const isAtrasado = statusAtual === 'Atrasado';
                          
                          return (
                            <tr key={lanc.id} className="hover:bg-slate-50 transition-colors group">
                              
                              <td className="p-4 text-sm align-top whitespace-nowrap text-slate-500">
                                {lanc.data_emissao ? new Date(lanc.data_emissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '--'}
                              </td>

                              <td className="p-4 align-top">
                                <p className="text-sm font-bold text-slate-700">
                                    {isPagar ? (lanc.log_fornecedores?.nome_fantasia || '--') : '--'}
                                </p>
                              </td>

                              <td className="p-4 align-top whitespace-nowrap">
                                {lanc.documento_origem ? (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold flex items-center w-fit gap-1"><FileText className="w-3 h-3"/> {lanc.documento_origem}</span>
                                        {isPagar && (
                                            <Button variant="ghost" size="icon" onClick={() => irParaLogistica(lanc.documento_origem)} className="h-6 w-6 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 p-0" title="Ver Nota Fiscal no Recebimento Físico">
                                                <PackageSearch className="w-3.5 h-3.5"/>
                                            </Button>
                                        )}
                                    </div>
                                ) : '--'}
                              </td>

                              <td className="p-4 text-sm font-medium align-top whitespace-nowrap">
                                <span className={`flex items-center gap-1.5 ${isAtrasado ? 'text-rose-600 font-bold' : 'text-slate-700 font-bold'}`}>
                                  <Calendar className="w-4 h-4"/> {new Date(lanc.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }
                                </span>
                                {isAtrasado && <span className="text-[10px] text-rose-500 uppercase mt-0.5 block ml-5">Vencido</span>}
                              </td>

                              <td className="p-4 text-sm align-top whitespace-nowrap">
                                {lanc.data_pagamento ? (
                                    <span className="text-emerald-700 font-bold">{new Date(lanc.data_pagamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                                ) : '--'}
                              </td>

                              <td className="p-4 text-center align-top">
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${statusAtual === 'Pago' ? 'bg-emerald-100 text-emerald-700' : isAtrasado ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {statusAtual}
                                </span>
                              </td>
                              
                              <td className="p-4 text-right align-top whitespace-nowrap">
                                <p className={`font-bold text-base ${isPagar ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    R$ {Number(lanc.valor).toFixed(2).replace('.', ',')}
                                </p>
                                {Number(lanc.valor_juros) > 0 && <p className="text-[9px] text-rose-500 font-bold uppercase mt-1">Inc. R$ {Number(lanc.valor_juros).toFixed(2).replace('.',',')} Juros/Multa</p>}
                              </td>

                              <td className="p-4 align-top">
                                <p className="text-xs font-semibold text-slate-700 mb-1">{lanc.fin_categorias?.nome || 'Sem Categoria'}</p>
                                <p className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-block mb-1 border">C.C: {lanc.centro_custo || 'Geral'}</p>
                                <p className="text-[10px] text-slate-500 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded inline-block mb-1 border ml-1">Seg: {lanc.segmento_negocio || 'Geral'}</p>
                                <p className="text-[10px] text-slate-500 flex items-center gap-1"><CreditCard className="w-3 h-3"/> {lanc.forma_pagamento || 'Não informada'}</p>
                              </td>

                              <td className="p-4 align-top">
                                <p className="text-sm text-slate-800 leading-tight">{lanc.descricao}</p>
                              </td>
                              
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
            </>
        )}
      </div>
    </AppLayout>
  );
}