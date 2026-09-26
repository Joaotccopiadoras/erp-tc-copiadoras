import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Layers, Scissors, CheckCircle2, Plus, Search, Trash2, ArrowLeft, Clock, PaintBucket, FileOutput, PlayCircle, AlertCircle, Edit2, Save, Paperclip, Download, Loader2, Landmark, DollarSign, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
};

export default function Grafica() {
  const [abaAtiva, setAbaAtiva] = useState<"abrir" | "painel">("painel");

  // DADOS BASE
  const [produtosBD, setProdutosBD] = useState<any[]>([]);
  const [clientesBD, setClientesBD] = useState<any[]>([]);
  const [catReceitaId, setCatReceitaId] = useState("");
  const [equipamentosTC, setEquipamentosTC] = useState<any[]>([]);

  // ESTADOS: ABRIR ORDEM DE SERVIÇO (OS)
  const [clienteBusca, setClienteBusca] = useState("");
  const [descServico, setDescServico] = useState("");
  const [qtdProduzir, setQtdProduzir] = useState(1);
  const [dataPrevista, setDataPrevista] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [possuiImpressao, setPossuiImpressao] = useState("Não");
  
  const [valorCobrado, setValorCobrado] = useState("");
  const [condicaoPagamento, setCondicaoPagamento] = useState("À Vista");
  const [salvandoOS, setSalvandoOS] = useState(false);

  // ESTADOS: PAINEL DE PRODUÇÃO
  const [ordens, setOrdens] = useState<any[]>([]);
  const [buscaOS, setBuscaOS] = useState("");
  const [osSelecionada, setOsSelecionada] = useState<any | null>(null);
  
  const [statusOS, setStatusOS] = useState("");
  const [buscaInsumo, setBuscaInsumo] = useState("");
  const [insumos, setInsumos] = useState<InsumoOS[]>([]);
  const [historicoProducao, setHistoricoProducao] = useState<ApontamentoProducao[]>([]);

  // ESTADOS: FLUXO DE IMPRESSÃO
  const [statusImpressao, setStatusImpressao] = useState<"pendente" | "imprimindo">("pendente");
  const [equipImpressaoId, setEquipImpressaoId] = useState("");
  const [qtdImprimir, setQtdImprimir] = useState(1);
  const [modoImpressao, setModoImpressao] = useState("Simplex");
  const [contadorInicial, setContadorInicial] = useState("");
  const [contadorFinal, setContadorFinal] = useState("");

  // ESTADOS: EDIÇÃO E ANEXOS
  const [editandoObs, setEditandoObs] = useState(false);
  const [obsTemp, setObsTemp] = useState("");
  const [anexos, setAnexos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // AUTO-SAVE (Rascunho de Sessão)
  // ==========================================
  useEffect(() => {
    const rascunho = sessionStorage.getItem("grafica_rascunho");
    if (rascunho) {
      try {
        const draft = JSON.parse(rascunho);
        if (draft.abaAtiva) setAbaAtiva(draft.abaAtiva);
        if (draft.clienteBusca) setClienteBusca(draft.clienteBusca);
        if (draft.descServico) setDescServico(draft.descServico);
        if (draft.qtdProduzir) setQtdProduzir(draft.qtdProduzir);
        if (draft.dataPrevista) setDataPrevista(draft.dataPrevista);
        if (draft.observacoes) setObservacoes(draft.observacoes);
        if (draft.valorCobrado) setValorCobrado(draft.valorCobrado);
        if (draft.condicaoPagamento) setCondicaoPagamento(draft.condicaoPagamento);
        if (draft.possuiImpressao) setPossuiImpressao(draft.possuiImpressao);
        
        // Obs: Evitamos restaurar statusImpressao do sessionStorage para não conflitar com a persistência real do Banco.
        if (draft.osSelecionada !== undefined) setOsSelecionada(draft.osSelecionada);
        if (draft.statusOS) setStatusOS(draft.statusOS);
        if (draft.insumos) setInsumos(draft.insumos);
        if (draft.editandoObs !== undefined) setEditandoObs(draft.editandoObs);
        if (draft.obsTemp) setObsTemp(draft.obsTemp);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const draft = { 
        abaAtiva, clienteBusca, descServico, qtdProduzir, dataPrevista, observacoes, valorCobrado, condicaoPagamento, possuiImpressao,
        osSelecionada, statusOS, insumos, editandoObs, obsTemp
    };
    sessionStorage.setItem("grafica_rascunho", JSON.stringify(draft));
  }, [
      abaAtiva, clienteBusca, descServico, qtdProduzir, dataPrevista, observacoes, valorCobrado, condicaoPagamento, possuiImpressao,
      osSelecionada, statusOS, insumos, editandoObs, obsTemp
  ]);

  useEffect(() => {
    fetchDadosBase();
    fetchOrdens();
  }, [abaAtiva]);

  const fetchDadosBase = async () => {
    const [prodRes, cliRes, catRes, eqRes] = await Promise.all([
      supabase.from('log_produtos').select('id, sku, nome, custo_base, estoque_atual').order('nome'),
      supabase.from('log_clientes').select('id, razao_social, nome_fantasia').order('nome_fantasia'),
      supabase.from('fin_categorias').select('id').eq('tipo', 'Receita').limit(1).single(),
      supabase.from('srv_equipamentos').select('id, numero_serie, log_produtos(nome), log_clientes(nome_fantasia, razao_social)')
    ]);
    
    if (prodRes.data) setProdutosBD(prodRes.data);
    if (cliRes.data) setClientesBD(cliRes.data);
    if (catRes.data) setCatReceitaId(catRes.data.id);
    if (eqRes.data) {
        const tcEquips = eqRes.data.filter((e: any) => {
            const nomeCli = (e.log_clientes?.nome_fantasia || "").toUpperCase();
            const razaoCli = (e.log_clientes?.razao_social || "").toUpperCase();
            return nomeCli.includes("TC SERVICOS") || razaoCli.includes("TC SERVICOS");
        });
        setEquipamentosTC(tcEquips);
    }
  };

  const fetchOrdens = async () => {
    const { data } = await supabase.from('prd_ordens_producao').select('*').order('numero_op', { ascending: false });
    if (data) setOrdens(data);
  };

  // --- ABRIR OS ---
  const criarOS = async () => {
    if (!clienteBusca || !descServico || !dataPrevista) return alert("Cliente, Descrição e Data Prevista são obrigatórios.");
    
    setSalvandoOS(true);
    try {
      const payload = {
        cliente_nome: clienteBusca,
        descricao_servico: descServico,
        quantidade_produzir: qtdProduzir,
        data_prevista: dataPrevista,
        valor_total: parseFloat(valorCobrado) || 0,
        condicao_pagamento: condicaoPagamento,
        status: 'Fila de Impressão',
        observacoes: `[Possui Impressão: ${possuiImpressao}]\n${observacoes}`,
        historico_producao: []
      };

      const { error } = await supabase.from('prd_ordens_producao').insert([payload]);
      if (error) throw error;

      alert("Ordem de Serviço Gráfico enviada para a fila com sucesso!");
      setClienteBusca(""); setDescServico(""); setQtdProduzir(1); setDataPrevista(""); setObservacoes(""); setValorCobrado(""); setCondicaoPagamento("À Vista"); setPossuiImpressao("Não");
      setAbaAtiva("painel");
    } catch (e: any) { alert("Erro ao criar OS: " + e.message); } finally { setSalvandoOS(false); }
  };

  // --- PRANCHETA DE PRODUÇÃO ---
  const abrirPrancheta = async (os: any) => {
    setOsSelecionada(os);
    setStatusOS(os.status);
    setObsTemp(os.observacoes || "");
    setEditandoObs(false);
    
    let hist: ApontamentoProducao[] = [];
    try { hist = typeof os.historico_producao === 'string' ? JSON.parse(os.historico_producao) : (os.historico_producao || []); } catch(e){}
    setHistoricoProducao(hist);

    // Identifica se há uma produção interrompida/em andamento no Banco de Dados
    const producaoAtiva = hist.find(h => h.status === 'imprimindo');
    
    if (producaoAtiva) {
        setStatusImpressao("imprimindo");
        setEquipImpressaoId(producaoAtiva.equipamentoId);
        setQtdImprimir(producaoAtiva.qtdSolicitada);
        setModoImpressao(producaoAtiva.modo);
        setContadorInicial(producaoAtiva.contadorInicial.toString());
        setContadorFinal("");
    } else {
        const totalProduzido = hist.filter(h => h.status === 'concluido').reduce((acc, curr) => acc + (curr.producaoValida || 0), 0);
        const pendente = Math.max(0, os.quantidade_produzir - totalProduzido);

        setStatusImpressao("pendente");
        setContadorInicial("");
        setContadorFinal("");
        setEquipImpressaoId("");
        setQtdImprimir(pendente || os.quantidade_produzir);
    }

    const [insumosRes, anexosRes] = await Promise.all([
        supabase.from('prd_op_insumos').select('*').eq('op_id', os.id),
        supabase.from('prd_op_anexos').select('*').eq('op_id', os.id).order('data_upload', { ascending: false })
    ]);

    if (insumosRes.data) {
        setInsumos(insumosRes.data.map(i => ({
            id: i.id, produtoId: i.produto_id, nome: i.produto_nome, 
            quantidade: i.quantidade, custoUn: i.custo_unitario, estoqueAtual: 999 
        })));
    }
    if (anexosRes.data) setAnexos(anexosRes.data);
  };

  const salvarObservacoes = async () => {
      try {
          await supabase.from('prd_ordens_producao').update({ observacoes: obsTemp }).eq('id', osSelecionada.id);
          setOsSelecionada({...osSelecionada, observacoes: obsTemp});
          setEditandoObs(false);
          fetchOrdens();
      } catch(e: any) { alert("Erro ao salvar observações: " + e.message); }
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
          const { data: novoAnexo, error: dbError } = await supabase.from('prd_op_anexos').insert([payload]).select().single();
          if (dbError) throw dbError;

          setAnexos([novoAnexo, ...anexos]);
          alert("Arquivo anexado com sucesso!");
      } catch(e: any) { alert("Erro no upload. Erro: " + e.message); } finally {
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
      }
  };

  const deletarAnexo = async (id: string) => {
      if(!confirm("Tem certeza que deseja remover este arquivo da OS?")) return;
      await supabase.from('prd_op_anexos').delete().eq('id', id);
      setAnexos(anexos.filter(a => a.id !== id));
  };

  const adicionarInsumo = () => {
    if (!buscaInsumo) return;
    const prod = produtosBD.find(p => p.nome === buscaInsumo || `${p.sku || 'S/N'} - ${p.nome}` === buscaInsumo);
    if (!prod) return alert("Insumo não encontrado no catálogo.");

    setInsumos([...insumos, { id: crypto.randomUUID(), produtoId: prod.id, nome: prod.nome, quantidade: 1, custoUn: prod.custo_base || 0, estoqueAtual: prod.estoque_atual || 0 }]);
    setBuscaInsumo("");
  };

  const salvarAndamento = async (statusFinal?: string) => {
    setSalvandoOS(true);
    try {
      const novoStatus = statusFinal || statusOS;
      const custoTotalInsumos = insumos.reduce((a, b) => a + (b.quantidade * b.custoUn), 0);

      await supabase.from('prd_ordens_producao').update({ status: novoStatus, custo_total_insumos: custoTotalInsumos }).eq('id', osSelecionada.id);

      await supabase.from('prd_op_insumos').delete().eq('op_id', osSelecionada.id);
      if (insumos.length > 0) {
        const payloadInsumos = insumos.map(i => ({ op_id: osSelecionada.id, produto_id: i.produtoId, produto_nome: i.nome, quantidade: i.quantidade, custo_unitario: i.custoUn, custo_total: i.quantidade * i.custoUn }));
        await supabase.from('prd_op_insumos').insert(payloadInsumos);
      }

      alert("Apontamentos de serviço salvos com sucesso!");
      fetchOrdens(); setOsSelecionada(null);
    } catch (e: any) { alert(e.message); } finally { setSalvandoOS(false); }
  };

  const concluirServico = async () => {
    if (!confirm("Atenção: Ao concluir a OS, a matéria-prima listada será baixada do estoque. Confirmar?")) return;
    setSalvandoOS(true);
    try {
      await salvarAndamento('Pronto para Entrega');
      for (const insumo of insumos) {
        const { data: prodData } = await supabase.from('log_produtos').select('estoque_atual').eq('id', insumo.produtoId).single();
        if (prodData) {
            const novoEst = Math.max(0, prodData.estoque_atual - insumo.quantidade);
            await supabase.from('log_produtos').update({ estoque_atual: novoEst }).eq('id', insumo.produtoId);
        }
        await supabase.from('log_movimentacoes').insert({
            produto_id: insumo.produtoId, tipo: 'Saída', quantidade: insumo.quantidade, 
            documento: `OSG-${osSelecionada.numero_op}`, fornecedor_cliente: osSelecionada.cliente_nome, observacoes: 'Consumo Gráfica'
        });
      }
      alert("Serviço Concluído!");
      fetchOrdens(); setOsSelecionada(null);
    } catch (e: any) { alert("Erro ao concluir: " + e.message); } finally { setSalvandoOS(false); }
  };

  const faturarServico = async () => {
    if (!osSelecionada.valor_total || osSelecionada.valor_total <= 0) return alert("Valor cobrado zerado.");
    if (!confirm(`Faturar R$ ${osSelecionada.valor_total.toFixed(2)}?`)) return;
    setSalvandoOS(true);
    try {
        const vencimento = new Date();
        if (osSelecionada.condicao_pagamento.includes("30")) vencimento.setDate(vencimento.getDate() + 30);
        else if (osSelecionada.condicao_pagamento.includes("15")) vencimento.setDate(vencimento.getDate() + 15);

        await supabase.from('fin_lancamentos').insert([{
            tipo: 'Receita', descricao: `Serviço Gráfico OSG-${String(osSelecionada.numero_op).padStart(4,'0')} - ${osSelecionada.cliente_nome}`,
            valor: osSelecionada.valor_total, data_emissao: new Date().toISOString().split('T')[0],
            data_vencimento: vencimento.toISOString().split('T')[0], status: 'Pendente', categoria_id: catReceitaId || null,
            documento_origem: `OSG-${String(osSelecionada.numero_op).padStart(4,'0')}`, observacoes: `Condição: ${osSelecionada.condicao_pagamento}`
        }]);

        await supabase.from('prd_ordens_producao').update({ status: 'Faturada' }).eq('id', osSelecionada.id);
        alert("Serviço Faturado!");
        fetchOrdens(); setOsSelecionada(null);
    } catch (e: any) { alert("Erro ao faturar: " + e.message); } finally { setSalvandoOS(false); }
  };

  // --- INICIAR IMPRESSÃO (SALVA NO BANCO O STATUS EM ANDAMENTO) ---
  const iniciarImpressao = async () => {
      if (!contadorInicial) return alert("Informe o contador inicial do equipamento.");
      
      const eq = equipamentosTC.find(e => e.id === equipImpressaoId);
      const novoApontamento: ApontamentoProducao = {
          id: crypto.randomUUID(),
          data: new Date().toISOString(),
          equipamentoId: equipImpressaoId,
          equipamentoNome: eq ? `${eq.log_produtos?.nome} (S/N: ${eq.numero_serie})` : 'Equipamento Desconhecido',
          modo: modoImpressao,
          qtdSolicitada: qtdImprimir,
          contadorInicial: Number(contadorInicial),
          status: 'imprimindo'
      };

      const novoHistorico = [...historicoProducao, novoApontamento];
      setHistoricoProducao(novoHistorico);
      setStatusImpressao("imprimindo");

      try {
          await supabase.from('prd_ordens_producao').update({ historico_producao: novoHistorico }).eq('id', osSelecionada.id);
      } catch (e: any) {
          alert("Erro ao persistir o início da produção no banco: " + e.message);
      }
  };

  // --- FINALIZAR IMPRESSÃO (APONTAMENTO PARCIAL/TOTAL) ---
  const finalizarImpressao = async () => {
    if (!contadorFinal || Number(contadorFinal) < Number(contadorInicial)) return alert("Contador Final inválido.");
    const diff = Number(contadorFinal) - Number(contadorInicial);
    
    let producaoValida = diff;
    let desperdicio = 0;

    if (diff > qtdImprimir) {
        producaoValida = qtdImprimir;
        desperdicio = diff - qtdImprimir;
        const porcentagem = ((desperdicio / qtdImprimir) * 100).toFixed(1);
        alert(`ALERTA DE DESPERDÍCIO:\nDiferença: ${diff} | Demandada: ${qtdImprimir}\nDesperdício: ${desperdicio} páginas (${porcentagem}%)`);
    } else if (diff < qtdImprimir) {
        alert(`Apontamento Parcial: Foram impressas ${diff} páginas de um total de ${qtdImprimir} demandadas nesta rodada.`);
    }

    // Atualiza o registro que estava "imprimindo" para "concluido"
    const novoHistorico = historicoProducao.map(h => {
        if (h.status === 'imprimindo') {
            return { ...h, contadorFinal: Number(contadorFinal), producaoValida, desperdicio, status: 'concluido' as const };
        }
        return h;
    });

    setHistoricoProducao(novoHistorico);

    try {
        await supabase.from('prd_ordens_producao').update({ historico_producao: novoHistorico }).eq('id', osSelecionada.id);
        
        const totalProduzidoAgora = novoHistorico.filter(h => h.status === 'concluido').reduce((acc, curr) => acc + (curr.producaoValida || 0), 0);
        if (totalProduzidoAgora >= osSelecionada.quantidade_produzir) {
            alert("Sucesso! A quantidade total demandada para esta OS foi atingida.");
        }
        
        setStatusImpressao("pendente");
        setContadorInicial("");
        setContadorFinal("");
        setQtdImprimir(Math.max(0, osSelecionada.quantidade_produzir - totalProduzidoAgora));
    } catch (e: any) {
        alert("Erro ao salvar histórico de produção: " + e.message);
    }
  };

  // Estimativas de Impressão (Mock)
  const eqPPM = 40;
  const tempoEstimado = Math.ceil(qtdImprimir / eqPPM);
  const custoOriginalNovo = (qtdImprimir * 0.08).toFixed(2);
  const custoOriginalRecond = (qtdImprimir * 0.05).toFixed(2);
  const custoCompatNovo = (qtdImprimir * 0.04).toFixed(2);
  const custoCompatRecond = (qtdImprimir * 0.02).toFixed(2);

  const ordensFiltradas = ordens.filter(o => 
    (o.cliente_nome?.toLowerCase() || "").includes(buscaOS.toLowerCase()) || 
    (o.descricao_servico?.toLowerCase() || "").includes(buscaOS.toLowerCase()) ||
    (o.numero_op?.toString() || "").includes(buscaOS)
  );

  const totalProduzidoGeral = historicoProducao.filter(h => h.status === 'concluido').reduce((acc, curr) => acc + (curr.producaoValida || 0), 0);
  const percentualConclusao = osSelecionada ? Math.min(100, (totalProduzidoGeral / osSelecionada.quantidade_produzir) * 100) : 0;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto mb-12">
        <datalist id="grafica-clientes">{clientesBD.map((c) => <option key={c.id} value={c.nome_fantasia || c.razao_social} />)}</datalist>
        <datalist id="grafica-insumos">{produtosBD.map((p) => <option key={p.id} value={`${p.sku || 'S/N'} - ${p.nome}`} />)}</datalist>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Layers className="w-6 h-6 text-purple-600" /> Produção Gráfica (Serviços)</h1>
            <p className="text-slate-500">Gestão de Ordens de Serviço Gráfico (OSG), insumos e faturamento.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => { setAbaAtiva("painel"); setOsSelecionada(null); }} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "painel" ? "bg-white shadow-sm text-purple-700" : "text-slate-600"}`}><Printer className="w-4 h-4"/> Painel</button>
            <button onClick={() => { setAbaAtiva("abrir"); setOsSelecionada(null); }} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "abrir" ? "bg-white shadow-sm text-emerald-700" : "text-slate-600"}`}><Plus className="w-4 h-4"/> Nova OS</button>
          </div>
        </div>

        {/* ABA: NOVA OS COMERCIAL */}
        {abaAtiva === "abrir" && (
          <div className="bg-white p-8 rounded-xl border shadow-sm max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center border-b pb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 mb-3"><FileOutput className="w-6 h-6"/></div>
                <h2 className="text-xl font-bold text-slate-800">Gerar Ordem de Serviço (OS)</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Cliente Solicitante <span className="text-red-500">*</span></label>
                  <Input list="grafica-clientes" value={clienteBusca} onChange={e => setClienteBusca(e.target.value)} placeholder="Nome do cliente ou empresa..." className="bg-slate-50" />
              </div>
              <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Serviço a ser Realizado <span className="text-red-500">*</span></label>
                  <Input value={descServico} onChange={e => setDescServico(e.target.value)} placeholder="Ex: Impressão de 500 Cartões..." className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Quantidade Total <span className="text-red-500">*</span></label>
                  <Input type="number" min="1" value={qtdProduzir} onChange={e => setQtdProduzir(parseFloat(e.target.value)||1)} className="bg-slate-50 font-bold text-center" />
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Data Prevista <span className="text-red-500">*</span></label>
                  <Input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} className="bg-slate-50" />
              </div>

              <div className="space-y-2 md:col-span-2 bg-slate-50 p-3 rounded-md border border-slate-200">
                  <label className="text-sm font-bold text-slate-700">Requer Impressão em Equipamento TC?</label>
                  <Select value={possuiImpressao} onValueChange={setPossuiImpressao}>
                      <SelectTrigger className="bg-white z-[99999]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white z-[99999]">
                          <SelectItem value="Sim">Sim, exigirá apontamento de contadores</SelectItem>
                          <SelectItem value="Não">Não, apenas acabamento/outros</SelectItem>
                      </SelectContent>
                  </Select>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-5 bg-indigo-50 p-4 rounded-lg border border-indigo-100 mt-2">
                  <div className="space-y-2">
                      <label className="text-sm font-bold text-indigo-900">Valor Cobrado (R$)</label>
                      <Input type="number" step="0.01" value={valorCobrado} onChange={e => setValorCobrado(e.target.value)} placeholder="0.00" className="bg-white font-bold text-indigo-700" />
                  </div>
                  <div className="space-y-2">
                      <label className="text-sm font-bold text-indigo-900">Condição de Pagto.</label>
                      <Select value={condicaoPagamento} onValueChange={setCondicaoPagamento}>
                          <SelectTrigger className="bg-white z-[99999]"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-white z-[99999]">
                              <SelectItem value="À Vista">À Vista</SelectItem>
                              <SelectItem value="Boleto 15 Dias">Boleto 15 Dias</SelectItem>
                              <SelectItem value="Boleto 30 Dias">Boleto 30 Dias</SelectItem>
                              <SelectItem value="Cartão Crédito">Cartão de Crédito</SelectItem>
                              <SelectItem value="PIX">PIX</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              </div>
            </div>

            <Button onClick={criarOS} disabled={salvandoOS} className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold text-base shadow-md">
                {salvandoOS ? "Gerando..." : "Enviar para Painel"}
            </Button>
          </div>
        )}

        {/* ABA: PAINEL DE PRODUÇÃO */}
        {abaAtiva === "painel" && !osSelecionada && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex flex-wrap items-center gap-4 bg-slate-50 justify-between">
              <div className="relative w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={buscaOS} onChange={e => setBuscaOS(e.target.value)} placeholder="Buscar OS..." className="pl-9 bg-white" /></div>
            </div>
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b text-center w-28">OS Nº</th>
                    <th className="p-4 font-semibold border-b">Cliente / Serviço</th>
                    <th className="p-4 font-semibold border-b text-center">Entrega</th>
                    <th className="p-4 font-semibold border-b text-right">Valor Venda</th>
                    <th className="p-4 font-semibold border-b text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordensFiltradas.length === 0 ? (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-500">Nenhuma OS encontrada.</td></tr>
                  ) : (
                    ordensFiltradas.map(os => {
                        const isFaturada = os.status === 'Faturada';
                        const corStatus = os.status === 'Fila de Impressão' ? 'bg-slate-100 text-slate-700' : os.status === 'Em Produção' ? 'bg-blue-100 text-blue-700' : os.status === 'Acabamento' ? 'bg-amber-100 text-amber-700' : os.status === 'Pronto para Entrega' ? 'bg-emerald-100 text-emerald-700' : isFaturada ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-green-100 text-green-800';

                        return (
                        <tr key={os.id} className={`transition-colors cursor-pointer group hover:bg-slate-50`} onClick={() => abrirPrancheta(os)}>
                          <td className="p-4 text-center font-black text-purple-700 font-mono text-sm">OSG-{String(os.numero_op).padStart(4,'0')}</td>
                          <td className="p-4">
                              <p className="font-bold text-slate-800 text-sm leading-tight">{os.cliente_nome}</p>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{os.descricao_servico} <span className="font-semibold">(Qtd: {os.quantidade_produzir})</span></p>
                          </td>
                          <td className="p-4 text-center text-xs font-bold text-rose-600">{new Date(os.data_prevista).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                          <td className="p-4 text-right font-bold text-emerald-600 text-sm">R$ {Number(os.valor_total || 0).toFixed(2).replace('.',',')}</td>
                          <td className="p-4 text-center">
                              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${corStatus}`}>{isFaturada ? 'Faturada' : os.status}</span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {abaAtiva === "painel" && osSelecionada && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-200">
            <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-purple-600">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Button variant="ghost" size="sm" onClick={() => setOsSelecionada(null)} className="h-8 px-2 text-slate-400 hover:text-slate-700"><ArrowLeft className="w-4 h-4"/></Button>
                        <h2 className="text-2xl font-black text-slate-800 uppercase">OSG-{String(osSelecionada.numero_op).padStart(4,'0')}</h2>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{osSelecionada.cliente_nome}</span>
                    </div>
                </div>
                {osSelecionada.status === 'Faturada' ? (
                     <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Serviço Faturado</div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Select value={statusOS} onValueChange={setStatusOS}>
                            <SelectTrigger className="w-44 bg-white font-semibold border-purple-200 z-[99999]"><SelectValue/></SelectTrigger>
                            <SelectContent className="bg-white z-[99999]"><SelectItem value="Fila de Impressão">Fila de Impressão</SelectItem><SelectItem value="Em Produção">Em Produção</SelectItem><SelectItem value="Acabamento">Acabamento</SelectItem><SelectItem value="Pronto para Entrega">Pronto para Entrega</SelectItem><SelectItem value="Cancelado">Cancelado</SelectItem></SelectContent>
                        </Select>
                        <Button onClick={() => salvarAndamento()} disabled={salvandoOS} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-sm">Salvar Etapa</Button>
                    </div>
                )}
            </div>

            {/* PAINEL DE IMPRESSÃO - COM PROGRESSO PERSISTENTE */}
            {osSelecionada.observacoes?.includes("[Possui Impressão: Sim]") && (statusOS === "Fila de Impressão" || statusOS === "Em Produção") && (
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl shadow-sm space-y-6">
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2"><Printer className="w-5 h-5"/> Painel de Produção & Apontamento</h3>
                        <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-blue-100 shadow-sm w-full md:w-1/2">
                            <div className="flex-1">
                                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                    <span>Progresso da OS ({percentualConclusao.toFixed(0)}%)</span>
                                    <span>{totalProduzidoGeral} / {osSelecionada.quantidade_produzir} un</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${percentualConclusao}%` }}></div>
                                </div>
                            </div>
                            {percentualConclusao >= 100 && <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0"/>}
                        </div>
                    </div>

                    {/* HISTÓRICO DE PRODUÇÃO DA OS */}
                    {historicoProducao.length > 0 && (
                        <div className="bg-white rounded-lg border border-blue-100 overflow-hidden">
                            <div className="p-3 bg-slate-50 border-b text-xs font-bold text-slate-600 uppercase flex items-center gap-2">
                                <Activity className="w-4 h-4"/> Histórico de Apontamentos
                            </div>
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b">
                                        <th className="p-2 font-medium">Data</th>
                                        <th className="p-2 font-medium">Equipamento</th>
                                        <th className="p-2 font-medium text-center">Modo</th>
                                        <th className="p-2 font-medium text-center">Produzido</th>
                                        <th className="p-2 font-medium text-center text-rose-500">Desperdício</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {historicoProducao.map(hist => (
                                        <tr key={hist.id} className="hover:bg-slate-50">
                                            <td className="p-2 text-xs text-slate-600">{new Date(hist.data).toLocaleDateString('pt-BR')}</td>
                                            <td className="p-2 font-medium text-slate-800 text-xs">{hist.equipamentoNome}</td>
                                            <td className="p-2 text-center text-xs">{hist.modo}</td>
                                            {hist.status === 'imprimindo' ? (
                                                <td colSpan={2} className="p-2 text-center font-bold text-blue-500 animate-pulse text-xs bg-blue-50/50">Produção em andamento...</td>
                                            ) : (
                                                <>
                                                    <td className="p-2 text-center font-bold text-emerald-600">+{hist.producaoValida}</td>
                                                    <td className="p-2 text-center font-bold text-rose-500">{(hist.desperdicio ?? 0) > 0 ? hist.desperdicio : '-'}</td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    
                    {/* NOVO APONTAMENTO / OU RETORNO DE APONTAMENTO PENDENTE */}
                    {statusImpressao === "pendente" && totalProduzidoGeral < osSelecionada.quantidade_produzir && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-bold text-blue-800">Equipamento de Produção</label>
                                <Select value={equipImpressaoId} onValueChange={setEquipImpressaoId}>
                                    <SelectTrigger className="bg-white z-[99999] border-blue-300"><SelectValue placeholder="Selecione o equipamento interno..."/></SelectTrigger>
                                    <SelectContent className="bg-white z-[99999]">
                                        {equipamentosTC.map(e => <SelectItem key={e.id} value={e.id}>{e.log_produtos?.nome} (S/N: {e.numero_serie})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-blue-800">Qtd a Imprimir Agora</label>
                                <Input type="number" max={Math.max(0, osSelecionada.quantidade_produzir - totalProduzidoGeral)} value={qtdImprimir} onChange={e => setQtdImprimir(Number(e.target.value))} className="bg-white font-bold text-center border-blue-300" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-blue-800">Modo</label>
                                <Select value={modoImpressao} onValueChange={setModoImpressao}>
                                    <SelectTrigger className="bg-white z-[99999] border-blue-300"><SelectValue/></SelectTrigger>
                                    <SelectContent className="bg-white z-[99999]">
                                        <SelectItem value="Simplex">Simplex (Frente)</SelectItem>
                                        <SelectItem value="Duplex">Duplex (Frente/Verso)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {equipImpressaoId && (
                                <div className="md:col-span-4 mt-4 bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Estimativas da Rodada</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div className="p-3 bg-slate-50 rounded border"><p className="text-[10px] uppercase font-bold text-slate-400">Tempo Estimado</p><p className="font-bold text-lg text-slate-700">{tempoEstimado} min</p></div>
                                        <div className="p-3 bg-emerald-50 rounded border border-emerald-100"><p className="text-[10px] uppercase font-bold text-emerald-600">Custo Orig. Novo</p><p className="font-bold text-lg text-emerald-700">R$ {custoOriginalNovo}</p></div>
                                        <div className="p-3 bg-teal-50 rounded border border-teal-100"><p className="text-[10px] uppercase font-bold text-teal-600">Orig. Recond.</p><p className="font-bold text-lg text-teal-700">R$ {custoOriginalRecond}</p></div>
                                        <div className="p-3 bg-blue-50 rounded border border-blue-100"><p className="text-[10px] uppercase font-bold text-blue-600">Comp. Novo</p><p className="font-bold text-lg text-blue-700">R$ {custoCompatNovo}</p></div>
                                        <div className="p-3 bg-indigo-50 rounded border border-indigo-100"><p className="text-[10px] uppercase font-bold text-indigo-600">Comp. Recond.</p><p className="font-bold text-lg text-indigo-700">R$ {custoCompatRecond}</p></div>
                                    </div>
                                    <div className="mt-4 flex gap-4 items-end">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-sm font-bold text-rose-600">Contador Inicial</label>
                                            <Input type="number" value={contadorInicial} onChange={e => setContadorInicial(e.target.value)} placeholder="Contador antes de imprimir" className="bg-white border-rose-300 font-bold" />
                                        </div>
                                        <Button onClick={iniciarImpressao} disabled={!contadorInicial} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-8"><PlayCircle className="w-4 h-4 mr-2"/> Iniciar Impressão</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {statusImpressao === "imprimindo" && (
                        <div className="bg-white p-6 rounded-lg border border-blue-200 text-center space-y-4 shadow-inner">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto"/>
                            <h3 className="text-xl font-bold text-blue-900">Produção em Andamento...</h3>
                            <p className="text-slate-500 text-sm">
                                Lote ativo de <span className="font-bold">{qtdImprimir} unidades</span> (Iniciado em: {contadorInicial}).<br/>
                                <span className="text-blue-600 font-medium">Este status já está salvo no banco. Você pode fechar o sistema e retornar mais tarde.</span>
                            </p>
                            <div className="max-w-xs mx-auto space-y-2 mt-4 text-left">
                                <label className="text-sm font-bold text-rose-600">Contador Final do Equipamento</label>
                                <Input type="number" value={contadorFinal} onChange={e => setContadorFinal(e.target.value)} placeholder="Contador após conclusão..." className="font-bold border-rose-300" />
                                <Button onClick={finalizarImpressao} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold mt-2"><CheckCircle2 className="w-4 h-4 mr-2"/> Registrar Lote</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6">
                    
                    {/* ANEXOS RESTAURADOS */}
                    <div className="bg-white p-5 rounded-xl border shadow-sm border-slate-200">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2"><Paperclip className="w-4 h-4 text-blue-500"/> Arquivos da OS</h4>
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                            <Button variant="outline" size="sm" disabled={uploading || osSelecionada.status === 'Faturada'} onClick={() => fileInputRef.current?.click()} className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 gap-1">
                                {uploading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Plus className="w-3 h-3"/>} Anexar
                            </Button>
                        </div>
                        
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                            {anexos.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-4">Nenhum arquivo anexado.</p>
                            ) : (
                                anexos.map(anexo => (
                                    <div key={anexo.id} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-lg hover:border-blue-200 transition-colors group">
                                        <span className="text-xs font-medium text-slate-700 truncate max-w-[160px]" title={anexo.nome_arquivo}>{anexo.nome_arquivo}</span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a href={anexo.url_arquivo} target="_blank" rel="noreferrer" className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"><Download className="w-3.5 h-3.5"/></a>
                                            {osSelecionada.status !== 'Faturada' && (
                                                <button onClick={() => deletarAnexo(anexo.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-xl border shadow-sm border-slate-200">
                        {!editandoObs ? (
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{osSelecionada.observacoes || "Nenhuma observação."}</p>
                        ) : (
                            <textarea value={obsTemp} onChange={e => setObsTemp(e.target.value)} className="w-full min-h-[120px] p-3 text-sm rounded-md border outline-none"></textarea>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-purple-50 flex flex-wrap justify-between items-center gap-4">
                            <div>
                                <h4 className="text-sm font-bold text-purple-900 uppercase flex items-center gap-2"><PaintBucket className="w-4 h-4 text-purple-600"/> Insumos Consumidos</h4>
                            </div>
                            {(osSelecionada.status !== 'Pronto para Entrega' && osSelecionada.status !== 'Faturada') && (
                                <div className="flex gap-2">
                                    <Input list="grafica-insumos" value={buscaInsumo} onChange={e => setBuscaInsumo(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') adicionarInsumo() }} placeholder="Buscar insumo..." className="h-9 text-xs w-48 bg-white border-purple-200" />
                                    <Button size="sm" onClick={adicionarInsumo} className="h-9 px-3 bg-purple-600 hover:bg-purple-700 text-white"><Plus className="w-4 h-4"/></Button>
                                </div>
                            )}
                        </div>
                        
                        <div className="overflow-x-auto min-h-[200px]">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b bg-white">
                                        <th className="p-3 font-medium">Insumo</th>
                                        <th className="p-3 font-medium text-center">Qtd</th>
                                        <th className="p-3 font-medium text-right">Custo Un.</th>
                                        <th className="p-3 font-medium text-right">Total</th>
                                        <th className="p-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {insumos.map((ins, idx) => (
                                        <tr key={ins.id} className="bg-white hover:bg-slate-50">
                                            <td className="p-3 font-semibold text-slate-700">{ins.nome}</td>
                                            <td className="p-3 text-center">
                                                <Input type="number" step="0.0001" min="0" disabled={osSelecionada.status === 'Pronto para Entrega' || osSelecionada.status === 'Faturada'} value={ins.quantidade} onChange={e => { const ni = [...insumos]; ni[idx].quantidade = parseFloat(e.target.value)||0; setInsumos(ni); }} className="h-8 w-20 text-center mx-auto text-xs font-bold bg-slate-50 border-purple-200"/>
                                            </td>
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
                            </div>
                            <div className="w-full md:w-auto">
                                {(osSelecionada.status !== 'Pronto para Entrega' && osSelecionada.status !== 'Faturada') ? (
                                    <Button onClick={concluirServico} disabled={salvandoOS} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold h-12 px-6 gap-2 shadow-md"><PlayCircle className="w-5 h-5"/> Concluir OS</Button>
                                ) : osSelecionada.status === 'Pronto para Entrega' ? (
                                    <Button onClick={faturarServico} disabled={salvandoOS} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 px-6 gap-2 shadow-md animate-pulse duration-2000"><Landmark className="w-5 h-5"/> Faturar</Button>
                                ) : (
                                    <div className="bg-white/10 text-emerald-300 font-bold px-6 py-3 rounded-lg border border-emerald-500/30 flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5"/> Faturada</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}