import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PackageOpen, Plus, Save, Trash2, Barcode, CheckCircle2, ArrowLeft, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ItemEntrada = {
  produtoId: string;
  sku: string;
  nome: string;
  rastreiaSerie: boolean;
  quantidade: number;
  custo: number;
  series: string[];
};

export default function Entradas() {
  const [modo, setModo] = useState<"formulario" | "bipagem">("formulario");
  
  // cab entrada
  const [fornecedor, setFornecedor] = useState("");
  const [documento, setDocumento] = useState("");
  
  // autocomplete
  const [produtosBD, setProdutosBD] = useState<any[]>([]);
  const [buscaProduto, setBuscaProduto] = useState("");

  // carrin entrada
  const [itens, setItens] = useState<ItemEntrada[]>([]);
  
  // tela de bip
  const [indexBipagem, setIndexBipagem] = useState<number | null>(null);
  const [serialInput, setSerialInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetchProdutos();
  }, []);

  useEffect(() => {
    if (modo === "bipagem" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [modo]);

  const fetchProdutos = async () => {
    const { data, error } = await supabase.from('log_produtos').select('id, sku, nome, rastreia_serie, custo_base').order('nome', { ascending: true });
    if (data) setProdutosBD(data);
    if (error) console.error(error);
  };

  const adicionarProdutoPorBusca = () => {
    if (!buscaProduto) return;
    
    const produtoEncontrado = produtosBD.find(p => `${p.sku || 'S/N'} - ${p.nome}` === buscaProduto);
    
    if (!produtoEncontrado) {
      alert("Produto não encontrado no catálogo. Selecione um item válido da lista.");
      return;
    }

    const indexExistente = itens.findIndex(i => i.produtoId === produtoEncontrado.id);
    if (indexExistente >= 0) {
      const novosItens = [...itens];
      novosItens[indexExistente].quantidade += 1;
      setItens(novosItens);
    } else {
      setItens([...itens, {
        produtoId: produtoEncontrado.id,
        sku: produtoEncontrado.sku,
        nome: produtoEncontrado.nome,
        rastreiaSerie: produtoEncontrado.rastreia_serie,
        quantidade: 1,
        custo: produtoEncontrado.custo_base || 0,
        series: []
      }]);
    }
    setBuscaProduto("");
  };

  const removerItem = (index: number) => {
    const novosItens = [...itens];
    novosItens.splice(index, 1);
    setItens(novosItens);
  };

  const atualizarItem = (index: number, campo: keyof ItemEntrada, valor: any) => {
    const novosItens = [...itens];
    novosItens[index] = { ...novosItens[index], [campo]: valor };
    
    if (campo === 'quantidade' && novosItens[index].rastreiaSerie) {
        if (novosItens[index].series.length > valor) {
            novosItens[index].series = novosItens[index].series.slice(0, valor);
        }
    }
    setItens(novosItens);
  };

  const abrirBipagem = (index: number) => {
    setIndexBipagem(index);
    setModo("bipagem");
  };

  const biparSerie = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!serialInput.trim()) return;

      const novosItens = [...itens];
      const itemAtual = novosItens[indexBipagem!];

      // validacoes
      if (itemAtual.series.includes(serialInput.trim())) {
        alert("Este número de série já foi bipado nesta entrada!");
        setSerialInput("");
        return;
      }
      if (itemAtual.series.length >= itemAtual.quantidade) {
        alert("A quantidade máxima para este item já foi bipada!");
        setSerialInput("");
        return;
      }

      itemAtual.series.push(serialInput.trim().toUpperCase());
      setItens(novosItens);
      setSerialInput("");
    }
  };

  const removerSerie = (indexSerie: number) => {
    const novosItens = [...itens];
    novosItens[indexBipagem!].series.splice(indexSerie, 1);
    setItens(novosItens);
  };

  const salvarEntrada = async () => {
    if (!fornecedor || !documento) return alert("Preencha o Fornecedor e o Número do Documento/NF.");
    if (itens.length === 0) return alert("Adicione pelo menos um produto na entrada.");

    // valid series
    for (let i = 0; i < itens.length; i++) {
      if (itens[i].rastreiaSerie && itens[i].series.length !== itens[i].quantidade) {
        return alert(`Erro: O produto "${itens[i].nome}" exige ${itens[i].quantidade} números de série, mas apenas ${itens[i].series.length} foram bipados.`);
      }
      if (itens[i].quantidade <= 0) {
          return alert(`Erro: A quantidade do produto "${itens[i].nome}" deve ser maior que zero.`);
      }
    }

    setSalvando(true);

    try {
      for (const item of itens) {
        await supabase.from('log_movimentacoes').insert({
          produto_id: item.produtoId,
          tipo: 'Entrada',
          quantidade: item.quantidade,
          custo_unitario: item.custo,
          documento: documento,
          fornecedor_cliente: fornecedor
        });
        if (item.rastreiaSerie && item.series.length > 0) {
          const payloadSeries = item.series.map(s => ({
            produto_id: item.produtoId,
            numero_serie: s,
            status: 'Em Estoque',
            documento_entrada: documento
          }));
          await supabase.from('log_numeros_serie').insert(payloadSeries);
        }

        // atual estoque fis
        const { data: prodData } = await supabase.from('log_produtos').select('estoque_atual').eq('id', item.produtoId).single();
        const novoEstoque = (prodData?.estoque_atual || 0) + item.quantidade;
        
        await supabase.from('log_produtos').update({ 
            estoque_atual: novoEstoque,
            custo_base: item.custo // Atualiza o custo base com o valor da última entrada
        }).eq('id', item.produtoId);
      }

      alert("Entrada registrada com sucesso! Estoque atualizado.");
      // Limpa a tela para a próxima NF
      setFornecedor(""); setDocumento(""); setItens([]);
    } catch (error) {
      console.error(error);
      alert("Houve um erro de conexão ao salvar a entrada.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        
        {/* Render datalist */}
        <datalist id="lista-produtos-bd">
          {produtosBD.map((p) => (
            <option key={p.id} value={`${p.sku || 'S/N'} - ${p.nome}`} />
          ))}
        </datalist>

        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <PackageOpen className="w-6 h-6 text-emerald-600" /> 
              {modo === "formulario" ? "Entrada Manual de Estoque" : "Bipagem de Séries"}
            </h1>
            <p className="text-slate-500">
              {modo === "formulario" ? "Registre NF-es e alimente o saldo físico dos produtos." : "Utilize o leitor de código de barras para registrar os equipamentos."}
            </p>
          </div>
          {modo === "bipagem" && (
             <Button variant="outline" onClick={() => setModo("formulario")} className="gap-2">
                <ArrowLeft className="w-4 h-4"/> Voltar para a Nota
             </Button>
          )}
        </div>

        {/* TELA 1: FORMULÁRIO DA NOTA */}
        {modo === "formulario" && (
          <div className="space-y-6">
            
            {/* Cabeçalho da NF */}
            <div className="bg-white p-6 rounded-xl border shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Fornecedor / Origem</label>
                <Input value={fornecedor} onChange={e => setFornecedor(e.target.value)} placeholder="Ex: Distribuidora XYZ Ltda" className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nº do Documento / NF-e</label>
                <Input value={documento} onChange={e => setDocumento(e.target.value)} placeholder="Ex: NF 123456" className="bg-slate-50" />
              </div>
            </div>

            {/* Inserção de Itens */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="bg-slate-50 p-4 border-b flex items-center gap-3">
                <div className="flex-1">
                  <Input 
                    list="lista-produtos-bd" 
                    value={buscaProduto} 
                    onChange={e => setBuscaProduto(e.target.value)} 
                    placeholder="Pesquise o produto por SKU ou Nome..." 
                    className="bg-white border-slate-300"
                    onKeyDown={(e) => { if(e.key === 'Enter') adicionarProdutoPorBusca(); }}
                  />
                </div>
                <Button onClick={adicionarProdutoPorBusca} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  <Plus className="w-4 h-4" /> Adicionar à Nota
                </Button>
              </div>

              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                      <th className="p-3 font-semibold border-b">Produto</th>
                      <th className="p-3 font-semibold border-b w-32 text-center">Rastreável?</th>
                      <th className="p-3 font-semibold border-b w-32">Custo Unit. (R$)</th>
                      <th className="p-3 font-semibold border-b w-28">Qtd</th>
                      <th className="p-3 font-semibold border-b w-32 text-right">Total</th>
                      <th className="p-3 font-semibold border-b w-16 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itens.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          Nenhum produto adicionado à entrada ainda.
                        </td>
                      </tr>
                    ) : (
                      itens.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <p className="font-semibold text-slate-800 text-sm">{item.nome}</p>
                            <p className="text-xs text-slate-500">SKU: {item.sku || "S/N"}</p>
                          </td>
                          <td className="p-3 text-center">
                            {item.rastreiaSerie ? (
                              <Button 
                                size="sm" 
                                variant={item.series.length === item.quantidade ? "default" : "secondary"}
                                onClick={() => abrirBipagem(index)}
                                className={`h-7 text-xs w-full gap-1 ${item.series.length === item.quantidade ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                              >
                                {item.series.length === item.quantidade ? <CheckCircle2 className="w-3 h-3"/> : <Barcode className="w-3 h-3" />}
                                {item.series.length}/{item.quantidade} Séries
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">Lote</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Input type="number" step="0.01" min="0" value={item.custo} onChange={e => atualizarItem(index, 'custo', parseFloat(e.target.value) || 0)} className="h-8 text-sm bg-white" />
                          </td>
                          <td className="p-3">
                            <Input type="number" min="1" value={item.quantidade} onChange={e => atualizarItem(index, 'quantidade', parseInt(e.target.value) || 1)} className="h-8 text-sm bg-white" />
                          </td>
                          <td className="p-3 text-right font-medium text-slate-700">
                            R$ {(item.quantidade * item.custo).toFixed(2).replace('.', ',')}
                          </td>
                          <td className="p-3 text-center">
                            <Button variant="ghost" size="icon" onClick={() => removerItem(index)} className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rodapé de Fechamento */}
            {itens.length > 0 && (
              <div className="flex justify-between items-center bg-stone-800 p-4 rounded-xl text-white shadow-lg">
                <div>
                  <p className="text-stone-300 text-sm">Valor Total da Entrada</p>
                  <p className="text-2xl font-bold">
                    R$ {itens.reduce((acc, item) => acc + (item.quantidade * item.custo), 0).toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <Button onClick={salvarEntrada} disabled={salvando} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 text-lg h-12 px-6">
                  {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {salvando ? "Registrando..." : "Finalizar Recebimento"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TELA 2: MODO BIPAGEM DE SÉRIES (TELA CHEIA/FOCO) */}
        {modo === "bipagem" && indexBipagem !== null && (
          <div className="bg-white rounded-xl border shadow-sm p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            
            <div className="max-w-md mx-auto space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-2">
                  <Barcode className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">{itens[indexBipagem].nome}</h2>
                <p className="text-slate-500">
                  Progresso: <strong className={itens[indexBipagem].series.length === itens[indexBipagem].quantidade ? "text-emerald-600" : "text-amber-600"}>
                    {itens[indexBipagem].series.length} de {itens[indexBipagem].quantidade}
                  </strong> séries bipadas
                </p>
              </div>

              {itens[indexBipagem].series.length < itens[indexBipagem].quantidade ? (
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-inner">
                  <label className="block text-sm font-semibold text-blue-900 mb-2 uppercase tracking-wider">Aguardando Leitor Óptico</label>
                  <Input 
                    ref={inputRef}
                    value={serialInput}
                    onChange={e => setSerialInput(e.target.value)}
                    onKeyDown={biparSerie}
                    placeholder="Bipe ou digite o Nº de Série e aperte Enter..."
                    className="h-14 text-center text-lg shadow-sm border-blue-300 focus-visible:ring-blue-500"
                  />
                </div>
              ) : (
                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  <p className="font-bold text-emerald-800 text-lg">Bipagem Concluída!</p>
                  <Button onClick={() => setModo("formulario")} className="mt-2 bg-emerald-600 hover:bg-emerald-700">Voltar para a Nota</Button>
                </div>
              )}

              {/* Lista das séries já bipadas deste item */}
              {itens[indexBipagem].series.length > 0 && (
                <div className="mt-8 text-left">
                  <p className="text-sm font-bold text-slate-400 mb-3 border-b pb-2">SÉRIES REGISTRADAS NESTE LOTE:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {itens[indexBipagem].series.map((serie, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded p-2 flex justify-between items-center group">
                        <span className="font-mono text-sm text-slate-700">{serie}</span>
                        <button onClick={() => removerSerie(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}