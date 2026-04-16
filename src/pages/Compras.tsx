import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, TrendingDown, FileText, Printer, Check, Plus, Search, Trash2, CheckCircle2, DollarSign, Clock, Truck, ArrowRight, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type FornecedorCotacao = {
  id: string;
  fornecedorId: string;
  nome: string;
  precoUnitario: number;
  frete: number;
  prazoDias: number;
  condicaoPagamento: string;
};

export default function Compras() {
  const [abaAtiva, setAbaAtiva] = useState<"cotacao" | "pedidos">("cotacao");

  // ==========================================
  // ESTADOS: DADOS BASE (BANCO)
  // ==========================================
  const [produtosBD, setProdutosBD] = useState<any[]>([]);
  const [fornecedoresBD, setFornecedoresBD] = useState<any[]>([]);

  // ==========================================
  // ESTADOS: ARENA DE COTAÇÃO
  // ==========================================
  const [produtoBusca, setProdutoBusca] = useState("");
  const [produtoId, setProdutoId] = useState<string | null>(null);
  const [quantidadeDesejada, setQuantidadeDesejada] = useState(1);
  const [fornecedoresCotados, setFornecedoresCotados] = useState<FornecedorCotacao[]>([]);
  const [fornecedorBusca, setFornecedorBusca] = useState("");
  
  // ==========================================
  // ESTADOS: HISTÓRICO DE PEDIDOS
  // ==========================================
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<any | null>(null);
  const [gerandoPedido, setGerandoPedido] = useState(false);

  useEffect(() => {
    fetchDadosBase();
    fetchPedidos();
  }, []);

  const fetchDadosBase = async () => {
    const [prodRes, fornRes] = await Promise.all([
      supabase.from('log_produtos').select('id, sku, nome, custo_base').order('nome'),
      supabase.from('log_fornecedores').select('id, razao_social, nome_fantasia, prazo_medio_entrega_dias')
    ]);
    if (prodRes.data) setProdutosBD(prodRes.data);
    if (fornRes.data) setFornecedoresBD(fornRes.data);
  };

  const fetchPedidos = async () => {
    const { data } = await supabase.from('log_pedidos_compra').select('*').order('numero_pedido', { ascending: false });
    if (data) setPedidos(data);
  };

  // --- LÓGICA DA COTAÇÃO ---
  const adicionarFornecedorCotacao = () => {
    if (!fornecedorBusca) return;
    const forn = fornecedoresBD.find(f => f.nome_fantasia === fornecedorBusca || f.razao_social === fornecedorBusca);
    if (!forn) return alert("Fornecedor não encontrado no banco.");
    if (fornecedoresCotados.find(f => f.fornecedorId === forn.id)) return alert("Este fornecedor já está na arena de cotação.");

    setFornecedoresCotados([...fornecedoresCotados, {
      id: crypto.randomUUID(),
      fornecedorId: forn.id,
      nome: forn.nome_fantasia || forn.razao_social,
      precoUnitario: 0,
      frete: 0,
      prazoDias: forn.prazo_medio_entrega_dias || 0,
      condicaoPagamento: "Boleto 30 Dias"
    }]);
    setFornecedorBusca("");
  };

  const atualizarCotacao = (id: string, campo: keyof FornecedorCotacao, valor: any) => {
    setFornecedoresCotados(prev => prev.map(f => f.id === id ? { ...f, [campo]: valor } : f));
  };

  const removerCotacao = (id: string) => {
    setFornecedoresCotados(prev => prev.filter(f => f.id !== id));
  };

  const limparCotacao = () => {
    if(!confirm("Limpar a arena de cotação?")) return;
    setProdutoBusca(""); setProdutoId(null); setQuantidadeDesejada(1); setFornecedoresCotados([]);
  };

  // Encontrar o Vencedor (Menor Custo Total)
  const custoTotalMaisBaixo = Math.min(...fornecedoresCotados.map(f => (f.precoUnitario * quantidadeDesejada) + f.frete));

  // --- GERAR PEDIDO DE COMPRA ---
  const gerarPedido = async (fornecedorVencedor: FornecedorCotacao) => {
    if (!produtoBusca) return alert("Selecione o produto cotado primeiro.");
    if (fornecedorVencedor.precoUnitario <= 0) return alert("O preço unitário não pode ser zero.");
    if (!confirm(`Deseja gerar um Pedido de Compra para ${fornecedorVencedor.nome}?`)) return;

    setGerandoPedido(true);
    try {
      const prod = produtosBD.find(p => p.nome === produtoBusca || `${p.sku} - ${p.nome}` === produtoBusca);
      const prodNome = prod ? prod.nome : produtoBusca;
      const prodId = prod ? prod.id : null;

      const valorTotalItem = fornecedorVencedor.precoUnitario * quantidadeDesejada;
      const valorTotalPedido = valorTotalItem + fornecedorVencedor.frete;

      // Calcula data de previsão
      const dataPrev = new Date();
      dataPrev.setDate(dataPrev.getDate() + fornecedorVencedor.prazoDias);

      // 1. Salva Cabeçalho
      const cabecalho = {
        fornecedor_id: fornecedorVencedor.fornecedorId,
        fornecedor_nome: fornecedorVencedor.nome,
        previsao_entrega: dataPrev.toISOString().split('T')[0],
        valor_frete: fornecedorVencedor.frete,
        valor_total: valorTotalPedido,
        condicao_pagamento: fornecedorVencedor.condicaoPagamento,
        status: 'Aberto'
      };

      const { data: pedidoData, error: pedidoError } = await supabase.from('log_pedidos_compra').insert([cabecalho]).select('id, numero_pedido').single();
      if (pedidoError) throw pedidoError;

      // 2. Salva Item
      const item = {
        pedido_id: pedidoData.id,
        produto_id: prodId,
        produto_nome: prodNome,
        quantidade: quantidadeDesejada,
        preco_unitario: fornecedorVencedor.precoUnitario,
        total_item: valorTotalItem
      };

      const { error: itemError } = await supabase.from('log_pedidos_compra_itens').insert([item]);
      if (itemError) throw itemError;

      alert(`Pedido de Compra #${pedidoData.numero_pedido} gerado com sucesso!`);
      setProdutoBusca(""); setProdutoId(null); setQuantidadeDesejada(1); setFornecedoresCotados([]);
      fetchPedidos();
      setAbaAtiva("pedidos");

    } catch (error: any) {
      console.error(error); alert("Erro ao gerar pedido: " + error.message);
    } finally {
      setGerandoPedido(false);
    }
  };

  const abrirVisualizacaoPedido = async (pedido: any) => {
    const { data: itens } = await supabase.from('log_pedidos_compra_itens').select('*').eq('pedido_id', pedido.id);
    setPedidoSelecionado({ ...pedido, itens: itens || [] });
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto mb-12">
        
        <datalist id="lista-produtos">{produtosBD.map((p) => <option key={p.id} value={`${p.sku || 'S/N'} - ${p.nome}`} />)}</datalist>
        <datalist id="lista-fornecedores">{fornecedoresBD.map((f) => <option key={f.id} value={f.nome_fantasia || f.razao_social} />)}</datalist>

        {/* CABEÇALHO E ABAS */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><ShoppingCart className="w-6 h-6 text-indigo-600" /> Módulo de Compras</h1>
            <p className="text-slate-500">Cotações inteligentes e emissão de Pedidos de Compra (PO).</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setAbaAtiva("cotacao")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${abaAtiva === "cotacao" ? "bg-white shadow-sm text-indigo-700" : "text-slate-600 hover:text-slate-900"}`}>Arena de Cotações</button>
            <button onClick={() => setAbaAtiva("pedidos")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${abaAtiva === "pedidos" ? "bg-white shadow-sm text-emerald-700" : "text-slate-600 hover:text-slate-900"}`}>Pedidos Emitidos</button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA: ARENA DE COTAÇÕES */}
        {/* ========================================================================= */}
        {abaAtiva === "cotacao" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Bloco 1: O que vamos comprar? */}
            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Search className="w-5 h-5 text-indigo-600"/> 1. Qual produto deseja cotar?</h3>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Produto ou Insumo</label>
                  <Input list="lista-produtos" value={produtoBusca} onChange={e => setProdutoBusca(e.target.value)} placeholder="Digite para buscar no catálogo..." className="text-base bg-slate-50" />
                </div>
                <div className="w-full md:w-48 space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Quantidade</label>
                  <Input type="number" min="1" value={quantidadeDesejada} onChange={e => setQuantidadeDesejada(parseInt(e.target.value)||1)} className="text-base text-center bg-slate-50" />
                </div>
              </div>
            </div>

            {/* Bloco 2: Adicionar Concorrentes */}
            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-indigo-600"/> 2. Arena de Fornecedores</h3>
                <div className="flex gap-2">
                  <Input list="lista-fornecedores" value={fornecedorBusca} onChange={e => setFornecedorBusca(e.target.value)} placeholder="Buscar Fornecedor..." className="w-64" onKeyDown={e => { if(e.key === 'Enter') adicionarFornecedorCotacao() }}/>
                  <Button onClick={adicionarFornecedorCotacao} variant="outline" className="gap-2"><Plus className="w-4 h-4"/> Adicionar</Button>
                </div>
              </div>

              {fornecedoresCotados.length === 0 ? (
                <div className="text-center p-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <TrendingDown className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Nenhum fornecedor na disputa.</p>
                  <p className="text-sm text-slate-400">Busque e adicione fornecedores acima para começar a comparar preços.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {fornecedoresCotados.map((forn) => {
                    const custoTotal = (forn.precoUnitario * quantidadeDesejada) + forn.frete;
                    const isVencedor = custoTotal === custoTotalMaisBaixo && custoTotal > 0;

                    return (
                      <div key={forn.id} className={`relative p-5 rounded-xl border-2 transition-all ${isVencedor ? 'border-emerald-500 bg-emerald-50/30 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                        
                        {isVencedor && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3 h-3" /> Melhor Opção
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-bold text-slate-800 text-lg leading-tight truncate pr-2" title={forn.nome}>{forn.nome}</h4>
                          <button onClick={() => removerCotacao(forn.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-1"><DollarSign className="w-3 h-3"/> Preço Unitário (R$)</label>
                            <Input type="number" step="0.01" value={forn.precoUnitario || ''} onChange={e => atualizarCotacao(forn.id, 'precoUnitario', parseFloat(e.target.value)||0)} className={`font-medium ${isVencedor ? 'bg-white border-emerald-200' : 'bg-slate-50'}`} placeholder="0,00" />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-1"><Truck className="w-3 h-3"/> Frete (R$)</label>
                              <Input type="number" step="0.01" value={forn.frete || ''} onChange={e => atualizarCotacao(forn.id, 'frete', parseFloat(e.target.value)||0)} className={isVencedor ? 'bg-white border-emerald-200' : 'bg-slate-50'} placeholder="0,00"/>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-1"><Clock className="w-3 h-3"/> Prazo (Dias)</label>
                              <Input type="number" value={forn.prazoDias || ''} onChange={e => atualizarCotacao(forn.id, 'prazoDias', parseInt(e.target.value)||0)} className={isVencedor ? 'bg-white border-emerald-200' : 'bg-slate-50'} placeholder="Ex: 5" />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-1"><FileText className="w-3 h-3"/> Pagamento</label>
                            <Input value={forn.condicaoPagamento} onChange={e => atualizarCotacao(forn.id, 'condicaoPagamento', e.target.value)} className={`text-sm ${isVencedor ? 'bg-white border-emerald-200' : 'bg-slate-50'}`} placeholder="Ex: Boleto 30/60/90" />
                          </div>
                        </div>

                        <div className={`mt-5 pt-4 border-t flex items-end justify-between ${isVencedor ? 'border-emerald-200' : 'border-slate-100'}`}>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Custo Total</p>
                            <p className={`text-2xl font-black ${isVencedor ? 'text-emerald-600' : 'text-slate-700'}`}>R$ {custoTotal.toFixed(2).replace('.', ',')}</p>
                          </div>
                          <Button 
                            onClick={() => gerarPedido(forn)} 
                            disabled={gerandoPedido || forn.precoUnitario <= 0}
                            className={`gap-1 shadow-sm ${isVencedor ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-800 hover:bg-slate-900 text-white'}`}
                          >
                            Gerar Pedido <ArrowRight className="w-4 h-4"/>
                          </Button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {fornecedoresCotados.length > 0 && (
               <div className="flex justify-end">
                   <Button variant="ghost" onClick={limparCotacao} className="text-slate-400 hover:text-red-500">Limpar Arena de Cotação</Button>
               </div>
            )}

          </div>
        )}


        {/* ========================================================================= */}
        {/* ABA: HISTÓRICO DE PEDIDOS (PO) */}
        {/* ========================================================================= */}
        {abaAtiva === "pedidos" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
             
            {!pedidoSelecionado ? (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input placeholder="Buscar pedido..." className="pl-9 bg-white" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                                    <th className="p-4 font-semibold border-b text-center w-24">Pedido</th>
                                    <th className="p-4 font-semibold border-b">Fornecedor</th>
                                    <th className="p-4 font-semibold border-b text-center">Data Emissão</th>
                                    <th className="p-4 font-semibold border-b text-center">Previsão</th>
                                    <th className="p-4 font-semibold border-b text-center">Status</th>
                                    <th className="p-4 font-semibold border-b text-right">Valor Total</th>
                                    <th className="p-4 font-semibold border-b text-center w-24">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pedidos.length === 0 ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-slate-500">Nenhum pedido de compra emitido ainda.</td></tr>
                                ) : (
                                    pedidos.map(ped => (
                                        <tr key={ped.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 text-center font-bold text-indigo-700 font-mono text-sm">PO-{String(ped.numero_pedido).padStart(4,'0')}</td>
                                            <td className="p-4 font-semibold text-slate-800 text-sm">{ped.fornecedor_nome}</td>
                                            <td className="p-4 text-center text-sm text-slate-600">{new Date(ped.data_pedido).toLocaleDateString('pt-BR')}</td>
                                            <td className="p-4 text-center text-sm text-slate-600">{ped.previsao_entrega ? new Date(ped.previsao_entrega).toLocaleDateString('pt-BR') : '-'}</td>
                                            <td className="p-4 text-center">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${ped.status === 'Aberto' ? 'bg-amber-100 text-amber-700' : ped.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    {ped.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-bold text-emerald-600">R$ {Number(ped.valor_total).toFixed(2).replace('.', ',')}</td>
                                            <td className="p-4 text-center">
                                                <Button variant="outline" size="sm" onClick={() => abrirVisualizacaoPedido(ped)} className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"><FileText className="w-4 h-4"/> Ver PDF</Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* VISÃO DE IMPRESSÃO DO PEDIDO (PDF SIMULADO) */
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between mb-4">
                        <Button variant="ghost" onClick={() => setPedidoSelecionado(null)} className="gap-2 text-slate-500"><ArrowLeft className="w-4 h-4"/> Voltar à Lista</Button>
                        <Button onClick={() => window.print()} className="gap-2 bg-slate-800 hover:bg-slate-900 text-white"><Printer className="w-4 h-4"/> Imprimir / Gerar PDF</Button>
                    </div>

                    <div className="bg-white p-12 rounded-xl shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-0">
                        {/* CABEÇALHO DO PDF */}
                        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
                            <div>
                                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-wider mb-1">Pedido de Compra</h2>
                                <p className="text-slate-500 font-medium">Documento de Autorização de Fornecimento</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Número do Pedido (PO)</p>
                                <p className="text-3xl font-mono font-bold text-indigo-600">#{String(pedidoSelecionado.numero_pedido).padStart(4,'0')}</p>
                            </div>
                        </div>

                        {/* DADOS DO FORNECEDOR E DATAS */}
                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Fornecedor Autorizado</p>
                                <p className="text-lg font-bold text-slate-800 mb-1">{pedidoSelecionado.fornecedor_nome}</p>
                                <p className="text-sm text-slate-600 flex items-center gap-2 mt-3"><AlertCircle className="w-4 h-4 text-amber-500"/> Favor referenciar o número do pedido na emissão da NF-e.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Data do Pedido</p>
                                    <p className="text-base font-semibold text-slate-800">{new Date(pedidoSelecionado.data_pedido).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Previsão de Entrega</p>
                                    <p className="text-base font-semibold text-slate-800">{pedidoSelecionado.previsao_entrega ? new Date(pedidoSelecionado.previsao_entrega).toLocaleDateString('pt-BR') : 'A Combinar'}</p>
                                </div>
                                <div className="space-y-1 col-span-2 mt-4 pt-4 border-t border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Condição de Pagamento</p>
                                    <p className="text-base font-semibold text-slate-800">{pedidoSelecionado.condicao_pagamento || 'Padrão'}</p>
                                </div>
                            </div>
                        </div>

                        {/* ITENS DO PEDIDO */}
                        <div className="mb-8">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
                                        <th className="p-3 font-semibold rounded-tl-lg">Descrição do Item</th>
                                        <th className="p-3 font-semibold text-center">Qtd</th>
                                        <th className="p-3 font-semibold text-right">Preço Unit.</th>
                                        <th className="p-3 font-semibold text-right rounded-tr-lg">Total Item</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 border-b border-slate-200">
                                    {pedidoSelecionado.itens?.map((item: any, idx: number) => (
                                        <tr key={idx} className="text-sm">
                                            <td className="p-3 font-medium text-slate-800">{item.produto_nome}</td>
                                            <td className="p-3 text-center">{item.quantidade}</td>
                                            <td className="p-3 text-right text-slate-600">R$ {Number(item.preco_unitario).toFixed(4).replace('.', ',')}</td>
                                            <td className="p-3 text-right font-bold text-slate-800">R$ {Number(item.total_item).toFixed(2).replace('.', ',')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* TOTAIS */}
                        <div className="flex justify-end">
                            <div className="w-72 space-y-3 bg-slate-50 p-5 rounded-lg border border-slate-200">
                                <div className="flex justify-between text-sm">
                                    <span className="font-semibold text-slate-500">Subtotal Itens</span>
                                    <span className="font-bold text-slate-800">R$ {(Number(pedidoSelecionado.valor_total) - Number(pedidoSelecionado.valor_frete)).toFixed(2).replace('.', ',')}</span>
                                </div>
                                <div className="flex justify-between text-sm border-b border-slate-200 pb-3">
                                    <span className="font-semibold text-slate-500">Valor Frete</span>
                                    <span className="font-bold text-slate-800">R$ {Number(pedidoSelecionado.valor_frete).toFixed(2).replace('.', ',')}</span>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="font-bold text-slate-800 uppercase tracking-wider">Total</span>
                                    <span className="font-black text-2xl text-emerald-600">R$ {Number(pedidoSelecionado.valor_total).toFixed(2).replace('.', ',')}</span>
                                </div>
                            </div>
                        </div>

                        {/* RODAPÉ DO PDF */}
                        <div className="mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-400 print:mt-auto">
                            <p className="font-bold text-slate-600 mb-1">Este documento foi gerado eletronicamente pelo Sistema ERP.</p>
                            <p>TC Copiadoras • Departamento de Compras e Suprimentos</p>
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}

      </div>
    </AppLayout>
  );
}