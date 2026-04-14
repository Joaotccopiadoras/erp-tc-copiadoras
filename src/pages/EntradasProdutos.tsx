import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PackageOpen, Plus, Save, Trash2, Barcode, CheckCircle2, ArrowLeft, Upload, FileCode2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ItemEntrada = {
  produtoId: string;
  sku: string;
  nome: string;
  rastreiaSerie: boolean;
  quantidade: number;
  custo: number;
  series: string[];
  precisaMapeamento?: boolean;
  nomeOriginalXML?: string;
};

export default function Entradas() {
  const [modo, setModo] = useState<"formulario" | "bipagem">("formulario");
  
  const [fornecedor, setFornecedor] = useState("");
  const [documento, setDocumento] = useState("");
  
  const [produtosBD, setProdutosBD] = useState<any[]>([]);
  const [buscaProduto, setBuscaProduto] = useState("");

  const [itens, setItens] = useState<ItemEntrada[]>([]);
  
  const [indexBipagem, setIndexBipagem] = useState<number | null>(null);
  const [serialInput, setSerialInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Referência para o botão invisível de XML

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

  const acionarUploadXML = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const processarXML = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");

      // Extrai Dados do Cabeçalho da NF-e
      const emitente = xmlDoc.querySelector("emit xNome")?.textContent || "";
      const nNf = xmlDoc.querySelector("ide nNF")?.textContent || "";
      
      setFornecedor(emitente);
      setDocumento(`NF-e ${nNf}`);

      // Extrai os Itens (Produtos)
      const detNodes = xmlDoc.querySelectorAll("det");
      const novosItens: ItemEntrada[] = [];

      detNodes.forEach(det => {
        const cProd = det.querySelector("prod cProd")?.textContent || ""; // Código do Fornecedor
        const xProd = det.querySelector("prod xProd")?.textContent || ""; // Nome do Fornecedor
        const qCom = parseFloat(det.querySelector("prod qCom")?.textContent || "0"); // Quantidade
        const vUnCom = parseFloat(det.querySelector("prod vUnCom")?.textContent || "0"); // Valor Unitário

        // Tenta achar o produto no nosso banco (buscando pelo SKU)
        const match = produtosBD.find(p => p.sku === cProd);

        if (match) {
          // Achou! Importa perfeitamente
          novosItens.push({
            produtoId: match.id,
            sku: match.sku,
            nome: match.nome,
            rastreiaSerie: match.rastreia_serie,
            quantidade: qCom,
            custo: vUnCom,
            series: []
          });
        } else {
          // Não achou! Importa exigindo que o usuário mapeie (De-Para)
          novosItens.push({
            produtoId: "", // ID Vazio = Bloqueia o salvamento
            sku: cProd,
            nome: "", // Vai ser preenchido quando mapear
            rastreiaSerie: false,
            quantidade: qCom,
            custo: vUnCom,
            series: [],
            precisaMapeamento: true,
            nomeOriginalXML: xProd // Mostra na tela para o usuário saber o que é
          });
        }
      });

      setItens(prev => [...prev, ...novosItens]); // Junta os itens do XML com os que já estavam na tela
    };

    reader.readAsText(file);
    // Reseta o input para poder subir o mesmo arquivo de novo se quiser
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Função chamada quando o usuário usa o dropdown para vincular um item do XML a um produto do ERP
  const vincularProdutoXML = (index: number, buscaValor: string) => {
    const match = produtosBD.find(p => `${p.sku || 'S/N'} - ${p.nome}` === buscaValor);
    
    if (match) {
      const novos = [...itens];
      novos[index].produtoId = match.id;
      novos[index].sku = match.sku;
      novos[index].nome = match.nome;
      novos[index].rastreiaSerie = match.rastreia_serie;
      novos[index].precisaMapeamento = false; // Remove o alerta amarelo!
      
      // Regra de segurança: se ao mapear descobrirmos que é rastreável, garante que as séries estão vazias
      if (match.rastreia_serie && novos[index].series.length > novos[index].quantidade) {
          novos[index].series = []; 
      }
      setItens(novos);
    }
  };
  // ==========================================


  const adicionarProdutoPorBusca = () => {
    if (!buscaProduto) return;
    const produtoEncontrado = produtosBD.find(p => `${p.sku || 'S/N'} - ${p.nome}` === buscaProduto);
    if (!produtoEncontrado) return alert("Produto não encontrado no catálogo.");

    const indexExistente = itens.findIndex(i => i.produtoId === produtoEncontrado.id && !i.precisaMapeamento);
    if (indexExistente >= 0) {
      const novosItens = [...itens];
      novosItens[indexExistente].quantidade += 1;
      setItens(novosItens);
    } else {
      setItens([...itens, {
        produtoId: produtoEncontrado.id, sku: produtoEncontrado.sku, nome: produtoEncontrado.nome,
        rastreiaSerie: produtoEncontrado.rastreia_serie, quantidade: 1, custo: produtoEncontrado.custo_base || 0, series: []
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

      if (itemAtual.series.includes(serialInput.trim().toUpperCase())) {
        alert("Este número de série já foi bipado nesta entrada!"); setSerialInput(""); return;
      }
      if (itemAtual.series.length >= itemAtual.quantidade) {
        alert("A quantidade máxima para este item já foi bipada!"); setSerialInput(""); return;
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

    // Validações antes de salvar
    for (let i = 0; i < itens.length; i++) {
      if (itens[i].precisaMapeamento) {
        return alert(`Erro: O item "${itens[i].nomeOriginalXML}" veio do XML mas não foi vinculado a nenhum produto do Catálogo. Mapeie-o antes de salvar.`);
      }
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
          produto_id: item.produtoId, tipo: 'Entrada', quantidade: item.quantidade,
          custo_unitario: item.custo, documento: documento, fornecedor_cliente: fornecedor
        });

        if (item.rastreiaSerie && item.series.length > 0) {
          const payloadSeries = item.series.map(s => ({
            produto_id: item.produtoId, numero_serie: s, status: 'Em Estoque', documento_entrada: documento
          }));
          await supabase.from('log_numeros_serie').insert(payloadSeries);
        }

        const { data: prodData } = await supabase.from('log_produtos').select('estoque_atual').eq('id', item.produtoId).single();
        const novoEstoque = (prodData?.estoque_atual || 0) + item.quantidade;
        
        await supabase.from('log_produtos').update({ estoque_atual: novoEstoque, custo_base: item.custo }).eq('id', item.produtoId);
      }

      alert("Entrada registrada com sucesso! Estoque atualizado.");
      
      setItens([]); setFornecedor(""); setDocumento(""); setIndexBipagem(null);
      setModo("formulario"); setBuscaProduto(""); setSerialInput("");
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error("Erro ao salvar entrada:", error);
      alert("Houve um erro ao salvar a entrada. Verifique o console (F12).");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        
        <datalist id="lista-produtos-bd">
          {produtosBD.map((p) => (
            <option key={p.id} value={`${p.sku || 'S/N'} - ${p.nome}`} />
          ))}
        </datalist>

        {/* Input Oculto de XML */}
        <input 
          type="file" 
          accept=".xml" 
          ref={fileInputRef} 
          style={{ display: "none" }} 
          onChange={processarXML} 
        />

        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <PackageOpen className="w-6 h-6 text-emerald-600" /> 
              {modo === "formulario" ? "Recebimento de Estoque" : "Bipagem de Séries"}
            </h1>
            <p className="text-slate-500">
              {modo === "formulario" ? "Importe um XML de NF-e ou lance manualmente." : "Utilize o leitor de código de barras para registrar os equipamentos."}
            </p>
          </div>
          <div className="flex gap-3">
            {modo === "formulario" ? (
              <Button onClick={acionarUploadXML} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm">
                <FileCode2 className="w-4 h-4" /> Importar XML da NF-e
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setModo("formulario")} className="gap-2">
                 <ArrowLeft className="w-4 h-4"/> Voltar para a Nota
              </Button>
            )}
          </div>
        </div>

        {modo === "formulario" && (
          <div className="space-y-6">
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

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="bg-slate-50 p-4 border-b flex items-center gap-3">
                <div className="flex-1">
                  <Input 
                    list="lista-produtos-bd" 
                    value={buscaProduto} 
                    onChange={e => setBuscaProduto(e.target.value)} 
                    placeholder="Adicionar produto manual: Pesquise por SKU ou Nome..." 
                    className="bg-white border-slate-300"
                    onKeyDown={(e) => { if(e.key === 'Enter') adicionarProdutoPorBusca(); }}
                  />
                </div>
                <Button onClick={adicionarProdutoPorBusca} variant="outline" className="gap-2 bg-white text-slate-700">
                  <Plus className="w-4 h-4" /> Adicionar à Nota
                </Button>
              </div>

              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                      <th className="p-3 font-semibold border-b min-w-[300px]">Produto / Mapeamento</th>
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
                          Importe um arquivo XML ou adicione produtos manualmente para iniciar.
                        </td>
                      </tr>
                    ) : (
                      itens.map((item, index) => (
                        <tr key={index} className={`transition-colors ${item.precisaMapeamento ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}>
                          
                          <td className="p-3">
                            {/* SE ESTIVER MAPEADO (Tudo Certo) */}
                            {!item.precisaMapeamento ? (
                              <>
                                <p className="font-semibold text-slate-800 text-sm leading-tight">{item.nome}</p>
                                <p className="text-xs text-slate-500 mt-1">SKU: {item.sku || "S/N"}</p>
                              </>
                            ) : (
                              /* SE VEIO DO XML E NÃO RECONHECEU (Alerta Amarelo) */
                              <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-bold text-amber-800 uppercase">Item Não Reconhecido</p>
                                    <p className="text-xs text-amber-700">O Fornecedor enviou: <strong>{item.nomeOriginalXML}</strong> (Cód: {item.sku})</p>
                                  </div>
                                </div>
                                <Input 
                                  list="lista-produtos-bd" 
                                  placeholder="Selecione o produto correto no nosso catálogo..." 
                                  className="h-8 text-xs bg-white border-amber-300 focus-visible:ring-amber-500"
                                  onChange={(e) => vincularProdutoXML(index, e.target.value)}
                                />
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            {item.precisaMapeamento ? (
                                <span className="text-xs text-amber-600 font-medium">Aguardando...</span>
                            ) : item.rastreiaSerie ? (
                              <Button 
                                size="sm" 
                                variant={item.series.length === item.quantidade ? "default" : "secondary"}
                                onClick={() => abrirBipagem(index)}
                                className={`h-7 text-xs w-full gap-1 px-2 ${item.series.length === item.quantidade ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                              >
                                {item.series.length === item.quantidade ? <CheckCircle2 className="w-3 h-3"/> : <Barcode className="w-3 h-3" />}
                                {item.series.length}/{item.quantidade} Séries
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded border">Lote Padrão</span>
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

        {modo === "bipagem" && indexBipagem !== null && itens[indexBipagem] && (
          <div className="bg-white rounded-xl border shadow-sm p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            
            <div className="max-w-md mx-auto space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-2">
                  <Barcode className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">{itens[indexBipagem].nome}</h2>
                <p className="text-slate-500">
                  Progresso: <strong className={itens[indexBipagem].series.length === itens[indexBipagem].quantidade ? "text-emerald-600" : "text-blue-600"}>
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
                    className="h-14 text-center text-lg shadow-sm border-blue-300 focus-visible:ring-blue-500 bg-white"
                  />
                </div>
              ) : (
                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  <p className="font-bold text-emerald-800 text-lg">Bipagem Concluída!</p>
                  <Button onClick={() => setModo("formulario")} className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">Voltar para a Nota</Button>
                </div>
              )}

              {itens[indexBipagem].series.length > 0 && (
                <div className="mt-8 text-left">
                  <p className="text-sm font-bold text-slate-400 mb-3 border-b pb-2">SÉRIES REGISTRADAS NESTE LOTE:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {itens[indexBipagem].series.map((serie, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded p-2 flex justify-between items-center group shadow-sm">
                        <span className="font-mono text-sm text-slate-700 font-medium">{serie}</span>
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