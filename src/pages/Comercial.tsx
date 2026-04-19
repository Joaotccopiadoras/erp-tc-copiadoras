import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, ShoppingBag, FileText, Printer, CheckCircle2, Plus, Search, Trash2, DollarSign, ArrowRight, Users, Percent, Calculator, FileCheck, PackageMinus, Landmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ItemVenda = {
  id: string;
  produtoId: string;
  sku: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  estoqueAtual: number;
};

export default function Comercial() {
  const [abaAtiva, setAbaAtiva] = useState<"pdv" | "historico">("pdv");

  // ==========================================
  // ESTADOS: BANCO DE DADOS
  // ==========================================
  const [produtosBD, setProdutosBD] = useState<any[]>([]);
  const [clientesBD, setClientesBD] = useState<any[]>([]);
  const [categoriaReceitaId, setCategoriaReceitaId] = useState("");

  // ==========================================
  // ESTADOS: NOVO ORÇAMENTO / VENDA (PDV)
  // ==========================================
  const [clienteBusca, setClienteBusca] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  
  const [produtoBusca, setProdutoBusca] = useState("");
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  
  const [desconto, setDesconto] = useState(0);
  const [tipoDesconto, setTipoDesconto] = useState<"valor" | "percentual">("valor");
  const [frete, setFrete] = useState(0);
  const [condicaoPagamento, setCondicaoPagamento] = useState("À Vista");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  // ==========================================
  // ESTADOS: HISTÓRICO E FATURAMENTO
  // ==========================================
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<any | null>(null);
  const [buscaHistorico, setBuscaHistorico] = useState("");

  useEffect(() => {
    fetchDadosBase();
    fetchPedidos();
  }, [abaAtiva]);

  const fetchDadosBase = async () => {
    const [prodRes, cliRes, catRes] = await Promise.all([
      supabase.from('log_produtos').select('id, sku, nome, preco_venda, estoque_atual').order('nome'),
      supabase.from('log_clientes').select('id, razao_social, nome_fantasia, cnpj_cpf').order('nome_fantasia'),
      supabase.from('fin_categorias').select('id, nome').eq('tipo', 'Receita').limit(1).single()
    ]);
    if (prodRes.data) setProdutosBD(prodRes.data);
    if (cliRes.data) setClientesBD(cliRes.data);
    if (catRes.data) setCategoriaReceitaId(catRes.data.id);
  };

  const fetchPedidos = async () => {
    const { data } = await supabase.from('com_pedidos_venda').select('*').order('numero_pedido', { ascending: false });
    if (data) setPedidos(data);
  };

  // --- LÓGICA DO CARRINHO (PDV) ---
  const adicionarItem = () => {
    if (!produtoBusca) return;
    const prod = produtosBD.find(p => p.nome === produtoBusca || `${p.sku || 'S/N'} - ${p.nome}` === produtoBusca);
    if (!prod) return alert("Produto não encontrado.");

    const itemExistente = itensVenda.find(i => i.produtoId === prod.id);
    if (itemExistente) {
      setItensVenda(prev => prev.map(i => i.produtoId === prod.id ? { ...i, quantidade: i.quantidade + 1 } : i));
    } else {
      setItensVenda([...itensVenda, {
        id: crypto.randomUUID(),
        produtoId: prod.id,
        sku: prod.sku || 'S/N',
        nome: prod.nome,
        quantidade: 1,
        precoUnitario: prod.preco_venda || 0, 
        estoqueAtual: prod.estoque_atual || 0
      }]);
    }
    setProdutoBusca("");
  };

  const atualizarItem = (id: string, campo: keyof ItemVenda, valor: number) => {
    setItensVenda(prev => prev.map(i => i.id === id ? { ...i, [campo]: valor } : i));
  };

  const removerItem = (id: string) => {
    setItensVenda(prev => prev.filter(i => i.id !== id));
  };

  const limparPDV = () => {
    if (!confirm("Limpar todos os dados do orçamento atual?")) return;
    setClienteBusca(""); setClienteId(null); setItensVenda([]); setDesconto(0); setFrete(0); setObservacoes("");
  };

  // --- CÁLCULOS MATEMÁTICOS ---
  const subtotal = itensVenda.reduce((acc, item) => acc + (item.quantidade * item.precoUnitario), 0);
  const valorDescontoCalculado = tipoDesconto === "percentual" ? subtotal * (desconto / 100) : desconto;
  const total = subtotal - valorDescontoCalculado + frete;

  // --- SALVAR ORÇAMENTO / PEDIDO ---
  const salvarPedido = async (statusInicial: 'Orçamento' | 'Aprovado') => {
    if (!clienteBusca) return alert("Informe o cliente para gerar o pedido.");
    if (itensVenda.length === 0) return alert("Adicione produtos ao carrinho.");

    setSalvando(true);
    try {
      let idClienteFinal = clienteId;
      if (!idClienteFinal) {
        const cliMatch = clientesBD.find(c => c.nome_fantasia === clienteBusca || c.razao_social === clienteBusca);
        if (cliMatch) {
          idClienteFinal = cliMatch.id;
        }
      }

      const dataValidade = new Date();
      dataValidade.setDate(dataValidade.getDate() + 7);

      const cabecalho = {
        cliente_id: idClienteFinal,
        cliente_nome: clienteBusca,
        validade_orcamento: dataValidade.toISOString().split('T')[0],
        status: statusInicial,
        valor_subtotal: subtotal,
        valor_desconto: valorDescontoCalculado,
        valor_frete: frete,
        valor_total: total,
        condicao_pagamento: condicaoPagamento,
        observacoes: observacoes
      };

      const { data: pedidoData, error: pedidoError } = await supabase.from('com_pedidos_venda').insert([cabecalho]).select('id, numero_pedido').single();
      if (pedidoError) throw pedidoError;

      const itensPayload = itensVenda.map(item => ({
        pedido_id: pedidoData.id,
        produto_id: item.produtoId,
        produto_nome: item.nome,
        quantidade: item.quantidade,
        preco_unitario: item.precoUnitario,
        total_item: item.quantidade * item.precoUnitario
      }));

      const { error: itensError } = await supabase.from('com_pedidos_venda_itens').insert(itensPayload);
      if (itensError) throw itensError;

      alert(`${statusInicial} #${pedidoData.numero_pedido} salvo com sucesso!`);
      setClienteBusca(""); setClienteId(null); setItensVenda([]); setDesconto(0); setFrete(0); setObservacoes("");
      fetchPedidos();
      setAbaAtiva("historico");

    } catch (error: any) {
      console.error(error); alert("Erro ao salvar: " + error.message);
    } finally {
      setSalvando(false);
    }
  };

  // --- FATURAMENTO (INTEGRAÇÃO ESTOQUE E FINANCEIRO) ---
  const faturarPedido = async (pedido: any) => {
    if (!confirm(`Deseja Faturar o Pedido #${pedido.numero_pedido}?\nIsso irá dar baixa no estoque e gerar uma Conta a Receber no Financeiro.`)) return;

    try {
      const { data: itensDoPedido } = await supabase.from('com_pedidos_venda_itens').select('*').eq('pedido_id', pedido.id);
      
      if (!itensDoPedido || itensDoPedido.length === 0) return alert("Pedido sem itens.");

      for (const item of itensDoPedido) {
        const { data: prodData } = await supabase.from('log_produtos').select('estoque_atual').eq('id', item.produto_id).single();
        if (prodData) {
            const novoEstoque = Math.max(0, prodData.estoque_atual - item.quantidade);
            await supabase.from('log_produtos').update({ estoque_atual: novoEstoque }).eq('id', item.produto_id);
        }
        await supabase.from('log_movimentacoes').insert({
            produto_id: item.produto_id, tipo: 'Saída', quantidade: item.quantidade, 
            documento: `PED-${pedido.numero_pedido}`, fornecedor_cliente: pedido.cliente_nome,
            observacoes: 'Faturamento de Venda'
        });
      }

      const payloadFin = {
          tipo: 'Receita',
          descricao: `Venda Pedido #${pedido.numero_pedido} - ${pedido.cliente_nome}`,
          valor: pedido.valor_total,
          data_emissao: new Date().toISOString().split('T')[0],
          data_vencimento: new Date().toISOString().split('T')[0], 
          status: 'Pendente',
          categoria_id: categoriaReceitaId || null,
          documento_origem: `PED-${pedido.numero_pedido}`,
          observacoes: `Condição: ${pedido.condicao_pagamento}`
      };
      const { error: finError } = await supabase.from('fin_lancamentos').insert([payloadFin]);
      if (finError) throw new Error("Erro ao gerar financeiro: " + finError.message);

      await supabase.from('com_pedidos_venda').update({ status: 'Faturado' }).eq('id', pedido.id);

      alert(`Pedido #${pedido.numero_pedido} Faturado com sucesso! Estoque atualizado e Receita gerada.`);
      fetchPedidos();
      setPedidoSelecionado(null);

    } catch (error: any) {
      console.error(error); alert("Erro durante o faturamento: " + error.message);
    }
  };

  const abrirVisualizacaoPedido = async (pedido: any) => {
    const { data: itens } = await supabase.from('com_pedidos_venda_itens').select('*').eq('pedido_id', pedido.id);
    setPedidoSelecionado({ ...pedido, itens: itens || [] });
  };

  const pedidosFiltrados = pedidos.filter(p => 
    (p.cliente_nome?.toLowerCase() || "").includes(buscaHistorico.toLowerCase()) || 
    (p.numero_pedido?.toString() || "").includes(buscaHistorico)
  );

  return (
    <AppLayout>
      {/* A MÁGICA DA IMPRESSÃO ACONTECE AQUI:
        Força a ocultação da barra do AppLayout e expande os containers para 100%
      */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          
          /* Oculta os elementos estruturais do sistema (Menu Lateral e Topo) */
          aside, header { display: none !important; }
          
          /* Libera os containeres para ocuparem toda a tela e ignora barras de rolagem */
          html, body, #root, main, .overflow-y-auto, .overflow-hidden {
            display: block !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Garante que cores de fundo (como a barra azul da tabela) sejam impressas */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      {/* Adicionadas as regras print:w-full e print:max-w-none para esticar no papel */}
      <div className="space-y-6 max-w-6xl mx-auto mb-12 print:max-w-none print:w-full print:m-0 print:p-0 print:space-y-0">
        <datalist id="lista-produtos-venda">{produtosBD.map((p) => <option key={p.id} value={`${p.sku || 'S/N'} - ${p.nome}`} />)}</datalist>
        <datalist id="lista-clientes">{clientesBD.map((c) => <option key={c.id} value={c.nome_fantasia || c.razao_social} />)}</datalist>

        {/* CABEÇALHO E ABAS */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Briefcase className="w-6 h-6 text-indigo-600" /> Módulo Comercial</h1>
            <p className="text-slate-500">Orçamentos, Pedidos de Venda e Faturamento.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setAbaAtiva("pdv")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "pdv" ? "bg-white shadow-sm text-indigo-700" : "text-slate-600 hover:text-slate-900"}`}><ShoppingBag className="w-4 h-4"/> Novo Orçamento / Venda</button>
            <button onClick={() => setAbaAtiva("historico")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "historico" ? "bg-white shadow-sm text-indigo-700" : "text-slate-600 hover:text-slate-900"}`}><FileText className="w-4 h-4"/> Histórico de Vendas</button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA 1: PDV / NOVO ORÇAMENTO */}
        {/* ========================================================================= */}
        {abaAtiva === "pdv" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-200 print:hidden">
            
            {/* LADO ESQUERDO: SELEÇÃO DE PRODUTOS */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-1.5 w-full">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Users className="w-3 h-3"/> Cliente</label>
                    <Input list="lista-clientes" value={clienteBusca} onChange={e => { setClienteBusca(e.target.value); const cli = clientesBD.find(c => c.nome_fantasia === e.target.value || c.razao_social === e.target.value); if(cli) setClienteId(cli.id); else setClienteId(null); }} placeholder="Buscar cliente..." className="bg-slate-50 border-slate-200 text-base" />
                  </div>
                  <div className="flex-1 space-y-1.5 w-full">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Search className="w-3 h-3"/> Buscar Produto</label>
                    <div className="flex gap-2">
                        <Input list="lista-produtos-venda" value={produtoBusca} onChange={e => setProdutoBusca(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') adicionarItem() }} placeholder="SKU ou Nome..." className="bg-white border-indigo-200 text-base" />
                        <Button onClick={adicionarItem} className="bg-indigo-600 hover:bg-indigo-700 shrink-0 px-3"><Plus className="w-4 h-4"/></Button>
                    </div>
                  </div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm overflow-hidden min-h-[400px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white text-[11px] uppercase tracking-wider">
                      <th className="p-3 font-semibold">Produto</th>
                      <th className="p-3 font-semibold text-center w-24">Estoque</th>
                      <th className="p-3 font-semibold text-center w-28">Quantidade</th>
                      <th className="p-3 font-semibold text-right w-32">Preço Unit.</th>
                      <th className="p-3 font-semibold text-right w-32">Total</th>
                      <th className="p-3 font-semibold text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itensVenda.length === 0 ? (
                      <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-medium">Carrinho vazio. Busque um produto para iniciar a venda.</td></tr>
                    ) : (
                      itensVenda.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <p className="font-bold text-slate-800 text-sm">{item.nome}</p>
                            <p className="text-[10px] text-slate-500 font-mono">SKU: {item.sku}</p>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.estoqueAtual < item.quantidade ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{item.estoqueAtual}</span>
                          </td>
                          <td className="p-3">
                            <Input type="number" min="1" value={item.quantidade} onChange={e => atualizarItem(item.id, 'quantidade', parseFloat(e.target.value)||1)} className="h-8 text-center text-sm font-bold bg-white" />
                          </td>
                          <td className="p-3">
                            <Input type="number" step="0.01" value={item.precoUnitario} onChange={e => atualizarItem(item.id, 'precoUnitario', parseFloat(e.target.value)||0)} className="h-8 text-right text-sm bg-white" />
                          </td>
                          <td className="p-3 text-right font-bold text-indigo-700">R$ {(item.quantidade * item.precoUnitario).toFixed(2).replace('.', ',')}</td>
                          <td className="p-3 text-center"><button onClick={() => removerItem(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LADO DIREITO: CÁLCULOS E FINALIZAÇÃO */}
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2"><Calculator className="w-4 h-4 text-indigo-600"/> Fechamento</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-500">Subtotal</span>
                    <span className="font-bold text-slate-800">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  
                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                      Desconto
                      <button onClick={() => setTipoDesconto(tipoDesconto === 'valor' ? 'percentual' : 'valor')} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1">Mudar para {tipoDesconto === 'valor' ? '%' : 'R$'}</button>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">{tipoDesconto === 'valor' ? 'R$' : '%'}</span>
                      <Input type="number" step="0.01" value={desconto} onChange={e => setDesconto(parseFloat(e.target.value)||0)} className="pl-9 bg-slate-50" />
                    </div>
                    {valorDescontoCalculado > 0 && <p className="text-[10px] text-emerald-600 text-right">- R$ {valorDescontoCalculado.toFixed(2).replace('.',',')}</p>}
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">Frete / Acréscimo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">R$</span>
                      <Input type="number" step="0.01" value={frete} onChange={e => setFrete(parseFloat(e.target.value)||0)} className="pl-9 bg-slate-50" />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 p-4 rounded-lg text-white mt-4">
                  <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Total a Receber</p>
                  <p className="text-3xl font-black text-emerald-400">R$ {total.toFixed(2).replace('.', ',')}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Condição de Pagamento</label>
                    <Select value={condicaoPagamento} onValueChange={setCondicaoPagamento}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="À Vista">À Vista</SelectItem><SelectItem value="Boleto 30 Dias">Boleto 30 Dias</SelectItem><SelectItem value="Cartão Crédito">Cartão de Crédito</SelectItem><SelectItem value="PIX">PIX</SelectItem></SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Observações (Impressas)</label>
                    <Input value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Ex: Validade da proposta..." className="bg-white" />
                 </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={() => salvarPedido('Aprovado')} disabled={salvando || itensVenda.length === 0} className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white w-full gap-2 text-base font-bold shadow-md"><CheckCircle2 className="w-5 h-5"/> Aprovar e Salvar Venda</Button>
                <Button onClick={() => salvarPedido('Orçamento')} disabled={salvando || itensVenda.length === 0} variant="outline" className="h-10 text-indigo-700 border-indigo-200 hover:bg-indigo-50 w-full gap-2 font-bold"><FileText className="w-4 h-4"/> Salvar como Orçamento</Button>
                {itensVenda.length > 0 && <Button variant="ghost" onClick={limparPDV} className="mt-2 text-slate-400 hover:text-red-500">Limpar Tudo</Button>}
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: HISTÓRICO DE VENDAS E FATURAMENTO */}
        {/* ========================================================================= */}
        {abaAtiva === "historico" && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
             
            {!pedidoSelecionado ? (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden print:hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input value={buscaHistorico} onChange={e => setBuscaHistorico(e.target.value)} placeholder="Buscar cliente ou nº..." className="pl-9 bg-white" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                                    <th className="p-4 font-semibold border-b text-center w-24">Doc</th>
                                    <th className="p-4 font-semibold border-b">Cliente</th>
                                    <th className="p-4 font-semibold border-b text-center">Data Emissão</th>
                                    <th className="p-4 font-semibold border-b text-center">Status</th>
                                    <th className="p-4 font-semibold border-b text-right">Valor Total</th>
                                    <th className="p-4 font-semibold border-b text-center w-36">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pedidosFiltrados.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhum orçamento ou pedido encontrado.</td></tr>
                                ) : (
                                    pedidosFiltrados.map(ped => (
                                        <tr key={ped.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 text-center font-bold text-indigo-700 font-mono text-sm">PED-{String(ped.numero_pedido).padStart(4,'0')}</td>
                                            <td className="p-4 font-semibold text-slate-800 text-sm">{ped.cliente_nome}</td>
                                            <td className="p-4 text-center text-sm text-slate-600">{new Date(ped.data_emissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                            <td className="p-4 text-center">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${ped.status === 'Orçamento' ? 'bg-amber-100 text-amber-700' : ped.status === 'Aprovado' ? 'bg-blue-100 text-blue-700' : ped.status === 'Faturado' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    {ped.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-bold text-emerald-600">R$ {Number(ped.valor_total).toFixed(2).replace('.', ',')}</td>
                                            <td className="p-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <Button variant="outline" size="icon" onClick={() => abrirVisualizacaoPedido(ped)} className="h-8 w-8 text-slate-600 hover:text-indigo-600 border-slate-200" title="Ver Documento"><FileText className="w-4 h-4"/></Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* VISÃO DE IMPRESSÃO DO DOCUMENTO E AÇÕES DE FATURAMENTO */
                <div className="max-w-4xl mx-auto space-y-6 print:max-w-none print:w-full print:m-0 print:p-0 print:space-y-0">
                    
                    {/* BARRA DE AÇÕES SUPERIOR */}
                    <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-xl border shadow-sm print:hidden">
                        <Button variant="ghost" onClick={() => setPedidoSelecionado(null)} className="gap-2 text-slate-500"><ArrowRight className="w-4 h-4 rotate-180"/> Voltar</Button>
                        <div className="flex gap-2">
                            <Button onClick={() => window.print()} variant="outline" className="gap-2 text-slate-700"><Printer className="w-4 h-4"/> Imprimir PDF</Button>
                            
                            {pedidoSelecionado.status === 'Orçamento' && (
                                <Button onClick={async () => {
                                    if(confirm('Aprovar orçamento?')) {
                                        await supabase.from('com_pedidos_venda').update({ status: 'Aprovado' }).eq('id', pedidoSelecionado.id);
                                        fetchPedidos(); setPedidoSelecionado({...pedidoSelecionado, status: 'Aprovado'});
                                    }
                                }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><CheckCircle2 className="w-4 h-4"/> Aprovar Orçamento</Button>
                            )}

                            {pedidoSelecionado.status === 'Aprovado' && (
                                <Button onClick={() => faturarPedido(pedidoSelecionado)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold shadow-md animate-pulse duration-2000"><Landmark className="w-4 h-4"/> Faturar Pedido (Gerar Receita e Baixar Estoque)</Button>
                            )}

                            {pedidoSelecionado.status === 'Faturado' && (
                                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-md font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Pedido Faturado com Sucesso</div>
                            )}
                        </div>
                    </div>

                    {/* FOLHA DE IMPRESSÃO A4 */}
                    <div id="area-impressao" className="bg-white p-12 rounded-xl shadow-lg border border-slate-200 print:p-0 print:border-none print:shadow-none print:w-full print:block">
                        {/* CABEÇALHO DO PDF */}
                        <div className="flex justify-between items-start border-b-2 border-indigo-800 pb-6 mb-8">
                            <div>
                                <h2 className="text-3xl font-black text-indigo-900 uppercase tracking-wider mb-1">{pedidoSelecionado.status === 'Orçamento' ? 'Proposta Comercial' : 'Pedido de Venda'}</h2>
                                <p className="text-slate-500 font-medium">TC Copiadoras • Soluções em Impressão</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Documento Nº</p>
                                <p className="text-3xl font-mono font-bold text-indigo-600">PED-{String(pedidoSelecionado.numero_pedido).padStart(4,'0')}</p>
                            </div>
                        </div>

                        {/* DADOS DO CLIENTE E DATAS */}
                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Faturar Para:</p>
                                <p className="text-lg font-bold text-slate-800 mb-1">{pedidoSelecionado.cliente_nome}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Emissão</p>
                                    <p className="text-base font-semibold text-slate-800">{new Date(pedidoSelecionado.data_emissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Validade</p>
                                    <p className="text-base font-semibold text-slate-800">{new Date(pedidoSelecionado.validade_orcamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                                </div>
                                <div className="space-y-1 col-span-2 mt-4 pt-4 border-t border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Condição de Pagamento</p>
                                    <p className="text-base font-semibold text-slate-800">{pedidoSelecionado.condicao_pagamento || 'À Vista'}</p>
                                </div>
                            </div>
                        </div>

                        {/* ITENS */}
                        <div className="mb-8 min-h-[250px]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-indigo-900 text-white text-xs uppercase tracking-wider">
                                        <th className="p-3 font-semibold rounded-tl-lg">Descrição do Item</th>
                                        <th className="p-3 font-semibold text-center">Qtd</th>
                                        <th className="p-3 font-semibold text-right">Valor Unit.</th>
                                        <th className="p-3 font-semibold text-right rounded-tr-lg">Total Item</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 border-b border-slate-200">
                                    {pedidoSelecionado.itens?.map((item: any, idx: number) => (
                                        <tr key={idx} className="text-sm">
                                            <td className="p-3 font-medium text-slate-800">{item.produto_nome}</td>
                                            <td className="p-3 text-center">{item.quantidade}</td>
                                            <td className="p-3 text-right text-slate-600">R$ {Number(item.preco_unitario).toFixed(2).replace('.', ',')}</td>
                                            <td className="p-3 text-right font-bold text-slate-800">R$ {Number(item.total_item).toFixed(2).replace('.', ',')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* TOTAIS */}
                        <div className="flex justify-between items-end">
                            <div className="w-1/2">
                                {pedidoSelecionado.observacoes && (
                                    <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm text-amber-800">
                                        <strong>Observações:</strong><br/>
                                        {pedidoSelecionado.observacoes}
                                    </div>
                                )}
                            </div>
                            <div className="w-72 space-y-3 bg-slate-50 p-5 rounded-lg border border-slate-200">
                                <div className="flex justify-between text-sm">
                                    <span className="font-semibold text-slate-500">Subtotal</span>
                                    <span className="font-bold text-slate-800">R$ {Number(pedidoSelecionado.valor_subtotal).toFixed(2).replace('.', ',')}</span>
                                </div>
                                {Number(pedidoSelecionado.valor_desconto) > 0 && (
                                    <div className="flex justify-between text-sm text-rose-600">
                                        <span className="font-semibold">Desconto</span>
                                        <span className="font-bold">- R$ {Number(pedidoSelecionado.valor_desconto).toFixed(2).replace('.', ',')}</span>
                                    </div>
                                )}
                                {Number(pedidoSelecionado.valor_frete) > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="font-semibold text-slate-500">Frete / Acréscimo</span>
                                        <span className="font-bold text-slate-800">R$ {Number(pedidoSelecionado.valor_frete).toFixed(2).replace('.', ',')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                                    <span className="font-bold text-slate-800 uppercase tracking-wider">Total</span>
                                    <span className="font-black text-2xl text-indigo-700">R$ {Number(pedidoSelecionado.valor_total).toFixed(2).replace('.', ',')}</span>
                                </div>
                            </div>
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