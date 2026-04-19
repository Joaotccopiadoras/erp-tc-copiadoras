import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Layers, Scissors, CheckCircle2, Plus, Search, Trash2, ArrowLeft, Clock, PaintBucket, FileOutput, PlayCircle, AlertCircle, Edit2, Save, Paperclip, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type InsumoOS = { id: string; produtoId: string; nome: string; quantidade: number; custoUn: number; estoqueAtual: number };

export default function Grafica() {
  const [abaAtiva, setAbaAtiva] = useState<"abrir" | "painel">("painel");

  // DADOS BASE
  const [produtosBD, setProdutosBD] = useState<any[]>([]);
  const [clientesBD, setClientesBD] = useState<any[]>([]);

  // ESTADOS: ABRIR ORDEM DE SERVIÇO (OS)
  const [clienteBusca, setClienteBusca] = useState("");
  const [descServico, setDescServico] = useState("");
  const [qtdProduzir, setQtdProduzir] = useState(1);
  const [dataPrevista, setDataPrevista] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvandoOS, setSalvandoOS] = useState(false);

  // ESTADOS: PAINEL DE PRODUÇÃO
  const [ordens, setOrdens] = useState<any[]>([]);
  const [buscaOS, setBuscaOS] = useState("");
  const [osSelecionada, setOsSelecionada] = useState<any | null>(null);
  
  const [statusOS, setStatusOS] = useState("");
  const [buscaInsumo, setBuscaInsumo] = useState("");
  const [insumos, setInsumos] = useState<InsumoOS[]>([]);

  // ESTADOS: EDIÇÃO E ANEXOS
  const [editandoObs, setEditandoObs] = useState(false);
  const [obsTemp, setObsTemp] = useState("");
  const [anexos, setAnexos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDadosBase();
    fetchOrdens();
  }, [abaAtiva]);

  const fetchDadosBase = async () => {
    const [prodRes, cliRes] = await Promise.all([
      supabase.from('log_produtos').select('id, sku, nome, custo_base, estoque_atual').order('nome'),
      supabase.from('log_clientes').select('id, razao_social, nome_fantasia').order('nome_fantasia')
    ]);
    if (prodRes.data) setProdutosBD(prodRes.data);
    if (cliRes.data) setClientesBD(cliRes.data);
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
        observacoes: observacoes,
        status: 'Fila de Impressão'
      };

      const { error } = await supabase.from('prd_ordens_producao').insert([payload]);
      if (error) throw error;

      alert("Ordem de Serviço Gráfico enviada para a fila com sucesso!");
      setClienteBusca(""); setDescServico(""); setQtdProduzir(1); setDataPrevista(""); setObservacoes("");
      setAbaAtiva("painel");
    } catch (e: any) { alert("Erro ao criar OS: " + e.message); } finally { setSalvandoOS(false); }
  };

  // --- PRANCHETA DE PRODUÇÃO ---
  const abrirPrancheta = async (os: any) => {
    setOsSelecionada(os);
    setStatusOS(os.status);
    setObsTemp(os.observacoes || "");
    setEditandoObs(false);

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

  // --- EDIÇÃO DE OBSERVAÇÕES ---
  const salvarObservacoes = async () => {
      try {
          await supabase.from('prd_ordens_producao').update({ observacoes: obsTemp }).eq('id', osSelecionada.id);
          setOsSelecionada({...osSelecionada, observacoes: obsTemp});
          setEditandoObs(false);
          fetchOrdens();
      } catch(e: any) { alert("Erro ao salvar observações: " + e.message); }
  };

  // --- GESTÃO DE ANEXOS (UPLOAD) ---
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
      } catch(e: any) {
          alert("Erro no upload. Verifique se criou o Storage Bucket 'grafica_arquivos' como público. Erro: " + e.message);
      } finally {
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
      }
  };

  const deletarAnexo = async (id: string) => {
      if(!confirm("Tem certeza que deseja remover este arquivo da OS?")) return;
      await supabase.from('prd_op_anexos').delete().eq('id', id);
      setAnexos(anexos.filter(a => a.id !== id));
  };

  // --- INSUMOS E CONCLUSÃO ---
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
    if (!confirm("Atenção: Ao concluir a OS, toda a matéria-prima listada será IMEDIATAMENTE BAIXADA do estoque. Deseja confirmar a conclusão do serviço?")) return;
    
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
            documento: `OSG-${osSelecionada.numero_op}`, fornecedor_cliente: osSelecionada.cliente_nome, observacoes: 'Consumo no Serviço Gráfico'
        });
      }

      alert("Serviço Concluído! Insumos baixados do estoque e OS movida para 'Pronto para Entrega'.");
      fetchOrdens(); setOsSelecionada(null);
    } catch (e: any) { alert("Erro ao concluir: " + e.message); } finally { setSalvandoOS(false); }
  };

  const ordensFiltradas = ordens.filter(o => 
    (o.cliente_nome?.toLowerCase() || "").includes(buscaOS.toLowerCase()) || 
    (o.descricao_servico?.toLowerCase() || "").includes(buscaOS.toLowerCase()) ||
    (o.numero_op?.toString() || "").includes(buscaOS)
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto mb-12">
        <datalist id="grafica-clientes">{clientesBD.map((c) => <option key={c.id} value={c.nome_fantasia || c.razao_social} />)}</datalist>
        <datalist id="grafica-insumos">{produtosBD.map((p) => <option key={p.id} value={`${p.sku || 'S/N'} - ${p.nome}`} />)}</datalist>

        {/* CABEÇALHO E ABAS */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Layers className="w-6 h-6 text-purple-600" /> Produção Gráfica (Serviços)</h1>
            <p className="text-slate-500">Gestão de Ordens de Serviço Gráfico (OSG) e consumo de insumos.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setAbaAtiva("painel")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "painel" ? "bg-white shadow-sm text-purple-700" : "text-slate-600"}`}><Printer className="w-4 h-4"/> Chão de Fábrica</button>
            <button onClick={() => setAbaAtiva("abrir")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "abrir" ? "bg-white shadow-sm text-emerald-700" : "text-slate-600"}`}><Plus className="w-4 h-4"/> Nova OS</button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA: NOVA OS */}
        {/* ========================================================================= */}
        {abaAtiva === "abrir" && (
          <div className="bg-white p-8 rounded-xl border shadow-sm max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center border-b pb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 mb-3"><FileOutput className="w-6 h-6"/></div>
                <h2 className="text-xl font-bold text-slate-800">Gerar Ordem de Serviço (OS)</h2>
                <p className="text-slate-500 text-sm">Insira o serviço gráfico na fila de produção.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Cliente Solicitante <span className="text-red-500">*</span></label>
                  <Input list="grafica-clientes" value={clienteBusca} onChange={e => setClienteBusca(e.target.value)} placeholder="Nome do cliente ou empresa..." className="bg-slate-50" />
              </div>
              <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Serviço a ser Realizado <span className="text-red-500">*</span></label>
                  <Input value={descServico} onChange={e => setDescServico(e.target.value)} placeholder="Ex: Impressão de 500 Cartões Frente/Verso, 2 Banners Lona..." className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Quantidade <span className="text-red-500">*</span></label>
                  <Input type="number" min="1" value={qtdProduzir} onChange={e => setQtdProduzir(parseFloat(e.target.value)||1)} className="bg-slate-50 font-bold text-center" />
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Data Prevista para Entrega <span className="text-red-500">*</span></label>
                  <Input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} className="bg-slate-50" />
              </div>
              <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Ficha Técnica e Acabamento</label>
                  <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} className="w-full min-h-[80px] p-3 border rounded-md bg-slate-50 text-sm" placeholder="Ex: Refilar com 2mm de sangria, encadernação wire-o preto..."></textarea>
              </div>
            </div>

            <Button onClick={criarOS} disabled={salvandoOS} className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold text-base shadow-md">
                {salvandoOS ? "Gerando..." : "Enviar para Chão de Fábrica"}
            </Button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: PAINEL DE PRODUÇÃO (KANBAN LISTA) */}
        {/* ========================================================================= */}
        {abaAtiva === "painel" && !osSelecionada && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex flex-wrap items-center gap-4 bg-slate-50 justify-between">
              <div className="relative w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={buscaOS} onChange={e => setBuscaOS(e.target.value)} placeholder="Buscar OS, Cliente ou Serviço..." className="pl-9 bg-white" /></div>
            </div>
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b text-center w-28">OS Nº</th>
                    <th className="p-4 font-semibold border-b">Cliente</th>
                    <th className="p-4 font-semibold border-b">Serviço</th>
                    <th className="p-4 font-semibold border-b text-center">Entrega</th>
                    <th className="p-4 font-semibold border-b text-center">Status</th>
                    <th className="p-4 font-semibold border-b text-center w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordensFiltradas.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhuma OS Gráfica na fila.</td></tr>
                  ) : (
                    ordensFiltradas.map(os => {
                        const corStatus = os.status === 'Fila de Impressão' ? 'bg-slate-100 text-slate-700' : os.status === 'Em Produção' ? 'bg-blue-100 text-blue-700' : os.status === 'Acabamento' ? 'bg-amber-100 text-amber-700' : os.status === 'Pronto para Entrega' ? 'bg-emerald-100 text-emerald-700' : 'bg-green-100 text-green-800';

                        return (
                        <tr key={os.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => abrirPrancheta(os)}>
                          <td className="p-4 text-center font-black text-purple-700 font-mono text-sm">OSG-{String(os.numero_op).padStart(4,'0')}</td>
                          <td className="p-4 font-bold text-slate-800 text-sm">{os.cliente_nome}</td>
                          <td className="p-4">
                              <p className="text-sm font-semibold text-slate-700">{os.descricao_servico}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Qtd: {os.quantidade_produzir}</p>
                          </td>
                          <td className="p-4 text-center text-xs font-bold text-rose-600">{new Date(os.data_prevista).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                          <td className="p-4 text-center">
                              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${corStatus}`}>{os.status}</span>
                          </td>
                          <td className="p-4 text-center">
                              <Button variant="outline" size="sm" className="text-purple-600 border-purple-200 group-hover:bg-purple-50 h-8 text-xs">Abrir</Button>
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

        {/* ========================================================================= */}
        {/* ABA: PRANCHETA DO IMPRESSOR */}
        {/* ========================================================================= */}
        {abaAtiva === "painel" && osSelecionada && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-200">
            
            {/* CABEÇALHO DA OS */}
            <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-purple-600">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Button variant="ghost" size="sm" onClick={() => setOsSelecionada(null)} className="h-8 px-2 text-slate-400 hover:text-slate-700"><ArrowLeft className="w-4 h-4"/></Button>
                        <h2 className="text-2xl font-black text-slate-800 uppercase">OSG-{String(osSelecionada.numero_op).padStart(4,'0')}</h2>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{osSelecionada.cliente_nome}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700 ml-12">
                        <span className="font-bold flex items-center gap-1"><Printer className="w-4 h-4 text-slate-400"/> {osSelecionada.descricao_servico} (Qtd: {osSelecionada.quantidade_produzir})</span>
                    </div>
                </div>
                {osSelecionada.status === 'Pronto para Entrega' || osSelecionada.status === 'Entregue' ? (
                     <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> OS Finalizada</div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Select value={statusOS} onValueChange={setStatusOS}>
                            <SelectTrigger className="w-44 bg-white font-semibold border-purple-200"><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="Fila de Impressão">Fila de Impressão</SelectItem><SelectItem value="Em Produção">Em Produção</SelectItem><SelectItem value="Acabamento">Acabamento</SelectItem><SelectItem value="Cancelado">Cancelado</SelectItem></SelectContent>
                        </Select>
                        <Button onClick={() => salvarAndamento()} disabled={salvandoOS} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-sm">Salvar Etapa</Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LADO ESQUERDO: INFOS, EDIÇÃO DE FICHA E ANEXOS */}
                <div className="space-y-6">
                    <div className="bg-amber-50 p-5 rounded-xl border border-amber-100">
                        <h4 className="text-sm font-bold text-amber-800 uppercase flex items-center gap-2 mb-2"><Clock className="w-4 h-4"/> Prazo de Entrega</h4>
                        <p className="text-xl font-black text-amber-900">{new Date(osSelecionada.data_prevista).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                    </div>

                    {/* Ficha Técnica (Editável) */}
                    <div className="bg-slate-50 p-5 rounded-xl border shadow-sm border-slate-200">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2"><Scissors className="w-4 h-4 text-purple-500"/> Ficha Técnica</h4>
                            {!editandoObs ? (
                                <Button variant="ghost" size="sm" onClick={() => { setObsTemp(osSelecionada.observacoes || ""); setEditandoObs(true); }} className="h-7 text-xs text-indigo-600 hover:bg-indigo-50 gap-1 px-2 border border-transparent"><Edit2 className="w-3 h-3"/> Editar</Button>
                            ) : (
                                <Button variant="default" size="sm" onClick={salvarObservacoes} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1 px-3"><Save className="w-3 h-3"/> Salvar</Button>
                            )}
                        </div>
                        {!editandoObs ? (
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{osSelecionada.observacoes || "Nenhuma observação cadastrada."}</p>
                        ) : (
                            <textarea value={obsTemp} onChange={e => setObsTemp(e.target.value)} className="w-full min-h-[120px] p-3 text-sm rounded-md border border-slate-300 focus:ring-purple-500 outline-none" placeholder="Digite as especificações de sangria, acabamento, etc..."></textarea>
                        )}
                    </div>

                    {/* Anexos (Upload de Arquivos) */}
                    <div className="bg-white p-5 rounded-xl border shadow-sm border-slate-200">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2"><Paperclip className="w-4 h-4 text-blue-500"/> Arquivos da OS</h4>
                            
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                            <Button variant="outline" size="sm" disabled={uploading || osSelecionada.status === 'Pronto para Entrega' || osSelecionada.status === 'Entregue'} onClick={() => fileInputRef.current?.click()} className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 gap-1">
                                {uploading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Plus className="w-3 h-3"/>} Anexar Arte
                            </Button>
                        </div>
                        
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                            {anexos.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-4">Nenhum arquivo anexado a esta OS.</p>
                            ) : (
                                anexos.map(anexo => (
                                    <div key={anexo.id} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-lg hover:border-blue-200 transition-colors group">
                                        <span className="text-xs font-medium text-slate-700 truncate max-w-[160px]" title={anexo.nome_arquivo}>{anexo.nome_arquivo}</span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a href={anexo.url_arquivo} target="_blank" rel="noreferrer" className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Baixar / Visualizar"><Download className="w-3.5 h-3.5"/></a>
                                            {(osSelecionada.status !== 'Pronto para Entrega' && osSelecionada.status !== 'Entregue') && (
                                                <button onClick={() => deletarAnexo(anexo.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded" title="Excluir Arquivo"><Trash2 className="w-3.5 h-3.5"/></button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* LADO DIREITO: APONTAMENTO DE INSUMOS */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-purple-50 flex flex-wrap justify-between items-center gap-4">
                            <div>
                                <h4 className="text-sm font-bold text-purple-900 uppercase flex items-center gap-2"><PaintBucket className="w-4 h-4 text-purple-600"/> Matéria-Prima / Insumos Consumidos</h4>
                                <p className="text-[10px] text-purple-700 mt-1">Aponte o que foi gasto nesta OS para calcular o custo do serviço.</p>
                            </div>
                            {(osSelecionada.status !== 'Pronto para Entrega' && osSelecionada.status !== 'Entregue') && (
                                <div className="flex gap-2">
                                    <Input list="grafica-insumos" value={buscaInsumo} onChange={e => setBuscaInsumo(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') adicionarInsumo() }} placeholder="Buscar insumo..." className="h-9 text-xs w-48 bg-white border-purple-200" />
                                    <Button size="sm" onClick={adicionarInsumo} className="h-9 px-3 bg-purple-600 hover:bg-purple-700 text-white"><Plus className="w-4 h-4"/></Button>
                                </div>
                            )}
                        </div>
                        
                        <div className="overflow-x-auto min-h-[250px]">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b bg-white">
                                        <th className="p-3 font-medium">Insumo</th>
                                        <th className="p-3 font-medium text-center">Qtd Gasta</th>
                                        <th className="p-3 font-medium text-right">Custo Un.</th>
                                        <th className="p-3 font-medium text-right">Custo Total</th>
                                        {(osSelecionada.status !== 'Pronto para Entrega' && osSelecionada.status !== 'Entregue') && <th className="p-3"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {insumos.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-xs text-slate-400 font-medium">Nenhum insumo apontado. O custo deste serviço está zerado.</td></tr>
                                    ) : (
                                        insumos.map((ins, idx) => (
                                            <tr key={ins.id} className="bg-white hover:bg-slate-50">
                                                <td className="p-3 font-semibold text-slate-700">{ins.nome}</td>
                                                <td className="p-3 text-center">
                                                    <Input type="number" step="0.0001" min="0" disabled={osSelecionada.status === 'Pronto para Entrega' || osSelecionada.status === 'Entregue'} value={ins.quantidade} onChange={e => { const ni = [...insumos]; ni[idx].quantidade = parseFloat(e.target.value)||0; setInsumos(ni); }} className="h-8 w-20 text-center mx-auto text-xs font-bold bg-slate-50 border-purple-200 focus-visible:ring-purple-500"/>
                                                </td>
                                                <td className="p-3 text-right text-xs text-slate-500">R$ {Number(ins.custoUn).toFixed(4).replace('.',',')}</td>
                                                <td className="p-3 text-right font-bold text-rose-600">R$ {(ins.quantidade * ins.custoUn).toFixed(2).replace('.', ',')}</td>
                                                {(osSelecionada.status !== 'Pronto para Entrega' && osSelecionada.status !== 'Entregue') && (
                                                    <td className="p-3 text-center"><button onClick={() => setInsumos(insumos.filter(x => x.id !== ins.id))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* RODAPÉ COM CUSTO E BOTÃO MAGICO DE BAIXA */}
                        <div className="bg-slate-800 p-5 text-white flex justify-between items-center">
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Custo Total do Serviço</p>
                                <p className="text-2xl font-black text-rose-400">R$ {insumos.reduce((a,b) => a+(b.quantidade*b.custoUn), 0).toFixed(2).replace('.',',')}</p>
                            </div>
                            {(osSelecionada.status !== 'Pronto para Entrega' && osSelecionada.status !== 'Entregue') && (
                                <Button onClick={concluirServico} disabled={salvandoOS} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 px-6 gap-2 shadow-md animate-pulse duration-2000"><PlayCircle className="w-5 h-5"/> Concluir OS e Baixar Estoque</Button>
                            )}
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