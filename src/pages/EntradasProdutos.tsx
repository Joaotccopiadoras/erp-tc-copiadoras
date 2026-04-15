import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackageOpen, Plus, Save, Trash2, Barcode, CheckCircle2, ArrowLeft, FileCode2, AlertTriangle, FileText, Truck, MapPin, Calculator, History, Search, Eye, X, Loader2, Receipt } from "lucide-react";
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
  const [fornecedorBusca, setFornecedorBusca] = useState(""); 
  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [mostrarDropdownFornecedor, setMostrarDropdownFornecedor] = useState(false);
  
  const [documento, setDocumento] = useState("");
  const [cfop, setCfop] = useState(""); 
  const [chaveAcesso, setChaveAcesso] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [localDestino, setLocalDestino] = useState("");
  
  // --- NOVOS ESTADOS: FRETE E CT-E ---
  const [modalidadeFrete, setModalidadeFrete] = useState("0 - CIF");
  const [transportadoraBusca, setTransportadoraBusca] = useState("");
  const [transportadoraId, setTransportadoraId] = useState<string | null>(null);
  const [mostrarDropdownTransp, setMostrarDropdownTransp] = useState(false);
  const [cteNumero, setCteNumero] = useState("");
  const [cteChave, setCteChave] = useState("");
  const [valorFrete, setValorFrete] = useState(0);
  
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

  // ==========================================
  // AUTO-SAVE
  // ==========================================
  useEffect(() => {
    const rascunhoSalvo = sessionStorage.getItem("entradas_rascunho");
    if (rascunhoSalvo) {
      try {
        const draft = JSON.parse(rascunhoSalvo);
        if (draft) {
          setFornecedorBusca(draft.fornecedorBusca || ""); setFornecedorId(draft.fornecedorId || null);
          setDocumento(draft.documento || ""); setCfop(draft.cfop || ""); setChaveAcesso(draft.chaveAcesso || "");
          setDataEmissao(draft.dataEmissao || ""); setLocalDestino(draft.localDestino || "");
          setModalidadeFrete(draft.modalidadeFrete || "0 - CIF"); setTransportadoraBusca(draft.transportadoraBusca || "");
          setTransportadoraId(draft.transportadoraId || null); setCteNumero(draft.cteNumero || "");
          setCteChave(draft.cteChave || ""); setValorFrete(draft.valorFrete || 0);
          setValorIcms(draft.valorIcms || 0); setValorIcmsSt(draft.valorIcmsSt || 0); setValorIpi(draft.valorIpi || 0);
          setValorPis(draft.valorPis || 0); setValorCofins(draft.valorCofins || 0); setValorOutros(draft.valorOutros || 0);
          setItens(draft.itens || []);
          if (draft.modo) setModo(draft.modo);
          if (draft.indexBipagem !== undefined) setIndexBipagem(draft.indexBipagem);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (abaAtiva === "receber" && modo !== "detalhe_historico") {
      const draft = {
        fornecedorBusca, fornecedorId, documento, cfop, chaveAcesso, dataEmissao, localDestino,
        modalidadeFrete, transportadoraBusca, transportadoraId, cteNumero, cteChave, valorFrete,
        valorIcms, valorIcmsSt, valorIpi, valorPis, valorCofins, valorOutros, itens, modo, indexBipagem
      };
      sessionStorage.setItem("entradas_rascunho", JSON.stringify(draft));
    }
  }, [
    fornecedorBusca, fornecedorId, documento, cfop, chaveAcesso, dataEmissao, localDestino,
    modalidadeFrete, transportadoraBusca, transportadoraId, cteNumero, cteChave, valorFrete,
    valorIcms, valorIcmsSt, valorIpi, valorPis, valorCofins, valorOutros, itens, modo, indexBipagem, abaAtiva
  ]);


  useEffect(() => { fetchDadosBase(); }, []);

  useEffect(() => {
    if (abaAtiva === "historico") { fetchHistorico(); setModo("formulario"); } 
    else { fetchDadosBase(); }
  }, [abaAtiva]);

  useEffect(() => { if (modo === "bipagem" && inputRef.current) inputRef.current.focus(); }, [modo]);

  const fetchDadosBase = async () => {
    const [prodRes, fornRes, locRes] = await Promise.all([
      supabase.from('log_produtos').select('id, sku, nome, rastreia_serie, custo_base').order('nome'),
      supabase.from('log_fornecedores').select('id, razao_social, nome_fantasia, cnpj_cpf, codigo_sequencial, is_transportadora'), 
      supabase.from('log_locais').select('id, nome').order('nome')
    ]);
    if (prodRes.data) setProdutosBD(prodRes.data);
    if (fornRes.data) setFornecedoresBD(fornRes.data);
    if (locRes.data) {
        setLocaisBD(locRes.data);
        setLocalDestino(prev => prev ? prev : (locRes.data[0]?.id || ""));
    }
  };

  // --- LÓGICA DE AUTOCOMPLETE: FORNECEDORES E TRANSPORTADORAS ---
  const fornecedoresFiltrados = fornecedoresBD.filter(f => {
    const termo = fornecedorBusca.toLowerCase();
    return (f.razao_social?.toLowerCase() || "").includes(termo) || (f.nome_fantasia?.toLowerCase() || "").includes(termo) || (f.cnpj_cpf?.toLowerCase() || "").includes(termo) || (f.codigo_sequencial?.toString() || "").includes(termo);
  });

  const transportadorasFiltradas = fornecedoresBD.filter(f => {
    const termo = transportadoraBusca.toLowerCase();
    return (f.is_transportadora === true || f.is_transportadora === null) && // Aceita null para caso o BD tenha registros antigos
           ((f.razao_social?.toLowerCase() || "").includes(termo) || (f.nome_fantasia?.toLowerCase() || "").includes(termo) || (f.cnpj_cpf?.toLowerCase() || "").includes(termo) || (f.codigo_sequencial?.toString() || "").includes(termo));
  });

  const selecionarFornecedor = (f: any) => {
    setFornecedorId(f.id); setFornecedorBusca(`[${f.codigo_sequencial}] ${f.nome_fantasia || f.razao_social}`); setMostrarDropdownFornecedor(false);
  };

  const selecionarTransportadora = (f: any) => {
    setTransportadoraId(f.id); setTransportadoraBusca(`[${f.codigo_sequencial}] ${f.nome_fantasia || f.razao_social}`); setMostrarDropdownTransp(false);
  };

  // --- FUNÇÕES DE HISTÓRICO ---
  const fetchHistorico = async () => {
    const { data, error } = await supabase
      .from('log_documentos_entrada')
      .select(`*, log_fornecedores!fornecedor_id(nome_fantasia, razao_social)`)
      .order('sequencial', { ascending: false });
    
    if (data) setHistoricoDocs(data);
    if (error) console.error("Erro ao buscar histórico:", error);
  };

  const abrirDetalhesDocumento = async (doc: any) => {
    setCarregandoDetalhes(true); setDocSelecionado(doc); setModo("detalhe_historico");
    const { data, error } = await supabase.from('log_movimentacoes').select(`*, log_produtos(sku, nome), log_locais(nome)`).eq('documento_id', doc.id);
    if (data) setItensDocSelecionado(data);
    setCarregandoDetalhes(false);
  };

  const formatarData = (dataIso: string) => {
    if (!dataIso) return "-"; return new Date(dataIso).toLocaleDateString('pt-BR');
  };

  // --- XML ---
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
      const natOp = xmlDoc.querySelector("ide natOp")?.textContent || ""; 
      const modFreteTag = xmlDoc.querySelector("transp modFrete")?.textContent || "0"; 
      const chAcesso = xmlDoc.querySelector("protNFe chNFe")?.textContent || xmlDoc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || "";
      const dhEmi = xmlDoc.querySelector("ide dhEmi")?.textContent?.split("T")[0] || "";
      const transNome = xmlDoc.querySelector("transporta xNome")?.textContent || "";
      const transCnpj = xmlDoc.querySelector("transporta CNPJ")?.textContent || "";
      const vFrete = parseFloat(xmlDoc.querySelector("total ICMSTot vFrete")?.textContent || "0");
      
      const vICMS = parseFloat(xmlDoc.querySelector("total ICMSTot vICMS")?.textContent || "0");
      const vST = parseFloat(xmlDoc.querySelector("total ICMSTot vST")?.textContent || "0");
      const vIPI = parseFloat(xmlDoc.querySelector("total ICMSTot vIPI")?.textContent || "0");
      const vPIS = parseFloat(xmlDoc.querySelector("total ICMSTot vPIS")?.textContent || "0");
      const vCOFINS = parseFloat(xmlDoc.querySelector("total ICMSTot vCOFINS")?.textContent || "0");
      const vTotTrib = parseFloat(xmlDoc.querySelector("total ICMSTot vTotTrib")?.textContent || "0");

      setDocumento(nNf); setCfop(natOp); setChaveAcesso(chAcesso); setDataEmissao(dhEmi);
      setValorFrete(vFrete); setValorIcms(vICMS); setValorIcmsSt(vST); setValorIpi(vIPI); setValorPis(vPIS); setValorCofins(vCOFINS); setValorOutros(vTotTrib);

      // Tratamento da Modalidade de Frete
      if (modFreteTag === "0") setModalidadeFrete("0 - CIF");
      else if (modFreteTag === "1") setModalidadeFrete("1 - FOB");
      else if (modFreteTag === "2") setModalidadeFrete("2 - Terceiros");
      else setModalidadeFrete("9 - Sem Frete");

      // Auto-Vínculo de Fornecedor
      const cnpjFormatado = cnpjEmitente.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
      const fornMatch = fornecedoresBD.find(f => f.cnpj_cpf === cnpjFormatado || f.cnpj_cpf === cnpjEmitente);
      if (fornMatch) { setFornecedorId(fornMatch.id); setFornecedorBusca(`[${fornMatch.codigo_sequencial}] ${fornMatch.nome_fantasia || fornMatch.razao_social}`); } 
      else { setFornecedorId(null); setFornecedorBusca(emitente); }

      // Auto-Vínculo Transportadora (Se houver)
      if (transNome || transCnpj) {
          const transFormatado = transCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
          const transpMatch = fornecedoresBD.find(f => f.cnpj_cpf === transFormatado || f.cnpj_cpf === transCnpj || f.razao_social === transNome);
          if (transpMatch) { setTransportadoraId(transpMatch.id); setTransportadoraBusca(`[${transpMatch.codigo_sequencial}] ${transpMatch.nome_fantasia || transpMatch.razao_social}`); }
          else { setTransportadoraId(null); setTransportadoraBusca(transNome); }
      }

      const detNodes = xmlDoc.querySelectorAll("det");
      const novosItens: ItemEntrada[] = [];

      detNodes.forEach(det => {
        const cProd = det.querySelector("prod cProd")?.textContent || ""; 
        const xProd = det.querySelector("prod xProd")?.textContent || ""; 
        const qCom = parseFloat(det.querySelector("prod qCom")?.textContent || "0"); 
        const vUnCom = parseFloat(det.querySelector("prod vUnCom")?.textContent || "0"); 

        const match = produtosBD.find(p => p.sku === cProd);
        if (match) novosItens.push({ produtoId: match.id, sku: match.sku, nome: match.nome, rastreiaSerie: match.rastreia_serie, quantidade: qCom, custo: vUnCom, series: [] });
        else novosItens.push({ produtoId: "", sku: cProd, nome: "", rastreiaSerie: false, quantidade: qCom, custo: vUnCom, series: [], precisaMapeamento: true, nomeOriginalXML: xProd });
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
    const novosItens = [...itens]; novosItens[index] = { ...novosItens[index], [campo]: valor };
    if (campo === 'quantidade' && novosItens[index].rastreiaSerie) { if (novosItens[index].series.length > valor) novosItens[index].series = novosItens[index].series.slice(0, valor); }
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
    if (!fornecedorBusca || !documento) return alert("Fornecedor e Número da NF são obrigatórios.");
    if (!localDestino) return alert("Selecione o Local de Destino.");
    if (itens.length === 0) return alert("Adicione produtos na entrada.");
    
    // Validação FOB
    if (modalidadeFrete === '1 - FOB' || modalidadeFrete === '2 - Terceiros') {
        if (!transportadoraBusca) return alert("Em fretes FOB/Terceiros, é obrigatório informar a Transportadora.");
    }

    for (let i = 0; i < itens.length; i++) {
      if (itens[i].precisaMapeamento) return alert(`Mapeie o item: "${itens[i].nomeOriginalXML}" antes de salvar.`);
      if (itens[i].rastreiaSerie && itens[i].series.length !== itens[i].quantidade) return alert(`Produto "${itens[i].nome}" exige ${itens[i].quantidade} séries.`);
    }

    setSalvando(true);
    const valorTotalProdutos = itens.reduce((acc, item) => acc + (item.quantidade * item.custo), 0);
    const valorTotalNota = valorTotalProdutos + valorFrete + valorIpi + valorIcmsSt;

    try {
      // 1. Grava NF-e
      const cabecalho = {
        tipo_documento: 'NF-e', cfop: cfop, chave_acesso: chaveAcesso || null, documento: documento, 
        data_emissao: dataEmissao || null, fornecedor_id: fornecedorId, fornecedor_texto: fornecedorBusca,
        modalidade_frete: modalidadeFrete, transportadora_id: transportadoraId, transportadora: transportadoraBusca,
        valor_frete: valorFrete, valor_icms: valorIcms, valor_icms_st: valorIcmsSt,
        valor_ipi: valorIpi, valor_pis: valorPis, valor_cofins: valorCofins, valor_impostos: valorOutros, valor_total: valorTotalNota
      };

      const { data: docData, error: docError } = await supabase.from('log_documentos_entrada').insert([cabecalho]).select('id').single();
      if (docError) throw docError;
      const docId = docData.id;

      // 2. Grava CT-e (Se for FOB e tiver CTE)
      if ((modalidadeFrete === '1 - FOB' || modalidadeFrete === '2 - Terceiros') && cteNumero) {
          await supabase.from('log_ctes').insert({
              numero_cte: cteNumero, chave_acesso: cteChave, transportadora_id: transportadoraId,
              documento_entrada_id: docId, tipo_frete: 'Inbound/Compra', valor_frete: valorFrete,
              data_emissao: dataEmissao || null
          });
      }

      // 3. Grava Itens
      for (const item of itens) {
        await supabase.from('log_movimentacoes').insert({
          produto_id: item.produtoId, tipo: 'Entrada', quantidade: item.quantidade, custo_unitario: item.custo, 
          documento_id: docId, local_id: localDestino, documento: documento, fornecedor_cliente: fornecedorBusca 
        });

        if (item.rastreiaSerie && item.series.length > 0) {
          const payloadSeries = item.series.map(s => ({ produto_id: item.produtoId, numero_serie: s, status: 'Em Estoque', documento_entrada: documento, local_id: localDestino }));
          await supabase.from('log_numeros_serie').insert(payloadSeries);
        }

        const { data: prodData } = await supabase.from('log_produtos').select('estoque_atual').eq('id', item.produtoId).single();
        const novoEstoque = (prodData?.estoque_atual || 0) + item.quantidade;
        await supabase.from('log_produtos').update({ estoque_atual: novoEstoque, custo_base: item.custo }).eq('id', item.produtoId);
      }

      alert("Entrada registrada com sucesso!");
      sessionStorage.removeItem("entradas_rascunho"); 
      
      setItens([]); setFornecedorBusca(""); setFornecedorId(null); setDocumento(""); setCfop(""); setChaveAcesso(""); setDataEmissao("");
      setModalidadeFrete("0 - CIF"); setTransportadoraBusca(""); setTransportadoraId(null); setCteNumero(""); setCteChave(""); setValorFrete(0); 
      setValorIcms(0); setValorIcmsSt(0); setValorIpi(0); setValorPis(0); setValorCofins(0); setValorOutros(0);
      setIndexBipagem(null); setModo("formulario"); setBuscaProduto(""); setSerialInput("");
      
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
    return (d.documento?.toLowerCase() || "").includes(termo) || (d.fornecedor_texto?.toLowerCase() || "").includes(termo) || (d.chave_acesso?.toLowerCase() || "").includes(termo) || (d.sequencial?.toString() || "").includes(termo);
  });

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto mb-12">
        <datalist id="lista-produtos-bd">{produtosBD.map((p) => <option key={p.id} value={`${p.sku || 'S/N'} - ${p.nome}`} />)}</datalist>
        <input type="file" accept=".xml" ref={fileInputRef} style={{ display: "none" }} onChange={processarXML} />

        <div className="flex border-b border-slate-200">
          <button onClick={() => setAbaAtiva("receber")} className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${abaAtiva === "receber" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"}`}>
            <div className="flex items-center gap-2"><PackageOpen className="w-4 h-4"/> Novo Recebimento</div>
          </button>
          <button onClick={() => setAbaAtiva("historico")} className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${abaAtiva === "historico" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"}`}>
            <div className="flex items-center gap-2"><History className="w-4 h-4"/> Histórico de Entradas</div>
          </button>
        </div>

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
                <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600"/> Dados da Nota Fiscal</h3>
                    {fornecedorId && <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded border border-emerald-200">Fornecedor Vinculado</span>}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-semibold text-slate-700">Fornecedor / Emitente</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input value={fornecedorBusca} onChange={e => { setFornecedorBusca(e.target.value); setFornecedorId(null); setMostrarDropdownFornecedor(true); }} onFocus={() => setMostrarDropdownFornecedor(true)} onBlur={() => setTimeout(() => setMostrarDropdownFornecedor(false), 200)} placeholder="Buscar Razão, Fantasia..." className={fornecedorId ? "bg-emerald-50 border-emerald-200 font-medium" : "bg-white"} />
                          {mostrarDropdownFornecedor && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-xl max-h-60 overflow-y-auto">
                              {fornecedoresFiltrados.length > 0 ? (
                                fornecedoresFiltrados.map(f => (
                                  <div key={f.id} className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0" onClick={() => selecionarFornecedor(f)}>
                                    <p className="text-sm font-bold text-slate-800"><span className="text-indigo-600 bg-indigo-50 px-1 rounded mr-1">#{f.codigo_sequencial}</span> {f.nome_fantasia || f.razao_social}</p>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">{f.cnpj_cpf || "Sem CNPJ"}</p>
                                  </div>
                                ))
                              ) : (<div className="p-3 text-sm text-slate-500 text-center">Nenhum fornecedor encontrado.</div>)}
                            </div>
                          )}
                        </div>
                        <Button variant="outline" onClick={() => window.open('/fornecedores', '_blank')} className="shrink-0 gap-1 text-indigo-700 border-indigo-200 hover:bg-indigo-50"><Plus className="w-4 h-4" /> Novo</Button>
                      </div>
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
                      <Input value={cfop} onChange={e => setCfop(e.target.value)} placeholder="Ex: 5102" />
                    </div>
                    <div className="space-y-2 md:col-span-5">
                      <label className="text-sm font-semibold text-slate-700">Chave de Acesso (NF-e)</label>
                      <Input value={chaveAcesso} onChange={e => setChaveAcesso(e.target.value)} placeholder="44 dígitos..." className="font-mono text-xs text-slate-600" />
                    </div>
                  </div>

                  {/* BLOCO LOGÍSTICO (NOVO) */}
                  <div className="pt-4 mt-2 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2"><Truck className="w-4 h-4"/> Logística e Frete (CT-e)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Modalidade do Frete</label>
                        <Select value={modalidadeFrete} onValueChange={setModalidadeFrete}>
                          <SelectTrigger className="bg-white relative z-10">
                            <SelectValue />
                          </SelectTrigger>
                          
                          {/* CORREÇÃO APLICADA AQUI: position="popper" e z-[99] */}
                          <SelectContent position="popper" className="bg-white z-[99] shadow-xl border-slate-200">
                            <SelectItem value="0 - CIF">0 - CIF (Remetente Paga)</SelectItem>
                            <SelectItem value="1 - FOB">1 - FOB (Destinatário Paga)</SelectItem>
                            <SelectItem value="2 - Terceiros">2 - Terceiros</SelectItem>
                            <SelectItem value="9 - Sem Frete">9 - Sem Frete</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-semibold text-slate-700">Transportadora Responsável</label>
                        <div className="relative">
                          <Input value={transportadoraBusca} onChange={e => { setTransportadoraBusca(e.target.value); setTransportadoraId(null); setMostrarDropdownTransp(true); }} onFocus={() => setMostrarDropdownTransp(true)} onBlur={() => setTimeout(() => setMostrarDropdownTransp(false), 200)} placeholder="Buscar Transportadora cadastrada..." className={transportadoraId ? "bg-amber-50 border-amber-200 font-medium" : "bg-white"} disabled={modalidadeFrete === '9 - Sem Frete'} />
                          {mostrarDropdownTransp && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-xl max-h-60 overflow-y-auto">
                              {transportadorasFiltradas.length > 0 ? (
                                transportadorasFiltradas.map(f => (
                                  <div key={f.id} className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0" onClick={() => selecionarTransportadora(f)}>
                                    <p className="text-sm font-bold text-slate-800"><span className="text-amber-600 bg-amber-50 px-1 rounded mr-1">#{f.codigo_sequencial}</span> {f.nome_fantasia || f.razao_social}</p>
                                  </div>
                                ))
                              ) : (<div className="p-3 text-sm text-slate-500 text-center">Nenhuma transportadora encontrada. Vá no CRM e marque a flag "É Transportadora".</div>)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Valor do Frete (R$)</label>
                        <Input type="number" step="0.01" value={valorFrete} onChange={e => setValorFrete(parseFloat(e.target.value)||0)} className="bg-white font-medium" disabled={modalidadeFrete === '9 - Sem Frete'} />
                      </div>

                      {/* EXCLUSIVO PARA FOB - LANÇAMENTO DO CTE */}
                      {(modalidadeFrete === '1 - FOB' || modalidadeFrete === '2 - Terceiros') && (
                        <div className="md:col-span-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-4 mt-2 animate-in fade-in">
                          <div className="flex items-center justify-center bg-amber-100 p-3 rounded-full shrink-0"><Receipt className="w-5 h-5 text-amber-700"/></div>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-amber-900 uppercase">Nº do CT-e (Conhecimento de Transporte)</label>
                              <Input value={cteNumero} onChange={e => setCteNumero(e.target.value)} placeholder="Opcional no momento da NF-e" className="bg-white border-amber-300" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-amber-900 uppercase">Chave de Acesso do CT-e</label>
                              <Input value={cteChave} onChange={e => setCteChave(e.target.value)} placeholder="44 dígitos" className="bg-white border-amber-300" />
                            </div>
                            <p className="text-xs text-amber-700 md:col-span-2">Como o frete é FOB, ao salvar esta nota o sistema gerará automaticamente uma pendência financeira para a Transportadora selecionada.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2"><Calculator className="w-4 h-4"/> Impostos Discriminados na Nota</h4>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                      <div className="space-y-1"><label className="text-xs font-medium text-slate-500">Valor ICMS</label><Input type="number" step="0.01" value={valorIcms} onChange={e => setValorIcms(parseFloat(e.target.value)||0)} className="h-8 text-sm" /></div>
                      <div className="space-y-1"><label className="text-xs font-medium text-slate-500">ICMS ST</label><Input type="number" step="0.01" value={valorIcmsSt} onChange={e => setValorIcmsSt(parseFloat(e.target.value)||0)} className="h-8 text-sm bg-slate-50" /></div>
                      <div className="space-y-1"><label className="text-xs font-medium text-slate-500">Valor IPI</label><Input type="number" step="0.01" value={valorIpi} onChange={e => setValorIpi(parseFloat(e.target.value)||0)} className="h-8 text-sm bg-slate-50" /></div>
                      <div className="space-y-1"><label className="text-xs font-medium text-slate-500">Valor PIS</label><Input type="number" step="0.01" value={valorPis} onChange={e => setValorPis(parseFloat(e.target.value)||0)} className="h-8 text-sm" /></div>
                      <div className="space-y-1"><label className="text-xs font-medium text-slate-500">COFINS</label><Input type="number" step="0.01" value={valorCofins} onChange={e => setValorCofins(parseFloat(e.target.value)||0)} className="h-8 text-sm" /></div>
                      <div className="space-y-1"><label className="text-xs font-medium text-slate-500 truncate" title="Valor Aproximado Tributos">Trib. Aprox.</label><Input type="number" step="0.01" value={valorOutros} onChange={e => setValorOutros(parseFloat(e.target.value)||0)} className="h-8 text-sm bg-slate-100" /></div>
                    </div>
                  </div>
                </div>

                {/* SELEÇÃO DO DESTINO E ITENS */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div className="bg-slate-50 p-4 border-b flex flex-wrap items-center gap-4 justify-between">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><MapPin className="w-3 h-3"/> Guardar no Local:</label>
                      <Select value={localDestino} onValueChange={setLocalDestino}>
                        <SelectTrigger className="w-[250px] bg-white border-indigo-200 relative z-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent position="popper" className="bg-white z-[99] shadow-xl border-slate-200">{locaisBD.map(loc => (<SelectItem key={loc.id} value={loc.id}>{loc.nome}</SelectItem>))}</SelectContent>
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
                                  <div className="space-y-2"><p className="text-xs text-amber-700 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> XML: {item.nomeOriginalXML}</p><Input list="lista-produtos-bd" placeholder="Vincule ao Catálogo..." className="h-8 text-xs border-amber-300" onChange={(e) => vincularProdutoXML(index, e.target.value)} /></div>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {item.precisaMapeamento ? <span className="text-xs text-amber-600">Pendente</span> : item.rastreiaSerie ? (
                                  <Button size="sm" variant={item.series.length === item.quantidade ? "default" : "secondary"} onClick={() => abrirBipagem(index)} className={`h-7 text-xs w-full px-2 ${item.series.length === item.quantidade ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>{item.series.length === item.quantidade ? <CheckCircle2 className="w-3 h-3"/> : <Barcode className="w-3 h-3" />} {item.series.length}/{item.quantidade}</Button>
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
                      <div><p className="text-stone-400 text-xs uppercase tracking-wider">Frete ({modalidadeFrete.split(' ')[2] || 'CIF'})</p><p className="text-lg font-semibold text-amber-400">R$ {valorFrete.toFixed(2).replace('.', ',')}</p></div>
                      <div className="pl-4 md:pl-6 border-l border-stone-600"><p className="text-stone-300 text-xs uppercase tracking-wider font-bold">Total da Nota</p><p className="text-2xl font-bold text-emerald-400">R$ {(itens.reduce((acc, i) => acc + (i.quantidade * i.custo), 0) + valorFrete + valorIcmsSt + valorIpi).toFixed(2).replace('.', ',')}</p></div>
                    </div>
                    <Button onClick={salvarEntrada} disabled={salvando} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 h-12 px-6 w-full md:w-auto">
                      {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Finalizar Recebimento
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* BIPAGEM... (mantido sem alterações funcionais para poupar espaço mental) */}
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
                      <label className="block text-sm font-semibold text-blue-900 mb-2 uppercase tracking-wider">Aguardando Leitor</label>
                      <Input ref={inputRef} value={serialInput} onChange={e => setSerialInput(e.target.value)} onKeyDown={biparSerie} placeholder="Bipe..." className="h-14 text-center text-lg" />
                    </div>
                  ) : (
                    <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500" /><p className="font-bold text-emerald-800 text-lg">Bipagem Concluída!</p>
                      <Button onClick={() => setModo("formulario")} className="mt-2 bg-emerald-600">Voltar</Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA HISTÓRICO... (Mantida a mesma lógica anterior) */}
        {abaAtiva === "historico" && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {modo !== "detalhe_historico" && (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b flex flex-wrap items-center gap-4 bg-slate-50 justify-between">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input placeholder="Buscar por NF, Fornecedor ou Chave..." value={buscaHistorico} onChange={e => setBuscaHistorico(e.target.value)} className="pl-9 bg-white" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                        <th className="p-3 font-semibold border-b text-center w-20">Seq</th>
                        <th className="p-3 font-semibold border-b">Documento</th>
                        <th className="p-3 font-semibold border-b">Fornecedor</th>
                        <th className="p-3 font-semibold border-b text-right">Frete</th>
                        <th className="p-3 font-semibold border-b text-right">Valor Total</th>
                        <th className="p-3 font-semibold border-b text-center w-24">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {docsFiltrados.map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-center font-mono text-sm text-slate-500">{doc.sequencial?.toString().padStart(4, '0')}</td>
                          <td className="p-3">
                            <p className="font-bold text-slate-800 text-sm">{doc.tipo_documento} {doc.documento}</p>
                            {doc.cfop && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase">CFOP: {doc.cfop}</span>}
                          </td>
                          <td className="p-3 text-sm text-slate-700">{doc.log_fornecedores?.nome_fantasia || doc.fornecedor_texto}</td>
                          <td className="p-3 text-right">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">{doc.modalidade_frete?.split('-')[1]?.trim() || "CIF"}</span>
                            <span className="font-semibold text-slate-600 text-xs">R$ {Number(doc.valor_frete).toFixed(2).replace('.',',')}</span>
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-600">R$ {Number(doc.valor_total).toFixed(2).replace('.',',')}</td>
                          <td className="p-3 text-center"><Button onClick={() => abrirDetalhesDocumento(doc)} variant="outline" size="sm"><Eye className="w-3 h-3"/></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}