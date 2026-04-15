import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackageOpen, Plus, Save, Trash2, Barcode, CheckCircle2, ArrowLeft, FileCode2, AlertTriangle, FileText, Truck, MapPin, Loader2,  } from "lucide-react";
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
  
  // Dados do Cabeçalho Robusto da NF-e
  const [fornecedorTexto, setFornecedorTexto] = useState("");
  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [documento, setDocumento] = useState("");
  const [chaveAcesso, setChaveAcesso] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [valorFrete, setValorFrete] = useState(0);
  const [valorImpostos, setValorImpostos] = useState(0);
  const [localDestino, setLocalDestino] = useState("");
  
  // Listas Auxiliares
  const [produtosBD, setProdutosBD] = useState<any[]>([]);
  const [fornecedoresBD, setFornecedoresBD] = useState<any[]>([]);
  const [locaisBD, setLocaisBD] = useState<any[]>([]);
  const [buscaProduto, setBuscaProduto] = useState("");

  const [itens, setItens] = useState<ItemEntrada[]>([]);
  
  const [indexBipagem, setIndexBipagem] = useState<number | null>(null);
  const [serialInput, setSerialInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetchDadosBase();
  }, []);

  useEffect(() => {
    if (modo === "bipagem" && inputRef.current) inputRef.current.focus();
  }, [modo]);

  const fetchDadosBase = async () => {
    const [prodRes, fornRes, locRes] = await Promise.all([
      supabase.from('log_produtos').select('id, sku, nome, rastreia_serie, custo_base').order('nome'),
      supabase.from('log_fornecedores').select('id, razao_social, nome_fantasia, cnpj_cpf'),
      supabase.from('log_locais').select('id, nome, tipo').eq('status', 'Ativo').order('nome')
    ]);
    
    if (prodRes.data) setProdutosBD(prodRes.data);
    if (fornRes.data) setFornecedoresBD(fornRes.data);
    if (locRes.data) {
        setLocaisBD(locRes.data);
        if(locRes.data.length > 0) setLocalDestino(locRes.data[0].id); // Seleciona o primeiro por padrão
    }
  };

  const acionarUploadXML = () => fileInputRef.current?.click();

  const processarXML = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");

      // 1. Extração do Cabeçalho (Inteligência do XML)
      const emitente = xmlDoc.querySelector("emit xNome")?.textContent || "";
      const cnpjEmitente = xmlDoc.querySelector("emit CNPJ")?.textContent || "";
      const nNf = xmlDoc.querySelector("ide nNF")?.textContent || "";
      const chAcesso = xmlDoc.querySelector("protNFe chNFe")?.textContent || xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || "";
      const dhEmi = xmlDoc.querySelector("ide dhEmi")?.textContent?.split("T")[0] || ""; // Pega só a data AAAA-MM-DD
      
      const vFrete = parseFloat(xmlDoc.querySelector("total ICMSTot vFrete")?.textContent || "0");
      const vTotTrib = parseFloat(xmlDoc.querySelector("total ICMSTot vTotTrib")?.textContent || "0"); // Aproximado
      const transNome = xmlDoc.querySelector("transporta xNome")?.textContent || "Retirada/Próprio";

      // Preenche os campos visuais
      setDocumento(nNf);
      setFornecedorTexto(emitente);
      setChaveAcesso(chAcesso);
      setDataEmissao(dhEmi);
      setValorFrete(vFrete);
      setValorImpostos(vTotTrib);
      setTransportadora(transNome);

      // Tenta achar o Fornecedor no Banco pelo CNPJ
      const cnpjFormatado = cnpjEmitente.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
      const fornMatch = fornecedoresBD.find(f => f.cnpj_cpf === cnpjFormatado || f.cnpj_cpf === cnpjEmitente);
      if (fornMatch) {
          setFornecedorId(fornMatch.id);
      } else {
          setFornecedorId(null);
      }

      // 2. Extração dos Itens
      const detNodes = xmlDoc.querySelectorAll("det");
      const novosItens: ItemEntrada[] = [];

      detNodes.forEach(det => {
        const cProd = det.querySelector("prod cProd")?.textContent || ""; 
        const xProd = det.querySelector("prod xProd")?.textContent || ""; 
        const qCom = parseFloat(det.querySelector("prod qCom")?.textContent || "0"); 
        const vUnCom = parseFloat(det.querySelector("prod vUnCom")?.textContent || "0"); 

        const match = produtosBD.find(p => p.sku === cProd);
        if (match) {
          novosItens.push({ produtoId: match.id, sku: match.sku, nome: match.nome, rastreiaSerie: match.rastreia_serie, quantidade: qCom, custo: vUnCom, series: [] });
        } else {
          novosItens.push({ produtoId: "", sku: cProd, nome: "", rastreiaSerie: false, quantidade: qCom, custo: vUnCom, series: [], precisaMapeamento: true, nomeOriginalXML: xProd });
        }
      });

      setItens(prev => [...prev, ...novosItens]);
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const vincularProdutoXML = (index: number, buscaValor: string) => {
    const match = produtosBD.find(p => `${p.sku || 'S/N'} - ${p.nome}` === buscaValor);
    if (match) {
      const novos = [...itens];
      novos[index].produtoId = match.id;
      novos[index].sku = match.sku;
      novos[index].nome = match.nome;
      novos[index].rastreiaSerie = match.rastreia_serie;
      novos[index].precisaMapeamento = false; 
      if (match.rastreia_serie && novos[index].series.length > novos[index].quantidade) novos[index].series = []; 
      setItens(novos);
    }
  };

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

  const atualizarItem = (index: number, campo: keyof ItemEntrada, valor: any) => {
    const novosItens = [...itens];
    novosItens[index] = { ...novosItens[index], [campo]: valor };
    if (campo === 'quantidade' && novosItens[index].rastreiaSerie) {
        if (novosItens[index].series.length > valor) novosItens[index].series = novosItens[index].series.slice(0, valor);
    }
    setItens(novosItens);
  };

  const abrirBipagem = (index: number) => { setIndexBipagem(index); setModo("bipagem"); };

  const biparSerie = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!serialInput.trim()) return;
      const novosItens = [...itens];
      const itemAtual = novosItens[indexBipagem!];

      if (itemAtual.series.includes(serialInput.trim().toUpperCase())) return alert("Número de série já bipado!");
      if (itemAtual.series.length >= itemAtual.quantidade) return alert("Quantidade máxima bipada!");

      itemAtual.series.push(serialInput.trim().toUpperCase());
      setItens(novosItens);
      setSerialInput(""); 
    }
  };

  const salvarEntrada = async () => {
    if (!fornecedorTexto || !documento) return alert("Fornecedor e Número da NF são obrigatórios.");
    if (!localDestino) return alert("Selecione o Local de Destino (Armazém) para a mercadoria.");
    if (itens.length === 0) return alert("Adicione produtos na entrada.");

    for (let i = 0; i < itens.length; i++) {
      if (itens[i].precisaMapeamento) return alert(`Mapeie o item: "${itens[i].nomeOriginalXML}" antes de salvar.`);
      if (itens[i].rastreiaSerie && itens[i].series.length !== itens[i].quantidade) return alert(`O produto "${itens[i].nome}" exige ${itens[i].quantidade} séries.`);
      if (itens[i].quantidade <= 0) return alert(`A quantidade de "${itens[i].nome}" deve ser maior que zero.`);
    }

    setSalvando(true);
    const valorTotalProdutos = itens.reduce((acc, item) => acc + (item.quantidade * item.custo), 0);

    try {
      // 1. Grava o Cabeçalho da Nota
      const cabecalho = {
        tipo_documento: 'NF-e',
        chave_acesso: chaveAcesso || null,
        documento: documento, // Reutilizando a coluna documento que já existe ou usando chave. Adaptaremos para a tabela nova.
        data_emissao: dataEmissao || null,
        fornecedor_id: fornecedorId,
        fornecedor_texto: fornecedorTexto,
        transportadora: transportadora,
        valor_frete: valorFrete,
        valor_impostos: valorImpostos,
        valor_total: valorTotalProdutos + valorFrete
      };

      const { data: docData, error: docError } = await supabase.from('log_documentos_entrada').insert([cabecalho]).select('id').single();
      if (docError) throw docError;
      const docId = docData.id;

      // 2. Grava Movimentações, Séries e Atualiza Saldo Global
      for (const item of itens) {
        await supabase.from('log_movimentacoes').insert({
          produto_id: item.produtoId, tipo: 'Entrada', quantidade: item.quantidade,
          custo_unitario: item.custo, documento_id: docId, local_id: localDestino,
          documento: documento, fornecedor_cliente: fornecedorTexto // retro-compatibilidade
        });

        if (item.rastreiaSerie && item.series.length > 0) {
          const payloadSeries = item.series.map(s => ({
            produto_id: item.produtoId, numero_serie: s, status: 'Em Estoque', 
            documento_entrada: documento, local_id: localDestino
          }));
          await supabase.from('log_numeros_serie').insert(payloadSeries);
        }

        const { data: prodData } = await supabase.from('log_produtos').select('estoque_atual').eq('id', item.produtoId).single();
        const novoEstoque = (prodData?.estoque_atual || 0) + item.quantidade;
        await supabase.from('log_produtos').update({ estoque_atual: novoEstoque, custo_base: item.custo }).eq('id', item.produtoId);
      }

      alert("Entrada de mercadoria registrada com sucesso!");
      
      // Reset Total
      setItens([]); setFornecedorTexto(""); setFornecedorId(null); setDocumento(""); 
      setChaveAcesso(""); setDataEmissao(""); setTransportadora(""); setValorFrete(0); setValorImpostos(0);
      setIndexBipagem(null); setModo("formulario"); setBuscaProduto(""); setSerialInput("");
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error: any) {
      console.error(error);
      if (error.code === '23505') alert("Esta Chave de Acesso já foi registrada anteriormente no sistema!");
      else alert("Houve um erro ao salvar. Verifique sua conexão.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        
        <datalist id="lista-produtos-bd">{produtosBD.map((p) => <option key={p.id} value={`${p.sku || 'S/N'} - ${p.nome}`} />)}</datalist>
        <input type="file" accept=".xml" ref={fileInputRef} style={{ display: "none" }} onChange={processarXML} />

        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><PackageOpen className="w-6 h-6 text-emerald-600" /> Recebimento de Mercadorias</h1>
            <p className="text-slate-500">Importe XML ou lance manualmente para alimentar o Almoxarifado.</p>
          </div>
          {modo === "formulario" ? (
            <Button onClick={acionarUploadXML} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm">
              <FileCode2 className="w-4 h-4" /> Importar XML
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setModo("formulario")} className="gap-2"><ArrowLeft className="w-4 h-4"/> Voltar à Nota</Button>
          )}
        </div>

        {modo === "formulario" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            {/* CABEÇALHO AVANÇADO DA NF-E */}
            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600"/> Dados da Nota Fiscal</h3>
                {fornecedorId && <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded border border-emerald-200">Fornecedor Vinculado ao CRM</span>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Fornecedor / Emitente</label>
                  <Input value={fornecedorTexto} onChange={e => setFornecedorTexto(e.target.value)} placeholder="Nome do Fornecedor..." className={fornecedorId ? "bg-emerald-50 border-emerald-200" : "bg-white"} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nº da NF / Documento</label>
                  <Input value={documento} onChange={e => setDocumento(e.target.value)} placeholder="Ex: 123456" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Data de Emissão</label>
                  <Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-4">
                  <label className="text-sm font-semibold text-slate-700">Chave de Acesso (NF-e)</label>
                  <Input value={chaveAcesso} onChange={e => setChaveAcesso(e.target.value)} placeholder="44 dígitos..." className="font-mono text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1 text-slate-600"><Truck className="w-4 h-4"/> Transportadora</label>
                  <Input value={transportadora} onChange={e => setTransportadora(e.target.value)} placeholder="Nome da Transportadora" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Valor do Frete (R$)</label>
                  <Input type="number" value={valorFrete} onChange={e => setValorFrete(parseFloat(e.target.value)||0)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Impostos Nfe (R$)</label>
                  <Input type="number" value={valorImpostos} onChange={e => setValorImpostos(parseFloat(e.target.value)||0)} />
                </div>
              </div>
            </div>

            {/* SELEÇÃO DO DESTINO E ITENS */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="bg-slate-50 p-4 border-b flex flex-wrap items-center gap-4 justify-between">
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><MapPin className="w-3 h-3"/> Guardar no Local:</label>
                  <Select value={localDestino} onValueChange={setLocalDestino}>
                    <SelectTrigger className="w-[250px] bg-white border-indigo-200"><SelectValue placeholder="Selecione o Almoxarifado..." /></SelectTrigger>
                    <SelectContent>
                      {locaisBD.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.nome} ({loc.tipo})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 flex-1 max-w-lg">
                  <Input list="lista-produtos-bd" value={buscaProduto} onChange={e => setBuscaProduto(e.target.value)} placeholder="Inserção Manual: Buscar SKU ou Nome..." onKeyDown={(e) => { if(e.key === 'Enter') adicionarProdutoPorBusca(); }} />
                  <Button onClick={adicionarProdutoPorBusca} variant="outline" className="shrink-0"><Plus className="w-4 h-4" /> Adicionar</Button>
                </div>
              </div>

              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                      <th className="p-3 font-semibold border-b min-w-[300px]">Produto</th>
                      <th className="p-3 font-semibold border-b w-32 text-center">Séries</th>
                      <th className="p-3 font-semibold border-b w-32">Custo Un. (R$)</th>
                      <th className="p-3 font-semibold border-b w-28">Qtd</th>
                      <th className="p-3 font-semibold border-b w-32 text-right">Total</th>
                      <th className="p-3 font-semibold border-b w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itens.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-400">Importe um arquivo XML para iniciar.</td></tr>
                    ) : (
                      itens.map((item, index) => (
                        <tr key={index} className={item.precisaMapeamento ? 'bg-amber-50/50' : 'hover:bg-slate-50'}>
                          <td className="p-3">
                            {!item.precisaMapeamento ? (
                              <><p className="font-semibold text-slate-800 text-sm">{item.nome}</p><p className="text-xs text-slate-500">SKU: {item.sku}</p></>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs text-amber-700 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> XML: {item.nomeOriginalXML}</p>
                                <Input list="lista-produtos-bd" placeholder="Vincule ao Catálogo do ERP..." className="h-8 text-xs border-amber-300" onChange={(e) => vincularProdutoXML(index, e.target.value)} />
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {item.precisaMapeamento ? <span className="text-xs text-amber-600">Pendente</span> : item.rastreiaSerie ? (
                              <Button size="sm" variant={item.series.length === item.quantidade ? "default" : "secondary"} onClick={() => abrirBipagem(index)} className={`h-7 text-xs w-full px-2 ${item.series.length === item.quantidade ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                                {item.series.length === item.quantidade ? <CheckCircle2 className="w-3 h-3"/> : <Barcode className="w-3 h-3" />} {item.series.length}/{item.quantidade}
                              </Button>
                            ) : <span className="text-xs text-slate-400">Lote Padrão</span>}
                          </td>
                          <td className="p-3"><Input type="number" step="0.01" min="0" value={item.custo} onChange={e => atualizarItem(index, 'custo', parseFloat(e.target.value)||0)} className="h-8 text-sm" /></td>
                          <td className="p-3"><Input type="number" min="1" value={item.quantidade} onChange={e => atualizarItem(index, 'quantidade', parseInt(e.target.value)||1)} className="h-8 text-sm" /></td>
                          <td className="p-3 text-right font-medium text-slate-700">R$ {(item.quantidade * item.custo).toFixed(2).replace('.', ',')}</td>
                          <td className="p-3 text-center"><Button variant="ghost" size="icon" onClick={() => removerItem(index)} className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TOTALIZADORES E SALVAR */}
            {itens.length > 0 && (
              <div className="flex justify-between items-center bg-stone-800 p-4 rounded-xl text-white shadow-lg">
                <div className="flex gap-8">
                  <div><p className="text-stone-400 text-xs uppercase tracking-wider">Itens</p><p className="text-lg font-semibold">R$ {itens.reduce((acc, i) => acc + (i.quantidade * i.custo), 0).toFixed(2).replace('.', ',')}</p></div>
                  <div><p className="text-stone-400 text-xs uppercase tracking-wider">Frete</p><p className="text-lg font-semibold">R$ {valorFrete.toFixed(2).replace('.', ',')}</p></div>
                  <div className="pl-6 border-l border-stone-600"><p className="text-stone-300 text-xs uppercase tracking-wider font-bold">Total da Nota</p><p className="text-2xl font-bold text-emerald-400">R$ {(itens.reduce((acc, i) => acc + (i.quantidade * i.custo), 0) + valorFrete).toFixed(2).replace('.', ',')}</p></div>
                </div>
                <Button onClick={salvarEntrada} disabled={salvando} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 h-12 px-6">
                  {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Finalizar Recebimento
                </Button>
              </div>
            )}
          </div>
        )}

        {modo === "bipagem" && indexBipagem !== null && itens[indexBipagem] && (
            <div className="bg-white rounded-xl border shadow-sm p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="max-w-md mx-auto space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-2"><Barcode className="w-8 h-8 text-blue-600" /></div>
                <h2 className="text-xl font-bold text-slate-800">{itens[indexBipagem].nome}</h2>
                <p className="text-slate-500">Progresso: <strong className={itens[indexBipagem].series.length === itens[indexBipagem].quantidade ? "text-emerald-600" : "text-blue-600"}>{itens[indexBipagem].series.length} de {itens[indexBipagem].quantidade}</strong></p>
              </div>

              {itens[indexBipagem].series.length < itens[indexBipagem].quantidade ? (
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-inner">
                  <label className="block text-sm font-semibold text-blue-900 mb-2 uppercase tracking-wider">Aguardando Leitor Óptico</label>
                  <Input ref={inputRef} value={serialInput} onChange={e => setSerialInput(e.target.value)} onKeyDown={biparSerie} placeholder="Bipe ou digite o Nº de Série..." className="h-14 text-center text-lg shadow-sm border-blue-300" />
                </div>
              ) : (
                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  <p className="font-bold text-emerald-800 text-lg">Bipagem Concluída!</p>
                  <Button onClick={() => setModo("formulario")} className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white">Voltar para a Nota</Button>
                </div>
              )}

              {itens[indexBipagem].series.length > 0 && (
                <div className="mt-8 text-left">
                  <p className="text-sm font-bold text-slate-400 mb-3 border-b pb-2">SÉRIES REGISTRADAS:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {itens[indexBipagem].series.map((serie, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded p-2 flex justify-between items-center group shadow-sm">
                        <span className="font-mono text-sm text-slate-700 font-medium">{serie}</span>
                        <button onClick={() => removerSerie(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
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