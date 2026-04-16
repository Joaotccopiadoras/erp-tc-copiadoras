import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, TrendingDown, FileText, Printer, CheckCircle2, Plus, Search, Trash2, DollarSign, Clock, Truck, ArrowRight, AlertCircle, PackagePlus, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Tipagens da nova estrutura Multi-Item
type ItemCotacao = {
  id: string;
  produtoId: string;
  sku: string;
  nome: string;
  quantidade: number;
};

type PrecoFornecedor = {
  produtoId: string;
  preco: number;
};

type FornecedorCotacao = {
  id: string;
  fornecedorId: string;
  nome: string;
  frete: number;
  prazoDias: number;
  condicaoPagamento: string;
  precos: PrecoFornecedor[]; // Guarda o preço que este fornecedor fez para cada item
};

export default function Compras() {
  const [abaAtiva, setAbaAtiva] = useState<"cotacao" | "pedidos">("cotacao");

  // ==========================================
  // ESTADOS: DADOS BASE (BANCO)
  // ==========================================
  const [produtosBD, setProdutosBD] = useState<any[]>([]);
  const [fornecedoresBD, setFornecedoresBD] = useState<any[]>([]);

  // ==========================================
  // ESTADOS: ARENA DE COTAÇÃO MULTI-ITEM
  // ==========================================
  const [produtoBusca, setProdutoBusca] = useState("");
  const [quantidadeDesejada, setQuantidadeDesejada] = useState(1);
  const [itensCotacao, setItensCotacao] = useState<ItemCotacao[]>([]);
  
  const [fornecedorBusca, setFornecedorBusca] = useState("");
  const [fornecedoresCotados, setFornecedoresCotados] = useState<FornecedorCotacao[]>([]);
  
  // ==========================================
  // ESTADOS: HISTÓRICO DE PEDIDOS
  // ==========================================
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<any | null>(null);
  const [gerandoPedido, setGerandoPedido] = useState(false);

  // AUTO-SAVE (Rascunho da Cotação)
  useEffect(() => {
    const rascunho = sessionStorage.getItem("compras_rascunho");
    if (rascunho) {
      try {
        const draft = JSON.parse(rascunho);
        if (draft.itensCotacao) setItensCotacao(draft.itensCotacao);
        if (draft.fornecedoresCotados) setFornecedoresCotados(draft.fornecedoresCotados);
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    if (itensCotacao.length > 0 || fornecedoresCotados.length > 0) {
      sessionStorage.setItem("compras_rascunho", JSON.stringify({ itensCotacao, fornecedoresCotados }));
    } else {
      sessionStorage.removeItem("compras_rascunho");
    }
  }, [itensCotacao, fornecedoresCotados]);

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

  // --- PASSO 1: LISTA DE NECESSIDADES ---
  const adicionarItemCotacao = () => {
    if (!produtoBusca) return;
    const prod = produtosBD.find(p => p.nome === produtoBusca || `${p.sku || 'S/N'} - ${p.nome}` === produtoBusca);
    if (!prod) return alert("Produto não encontrado no catálogo.");
    
    if (itensCotacao.find(i => i.produtoId === prod.id)) return alert("Este produto já está na lista de necessidades.");

    setItensCotacao([...itensCotacao, {
        id: crypto.randomUUID(),
        produtoId: prod.id,
        sku: prod.sku || 'S/N',
        nome: prod.nome,
        quantidade: quantidadeDesejada
    }]);
    
    setProdutoBusca("");
    setQuantidadeDesejada(1);
  };

  const removerItemCotacao = (id: string) => {
    setItensCotacao(prev => prev.filter(i => i.id !== id));
  };

  // --- PASSO 2: FORNECEDORES NA DISPUTA ---
  const adicionarFornecedorCotacao = () => {
    if (!fornecedorBusca) return;
    const forn = fornecedoresBD.find(f => f.nome_fantasia === fornecedorBusca || f.razao_social === fornecedorBusca);
    if (!forn) return alert("Fornecedor não encontrado no banco.");
    if (fornecedoresCotados.find(f => f.fornecedorId === forn.id)) return alert("Este fornecedor já está na arena.");

    setFornecedoresCotados([...fornecedoresCotados, {
      id: crypto.randomUUID(),
      fornecedorId: forn.id,
      nome: forn.nome_fantasia || forn.razao_social,
      frete: 0,
      prazoDias: forn.prazo_medio_entrega_dias || 0,
      condicaoPagamento: "Boleto 30 Dias",
      precos: [] // Inicia sem preços digitados
    }]);
    setFornecedorBusca("");
  };

  const removerFornecedorCotacao = (id: string) => {
    setFornecedoresCotados(prev => prev.filter(f => f.id !== id));
  };

  // --- PASSO 3: ARENA (PREENCHIMENTO DE PREÇOS E CÁLCULO) ---
  const atualizarDadosFornecedor = (id: string, campo: keyof FornecedorCotacao, valor: any) => {
    setFornecedoresCotados(prev => prev.map(f => f.id === id ? { ...f, [campo]: valor } : f));
  };

  const atualizarPrecoItem = (fornId: string, produtoId: string, valor: number) => {
    setFornecedoresCotados(prev => prev.map(f => {
        if (f.id !== fornId) return f;
        const precosAtuais = [...f.precos];
        const index = precosAtuais.findIndex(p => p.produtoId === produtoId);
        
        if (index >= 0) precosAtuais[index].preco = valor;
        else precosAtuais.push({ produtoId, preco: valor });
        
        return { ...f, precos: precosAtuais };
    }));
  };

  const calcularTotalFornecedor = (forn: FornecedorCotacao) => {
    const subtotal = itensCotacao.reduce((acc, item) => {
        const precoObj = forn.precos.find(p => p.produtoId === item.produtoId);
        return acc + ((precoObj?.preco || 0) * item.quantidade);
    }, 0);
    return subtotal + (forn.frete || 0);
  };

  const limparCotacao = () => {
    if(!confirm("Tem certeza que deseja limpar toda a arena e recomeçar?")) return;
    setItensCotacao([]); setFornecedoresCotados([]);
  };

  // Lógica Matemática do Vencedor
  const totaisCalculados = fornecedoresCotados.map(f => calcularTotalFornecedor(f));
  const custoTotalMaisBaixo = totaisCalculados.length > 0 ? Math.min(...totaisCalculados.filter(t => t > 0)) : 0;

  // --- GERAR PEDIDO DE COMPRA EM LOTE ---
  const gerarPedido = async (fornecedorVencedor: FornecedorCotacao) => {
    if (itensCotacao.length === 0) return alert("A lista de necessidades está vazia.");
    
    // Validação: Ver se algum item está com preço zero para este fornecedor
    const temItemZerado = itensCotacao.some(item => {
        const precoObj = fornecedorVencedor.precos.find(p => p.produtoId === item.produtoId);
        return !precoObj || precoObj.preco <= 0;
    });

    if (temItemZerado) {
        if(!confirm(`Atenção: Existem itens com preço R$ 0,00 na proposta de ${fornecedorVencedor.nome}. Eles entrarão como bonificação/brinde. Deseja continuar?`)) return;
    } else {
        if (!confirm(`Deseja gerar um Pedido de Compra Oficial para ${fornecedorVencedor.nome}?`)) return;
    }

    setGerandoPedido(true);
    try {
      const valorTotalPedido = calcularTotalFornecedor(fornecedorVencedor);
      const dataPrev = new Date();
      dataPrev.setDate(dataPrev.getDate() + fornecedorVencedor.prazoDias);

      // 1. Salva o Cabeçalho do Pedido
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

      // 2. Salva a Lista de Itens do Pedido
      const itensDoPedido = itensCotacao.map(item => {
        const precoObj = fornecedorVencedor.precos.find(p => p.produtoId === item.produtoId);
        const precoUn = precoObj?.preco || 0;
        return {
          pedido_id: pedidoData.id,
          produto_id: item.produtoId,
          produto_nome: item.nome,
          quantidade: item.quantidade,
          preco_unitario: precoUn,
          total_item: precoUn * item.quantidade
        };
      });

      const { error: itemError } = await supabase.from('log_pedidos_compra_itens').insert(itensDoPedido);
      if (itemError) throw itemError;

      alert(`Pedido de Compra Múltiplo #${pedidoData.numero_pedido} gerado com sucesso! O fornecedor ${fornecedorVencedor.nome} ganhou a cotação.`);
      setItensCotacao([]); setFornecedoresCotados([]); setProdutoBusca(""); setQuantidadeDesejada(1);
      
      fetchPedidos();
      setAbaAtiva("pedidos");

    } catch (error: any) {
      console.error(error); alert("Erro crítico ao gerar pedido. Motivo: " + error.message);
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
            <p className="text-slate-500">Cotações em lote e emissão centralizada de Pedidos de Compra (PO).</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setAbaAtiva("cotacao")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${abaAtiva === "cotacao" ? "bg-white shadow-sm text-indigo-700" : "text-slate-600 hover:text-slate-900"}`}>Arena de Cotações</button>
            <button onClick={() => setAbaAtiva("pedidos")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${abaAtiva === "pedidos" ? "bg-white shadow-sm text-emerald-700" : "text-slate-600 hover:text-slate-900"}`}>Pedidos Emitidos</button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA: ARENA DE COTAÇÕES MULTI-ITEM */}
        {/* ========================================================================= */}
        {abaAtiva === "cotacao" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            {/* ETAPA 1: O QUE VAMOS COMPRAR? */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-slate-50">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ListChecks className="w-5 h-5 text-indigo-600"/> 1. Lista de Necessidades</h3>
                  <p className="text-sm text-slate-500 mt-1">Monte a cesta de produtos que serão cotados com os fornecedores.</p>
              </div>
              
              <div className="p-4 flex flex-wrap items-end gap-3 bg-white border-b border-slate-100">
                  <div className="flex-1 min-w-[250px] space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Buscar Produto no Catálogo</label>
                    <Input list="lista-produtos" value={produtoBusca} onChange={e => setProdutoBusca(e.target.value)} placeholder="Ex: Toner Brother, Papel Chamex..." className="bg-white border-indigo-200" onKeyDown={e => { if(e.key === 'Enter') adicionarItemCotacao() }}/>
                  </div>
                  <div className="w-32 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center block">Qtd Necessária</label>
                    <Input type="number" min="1" value={quantidadeDesejada} onChange={e => setQuantidadeDesejada(parseInt(e.target.value)||1)} className="bg-white text-center border-indigo-200" />
                  </div>
                  <Button onClick={adicionarItemCotacao} className="gap-2 bg-indigo-600 hover:bg-indigo-700 shrink-0"><PackagePlus className="w-4 h-4"/> Incluir na Cesta</Button>
              </div>

              {/* LISTA DE ITENS DA CESTA */}
              <div className="bg-slate-50 p-0">
                  {itensCotacao.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 font-medium flex flex-col items-center">
                          A cesta está vazia. Comece incluindo produtos acima.
                      </div>
                  ) : (
                      <table className="w-full text-left text-sm border-collapse">
                          <thead>
                              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                                  <th className="p-3 font-semibold">SKU / Produto</th>
                                  <th className="p-3 font-semibold text-center w-32">Qtd Solicitada</th>
                                  <th className="p-3 font-semibold text-center w-16"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {itensCotacao.map((item, idx) => (
                                  <tr key={item.id} className="hover:bg-white transition-colors bg-slate-50">
                                      <td className="p-3">
                                          <p className="font-bold text-slate-800">{item.nome}</p>
                                          <p className="font-mono text-xs text-slate-500">SKU: {item.sku}</p>
                                      </td>
                                      <td className="p-3 text-center">
                                          <span className="font-black text-indigo-600 text-lg px-3 py-1 bg-indigo-50 rounded-lg">{item.quantidade}</span>
                                      </td>
                                      <td className="p-3 text-center">
                                          <button onClick={() => removerItemCotacao(item.id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 className="w-4 h-4"/></button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  )}
              </div>
            </div>

            {/* ETAPA 2: ARENA DE FORNECEDORES (SÓ APARECE SE TIVER ITENS) */}
            {itensCotacao.length > 0 && (
              <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-indigo-600"/> 2. Arena de Concorrentes</h3>
                      <p className="text-sm text-slate-500">Adicione fornecedores e preencha a proposta de cada um.</p>
                  </div>
                  <div className="flex gap-2">
                    <Input list="lista-fornecedores" value={fornecedorBusca} onChange={e => setFornecedorBusca(e.target.value)} placeholder="Buscar Empresa..." className="w-64 border-amber-200" onKeyDown={e => { if(e.key === 'Enter') adicionarFornecedorCotacao() }}/>
                    <Button onClick={adicionarFornecedorCotacao} variant="outline" className="gap-2 text-amber-700 hover:bg-amber-50 border-amber-200"><Plus className="w-4 h-4"/> Adicionar para Cotação</Button>
                  </div>
                </div>

                {fornecedoresCotados.length === 0 ? (
                  <div className="text-center p-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <TrendingDown className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">A cesta está pronta. Quem vai cotar?</p>
                    <p className="text-sm text-slate-400">Busque e adicione fornecedores acima para começar a comparar os orçamentos.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    {fornecedoresCotados.map((forn) => {
                      const custoTotal = calcularTotalFornecedor(forn);
                      const isVencedor = custoTotal === custoTotalMaisBaixo && custoTotal > 0;

                      return (
                        <div key={forn.id} className={`relative rounded-xl border-2 transition-all flex flex-col bg-white ${isVencedor ? 'border-emerald-500 shadow-lg' : 'border-slate-200 hover:border-indigo-300'}`}>
                          
                          {isVencedor && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full flex items-center gap-1 shadow-sm z-10">
                              <CheckCircle2 className="w-4 h-4" /> Vencedor da Disputa
                            </div>
                          )}
                          
                          <div className={`p-4 border-b flex justify-between items-center rounded-t-lg ${isVencedor ? 'bg-emerald-50/50' : 'bg-slate-50'}`}>
                            <h4 className="font-black text-slate-800 text-lg leading-tight truncate pr-2 flex items-center gap-2" title={forn.nome}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${isVencedor ? 'bg-emerald-500' : 'bg-slate-800'}`}>#</div>
                                {forn.nome}
                            </h4>
                            <button onClick={() => removerFornecedorCotacao(forn.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 bg-white rounded-md border shadow-sm"><Trash2 className="w-4 h-4"/></button>
                          </div>

                          {/* LISTA DINÂMICA DE PREÇOS DENTRO DO CARD */}
                          <div className="p-4 space-y-3 bg-white">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b pb-1">Preços Unitários por Item</p>
                              
                              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                  {itensCotacao.map(item => {
                                      const precoObj = forn.precos.find(p => p.produtoId === item.produtoId);
                                      const precoAtual = precoObj ? precoObj.preco : '';
                                      
                                      return (
                                          <div key={item.id} className="flex items-center justify-between gap-3 bg-slate-50 p-2 rounded border border-slate-100">
                                              <div className="flex-1 truncate">
                                                  <p className="text-xs font-bold text-slate-700 truncate" title={item.nome}>{item.nome}</p>
                                                  <p className="text-[10px] text-slate-500 font-mono">Qtd: {item.quantidade}</p>
                                              </div>
                                              <div className="w-28 relative">
                                                  <span className="absolute left-2 top-2 text-xs font-bold text-slate-400">R$</span>
                                                  <Input 
                                                      type="number" step="0.01" 
                                                      value={precoAtual} 
                                                      onChange={e => atualizarPrecoItem(forn.id, item.produtoId, parseFloat(e.target.value)||0)} 
                                                      className="h-8 pl-7 text-sm font-semibold bg-white" 
                                                      placeholder="0,00" 
                                                  />
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>

                          {/* DADOS ADICIONAIS DO FORNECEDOR (FRETE E PRAZO) */}
                          <div className="p-4 bg-slate-50 border-t border-slate-200 mt-auto rounded-b-lg">
                              <div className="grid grid-cols-3 gap-3 mb-4">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider mb-1"><Truck className="w-3 h-3 text-indigo-400"/> Frete Lote</label>
                                  <Input type="number" step="0.01" value={forn.frete || ''} onChange={e => atualizarDadosFornecedor(forn.id, 'frete', parseFloat(e.target.value)||0)} className="h-8 text-sm font-semibold bg-white" placeholder="0,00"/>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider mb-1"><Clock className="w-3 h-3 text-amber-400"/> Prazo</label>
                                  <Input type="number" value={forn.prazoDias || ''} onChange={e => atualizarDadosFornecedor(forn.id, 'prazoDias', parseInt(e.target.value)||0)} className="h-8 text-sm font-semibold bg-white" placeholder="Dias" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider mb-1"><FileText className="w-3 h-3 text-emerald-400"/> Faturamento</label>
                                  <Input value={forn.condicaoPagamento} onChange={e => atualizarDadosFornecedor(forn.id, 'condicaoPagamento', e.target.value)} className="h-8 text-xs font-semibold bg-white" placeholder="Condição" />
                                </div>
                              </div>

                              <div className={`pt-4 border-t flex items-end justify-between ${isVencedor ? 'border-emerald-200' : 'border-slate-200'}`}>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Custo Total (Cesta + Frete)</p>
                                  <p className={`text-2xl font-black ${isVencedor ? 'text-emerald-600' : 'text-slate-800'}`}>R$ {custoTotal.toFixed(2).replace('.', ',')}</p>
                                </div>
                                <Button 
                                  onClick={() => gerarPedido(forn)} 
                                  disabled={gerandoPedido || custoTotal <= 0}
                                  className={`gap-2 shadow-md h-10 px-6 ${isVencedor ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-800 hover:bg-slate-900 text-white'}`}
                                >
                                  Gerar Pedido <ArrowRight className="w-4 h-4"/>
                                </Button>
                              </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* BOTÃO DE LIMPAR GERAL */}
            {itensCotacao.length > 0 && (
               <div className="flex justify-end pt-4">
                   <Button variant="outline" onClick={limparCotacao} className="text-slate-500 hover:text-red-600 hover:bg-red-50 border-slate-200 gap-2"><Trash2 className="w-4 h-4"/> Descartar Esta Cotação</Button>
               </div>
            )}

          </div>
        )}


        {/* ========================================================================= */}
        {/* ABA: HISTÓRICO DE PEDIDOS (PO) - SEM ALTERAÇÕES NESTA ABA */}
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