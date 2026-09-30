import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Layers, CheckCircle2, Plus, Search, Trash2, ArrowLeft, PaintBucket, FileOutput, PlayCircle, AlertCircle, Save, Paperclip, Download, Loader2, Landmark, DollarSign, Activity, User, CalendarDays, UserCheck, FileText, MessageSquare, Edit2, Ban, X, Send, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ProdutoOSG = {
  id: string;
  descricao: string;
  quantidade: number;
  possuiImpressao: "Sim" | "Não";
  paginasPorProduto: number;
  valorUnitario: number;
  modoImpressao: "Simplex" | "Duplex";
};

type InsumoOS = { id: string; produtoId: string; nome: string; quantidade: number; custoUn: number; estoqueAtual: number };
type ApontamentoProducao = { 
    id: string; 
    data: string; 
    equipamentoId: string; 
    equipamentoNome: string; 
    modo: string; 
    qtdSolicitada: number; 
    contadorInicial: number; 
    contadorFinal?: number; 
    producaoValida?: number; 
    desperdicio?: number;
    status: 'imprimindo' | 'concluido';
    paginasPorProduto: number; 
    valorUnitarioPagina: number; 
};

const STATUS_FLUXO_GRAFICA = [
  "Solicitação Recebida",
  "Levantamento de Material",
  "Fechamento de Arquivo",
  "Impressão",
  "Acabamento",
  "Pronto para Expedição",
  "Entregue",
  "Faturamento",
  "Concluído"
];

