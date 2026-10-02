import { useState, useEffect, useRef } from "react";
import AppLayout from "@/shared/components/layout/AppLayout";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Printer, Layers, CheckCircle2, Plus, Search, Trash2, ArrowLeft, PaintBucket, FileOutput, PlayCircle, AlertCircle, Save, Paperclip, Download, Loader2, Landmark, DollarSign, Activity, User, CalendarDays, UserCheck, FileText, MessageSquare, Edit2, Ban, X, Send, Mail } from "lucide-react";
import { supabase } from "@/shared/lib/supabase/client";
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
    id: string; data: string; equipamentoId: string; equipamentoNome: string; modo: string; 
    qtdSolicitada: number; contadorInicial: number; contadorFinal?: number; producaoValida?: number; 
    desperdicio?: number; status: 'imprimindo' | 'concluido'; paginasPorProduto: number; valorUnitarioPagina: number; 
};

const STATUS_FLUXO_GRAFICA = [
  "Solicitação Recebida", "Levantamento de Material", "Fechamento de Arquivo",
  "Impressão", "Acabamento", "Pronto para Expedição", "Entregue", "Faturamento", "Concluído"
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
  const [observacoesOS, setObservacoesOS] = useState(""); 
  const [produtosOSG, setProdutosOSG] = useState<ProdutoOSG[]>([{ id: crypto.randomUUID(), descricao: "", quantidade: 1, possuiImpressao: "Não", paginasPorProduto: 1, valorUnitario: 0, modoImpressao: "Simplex" }]);

  const [salvandoOS, setSalvandoOS] = useState(false);
  const [exportando, setExportando] = useState(false);

  // MODAIS
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [buscaModalCliente, setBuscaModalCliente] = useState("");

  const [modalOperadorOpen, setModalOperadorOpen] = useState(false);
  const [buscaModalOperador, setBuscaModalOperador] = useState("");
  const [modoSelecaoOperador, setModoSelecaoOperador] = useState<"criacao" | "edicao">("criacao");

  const [modalInsumoOpen, setModalInsumoOpen] = useState(false);
  const [buscaModalInsumo, setBuscaModalInsumo] = useState("");

  const [modalEquipamentoOpen, setModalEquipamentoOpen] = useState(false);
  const [buscaModalEquipamento, setBuscaModalEquipamento] = useState("");

  // PAINEL E EDIÇÃO
  const [ordens, setOrdens] = useState<any[]>([]);
  const [buscaOS, setBuscaOS] = useState("");
  const [osSelecionada, setOsSelecionada] = useState<any | null>(null);
  const [osSelecionadasLote, setOsSelecionadasLote] = useState<string[]>([]);
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false); 
  
  const [statusOS, setStatusOS] = useState("");
  const [insumos, setInsumos] = useState<InsumoOS[]>([]);
  const [historicoProducao, setHistoricoProducao] = useState<ApontamentoProducao[]>([]);

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

  // TIMELINE E ANEXOS
  const [timeline, setTimeline] = useState<any[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [anexos, setAnexos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [emailTriggers, setEmailTriggers] = useState<any[]>([]);
  const [modalConfirmarEmail, setModalConfirmarEmail] = useState(false);
  const [dadosEmailPendente, setDadosEmailPendente] = useState<any>(null);

  // Variáveis calculadas de forma segura
  const qtdNecessariaGeral = (editProdutosOSG || []).filter(p => p.possuiImpressao === "Sim").reduce((a, p) => a + (Number(p.quantidade) || 0), 0);
  const totalProd = (historicoProducao || []).filter(h => h.status === 'concluido').reduce((a, c) => a + (Number(c.producaoValida) || 0), 0);
  const totalReceitaGerada = (historicoProducao || []).filter(h => h.status === 'concluido').reduce((acc, curr) => acc + ((Number(curr.producaoValida) || 0) * (Number(curr.paginasPorProduto) || 1) * (Number(curr.valorUnitarioPagina) || 0)), 0);

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
      const novaTimeline = observacoesOS.trim() ? [{ id: crypto.randomUUID(), data: new Date().toISOString(), usuario: usuarioAtual?.user_metadata?.full_name || 'Equipe Gráfica', texto: observacoesOS }] : [];

      const payload = {
        cliente_nome: clienteBusca, solicitante: solicitante, data_solicitacao: dataSolicitacao,
        telefone_cliente: telefoneClienteOS, email_cliente: emailClienteOS,
        operador_nome: operadorNome, produtos: produtosOSG,
        data_prevista: dataPrevista || null, status: 'Solicitação Recebida', observacoes: observacoesOS, historico_producao: [], 
        timeline: novaTimeline,
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
      setOperadorNome(""); setDataPrevista(""); setTelefoneClienteOS(""); setEmailClienteOS(""); setObservacoesOS("");
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

  const selecionarInsumo = (prod: any) => {
    setInsumos([...insumos, { id: crypto.randomUUID(), produtoId: prod.id, nome: prod.nome, quantidade: 1, custoUn: prod.custo_base || 0, estoqueAtual: prod.estoque_atual || 0 }]);
    setModalInsumoOpen(false); setBuscaModalInsumo("");
  };

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
        descricao_servico: editProdutosOSG[0]?.descricao, quantidade_produzir: editProdutosOSG[0]?.quantidade, paginas_por_produto: editProdutosOSG[0]?.paginasPorProduto
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
    const tProd = novoHistorico.filter(h => h.status === 'concluido').reduce((a, c) => a + (c.producaoValida || 0), 0);
    const qtdNecessaria = editProdutosOSG.filter((p: any) => p.possuiImpressao === "Sim").reduce((acc, p) => acc + p.quantidade, 0);
    setQtdImprimirServico(Math.max(0, qtdNecessaria - tProd));
  };

  const getBase64ImageFromUrl = async (u: string) => { try { const r = await fetch(u); const b = await r.blob(); return new Promise<string>((res) => { const reader = new FileReader(); reader.onloadend = () => res(reader.result as string); reader.readAsDataURL(b); }); } catch { return null; } };

  const drawTimbrado = (doc: any, pageWidth: number, pageHeight: number, logoBase64: string | null) => {
      doc.setFillColor(255, 255, 255); doc.rect(0, 0, pageWidth, 42, "F"); 
      const splitPoint = pageWidth * 0.65;
      doc.setFillColor(0, 0, 0); doc.rect(0, 0, splitPoint, 15, "F"); 
      doc.setFillColor(128, 130, 133); doc.rect(splitPoint, 0, pageWidth - splitPoint, 15, "F");
      doc.setFillColor(255, 255, 255);
      doc.triangle(splitPoint - 5, 0, splitPoint + 5, 0, splitPoint - 2, 15, "F");
      doc.triangle(splitPoint + 5, 0, splitPoint + 8, 15, splitPoint - 2, 15, "F");
      if (logoBase64) doc.addImage(logoBase64, "PNG", 14, 18, 40, 15);
      doc.setFillColor(0, 0, 0); doc.rect(0, pageHeight - 25, pageWidth, 25, "F");
      doc.setFont("times", "normal"); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255); 
      doc.text("Av. Gov. José Malcher, 2266.\nSão Brás, Belém - PA. CEP: 66060-232\n\nCNPJ: 07.679.989/0001-50 | I.E.: 15.250.057-0", 14, pageHeight - 17);
      const rightX = pageWidth - 60;
      doc.text("91 98156-6886", rightX, pageHeight - 17); doc.text("(91) 3366-5100", rightX, pageHeight - 13); doc.text("tcservicos@tccopiadoras.com.br", rightX, pageHeight - 9);
      doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.3);
      doc.circle(rightX - 4, pageHeight - 18, 1.5, "S"); doc.line(rightX - 5.2, pageHeight - 17, rightX - 5.5, pageHeight - 16); doc.line(rightX - 5.5, pageHeight - 16, rightX - 4.5, pageHeight - 16.7);
      doc.rect(rightX - 5, pageHeight - 14.5, 2, 3, "S"); doc.line(rightX - 4.5, pageHeight - 12, rightX - 3.5, pageHeight - 12);
      doc.rect(rightX - 5.5, pageHeight - 10.5, 3, 2, "S"); doc.line(rightX - 5.5, pageHeight - 10.5, rightX - 4, pageHeight - 9.5); doc.line(rightX - 4, pageHeight - 9.5, rightX - 2.5, pageHeight - 10.5);
  };
  
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
              theme: 'grid', styles: { font: 'times', fontSize: 9, cellPadding: 3, lineColor: [200,200,200], lineWidth: 0.1 }, headStyles: { fillColor: [240,240,240], textColor: [0,0,0], fontStyle: 'bold', halign: 'center' },
              didDrawPage: () => drawTimbrado(doc, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), logoBase64)
          });

          let finalY = (doc as any).lastAutoTable.finalY + 20;
          if (finalY + 50 > doc.internal.pageSize.getHeight() - 35) { doc.addPage(); finalY = 50; }
          doc.setFont("times", "normal"); doc.setFontSize(11);
          doc.text("Cliente: ___________________________________________________", 14, finalY);
          doc.text("Data da Entrega: __________________", 14, finalY + 10);
          doc.text("________________________________________", doc.internal.pageSize.getWidth() / 2, finalY + 30, { align: "center" });
          doc.setFont("times", "bold"); doc.text(String(osList[0].operador_nome || 'Operador Não Informado').toUpperCase(), doc.internal.pageSize.getWidth() / 2, finalY + 35, { align: "center" });
          doc.setFont("times", "normal"); doc.text("TC COMÉRCIO DE SERVIÇOS E TECNOLOGIA LTDA\nCNPJ: 07.679.989/0001-50", doc.internal.pageSize.getWidth() / 2, finalY + 40, { align: "center" });

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
          const rs = clienteObj?.razao_social || osList[0].cliente_nome; const cnpj = clienteObj?.cnpj_cpf || "Não informado";
          
          doc.setFont("times", "bold"); doc.setFontSize(11);
          doc.text(`Belém/PA, ${String(new Date().getDate()).padStart(2,'0')}/${String(new Date().getMonth()+1).padStart(2,'0')}/${new Date().getFullYear()}`, 280, 45, { align: "right" });
          doc.text(`À (O) ${String(rs).toUpperCase()}`, 14, 55); doc.text(`CNPJ: ${cnpj}`, 14, 60);
          doc.setFontSize(12); doc.text(`EXTRATO DE FATURAMENTO`, 148, 75, { align: "center" });

          let totalGeralPaginas = 0; let totalGeralFinanceiro = 0; const tableRows: any[] = [];
          
          osList.forEach(os => {
              const produtos = (os.produtos && os.produtos.length > 0) ? os.produtos : [{ descricao: os.descricao_servico, quantidade: os.quantidade_produzir, possuiImpressao: os.observacoes?.includes("[Possui Impressão: Sim]") ? "Sim" : "Não", paginasPorProduto: os.paginas_por_produto || 1, valorUnitario: os.valor_unitario_pagina || 0 }];
              let totalOsImpressoes = 0; let totalOsFinanceiro = 0;
              
              produtos.forEach((prod: any, idx: number) => {
                  const ppProduto = prod.paginasPorProduto || 1;
                  const totalImpressoes = prod.possuiImpressao === "Sim" ? (prod.quantidade * ppProduto) : 0;
                  const valorUn = prod.valorUnitario || 0;
                  const totalRS = totalImpressoes * valorUn;
                  
                  totalOsImpressoes += totalImpressoes; totalGeralPaginas += totalImpressoes;
                  totalOsFinanceiro += totalRS; totalGeralFinanceiro += totalRS;
                  
                  const row: any[] = [];
                  if (idx === 0) {
                      row.push({ content: os.data_solicitacao ? new Date(os.data_solicitacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : "-", rowSpan: produtos.length, styles: { valign: 'middle' } });
                      row.push({ content: os.solicitante || "-", rowSpan: produtos.length, styles: { valign: 'middle' } });
                      row.push({ content: `OSG-${String(os.numero_op).padStart(4, '0')}`, rowSpan: produtos.length, styles: { valign: 'middle' } });
                  }
                  row.push(prod.descricao || "-"); row.push(prod.quantidade || 0); row.push(prod.possuiImpressao === "Sim" ? ppProduto : "-"); row.push(prod.possuiImpressao === "Sim" ? totalImpressoes : "-");
                  row.push(prod.possuiImpressao === "Sim" ? `R$ ${valorUn.toFixed(2)}` : "-"); row.push(prod.possuiImpressao === "Sim" ? `R$ ${totalRS.toFixed(2)}` : "-");
                  tableRows.push(row);
              });
              tableRows.push([{ content: `TOTAL DA OSG-${String(os.numero_op).padStart(4, '0')}`, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: [245,245,245] } }, { content: totalOsImpressoes.toString(), styles: { fontStyle: 'bold', halign: 'center', fillColor: [245,245,245] } }, { content: "-", styles: { halign: 'center', fillColor: [245,245,245] } }, { content: `R$ ${totalOsFinanceiro.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245,245,245] } }]);
          });
          tableRows.push([{ content: "TOTAL GERAL", colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: [220,220,220] } }, { content: totalGeralPaginas.toString(), styles: { fontStyle: 'bold', halign: 'center', fillColor: [220,220,220] } }, { content: "-", styles: { halign: 'center', fillColor: [220,220,220] } }, { content: `R$ ${totalGeralFinanceiro.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [220,220,220] } }]);

          autoTable(doc, {
              head: [["DATA", "SOLICITANTE", "OSG", "PRODUTO", "QTD", "P.P P/ PRODUTO", "TOTAL IMPRESSÕES", "VALOR UN.", "TOTAL (R$)"]], body: tableRows, startY: 85,
              theme: 'grid', styles: { font: 'times', fontSize: 8, cellPadding: 2, lineColor: [200,200,200], lineWidth: 0.1 }, headStyles: { fillColor: [240,240,240], textColor: [0,0,0], fontStyle: 'bold', halign: 'center' },
              didDrawPage: () => drawTimbrado(doc, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), logoBase64)
          });
          doc.save(`Extrato_Faturamento_${osList[0].cliente_nome.replace(/\s+/g, '_')}.pdf`);
      } catch (e) { alert("Erro ao gerar Extrato PDF."); } finally { setExportando(false); }
  };

  return (
    <AppLayout>
      {modalClienteOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 p-4"><div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col h-[85vh]">
            <div className="p-4 border-b flex justify-between bg-slate-50"><h3 className="font-bold flex gap-2"><Search className="w-5 h-5 text-purple-600"/> Localizar Cliente</h3><Button variant="ghost" onClick={() => setModalClienteOpen(false)}><X className="w-5 h-5"/></Button></div>
            <Input className="m-4 border-purple-200" placeholder="Pesquise por Razão Social, Nome Fantasia ou CNPJ..." value={buscaModalCliente} onChange={e => setBuscaModalCliente(e.target.value)} autoFocus />
            <div className="flex-1 overflow-auto"><table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase"><tr><th className="p-3">Cliente</th><th className="p-3">CNPJ / CPF</th><th className="p-3">Ação</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                {clientesBD.filter(c => (c.nome_fantasia||"").toLowerCase().includes(buscaModalCliente.toLowerCase()) || (c.razao_social||"").toLowerCase().includes(buscaModalCliente.toLowerCase()) || (c.cnpj_cpf||"").includes(buscaModalCliente)).slice(0,50).map(c => 
                    <tr key={c.id} className="hover:bg-purple-50">
                        <td className="p-3"><p className="font-bold text-slate-800">{c.nome_fantasia || c.razao_social}</p>{c.nome_fantasia && c.razao_social !== c.nome_fantasia && <p className="text-[10px] text-slate-500">{c.razao_social}</p>}</td>
                        <td className="p-3 font-mono text-xs text-slate-600">{c.cnpj_cpf || '-'}</td>
                        <td className="p-3"><Button size="sm" onClick={() => { setClienteBusca(c.nome_fantasia || c.razao_social); setModalClienteOpen(false); }}>Selecionar</Button></td>
                    </tr>
                )}
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
      {modalInsumoOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 p-4"><div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col h-[85vh]">
            <div className="p-4 border-b flex justify-between bg-slate-50"><h3 className="font-bold flex gap-2"><PaintBucket className="w-5 h-5 text-purple-600"/> Localizar Insumo</h3><Button variant="ghost" onClick={() => setModalInsumoOpen(false)}><X className="w-5 h-5"/></Button></div>
            <Input className="m-4" placeholder="Pesquise por Nome ou Código SKU..." value={buscaModalInsumo} onChange={e => setBuscaModalInsumo(e.target.value)} autoFocus />
            <div className="flex-1 overflow-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-100 text-[10px] uppercase"><tr><th className="p-3">SKU</th><th className="p-3">Nome</th><th className="p-3">Ação</th></tr></thead><tbody>
                {produtosBD.filter(p => (p.nome||"").toLowerCase().includes(buscaModalInsumo.toLowerCase())).slice(0,50).map(p => <tr key={p.id} className="hover:bg-purple-50"><td className="p-3 text-xs font-mono text-slate-500">{p.sku||'S/N'}</td><td className="p-3 font-bold">{p.nome}</td><td className="p-3"><Button size="sm" onClick={() => selecionarInsumo(p)}>Adicionar</Button></td></tr>)}
            </tbody></table></div>
        </div></div>
      )}

      {abaAtiva === "abrir" ? (
        <div className="max-w-4xl mx-auto mt-6 mb-12 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white p-8 rounded-xl border shadow-sm space-y-6">
            <div className="text-center border-b pb-6"><div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 mb-3"><FileOutput className="w-6 h-6"/></div><h2 className="text-xl font-bold text-slate-800">Gerar Ordem de Serviço (OSG)</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2"><label className="text-sm font-bold text-slate-700">Cliente *</label><div onClick={() => setModalClienteOpen(true)} className="bg-slate-50 border p-2.5 rounded-md cursor-pointer hover:border-purple-300">{clienteBusca || "Selecionar Cliente..."}</div></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><User className="w-4 h-4 text-slate-400"/> Solicitante *</label><Input value={solicitante} onChange={e => setSolicitante(e.target.value)} placeholder="Ex: Tais Santos" /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Telefone de Contato</label><Input value={telefoneClienteOS} onChange={e => setTelefoneClienteOS(e.target.value)} placeholder="Ex: (91) 98123-4567" /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">E-mail de Contato</label><Input type="email" value={emailClienteOS} onChange={e => setEmailClienteOS(e.target.value)} placeholder="Ex: cliente@empresa.com" /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-400"/> Data Solicitação *</label><Input type="date" value={dataSolicitacao} onChange={e => setDataSolicitacao(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><UserCheck className="w-4 h-4 text-indigo-400"/> Operador *</label><div onClick={() => { setModoSelecaoOperador("criacao"); setModalOperadorOpen(true); }} className="bg-slate-50 border p-2.5 rounded-md cursor-pointer hover:border-indigo-300">{operadorNome || "Selecionar Operador..."}</div></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Data Prevista *</label><Input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} /></div>
              
              <div className="space-y-2 md:col-span-2 mt-2 pt-4 border-t border-slate-100">
                  <label className="text-sm font-bold text-slate-700">Observações / Follow-up Inicial</label>
                  <textarea value={observacoesOS} onChange={e => setObservacoesOS(e.target.value)} className="w-full min-h-[80px] p-3 border border-slate-200 rounded-md bg-slate-50 text-sm focus:ring-purple-500 focus:border-purple-500 custom-scrollbar" placeholder="Insira observações relevantes para esta OSG..."></textarea>
              </div>

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
            <div className="flex gap-4 pt-4"><Button variant="outline" onClick={() => setAbaAtiva("painel")} className="h-12 w-1/3 border-slate-300 text-slate-600">Cancelar e Voltar</Button><Button onClick={criarOS} disabled={salvandoOS} className="h-12 w-2/3 bg-purple-600 text-white font-bold">{salvandoOS ? "Gerando..." : "Enviar para Fila de Produção"}</Button></div>
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
                    <div key={col} className={`shrink-0 flex flex-col bg-slate-200/50 rounded-xl border border-slate-300/60 max-h-full transition-all duration-300 ${isC ? 'w-64' : 'w-80'}`}>
                      <div className="p-3 border-b bg-slate-200 rounded-t-xl flex justify-between items-center">
                        <div className="flex items-center gap-2"><h3 className="font-bold text-slate-700 text-sm">{col}</h3><span className="bg-slate-300 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{cards.length}</span></div>
                        {col === "Concluído" && mostrarConcluidos && <Button variant="ghost" size="sm" onClick={() => setMostrarConcluidos(false)} className="h-6 text-[10px]">Ocultar</Button>}
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar flex flex-col">
                        {isC ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 mt-8"><CheckCircle2 className="w-8 h-8 text-slate-400 mb-3" /><h4 className="text-xl font-bold text-blue-600 mb-6">{cards.length} OSG's</h4><Button onClick={() => setMostrarConcluidos(true)} className="bg-slate-800 text-white w-full text-xs">Visualizar Todos</Button></div>
                        ) : cards.map(os => (
                              <div key={os.id} onClick={() => abrirPrancheta(os)} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm cursor-pointer relative group flex flex-col hover:border-purple-400 transition-all">
                                <div className={`absolute top-3 right-3 transition-opacity ${osSelecionadasLote.includes(os.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} onClick={(e) => e.stopPropagation()}>
                                    <input type="checkbox" checked={osSelecionadasLote.includes(os.id)} onChange={e => { if (e.target.checked) setOsSelecionadasLote([...osSelecionadasLote, os.id]); else setOsSelecionadasLote(osSelecionadasLote.filter(id => id !== os.id)); }} className="w-4 h-4 text-purple-600 rounded cursor-pointer shadow-sm border-slate-300" />
                                </div>
                                <div className="flex justify-between items-start mb-2 pr-6">
                                    <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">OSG-{String(os.numero_op).padStart(4,'0')}</span>
                                    {os.data_prevista && <span className={`flex items-center gap-1 text-[9px] font-bold ${new Date(os.data_prevista) < new Date() ? 'text-red-500' : 'text-slate-400'}`}><CalendarDays className="w-3 h-3"/> {new Date(os.data_prevista).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>}
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2">{os.cliente_nome}</h4>
                                <p className="text-[10px] text-slate-500 mb-2 line-clamp-2">{os.produtos ? os.produtos.map((p:any)=>p.descricao).join(', ') : os.descricao_servico}</p>
                                <div className="flex flex-col gap-1 pt-2 border-t border-slate-50 mt-auto">
                                    <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-500 truncate"><User className="w-3 h-3 text-emerald-500 shrink-0"/> {os.solicitante || 'Não informado'}</div>
                                    <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-500 truncate"><UserCheck className="w-3 h-3 text-indigo-400 shrink-0"/> {os.operador_nome || 'Não atribuído'}</div>
                                </div>
                              </div>
                        ))}
                      </div>
                    </div>
                    )
                  })}
                </div>
            )}

            {osSelecionada && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50">
                <div className="max-w-6xl mx-auto space-y-6">
                  <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-purple-600">
                      <div className="flex items-center gap-3">
                          <Button variant="ghost" size="sm" onClick={() => setOsSelecionada(null)}><ArrowLeft className="w-4 h-4"/></Button>
                          <h2 className="text-2xl font-black uppercase">OSG-{String(osSelecionada.numero_op).padStart(4,'0')}</h2>
                          <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded">{osSelecionada.cliente_nome}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                          <Button variant="outline" size="sm" onClick={() => gerarComprovantePDF([osSelecionada])}>Comprovante</Button>
                          <Button variant="outline" size="sm" className="text-emerald-700" onClick={() => gerarExtratoFaturamentoPDF([osSelecionada])}>Extrato</Button>
                          <Select value={statusOS} onValueChange={setStatusOS}><SelectTrigger className="w-48 bg-white"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[99999]">{STATUS_FLUXO_GRAFICA.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}<SelectItem value="Cancelado" className="text-red-600 font-bold"><Ban className="w-4 h-4 inline mr-1"/> Cancelado</SelectItem></SelectContent></Select>
                          <Button onClick={() => salvarAndamento()} disabled={salvandoOS} className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm">Salvar</Button>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                          <h4 className="font-bold text-slate-800 flex items-center gap-2"><Edit2 className="w-4 h-4 text-blue-500"/> Edição da OSG</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Previsão</label><Input type="date" value={editDataPrevista} onChange={e => setEditDataPrevista(e.target.value)} className="h-8 text-sm" /></div>
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Solicitante</label><Input value={editSolicitante} onChange={e => setEditSolicitante(e.target.value)} className="h-8 text-sm" /></div>
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Operador</label><div onClick={() => { setModoSelecaoOperador("edicao"); setModalOperadorOpen(true); }} className="bg-slate-50 border border-slate-200 h-8 px-3 rounded flex items-center text-sm cursor-pointer hover:border-blue-300">{editOperadorNome || "Selecionar"}</div></div>
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Telefone do Cliente</label><Input value={editTelefoneCliente} onChange={e => setEditTelefoneCliente(e.target.value)} className="h-8 text-sm" /></div>
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-500">E-mail do Cliente</label><Input type="email" value={editEmailCliente} onChange={e => setEditEmailCliente(e.target.value)} className="h-8 text-sm" /></div>
                          </div>
                          
                          <div className="space-y-3 pt-4 border-t border-slate-200">
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
                          <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl space-y-4 shadow-sm">
                              <div className="flex justify-between items-center"><h3 className="font-bold text-blue-900"><Printer className="w-5 h-5 inline mr-2"/> Apontamento de Impressão Global</h3><span className="text-xs font-bold text-slate-600 bg-white px-2 py-1 rounded border">Demanda Impressões: {qtdNecessariaGeral} un | Feito: {totalProd} un</span></div>
                              
                              {historicoProducao.length > 0 && (
                                  <div className="bg-white rounded border overflow-hidden"><table className="w-full text-xs text-left"><thead className="bg-slate-50 border-b"><tr><th className="p-2">Eqp/Data</th><th className="p-2">Inicial</th><th className="p-2">Final</th><th className="p-2">Validados</th><th className="p-2">Desperdício</th></tr></thead><tbody>
                                      {historicoProducao.map(h => <tr key={h.id} className="border-b hover:bg-slate-50"><td className="p-2 truncate max-w-[100px]">{h.equipamentoNome}</td><td className="p-2 font-mono">{h.contadorInicial}</td><td className="p-2 font-mono">{h.contadorFinal||'-'}</td><td className="p-2 text-emerald-600 font-bold">+{h.producaoValida||0}</td><td className="p-2 text-rose-500 font-bold">{h.desperdicio||'-'}</td></tr>)}
                                  </tbody></table></div>
                              )}

                              {statusImpressao === "pendente" && totalProd < qtdNecessariaGeral && (
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1 col-span-2"><label className="text-xs font-bold text-blue-800">Equipamento</label><div onClick={() => setModalEquipamentoOpen(true)} className="bg-white border-blue-300 h-9 px-3 rounded flex items-center cursor-pointer">{equipImpressaoId ? equipamentosTC.find(x => x.id === equipImpressaoId)?.log_produtos?.nome : "Pesquisar..."}</div></div>
                                      <div className="space-y-1"><label className="text-xs font-bold text-blue-800">Qtd a Imprimir</label><Input type="number" max={Math.max(0, qtdNecessariaGeral - totalProd)} value={qtdImprimirServico} onChange={e => setQtdImprimirServico(Number(e.target.value))} className="h-9" /></div>
                                      <div className="space-y-1"><label className="text-xs font-bold text-blue-800">Páginas/Prod (Média)</label><Input type="number" value={paginasPorProduto} onChange={e => setPaginasPorProduto(Number(e.target.value))} className="h-9" /></div>
                                      <div className="space-y-1"><label className="text-xs font-bold text-blue-800">Valor Un.</label><Input type="number" step="0.01" value={valorUnitarioPagina} onChange={e => setValorUnitarioPagina(e.target.value)} className="h-9" /></div>
                                      <div className="space-y-1"><label className="text-xs font-bold text-blue-800">Modo</label><Select value={modoImpressao} onValueChange={setModoImpressao}><SelectTrigger className="h-9 bg-white z-[99999]"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-[99999]"><SelectItem value="Simplex">Simplex</SelectItem><SelectItem value="Duplex">Duplex</SelectItem></SelectContent></Select></div>
                                      <div className="space-y-1 col-span-2"><label className="text-xs font-bold text-rose-600">Contador Inicial</label><div className="flex gap-2"><Input type="number" value={contadorInicial} onChange={e => setContadorInicial(e.target.value)} className="h-10 border-rose-300 font-bold" /><Button onClick={iniciarImpressao} className="bg-blue-600 text-white h-10 px-6 hover:bg-blue-700">Iniciar</Button></div></div>
                                  </div>
                              )}
                              {statusImpressao === "imprimindo" && (
                                  <div className="bg-white p-6 rounded-lg text-center space-y-4 shadow-inner border border-blue-200">
                                      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto"/><h3 className="font-bold text-blue-900">Imprimindo...</h3>
                                      <div className="max-w-xs mx-auto space-y-2 text-left"><label className="text-xs font-bold text-rose-600">Contador Final</label><Input type="number" value={contadorFinal} onChange={e => setContadorFinal(e.target.value)} className="border-rose-300 font-bold" /><Button onClick={finalizarImpressao} className="w-full bg-emerald-600 text-white font-bold mt-2 hover:bg-emerald-700">Registrar Lote</Button></div>
                                  </div>
                              )}
                          </div>
                      )}

                      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                          <div className="p-4 border-b bg-purple-50 flex flex-wrap justify-between items-center gap-4">
                              <div><h4 className="text-sm font-bold text-purple-900 uppercase flex items-center gap-2"><PaintBucket className="w-4 h-4 text-purple-600"/> Insumos Consumidos</h4></div>
                              <Button size="sm" onClick={() => setModalInsumoOpen(true)} className="h-8 bg-purple-600 hover:bg-purple-700 text-white gap-2"><Search className="w-3.5 h-3.5"/> Insumo</Button>
                          </div>
                          <div className="overflow-x-auto min-h-[120px]">
                              <table className="w-full text-left text-sm border-collapse">
                                  <thead><tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b bg-white"><th className="p-3 font-medium">Insumo</th><th className="p-3 font-medium text-center">Qtd</th><th className="p-3 font-medium text-right">Custo Un.</th><th className="p-3 font-medium text-right">Total</th><th className="p-3"></th></tr></thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {insumos.length === 0 && (<tr><td colSpan={5} className="p-6 text-center text-slate-400 text-xs italic">Nenhum insumo lançado.</td></tr>)}
                                      {insumos.map((ins, idx) => (
                                          <tr key={ins.id} className="bg-white hover:bg-slate-50">
                                              <td className="p-3 font-semibold text-slate-700">{ins.nome}</td>
                                              <td className="p-3 text-center"><Input type="number" step="0.0001" min="0" value={ins.quantidade} onChange={e => { const ni = [...insumos]; ni[idx].quantidade = parseFloat(e.target.value)||0; setInsumos(ni); }} className="h-8 w-20 text-center mx-auto text-xs font-bold bg-slate-50"/></td>
                                              <td className="p-3 text-right text-xs text-slate-500">R$ {Number(ins.custoUn).toFixed(4).replace('.',',')}</td>
                                              <td className="p-3 text-right font-bold text-rose-600">R$ {(ins.quantidade * ins.custoUn).toFixed(2).replace('.', ',')}</td>
                                              <td className="p-3 text-center"><button onClick={() => setInsumos(insumos.filter(x => x.id !== ins.id))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                          <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
                              <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Custo Prod.</p><p className="text-xl font-black text-rose-400">R$ {insumos.reduce((a,b) => a+(b.quantidade*b.custoUn), 0).toFixed(2).replace('.',',')}</p></div>
                              {editProdutosOSG.some(p => p.possuiImpressao === "Sim") && (<div className="border-l border-slate-600 pl-6"><p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Receita Impressões</p><p className="text-xl font-black text-emerald-400">R$ {totalReceitaGerada.toFixed(2).replace('.',',')}</p></div>)}
                          </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-white p-5 rounded-xl border shadow-sm">
                          <div className="flex justify-between items-center mb-4 border-b pb-2">
                              <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2"><Paperclip className="w-4 h-4 text-blue-500"/> Arquivos</h4>
                              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 text-xs text-blue-600 border-blue-200">{uploading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Plus className="w-3 h-3"/>} Anexar</Button>
                          </div>
                          <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                              {anexos.length === 0 ? (<p className="text-xs text-slate-400 italic text-center py-4">Nenhum arquivo anexado.</p>) : (
                                  anexos.map(anexo => (
                                      <div key={anexo.id} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-lg group hover:border-blue-200">
                                          <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]" title={anexo.nome_arquivo}>{anexo.nome_arquivo}</span>
                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100"><a href={anexo.url_arquivo} target="_blank" rel="noreferrer" className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"><Download className="w-3.5 h-3.5"/></a><button onClick={() => deletarAnexo(anexo.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-3.5 h-3.5"/></button></div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border shadow-sm border-slate-200 h-[450px] flex flex-col">
                          <h4 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2 mb-3 border-b border-slate-200 pb-2"><MessageSquare className="w-4 h-4 text-slate-500"/> Timeline (Follow-up)</h4>
                          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 mb-3">
                              {timeline.length === 0 ? (<p className="text-xs text-slate-400 italic text-center py-4">Nenhum registro.</p>) : (
                                  timeline.map(ev => (
                                      <div key={ev.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                          <div className="flex items-center gap-2 mb-1">
                                              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">{ev.usuario?.charAt(0).toUpperCase()}</div>
                                              <span className="font-bold text-xs text-slate-700">{ev.usuario}</span>
                                              <span className="text-[9px] text-slate-400 ml-auto">{new Date(ev.data).toLocaleString('pt-BR')}</span>
                                          </div>
                                          <p className="text-xs text-slate-600 leading-relaxed ml-7 whitespace-pre-wrap">{ev.texto}</p>
                                      </div>
                                  ))
                              )}
                          </div>
                          <div className="mt-auto relative">
                              <textarea value={novoComentario} onChange={e => setNovoComentario(e.target.value)} className="w-full min-h-[60px] p-3 pr-12 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 custom-scrollbar" placeholder="Anotar algo..."></textarea>
                              <Button onClick={adicionarComentario} disabled={!novoComentario.trim()} size="sm" className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-full bg-blue-600 text-white"><Send className="w-4 h-4"/></Button>
                          </div>
                      </div>
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