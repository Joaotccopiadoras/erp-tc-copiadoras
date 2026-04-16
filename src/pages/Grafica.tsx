import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Layers, Scissors, CheckCircle2, Plus, Search, Trash2, ArrowLeft, Clock, PaintBucket, FileOutput, PlayCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type InsumoOP = { id: string; produtoId: string; nome: string; quantidade: number; custoUn: number; estoqueAtual: number };

export default function Grafica() {
  const [abaAtiva, setAbaAtiva] = useState<"abrir" | "painel">("painel");

  // DADOS BASE
  const [produtosBD, setProdutosBD] = useState<any[]>([]);
  const [clientesBD, setClientesBD] = useState<any[]>([]);

  // ESTADOS: ABRIR ORDEM DE PRODUÇÃO (OP)
  const [clienteBusca, setClienteBusca] = useState("");
  const [descServico, setDescServico] = useState("");
  const [qtdProduzir, setQtdProduzir] = useState(1);
  const [dataPrevista, setDataPrevista] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvandoOP, setSalvandoOP] = useState(false);

  // ESTADOS: PAINEL DE PRODUÇÃO
  const [ordens, setOrdens] = useState<any[]>([]);
  const [buscaOP, setBuscaOP] = useState("");
  const [opSelecionada, setOpSelecionada] = useState<any | null>(null);
  
  const [statusOP, setStatusOP] = useState("");
  const [buscaInsumo, setBuscaInsumo] = useState("");
  const [insumos, setInsumos] = useState<InsumoOP[]>([]);

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

  // --- ABRIR OP ---
  const criarOP = async () => {
    if (!clienteBusca || !descServico || !dataPrevista) return alert("Cliente, Descrição e Data Prevista são obrigatórios.");
    
    setSalvandoOP(true);
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

      alert("Ordem de Produção (OP) enviada para a fila com sucesso!");
      setClienteBusca(""); setDescServico(""); setQtdProduzir(1); setDataPrevista(""); setObservacoes("");
      setAbaAtiva("painel");
    } catch (e: any) { alert("Erro ao criar OP: " + e.message); } finally { setSalvandoOP(false); }
  };

  // --- PRANCHETA DE PRODUÇÃO ---
  const abrirPrancheta = async (op: any) => {
    setOpSelecionada(op);
    setStatusOP(op.status);

    const { data } = await supabase.from('prd_op_insumos').select('*').eq('op_id', op.id);
    if (data) {
        setInsumos(data.map(i => ({
            id: i.id, produtoId: i.produto_id, nome: i.produto_nome, 
            quantidade: i.quantidade, custoUn: i.custo_unitario, estoqueAtual: 999 
        })));
    }
  };

  const adicionarInsumo = () => {
    if (!buscaInsumo) return;
    const prod = produtosBD.find(p => p.nome === buscaInsumo || `${p.sku || 'S/N'} - ${p.nome}` === buscaInsumo);
    if (!prod) return alert("Insumo não encontrado no catálogo.");

    setInsumos([...insumos, { id: crypto.randomUUID(), produtoId: prod.id, nome: prod.nome, quantidade: 1, custoUn: prod.custo_base || 0, estoqueAtual: prod.estoque_atual || 0 }]);
    setBuscaInsumo("");
  };

  const salvarAndamento = async (statusFinal?: string) => {
    setSalvandoOP(true);
    try {
      const novoStatus = statusFinal || statusOP;
      const custoTotalInsumos = insumos.reduce((a, b) => a + (b.quantidade * b.custoUn), 0);

      await supabase.from('prd_ordens_producao').update({ status: novoStatus, custo_total_insumos: custoTotalInsumos }).eq('id', opSelecionada.id);

      // Limpa e recria insumos
      await supabase.from('prd_op_insumos').delete().eq('op_id', opSelecionada.id);
      if (insumos.length > 0) {
        const payloadInsumos = insumos.map(i => ({ op_id: opSelecionada.id, produto_id: i.produtoId, produto_nome: i.nome, quantidade: i.quantidade, custo_unitario: i.custoUn, custo_total: i.quantidade * i.custoUn }));
        await supabase.from('prd_op_insumos').insert(payloadInsumos);
      }

      alert("Apontamentos de produção salvos com sucesso!");
      fetchOrdens(); setOpSelecionada(null);
    } catch (e: any) { alert(e.message); } finally { setSalvandoOP(false); }
  };

  // --- BAIXAR ESTOQUE E CONCLUIR ---
  const concluirProducao = async () => {
    if (!confirm("Atenção: Ao concluir a OP, toda a matéria-prima listada será IMEDIATAMENTE BAIXADA do estoque. Deseja confirmar a produção?")) return;
    
    setSalvandoOP(true);
    try {
      // 1. Salva os insumos finais
      await salvarAndamento('Pronto para Entrega');

      // 2. Dá baixa no Estoque
      for (const insumo of insumos) {
        const { data: prodData } = await supabase.from('log_produtos').select('estoque_atual').eq('id', insumo.produtoId).single();
        if (prodData) {
            const novoEst = Math.max(0, prodData.estoque_atual - insumo.quantidade);
            await supabase.from('log_produtos').update({ estoque_atual: novoEst }).eq('id', insumo.produtoId);
        }
        await supabase.from('log_movimentacoes').insert({
            produto_id: insumo.produtoId, tipo: 'Saída', quantidade: insumo.quantidade, 
            documento: `OP-${opSelecionada.numero_op}`, fornecedor_cliente: opSelecionada.cliente_nome, observacoes: 'Consumo na Produção Gráfica'
        });
      }

      alert("Produção Concluída! Insumos baixados do estoque e OP movida para 'Pronto para Entrega'.");
      fetchOrdens(); setOpSelecionada(null);
    } catch (e: any) { alert("Erro ao concluir: " + e.message); } finally { setSalvandoOP(false); }
  };

  const ordensFiltradas = ordens.filter(o => 
    (o.cliente_nome?.toLowerCase() || "").includes(buscaOP.toLowerCase()) || 
    (o.descricao_servico?.toLowerCase() || "").includes(buscaOP.toLowerCase()) ||
    (o.numero_op?.toString() || "").includes(buscaOP)
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto mb-12">
        <datalist id="grafica-clientes">{clientesBD.map((c) => <option key={c.id} value={c.nome_fantasia || c.razao_social} />)}</datalist>
        <datalist id="grafica-insumos">{produtosBD.map((p) => <option key={p.id} value={`${p.sku || 'S/N'} - ${p.nome}`} />)}</datalist>

        {/* CABEÇALHO E ABAS */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Layers className="w-6 h-6 text-purple-600" /> Produção Gráfica</h1>
            <p className="text-slate-500">Gestão de Ordens de Produção (OP) e consumo de matéria-prima.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setAbaAtiva("painel")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "painel" ? "bg-white shadow-sm text-purple-700" : "text-slate-600"}`}><Printer className="w-4 h-4"/> Chão de Fábrica</button>
            <button onClick={() => setAbaAtiva("abrir")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "abrir" ? "bg-white shadow-sm text-emerald-700" : "text-slate-600"}`}><Plus className="w-4 h-4"/> Nova OP</button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA: NOVA OP */}
        {/* ========================================================================= */}
        {abaAtiva === "abrir" && (
          <div className="bg-white p-8 rounded-xl border shadow-sm max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center border-b pb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 mb-3"><FileOutput className="w-6 h-6"/></div>
                <h2 className="text-xl font-bold text-slate-800">Gerar Ordem de Produção (OP)</h2>
                <p className="text-slate-500 text-sm">Insira o trabalho na fila de impressão e acabamento.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Cliente Solicitante <span className="text-red-500">*</span></label>
                  <Input list="grafica-clientes" value={clienteBusca} onChange={e => setClienteBusca(e.target.value)} placeholder="Nome do cliente ou empresa..." className="bg-slate-50" />
              </div>
              <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Serviço a ser Produzido <span className="text-red-500">*</span></label>
                  <Input value={descServico} onChange={e => setDescServico(e.target.value)} placeholder="Ex: 500 Cartões de Visita Frente/Verso, 2 Banners Lona Fosca..." className="bg-slate-50" />
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
                  <label className="text-sm font-bold text-slate-700">Observações (Acabamento, Gramatura, Sangria)</label>
                  <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} className="w-full min-h-[80px] p-3 border rounded-md bg-slate-50 text-sm" placeholder="Ex: Refilar com 2mm de sangria, encadernação wire-o preto..."></textarea>
              </div>
            </div>

            <Button onClick={criarOP} disabled={salvandoOP} className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold text-base shadow-md">
                {salvandoOP ? "Gerando..." : "Enviar para Chão de Fábrica"}
            </Button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: PAINEL DE PRODUÇÃO (KANBAN LISTA) */}
        {/* ========================================================================= */}
        {abaAtiva === "painel" && !opSelecionada && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex flex-wrap items-center gap-4 bg-slate-50 justify-between">
              <div className="relative w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={buscaOP} onChange={e => setBuscaOP(e.target.value)} placeholder="Buscar OP, Cliente ou Serviço..." className="pl-9 bg-white" /></div>
            </div>
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b text-center w-24">OP Nº</th>
                    <th className="p-4 font-semibold border-b">Cliente</th>
                    <th className="p-4 font-semibold border-b">Serviço</th>
                    <th className="p-4 font-semibold border-b text-center">Entrega</th>
                    <th className="p-4 font-semibold border-b text-center">Status</th>
                    <th className="p-4 font-semibold border-b text-center w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordensFiltradas.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhuma OP na fila.</td></tr>
                  ) : (
                    ordensFiltradas.map(op => {
                        const corStatus = op.status === 'Fila de Impressão' ? 'bg-slate-100 text-slate-700' : op.status === 'Em Produção' ? 'bg-blue-100 text-blue-700' : op.status === 'Acabamento' ? 'bg-amber-100 text-amber-700' : op.status === 'Pronto para Entrega' ? 'bg-emerald-100 text-emerald-700' : 'bg-green-100 text-green-800';

                        return (
                        <tr key={op.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => abrirPrancheta(op)}>
                          <td className="p-4 text-center font-black text-purple-700 font-mono text-sm">OP-{String(op.numero_op).padStart(4,'0')}</td>
                          <td className="p-4 font-bold text-slate-800 text-sm">{op.cliente_nome}</td>
                          <td className="p-4">
                              <p className="text-sm font-semibold text-slate-700">{op.descricao_servico}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Qtd: {op.quantidade_produzir}</p>
                          </td>
                          <td className="p-4 text-center text-xs font-bold text-rose-600">{new Date(op.data_prevista).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                          <td className="p-4 text-center">
                              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${corStatus}`}>{op.status}</span>
                          </td>
                          <td className="p-4 text-center">
                              <Button variant="outline" size="sm" className="text-purple-600 border-purple-200 group-hover:bg-purple-50 h-8 text-xs">Apontar</Button>
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
        {/* ABA: PRANCHETA DO IMPRESSOR (CONSUMO DE MATÉRIA-PRIMA E CONCLUSÃO) */}
        {/* ========================================================================= */}
        {abaAtiva === "painel" && opSelecionada && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-200">
            
            {/* CABEÇALHO DA OP */}
            <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-purple-600">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Button variant="ghost" size="sm" onClick={() => setOpSelecionada(null)} className="h-8 px-2 text-slate-400 hover:text-slate-700"><ArrowLeft className="w-4 h-4"/></Button>
                        <h2 className="text-2xl font-black text-slate-800 uppercase">OP {String(opSelecionada.numero_op).padStart(4,'0')}</h2>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{opSelecionada.cliente_nome}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700 ml-12">
                        <span className="font-bold flex items-center gap-1"><Printer className="w-4 h-4 text-slate-400"/> {opSelecionada.descricao_servico} (Qtd: {opSelecionada.quantidade_produzir})</span>
                    </div>
                </div>
                {opSelecionada.status === 'Pronto para Entrega' || opSelecionada.status === 'Entregue' ? (
                     <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> OP Finalizada</div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Select value={statusOP} onValueChange={setStatusOP}>
                            <SelectTrigger className="w-44 bg-white font-semibold border-purple-200"><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="Fila de Impressão">Fila de Impressão</SelectItem><SelectItem value="Em Produção">Em Produção</SelectItem><SelectItem value="Acabamento">Acabamento</SelectItem><SelectItem value="Cancelado">Cancelado</SelectItem></SelectContent>
                        </Select>
                        <Button onClick={() => salvarAndamento()} disabled={salvandoOP} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-sm">Salvar Etapa</Button>
                    </div>
                )}
            </div>

            {/* INFORMAÇÕES TÉCNICAS E MATÉRIA-PRIMA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LADO ESQUERDO: INFOS */}
                <div className="space-y-6">
                    <div className="bg-amber-50 p-5 rounded-xl border border-amber-100">
                        <h4 className="text-sm font-bold text-amber-800 uppercase flex items-center gap-2 mb-2"><Clock className="w-4 h-4"/> Prazo de Entrega</h4>
                        <p className="text-xl font-black text-amber-900">{new Date(opSelecionada.data_prevista).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-xl border shadow-sm h-full border-slate-200">
                        <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2 mb-3"><Scissors className="w-4 h-4 text-purple-500"/> Ficha Técnica / Observações</h4>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{opSelecionada.observacoes || "Nenhuma observação cadastrada."}</p>
                    </div>
                </div>

                {/* LADO DIREITO: APONTAMENTO DE INSUMOS */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-purple-50 flex flex-wrap justify-between items-center gap-4">
                            <div>
                                <h4 className="text-sm font-bold text-purple-900 uppercase flex items-center gap-2"><PaintBucket className="w-4 h-4 text-purple-600"/> Matéria-Prima / Insumos Consumidos</h4>
                                <p className="text-[10px] text-purple-700 mt-1">Aponte o que foi gasto nesta OP para calcular o custo de produção.</p>
                            </div>
                            {(opSelecionada.status !== 'Pronto para Entrega' && opSelecionada.status !== 'Entregue') && (
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
                                        {(opSelecionada.status !== 'Pronto para Entrega' && opSelecionada.status !== 'Entregue') && <th className="p-3"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {insumos.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-xs text-slate-400 font-medium">Nenhum insumo apontado. O custo desta OP está zerado.</td></tr>
                                    ) : (
                                        insumos.map((ins, idx) => (
                                            <tr key={ins.id} className="bg-white hover:bg-slate-50">
                                                <td className="p-3 font-semibold text-slate-700">{ins.nome}</td>
                                                <td className="p-3 text-center">
                                                    <Input type="number" step="0.0001" min="0" disabled={opSelecionada.status === 'Pronto para Entrega' || opSelecionada.status === 'Entregue'} value={ins.quantidade} onChange={e => { const ni = [...insumos]; ni[idx].quantidade = parseFloat(e.target.value)||0; setInsumos(ni); }} className="h-8 w-20 text-center mx-auto text-xs font-bold bg-slate-50 border-purple-200 focus-visible:ring-purple-500"/>
                                                </td>
                                                <td className="p-3 text-right text-xs text-slate-500">R$ {Number(ins.custoUn).toFixed(4).replace('.',',')}</td>
                                                <td className="p-3 text-right font-bold text-rose-600">R$ {(ins.quantidade * ins.custoUn).toFixed(2).replace('.', ',')}</td>
                                                {(opSelecionada.status !== 'Pronto para Entrega' && opSelecionada.status !== 'Entregue') && (
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
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Custo Total de Produção da OP</p>
                                <p className="text-2xl font-black text-rose-400">R$ {insumos.reduce((a,b) => a+(b.quantidade*b.custoUn), 0).toFixed(2).replace('.',',')}</p>
                            </div>
                            {(opSelecionada.status !== 'Pronto para Entrega' && opSelecionada.status !== 'Entregue') && (
                                <Button onClick={concluirProducao} disabled={salvandoOP} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 px-6 gap-2 shadow-md animate-pulse duration-2000"><PlayCircle className="w-5 h-5"/> Concluir OP e Baixar Estoque</Button>
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