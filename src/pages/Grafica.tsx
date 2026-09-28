import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Layers, CheckCircle2, Plus, Search, Trash2, ArrowLeft, PaintBucket, FileOutput, PlayCircle, AlertCircle, Save, Paperclip, Download, Loader2, Landmark, DollarSign, Activity, User, CalendarDays, UserCheck, FileText, MessageSquare, Edit2, Ban, X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

// ORDEM EXATA DOS STATUS
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

  // DADOS BASE
  const [produtosBD, setProdutosBD] = useState<any[]>([]);
  const [clientesBD, setClientesBD] = useState<any[]>([]);
  const [operadoresBD, setOperadoresBD] = useState<any[]>([]);
  const [equipamentosTC, setEquipamentosTC] = useState<any[]>([]);
  const [usuarioAtual, setUsuarioAtual] = useState<any>(null);

  // ESTADOS: ABRIR ORDEM DE SERVIÇO (OS)
  const [clienteBusca, setClienteBusca] = useState("");
  const [solicitante, setSolicitante] = useState("");
  const [dataSolicitacao, setDataSolicitacao] = useState(new Date().toISOString().split('T')[0]);
  const [operadorNome, setOperadorNome] = useState("");
  const [descServico, setDescServico] = useState("");
  const [qtdProduzir, setQtdProduzir] = useState(1);
  const [dataPrevista, setDataPrevista] = useState("");
  const [possuiImpressao, setPossuiImpressao] = useState("Não");
  const [modoImpressaoOS, setModoImpressaoOS] = useState("Simplex");
  
  // CAMPOS CONDICIONAIS SE HOUVER IMPRESSÃO
  const [paginasPorProdutoOS, setPaginasPorProdutoOS] = useState(1);
  const [valorUnitarioPaginaOS, setValorUnitarioPaginaOS] = useState("");

  const [salvandoOS, setSalvandoOS] = useState(false);
  const [exportando, setExportando] = useState(false);

  // ESTADOS: MODAIS DE BUSCA AVANÇADA
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [buscaModalCliente, setBuscaModalCliente] = useState("");

  const [modalOperadorOpen, setModalOperadorOpen] = useState(false);
  const [buscaModalOperador, setBuscaModalOperador] = useState("");
  const [modoSelecaoOperador, setModoSelecaoOperador] = useState<"criacao" | "edicao">("criacao");

  const [modalInsumoOpen, setModalInsumoOpen] = useState(false);
  const [buscaModalInsumo, setBuscaModalInsumo] = useState("");

  const [modalEquipamentoOpen, setModalEquipamentoOpen] = useState(false);
  const [buscaModalEquipamento, setBuscaModalEquipamento] = useState("");

  // ESTADOS: PAINEL DE PRODUÇÃO
  const [ordens, setOrdens] = useState<any[]>([]);
  const [buscaOS, setBuscaOS] = useState("");
  const [osSelecionada, setOsSelecionada] = useState<any | null>(null);
  const [osSelecionadasLote, setOsSelecionadasLote] = useState<string[]>([]);
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false); 
  
  const [statusOS, setStatusOS] = useState("");
  const [buscaInsumo, setBuscaInsumo] = useState("");
  const [insumos, setInsumos] = useState<InsumoOS[]>([]);
  const [historicoProducao, setHistoricoProducao] = useState<ApontamentoProducao[]>([]);

  // ESTADOS: EDIÇÃO DINÂMICA DA OSG NA PRANCHETA
  const [editDescServico, setEditDescServico] = useState("");
  const [editQtdProduzir, setEditQtdProduzir] = useState(1);
  const [editDataPrevista, setEditDataPrevista] = useState("");
  const [editPaginasPorProduto, setEditPaginasPorProduto] = useState(1);
  const [editSolicitante, setEditSolicitante] = useState("");
  const [editOperadorNome, setEditOperadorNome] = useState("");

  // ESTADOS: FLUXO DE IMPRESSÃO
  const [statusImpressao, setStatusImpressao] = useState<"pendente" | "imprimindo">("pendente");
  const [equipImpressaoId, setEquipImpressaoId] = useState("");
  const [qtdImprimirServico, setQtdImprimirServico] = useState(1); 
  const [paginasPorProduto, setPaginasPorProduto] = useState(1); 
  const [valorUnitarioPagina, setValorUnitarioPagina] = useState(""); 
  const [modoImpressao, setModoImpressao] = useState("Simplex");
  const [contadorInicial, setContadorInicial] = useState("");
  const [contadorFinal, setContadorFinal] = useState("");

  // ESTADOS: ANEXOS & TIMELINE
  const [timeline, setTimeline] = useState<any[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [anexos, setAnexos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para Automação de E-mail
const [emailTriggers, setEmailTriggers] = useState<any[]>([]);
const [modalConfirmarEmail, setModalConfirmarEmail] = useState(false);
const [dadosEmailPendente, setDadosEmailPendente] = useState<any>(null);

  useEffect(() => {
    fetchUsuario();
    fetchDadosBase();
    fetchOrdens();
  }, [abaAtiva]);

  const fetchUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUsuarioAtual(user);
  };

  const fetchDadosBase = async () => {
    const [prodRes, cliRes, opRes, eqRes] = await Promise.all([
      supabase.from('log_produtos' as any).select('id, sku, nome, custo_base, estoque_atual').order('nome'),
      supabase.from('log_clientes' as any).select('id, razao_social, nome_fantasia, cnpj_cpf').order('nome_fantasia'),
      supabase.from('grafica_operadores' as any).select('id, nome').order('nome'),
      // Adicionado 'sequencial' à consulta para facilitar a busca do equipamento
      supabase.from('srv_equipamentos' as any).select('id, sequencial, numero_serie, log_produtos(nome, especificacoes), log_clientes(nome_fantasia, razao_social)')
    ]);
    
    if (prodRes.data) setProdutosBD(prodRes.data);
    if (cliRes.data) setClientesBD(cliRes.data);
    if (opRes.data) setOperadoresBD(opRes.data);
    
    if (eqRes.data) {
        // Carrega todos os equipamentos sem restrição
        setEquipamentosTC(eqRes.data);
    } else if (eqRes.error) {
        console.error("Erro ao buscar equipamentos: ", eqRes.error);
    }
    const { data: triggersData } = await supabase.from('cfg_email_triggers').select('*').eq('modulo', 'Grafica').eq('ativo', true);
if (triggersData) setEmailTriggers(triggersData);
  };

  const fetchOrdens = async () => {
    const { data } = await supabase.from('prd_ordens_producao' as any).select('*').order('numero_op', { ascending: false });
    if (data) {
      const dataNormalizada = data.map((os: any) => ({
        ...os,
        status: (STATUS_FLUXO_GRAFICA.includes(os.status) || os.status === "Cancelado") ? os.status : "Solicitação Recebida"
      }));
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

        const statusNome = os.status || "Solicitação Recebida";
        let { data: col } = await supabase.from('kanban_colunas').select('id').eq('workflow_id', wf.id).ilike('nome', statusNome).single();
        
        if (!col) {
            let statusGlobalMap = "Andamento";
            if (statusNome === "Concluído" || statusNome === "Entregue") statusGlobalMap = "Concluído";
            else if (statusNome === "Solicitação Recebida" || statusNome === "Levantamento de Material") statusGlobalMap = "Andamento";
            else if (statusNome === "Faturamento" || statusNome === "Aguardando") statusGlobalMap = "Aguardando";
            
            const { data: colsCount } = await supabase.from('kanban_colunas').select('id');
            const ordem = colsCount ? colsCount.length : 0;
            
            const { data: newCol } = await supabase.from('kanban_colunas').insert([{
                workflow_id: wf.id,
                nome: statusNome.toUpperCase(),
                status_global: statusGlobalMap,
                ordem: ordem
            }]).select().single();
            
            if (newCol) col = newCol;
            else return; 
        }

        const numOpStr = String(os.numero_op).padStart(4, '0');
        const tituloCard = `OSG-${numOpStr} - ${os.cliente_nome} - ${os.solicitante}`;
        const descricao = os.observacoes || "";
        const responsavel = os.operador_nome || "";
        const vencimento = os.data_prevista || null;

        if (isUpdate) {
            const { data: cardsExistentes } = await supabase.from('kanban_cards').select('id').eq('workflow_id', wf.id).ilike('titulo', `OSG-${numOpStr}%`);
            
            if (cardsExistentes && cardsExistentes.length > 0) {
                await supabase.from('kanban_cards').update({
                    coluna_id: col.id, titulo: tituloCard, descricao: descricao,
                    responsavel_nome: responsavel, data_vencimento: vencimento, atualizado_em: new Date().toISOString()
                }).eq('id', cardsExistentes[0].id);
            } else {
                await supabase.from('kanban_cards').insert([{
                    workflow_id: wf.id, coluna_id: col.id, titulo: tituloCard,
                    descricao: descricao, responsavel_nome: responsavel, data_vencimento: vencimento
                }]);
            }
        } else {
            await supabase.from('kanban_cards').insert([{
                workflow_id: wf.id, coluna_id: col.id, titulo: tituloCard,
                descricao: descricao, responsavel_nome: responsavel, data_vencimento: vencimento
            }]);
        }
    } catch (error) {
        console.error("Erro ao sincronizar com o Kanban:", error);
    }
  };

  const criarOS = async () => {
    if (!clienteBusca || !solicitante || !dataSolicitacao || !operadorNome || !descServico || !dataPrevista) {
        return alert("Cliente, Solicitante, Operador, Serviço e Datas são obrigatórios.");
    }

    if (possuiImpressao === "Sim" && (!paginasPorProdutoOS || !valorUnitarioPaginaOS)) {
        return alert("Para serviços com impressão, informe a quantidade de páginas por produto e o valor unitário.");
    }
    
    setSalvandoOS(true);
    try {
      const flagImpressao = possuiImpressao === "Sim" ? `[Possui Impressão: Sim]\n[Modo: ${modoImpressaoOS}]` : `[Possui Impressão: Não]`;
      
      const payload = {
        cliente_nome: clienteBusca, solicitante: solicitante, data_solicitacao: dataSolicitacao,
        operador_nome: operadorNome, descricao_servico: descServico, quantidade_produzir: qtdProduzir,
        data_prevista: dataPrevista || null, paginas_por_produto: possuiImpressao === "Sim" ? paginasPorProdutoOS : 1,
        valor_unitario_pagina: possuiImpressao === "Sim" ? parseFloat(valorUnitarioPaginaOS) || 0 : 0,
        status: 'Solicitação Recebida', observacoes: flagImpressao, historico_producao: [], timeline: []
      };

      const { data: novaOs, error } = await supabase.from('prd_ordens_producao' as any).insert([payload]).select().single();
      if (error) throw error;

      await sincronizarCardKanban(novaOs, false);
      alert("Ordem de Serviço Gráfico enviada para a fila com sucesso!");
      
      setClienteBusca(""); setSolicitante(""); setDataSolicitacao(new Date().toISOString().split('T')[0]); 
      setOperadorNome(""); setDescServico(""); setQtdProduzir(1); setDataPrevista(""); 
      setPossuiImpressao("Não"); setPaginasPorProdutoOS(1); setValorUnitarioPaginaOS(""); setModoImpressaoOS("Simplex");
      setAbaAtiva("painel");
    } catch (e: any) { alert("Erro ao criar OS: " + e.message); } finally { setSalvandoOS(false); }
  };

  const abrirPrancheta = async (os: any) => {
    setOsSelecionada(os);
    setStatusOS(os.status);
    
    setEditDescServico(os.descricao_servico || "");
    setEditQtdProduzir(os.quantidade_produzir || 1);
    setEditDataPrevista(os.data_prevista || "");
    setEditPaginasPorProduto(os.paginas_por_produto || 1);
    setEditSolicitante(os.solicitante || "");
    setEditOperadorNome(os.operador_nome || "");

    let tml: any[] = [];
    try { tml = typeof os.timeline === 'string' ? JSON.parse(os.timeline) : (os.timeline || []); } catch(e){}
    setTimeline(tml);

    let hist: ApontamentoProducao[] = [];
    try { hist = typeof os.historico_producao === 'string' ? JSON.parse(os.historico_producao) : (os.historico_producao || []); } catch(e){}
    setHistoricoProducao(hist);

    const producaoAtiva = hist.find((h: any) => h.status === 'imprimindo');
    if (producaoAtiva) {
        setStatusImpressao("imprimindo");
        setEquipImpressaoId(producaoAtiva.equipamentoId);
        setQtdImprimirServico(producaoAtiva.qtdSolicitada);
        setPaginasPorProduto(producaoAtiva.paginasPorProduto || 1);
        setValorUnitarioPagina(producaoAtiva.valorUnitarioPagina ? producaoAtiva.valorUnitarioPagina.toString() : "");
        setModoImpressao(producaoAtiva.modo);
        setContadorInicial(producaoAtiva.contadorInicial.toString());
        setContadorFinal("");
    } else {
        const totalProduzido = hist.filter((h: any) => h.status === 'concluido').reduce((acc: number, curr: any) => acc + (curr.producaoValida || 0), 0);
        const pendente = Math.max(0, os.quantidade_produzir - totalProduzido);

        setStatusImpressao("pendente");
        setContadorInicial("");
        setContadorFinal("");
        setEquipImpressaoId("");
        setQtdImprimirServico(pendente || os.quantidade_produzir);
        setPaginasPorProduto(os.paginas_por_produto || 1);
        setValorUnitarioPagina(os.valor_unitario_pagina ? os.valor_unitario_pagina.toString() : "");
        setModoImpressao(os.observacoes?.includes("[Modo: Duplex]") ? "Duplex" : "Simplex");
    }

    const [insumosRes, anexosRes] = await Promise.all([
        supabase.from('prd_op_insumos' as any).select('*').eq('op_id', os.id),
        supabase.from('prd_op_anexos' as any).select('*').eq('op_id', os.id).order('data_upload', { ascending: false })
    ]);

    if (insumosRes.data) {
        setInsumos(insumosRes.data.map((i: any) => ({
            id: i.id, produtoId: i.produto_id, nome: i.produto_nome, 
            quantidade: i.quantidade, custoUn: i.custo_unitario, estoqueAtual: 999 
        })));
    }
    if (anexosRes.data) setAnexos(anexosRes.data);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      setUploading(true);
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `OSG-${osSelecionada.numero_op}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage.from('grafica_arquivos').upload(fileName, file);
          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage.from('grafica_arquivos').getPublicUrl(fileName);
          const payload = { op_id: osSelecionada.id, nome_arquivo: file.name, url_arquivo: publicUrl, tamanho_bytes: file.size };
          const { data: novoAnexo, error: dbError } = await supabase.from('prd_op_anexos' as any).insert([payload]).select().single();
          if (dbError) throw dbError;

          setAnexos([novoAnexo, ...anexos]);
          alert("Arquivo anexado com sucesso!");
      } catch(e: any) { alert("Erro no upload. Erro: " + e.message); } finally {
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
      }
  };

  const adicionarComentario = async () => {
    if (!novoComentario.trim()) return;
    const nomeUsuario = usuarioAtual?.user_metadata?.full_name || usuarioAtual?.email || 'Equipe Gráfica';
    const novoEvento = { id: crypto.randomUUID(), data: new Date().toISOString(), usuario: nomeUsuario, texto: novoComentario };
    const novaTimeline = [novoEvento, ...timeline];
    
    setTimeline(novaTimeline);
    setNovoComentario("");

    try {
        await supabase.from('prd_ordens_producao' as any).update({ timeline: novaTimeline }).eq('id', osSelecionada.id);
    } catch (error) {
        console.error("Erro ao salvar comentário", error);
    }
  };

  const deletarAnexo = async (id: string) => {
      if(!confirm("Tem certeza que deseja remover este arquivo da OS?")) return;
      await supabase.from('prd_op_anexos' as any).delete().eq('id', id);
      setAnexos(anexos.filter(a => a.id !== id));
  };

  const selecionarInsumo = (prod: any) => {
    setInsumos([...insumos, { id: crypto.randomUUID(), produtoId: prod.id, nome: prod.nome, quantidade: 1, custoUn: prod.custo_base || 0, estoqueAtual: prod.estoque_atual || 0 }]);
    setModalInsumoOpen(false);
    setBuscaModalInsumo("");
  };

  const salvarAndamento = async (statusFinal?: string) => {
    setSalvandoOS(true);
    try {
      const novoStatus = statusFinal || statusOS;
      const custoTotalInsumos = insumos.reduce((a, b) => a + (b.quantidade * b.custoUn), 0);

      const payloadUpdate = { 
        status: novoStatus, 
        custo_total_insumos: custoTotalInsumos,
        descricao_servico: editDescServico,
        quantidade_produzir: editQtdProduzir || 1,
        data_prevista: editDataPrevista || null, 
        paginas_por_produto: editPaginasPorProduto || 1,
        solicitante: editSolicitante,
        operador_nome: editOperadorNome
      };

      const { data: osAtualizada, error: updateError } = await supabase.from('prd_ordens_producao' as any).update(payloadUpdate).eq('id', osSelecionada.id).select().single();
      if (updateError) throw new Error("Falha ao atualizar dados: " + updateError.message);

      await supabase.from('prd_op_insumos' as any).delete().eq('op_id', osSelecionada.id);
      if (insumos.length > 0) {
        const payloadInsumos = insumos.map(i => ({ op_id: osSelecionada.id, produto_id: i.produtoId, produto_nome: i.nome, quantidade: i.quantidade, custo_unitario: i.custoUn, custo_total: i.quantidade * i.custoUn }));
        await supabase.from('prd_op_insumos' as any).insert(payloadInsumos);
      }

      await sincronizarCardKanban(osAtualizada || { ...osSelecionada, ...payloadUpdate }, true);

      // VERIFICAÇÃO DE GATILHO DE E-MAIL APÓS SALVAR
      const trigger = emailTriggers.find(t => t.status_gatilho === novoStatus);
      if (trigger) {
          const numOSG = String(osSelecionada.numero_op).padStart(4, '0');
          const textoPersonalizado = trigger.corpo_texto
              .replace(/{numero_osg}/g, numOSG)
              .replace(/{solicitante}/g, editSolicitante || "Cliente")
              .replace(/{status}/g, novoStatus);
          
          const assuntoPersonalizado = trigger.assunto.replace(/{numero_osg}/g, numOSG);

          setDadosEmailPendente({
              osId: osSelecionada.id,
              cliente: osSelecionada.cliente_nome,
              assunto: assuntoPersonalizado,
              texto: textoPersonalizado
          });
          setModalConfirmarEmail(true); // Abre o modal de confirmação em vez de apenas dar o alert de sucesso
      } else {
          if (!statusFinal) {
              alert("OSG atualizada com sucesso!");
              fetchOrdens(); setOsSelecionada(null);
          }
      }
    } catch (e: any) { 
        alert(e.message); throw e; 
    } finally { setSalvandoOS(false); }
  };

  const iniciarImpressao = async () => {
      if (!contadorInicial) return alert("Informe o contador inicial do equipamento.");
      if (!paginasPorProduto || paginasPorProduto <= 0) return alert("Informe a quantidade de páginas por produto.");
      if (!valorUnitarioPagina) return alert("Informe o valor unitário da página.");
      
      const eq = equipamentosTC.find(e => e.id === equipImpressaoId);
      const novoApontamento: ApontamentoProducao = {
          id: crypto.randomUUID(), data: new Date().toISOString(), equipamentoId: equipImpressaoId,
          equipamentoNome: eq ? `${eq.log_produtos?.nome || 'Equipamento'} (S/N: ${eq.numero_serie})` : 'Equipamento Desconhecido',
          modo: modoImpressao, qtdSolicitada: qtdImprimirServico, paginasPorProduto: paginasPorProduto,
          valorUnitarioPagina: parseFloat(valorUnitarioPagina), contadorInicial: Number(contadorInicial), status: 'imprimindo'
      };

      const novoHistorico = [...historicoProducao, novoApontamento];
      setHistoricoProducao(novoHistorico);
      setStatusImpressao("imprimindo");

      try { await supabase.from('prd_ordens_producao' as any).update({ historico_producao: novoHistorico }).eq('id', osSelecionada.id); } catch (e: any) { alert(e.message); }
  };

  const finalizarImpressao = async () => {
    if (!contadorFinal || Number(contadorFinal) < Number(contadorInicial)) return alert("Contador Final inválido.");
    const diffPaginasImpressas = Number(contadorFinal) - Number(contadorInicial);
    
    const producaoAtiva = historicoProducao.find(h => h.status === 'imprimindo');
    if (!producaoAtiva) return;

    const qtdTotalPaginasEsperadas = producaoAtiva.qtdSolicitada * (producaoAtiva.paginasPorProduto || 1);
    let producaoValidaServico = 0; let desperdicioPaginas = 0;

    if (diffPaginasImpressas > qtdTotalPaginasEsperadas) {
        producaoValidaServico = producaoAtiva.qtdSolicitada;
        desperdicioPaginas = diffPaginasImpressas - qtdTotalPaginasEsperadas;
        const porcentagem = ((desperdicioPaginas / qtdTotalPaginasEsperadas) * 100).toFixed(1);
        alert(`ALERTA DE DESPERDÍCIO:\nDiferença (Pág): ${diffPaginasImpressas} | Pág. Demandadas: ${qtdTotalPaginasEsperadas}\nDesperdício: ${desperdicioPaginas} páginas (${porcentagem}%)`);
    } else {
        producaoValidaServico = Math.floor(diffPaginasImpressas / (producaoAtiva.paginasPorProduto || 1));
        if (producaoValidaServico < producaoAtiva.qtdSolicitada) alert(`Apontamento Parcial: Foram impressas ${diffPaginasImpressas} páginas, correspondendo a ${producaoValidaServico} itens de serviço (de um total de ${producaoAtiva.qtdSolicitada} demandadas nesta rodada).`);
    }

    const novoHistorico = historicoProducao.map(h => {
        if (h.status === 'imprimindo') return { ...h, contadorFinal: Number(contadorFinal), producaoValida: producaoValidaServico, desperdicio: desperdicioPaginas, status: 'concluido' as const };
        return h;
    });

    setHistoricoProducao(novoHistorico);

    try {
        await supabase.from('prd_ordens_producao' as any).update({ historico_producao: novoHistorico }).eq('id', osSelecionada.id);
        const totalProduzidoAgora = novoHistorico.filter(h => h.status === 'concluido').reduce((acc, curr) => acc + (curr.producaoValida || 0), 0);
        if (totalProduzidoAgora >= osSelecionada.quantidade_produzir) alert("Sucesso! A quantidade total demandada para esta OS foi atingida.");
        
        setStatusImpressao("pendente"); setContadorInicial(""); setContadorFinal("");
        setQtdImprimirServico(Math.max(0, osSelecionada.quantidade_produzir - totalProduzidoAgora));
    } catch (e: any) { alert(e.message); }
  };

  const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) { return null; }
  };

  const drawTimbrado = (doc: any, pageWidth: number, pageHeight: number, logoBase64: string | null) => {
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, 42, "F"); 
      doc.rect(0, pageHeight - 35, pageWidth, 35, "F");
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
      doc.text("91 98156-6886", rightX, pageHeight - 17);
      doc.text("(91) 3366-5100", rightX, pageHeight - 13);
      doc.text("tcservicos@tccopiadoras.com.br", rightX, pageHeight - 9);
      doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.3);
      doc.circle(rightX - 4, pageHeight - 18, 1.5, "S");
      doc.line(rightX - 5.2, pageHeight - 17, rightX - 5.5, pageHeight - 16);
      doc.line(rightX - 5.5, pageHeight - 16, rightX - 4.5, pageHeight - 16.7);
      doc.rect(rightX - 5, pageHeight - 14.5, 2, 3, "S");
      doc.line(rightX - 4.5, pageHeight - 12, rightX - 3.5, pageHeight - 12);
      doc.rect(rightX - 5.5, pageHeight - 10.5, 3, 2, "S");
      doc.line(rightX - 5.5, pageHeight - 10.5, rightX - 4, pageHeight - 9.5);
      doc.line(rightX - 4, pageHeight - 9.5, rightX - 2.5, pageHeight - 10.5);
  };

  const gerarComprovantePDF = async (osList: any[]) => {
      if (!osList || osList.length === 0) return;
      const clienteNome = osList[0].cliente_nome;
      if (osList.some(os => os.cliente_nome !== clienteNome)) return alert("Todas as OSGs selecionadas devem pertencer ao mesmo cliente.");

      setExportando(true);
      try {
          const clienteObj = clientesBD.find(c => c.nome_fantasia === clienteNome || c.razao_social === clienteNome);
          const razaoSocial = clienteObj?.razao_social || clienteNome;
          const cnpj = clienteObj?.cnpj_cpf || "Não informado";
          const operador = osList[0].operador_nome || "Operador Não Informado";

          const doc = new jsPDF("p", "mm", "a4");
          const logoBase64 = await getBase64ImageFromUrl("/logo.png");
          const dia = String(new Date().getDate()).padStart(2, '0');
          const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
          const dataEmissao = `Belém/PA, ${dia} de ${meses[new Date().getMonth()]} de ${new Date().getFullYear()}`;

          doc.setFont("times", "normal"); doc.setFontSize(11); doc.setTextColor(0, 0, 0);
          doc.text(dataEmissao, doc.internal.pageSize.getWidth() - 14, 45, { align: "right" });
          doc.setFont("times", "bold"); doc.text(`À (O) ${String(razaoSocial).toUpperCase()}`, 14, 55); doc.text(`CNPJ: ${cnpj}`, 14, 60);
          doc.setFontSize(12); doc.text(osList.length === 1 ? `COMPROVANTE DE ENTREGA - OSG-${String(osList[0].numero_op).padStart(4,'0')}` : `COMPROVANTE DE ENTREGA - MÚLTIPLAS OSGs`, doc.internal.pageSize.getWidth() / 2, 75, { align: "center" });

          let totalGeralPaginas = 0;
          const tableRows: any[] = osList.map(os => {
              const ppProduto = os.paginas_por_produto || 1;
              const totalPaginas = (os.quantidade_produzir || 0) * ppProduto;
              totalGeralPaginas += totalPaginas;
              const descProduto = osList.length > 1 ? `[OSG-${String(os.numero_op).padStart(4, '0')}] ${os.descricao_servico || "-"}` : os.descricao_servico || "-";
              return [ os.data_solicitacao ? new Date(os.data_solicitacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : "-", os.solicitante || "-", descProduto, os.quantidade_produzir || 0, ppProduto, totalPaginas ];
          });

          tableRows.push([{ content: "TOTAL DA SOLICITAÇÃO", colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: totalGeralPaginas.toString(), styles: { fontStyle: 'bold', halign: 'center' } }]);

          autoTable(doc, {
              head: [["DATA DA SOLICITAÇÃO", "SOLICITANTE", "PRODUTO", "QTD PRODUTOS", "P.P P/ PRODUTO", "TOTAL P.P IMPRESSAS"]], body: tableRows, startY: 85, margin: { top: 45, bottom: 40, left: 14, right: 14 },
              theme: 'grid', styles: { font: 'times', fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 }, headStyles: { fillColor: [240, 240, 240], textColor: [0,0,0], fontStyle: 'bold', halign: 'center' },
              didDrawPage: () => drawTimbrado(doc, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), logoBase64)
          });

          let finalY = (doc as any).lastAutoTable.finalY + 20;
          if (finalY + 50 > doc.internal.pageSize.getHeight() - 35) { doc.addPage(); finalY = 50; }

          doc.setFont("times", "normal"); doc.setFontSize(11);
          doc.text("Cliente: ___________________________________________________", 14, finalY);
          doc.text("Data da Entrega: __________________", 14, finalY + 10);
          doc.text("________________________________________", doc.internal.pageSize.getWidth() / 2, finalY + 30, { align: "center" });
          doc.setFont("times", "bold"); doc.text(String(operador).toUpperCase(), doc.internal.pageSize.getWidth() / 2, finalY + 35, { align: "center" });
          doc.setFont("times", "normal"); doc.text("TC COMÉRCIO DE SERVIÇOS E TECNOLOGIA LTDA\nCNPJ: 07.679.989/0001-50", doc.internal.pageSize.getWidth() / 2, finalY + 40, { align: "center" });

          doc.save(`Comprovante_Entrega_${clienteNome.replace(/\s+/g, '_')}.pdf`);
      } catch (error) { console.error(error); alert("Erro ao gerar Comprovante PDF."); } finally { setExportando(false); }
  };

  // PPM DINÂMICO Baseado no Equipamento (Corrigido para evitar crash)
  let eqPPM = 40;
  if (equipImpressaoId) {
      const eq = equipamentosTC.find(e => e.id === equipImpressaoId);
      if (eq) {
          try {
              const prodSpecs = typeof eq.log_produtos?.especificacoes === 'string' ? JSON.parse(eq.log_produtos.especificacoes) : (eq.log_produtos?.especificacoes || {});
              const foundPPM = prodSpecs?.ppm;
              if (foundPPM) eqPPM = Number(foundPPM);
          } catch(e) {}
      }
  }

  const tempoEstimado = Math.ceil((qtdImprimirServico * paginasPorProduto) / eqPPM);
  const custoOriginalNovo = ((qtdImprimirServico * paginasPorProduto) * 0.08).toFixed(2);
  const custoOriginalRecond = ((qtdImprimirServico * paginasPorProduto) * 0.05).toFixed(2);
  const custoCompatNovo = ((qtdImprimirServico * paginasPorProduto) * 0.04).toFixed(2);
  const custoCompatRecond = ((qtdImprimirServico * paginasPorProduto) * 0.02).toFixed(2);
  
  const totalReceitaGerada = historicoProducao.filter(h => h.status === 'concluido').reduce((acc, curr) => acc + ((curr.producaoValida || 0) * (curr.paginasPorProduto || 1) * (curr.valorUnitarioPagina || 0)), 0);

  // ORDENAÇÃO: Mais antigas (topo) para mais recentes (baixo)
  const ordensFiltradas = ordens
    .filter(o => 
      (o.cliente_nome?.toLowerCase() || "").includes(buscaOS.toLowerCase()) || 
      (o.descricao_servico?.toLowerCase() || "").includes(buscaOS.toLowerCase()) ||
      (o.numero_op?.toString() || "").includes(buscaOS) ||
      (o.operador_nome?.toLowerCase() || "").includes(buscaOS.toLowerCase()) ||
      (o.solicitante?.toLowerCase() || "").includes(buscaOS.toLowerCase())
    )
    .sort((a, b) => {
      const dataA = a.data_solicitacao || '';
      const dataB = b.data_solicitacao || '';
      if (dataA !== dataB) return dataA.localeCompare(dataB); 
      return (a.numero_op || 0) - (b.numero_op || 0);
    });

  const totalProduzidoGeral = historicoProducao.filter(h => h.status === 'concluido').reduce((acc, curr) => acc + (curr.producaoValida || 0), 0);
  const percentualConclusao = osSelecionada ? Math.min(100, (totalProduzidoGeral / osSelecionada.quantidade_produzir) * 100) : 0;

  const dispararEmailCliente = async () => {
    if (!dadosEmailPendente) return;
    try {
        // Exemplo: Disparo para o Webhook do n8n
        // await fetch('https://seu-n8n.com/webhook/disparo-osg', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(dadosEmailPendente)
        // });
        
        alert("E-mail disparado com sucesso para o cliente!");
        setModalConfirmarEmail(false);
        setDadosEmailPendente(null);
        fetchOrdens(); 
        setOsSelecionada(null);
    } catch (error) {
        alert("Erro ao disparar e-mail.");
    }
};

  return (
    <AppLayout>
      {/* MODAL: SELECIONAR CLIENTE */}
      {modalClienteOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Search className="w-5 h-5 text-purple-600"/> Localizar Cliente</h3>
              <Button variant="ghost" size="sm" onClick={() => setModalClienteOpen(false)} className="h-8 w-8 p-0 text-slate-500 hover:text-red-500"><X className="w-5 h-5"/></Button>
            </div>
            <div className="p-4 border-b border-slate-100 bg-white">
              <Input placeholder="Pesquise por Razão Social, Nome Fantasia ou CNPJ/CPF..." value={buscaModalCliente} onChange={e => setBuscaModalCliente(e.target.value)} className="bg-slate-50 font-medium border-purple-200 focus-visible:ring-purple-500" autoFocus />
            </div>
            <div className="overflow-y-auto flex-1 p-0 custom-scrollbar bg-white">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase sticky top-0 shadow-sm"><tr><th className="p-3 font-semibold">Cliente</th><th className="p-3 font-semibold">CNPJ / CPF</th><th className="p-3 font-semibold text-center w-28">Ação</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {clientesBD.filter(c => (c.nome_fantasia || "").toLowerCase().includes(buscaModalCliente.toLowerCase()) || (c.razao_social || "").toLowerCase().includes(buscaModalCliente.toLowerCase()) || (c.cnpj_cpf || "").includes(buscaModalCliente)).slice(0, 50).map(c => (
                    <tr key={c.id} className="hover:bg-purple-50 transition-colors">
                      <td className="p-3"><p className="font-bold text-slate-800 text-sm leading-tight">{c.nome_fantasia || c.razao_social}</p>{c.nome_fantasia && c.razao_social !== c.nome_fantasia && <p className="text-[10px] text-slate-500 mt-0.5">{c.razao_social}</p>}</td>
                      <td className="p-3 text-slate-600 font-mono text-xs">{c.cnpj_cpf || '-'}</td>
                      <td className="p-3 text-center"><Button size="sm" onClick={() => { setClienteBusca(c.nome_fantasia || c.razao_social); setModalClienteOpen(false); setBuscaModalCliente(""); }} className="bg-purple-100 text-purple-700 hover:bg-purple-200 shadow-none">Selecionar</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SELECIONAR OPERADOR */}
      {modalOperadorOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><UserCheck className="w-5 h-5 text-indigo-600"/> Localizar Operador</h3>
              <Button variant="ghost" size="sm" onClick={() => setModalOperadorOpen(false)} className="h-8 w-8 p-0 text-slate-500 hover:text-red-500"><X className="w-5 h-5"/></Button>
            </div>
            <div className="p-4 border-b border-slate-100 bg-white">
              <Input placeholder="Pesquise pelo nome do operador..." value={buscaModalOperador} onChange={e => setBuscaModalOperador(e.target.value)} className="bg-slate-50 font-medium border-indigo-200 focus-visible:ring-indigo-500" autoFocus />
            </div>
            <div className="overflow-y-auto flex-1 p-0 custom-scrollbar bg-white">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase sticky top-0 shadow-sm"><tr><th className="p-3 font-semibold">Nome do Operador</th><th className="p-3 font-semibold text-center w-28">Ação</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {operadoresBD.filter(o => (o.nome || "").toLowerCase().includes(buscaModalOperador.toLowerCase())).map(o => (
                    <tr key={o.id} className="hover:bg-indigo-50 transition-colors">
                      <td className="p-3 font-bold text-slate-800 text-sm">{o.nome}</td>
                      <td className="p-3 text-center">
                        <Button size="sm" onClick={() => { 
                          if (modoSelecaoOperador === "criacao") setOperadorNome(o.nome);
                          else setEditOperadorNome(o.nome);
                          setModalOperadorOpen(false); setBuscaModalOperador(""); 
                        }} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 shadow-none">Selecionar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SELECIONAR INSUMO */}
      {modalInsumoOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><PaintBucket className="w-5 h-5 text-purple-600"/> Localizar Insumo</h3>
              <Button variant="ghost" size="sm" onClick={() => setModalInsumoOpen(false)} className="h-8 w-8 p-0 text-slate-500 hover:text-red-500"><X className="w-5 h-5"/></Button>
            </div>
            <div className="p-4 border-b border-slate-100 bg-white">
              <Input placeholder="Pesquise por Nome ou Código SKU..." value={buscaModalInsumo} onChange={e => setBuscaModalInsumo(e.target.value)} className="bg-slate-50 font-medium border-purple-200 focus-visible:ring-purple-500" autoFocus />
            </div>
            <div className="overflow-y-auto flex-1 p-0 custom-scrollbar bg-white">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase sticky top-0 shadow-sm"><tr><th className="p-3 font-semibold">SKU / Código</th><th className="p-3 font-semibold">Nome do Insumo</th><th className="p-3 font-semibold text-right">Custo Base</th><th className="p-3 font-semibold text-center w-28">Ação</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {produtosBD.filter(p => (p.nome || "").toLowerCase().includes(buscaModalInsumo.toLowerCase()) || (p.sku || "").toLowerCase().includes(buscaModalInsumo.toLowerCase())).slice(0, 50).map(p => (
                    <tr key={p.id} className="hover:bg-purple-50 transition-colors">
                      <td className="p-3 text-slate-500 font-mono text-xs">{p.sku || 'S/N'}</td>
                      <td className="p-3 font-bold text-slate-800 text-sm">{p.nome}</td>
                      <td className="p-3 text-right text-emerald-600 font-medium text-xs">R$ {Number(p.custo_base || 0).toFixed(4).replace('.',',')}</td>
                      <td className="p-3 text-center"><Button size="sm" onClick={() => selecionarInsumo(p)} className="bg-purple-100 text-purple-700 hover:bg-purple-200 shadow-none">Adicionar</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ENVIO DE E-MAIL */}
{modalConfirmarEmail && dadosEmailPendente && (
<div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-50">
        <h3 className="font-bold text-blue-900 flex items-center gap-2"><Mail className="w-5 h-5"/> Enviar Atualização ao Cliente?</h3>
        <Button variant="ghost" size="sm" onClick={() => { setModalConfirmarEmail(false); fetchOrdens(); setOsSelecionada(null); }} className="h-8 w-8 p-0 text-slate-500 hover:text-red-500"><X className="w-5 h-5"/></Button>
    </div>
    <div className="p-6 space-y-4">
        <p className="text-sm text-slate-600">O status da OSG mudou. Deseja notificar o cliente <b>{dadosEmailPendente.cliente}</b> com a mensagem abaixo?</p>
        <div className="bg-slate-50 border p-4 rounded-lg">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Assunto</p>
            <p className="font-bold text-slate-800 mb-4">{dadosEmailPendente.assunto}</p>
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Mensagem</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{dadosEmailPendente.texto}</p>
        </div>
    </div>
    <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
        <Button variant="outline" onClick={() => { setModalConfirmarEmail(false); fetchOrdens(); setOsSelecionada(null); }}>Não Enviar</Button>
        <Button onClick={dispararEmailCliente} className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><Send className="w-4 h-4"/> Disparar E-mail</Button>
    </div>
    </div>
</div>
)}

      {/* MODAL: SELECIONAR EQUIPAMENTO */}
      {modalEquipamentoOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Printer className="w-5 h-5 text-blue-600"/> Localizar Equipamento</h3>
              <Button variant="ghost" size="sm" onClick={() => setModalEquipamentoOpen(false)} className="h-8 w-8 p-0 text-slate-500 hover:text-red-500"><X className="w-5 h-5"/></Button>
            </div>
            <div className="p-4 border-b border-slate-100 bg-white">
              <Input placeholder="Pesquise por Modelo, Número de Série ou Sequencial..." value={buscaModalEquipamento} onChange={e => setBuscaModalEquipamento(e.target.value)} className="bg-slate-50 font-medium border-blue-200 focus-visible:ring-blue-500" autoFocus />
            </div>
            <div className="overflow-y-auto flex-1 p-0 custom-scrollbar bg-white">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase sticky top-0 shadow-sm">
                  <tr>
                    <th className="p-3 font-semibold text-center w-20">Seq.</th>
                    <th className="p-3 font-semibold">Modelo</th>
                    <th className="p-3 font-semibold">Número de Série</th>
                    <th className="p-3 font-semibold text-center w-28">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {equipamentosTC.filter(eq => 
                    (eq.log_produtos?.nome || "").toLowerCase().includes(buscaModalEquipamento.toLowerCase()) || 
                    (eq.numero_serie || "").toLowerCase().includes(buscaModalEquipamento.toLowerCase()) ||
                    (eq.sequencial?.toString() || "").includes(buscaModalEquipamento)
                  ).slice(0, 50).map(eq => (
                    <tr key={eq.id} className="hover:bg-blue-50 transition-colors">
                      <td className="p-3 text-center font-mono font-bold text-slate-400">#{String(eq.sequencial).padStart(4,'0')}</td>
                      <td className="p-3 font-bold text-slate-800 text-sm">{eq.log_produtos?.nome || 'Modelo Desconhecido'}</td>
                      <td className="p-3 text-slate-600 font-mono text-xs">{eq.numero_serie}</td>
                      <td className="p-3 text-center">
                        <Button size="sm" onClick={() => { setEquipImpressaoId(eq.id); setModalEquipamentoOpen(false); setBuscaModalEquipamento(""); }} className="bg-blue-100 text-blue-700 hover:bg-blue-200 shadow-none">Selecionar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {abaAtiva === "abrir" ? (
        <div className="max-w-3xl mx-auto mt-6 mb-12 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white p-8 rounded-xl border shadow-sm space-y-6">
            <div className="text-center border-b pb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 mb-3"><FileOutput className="w-6 h-6"/></div>
                <h2 className="text-xl font-bold text-slate-800">Gerar Ordem de Serviço (OS)</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Cliente Autorizador <span className="text-red-500">*</span></label>
                  <div onClick={() => setModalClienteOpen(true)} className="bg-slate-50 border border-slate-200 p-2.5 rounded-md cursor-pointer flex items-center justify-between hover:border-purple-300 transition-colors">
                    <span className={clienteBusca ? "text-slate-800 font-bold" : "text-slate-400 font-medium"}>{clienteBusca || "Clique para selecionar o cliente..."}</span>
                    <Search className="w-4 h-4 text-slate-400" />
                  </div>
              </div>
              
              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><User className="w-4 h-4 text-slate-400"/> Nome do Solicitante <span className="text-red-500">*</span></label>
                  <Input value={solicitante} onChange={e => setSolicitante(e.target.value)} placeholder="Ex: Tais Santos" className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-400"/> Data da Solicitação <span className="text-red-500">*</span></label>
                  <Input type="date" value={dataSolicitacao} onChange={e => setDataSolicitacao(e.target.value)} className="bg-slate-50" />
              </div>

              <div className="space-y-2 md:col-span-2 pt-2 border-t border-slate-100">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><UserCheck className="w-4 h-4 text-indigo-500"/> Operador Gráfico Responsável <span className="text-red-500">*</span></label>
                  <div onClick={() => { setModoSelecaoOperador("criacao"); setModalOperadorOpen(true); }} className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-md cursor-pointer flex items-center justify-between hover:border-indigo-300 transition-colors">
                    <span className={operadorNome ? "text-indigo-900 font-bold" : "text-indigo-400 font-medium"}>{operadorNome || "Clique para selecionar o operador..."}</span>
                    <Search className="w-4 h-4 text-indigo-400" />
                  </div>
              </div>

              <div className="space-y-2 md:col-span-2 mt-2 pt-4 border-t border-slate-100">
                  <label className="text-sm font-bold text-slate-700">Serviço a ser Realizado <span className="text-red-500">*</span></label>
                  <Input value={descServico} onChange={e => setDescServico(e.target.value)} placeholder="Ex: Impressão de 500 Apostilas..." className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Quantidade Total (Qtd do Serviço) <span className="text-red-500">*</span></label>
                  <Input type="number" min="1" value={qtdProduzir} onChange={e => setQtdProduzir(parseFloat(e.target.value)||1)} className="bg-slate-50 font-bold text-center" />
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Data Prevista p/ Entrega <span className="text-red-500">*</span></label>
                  <Input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} className="bg-slate-50" />
              </div>

              <div className="space-y-4 md:col-span-2 bg-slate-50 p-4 rounded-md border border-slate-200 mt-2">
                  <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Requer Impressão em Equipamento TC?</label>
                      <Select value={possuiImpressao} onValueChange={setPossuiImpressao}>
                          <SelectTrigger className="bg-white z-[99999] border-slate-300"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-white z-[99999]">
                              <SelectItem value="Sim">Sim, exigirá apontamento de contadores</SelectItem>
                              <SelectItem value="Não">Não, apenas acabamento/outros</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  
                  {possuiImpressao === "Sim" && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 animate-in slide-in-from-top-2">
                          <div className="space-y-2">
                              <label className="text-sm font-bold text-blue-800">Qtd de Páginas por Produto <span className="text-red-500">*</span></label>
                              <Input type="number" min="1" value={paginasPorProdutoOS} onChange={e => setPaginasPorProdutoOS(Number(e.target.value))} placeholder="Ex: 50" className="bg-white border-blue-200" />
                          </div>
                          <div className="space-y-2">
                              <label className="text-sm font-bold text-blue-800">Valor Unitário Pág (R$) <span className="text-red-500">*</span></label>
                              <Input type="number" step="0.01" value={valorUnitarioPaginaOS} onChange={e => setValorUnitarioPaginaOS(e.target.value)} placeholder="0.00" className="bg-white border-blue-200" />
                          </div>
                          <div className="space-y-2">
                              <label className="text-sm font-bold text-blue-800">Modo Inicial</label>
                              <Select value={modoImpressaoOS} onValueChange={setModoImpressaoOS}>
                                  <SelectTrigger className="bg-white border-blue-200 z-[99999]"><SelectValue/></SelectTrigger>
                                  <SelectContent className="bg-white z-[99999]">
                                      <SelectItem value="Simplex">Simplex (Frente)</SelectItem>
                                      <SelectItem value="Duplex">Duplex (Frente e Verso)</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                      </div>
                  )}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={() => setAbaAtiva("painel")} className="h-12 w-1/3 border-slate-300 text-slate-600">Cancelar e Voltar</Button>
                <Button onClick={criarOS} disabled={salvandoOS} className="h-12 w-2/3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-base shadow-md">
                    {salvandoOS ? "Gerando..." : "Enviar para Fila de Produção"}
                </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-6rem)] max-w-[1600px] mx-auto overflow-hidden bg-slate-50 rounded-xl border shadow-sm">
          
          <div className="flex-1 flex flex-col overflow-hidden">
            
            <div className="bg-white p-4 border-b flex justify-between items-center shadow-sm z-10 flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Layers className="w-5 h-5 text-purple-600"/> Kanban de Produção Gráfica</h2>
                <p className="text-xs text-slate-500 mt-0.5">Gestão visual e ordenação cronológica de OSGs.</p>
              </div>
              
              <div className="flex gap-4 items-center flex-wrap">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <Input placeholder="Buscar OSG, Cliente ou Operador..." value={buscaOS} onChange={e => setBuscaOS(e.target.value)} className="pl-9 w-72 bg-slate-50 border-slate-200 focus-visible:ring-purple-500 h-9 text-sm" />
                </div>
                
                {osSelecionadasLote.length > 0 && !osSelecionada && (
                    <div className="flex gap-2 bg-blue-50 border border-blue-200 p-1 rounded-lg">
                        <Button onClick={() => gerarComprovantePDF(ordens.filter(o => osSelecionadasLote.includes(o.id)))} disabled={exportando} size="sm" variant="ghost" className="text-blue-700 hover:bg-blue-100 gap-2 h-7"><FileText className="w-4 h-4"/> Comprovante</Button>
                    </div>
                )}
                <Button onClick={() => setAbaAtiva("abrir")} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-md h-9"><Plus className="w-4 h-4"/> Nova OSG</Button>
              </div>
            </div>

            {/* KANBAN BOARD */}
            {!osSelecionada && (
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar flex gap-6 bg-slate-100">
                  {STATUS_FLUXO_GRAFICA.map(colunaNome => {
                    const cardsDaColuna = ordensFiltradas.filter(os => (colunaNome === "Concluído" && os.status === "Cancelado") || os.status === colunaNome);
                    const isConcluido = colunaNome === "Concluído";
                    const isCompactado = isConcluido && !mostrarConcluidos;

                    return (
                    <div key={colunaNome} className={`shrink-0 flex flex-col bg-slate-200/50 rounded-xl border border-slate-300/60 max-h-full transition-all duration-300 ${isCompactado ? 'w-64' : 'w-80'}`}>
                      <div className="p-3 border-b border-slate-300/60 bg-slate-200 rounded-t-xl flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-700 text-sm">{isConcluido ? "Demandas Finalizadas" : colunaNome}</h3>
                          <span className="bg-slate-300 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{cardsDaColuna.length}</span>
                        </div>
                        {isConcluido && mostrarConcluidos && (<Button variant="ghost" size="sm" onClick={() => setMostrarConcluidos(false)} className="h-6 text-[10px] px-2 text-slate-500 hover:text-slate-700">Ocultar</Button>)}
                      </div>

                      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar flex flex-col">
                        {isCompactado ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 mt-8">
                              <CheckCircle2 className="w-8 h-8 text-slate-400 mb-3" />
                              <p className="text-xs text-slate-500 mb-1">Quantidade de OSG's finalizadas</p>
                              <h4 className="text-xl font-bold text-blue-600 mb-6">{cardsDaColuna.length} OSG's</h4>
                              <Button onClick={() => setMostrarConcluidos(true)} className="bg-slate-800 hover:bg-slate-900 text-white w-full text-xs shadow-sm">Visualizar Todos</Button>
                          </div>
                        ) : (
                          <>
                            {cardsDaColuna.map(os => {
                              const isCancelada = os.status === "Cancelado";
                              return (
                              <div key={os.id} onClick={() => abrirPrancheta(os)} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-purple-400 hover:shadow-md cursor-pointer transition-all relative group flex flex-col">
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                      <input type="checkbox" className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer shadow-sm" checked={osSelecionadasLote.includes(os.id)} onChange={(e) => { if (e.target.checked) setOsSelecionadasLote([...osSelecionadasLote, os.id]); else setOsSelecionadasLote(osSelecionadasLote.filter(id => id !== os.id)); }} />
                                </div>
                                <div className="flex justify-between items-start mb-2 pr-6">
                                  <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider">OSG-{String(os.numero_op).padStart(4,'0')}</span>
                                  <div className="flex gap-2 items-center">
                                      {isCancelada && <span className="text-[9px] uppercase tracking-wider font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded">Cancelada</span>}
                                      <span className={`flex items-center gap-1 text-[9px] font-bold ${new Date(os.data_prevista) < new Date() && !isCancelada ? 'text-red-500' : 'text-slate-400'}`}>
                                        <CalendarDays className="w-3 h-3"/> {new Date(os.data_prevista).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                                      </span>
                                  </div>
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1 line-clamp-2" title={os.cliente_nome}>{os.cliente_nome}</h4>
                                <p className="text-[10px] text-slate-500 line-clamp-2 mb-2 leading-relaxed">{os.descricao_servico} <span className="font-semibold text-slate-700">(Qtd: {os.quantidade_produzir})</span></p>
                                <div className="flex flex-col gap-1 pt-2 border-t border-slate-50 mt-auto">
                                  <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-500 truncate max-w-[150px]"><User className="w-3 h-3 text-emerald-500 shrink-0"/> {os.solicitante || 'Não informado'}</div>
                                  <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-500 truncate max-w-[150px]"><UserCheck className="w-3 h-3 text-indigo-400 shrink-0"/> {os.operador_nome || 'Não atribuído'}</div>
                                      {os.observacoes?.includes("[Possui Impressão: Sim]") && <span title="Requer Impressão"><Printer className="w-3.5 h-3.5 text-blue-500 shrink-0" /></span>}
                                  </div>
                                </div>
                              </div>
                            )})}
                            {cardsDaColuna.length === 0 && (<div className="h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-xs text-slate-400 font-medium">Vazio</div>)}
                          </>
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
            )}

            {/* PRANCHETA DO IMPRESSOR */}
            {osSelecionada && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50">
                <div className="max-w-6xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-200">
                  <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-purple-600">
                      <div>
                          <div className="flex items-center gap-3 mb-1">
                              <Button variant="ghost" size="sm" onClick={() => setOsSelecionada(null)} className="h-8 px-2 text-slate-400 hover:text-slate-700"><ArrowLeft className="w-4 h-4"/></Button>
                              <h2 className="text-2xl font-black text-slate-800 uppercase">OSG-{String(osSelecionada.numero_op).padStart(4,'0')}</h2>
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{osSelecionada.cliente_nome}</span>
                          </div>
                          <div className="ml-12 mt-1 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                              {osSelecionada.data_solicitacao && <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 text-slate-400"/> Criado em: {new Date(osSelecionada.data_solicitacao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>}
                          </div>
                      </div>
                      <div className="flex flex-col md:flex-row items-center gap-3">
                          <Button variant="outline" size="sm" disabled={exportando} onClick={() => gerarComprovantePDF([osSelecionada])} className="text-slate-600 border-slate-300 gap-2">
                              {exportando ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4"/>} Comprovante
                          </Button>
                          <div className="flex items-center gap-2">
                              <Select value={statusOS} onValueChange={setStatusOS}>
                                  <SelectTrigger className="w-48 bg-white font-semibold border-purple-200 z-[99999]"><SelectValue/></SelectTrigger>
                                  <SelectContent className="bg-white z-[99999]">
                                      {STATUS_FLUXO_GRAFICA.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                      <SelectItem value="Cancelado" className="text-red-600 font-bold"><Ban className="w-4 h-4 inline mr-1"/> Cancelado</SelectItem>
                                  </SelectContent>
                              </Select>
                              <Button onClick={() => salvarAndamento()} disabled={salvandoOS} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-sm">Salvar</Button>
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                      
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Edit2 className="w-4 h-4 text-blue-500"/> Detalhes e Edição da OSG</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="space-y-2 md:col-span-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase">Serviço a ser Realizado</label>
                                  <Input value={editDescServico} onChange={e => setEditDescServico(e.target.value)} className="bg-slate-50 h-9 text-sm font-medium" />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase">Qtd do Serviço</label>
                                  <Input type="number" value={editQtdProduzir} onChange={e => setEditQtdProduzir(Number(e.target.value))} className="bg-slate-50 h-9 text-sm font-bold" />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase">Data Prevista</label>
                                  <Input type="date" value={editDataPrevista} onChange={e => setEditDataPrevista(e.target.value)} className="bg-slate-50 h-9 text-sm" />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase">Solicitante</label>
                                  <Input value={editSolicitante} onChange={e => setEditSolicitante(e.target.value)} className="bg-slate-50 h-9 text-sm" />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase">Operador Responsável</label>
                                  <div onClick={() => { setModoSelecaoOperador("edicao"); setModalOperadorOpen(true); }} className="bg-slate-50 border border-slate-200 h-9 px-3 rounded-md cursor-pointer flex items-center justify-between hover:border-blue-300 transition-colors">
                                    <span className="text-sm font-medium text-slate-700 truncate">{editOperadorNome || "Selecionar..."}</span>
                                    <Search className="w-3.5 h-3.5 text-slate-400" />
                                  </div>
                              </div>
                              
                              {osSelecionada.observacoes?.includes("[Possui Impressão: Sim]") && (
                                  <div className="space-y-2 md:col-span-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-4">
                                      <label className="text-xs font-bold text-blue-800 uppercase flex-shrink-0">Páginas por Produto:</label>
                                      <Input type="number" min="1" value={editPaginasPorProduto} onChange={e => setEditPaginasPorProduto(Number(e.target.value))} className="bg-white border-blue-200 h-8 w-24 text-sm font-bold text-center" />
                                      <span className="text-xs text-blue-600 italic">Isso afetará as estimativas de impressão.</span>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* PAINEL DE IMPRESSÃO */}
                      {osSelecionada.observacoes?.includes("[Possui Impressão: Sim]") && (
                          <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl shadow-sm space-y-6">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2"><Printer className="w-5 h-5"/> Painel de Produção & Apontamento</h3>
                                  <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-blue-100 shadow-sm w-full md:w-1/2">
                                      <div className="flex-1">
                                          <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                              <span>Progresso ({percentualConclusao.toFixed(0)}%)</span>
                                              <span>{totalProduzidoGeral} / {editQtdProduzir} un</span>
                                          </div>
                                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden"><div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${percentualConclusao}%` }}></div></div>
                                      </div>
                                      {percentualConclusao >= 100 && <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0"/>}
                                  </div>
                              </div>

                              {historicoProducao.length > 0 && (
                                  <div className="bg-white rounded-lg border border-blue-100 overflow-hidden">
                                      <div className="p-3 bg-slate-50 border-b text-xs font-bold text-slate-600 uppercase flex items-center gap-2"><Activity className="w-4 h-4"/> Histórico de Apontamentos</div>
                                      <table className="w-full text-left text-sm">
                                          <thead>
                                              <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b">
                                                  <th className="p-2 font-medium">Data</th><th className="p-2 font-medium">Equipamento</th><th className="p-2 font-medium text-center">Cont. Inicial</th><th className="p-2 font-medium text-center">Cont. Final</th><th className="p-2 font-medium text-center">Págs/Produto</th><th className="p-2 font-medium text-center">Produzido (Serviço)</th><th className="p-2 font-medium text-center text-rose-500">Desperdício (Páginas)</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                              {historicoProducao.map(hist => (
                                                  <tr key={hist.id} className="hover:bg-slate-50">
                                                      <td className="p-2 text-xs text-slate-600">{new Date(hist.data).toLocaleDateString('pt-BR')}</td>
                                                      <td className="p-2 font-medium text-slate-800 text-xs">{hist.equipamentoNome}</td>
                                                      <td className="p-2 text-center text-xs font-mono font-bold text-slate-500">{hist.contadorInicial}</td>
                                                      <td className="p-2 text-center text-xs font-mono font-bold text-slate-700">{hist.contadorFinal || '-'}</td>
                                                      <td className="p-2 text-center text-xs">{hist.paginasPorProduto}</td>
                                                      {hist.status === 'imprimindo' ? (
                                                          <td colSpan={2} className="p-2 text-center font-bold text-blue-500 animate-pulse text-xs bg-blue-50/50">Produção em andamento...</td>
                                                      ) : (
                                                          <><td className="p-2 text-center font-bold text-emerald-600">+{hist.producaoValida} un</td><td className="p-2 text-center font-bold text-rose-500">{(hist.desperdicio ?? 0) > 0 ? `${hist.desperdicio} págs` : '-'}</td></>
                                                      )}
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  </div>
                              )}
                              
                              {statusImpressao === "pendente" && totalProduzidoGeral < editQtdProduzir && statusOS !== "Faturamento" && statusOS !== "Concluído" && statusOS !== "Entregue" && statusOS !== "Cancelado" && (
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                      <div className="md:col-span-2 space-y-2">
                                          <label className="text-sm font-bold text-blue-800">Equipamento de Produção</label>
                                          
                                          {/* SUBSTITUI O SELECT ANTIGO PELO BOTÃO QUE ABRE O MODAL */}
                                          <div onClick={() => setModalEquipamentoOpen(true)} className="bg-white border border-blue-300 h-10 px-3 rounded-md cursor-pointer flex items-center justify-between hover:border-blue-500 transition-colors shadow-sm">
                                              <span className={equipImpressaoId ? "text-slate-800 font-semibold truncate" : "text-slate-400 font-medium"}>
                                                  {equipImpressaoId 
                                                      ? (() => { const e = equipamentosTC.find(x => x.id === equipImpressaoId); return e ? `${e.log_produtos?.nome || 'Equipamento'} (S/N: ${e.numero_serie})` : "Selecione..."; })() 
                                                      : "Pesquisar equipamento..."}
                                              </span>
                                              <Search className="w-4 h-4 text-blue-400 shrink-0" />
                                          </div>
                                      </div>
                                      <div className="space-y-2">
                                          <label className="text-sm font-bold text-blue-800">Qtd a Imprimir</label>
                                          <Input type="number" max={Math.max(0, editQtdProduzir - totalProduzidoGeral)} value={qtdImprimirServico} onChange={e => setQtdImprimirServico(Number(e.target.value))} className="bg-white font-bold text-center border-blue-300" />
                                      </div>
                                      <div className="space-y-2">
                                          <label className="text-sm font-bold text-blue-800">Modo</label>
                                          <Select value={modoImpressao} onValueChange={setModoImpressao}>
                                              <SelectTrigger className="bg-white z-[99999] border-blue-300"><SelectValue/></SelectTrigger>
                                              <SelectContent className="bg-white z-[99999]"><SelectItem value="Simplex">Simplex (Frente)</SelectItem><SelectItem value="Duplex">Duplex (Frente/Verso)</SelectItem></SelectContent>
                                          </Select>
                                      </div>
                                      
                                      {equipImpressaoId && (
                                          <div className="md:col-span-4 mt-4 bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                                              <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Estimativas (Baseadas em {qtdImprimirServico * paginasPorProduto} páginas | PPM do Equipamento: {eqPPM})</h4>
                                              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                  <div className="p-3 bg-slate-50 rounded border"><p className="text-[10px] uppercase font-bold text-slate-400">Tempo Estimado</p><p className="font-bold text-lg text-slate-700">{tempoEstimado} min</p></div>
                                                  <div className="p-3 bg-emerald-50 rounded border border-emerald-100"><p className="text-[10px] uppercase font-bold text-emerald-600">Custo Orig. Novo</p><p className="font-bold text-lg text-emerald-700">R$ {custoOriginalNovo}</p></div>
                                                  <div className="p-3 bg-teal-50 rounded border border-teal-100"><p className="text-[10px] uppercase font-bold text-teal-600">Orig. Recond.</p><p className="font-bold text-lg text-teal-700">R$ {custoOriginalRecond}</p></div>
                                                  <div className="p-3 bg-blue-50 rounded border border-blue-100"><p className="text-[10px] uppercase font-bold text-blue-600">Comp. Novo</p><p className="font-bold text-lg text-blue-700">R$ {custoCompatNovo}</p></div>
                                                  <div className="p-3 bg-indigo-50 rounded border border-indigo-100"><p className="text-[10px] uppercase font-bold text-indigo-600">Comp. Recond.</p><p className="font-bold text-lg text-indigo-700">R$ {custoCompatRecond}</p></div>
                                              </div>
                                              <div className="mt-4 flex gap-4 items-end">
                                                  <div className="flex-1 space-y-2">
                                                      <label className="text-sm font-bold text-rose-600">Contador Inicial (Páginas)</label>
                                                      <Input type="number" value={contadorInicial} onChange={e => setContadorInicial(e.target.value)} placeholder="Contador antes de imprimir" className="bg-white border-rose-300 font-bold" />
                                                  </div>
                                                  <Button onClick={iniciarImpressao} disabled={!contadorInicial || !valorUnitarioPagina || !paginasPorProduto} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-8"><PlayCircle className="w-4 h-4 mr-2"/> Iniciar Impressão</Button>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              )}
                              
                              {statusImpressao === "imprimindo" && (
                                  <div className="bg-white p-6 rounded-lg border border-blue-200 text-center space-y-4 shadow-inner">
                                      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto"/>
                                      <h3 className="text-xl font-bold text-blue-900">Produção em Andamento...</h3>
                                      <p className="text-slate-500 text-sm">Lote ativo de <span className="font-bold">{qtdImprimirServico} unidades</span> ({qtdImprimirServico * paginasPorProduto} páginas) (Cont. Inicial: <span className="font-mono text-slate-800">{contadorInicial}</span>).</p>
                                      <div className="max-w-xs mx-auto space-y-2 mt-4 text-left">
                                          <label className="text-sm font-bold text-rose-600">Contador Final do Equipamento</label>
                                          <Input type="number" value={contadorFinal} onChange={e => setContadorFinal(e.target.value)} className="font-bold border-rose-300" />
                                          <Button onClick={finalizarImpressao} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold mt-2"><CheckCircle2 className="w-4 h-4 mr-2"/> Registrar Lote</Button>
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}

                      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                          <div className="p-4 border-b bg-purple-50 flex flex-wrap justify-between items-center gap-4">
                              <div><h4 className="text-sm font-bold text-purple-900 uppercase flex items-center gap-2"><PaintBucket className="w-4 h-4 text-purple-600"/> Insumos Consumidos</h4></div>
                              <Button size="sm" onClick={() => setModalInsumoOpen(true)} className="h-9 px-4 bg-purple-600 hover:bg-purple-700 text-white gap-2"><Search className="w-4 h-4"/> Pesquisar Insumo</Button>
                          </div>
                          <div className="overflow-x-auto min-h-[150px]">
                              <table className="w-full text-left text-sm border-collapse">
                                  <thead>
                                      <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b bg-white"><th className="p-3 font-medium">Insumo</th><th className="p-3 font-medium text-center">Qtd</th><th className="p-3 font-medium text-right">Custo Un.</th><th className="p-3 font-medium text-right">Total</th><th className="p-3"></th></tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {insumos.length === 0 && (<tr><td colSpan={5} className="p-8 text-center text-slate-400 text-sm">Nenhum insumo lançado.</td></tr>)}
                                      {insumos.map((ins, idx) => (
                                          <tr key={ins.id} className="bg-white hover:bg-slate-50">
                                              <td className="p-3 font-semibold text-slate-700">{ins.nome}</td>
                                              <td className="p-3 text-center"><Input type="number" step="0.0001" min="0" value={ins.quantidade} onChange={e => { const ni = [...insumos]; ni[idx].quantidade = parseFloat(e.target.value)||0; setInsumos(ni); }} className="h-8 w-20 text-center mx-auto text-xs font-bold bg-slate-50 border-purple-200"/></td>
                                              <td className="p-3 text-right text-xs text-slate-500">R$ {Number(ins.custoUn).toFixed(4).replace('.',',')}</td>
                                              <td className="p-3 text-right font-bold text-rose-600">R$ {(ins.quantidade * ins.custoUn).toFixed(2).replace('.', ',')}</td>
                                              <td className="p-3 text-center"><button onClick={() => setInsumos(insumos.filter(x => x.id !== ins.id))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                          
                          <div className="bg-slate-800 p-5 text-white flex flex-col md:flex-row justify-between items-center gap-4">
                              <div className="flex gap-8 w-full md:w-auto">
                                  <div>
                                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Custo Prod.</p>
                                      <p className="text-2xl font-black text-rose-400">R$ {insumos.reduce((a,b) => a+(b.quantidade*b.custoUn), 0).toFixed(2).replace('.',',')}</p>
                                  </div>
                                  {osSelecionada.observacoes?.includes("[Possui Impressão: Sim]") && (
                                      <div className="border-l border-slate-600 pl-8">
                                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3"/> Receita Impressões</p>
                                          <p className="text-2xl font-black text-emerald-400">R$ {totalReceitaGerada.toFixed(2).replace('.',',')}</p>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-white p-5 rounded-xl border shadow-sm border-slate-200">
                          <div className="flex justify-between items-center mb-4 border-b pb-2">
                              <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2"><Paperclip className="w-4 h-4 text-blue-500"/> Arquivos</h4>
                              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 gap-1">{uploading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Plus className="w-3 h-3"/>} Anexar</Button>
                          </div>
                          <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                              {anexos.length === 0 ? (<p className="text-xs text-slate-400 italic text-center py-4">Nenhum arquivo anexado.</p>) : (
                                  anexos.map(anexo => (
                                      <div key={anexo.id} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-lg hover:border-blue-200 transition-colors group">
                                          <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]" title={anexo.nome_arquivo}>{anexo.nome_arquivo}</span>
                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <a href={anexo.url_arquivo} target="_blank" rel="noreferrer" className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"><Download className="w-3.5 h-3.5"/></a>
                                              <button onClick={() => deletarAnexo(anexo.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>

                      {/* TIMELINE (CHAT) */}
                      <div className="bg-slate-50 p-4 rounded-xl border shadow-sm border-slate-200 h-[450px] flex flex-col">
                          <h4 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2 mb-3 border-b border-slate-200 pb-2"><MessageSquare className="w-4 h-4 text-slate-500"/> Timeline (Follow-up)</h4>
                          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 mb-3">
                              {timeline.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic text-center py-4">Nenhum registro no histórico.</p>
                              ) : (
                                  timeline.map(ev => (
                                      <div key={ev.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative">
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
                              <textarea value={novoComentario} onChange={e => setNovoComentario(e.target.value)} className="w-full min-h-[60px] p-3 pr-12 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none custom-scrollbar" placeholder="Adicionar nova anotação..."></textarea>
                              <Button onClick={adicionarComentario} disabled={!novoComentario.trim()} size="sm" className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md"><Send className="w-4 h-4"/></Button>
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