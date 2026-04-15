import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackageOpen, Plus, Save, Trash2, Barcode, CheckCircle2, ArrowLeft, FileCode2, AlertTriangle, FileText, Truck, MapPin, Calculator, History, Search, Eye, X, Loader2 } from "lucide-react";
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
  const [abaAtiva, setAbaAtiva] = useState<"receber" | "historico">("receber");
  const [modo, setModo] = useState<"formulario" | "bipagem" | "detalhe_historico">("formulario");
  
  // ==========================================
  // ESTADOS: NOVO RECEBIMENTO
  // ==========================================
  const [fornecedorTexto, setFornecedorTexto] = useState("");
  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [documento, setDocumento] = useState("");
  const [cfop, setCfop] = useState(""); // NOVO CAMPO: CFOP / Natureza
  const [chaveAcesso, setChaveAcesso] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [valorFrete, setValorFrete] = useState(0);
  const [localDestino, setLocalDestino] = useState("");
  
  const [valorIcms, setValorIcms] = useState(0);
  const [valorIcmsSt, setValorIcmsSt] = useState(0);
  const [valorIpi, setValorIpi] = useState(0);
  const [valorPis, setValorPis] = useState(0);
  const [valorCofins, setValorCofins] = useState(0);
  const [valorOutros, setValorOutros] = useState(0);
  
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

  // ==========================================
  // ESTADOS: HISTÓRICO DE ENTRADAS
  // ==========================================
  const [historicoDocs, setHistoricoDocs] = useState<any[]>([]);
  const [buscaHistorico, setBuscaHistorico] = useState("");
  const [docSelecionado, setDocSelecionado] = useState<any>(null);
  const [itensDocSelecionado, setItensDocSelecionado] = useState<any[]>([]);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  useEffect(() => {
    fetchDadosBase();
  }, []);

  useEffect(() => {
    if (abaAtiva === "historico") {
      fetchHistorico();
      setModo("formulario"); // Reseta a tela ao trocar de aba
    }
  }, [abaAtiva]);

  useEffect(() => {
    if (modo === "bipagem" && inputRef.current) inputRef.current.focus();
  }, [modo]);

  const fetchDadosBase = async () => {
    const [prodRes, fornRes, locRes] = await Promise.all([
      supabase.from('log_produtos').select('id, sku, nome, rastreia_serie, custo_base').order('nome'),
      supabase.from('log_fornecedores').select('id, razao_social, nome_fantasia, cnpj_cpf'),
      supabase.from('log_locais').select('id, nome, tipo').order('nome')
    ]);
    
    if (prodRes.data) setProdutosBD(prodRes.data);
    if (fornRes.data) setFornecedoresBD(fornRes.data);
    if (locRes.data) {
        setLocaisBD(locRes.data);
        if(locRes.data.length > 0) setLocalDestino(locRes.data[0].id); 
    }
  };

  // --- FUNÇÕES DE HISTÓRICO ---
  const fetchHistorico = async () => {
    const { data, error } = await supabase
      .from('log_documentos_entrada')
      .select(`*, log_fornecedores(nome_fantasia, razao_social)`)
      .order('sequencial', { ascending: false });
    
    if (data) setHistoricoDocs(data);
    if (error) console.error("Erro ao buscar histórico:", error);
  };

  const abrirDetalhesDocumento = async (doc: any) => {
    setCarregandoDetalhes(true);
    setDocSelecionado(doc);
    setModo("detalhe_historico");

    const { data, error } = await supabase
      .from('log_movimentacoes')
      .select(`
        *, 
        log_produtos(sku, nome),
        log_locais(nome)
      `)
      .eq('documento_id', doc.id);

    if (data) setItensDocSelecionado(data);
    if (error) console.error("Erro ao buscar itens da nota:", error);
    setCarregandoDetalhes(false);
  };

  const formatarData = (dataIso: string) => {
    if (!dataIso) return "-";
    const date = new Date(dataIso);
    return date.toLocaleDateString('pt-BR');
  };

  // --- FUNÇÕES DE RECEBIMENTO ---
  const acionarUploadXML = () => fileInputRef.current?.click();

  const processarXML = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");

      const emitente = xmlDoc.querySelector("emit xNome")?.textContent || "";
      const cnpjEmitente = xmlDoc.querySelector("emit CNPJ")?.textContent || "";
      const nNf = xmlDoc.querySelector("ide nNF")?.textContent || "";
      const natOp = xmlDoc.querySelector("ide natOp")?.textContent || ""; // Natureza da Operação
      const chAcesso = xmlDoc.querySelector("protNFe chNFe")?.textContent || xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || "";
      const dhEmi = xmlDoc.querySelector("ide dhEmi")?.textContent?.split("T")[0] || "";
      const transNome = xmlDoc.querySelector("transporta xNome")?.textContent || "Retirada/Próprio";
      const vFrete = parseFloat(xmlDoc.querySelector("total ICMSTot vFrete")?.textContent || "0");
      
      const vICMS = parseFloat(xmlDoc.querySelector("total ICMSTot vICMS")?.textContent || "0");
      const vST = parseFloat(xmlDoc.querySelector("total ICMSTot vST")?.textContent || "0");
      const vIPI = parseFloat(xmlDoc.querySelector("total ICMSTot vIPI")?.textContent || "0");
      const vPIS = parseFloat(xmlDoc.querySelector("total ICMSTot vPIS")?.textContent || "0");
      const vCOFINS = parseFloat(xmlDoc.querySelector("total ICMSTot vCOFINS")?.textContent || "0");
      const vTotTrib = parseFloat(xmlDoc.querySelector("total ICMSTot vTotTrib")?.textContent || "0");

      setDocumento(nNf);
      setCfop(natOp);
      setFornecedorTexto(emitente);
      setChaveAcesso(chAcesso);
      setDataEmissao(dhEmi);
      setTransportadora(transNome);
      setValorFrete(vFrete);
      setValorIcms(vICMS); setValorIcmsSt(vST); setValorIpi(vIPI); setValorPis(vPIS); setValorCofins(vCOFINS); setValorOutros(vTotTrib);

      const cnpjFormatado = cnpjEmitente.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
      const fornMatch = fornecedoresBD.find(f => f.cnpj_cpf === cnpjFormatado || f.cnpj_cpf === cnpjEmitente);
      setFornecedorId(fornMatch ? fornMatch.id : null);

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
      novos[index].produtoId = match.id; novos[index].sku = match.sku; novos[index].nome = match.nome;
      novos[index].rastreiaSerie = match.rastreia_serie; novos[index].precisaMapeamento = false; 
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
      const novosItens = [...itens]; novosItens[indexExistente].quantidade += 1; setItens(novosItens);
    } else {
      setItens([...itens, { produtoId: produtoEncontrado.id, sku: produtoEncontrado.sku, nome: produtoEncontrado.nome, rastreiaSerie: produtoEncontrado.rastreia_serie, quantidade: 1, custo: produtoEncontrado.custo_base || 0, series: [] }]);
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
  const removerItem = (index: number) => { const n = [...itens]; n.splice(index, 1); setItens(n); };

  const biparSerie = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!serialInput.trim()) return;
      const novosItens = [...itens];
      const itemAtual = novosItens[indexBipagem!];

      if (itemAtual.series.includes(serialInput.trim().toUpperCase())) return alert("Série já bipada!");
      if (itemAtual.series.length >= itemAtual.quantidade) return alert("Quantidade máxima atingida!");

      itemAtual.series.push(serialInput.trim().toUpperCase());
      setItens(novosItens); setSerialInput(""); 
    }
  };

  const removerSerie = (indexSerie: number) => {
    const novosItens = [...itens]; novosItens[indexBipagem!].series.splice(indexSerie, 1); setItens(novosItens);
  };

  const salvarEntrada = async () => {
    if (!fornecedorTexto || !documento) return alert("Fornecedor e Número da NF são obrigatórios.");
    if (!localDestino) return alert("Selecione o Local de Destino.");
    if (itens.length === 0) return alert("Adicione produtos na entrada.");

    for (let i = 0; i < itens.length; i++) {
      if (itens[i].precisaMapeamento) return alert(`Mapeie o item: "${itens[i].nomeOriginalXML}" antes de salvar.`);
      if (itens[i].rastreiaSerie && itens[i].series.length !== itens[i].quantidade) return alert(`Produto "${itens[i].nome}" exige ${itens[i].quantidade} séries.`);
    }

    setSalvando(true);
    const valorTotalProdutos = itens.reduce((acc, item) => acc + (item.quantidade * item.custo), 0);
    const valorTotalNota = valorTotalProdutos + valorFrete + valorIpi + valorIcmsSt;

    try {
      const cabecalho = {
        tipo_documento: 'NF-e', cfop: cfop, chave_acesso: chaveAcesso || null, documento: documento, 
        data_emissao: dataEmissao || null, fornecedor_id: fornecedorId, fornecedor_texto: fornecedorTexto,
        transportadora: transportadora, valor_frete: valorFrete, valor_icms: valorIcms, valor_icms_st: valorIcmsSt,
        valor_ipi: valorIpi, valor_pis: valorPis, valor_cofins: valorCofins, valor_impostos: valorOutros, valor_total: valorTotalNota
      };

      const { data: docData, error: docError } = await supabase.from('log_documentos_entrada').insert([cabecalho]).select('id').single();
      if (docError) throw docError;
      const docId = docData.id;

      for (const item of itens) {
        await supabase.from('log_movimentacoes').insert({
          produto_id: item.produtoId, tipo: 'Entrada', quantidade: item.quantidade,
          custo_unitario: item.custo, documento_id: docId, local_id: localDestino,
          documento: documento, fornecedor_cliente: fornecedorTexto 
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

      alert("Entrada registrada com sucesso!");
      setItens([]); setFornecedorTexto(""); setFornecedorId(null); setDocumento(""); setCfop("");
      setChaveAcesso(""); setDataEmissao(""); setTransportadora(""); setValorFrete(0); 
      setValorIcms(0); setValorIcmsSt(0); setValorIpi(0); setValorPis(0); setValorCofins(0); setValorOutros(0);
      setIndexBipagem(null); setModo("formulario"); setBuscaProduto(""); setSerialInput("");
      
      // Atualiza o histórico silenciosamente
      fetchHistorico();

    } catch (error: any) {
      if (error.code === '23505') alert("Esta Chave de Acesso já foi registrada!");
      else alert("Houve um erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const docsFiltrados = historicoDocs.filter(d => {
    const termo = buscaHistorico.toLowerCase();
    return (d.documento?.toLowerCase() || "").includes(termo) || 
           (d.fornecedor_texto?.toLowerCase() || "").includes(termo) ||
           (d.chave_acesso?.toLowerCase() || "").includes(termo) ||
           (d.sequencial?.toString() || "").includes(termo);
  });

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto mb-12">
        
        <datalist id="lista-produtos-bd">{produtosBD.map((p) => <option key={p.id} value={`${p.sku || 'S/N'} - ${p.nome}`} />)}</datalist>
        <input type="file" accept=".xml" ref={fileInputRef} style={{ display: "none" }} onChange={processarXML} />

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setAbaAtiva("receber")}
            className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${abaAtiva === "receber" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"}`}
          >
            <div className="flex items-center gap-2"><PackageOpen className="w-4 h-4"/> Novo Recebimento</div>
          </button>
          <button 
            onClick={() => setAbaAtiva("historico")}
            className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${abaAtiva === "historico" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"}`}
          >
            <div className="flex items-center gap-2"><History className="w-4 h-4"/> Histórico de Entradas</div>
          </button>
        </div>

        {/* ========================================================= */}
        {/* ABA 1: NOVO RECEBIMENTO */}
        {/* ========================================================= */}
        {abaAtiva === "receber" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">Lançamento de Mercadorias</h1>
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
              <div className="space-y-6">
                {/* CABEÇALHO AVANÇADO DA NF-E */}
                <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600"/> Dados da Nota Fiscal</h3>
                    {fornecedorId && <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded border border-emerald-200">Fornecedor Vinculado ao CRM</span>}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-semibold text-slate-700">Fornecedor / Emitente</label>
                      <Input value={fornecedorTexto} onChange={e => setFornecedorTexto(e.target.value)} placeholder="Nome do Fornecedor..." className={fornecedorId ? "bg-emerald-50 border-emerald-200 font-medium" : "bg-white"} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Nº da NF / Doc</label>
                      <Input value={documento} onChange={e => setDocumento(e.target.value)} placeholder="Ex: 123456" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Data Emissão</label>
                      <Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">CFOP / Operação</label>
                      <Input value={cfop} onChange={e => setCfop(e.target.value)} placeholder="Ex: 5102 / Compra" />
                    </div>
                    <div className="space-y-2 md:col-span-5">
                      <label className="text-sm font-semibold text-slate-700">Chave de Acesso (NF-e)</label>
                      <Input value={chaveAcesso} onChange={e => setChaveAcesso(e.target.value)} placeholder="44 dígitos..." className="font-mono text-xs text-slate-600" />
                    </div>
                  </div>

                  {/* BLOCO DE FRETE E IMPOSTOS DISCRIMINADOS */}
                  <div className="pt-4 mt-2 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2"><Calculator className="w-4 h-4"/> Frete e Impostos Discriminados</h4>
                    <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Valor Frete</label>
                        <Input type="number" step="0.01" value={valorFrete} onChange={e => setValorFrete(parseFloat(e.target.value)||0)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Valor ICMS</label>
                        <Input type="number" step="0.01" value={valorIcms} onChange={e => setValorIcms(parseFloat(e.target.value)||0)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">ICMS ST</label>
                        <Input type="number" step="0.01" value={valorIcmsSt} onChange={e => setValorIcmsSt(parseFloat(e.target.value)||0)} className="h-8 text-sm bg-amber-50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Valor IPI</label>
                        <Input type="number" step="0.01" value={valorIpi} onChange={e => setValorIpi(parseFloat(e.target.value)||0)} className="h-8 text-sm bg-amber-50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Valor PIS</label>
                        <Input type="number" step="0.01" value={valorPis} onChange={e => setValorPis(parseFloat(e.target.value)||0)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">COFINS</label>
                        <Input type="number" step="0.01" value={valorCofins} onChange={e => setValorCofins(parseFloat(e.target.value)||0)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 truncate" title="Valor Aproximado Tributos">Trib. Aprox.</label>
                        <Input type="number" step="0.01" value={valorOutros} onChange={e => setValorOutros(parseFloat(e.target.value)||0)} className="h-8 text-sm bg-slate-100 text-slate-500" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-100">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-1 text-slate-600"><Truck className="w-4 h-4"/> Transportadora / Volumes</label>
                      <Input value={transportadora} onChange={e => setTransportadora(e.target.value)} placeholder="Nome da Transportadora ou Retirada Própria" />
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
                          <th className="p-3 font-semibold border-b min-w-[300px]">Produto / Mapeamento</th>
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
                  <div className="flex justify-between items-center bg-stone-800 p-4 rounded-xl text-white shadow-lg flex-wrap gap-4">
                    <div className="flex gap-6 md:gap-8 flex-wrap">
                      <div><p className="text-stone-400 text-xs uppercase tracking-wider">Itens</p><p className="text-lg font-semibold">R$ {itens.reduce((acc, i) => acc + (i.quantidade * i.custo), 0).toFixed(2).replace('.', ',')}</p></div>
                      <div><p className="text-stone-400 text-xs uppercase tracking-wider">Frete</p><p className="text-lg font-semibold">R$ {valorFrete.toFixed(2).replace('.', ',')}</p></div>
                      <div><p className="text-stone-400 text-xs uppercase tracking-wider">ST + IPI</p><p className="text-lg font-semibold text-amber-400">R$ {(valorIcmsSt + valorIpi).toFixed(2).replace('.', ',')}</p></div>
                      <div className="pl-4 md:pl-6 border-l border-stone-600"><p className="text-stone-300 text-xs uppercase tracking-wider font-bold">Total da Nota</p><p className="text-2xl font-bold text-emerald-400">R$ {(itens.reduce((acc, i) => acc + (i.quantidade * i.custo), 0) + valorFrete + valorIcmsSt + valorIpi).toFixed(2).replace('.', ',')}</p></div>
                    </div>
                    <Button onClick={salvarEntrada} disabled={salvando} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 h-12 px-6 w-full md:w-auto">
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
        )}

        {/* ========================================================= */}
        {/* ABA 2: HISTÓRICO DE LANÇAMENTOS */}
        {/* ========================================================= */}
        {abaAtiva === "historico" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            {/* TELA DE LISTA DO HISTÓRICO */}
            {modo !== "detalhe_historico" && (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b flex flex-wrap items-center gap-4 bg-slate-50 justify-between">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input placeholder="Buscar por NF, Fornecedor ou Chave..." value={buscaHistorico} onChange={e => setBuscaHistorico(e.target.value)} className="pl-9 bg-white" />
                  </div>
                  <div className="text-sm text-slate-500 font-medium">Exibindo {docsFiltrados.length} lançamentos</div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                        <th className="p-3 font-semibold border-b text-center w-20">Seq</th>
                        <th className="p-3 font-semibold border-b">Documento</th>
                        <th className="p-3 font-semibold border-b">Fornecedor</th>
                        <th className="p-3 font-semibold border-b">Emissão / Lanç.</th>
                        <th className="p-3 font-semibold border-b text-right">Valor Total</th>
                        <th className="p-3 font-semibold border-b text-center w-24">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {docsFiltrados.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum documento encontrado.</td></tr>
                      ) : (
                        docsFiltrados.map(doc => (
                          <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-center font-mono text-sm text-slate-500">{doc.sequencial?.toString().padStart(4, '0')}</td>
                            <td className="p-3">
                              <p className="font-bold text-slate-800 text-sm">{doc.tipo_documento} {doc.documento}</p>
                              {doc.cfop && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase">CFOP: {doc.cfop}</span>}
                            </td>
                            <td className="p-3 text-sm text-slate-700">{doc.log_fornecedores?.nome_fantasia || doc.fornecedor_texto}</td>
                            <td className="p-3 text-xs text-slate-500">
                              <p>Emi: {formatarData(doc.data_emissao)}</p>
                              <p>Lanç: {formatarData(doc.data_lancamento)}</p>
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-600">R$ {Number(doc.valor_total).toFixed(2).replace('.',',')}</td>
                            <td className="p-3 text-center">
                              <Button onClick={() => abrirDetalhesDocumento(doc)} variant="outline" size="sm" className="gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"><Eye className="w-3 h-3"/> Abrir</Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TELA DE DETALHE EXPANDIDO DO DOCUMENTO */}
            {modo === "detalhe_historico" && docSelecionado && (
              <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6 animate-in slide-in-from-right-4 duration-200">
                
                {/* Cabeçalho do Detalhe */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded text-sm border font-bold">SEQ: {docSelecionado.sequencial?.toString().padStart(4, '0')}</span>
                      <h2 className="text-xl font-bold text-slate-800">{docSelecionado.tipo_documento} Nº {docSelecionado.documento}</h2>
                    </div>
                    <p className="text-sm text-slate-600 font-medium">{docSelecionado.log_fornecedores?.razao_social || docSelecionado.fornecedor_texto}</p>
                    <p className="text-xs text-slate-400 font-mono mt-1">CHAVE: {docSelecionado.chave_acesso || "Não informada"}</p>
                  </div>
                  <Button variant="ghost" onClick={() => setModo("formulario")} className="text-slate-400 hover:text-slate-800 hover:bg-slate-100"><X className="w-5 h-5"/></Button>
                </div>

                {/* Bloco de Impostos do Documento */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-center">
                  <div className="border-r border-slate-200 last:border-0"><p className="text-[10px] text-slate-400 font-bold uppercase">CFOP / Operação</p><p className="text-sm font-semibold text-slate-700">{docSelecionado.cfop || "-"}</p></div>
                  <div className="border-r border-slate-200 last:border-0"><p className="text-[10px] text-slate-400 font-bold uppercase">ICMS</p><p className="text-sm font-semibold text-slate-700">R$ {Number(docSelecionado.valor_icms).toFixed(2)}</p></div>
                  <div className="border-r border-slate-200 last:border-0"><p className="text-[10px] text-amber-500 font-bold uppercase">ICMS ST</p><p className="text-sm font-semibold text-amber-700">R$ {Number(docSelecionado.valor_icms_st).toFixed(2)}</p></div>
                  <div className="border-r border-slate-200 last:border-0"><p className="text-[10px] text-amber-500 font-bold uppercase">IPI</p><p className="text-sm font-semibold text-amber-700">R$ {Number(docSelecionado.valor_ipi).toFixed(2)}</p></div>
                  <div className="border-r border-slate-200 last:border-0"><p className="text-[10px] text-slate-400 font-bold uppercase">PIS</p><p className="text-sm font-semibold text-slate-700">R$ {Number(docSelecionado.valor_pis).toFixed(2)}</p></div>
                  <div className="border-r border-slate-200 last:border-0"><p className="text-[10px] text-slate-400 font-bold uppercase">COFINS</p><p className="text-sm font-semibold text-slate-700">R$ {Number(docSelecionado.valor_cofins).toFixed(2)}</p></div>
                  <div className="border-r border-slate-200 last:border-0"><p className="text-[10px] text-blue-500 font-bold uppercase">FRETE</p><p className="text-sm font-semibold text-blue-700">R$ {Number(docSelecionado.valor_frete).toFixed(2)}</p></div>
                  <div><p className="text-[10px] text-emerald-600 font-bold uppercase">TOTAL NOTA</p><p className="text-base font-bold text-emerald-600">R$ {Number(docSelecionado.valor_total).toFixed(2)}</p></div>
                </div>

                {/* Tabela de Produtos do Documento */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-3 border-b pb-2">Mercadorias Recebidas neste Documento</h3>
                  {carregandoDetalhes ? (
                    <div className="p-8 text-center text-slate-400 flex justify-center"><Loader2 className="w-6 h-6 animate-spin"/></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                            <th className="p-3 font-semibold border-b">Produto</th>
                            <th className="p-3 font-semibold border-b text-center">Qtd</th>
                            <th className="p-3 font-semibold border-b text-right">Preço Un.</th>
                            <th className="p-3 font-semibold border-b text-right" title="Rateio = (Frete + IPI + ICMS ST) / Qtd Total da Nota">Taxas Rateio</th>
                            <th className="p-3 font-semibold border-b text-right text-indigo-700">Preço Agregado</th>
                            <th className="p-3 font-semibold border-b">Local de Destino</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {itensDocSelecionado.map(item => {
                            // CÁLCULO DINÂMICO DO PREÇO AGREGADO
                            const qtdTotalNota = itensDocSelecionado.reduce((acc, i) => acc + i.quantidade, 0);
                            const taxaUnitario = qtdTotalNota > 0 ? (Number(docSelecionado.valor_frete) + Number(docSelecionado.valor_icms_st) + Number(docSelecionado.valor_ipi)) / qtdTotalNota : 0;
                            const precoAgregado = Number(item.custo_unitario) + taxaUnitario;

                            return (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3">
                                  <p className="font-semibold text-slate-800">{item.log_produtos?.nome}</p>
                                  <p className="text-xs text-slate-500 font-mono">SKU: {item.log_produtos?.sku}</p>
                                </td>
                                <td className="p-3 text-center font-medium">{item.quantidade}</td>
                                <td className="p-3 text-right text-slate-600">R$ {Number(item.custo_unitario).toFixed(2).replace('.', ',')}</td>
                                <td className="p-3 text-right text-amber-600">+ R$ {taxaUnitario.toFixed(2).replace('.', ',')}</td>
                                <td className="p-3 text-right font-bold text-indigo-700 bg-indigo-50/30">R$ {precoAgregado.toFixed(2).replace('.', ',')}</td>
                                <td className="p-3 text-slate-600 text-xs font-semibold">{item.log_locais?.nome || "Padrão"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </AppLayout>
  );
}