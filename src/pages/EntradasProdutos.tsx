import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackageOpen, Plus, Save, Trash2, Barcode, CheckCircle2, ArrowLeft, FileCode2, AlertTriangle, FileText, Truck, MapPin, Calculator, History, Search, Eye, X, Loader2, Receipt, Pencil, Eraser } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ItemEntrada = {
  produtoId: string;
  sku: string;
  nome: string;
  rastreiaSerie: boolean;
  quantidade: number; 
  qtdEmbalagem: number; 
  fatorConversao: number; 
  custo: number; 
  custoEmbalagem: number; 
  series: string[];
  precisaMapeamento?: boolean;
  nomeOriginalXML?: string;
};

export default function Entradas() {
  const [abaAtiva, setAbaAtiva] = useState<"receber" | "historico">("receber");
  const [modo, setModo] = useState<"formulario" | "bipagem" | "detalhe_historico">("formulario");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  
  const [fornecedorBusca, setFornecedorBusca] = useState(""); 
  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [mostrarDropdownFornecedor, setMostrarDropdownFornecedor] = useState(false);
  
  const [documento, setDocumento] = useState("");
  const [cfop, setCfop] = useState(""); 
  const [chaveAcesso, setChaveAcesso] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [localDestino, setLocalDestino] = useState("");
  
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

  const [historicoDocs, setHistoricoDocs] = useState<any[]>([]);
  const [buscaHistorico, setBuscaHistorico] = useState("");
  const [docSelecionado, setDocSelecionado] = useState<any>(null);
  const [itensDocSelecionado, setItensDocSelecionado] = useState<any[]>([]);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  useEffect(() => {
    const rascunhoSalvo = sessionStorage.getItem("entradas_rascunho");
    if (rascunhoSalvo) {
      try {
        const draft = JSON.parse(rascunhoSalvo);
        if (draft) {
          setEditandoId(draft.editandoId || null);
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
        editandoId, fornecedorBusca, fornecedorId, documento, cfop, chaveAcesso, dataEmissao, localDestino,
        modalidadeFrete, transportadoraBusca, transportadoraId, cteNumero, cteChave, valorFrete,
        valorIcms, valorIcmsSt, valorIpi, valorPis, valorCofins, valorOutros, itens, modo, indexBipagem
      };
      sessionStorage.setItem("entradas_rascunho", JSON.stringify(draft));
    }
  }, [
    editandoId, fornecedorBusca, fornecedorId, documento, cfop, chaveAcesso, dataEmissao, localDestino,
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
      supabase.from('log_produtos').select('id, sku, nome, rastreia_serie, custo_base, fator_conversao').order('nome'),
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

  const fornecedoresFiltrados = fornecedoresBD.filter(f => {
    const termo = fornecedorBusca.toLowerCase();
    return (f.razao_social?.toLowerCase() || "").includes(termo) || (f.nome_fantasia?.toLowerCase() || "").includes(termo) || (f.cnpj_cpf?.toLowerCase() || "").includes(termo) || (f.codigo_sequencial?.toString() || "").includes(termo);
  });

  const transportadorasFiltradas = fornecedoresBD.filter(f => {
    const termo = transportadoraBusca.toLowerCase();
    return (f.is_transportadora === true || f.is_transportadora === null) && 
           ((f.razao_social?.toLowerCase() || "").includes(termo) || (f.nome_fantasia?.toLowerCase() || "").includes(termo) || (f.cnpj_cpf?.toLowerCase() || "").includes(termo) || (f.codigo_sequencial?.toString() || "").includes(termo));
  });

  const selecionarFornecedor = (f: any) => { setFornecedorId(f.id); setFornecedorBusca(`[${f.codigo_sequencial}] ${f.nome_fantasia || f.razao_social}`); setMostrarDropdownFornecedor(false); };
  const selecionarTransportadora = (f: any) => { setTransportadoraId(f.id); setTransportadoraBusca(`[${f.codigo_sequencial}] ${f.nome_fantasia || f.razao_social}`); setMostrarDropdownTransp(false); };

  const limparFormulario = () => {
    if (!confirm("Deseja realmente limpar todos os campos? Todo o preenchimento não salvo será perdido.")) return;
    sessionStorage.removeItem("entradas_rascunho");
    setEditandoId(null);
    setFornecedorBusca(""); setFornecedorId(null); 
    setDocumento(""); setCfop(""); setChaveAcesso(""); setDataEmissao("");
    setModalidadeFrete("0 - CIF"); setTransportadoraBusca(""); setTransportadoraId(null); setCteNumero(""); setCteChave(""); setValorFrete(0);
    setValorIcms(0); setValorIcmsSt(0); setValorIpi(0); setValorPis(0); setValorCofins(0); setValorOutros(0);
    setItens([]); setBuscaProduto(""); setSerialInput(""); setIndexBipagem(null); setModo("formulario");
  };

  // --- FUNÇÕES DE HISTÓRICO E GESTÃO ---
  const fetchHistorico = async () => {
    const { data, error } = await supabase.from('log_documentos_entrada').select(`*, log_fornecedores!fornecedor_id(nome_fantasia, razao_social)`).order('sequencial', { ascending: false });
    if (data) setHistoricoDocs(data);
  };

  const abrirDetalhesDocumento = async (doc: any) => {
    setCarregandoDetalhes(true); 
    setDocSelecionado(doc); 
    setModo("detalhe_historico");
    
    // Tratamento de erro rigoroso na consulta do detalhe
    const { data, error } = await supabase
      .from('log_movimentacoes')
      .select(`*, log_produtos(sku, nome), log_locais(nome)`)
      .eq('documento_id', doc.id);
      
    if (error) {
      alert("Houve uma falha de conexão do banco ao puxar os itens: " + error.message);
      setCarregandoDetalhes(false);
      return;
    }
    
    if (data) setItensDocSelecionado(data);
    setCarregandoDetalhes(false);
  };

  const excluirEntrada = async (doc: any) => {
    if (!confirm(`Deseja realmente excluir a entrada do documento ${doc.documento}? \n\nEsta ação descontará o saldo dos produtos no estoque e não pode ser desfeita.`)) return;
    try {
      setCarregandoDetalhes(true);
      const { data: movs } = await supabase.from('log_movimentacoes').select('produto_id, quantidade').eq('documento_id', doc.id);
      if (movs) {
        for (const mov of movs) {
          const { data: prod } = await supabase.from('log_produtos').select('estoque_atual').eq('id', mov.produto_id).single();
          if (prod) await supabase.from('log_produtos').update({ estoque_atual: Math.max(0, prod.estoque_atual - mov.quantidade) }).eq('id', mov.produto_id);
        }
      }
      await supabase.from('log_ctes').delete().eq('documento_entrada_id', doc.id);
      await supabase.from('log_numeros_serie').delete().eq('documento_entrada', doc.documento);
      await supabase.from('log_movimentacoes').delete().eq('documento_id', doc.id);
      await supabase.from('log_documentos_entrada').delete().eq('id', doc.id);

      alert("Lançamento excluído com sucesso e estoque revertido!");
      fetchHistorico();
      setModo("formulario");
    } catch (e) {
      console.error(e); alert("Erro ao excluir.");
    } finally { setCarregandoDetalhes(false); }
  };

  const carregarParaEdicao = async (doc: any) => {
    if (!confirm("Ao editar, o estoque será recalculado.\nSe o documento tiver séries, elas serão apagadas e precisarão ser bipadas novamente.\nDeseja continuar?")) return;
    
    setCarregandoDetalhes(true);
    
    try {
      const { data: movs, error } = await supabase
        .from('log_movimentacoes')
        .select('*, log_produtos(sku, nome, rastreia_serie, fator_conversao)')
        .eq('documento_id', doc.id);

      if (error) throw new Error("Falha no banco de dados ao buscar os produtos da nota: " + error.message);

      const itensMapeados: ItemEntrada[] = (movs || []).map(m => {
         const prod = Array.isArray(m.log_produtos) ? m.log_produtos[0] : m.log_produtos;
         const fc = prod?.fator_conversao || 1;
         return {
             produtoId: m.produto_id, sku: prod?.sku || '', nome: prod?.nome || 'Produto Desconhecido', 
             rastreiaSerie: prod?.rastreia_serie || false, quantidade: m.quantidade, 
             qtdEmbalagem: m.quantidade / fc, fatorConversao: fc, 
             custo: m.custo_unitario, custoEmbalagem: m.custo_unitario * fc, series: []
         };
      });

      setEditandoId(doc.id);
      setDocumento(doc.documento || ""); setCfop(doc.cfop || ""); setChaveAcesso(doc.chave_acesso || ""); setDataEmissao(doc.data_emissao || "");
      setLocalDestino(movs?.[0]?.local_id || ""); setModalidadeFrete(doc.modalidade_frete || "0 - CIF"); setValorFrete(doc.valor_frete || 0);
      setValorIcms(doc.valor_icms || 0); setValorIcmsSt(doc.valor_icms_st || 0); setValorIpi(doc.valor_ipi || 0); setValorPis(doc.valor_pis || 0);
      setValorCofins(doc.valor_cofins || 0); setValorOutros(doc.valor_impostos || 0);
      
      setFornecedorId(doc.fornecedor_id); setFornecedorBusca(doc.fornecedor_texto || "");
      setTransportadoraId(doc.transportadora_id); setTransportadoraBusca(doc.transportadora || "");
      
      setItens(itensMapeados);
      setAbaAtiva("receber");

    } catch (e: any) {
      alert(e.message);
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const cancelarEdicao = () => {
    setEditandoId(null); sessionStorage.removeItem("entradas_rascunho");
    setItens([]); setFornecedorBusca(""); setFornecedorId(null); setDocumento(""); setCfop(""); setChaveAcesso(""); setDataEmissao("");
    setModalidadeFrete("0 - CIF"); setTransportadoraBusca(""); setTransportadoraId(null); setCteNumero(""); setCteChave(""); setValorFrete(0); 
    setValorIcms(0); setValorIcmsSt(0); setValorIpi(0); setValorPis(0); setValorCofins(0); setValorOutros(0);
    setAbaAtiva("historico");
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

      if (modFreteTag === "0") setModalidadeFrete("0 - CIF");
      else if (modFreteTag === "1") setModalidadeFrete("1 - FOB");
      else if (modFreteTag === "2") setModalidadeFrete("2 - Terceiros");
      else setModalidadeFrete("9 - Sem Frete");

      const cnpjFormatado = cnpjEmitente.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
      const fornMatch = fornecedoresBD.find(f => f.cnpj_cpf === cnpjFormatado || f.cnpj_cpf === cnpjEmitente);
      if (fornMatch) { setFornecedorId(fornMatch.id); setFornecedorBusca(`[${fornMatch.codigo_sequencial}] ${fornMatch.nome_fantasia || fornMatch.razao_social}`); } 
      else { setFornecedorId(null); setFornecedorBusca(emitente); }

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
        if (match) novosItens.push({ produtoId: match.id, sku: match.sku, nome: match.nome, rastreiaSerie: match.rastreia_serie, quantidade: qCom, qtdEmbalagem: qCom, fatorConversao: match.fator_conversao || 1, custo: vUnCom, custoEmbalagem: vUnCom, series: [] });
        else novosItens.push({ produtoId: "", sku: cProd, nome: "", rastreiaSerie: false, quantidade: qCom, qtdEmbalagem: qCom, fatorConversao: 1, custo: vUnCom, custoEmbalagem: vUnCom, series: [], precisaMapeamento: true, nomeOriginalXML: xProd });
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
      novos[index].fatorConversao = match.fator_conversao || 1;
      novos[index].quantidade = novos[index].qtdEmbalagem * novos[index].fatorConversao;
      novos[index].custo = novos[index].fatorConversao > 0 ? novos[index].custoEmbalagem / novos[index].fatorConversao : 0;
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
      atualizarItemConversao(indexExistente, 'qtdEmbalagem', itens[indexExistente].qtdEmbalagem + 1);
    } else {
      setItens([...itens, { 
          produtoId: produtoEncontrado.id, sku: produtoEncontrado.sku, nome: produtoEncontrado.nome, 
          rastreiaSerie: produtoEncontrado.rastreia_serie, quantidade: 1 * (produtoEncontrado.fator_conversao || 1), 
          qtdEmbalagem: 1, fatorConversao: produtoEncontrado.fator_conversao || 1, 
          custo: produtoEncontrado.custo_base || 0, custoEmbalagem: produtoEncontrado.custo_base || 0, series: [] 
      }]);
    }
    setBuscaProduto(""); 
  };

  const atualizarItemConversao = (index: number, campo: 'qtdEmbalagem' | 'fatorConversao' | 'custoEmbalagem', valor: number) => {
    const novosItens = [...itens];
    const item = novosItens[index];
    
    if (campo === 'qtdEmbalagem') item.qtdEmbalagem = valor;
    if (campo === 'fatorConversao') item.fatorConversao = valor;
    if (campo === 'custoEmbalagem') item.custoEmbalagem = valor;

    item.quantidade = item.qtdEmbalagem * item.fatorConversao;
    item.custo = item.fatorConversao > 0 ? item.custoEmbalagem / item.fatorConversao : 0;

    if (item.rastreiaSerie && item.series.length > item.quantidade) item.series = item.series.slice(0, item.quantidade);
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
    if (itens.length === 0) return alert("Adicione produtos na entrada para poder salvar.");
    
    if (modalidadeFrete === '1 - FOB' || modalidadeFrete === '2 - Terceiros') {
        if (!transportadoraBusca) return alert("Em fretes FOB/Terceiros, é obrigatório informar a Transportadora.");
    }

    for (let i = 0; i < itens.length; i++) {
      if (itens[i].precisaMapeamento) return alert(`Mapeie o item: "${itens[i].nomeOriginalXML}" antes de salvar.`);
      if (itens[i].rastreiaSerie && itens[i].series.length !== itens[i].quantidade) return alert(`Produto "${itens[i].nome}" exige ${itens[i].quantidade} séries.`);
    }

    setSalvando(true);
    const valorTotalProdutos = itens.reduce((acc, item) => acc + (item.qtdEmbalagem * item.custoEmbalagem), 0);
    const valorTotalNota = valorTotalProdutos + valorFrete + valorIpi + valorIcmsSt;

    try {
      const cabecalho = {
        tipo_documento: 'NF-e', cfop: cfop, chave_acesso: chaveAcesso || null, documento: documento, 
        data_emissao: dataEmissao || null, fornecedor_id: fornecedorId, fornecedor_texto: fornecedorBusca,
        modalidade_frete: modalidadeFrete, transportadora_id: transportadoraId, transportadora: transportadoraBusca,
        valor_frete: valorFrete, valor_icms: valorIcms, valor_icms_st: valorIcmsSt,
        valor_ipi: valorIpi, valor_pis: valorPis, valor_cofins: valorCofins, valor_impostos: valorOutros, valor_total: valorTotalNota
      };

      let docId;

      if (editandoId) {
         // REVERSÃO BLINDADA: Tenta puxar o estoque, mas se der erro joga pro CATCH
         const { data: oldMovs, error: oldError } = await supabase.from('log_movimentacoes').select('produto_id, quantidade').eq('documento_id', editandoId);
         if (oldError) throw new Error("Erro ao consultar nota original: " + oldError.message);
         
         if (oldMovs) {
            for (const mov of oldMovs) {
               const { data: prod } = await supabase.from('log_produtos').select('estoque_atual').eq('id', mov.produto_id).single();
               if (prod) await supabase.from('log_produtos').update({ estoque_atual: Math.max(0, prod.estoque_atual - mov.quantidade) }).eq('id', mov.produto_id);
            }
         }
         await supabase.from('log_ctes').delete().eq('documento_entrada_id', editandoId);
         const { data: oldDoc } = await supabase.from('log_documentos_entrada').select('documento').eq('id', editandoId).single();
         if (oldDoc?.documento) await supabase.from('log_numeros_serie').delete().eq('documento_entrada', oldDoc.documento);
         await supabase.from('log_movimentacoes').delete().eq('documento_id', editandoId);

         const { error: updateError } = await supabase.from('log_documentos_entrada').update(cabecalho).eq('id', editandoId);
         if (updateError) throw new Error("Erro ao atualizar o cabeçalho: " + updateError.message);
         docId = editandoId;
      } else {
         const { data: docData, error: docError } = await supabase.from('log_documentos_entrada').insert([cabecalho]).select('id').single();
         if (docError) throw new Error("Erro ao salvar o cabeçalho: " + docError.message);
         docId = docData.id;
      }

      if ((modalidadeFrete === '1 - FOB' || modalidadeFrete === '2 - Terceiros') && cteNumero) {
          const { error: cteErr } = await supabase.from('log_ctes').insert({
              numero_cte: cteNumero, chave_acesso: cteChave, transportadora_id: transportadoraId,
              documento_entrada_id: docId, tipo_frete: 'Inbound/Compra', valor_frete: valorFrete, data_emissao: dataEmissao || null
          });
          if (cteErr) throw new Error("Erro ao salvar o CT-e: " + cteErr.message);
      }

      // GRAVAÇÃO DE ITENS BLINDADA
      for (const item of itens) {
        const { error: movErr } = await supabase.from('log_movimentacoes').insert({
          produto_id: item.produtoId, tipo: 'Entrada', quantidade: item.quantidade, custo_unitario: item.custo, 
          documento_id: docId, local_id: localDestino, documento: documento, fornecedor_cliente: fornecedorBusca 
        });
        if (movErr) throw new Error(`Banco recusou salvar o item ${item.nome}: ${movErr.message}`);

        if (item.rastreiaSerie && item.series.length > 0) {
          const payloadSeries = item.series.map(s => ({ produto_id: item.produtoId, numero_serie: s, status: 'Em Estoque', documento_entrada: documento, local_id: localDestino }));
          const { error: serieErr } = await supabase.from('log_numeros_serie').insert(payloadSeries);
          if (serieErr) throw new Error(`Banco recusou as séries do item ${item.nome}: ${serieErr.message}`);
        }

        const { data: prodData } = await supabase.from('log_produtos').select('estoque_atual').eq('id', item.produtoId).single();
        const novoEstoque = (prodData?.estoque_atual || 0) + item.quantidade;
        await supabase.from('log_produtos').update({ estoque_atual: novoEstoque, custo_base: item.custo }).eq('id', item.produtoId);
      }

      alert(editandoId ? "Entrada editada e atualizada no estoque com sucesso!" : "Entrada registrada com sucesso!");
      sessionStorage.removeItem("entradas_rascunho"); 
      
      setEditandoId(null); setItens([]); setFornecedorBusca(""); setFornecedorId(null); setDocumento(""); setCfop(""); setChaveAcesso(""); setDataEmissao("");
      setModalidadeFrete("0 - CIF"); setTransportadoraBusca(""); setTransportadoraId(null); setCteNumero(""); setCteChave(""); setValorFrete(0); 
      setValorIcms(0); setValorIcmsSt(0); setValorIpi(0); setValorPis(0); setValorCofins(0); setValorOutros(0);
      setIndexBipagem(null); setModo("formulario"); setBuscaProduto(""); setSerialInput("");
      
      fetchHistorico();
    } catch (error: any) {
      if (error.code === '23505') alert("Esta Chave de Acesso ou Documento já foi registrado!");
      else alert("Houve um erro técnico. Nada foi salvo. Motivo: \n" + error.message);
    } finally {
      setSalvando(false);
    }
  };

  const formatarValor = (valor: any) => Number(valor || 0).toFixed(2).replace('.', ',');

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
            <div className="flex items-center gap-2"><PackageOpen className="w-4 h-4"/> {editandoId ? "Editando Recebimento" : "Novo Recebimento"}</div>
          </button>
          <button onClick={() => setAbaAtiva("historico")} className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${abaAtiva === "historico" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"}`}>
            <div className="flex items-center gap-2"><History className="w-4 h-4"/> Histórico de Entradas</div>
          </button>
        </div>

        {abaAtiva === "receber" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">{editandoId ? "Modo Edição" : "Lançamento de Mercadorias"}</h1>
                <p className="text-slate-500">{editandoId ? "Faça as correções. Ao salvar, o estoque antigo será desfeito." : "Importe XML ou lance manualmente para alimentar o Almoxarifado."}</p>
              </div>
              
              {modo === "formulario" ? (
                <div className="flex items-center gap-3">
                  {!editandoId && (
                    <Button variant="outline" onClick={limparFormulario} className="gap-2 text-slate-600 hover:text-red-600 hover:bg-red-50 border-slate-200 shadow-sm"><Eraser className="w-4 h-4" /> Limpar Tela</Button>
                  )}
                  <Button onClick={acionarUploadXML} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm"><FileCode2 className="w-4 h-4" /> Importar XML</Button>
                </div>
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

                  <div className="pt-4 mt-2 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2"><Truck className="w-4 h-4"/> Logística e Frete (CT-e)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Modalidade do Frete</label>
                        <Select value={modalidadeFrete} onValueChange={setModalidadeFrete}>
                          <SelectTrigger className="bg-white relative z-10"><SelectValue /></SelectTrigger>
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
                          <Input value={transportadoraBusca} onChange={e => { setTransportadoraBusca(e.target.value); setTransportadoraId(null); setMostrarDropdownTransp(true); }} onFocus={() => setMostrarDropdownTransp(true)} onBlur={() => setTimeout(() => setMostrarDropdownTransp(false), 200)} placeholder="Buscar Transportadora..." className={transportadoraId ? "bg-amber-50 border-amber-200 font-medium" : "bg-white"} disabled={modalidadeFrete === '9 - Sem Frete'} />
                          {mostrarDropdownTransp && (
                            <div className="absolute z-[99] w-full mt-1 bg-white border border-slate-200 rounded-md shadow-xl max-h-60 overflow-y-auto">
                              {transportadorasFiltradas.map(f => (
                                <div key={f.id} className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0" onClick={() => selecionarTransportadora(f)}>
                                  <p className="text-sm font-bold text-slate-800"><span className="text-amber-600 bg-amber-50 px-1 rounded mr-1">#{f.codigo_sequencial}</span> {f.nome_fantasia || f.razao_social}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">Valor do Frete (R$)</label><Input type="number" step="0.01" value={valorFrete} onChange={e => setValorFrete(parseFloat(e.target.value)||0)} className="bg-white font-medium" disabled={modalidadeFrete === '9 - Sem Frete'} /></div>
                      
                      {(modalidadeFrete === '1 - FOB' || modalidadeFrete === '2 - Terceiros') && (
                        <div className="md:col-span-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-4 mt-2">
                          <div className="flex items-center justify-center bg-amber-100 p-3 rounded-full shrink-0"><Receipt className="w-5 h-5 text-amber-700"/></div>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1"><label className="text-xs font-bold text-amber-900 uppercase">Nº do CT-e</label><Input value={cteNumero} onChange={e => setCteNumero(e.target.value)} placeholder="Opcional no momento" className="bg-white border-amber-300" /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-amber-900 uppercase">Chave de Acesso CT-e</label><Input value={cteChave} onChange={e => setCteChave(e.target.value)} placeholder="44 dígitos" className="bg-white border-amber-300" /></div>
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
                        <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider">
                          <th className="p-3 font-semibold border-b min-w-[250px]">Produto / Mapeamento</th>
                          <th className="p-3 font-semibold border-b w-24 text-center">Séries</th>
                          <th className="p-3 font-semibold border-b w-24 text-center" title="Quantidade de Pacotes/Caixas">Qtd. Emb.</th>
                          <th className="p-3 font-semibold border-b w-24 text-center" title="Fator de Conversão (Qtd dentro da caixa)">Un. / Emb.</th>
                          <th className="p-3 font-semibold border-b w-24 text-center text-indigo-600" title="Total Real no Estoque">Estoque</th>
                          <th className="p-3 font-semibold border-b w-28">Preço Emb. (R$)</th>
                          <th className="p-3 font-semibold border-b w-28 text-indigo-600">Custo Un. (R$)</th>
                          <th className="p-3 font-semibold border-b w-32 text-right">Total Item</th>
                          <th className="p-3 font-semibold border-b w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itens.length === 0 ? (
                          <tr><td colSpan={9} className="p-8 text-center text-slate-400">Nenhum item na nota. Importe um XML ou insira manualmente.</td></tr>
                        ) : (
                          itens.map((item, index) => (
                            <tr key={index} className={item.precisaMapeamento ? 'bg-amber-50/50 text-sm' : 'hover:bg-slate-50 text-sm'}>
                              <td className="p-3">
                                {!item.precisaMapeamento ? (
                                  <><p className="font-semibold text-slate-800 text-sm">{item.nome}</p><p className="text-[10px] text-slate-500 font-mono">SKU: {item.sku}</p></>
                                ) : (
                                  <div className="space-y-2"><p className="text-xs text-amber-700 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> XML: {item.nomeOriginalXML}</p><Input list="lista-produtos-bd" placeholder="Vincule ao Catálogo..." className="h-8 text-xs border-amber-300" onChange={(e) => vincularProdutoXML(index, e.target.value)} /></div>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {item.precisaMapeamento ? <span className="text-xs text-amber-600">Pendente</span> : item.rastreiaSerie ? (
                                  <Button size="sm" variant={item.series.length === item.quantidade ? "default" : "secondary"} onClick={() => abrirBipagem(index)} className={`h-7 text-[10px] w-full px-1 ${item.series.length === item.quantidade ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>{item.series.length === item.quantidade ? <CheckCircle2 className="w-3 h-3"/> : <Barcode className="w-3 h-3" />} {item.series.length}/{item.quantidade}</Button>
                                ) : <span className="text-[10px] text-slate-400">Lote</span>}
                              </td>
                              <td className="p-3"><Input type="number" value={item.qtdEmbalagem} onChange={e => atualizarItemConversao(index, 'qtdEmbalagem', parseFloat(e.target.value)||0)} className="h-8 text-center text-xs" /></td>
                              <td className="p-3"><Input type="number" value={item.fatorConversao} onChange={e => atualizarItemConversao(index, 'fatorConversao', parseInt(e.target.value)||1)} className="h-8 text-center text-xs" /></td>
                              <td className="p-3 text-center font-bold text-indigo-600 bg-indigo-50/30 text-xs">{item.quantidade}</td>
                              <td className="p-3"><Input type="number" step="0.01" value={item.custoEmbalagem} onChange={e => atualizarItemConversao(index, 'custoEmbalagem', parseFloat(e.target.value)||0)} className="h-8 text-xs" /></td>
                              <td className="p-3 text-indigo-700 font-semibold italic text-xs">R$ {item.custo.toFixed(4).replace('.',',')}</td>
                              <td className="p-3 text-right font-bold text-xs">R$ {(item.qtdEmbalagem * item.custoEmbalagem).toFixed(2).replace('.',',')}</td>
                              <td className="p-3 text-center"><Button variant="ghost" size="icon" onClick={() => removerItem(index)} className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* BARRA SEMPRE VISÍVEL CASO ESTEJA EDITANDO */}
                {(itens.length > 0 || editandoId) && (
                  <div className="flex justify-between items-center bg-stone-800 p-4 rounded-xl text-white shadow-lg flex-wrap gap-4">
                    <div className="flex gap-6 md:gap-8 flex-wrap">
                      <div><p className="text-stone-400 text-xs uppercase tracking-wider">Itens</p><p className="text-lg font-semibold">R$ {itens.reduce((acc, i) => acc + (i.qtdEmbalagem * i.custoEmbalagem), 0).toFixed(2).replace('.', ',')}</p></div>
                      <div><p className="text-stone-400 text-xs uppercase tracking-wider">Frete ({modalidadeFrete.split(' ')[2] || 'CIF'})</p><p className="text-lg font-semibold text-amber-400">R$ {valorFrete.toFixed(2).replace('.', ',')}</p></div>
                      <div><p className="text-stone-400 text-xs uppercase tracking-wider">ST + IPI</p><p className="text-lg font-semibold text-amber-400">R$ {(valorIcmsSt + valorIpi).toFixed(2).replace('.', ',')}</p></div>
                      <div className="pl-4 md:pl-6 border-l border-stone-600"><p className="text-stone-300 text-xs uppercase tracking-wider font-bold">Total da Nota</p><p className="text-2xl font-bold text-emerald-400">R$ {(itens.reduce((acc, i) => acc + (i.qtdEmbalagem * i.custoEmbalagem), 0) + valorFrete + valorIcmsSt + valorIpi).toFixed(2).replace('.', ',')}</p></div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        {editandoId && (
                            <Button variant="outline" onClick={cancelarEdicao} className="h-12 px-4 bg-stone-700 border-stone-600 text-white hover:bg-stone-600 hover:text-white">Cancelar Edição</Button>
                        )}
                        <Button onClick={salvarEntrada} disabled={salvando} className={`${editandoId ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white gap-2 h-12 px-6 flex-1`}>
                            {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 
                            {editandoId ? "Atualizar Recebimento" : "Finalizar Recebimento"}
                        </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* BIPAGEM */}
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

        {/* ABA HISTÓRICO... */}
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
                        <th className="p-3 font-semibold border-b text-center w-36">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {docsFiltrados.map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-center font-mono text-sm text-slate-500">{String(doc.sequencial || '').padStart(4, '0')}</td>
                          <td className="p-3">
                            <p className="font-bold text-slate-800 text-sm">{doc.tipo_documento} {doc.documento}</p>
                            {doc.cfop && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase">CFOP: {doc.cfop}</span>}
                          </td>
                          <td className="p-3 text-sm text-slate-700">{doc.log_fornecedores?.nome_fantasia || doc.fornecedor_texto}</td>
                          <td className="p-3 text-right">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">{doc.modalidade_frete?.split('-')[1]?.trim() || "CIF"}</span>
                            <span className="font-semibold text-slate-600 text-xs">R$ {formatarValor(doc.valor_frete)}</span>
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-600">R$ {formatarValor(doc.valor_total)}</td>
                          <td className="p-3 text-center">
                             <div className="flex items-center justify-center gap-1">
                                <Button onClick={() => abrirDetalhesDocumento(doc)} variant="outline" size="icon" className="h-8 w-8 text-slate-600 hover:text-indigo-600" title="Ver Detalhes"><Eye className="w-4 h-4"/></Button>
                                <Button onClick={() => carregarParaEdicao(doc)} variant="outline" size="icon" className="h-8 w-8 text-slate-600 hover:text-amber-600" title="Editar / Corrigir"><Pencil className="w-4 h-4"/></Button>
                                <Button onClick={() => excluirEntrada(doc)} variant="outline" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" title="Excluir / Estornar"><Trash2 className="w-4 h-4"/></Button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {modo === "detalhe_historico" && docSelecionado && (
              <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6 animate-in slide-in-from-right-4 duration-200">
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded text-sm border font-bold">SEQ: {String(docSelecionado?.sequencial || '').padStart(4, '0')}</span>
                      <h2 className="text-xl font-bold text-slate-800">{docSelecionado?.tipo_documento} Nº {docSelecionado?.documento}</h2>
                    </div>
                    <p className="text-sm text-slate-600 font-medium">{docSelecionado?.log_fornecedores?.razao_social || docSelecionado?.fornecedor_texto}</p>
                    <p className="text-xs text-slate-400 font-mono mt-1">CHAVE: {docSelecionado?.chave_acesso || "Não informada"}</p>
                  </div>
                  <Button variant="ghost" onClick={() => setModo("formulario")} className="text-slate-400 hover:text-slate-800 hover:bg-slate-100"><X className="w-5 h-5"/></Button>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-center">
                  <div className="border-r border-slate-200 last:border-0"><p className="text-[10px] text-slate-400 font-bold uppercase">CFOP / Operação</p><p className="text-sm font-semibold text-slate-700">{docSelecionado?.cfop || "-"}</p></div>
                  <div className="border-r border-slate-200 last:border-0"><p className="text-[10px] text-slate-400 font-bold uppercase">ICMS</p><p className="text-sm font-semibold text-slate-700">R$ {formatarValor(docSelecionado?.valor_icms)}</p></div>
                  <div className="border-r border-slate-200 last:border-0"><p className="text-[10px] text-amber-500 font-bold uppercase">ICMS ST</p><p className="text-sm font-semibold text-amber-700">R$ {formatarValor(docSelecionado?.valor_icms_st)}</p></div>
                  <div className="border-r border-slate-200 last:border-0"><p className="text-[10px] text-amber-500 font-bold uppercase">IPI</p><p className="text-sm font-semibold text-amber-700">R$ {formatarValor(docSelecionado?.valor_ipi)}</p></div>
                  <div className="border-r border-slate-200 last:border-0"><p className="text-[10px] text-slate-400 font-bold uppercase">PIS</p><p className="text-sm font-semibold text-slate-700">R$ {formatarValor(docSelecionado?.valor_pis)}</p></div>
                  <div className="border-r border-slate-200 last:border-0"><p className="text-[10px] text-slate-400 font-bold uppercase">COFINS</p><p className="text-sm font-semibold text-slate-700">R$ {formatarValor(docSelecionado?.valor_cofins)}</p></div>
                  <div className="border-r border-slate-200 last:border-0"><p className="text-[10px] text-blue-500 font-bold uppercase">FRETE</p><p className="text-sm font-semibold text-blue-700">R$ {formatarValor(docSelecionado?.valor_frete)}</p></div>
                  <div><p className="text-[10px] text-emerald-600 font-bold uppercase">TOTAL NOTA</p><p className="text-base font-bold text-emerald-600">R$ {formatarValor(docSelecionado?.valor_total)}</p></div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-3 border-b pb-2">Mercadorias Recebidas</h3>
                  {carregandoDetalhes ? (
                    <div className="p-8 text-center text-slate-400 flex justify-center"><Loader2 className="w-6 h-6 animate-spin"/></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                            <th className="p-3 font-semibold border-b">Produto</th>
                            <th className="p-3 font-semibold border-b text-center">Qtd Final</th>
                            <th className="p-3 font-semibold border-b text-right">Custo Un.</th>
                            <th className="p-3 font-semibold border-b text-right" title="Rateio = (Frete + IPI + ICMS ST) / Qtd Total da Nota">Rateio Taxas</th>
                            <th className="p-3 font-semibold border-b text-right text-indigo-700">Preço Agregado</th>
                            <th className="p-3 font-semibold border-b">Local de Destino</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {itensDocSelecionado.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum item foi salvo no banco para este documento. Entre no modo Edição para corrigir.</td></tr>
                          ) : (
                            itensDocSelecionado.map(item => {
                              const qtdTotalNota = itensDocSelecionado.reduce((acc, i) => acc + i.quantidade, 0);
                              const taxaUnitario = qtdTotalNota > 0 ? (Number(docSelecionado?.valor_frete) + Number(docSelecionado?.valor_icms_st) + Number(docSelecionado?.valor_ipi)) / qtdTotalNota : 0;
                              const precoAgregado = Number(item.custo_unitario) + taxaUnitario;

                              return (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-3"><p className="font-semibold text-slate-800">{item.log_produtos?.nome || 'Desconhecido'}</p><p className="text-xs text-slate-500 font-mono">SKU: {item.log_produtos?.sku || 'S/N'}</p></td>
                                  <td className="p-3 text-center font-medium">{item.quantidade}</td>
                                  <td className="p-3 text-right text-slate-600">R$ {formatarValor(item.custo_unitario)}</td>
                                  <td className="p-3 text-right text-amber-600">+ R$ {formatarValor(taxaUnitario)}</td>
                                  <td className="p-3 text-right font-bold text-indigo-700 bg-indigo-50/30">R$ {formatarValor(precoAgregado)}</td>
                                  <td className="p-3 text-slate-600 text-xs font-semibold">{item.log_locais?.nome || "Padrão"}</td>
                                </tr>
                              );
                            })
                          )}
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
```