export default function Grafica() {
  const [abaAtiva, setAbaAtiva] = useState<"abrir" | "painel">("painel");

  const [produtosBD, setProdutosBD] = useState<any[]>([]);
  const [clientesBD, setClientesBD] = useState<any[]>([]);
  const [operadoresBD, setOperadoresBD] = useState<any[]>([]);
  const [equipamentosTC, setEquipamentosTC] = useState<any[]>([]);
  const [usuarioAtual, setUsuarioAtual] = useState<any>(null);

  // ABRIR OSG
  const [clienteBusca, setClienteBusca] = useState("");
  const [solicitante, setSolicitante] = useState("");
  const [dataSolicitacao, setDataSolicitacao] = useState(new Date().toISOString().split('T')[0]);
  const [operadorNome, setOperadorNome] = useState("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [telefoneClienteOS, setTelefoneClienteOS] = useState("");
  const [emailClienteOS, setEmailClienteOS] = useState("");
  const [produtosOSG, setProdutosOSG] = useState<ProdutoOSG[]>([{ id: crypto.randomUUID(), descricao: "", quantidade: 1, possuiImpressao: "Não", paginasPorProduto: 1, valorUnitario: 0, modoImpressao: "Simplex" }]);

  const [salvandoOS, setSalvandoOS] = useState(false);
  const [exportando, setExportando] = useState(false);

  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [buscaModalCliente, setBuscaModalCliente] = useState("");

  const [modalOperadorOpen, setModalOperadorOpen] = useState(false);
  const [buscaModalOperador, setBuscaModalOperador] = useState("");
  const [modoSelecaoOperador, setModoSelecaoOperador] = useState<"criacao" | "edicao">("criacao");

  const [modalInsumoOpen, setModalInsumoOpen] = useState(false);
  const [buscaModalInsumo, setBuscaModalInsumo] = useState("");

  const [modalEquipamentoOpen, setModalEquipamentoOpen] = useState(false);
  const [buscaModalEquipamento, setBuscaModalEquipamento] = useState("");

  // PAINEL
  const [ordens, setOrdens] = useState<any[]>([]);
  const [buscaOS, setBuscaOS] = useState("");
  const [osSelecionada, setOsSelecionada] = useState<any | null>(null);
  const [osSelecionadasLote, setOsSelecionadasLote] = useState<string[]>([]);
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false); 
  
  const [statusOS, setStatusOS] = useState("");
  const [insumos, setInsumos] = useState<InsumoOS[]>([]);
  const [historicoProducao, setHistoricoProducao] = useState<ApontamentoProducao[]>([]);

  // EDIÇÃO PRANCHETA
  const [editDataPrevista, setEditDataPrevista] = useState("");
  const [editSolicitante, setEditSolicitante] = useState("");
  const [editOperadorNome, setEditOperadorNome] = useState("");
  const [editTelefoneCliente, setEditTelefoneCliente] = useState("");
  const [editEmailCliente, setEditEmailCliente] = useState("");
  const [editProdutosOSG, setEditProdutosOSG] = useState<ProdutoOSG[]>([]);

  // IMPRESSÃO
  const [statusImpressao, setStatusImpressao] = useState<"pendente" | "imprimindo">("pendente");
  const [equipImpressaoId, setEquipImpressaoId] = useState("");
  const [qtdImprimirServico, setQtdImprimirServico] = useState(1); 
  const [paginasPorProduto, setPaginasPorProduto] = useState(1); 
  const [valorUnitarioPagina, setValorUnitarioPagina] = useState(""); 
  const [modoImpressao, setModoImpressao] = useState("Simplex");
  const [contadorInicial, setContadorInicial] = useState("");
  const [contadorFinal, setContadorFinal] = useState("");

  const [timeline, setTimeline] = useState<any[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [anexos, setAnexos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [emailTriggers, setEmailTriggers] = useState<any[]>([]);
  const [modalConfirmarEmail, setModalConfirmarEmail] = useState(false);
  const [dadosEmailPendente, setDadosEmailPendente] = useState<any>(null);

  useEffect(() => { fetchUsuario(); fetchDadosBase(); fetchOrdens(); }, [abaAtiva]);

  const fetchUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUsuarioAtual(user);
  };

  const fetchDadosBase = async () => {
    const [prodRes, cliRes, opRes, eqRes] = await Promise.all([
      supabase.from('log_produtos' as any).select('id, sku, nome, custo_base, estoque_atual').order('nome'),
      supabase.from('log_clientes' as any).select('id, razao_social, nome_fantasia, cnpj_cpf').order('nome_fantasia'),
      supabase.from('grafica_operadores' as any).select('id, nome').order('nome'),
      supabase.from('srv_equipamentos' as any).select('id, sequencial, numero_serie, log_produtos(nome, especificacoes), log_clientes(nome_fantasia, razao_social)')
    ]);
    if (prodRes.data) setProdutosBD(prodRes.data);
    if (cliRes.data) setClientesBD(cliRes.data);
    if (opRes.data) setOperadoresBD(opRes.data);
    if (eqRes.data) setEquipamentosTC(eqRes.data);
    
    const { data: triggersData } = await supabase.from('cfg_email_triggers').select('*').eq('modulo', 'Grafica').eq('ativo', true);
    if (triggersData) setEmailTriggers(triggersData);
  };

  const fetchOrdens = async () => {
    const { data } = await supabase.from('prd_ordens_producao' as any).select('*').order('numero_op', { ascending: false });
    if (data) {
      const dataNormalizada = data.map((os: any) => ({ ...os, status: (STATUS_FLUXO_GRAFICA.includes(os.status) || os.status === "Cancelado") ? os.status : "Solicitação Recebida" }));
      setOrdens(dataNormalizada);
    }
  };

  const sincronizarCardKanban = async (os: any, isUpdate: boolean = false) => {
    try {
        let { data: wf } = await supabase.from('kanban_workflows').select('id').ilike('nome', 'GESTÃO DE DEMANDAS').single();
        if (!wf) {
            const { data: newWf } = await supabase.from('kanban_workflows').insert([{ nome: 'GESTÃO DE DEMANDAS' }]).select().single();
            if (!newWf) return;
            wf = newWf;
        }

        const statusRaw = os.status || "Solicitação Recebida";
        const statusNome = statusRaw === "Cancelado" ? "Concluído" : statusRaw;
        let { data: col } = await supabase.from('kanban_colunas').select('id').eq('workflow_id', wf.id).ilike('nome', statusNome).single();
        
        if (!col) {
            let statusGlobalMap = "Andamento";
            if (statusNome === "Concluído" || statusNome === "Entregue") statusGlobalMap = "Concluído";
            else if (statusNome === "Solicitação Recebida" || statusNome === "Levantamento de Material") statusGlobalMap = "Andamento";
            else if (statusNome === "Faturamento" || statusNome === "Aguardando") statusGlobalMap = "Aguardando";
            
            const { data: colsCount } = await supabase.from('kanban_colunas').select('id');
            const { data: newCol } = await supabase.from('kanban_colunas').insert([{ workflow_id: wf.id, nome: statusNome.toUpperCase(), status_global: statusGlobalMap, ordem: colsCount ? colsCount.length : 0 }]).select().single();
            if (newCol) col = newCol; else return; 
        }

        const numOpStr = String(os.numero_op).padStart(4, '0');
        const tituloCard = `OSG-${numOpStr} - ${os.cliente_nome} - ${os.solicitante}`;
        const descricao = os.produtos ? os.produtos.map((p: any) => p.descricao).join(', ') : os.descricao_servico;

        if (isUpdate) {
            const { data: cardsExistentes } = await supabase.from('kanban_cards').select('id').eq('workflow_id', wf.id).ilike('titulo', `OSG-${numOpStr}%`);
            if (cardsExistentes && cardsExistentes.length > 0) {
                await supabase.from('kanban_cards').update({ coluna_id: col.id, titulo: tituloCard, descricao: descricao, responsavel_nome: os.operador_nome || "", data_vencimento: os.data_prevista || null, atualizado_em: new Date().toISOString() }).eq('id', cardsExistentes[0].id);
            } else await supabase.from('kanban_cards').insert([{ workflow_id: wf.id, coluna_id: col.id, titulo: tituloCard, descricao: descricao, responsavel_nome: os.operador_nome || "", data_vencimento: os.data_prevista || null }]);
        } else await supabase.from('kanban_cards').insert([{ workflow_id: wf.id, coluna_id: col.id, titulo: tituloCard, descricao: descricao, responsavel_nome: os.operador_nome || "", data_vencimento: os.data_prevista || null }]);
    } catch (e) { console.error(e); }
  };

  const criarOS = async () => {
    if (!clienteBusca || !solicitante || !dataSolicitacao || !operadorNome || !dataPrevista) return alert("Cliente, Solicitante, Operador e Datas são obrigatórios.");
    if (produtosOSG.length === 0) return alert("Adicione pelo menos um produto.");
    for (const prod of produtosOSG) {
        if (!prod.descricao) return alert("Preencha a descrição de todos os produtos.");
        if (prod.possuiImpressao === "Sim" && (!prod.paginasPorProduto || !prod.valorUnitario)) return alert(`Para o produto ${prod.descricao}, informe páginas e valor unitário.`);
    }
    
    setSalvandoOS(true);
    try {
      const payload = {
        cliente_nome: clienteBusca, solicitante: solicitante, data_solicitacao: dataSolicitacao,
        telefone_cliente: telefoneClienteOS, email_cliente: emailClienteOS,
        operador_nome: operadorNome, produtos: produtosOSG,
        data_prevista: dataPrevista || null, status: 'Solicitação Recebida', observacoes: "", historico_producao: [], timeline: [],
        descricao_servico: produtosOSG[0].descricao, 
        quantidade_produzir: produtosOSG[0].quantidade,
        paginas_por_produto: produtosOSG[0].paginasPorProduto,
        valor_unitario_pagina: produtosOSG[0].valorUnitario,
      };
      const { data: novaOs, error } = await supabase.from('prd_ordens_producao' as any).insert([payload]).select().single();
      if (error) throw error;
      await sincronizarCardKanban(novaOs, false);
      alert("OSG enviada para a fila com sucesso!");
      
      setClienteBusca(""); setSolicitante(""); setDataSolicitacao(new Date().toISOString().split('T')[0]); 
      setOperadorNome(""); setDataPrevista(""); setTelefoneClienteOS(""); setEmailClienteOS("");
      setProdutosOSG([{ id: crypto.randomUUID(), descricao: "", quantidade: 1, possuiImpressao: "Não", paginasPorProduto: 1, valorUnitario: 0, modoImpressao: "Simplex" }]);
      setAbaAtiva("painel");
    } catch (e: any) { alert("Erro ao criar OS: " + e.message); } finally { setSalvandoOS(false); }
  };

  const abrirPrancheta = async (os: any) => {
    setOsSelecionada(os); setStatusOS(os.status);
    setEditDataPrevista(os.data_prevista || ""); setEditSolicitante(os.solicitante || "");
    setEditTelefoneCliente(os.telefone_cliente || ""); setEditEmailCliente(os.email_cliente || ""); setEditOperadorNome(os.operador_nome || "");

    const produtosLegacy = os.produtos && os.produtos.length > 0 ? os.produtos : [{ id: crypto.randomUUID(), descricao: os.descricao_servico || "", quantidade: os.quantidade_produzir || 1, possuiImpressao: os.observacoes?.includes("[Possui Impressão: Sim]") ? "Sim" : "Não", paginasPorProduto: os.paginas_por_produto || 1, valorUnitario: os.valor_unitario_pagina || 0, modoImpressao: os.observacoes?.includes("[Modo: Duplex]") ? "Duplex" : "Simplex" }];
    setEditProdutosOSG(produtosLegacy);

    let tml: any[] = []; try { tml = typeof os.timeline === 'string' ? JSON.parse(os.timeline) : (os.timeline || []); } catch(e){}
    setTimeline(tml);
    let hist: ApontamentoProducao[] = []; try { hist = typeof os.historico_producao === 'string' ? JSON.parse(os.historico_producao) : (os.historico_producao || []); } catch(e){}
    setHistoricoProducao(hist);

    const qtdTotalImpressaoNecessaria = produtosLegacy.filter((p: any) => p.possuiImpressao === "Sim").reduce((acc: number, p: any) => acc + p.quantidade, 0);

    const producaoAtiva = hist.find((h: any) => h.status === 'imprimindo');
    if (producaoAtiva) {
        setStatusImpressao("imprimindo"); setEquipImpressaoId(producaoAtiva.equipamentoId); setQtdImprimirServico(producaoAtiva.qtdSolicitada);
        setPaginasPorProduto(producaoAtiva.paginasPorProduto || 1); setValorUnitarioPagina(producaoAtiva.valorUnitarioPagina ? producaoAtiva.valorUnitarioPagina.toString() : "");
        setModoImpressao(producaoAtiva.modo); setContadorInicial(producaoAtiva.contadorInicial.toString()); setContadorFinal("");
    } else {
        const totalProduzido = hist.filter((h: any) => h.status === 'concluido').reduce((acc: number, curr: any) => acc + (curr.producaoValida || 0), 0);
        const pendente = Math.max(0, qtdTotalImpressaoNecessaria - totalProduzido);
        setStatusImpressao("pendente"); setContadorInicial(""); setContadorFinal(""); setEquipImpressaoId("");
        setQtdImprimirServico(pendente || qtdTotalImpressaoNecessaria || 1);
        setPaginasPorProduto(produtosLegacy.find((p: any) => p.possuiImpressao === "Sim")?.paginasPorProduto || 1);
        setValorUnitarioPagina(produtosLegacy.find((p: any) => p.possuiImpressao === "Sim")?.valorUnitario?.toString() || "");
        setModoImpressao(produtosLegacy.find((p: any) => p.possuiImpressao === "Sim")?.modoImpressao || "Simplex");
    }

    const [insumosRes, anexosRes] = await Promise.all([
        supabase.from('prd_op_insumos' as any).select('*').eq('op_id', os.id), supabase.from('prd_op_anexos' as any).select('*').eq('op_id', os.id).order('data_upload', { ascending: false })
    ]);
    if (insumosRes.data) setInsumos(insumosRes.data.map((i: any) => ({ id: i.id, produtoId: i.produto_id, nome: i.produto_nome, quantidade: i.quantidade, custoUn: i.custo_unitario, estoqueAtual: 999 })));
    if (anexosRes.data) setAnexos(anexosRes.data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file) return; setUploading(true);
      try {
          const fileName = `OSG-${osSelecionada.numero_op}-${Math.random().toString(36).substring(2)}.${file.name.split('.').pop()}`;
          const { error: upErr } = await supabase.storage.from('grafica_arquivos').upload(fileName, file);
          if (upErr) throw upErr;
          const { data: { publicUrl } } = supabase.storage.from('grafica_arquivos').getPublicUrl(fileName);
          const { data: novo, error: dbErr } = await supabase.from('prd_op_anexos' as any).insert([{ op_id: osSelecionada.id, nome_arquivo: file.name, url_arquivo: publicUrl, tamanho_bytes: file.size }]).select().single();
          if (dbErr) throw dbErr;
          setAnexos([novo, ...anexos]); alert("Anexado!");
      } catch(ex: any) { alert(ex.message); } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const adicionarComentario = async () => {
    if (!novoComentario.trim()) return;
    const novaTimeline = [{ id: crypto.randomUUID(), data: new Date().toISOString(), usuario: usuarioAtual?.user_metadata?.full_name || 'Equipe Gráfica', texto: novoComentario }, ...timeline];
    setTimeline(novaTimeline); setNovoComentario("");
    await supabase.from('prd_ordens_producao' as any).update({ timeline: novaTimeline }).eq('id', osSelecionada.id);
  };

  const deletarAnexo = async (id: string) => { if(confirm("Remover?")) { await supabase.from('prd_op_anexos' as any).delete().eq('id', id); setAnexos(anexos.filter(a => a.id !== id)); } };

  const salvarAndamento = async (statusFinal?: string) => {
    for (const prod of editProdutosOSG) {
        if (!prod.descricao) return alert("Preencha a descrição de todos os produtos.");
        if (prod.possuiImpressao === "Sim" && (!prod.paginasPorProduto || !prod.valorUnitario)) return alert(`Para o produto ${prod.descricao}, informe páginas e valor unitário.`);
    }
    setSalvandoOS(true);
    try {
      const novoStatus = statusFinal || statusOS;
      const custoTotalInsumos = insumos.reduce((a, b) => a + (b.quantidade * b.custoUn), 0);
      const payloadUpdate = { 
        status: novoStatus, custo_total_insumos: custoTotalInsumos, produtos: editProdutosOSG,
        data_prevista: editDataPrevista || null, solicitante: editSolicitante, operador_nome: editOperadorNome,
        telefone_cliente: editTelefoneCliente, email_cliente: editEmailCliente,
        descricao_servico: editProdutosOSG[0]?.descricao, // Legacy Update
        quantidade_produzir: editProdutosOSG[0]?.quantidade,
        paginas_por_produto: editProdutosOSG[0]?.paginasPorProduto
      };

      const { data: osAtualizada, error } = await supabase.from('prd_ordens_producao' as any).update(payloadUpdate).eq('id', osSelecionada.id).select().single();
      if (error) throw error;

      await supabase.from('prd_op_insumos' as any).delete().eq('op_id', osSelecionada.id);
      if (insumos.length > 0) await supabase.from('prd_op_insumos' as any).insert(insumos.map(i => ({ op_id: osSelecionada.id, produto_id: i.produtoId, produto_nome: i.nome, quantidade: i.quantidade, custo_unitario: i.custoUn, custo_total: i.quantidade * i.custoUn })));

      await sincronizarCardKanban(osAtualizada || { ...osSelecionada, ...payloadUpdate }, true);
      const trigger = emailTriggers.find(t => t.status_gatilho === novoStatus);
      if (trigger) {
          setDadosEmailPendente({ osId: osSelecionada.id, cliente: osSelecionada.cliente_nome, emailDestino: osSelecionada.email_cliente || 'cliente@exemplo.com', assunto: trigger.assunto.replace(/{numero_osg}/g, String(osSelecionada.numero_op).padStart(4, '0')), texto: trigger.corpo_texto.replace(/{numero_osg}/g, String(osSelecionada.numero_op).padStart(4, '0')).replace(/{solicitante}/g, editSolicitante || "Cliente").replace(/{status}/g, novoStatus) });
          setModalConfirmarEmail(true);
      } else if (!statusFinal) { alert("Atualizado!"); fetchOrdens(); setOsSelecionada(null); }
    } catch (e: any) { alert(e.message); } finally { setSalvandoOS(false); }
  };

  const iniciarImpressao = async () => {
      if (!contadorInicial || !paginasPorProduto || !valorUnitarioPagina) return alert("Preencha contador, páginas e valor unitário.");
      const eq = equipamentosTC.find(e => e.id === equipImpressaoId);
      const novoHistorico = [...historicoProducao, { id: crypto.randomUUID(), data: new Date().toISOString(), equipamentoId: equipImpressaoId, equipamentoNome: eq ? `${eq.log_produtos?.nome || 'Eq'} (S/N: ${eq.numero_serie})` : 'Desconhecido', modo: modoImpressao, qtdSolicitada: qtdImprimirServico, paginasPorProduto, valorUnitarioPagina: parseFloat(valorUnitarioPagina), contadorInicial: Number(contadorInicial), status: 'imprimindo' as const }];
      setHistoricoProducao(novoHistorico); setStatusImpressao("imprimindo");
      await supabase.from('prd_ordens_producao' as any).update({ historico_producao: novoHistorico }).eq('id', osSelecionada.id);
  };

  const finalizarImpressao = async () => {
    if (!contadorFinal || Number(contadorFinal) < Number(contadorInicial)) return alert("Contador Final inválido.");
    const diff = Number(contadorFinal) - Number(contadorInicial);
    const at = historicoProducao.find(h => h.status === 'imprimindo'); if (!at) return;
    const esp = at.qtdSolicitada * (at.paginasPorProduto || 1);
    let val = 0; let desp = 0;
    if (diff > esp) { val = at.qtdSolicitada; desp = diff - esp; alert(`Desperdício: ${desp} páginas (${((desp/esp)*100).toFixed(1)}%)`); } else { val = Math.floor(diff / (at.paginasPorProduto || 1)); if (val < at.qtdSolicitada) alert(`Parcial: Foram impressas ${diff} páginas, equivalendo a ${val} itens.`); }
    
    const novoHistorico = historicoProducao.map(h => h.status === 'imprimindo' ? { ...h, contadorFinal: Number(contadorFinal), producaoValida: val, desperdicio: desp, status: 'concluido' as const } : h);
    setHistoricoProducao(novoHistorico);
    await supabase.from('prd_ordens_producao' as any).update({ historico_producao: novoHistorico }).eq('id', osSelecionada.id);
    setStatusImpressao("pendente"); setContadorInicial(""); setContadorFinal("");
    const totalProd = novoHistorico.filter(h => h.status === 'concluido').reduce((a, c) => a + (c.producaoValida || 0), 0);
    const qtdNecessaria = editProdutosOSG.filter((p: any) => p.possuiImpressao === "Sim").reduce((acc, p) => acc + p.quantidade, 0);
    setQtdImprimirServico(Math.max(0, qtdNecessaria - totalProd));
  };

  const getBase64ImageFromUrl = async (u: string) => { try { const r = await fetch(u); const b = await r.blob(); return new Promise<string>((res) => { const reader = new FileReader(); reader.onloadend = () => res(reader.result as string); reader.readAsDataURL(b); }); } catch { return null; } };
  
  const gerarComprovantePDF = async (osList: any[]) => {
      if (!osList || osList.length === 0) return;
      if (osList.some(os => os.cliente_nome !== osList[0].cliente_nome)) return alert("Selecione OSGs do mesmo cliente.");
      setExportando(true);
      try {
          const doc = new jsPDF("p", "mm", "a4"); const logoBase64 = await getBase64ImageFromUrl("/logo.png");
          const clienteObj = clientesBD.find(c => c.nome_fantasia === osList[0].cliente_nome || c.razao_social === osList[0].cliente_nome);
          const rs = clienteObj?.razao_social || osList[0].cliente_nome; const cnpj = clienteObj?.cnpj_cpf || "Não informado";
          
          doc.setFont("times", "bold"); doc.setFontSize(11);
          doc.text(`Belém/PA, ${String(new Date().getDate()).padStart(2,'0')}/${String(new Date().getMonth()+1).padStart(2,'0')}/${new Date().getFullYear()}`, 196, 45, { align: "right" });
          doc.text(`À (O) ${String(rs).toUpperCase()}`, 14, 55); doc.text(`CNPJ: ${cnpj}`, 14, 60);
          doc.setFontSize(12); doc.text(osList.length === 1 ? `COMPROVANTE DE ENTREGA - OSG-${String(osList[0].numero_op).padStart(4,'0')}` : `COMPROVANTE DE ENTREGA - MÚLTIPLAS OSGs`, 105, 75, { align: "center" });

          let totalGeralPaginas = 0; const tableRows: any[] = [];
          osList.forEach(os => {
              const produtos = (os.produtos && os.produtos.length > 0) ? os.produtos : [{ descricao: os.descricao_servico, quantidade: os.quantidade_produzir, possuiImpressao: os.observacoes?.includes("[Possui Impressão: Sim]") ? "Sim" : "Não", paginasPorProduto: os.paginas_por_produto || 1 }];
              let totalOsImpressoes = 0;
              produtos.forEach((prod: any, idx: number) => {
                  const ppProduto = prod.paginasPorProduto || 1;
                  const totalImpressoes = prod.possuiImpressao === "Sim" ? (prod.quantidade * ppProduto) : 0;
                  totalOsImpressoes += totalImpressoes; totalGeralPaginas += totalImpressoes;
                  const row: any[] = [];
                  if (idx === 0) {
                      row.push({ content: os.data_solicitacao ? new Date(os.data_solicitacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : "-", rowSpan: produtos.length, styles: { valign: 'middle' } });
                      row.push({ content: os.solicitante || "-", rowSpan: produtos.length, styles: { valign: 'middle' } });
                      row.push({ content: `OSG-${String(os.numero_op).padStart(4, '0')}`, rowSpan: produtos.length, styles: { valign: 'middle' } });
                  }
                  row.push(prod.descricao || "-"); row.push(prod.quantidade || 0); row.push(prod.possuiImpressao === "Sim" ? ppProduto : "-"); row.push(prod.possuiImpressao === "Sim" ? totalImpressoes : "-");
                  tableRows.push(row);
              });
              tableRows.push([{ content: `TOTAL DA OSG-${String(os.numero_op).padStart(4, '0')}`, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: [245,245,245] } }, { content: totalOsImpressoes.toString(), styles: { fontStyle: 'bold', halign: 'center', fillColor: [245,245,245] } }]);
          });
          tableRows.push([{ content: "TOTAL GERAL DA SOLICITAÇÃO", colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: [220,220,220] } }, { content: totalGeralPaginas.toString(), styles: { fontStyle: 'bold', halign: 'center', fillColor: [220,220,220] } }]);

          autoTable(doc, {
              head: [["DATA", "SOLICITANTE", "OSG", "PRODUTO", "QTD", "P.P P/ PRODUTO", "TOTAL IMPRESSÕES"]], body: tableRows, startY: 85,
              theme: 'grid', styles: { font: 'times', fontSize: 9, cellPadding: 3, lineColor: [200,200,200], lineWidth: 0.1 }, headStyles: { fillColor: [240,240,240], textColor: [0,0,0], fontStyle: 'bold', halign: 'center' }
          });
          doc.save(`Comprovante_${osList[0].cliente_nome.replace(/\s+/g, '_')}.pdf`);
      } catch (e) { alert("Erro PDF."); } finally { setExportando(false); }
  };

  const gerarExtratoFaturamentoPDF = async (osList: any[]) => {
      if (!osList || osList.length === 0) return;
      if (osList.some(os => os.cliente_nome !== osList[0].cliente_nome)) return alert("Selecione OSGs do mesmo cliente para o extrato.");
      setExportando(true);
      try {
          const doc = new jsPDF("l", "mm", "a4"); 
          const logoBase64 = await getBase64ImageFromUrl("/logo.png");
          const clienteObj = clientesBD.find(c => c.nome_fantasia === osList[0].cliente_nome || c.razao_social === osList[0].cliente_nome);
          const rs = clienteObj?.razao_social || osList[0].cliente_nome; 
          const cnpj = clienteObj?.cnpj_cpf || "Não informado";
          
          doc.setFont("times", "bold"); doc.setFontSize(11);
          doc.text(`Belém/PA, ${String(new Date().getDate()).padStart(2,'0')}/${String(new Date().getMonth()+1).padStart(2,'0')}/${new Date().getFullYear()}`, 280, 45, { align: "right" });
          doc.text(`À (O) ${String(rs).toUpperCase()}`, 14, 55); doc.text(`CNPJ: ${cnpj}`, 14, 60);
          doc.setFontSize(12); doc.text(`EXTRATO DE FATURAMENTO`, 148, 75, { align: "center" });

          let totalGeralPaginas = 0; 
          let totalGeralFinanceiro = 0;
          const tableRows: any[] = [];
          
          osList.forEach(os => {
              const produtos = (os.produtos && os.produtos.length > 0) ? os.produtos : [{ descricao: os.descricao_servico, quantidade: os.quantidade_produzir, possuiImpressao: os.observacoes?.includes("[Possui Impressão: Sim]") ? "Sim" : "Não", paginasPorProduto: os.paginas_por_produto || 1, valorUnitario: os.valor_unitario_pagina || 0 }];
              let totalOsImpressoes = 0;
              let totalOsFinanceiro = 0;
              
              produtos.forEach((prod: any, idx: number) => {
                  const ppProduto = prod.paginasPorProduto || 1;
                  const totalImpressoes = prod.possuiImpressao === "Sim" ? (prod.quantidade * ppProduto) : 0;
                  const valorUn = prod.valorUnitario || 0;
                  const totalRS = totalImpressoes * valorUn;
                  
                  totalOsImpressoes += totalImpressoes; 
                  totalGeralPaginas += totalImpressoes;
                  totalOsFinanceiro += totalRS;
                  totalGeralFinanceiro += totalRS;
                  
                  const row: any[] = [];
                  if (idx === 0) {
                      row.push({ content: os.data_solicitacao ? new Date(os.data_solicitacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : "-", rowSpan: produtos.length, styles: { valign: 'middle' } });
                      row.push({ content: os.solicitante || "-", rowSpan: produtos.length, styles: { valign: 'middle' } });
                      row.push({ content: `OSG-${String(os.numero_op).padStart(4, '0')}`, rowSpan: produtos.length, styles: { valign: 'middle' } });
                  }
                  row.push(prod.descricao || "-"); 
                  row.push(prod.quantidade || 0); 
                  row.push(prod.possuiImpressao === "Sim" ? ppProduto : "-"); 
                  row.push(prod.possuiImpressao === "Sim" ? totalImpressoes : "-");
                  row.push(prod.possuiImpressao === "Sim" ? `R$ ${valorUn.toFixed(2)}` : "-");
                  row.push(prod.possuiImpressao === "Sim" ? `R$ ${totalRS.toFixed(2)}` : "-");
                  tableRows.push(row);
              });
              
              tableRows.push([
                  { content: `TOTAL DA OSG-${String(os.numero_op).padStart(4, '0')}`, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: [245,245,245] } }, 
                  { content: totalOsImpressoes.toString(), styles: { fontStyle: 'bold', halign: 'center', fillColor: [245,245,245] } }, 
                  { content: "-", styles: { halign: 'center', fillColor: [245,245,245] } }, 
                  { content: `R$ ${totalOsFinanceiro.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245,245,245] } }
              ]);
          });
          
          tableRows.push([
              { content: "TOTAL GERAL", colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: [220,220,220] } }, 
              { content: totalGeralPaginas.toString(), styles: { fontStyle: 'bold', halign: 'center', fillColor: [220,220,220] } }, 
              { content: "-", styles: { halign: 'center', fillColor: [220,220,220] } }, 
              { content: `R$ ${totalGeralFinanceiro.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [220,220,220] } }
          ]);

          autoTable(doc, {
              head: [["DATA", "SOLICITANTE", "OSG", "PRODUTO", "QTD", "P.P P/ PRODUTO", "TOTAL IMPRESSÕES", "VALOR UN.", "TOTAL (R$)"]], body: tableRows, startY: 85,
              theme: 'grid', styles: { font: 'times', fontSize: 8, cellPadding: 2, lineColor: [200,200,200], lineWidth: 0.1 }, headStyles: { fillColor: [240,240,240], textColor: [0,0,0], fontStyle: 'bold', halign: 'center' }
          });
          doc.save(`Extrato_Faturamento_${osList[0].cliente_nome.replace(/\s+/g, '_')}.pdf`);
      } catch (e) { alert("Erro ao gerar Extrato PDF."); } finally { setExportando(false); }
  };

  const dispararEmailCliente = async () => {
    if (!dadosEmailPendente) return;
    try {
        const respostaWebhook = await fetch('https://n8n01-n8njoaogaia.fdumjq.easypanel.host/webhook/disparo-osg', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosEmailPendente) });
        if (!respostaWebhook.ok) throw new Error("Falha ao comunicar com automação.");
        alert("E-mail disparado!"); setModalConfirmarEmail(false); setDadosEmailPendente(null); fetchOrdens(); setOsSelecionada(null);
    } catch (error: any) { alert("Erro: " + error.message); }
  };

  const qtdNecessariaGeral = editProdutosOSG.filter(p => p.possuiImpressao === "Sim").reduce((a, p) => a + p.quantidade, 0);
  const totalProd = historicoProducao.filter(h => h.status === 'concluido').reduce((a, c) => a + (c.producaoValida || 0), 0);
  const totalReceitaGerada = historicoProducao.filter(h => h.status === 'concluido').reduce((acc, curr) => acc + ((curr.producaoValida || 0) * (curr.paginasPorProduto || 1) * (curr.valorUnitarioPagina || 0)), 0);

  return (
    <AppLayout>
      {modalClienteOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 p-4"><div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col h-[85vh]">
            <div className="p-4 border-b flex justify-between bg-slate-50"><h3 className="font-bold flex gap-2"><Search className="w-5 h-5 text-purple-600"/> Localizar Cliente</h3><Button variant="ghost" onClick={() => setModalClienteOpen(false)}><X className="w-5 h-5"/></Button></div>
            <Input className="m-4" placeholder="Pesquisar..." value={buscaModalCliente} onChange={e => setBuscaModalCliente(e.target.value)} autoFocus />
            <div className="flex-1 overflow-auto"><table className="w-full text-sm"><tbody>
                {clientesBD.filter(c => (c.nome_fantasia||"").toLowerCase().includes(buscaModalCliente.toLowerCase())).slice(0,50).map(c => <tr key={c.id} className="hover:bg-purple-50"><td className="p-3 font-bold">{c.nome_fantasia}</td><td className="p-3"><Button size="sm" onClick={() => { setClienteBusca(c.nome_fantasia); setModalClienteOpen(false); }}>Selecionar</Button></td></tr>)}
            </tbody></table></div>
        </div></div>
      )}
      {modalOperadorOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 p-4"><div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col h-[85vh]">
            <div className="p-4 border-b flex justify-between bg-slate-50"><h3 className="font-bold flex gap-2"><UserCheck className="w-5 h-5 text-indigo-600"/> Localizar Operador</h3><Button variant="ghost" onClick={() => setModalOperadorOpen(false)}><X className="w-5 h-5"/></Button></div>
            <Input className="m-4" placeholder="Pesquisar..." value={buscaModalOperador} onChange={e => setBuscaModalOperador(e.target.value)} autoFocus />
            <div className="flex-1 overflow-auto"><table className="w-full text-sm"><tbody>
                {operadoresBD.filter(o => (o.nome||"").toLowerCase().includes(buscaModalOperador.toLowerCase())).map(o => <tr key={o.id} className="hover:bg-indigo-50"><td className="p-3 font-bold">{o.nome}</td><td className="p-3"><Button size="sm" onClick={() => { modoSelecaoOperador === "criacao" ? setOperadorNome(o.nome) : setEditOperadorNome(o.nome); setModalOperadorOpen(false); }}>Selecionar</Button></td></tr>)}
            </tbody></table></div>
        </div></div>
      )}
      {modalEquipamentoOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 p-4"><div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col h-[85vh]">
            <div className="p-4 border-b flex justify-between bg-slate-50"><h3 className="font-bold flex gap-2"><Printer className="w-5 h-5 text-blue-600"/> Localizar Equipamento</h3><Button variant="ghost" onClick={() => setModalEquipamentoOpen(false)}><X className="w-5 h-5"/></Button></div>
            <Input className="m-4" placeholder="Pesquisar..." value={buscaModalEquipamento} onChange={e => setBuscaModalEquipamento(e.target.value)} autoFocus />
            <div className="flex-1 overflow-auto"><table className="w-full text-sm"><tbody>
                {equipamentosTC.filter(eq => (eq.log_produtos?.nome||"").toLowerCase().includes(buscaModalEquipamento.toLowerCase())).slice(0,50).map(eq => <tr key={eq.id} className="hover:bg-blue-50"><td className="p-3 font-bold">{eq.log_produtos?.nome} ({eq.numero_serie})</td><td className="p-3"><Button size="sm" onClick={() => { setEquipImpressaoId(eq.id); setModalEquipamentoOpen(false); }}>Selecionar</Button></td></tr>)}
            </tbody></table></div>
        </div></div>
      )}

      {abaAtiva === "abrir" ? (
        <div className="max-w-4xl mx-auto mt-6 mb-12 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white p-8 rounded-xl border shadow-sm space-y-6">
            <div className="text-center border-b pb-6"><div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 mb-3"><FileOutput className="w-6 h-6"/></div><h2 className="text-xl font-bold text-slate-800">Gerar Ordem de Serviço (OSG)</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2"><label className="text-sm font-bold text-slate-700">Cliente *</label><div onClick={() => setModalClienteOpen(true)} className="bg-slate-50 border p-2.5 rounded-md cursor-pointer">{clienteBusca || "Selecionar..."}</div></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Solicitante *</label><Input value={solicitante} onChange={e => setSolicitante(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Telefone</label><Input value={telefoneClienteOS} onChange={e => setTelefoneClienteOS(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">E-mail</label><Input value={emailClienteOS} onChange={e => setEmailClienteOS(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Data Solicitação *</label><Input type="date" value={dataSolicitacao} onChange={e => setDataSolicitacao(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Operador *</label><div onClick={() => { setModoSelecaoOperador("criacao"); setModalOperadorOpen(true); }} className="bg-slate-50 border p-2.5 rounded-md cursor-pointer">{operadorNome || "Selecionar..."}</div></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Previsão *</label><Input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} /></div>
              
              <div className="space-y-4 md:col-span-2 mt-4">
                  <div className="flex justify-between items-center"><h3 className="font-bold text-slate-700">Carrinho de Serviços / Produtos</h3><Button size="sm" onClick={() => setProdutosOSG([...produtosOSG, { id: crypto.randomUUID(), descricao: "", quantidade: 1, possuiImpressao: "Não", paginasPorProduto: 1, valorUnitario: 0, modoImpressao: "Simplex" }])} className="bg-purple-600 hover:bg-purple-700 text-white gap-2"><Plus className="w-4 h-4"/> Add Produto</Button></div>
                  {produtosOSG.map((prod, idx) => (
                      <div key={prod.id} className="p-4 bg-slate-50 border rounded-lg space-y-3 relative group">
                          {produtosOSG.length > 1 && <Button variant="destructive" size="sm" className="absolute top-2 right-2 h-6 w-6 p-0" onClick={() => setProdutosOSG(produtosOSG.filter(p => p.id !== prod.id))}><X className="w-4 h-4"/></Button>}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div className="space-y-1 md:col-span-2"><label className="text-xs font-bold text-slate-600">Descrição do Serviço</label><Input value={prod.descricao} onChange={e => setProdutosOSG(produtosOSG.map(p => p.id === prod.id ? { ...p, descricao: e.target.value } : p))} /></div>
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-600">Quantidade</label><Input type="number" min="1" value={prod.quantidade} onChange={e => setProdutosOSG(produtosOSG.map(p => p.id === prod.id ? { ...p, quantidade: Number(e.target.value) } : p))} /></div>
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-600">Impressão?</label>
                                  <Select value={prod.possuiImpressao} onValueChange={v => setProdutosOSG(produtosOSG.map(p => p.id === prod.id ? { ...p, possuiImpressao: v as "Sim"|"Não" } : p))}>
                                      <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[99999]"><SelectItem value="Não">Não</SelectItem><SelectItem value="Sim">Sim</SelectItem></SelectContent>
                                  </Select>
                              </div>
                              {prod.possuiImpressao === "Sim" && (
                                  <>
                                      <div className="space-y-1"><label className="text-xs font-bold text-blue-700">Págs p/ Produto</label><Input type="number" min="1" value={prod.paginasPorProduto} onChange={e => setProdutosOSG(produtosOSG.map(p => p.id === prod.id ? { ...p, paginasPorProduto: Number(e.target.value) } : p))} /></div>
                                      <div className="space-y-1"><label className="text-xs font-bold text-blue-700">Valor Un. Pág</label><Input type="number" step="0.01" value={prod.valorUnitario} onChange={e => setProdutosOSG(produtosOSG.map(p => p.id === prod.id ? { ...p, valorUnitario: parseFloat(e.target.value)||0 } : p))} /></div>
                                      <div className="space-y-1 md:col-span-2"><label className="text-xs font-bold text-blue-700">Modo</label>
                                          <Select value={prod.modoImpressao} onValueChange={v => setProdutosOSG(produtosOSG.map(p => p.id === prod.id ? { ...p, modoImpressao: v as "Simplex"|"Duplex" } : p))}>
                                              <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[99999]"><SelectItem value="Simplex">Simplex</SelectItem><SelectItem value="Duplex">Duplex</SelectItem></SelectContent>
                                          </Select>
                                      </div>
                                  </>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
            </div>
            <div className="flex gap-4 pt-4"><Button variant="outline" onClick={() => setAbaAtiva("painel")} className="h-12 w-1/3">Voltar</Button><Button onClick={criarOS} disabled={salvandoOS} className="h-12 w-2/3 bg-purple-600 text-white font-bold">{salvandoOS ? "Gerando..." : "Enviar OSG"}</Button></div>
          </div>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-6rem)] overflow-hidden bg-slate-50">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="bg-white p-4 border-b flex flex-col md:flex-row justify-between items-center shadow-sm z-10 gap-4 w-full">
              <div className="flex-shrink-0">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-600"/> Kanban Produção
                </h2>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input placeholder="Buscar OSG..." value={buscaOS} onChange={e => setBuscaOS(e.target.value)} className="pl-9 w-full md:w-64" />
                </div>
                
                {osSelecionadasLote.length > 0 && !osSelecionada && (
                  <div className="flex gap-2 bg-blue-50 p-1 rounded-md border border-blue-100 shrink-0">
                    <Button onClick={() => gerarComprovantePDF(ordens.filter(o => osSelecionadasLote.includes(o.id)))} size="sm" variant="ghost" className="text-blue-700 hover:bg-blue-100 gap-1 h-8">
                      <FileText className="w-4 h-4"/> Comprovante
                    </Button>
                    <Button onClick={() => gerarExtratoFaturamentoPDF(ordens.filter(o => osSelecionadasLote.includes(o.id)))} size="sm" variant="ghost" className="text-emerald-700 hover:bg-emerald-100 gap-1 h-8">
                      <Landmark className="w-4 h-4"/> Extrato
                    </Button>
                  </div>
                )}
                
                <Button onClick={() => setAbaAtiva("abrir")} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shrink-0 h-9">
                  <Plus className="w-4 h-4"/> Nova OSG
                </Button>
              </div>
            </div>

            {!osSelecionada && (
                <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar flex gap-6 bg-slate-100 p-6 min-w-0">
                  {STATUS_FLUXO_GRAFICA.map(col => {
                    const cards = ordens.filter(o => (col === "Concluído" && o.status === "Cancelado") || o.status === col).filter(o => (o.cliente_nome||"").toLowerCase().includes(buscaOS.toLowerCase()) || (o.numero_op||"").toString().includes(buscaOS));
                    const isC = col === "Concluído" && !mostrarConcluidos;
                    return (
                    <div key={col} className={`shrink-0 flex flex-col bg-slate-200/50 rounded-xl border max-h-full transition-all ${isC ? 'w-64' : 'w-80'}`}>
                      <div className="p-3 border-b bg-slate-200 rounded-t-xl flex justify-between">
                        <div className="flex items-center gap-2"><h3 className="font-bold text-sm">{col}</h3><span className="bg-slate-300 text-xs px-2 rounded-full">{cards.length}</span></div>
                        {col === "Concluído" && mostrarConcluidos && <Button variant="ghost" size="sm" onClick={() => setMostrarConcluidos(false)} className="h-6 text-[10px]">Ocultar</Button>}
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {isC ? (
                          <div className="flex-1 flex flex-col items-center justify-center p-4 mt-8"><CheckCircle2 className="w-8 h-8 text-slate-400 mb-3" /><h4 className="text-xl font-bold text-blue-600 mb-6">{cards.length} OSG's</h4><Button onClick={() => setMostrarConcluidos(true)} className="bg-slate-800 text-white w-full text-xs">Visualizar Todos</Button></div>
                        ) : cards.map(os => (
                              <div key={os.id} onClick={() => abrirPrancheta(os)} className="bg-white p-3 rounded-lg border shadow-sm cursor-pointer relative group flex flex-col">
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100"><input type="checkbox" checked={osSelecionadasLote.includes(os.id)} onChange={e => e.target.checked ? setOsSelecionadasLote([...osSelecionadasLote, os.id]) : setOsSelecionadasLote(osSelecionadasLote.filter(id => id !== os.id))} onClick={e => e.stopPropagation()} /></div>
                                <span className="text-[10px] font-black text-purple-700">OSG-{String(os.numero_op).padStart(4,'0')}</span>
                                <h4 className="font-bold text-sm mb-1 line-clamp-2">{os.cliente_nome}</h4>
                                <p className="text-[10px] text-slate-500 mb-2 line-clamp-2">{os.produtos ? os.produtos.map((p:any)=>p.descricao).join(', ') : os.descricao_servico}</p>
                              </div>
                        ))}
                      </div>
                    </div>
                    )
                  })}
                </div>
            )}

            {osSelecionada && (
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                <div className="max-w-6xl mx-auto space-y-6">
                  <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-purple-600">
                      <div className="flex items-center gap-3">
                          <Button variant="ghost" size="sm" onClick={() => setOsSelecionada(null)}><ArrowLeft className="w-4 h-4"/></Button>
                          <h2 className="text-2xl font-black uppercase">OSG-{String(osSelecionada.numero_op).padStart(4,'0')}</h2>
                          <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded">{osSelecionada.cliente_nome}</span>
                      </div>
                      <div className="flex items-center gap-3">
                          <Button variant="outline" size="sm" onClick={() => gerarComprovantePDF([osSelecionada])}>Comprovante</Button>
                          <Button variant="outline" size="sm" className="text-emerald-700" onClick={() => gerarExtratoFaturamentoPDF([osSelecionada])}>Extrato</Button>
                          <Select value={statusOS} onValueChange={setStatusOS}><SelectTrigger className="w-48 bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[99999]">{STATUS_FLUXO_GRAFICA.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}<SelectItem value="Cancelado" className="text-red-600">Cancelado</SelectItem></SelectContent></Select>
                          <Button onClick={() => salvarAndamento()} disabled={salvandoOS} className="bg-purple-600 text-white">Salvar</Button>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                          <h4 className="font-bold text-slate-800 flex items-center gap-2"><Edit2 className="w-4 h-4"/> Edição da OSG</h4>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Previsão</label><Input type="date" value={editDataPrevista} onChange={e => setEditDataPrevista(e.target.value)} className="h-8" /></div>
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Solicitante</label><Input value={editSolicitante} onChange={e => setEditSolicitante(e.target.value)} className="h-8" /></div>
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Operador</label><div onClick={() => { setModoSelecaoOperador("edicao"); setModalOperadorOpen(true); }} className="bg-slate-50 border h-8 px-3 rounded flex items-center">{editOperadorNome || "Selecionar"}</div></div>
                          </div>
                          
                          <div className="space-y-3 pt-4 border-t">
                              <div className="flex justify-between items-center"><h5 className="font-bold text-sm text-slate-700">Produtos da OSG</h5><Button size="sm" onClick={() => setEditProdutosOSG([...editProdutosOSG, { id: crypto.randomUUID(), descricao: "", quantidade: 1, possuiImpressao: "Não", paginasPorProduto: 1, valorUnitario: 0, modoImpressao: "Simplex" }])} className="h-7 text-xs bg-slate-800 text-white"><Plus className="w-3 h-3 mr-1"/> Produto</Button></div>
                              {editProdutosOSG.map((prod) => (
                                  <div key={prod.id} className="p-3 bg-slate-50 border rounded-lg space-y-2 relative group">
                                      {editProdutosOSG.length > 1 && <Button variant="destructive" size="sm" className="absolute top-2 right-2 h-6 w-6 p-0" onClick={() => setEditProdutosOSG(editProdutosOSG.filter(p => p.id !== prod.id))}><X className="w-4 h-4"/></Button>}
                                      <div className="grid grid-cols-4 gap-2">
                                          <div className="col-span-2 space-y-1"><label className="text-[10px] font-bold uppercase">Descrição</label><Input value={prod.descricao} onChange={e => setEditProdutosOSG(editProdutosOSG.map(p => p.id === prod.id ? { ...p, descricao: e.target.value } : p))} className="h-7 text-xs" /></div>
                                          <div className="space-y-1"><label className="text-[10px] font-bold uppercase">Qtd</label><Input type="number" min="1" value={prod.quantidade} onChange={e => setEditProdutosOSG(editProdutosOSG.map(p => p.id === prod.id ? { ...p, quantidade: Number(e.target.value) } : p))} className="h-7 text-xs" /></div>
                                          <div className="space-y-1"><label className="text-[10px] font-bold uppercase">Impressão?</label><Select value={prod.possuiImpressao} onValueChange={v => setEditProdutosOSG(editProdutosOSG.map(p => p.id === prod.id ? { ...p, possuiImpressao: v as "Sim"|"Não" } : p))}><SelectTrigger className="h-7 text-xs bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[99999]"><SelectItem value="Não">Não</SelectItem><SelectItem value="Sim">Sim</SelectItem></SelectContent></Select></div>
                                          
                                          {prod.possuiImpressao === "Sim" && (
                                              <>
                                                  <div className="space-y-1"><label className="text-[10px] font-bold text-blue-700 uppercase">Págs/Prod</label><Input type="number" min="1" value={prod.paginasPorProduto} onChange={e => setEditProdutosOSG(editProdutosOSG.map(p => p.id === prod.id ? { ...p, paginasPorProduto: Number(e.target.value) } : p))} className="h-7 text-xs border-blue-200" /></div>
                                                  <div className="space-y-1"><label className="text-[10px] font-bold text-blue-700 uppercase">Valor Un</label><Input type="number" step="0.01" value={prod.valorUnitario} onChange={e => setEditProdutosOSG(editProdutosOSG.map(p => p.id === prod.id ? { ...p, valorUnitario: parseFloat(e.target.value)||0 } : p))} className="h-7 text-xs border-blue-200" /></div>
                                                  <div className="col-span-2 space-y-1"><label className="text-[10px] font-bold text-blue-700 uppercase">Modo</label><Select value={prod.modoImpressao} onValueChange={v => setEditProdutosOSG(editProdutosOSG.map(p => p.id === prod.id ? { ...p, modoImpressao: v as "Simplex"|"Duplex" } : p))}><SelectTrigger className="h-7 text-xs border-blue-200 bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[99999]"><SelectItem value="Simplex">Simplex</SelectItem><SelectItem value="Duplex">Duplex</SelectItem></SelectContent></Select></div>
                                              </>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {editProdutosOSG.some(p => p.possuiImpressao === "Sim") && (
                          <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl space-y-4">
                              <div className="flex justify-between items-center"><h3 className="font-bold text-blue-900"><Printer className="w-5 h-5 inline mr-2"/> Apontamento de Impressão Global</h3><span className="text-xs font-bold text-slate-600 bg-white px-2 py-1 rounded border">Demanda Impressões: {qtdNecessariaGeral} un | Feito: {totalProd} un</span></div>
                              
                              {historicoProducao.length > 0 && (
                                  <div className="bg-white rounded border overflow-hidden"><table className="w-full text-xs text-left"><thead className="bg-slate-50 border-b"><tr><th className="p-2">Eqp/Data</th><th className="p-2">Inicial</th><th className="p-2">Final</th><th className="p-2">Validados</th><th className="p-2">Desperdício</th></tr></thead><tbody>
                                      {historicoProducao.map(h => <tr key={h.id} className="border-b hover:bg-slate-50"><td className="p-2 truncate max-w-[100px]">{h.equipamentoNome}</td><td className="p-2 font-mono">{h.contadorInicial}</td><td className="p-2 font-mono">{h.contadorFinal||'-'}</td><td className="p-2 text-emerald-600 font-bold">+{h.producaoValida||0}</td><td className="p-2 text-rose-500 font-bold">{h.desperdicio||'-'}</td></tr>)}
                                  </tbody></table></div>
                              )}

                              {statusImpressao === "pendente" && totalProd < qtdNecessariaGeral && (
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1 col-span-2"><label className="text-xs font-bold text-blue-800">Equipamento</label><div onClick={() => setModalEquipamentoOpen(true)} className="bg-white border-blue-300 h-9 px-3 rounded flex items-center cursor-pointer">{equipImpressaoId ? equipamentosTC.find(x => x.id === equipImpressaoId)?.log_produtos?.nome : "Pesquisar..."}</div></div>
                                      <div className="space-y-1"><label className="text-xs font-bold text-blue-800">Qtd a Imprimir</label><Input type="number" max={qtdNecessariaGeral - totalProd} value={qtdImprimirServico} onChange={e => setQtdImprimirServico(Number(e.target.value))} className="h-9" /></div>
                                      <div className="space-y-1"><label className="text-xs font-bold text-blue-800">Páginas/Prod (Média)</label><Input type="number" value={paginasPorProduto} onChange={e => setPaginasPorProduto(Number(e.target.value))} className="h-9" /></div>
                                      <div className="space-y-1"><label className="text-xs font-bold text-blue-800">Valor Un.</label><Input type="number" step="0.01" value={valorUnitarioPagina} onChange={e => setValorUnitarioPagina(e.target.value)} className="h-9" /></div>
                                      <div className="space-y-1"><label className="text-xs font-bold text-blue-800">Modo</label><Select value={modoImpressao} onValueChange={setModoImpressao}><SelectTrigger className="h-9 bg-white z-[99999]"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[99999]"><SelectItem value="Simplex">Simplex</SelectItem><SelectItem value="Duplex">Duplex</SelectItem></SelectContent></Select></div>
                                      <div className="space-y-1 col-span-2"><label className="text-xs font-bold text-rose-600">Contador Inicial</label><div className="flex gap-2"><Input type="number" value={contadorInicial} onChange={e => setContadorInicial(e.target.value)} className="h-10 border-rose-300 font-bold" /><Button onClick={iniciarImpressao} className="bg-blue-600 text-white h-10 px-6">Iniciar</Button></div></div>
                                  </div>
                              )}
                              {statusImpressao === "imprimindo" && (
                                  <div className="bg-white p-6 rounded-lg text-center space-y-4 shadow-inner border border-blue-200">
                                      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto"/><h3 className="font-bold text-blue-900">Imprimindo...</h3>
                                      <div className="max-w-xs mx-auto space-y-2 text-left"><label className="text-xs font-bold text-rose-600">Contador Final</label><Input type="number" value={contadorFinal} onChange={e => setContadorFinal(e.target.value)} className="border-rose-300 font-bold" /><Button onClick={finalizarImpressao} className="w-full bg-emerald-600 text-white font-bold mt-2">Registrar Lote</Button></div>
                                  </div>
                              )}
                          </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}