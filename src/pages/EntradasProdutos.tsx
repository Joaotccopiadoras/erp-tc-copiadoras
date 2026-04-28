import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackageOpen, Plus, Save, Trash2, Barcode, CheckCircle2, ArrowLeft, FileCode2, AlertTriangle, FileText, Truck, MapPin, Calculator, History, Search, Eye, X, Loader2, Receipt, Pencil, Eraser, Landmark, Calendar, Bot } from "lucide-react";
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

type FaturaXML = {
  numero: string;
  vencimento: string;
  valor: number;
};

export default function Entradas() {
  const location = useLocation();
  const [abaAtiva, setAbaAtiva] = useState<"receber" | "historico">("receber");
  const [modo, setModo] = useState<"formulario" | "bipagem" | "detalhe_historico">("formulario");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [usuarioAtual, setUsuarioAtual] = useState("Sistema");
  
  // ESTADOS: DADOS DA NOTA
  const [fornecedorBusca, setFornecedorBusca] = useState(""); 
  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [mostrarDropdownFornecedor, setMostrarDropdownFornecedor] = useState(false);
  const [documento, setDocumento] = useState("");
  const [cfop, setCfop] = useState(""); 
  const [chaveAcesso, setChaveAcesso] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [localDestino, setLocalDestino] = useState("");
  
  // ESTADOS: FRETE E IMPOSTOS
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
  
  // INTEGRAÇÃO FINANCEIRA
  const [gerarFinanceiro, setGerarFinanceiro] = useState(true);
  const [faturas, setFaturas] = useState<FaturaXML[]>([]);
  const [formaPagamento, setFormaPagamento] = useState("Boleto");
  const [centroCusto, setCentroCusto] = useState("ShowRoom / Geral");
  const [categoriasFin, setCategoriasFin] = useState<any[]>([]);
  const [categoriaFinId, setCategoriaFinId] = useState("");

  const [produtosBD, setProdutosBD] = useState<any[]>([]);
  const [fornecedoresBD, setFornecedoresBD] = useState<any[]>([]);
  const [locaisBD, setLocaisBD] = useState<any[]>([]);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [itens, setItens] = useState<ItemEntrada[]>([]);
  
  const [indexBipagem, setIndexBipagem] = useState<number | null>(null);
  const [serialInput, setSerialInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados de Carregamento
  const [salvando, setSalvando] = useState(false);
  const [carregandoLeituraDoc, setCarregandoLeituraDoc] = useState(false); // NOVO: Loader da IA

  const [historicoDocs, setHistoricoDocs] = useState<any[]>([]);
  const [buscaHistorico, setBuscaHistorico] = useState("");
  const [docSelecionado, setDocSelecionado] = useState<any>(null);
  const [itensDocSelecionado, setItensDocSelecionado] = useState<any[]>([]);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const buscaViaUrl = params.get("busca");
    
    if (buscaViaUrl) {
      setAbaAtiva("historico"); setBuscaHistorico(buscaViaUrl); fetchHistorico(); setModo("formulario");
      sessionStorage.removeItem("entradas_rascunho");
      window.history.replaceState(null, '', '/entradasprodutos');
    } else {
      const rascunhoSalvo = sessionStorage.getItem("entradas_rascunho");
      if (rascunhoSalvo) {
        try {
          const draft = JSON.parse(rascunhoSalvo);
          if (draft) {
            setEditandoId(draft.editandoId || null); setFornecedorBusca(draft.fornecedorBusca || ""); setFornecedorId(draft.fornecedorId || null);
            setDocumento(draft.documento || ""); setCfop(draft.cfop || ""); setChaveAcesso(draft.chaveAcesso || ""); setDataEmissao(draft.dataEmissao || "");
            setLocalDestino(draft.localDestino || ""); setModalidadeFrete(draft.modalidadeFrete || "0 - CIF"); setTransportadoraBusca(draft.transportadoraBusca || "");
            setTransportadoraId(draft.transportadoraId || null); setCteNumero(draft.cteNumero || ""); setCteChave(draft.cteChave || "");
            setValorFrete(draft.valorFrete || 0); setValorIcms(draft.valorIcms || 0); setValorIcmsSt(draft.valorIcmsSt || 0);
            setValorIpi(draft.valorIpi || 0); setValorPis(draft.valorPis || 0); setValorCofins(draft.valorCofins || 0); setValorOutros(draft.valorOutros || 0);
            setGerarFinanceiro(draft.gerarFinanceiro ?? true); setFaturas(draft.faturas || []); setFormaPagamento(draft.formaPagamento || "Boleto");
            setCentroCusto(draft.centroCusto || "ShowRoom / Geral"); setCategoriaFinId(draft.categoriaFinId || "");
            setItens(draft.itens || []);
            if (draft.modo) setModo(draft.modo);
          }
        } catch (e) {}
      }
    }
  }, [location]);

  useEffect(() => {
    if (abaAtiva === "receber" && modo !== "detalhe_historico") {
      const draft = {
        editandoId, fornecedorBusca, fornecedorId, documento, cfop, chaveAcesso, dataEmissao, localDestino,
        modalidadeFrete, transportadoraBusca, transportadoraId, cteNumero, cteChave, valorFrete,
        valorIcms, valorIcmsSt, valorIpi, valorPis, valorCofins, valorOutros, itens, modo,
        gerarFinanceiro, faturas, formaPagamento, centroCusto, categoriaFinId
      };
      sessionStorage.setItem("entradas_rascunho", JSON.stringify(draft));
    }
  }, [
    editandoId, fornecedorBusca, fornecedorId, documento, cfop, chaveAcesso, dataEmissao, localDestino,
    modalidadeFrete, transportadoraBusca, transportadoraId, cteNumero, cteChave, valorFrete,
    valorIcms, valorIcmsSt, valorIpi, valorPis, valorCofins, valorOutros, itens, modo, abaAtiva,
    gerarFinanceiro, faturas, formaPagamento, centroCusto, categoriaFinId
  ]);

  useEffect(() => { fetchDadosBase(); }, []);
  useEffect(() => { if (abaAtiva === "historico") { fetchHistorico(); setModo("formulario"); } else { fetchDadosBase(); } }, [abaAtiva]);

  const fetchDadosBase = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const { data } = await supabase.from('permissoes').select('nome').eq('email', user.email).single();
      if (data?.nome) setUsuarioAtual(data.nome); else setUsuarioAtual(user.email);
    }

    const [prodRes, fornRes, locRes, catFinRes] = await Promise.all([
      supabase.from('log_produtos').select('id, sku, nome, rastreia_serie, custo_base, fator_conversao').order('nome'),
      supabase.from('log_fornecedores').select('id, razao_social, nome_fantasia, cnpj_cpf, codigo_sequencial, is_transportadora'), 
      supabase.from('log_locais').select('id, nome').order('nome'),
      supabase.from('fin_categorias').select('id, nome').eq('tipo', 'Despesa')
    ]);
    if (prodRes.data) setProdutosBD(prodRes.data);
    if (fornRes.data) setFornecedoresBD(fornRes.data);
    if (locRes.data) {
        setLocaisBD(locRes.data);
        if (!localDestino) setLocalDestino(locRes.data[0]?.id || "");
    }
    if (catFinRes.data) {
        setCategoriasFin(catFinRes.data);
        if (!categoriaFinId) {
            const catCompra = catFinRes.data.find(c => c.nome.toLowerCase().includes('compra') || c.nome.toLowerCase().includes('revenda'));
            if (catCompra) setCategoriaFinId(catCompra.id);
        }
    }
  };

  const fornecedoresFiltrados = fornecedoresBD.filter(f => {
    const termo = fornecedorBusca.toLowerCase();
    return (f.razao_social?.toLowerCase() || "").includes(termo) || (f.nome_fantasia?.toLowerCase() || "").includes(termo) || (f.cnpj_cpf?.toLowerCase() || "").includes(termo) || (f.codigo_sequencial?.toString() || "").includes(termo);
  });

  const selecionarFornecedor = (f: any) => { setFornecedorId(f.id); setFornecedorBusca(`[${f.codigo_sequencial}] ${f.nome_fantasia || f.razao_social}`); setMostrarDropdownFornecedor(false); };
  
  const limparFormulario = () => {
    if (!confirm("Deseja realmente limpar todos os campos?")) return;
    sessionStorage.removeItem("entradas_rascunho");
    setEditandoId(null); setFornecedorBusca(""); setFornecedorId(null); 
    setDocumento(""); setCfop(""); setChaveAcesso(""); setDataEmissao("");
    setModalidadeFrete("0 - CIF"); setTransportadoraBusca(""); setTransportadoraId(null); setCteNumero(""); setCteChave(""); setValorFrete(0);
    setValorIcms(0); setValorIcmsSt(0); setValorIpi(0); setValorPis(0); setValorCofins(0); setValorOutros(0);
    setFaturas([]);
    setItens([]); setBuscaProduto(""); setSerialInput(""); setIndexBipagem(null); setModo("formulario");
  };

  const fetchHistorico = async () => {
    const { data } = await supabase.from('log_documentos_entrada').select(`*, log_fornecedores!fornecedor_id(nome_fantasia, razao_social)`).order('sequencial', { ascending: false });
    if (data) setHistoricoDocs(data);
  };

  const abrirDetalhesDocumento = async (doc: any) => {
    setCarregandoDetalhes(true); setDocSelecionado(doc); setModo("detalhe_historico");
    const { data, error } = await supabase.from('log_movimentacoes').select(`*, log_produtos(sku, nome), log_locais!local_id(nome)`).eq('documento_id', doc.id);
    if (!error && data) setItensDocSelecionado(data);
    setCarregandoDetalhes(false);
  };

  const excluirEntrada = async (doc: any) => {
    if (!confirm(`Deseja realmente excluir a entrada do documento ${doc.documento}?\nO estoque será revertido e as obrigações financeiras pendentes ligadas a esta nota serão deletadas.`)) return;
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
      await supabase.from('fin_lancamentos').delete().eq('documento_origem', doc.documento).eq('status', 'Pendente');
      await supabase.from('log_documentos_entrada').delete().eq('id', doc.id);

      alert("Lançamento e financeiro excluídos com sucesso!");
      fetchHistorico(); setModo("formulario");
    } catch (e) { console.error(e); } finally { setCarregandoDetalhes(false); }
  };

  const carregarParaEdicao = async (doc: any) => {
    if (!confirm("Ao editar, o estoque será recalculado e a conta a pagar pendente será recriada.\nDeseja continuar?")) return;
    setCarregandoDetalhes(true);
    
    try {
      const { data: movs, error } = await supabase.from('log_movimentacoes').select('*, log_produtos(sku, nome, rastreia_serie, fator_conversao)').eq('documento_id', doc.id);
      if (error) throw error;

      const itensMapeados: ItemEntrada[] = (movs || []).map(m => {
         const prod = Array.isArray(m.log_produtos) ? m.log_produtos[0] : m.log_produtos;
         const fc = prod?.fator_conversao || 1;
         return {
             produtoId: m.produto_id, sku: prod?.sku || '', nome: prod?.nome || 'Produto Desconhecido', 
             rastreiaSerie: prod?.rastreia_serie || false, quantidade: m.quantidade, 
             qtdEmbalagem: m.quantidade / fc, fatorConversao: fc, custo: m.custo_unitario, custoEmbalagem: m.custo_unitario * fc, series: []
         };
      });

      setEditandoId(doc.id);
      setDocumento(doc.documento || ""); setCfop(doc.cfop || ""); setChaveAcesso(doc.chave_acesso || ""); setDataEmissao(doc.data_emissao || "");
      setLocalDestino(movs?.[0]?.local_id || ""); setModalidadeFrete(doc.modalidade_frete || "0 - CIF"); setValorFrete(doc.valor_frete || 0);
      setValorIcms(doc.valor_icms || 0); setValorIcmsSt(doc.valor_icms_st || 0); setValorIpi(doc.valor_ipi || 0); setValorPis(doc.valor_pis || 0);
      setValorCofins(doc.valor_cofins || 0); setValorOutros(doc.valor_impostos || 0);
      setFornecedorId(doc.fornecedor_id); setFornecedorBusca(doc.fornecedor_texto || "");
      
      const { data: finData } = await supabase.from('fin_lancamentos').select('*').eq('documento_origem', doc.documento).eq('status', 'Pendente').order('data_vencimento', { ascending: true });
      if (finData && finData.length > 0) {
          setGerarFinanceiro(true);
          const mapFaturas = finData.map((f, i) => ({ numero: String(i + 1), vencimento: f.data_vencimento, valor: Number(f.valor) }));
          setFaturas(mapFaturas);
          setFormaPagamento(finData[0].forma_pagamento || "Boleto");
          setCentroCusto(finData[0].centro_custo || "ShowRoom / Geral");
          setCategoriaFinId(finData[0].categoria_id || "");
      } else {
          setGerarFinanceiro(false); setFaturas([]);
      }

      setItens(itensMapeados); setAbaAtiva("receber"); setModo("formulario");
    } catch (e: any) { alert(e.message); } finally { setCarregandoDetalhes(false); }
  };

  const cancelarEdicao = () => { limparFormulario(); setAbaAtiva("historico"); };

const processarDocumentoComIA = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCarregandoLeituraDoc(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // ATENÇÃO: Garanta que esta URL é a URL de TESTE ou PRODUÇÃO correta do seu n8n
      const resposta = await fetch("https://n8n01-n8njoaogaia.fdumjq.easypanel.host/webhook-test/vision-docs", {
        method: "POST",
        body: formData
      });
      
      if (!resposta.ok) throw new Error("Falha na comunicação com a API de IA do n8n.");

      const jsonStr = await resposta.text();
      const n8nResponse = JSON.parse(jsonStr);

      // 1. Caça o texto do GPT dentro da resposta aninhada do n8n
      let gptText = "";
      if (n8nResponse.output?.[0]?.content?.[0]?.text) {
          gptText = n8nResponse.output[0].content[0].text;
      } else if (Array.isArray(n8nResponse) && n8nResponse[0]?.output?.[0]?.content?.[0]?.text) {
          gptText = n8nResponse[0].output[0].content[0].text;
      } else if (n8nResponse.message?.content) {
          gptText = n8nResponse.message.content;
      } else if (Array.isArray(n8nResponse) && n8nResponse[0]?.message?.content) {
          gptText = n8nResponse[0].message.content;
      } else if (n8nResponse.text) {
          gptText = n8nResponse.text;
      } else {
          gptText = typeof n8nResponse === 'string' ? n8nResponse : JSON.stringify(n8nResponse);
      }

      // 2. Limpa a formatação markdown que a IA adora colocar
      const cleanedJson = gptText.replace(/```json/g, '').replace(/```/g, '').trim();
      const dadosExtraidos = JSON.parse(cleanedJson);

      // 3. Mapeamento Flexível (Entende variações da IA)
      const numDoc = dadosExtraidos.numero_nf || dadosExtraidos.numero_do_pedido || dadosExtraidos.numero || "";
      const dataEmi = dadosExtraidos.data_emissao || dadosExtraidos.data || "";
      const nomeFornecedor = dadosExtraidos.fornecedor || dadosExtraidos.loja || dadosExtraidos.vendedor || "";
      const arrayParcelas = dadosExtraidos.faturas || dadosExtraidos.parcelas || [];
      const arrayItens = dadosExtraidos.itens || [];

      setDocumento(String(numDoc));
      setDataEmissao(dataEmi);
      
      setValorFrete(parseFloat(dadosExtraidos.valor_frete) || 0);
      setValorIcms(parseFloat(dadosExtraidos.valor_icms) || 0);
      setValorIcmsSt(parseFloat(dadosExtraidos.valor_icms_st) || 0);
      setValorIpi(parseFloat(dadosExtraidos.valor_ipi) || 0);
      setValorPis(parseFloat(dadosExtraidos.valor_pis) || 0);
      setValorCofins(parseFloat(dadosExtraidos.valor_cofins) || 0);
      setValorOutros(parseFloat(dadosExtraidos.valor_outros) || 0);

      // Mapeamento de Fornecedor
      if (dadosExtraidos.cnpj || nomeFornecedor) {
          const cnpjFormatado = (dadosExtraidos.cnpj || "").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
          const fornMatch = fornecedoresBD.find(f => f.cnpj_cpf === cnpjFormatado || f.cnpj_cpf === dadosExtraidos.cnpj || (f.nome_fantasia && f.nome_fantasia.toLowerCase() === nomeFornecedor.toLowerCase()));
          if (fornMatch) { 
              setFornecedorId(fornMatch.id); 
              setFornecedorBusca(`[${fornMatch.codigo_sequencial}] ${fornMatch.nome_fantasia || fornMatch.razao_social}`); 
          } else { 
              setFornecedorId(null); 
              setFornecedorBusca(nomeFornecedor); 
          }
      }

      // Mapeamento Financeiro (Faturas/Parcelas)
      if (arrayParcelas.length > 0) {
          setGerarFinanceiro(true);
          const faturasFormatadas: FaturaXML[] = arrayParcelas.map((f: any, idx: number) => ({
              numero: f.numero || String(idx + 1),
              vencimento: f.vencimento || f.data_vencimento || "",
              valor: parseFloat(f.valor) || 0
          }));
          setFaturas(faturasFormatadas);
      } else {
          setGerarFinanceiro(false); setFaturas([]);
      }

      // Mapeamento de Itens
      if (arrayItens.length > 0) {
          const novosItens: ItemEntrada[] = [];
          
          arrayItens.forEach((item: any) => {
              const qCom = parseFloat(item.quantidade) || 0;
              const vUnCom = parseFloat(item.valor_unitario) || 0;
              const match = produtosBD.find(p => p.sku === item.sku || p.sku === item.codigo);

              if (match) {
                  novosItens.push({ 
                      produtoId: match.id, sku: match.sku, nome: match.nome, rastreiaSerie: match.rastreia_serie, 
                      quantidade: qCom, qtdEmbalagem: qCom, fatorConversao: match.fator_conversao || 1, 
                      custo: vUnCom, custoEmbalagem: vUnCom, series: [] 
                  });
              } else {
                  novosItens.push({ 
                      produtoId: "", sku: item.sku || item.codigo || "", nome: "", rastreiaSerie: false, 
                      quantidade: qCom, qtdEmbalagem: qCom, fatorConversao: 1, 
                      custo: vUnCom, custoEmbalagem: vUnCom, series: [], precisaMapeamento: true, nomeOriginalXML: item.nome || item.descricao 
                  });
              }
          });
          setItens(prev => [...prev, ...novosItens]);
      }

    } catch (error: any) {
        alert("Erro na interpretação da IA: Verifique se o arquivo é legível ou se a API do n8n está respondendo. Detalhe: " + error.message);
    } finally {
        setCarregandoLeituraDoc(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
          produtoId: produtoEncontrado.id, sku: produtoEncontrado.sku, nome: produtoEncontrado.nome, rastreiaSerie: produtoEncontrado.rastreia_serie, 
          quantidade: 1 * (produtoEncontrado.fator_conversao || 1), qtdEmbalagem: 1, fatorConversao: produtoEncontrado.fator_conversao || 1, 
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

  const salvarEntrada = async () => {
    if (!fornecedorBusca || !documento) return alert("Fornecedor e Número da NF são obrigatórios.");
    if (!localDestino) return alert("Selecione o Local de Destino.");
    if (itens.length === 0) return alert("Adicione produtos na entrada.");
    if (gerarFinanceiro && faturas.length === 0) return alert("Para gerar o Financeiro, adicione parcelas.");

    for (let i = 0; i < itens.length; i++) {
      if (itens[i].precisaMapeamento) return alert(`Mapeie o item: "${itens[i].nomeOriginalXML}" antes de salvar.`);
      if (itens[i].rastreiaSerie && itens[i].series.length !== itens[i].quantidade) return alert(`Produto "${itens[i].nome}" exige ${itens[i].quantidade} séries.`);
    }

    setSalvando(true);
    const valorTotalProdutos = itens.reduce((acc, item) => acc + (item.qtdEmbalagem * item.custoEmbalagem), 0);
    const valorTotalNota = valorTotalProdutos + valorFrete + valorIpi + valorIcmsSt;

    try {
      const cabecalho = {
        tipo_documento: 'NF-e / Recibo', cfop, chave_acesso: chaveAcesso || null, documento, data_emissao: dataEmissao || null, 
        fornecedor_id: fornecedorId, fornecedor_texto: fornecedorBusca, modalidade_frete: modalidadeFrete, 
        transportadora_id: transportadoraId, transportadora: transportadoraBusca, valor_frete: valorFrete, 
        valor_icms: valorIcms, valor_icms_st: valorIcmsSt, valor_ipi: valorIpi, valor_pis: valorPis, 
        valor_cofins: valorCofins, valor_impostos: valorOutros, valor_total: valorTotalNota
      };

      let docId;

      if (editandoId) {
         const { data: oldMovs } = await supabase.from('log_movimentacoes').select('produto_id, quantidade').eq('documento_id', editandoId);
         if (oldMovs) {
            for (const mov of oldMovs) {
               const { data: prod } = await supabase.from('log_produtos').select('estoque_atual').eq('id', mov.produto_id).single();
               if (prod) await supabase.from('log_produtos').update({ estoque_atual: Math.max(0, prod.estoque_atual - mov.quantidade) }).eq('id', mov.produto_id);
            }
         }
         await supabase.from('log_ctes').delete().eq('documento_entrada_id', editandoId);
         await supabase.from('log_numeros_serie').delete().eq('documento_entrada', documento);
         await supabase.from('log_movimentacoes').delete().eq('documento_id', editandoId);
         await supabase.from('fin_lancamentos').delete().eq('documento_origem', documento).eq('status', 'Pendente');

         const { error: updateError } = await supabase.from('log_documentos_entrada').update(cabecalho).eq('id', editandoId);
         if (updateError) throw new Error("Erro Cabeçalho: " + updateError.message);
         docId = editandoId;
      } else {
         const { data: docData, error: docError } = await supabase.from('log_documentos_entrada').insert([cabecalho]).select('id').single();
         if (docError) throw new Error("Erro Cabeçalho: " + docError.message);
         docId = docData.id;
      }

      if (gerarFinanceiro) {
          const obsFin = `Referência: Lançamento Nr. ${documento} | CFOP/Operação: ${cfop || 'N/A'}`;
          const payloadFin = faturas.map((fat, idx) => ({
              tipo: 'Despesa',
              descricao: `NF/Doc ${documento} (Parc. ${fat.numero || idx+1}) - ${fornecedorBusca.split(']')[1]?.trim() || fornecedorBusca}`,
              valor: fat.valor,
              valor_bruto: fat.valor,
              data_emissao: dataEmissao || null,
              data_vencimento: fat.vencimento,
              status: 'Pendente',
              fornecedor_id: fornecedorId,
              categoria_id: categoriaFinId || null,
              documento_origem: documento,
              observacoes: obsFin,
              centro_custo: centroCusto,
              forma_pagamento: formaPagamento,
              valor_impostos: idx === 0 ? (valorIcms + valorIpi + valorIcmsSt + valorPis + valorCofins) : 0 
          }));
          const { error: finError } = await supabase.from('fin_lancamentos').insert(payloadFin);
          if (finError) throw new Error("Erro ao integrar com o Financeiro: " + finError.message);
      }

      if ((modalidadeFrete === '1 - FOB' || modalidadeFrete === '2 - Terceiros') && cteNumero) {
          await supabase.from('log_ctes').insert({ numero_cte: cteNumero, chave_acesso: cteChave, transportadora_id: transportadoraId, documento_entrada_id: docId, tipo_frete: 'Inbound/Compra', valor_frete: valorFrete, data_emissao: dataEmissao || null });
      }

      for (const item of itens) {
        await supabase.from('log_movimentacoes').insert({ 
            produto_id: item.produtoId, 
            tipo: 'Entrada', 
            quantidade: item.quantidade, 
            custo_unitario: item.custo, 
            documento_id: docId, 
            local_id: localDestino, 
            documento: documento, 
            fornecedor_cliente: fornecedorBusca,
            usuario_nome: usuarioAtual,
            centro_custo: centroCusto || 'Geral'
        });
        
        if (item.rastreiaSerie && item.series.length > 0) {
          const payloadSeries = item.series.map(s => ({ produto_id: item.produtoId, numero_serie: s, status: 'Em Estoque', documento_entrada: documento, local_id: localDestino }));
          await supabase.from('log_numeros_serie').insert(payloadSeries);
        }
        const { data: prodData } = await supabase.from('log_produtos').select('estoque_atual').eq('id', item.produtoId).single();
        const novoEstoque = (prodData?.estoque_atual || 0) + item.quantidade;
        await supabase.from('log_produtos').update({ estoque_atual: novoEstoque, custo_base: item.custo }).eq('id', item.produtoId);
      }

      alert("Entrada registrada e integrada ao Financeiro com sucesso!");
      limparFormulario();
      fetchHistorico();
      setAbaAtiva("historico");
    } catch (error: any) { alert("Houve um erro técnico: \n" + error.message); } 
    finally { setSalvando(false); }
  };

  const docsFiltrados = historicoDocs.filter(d => {
    const termo = buscaHistorico.toLowerCase();
    return (d.documento?.toLowerCase() || "").includes(termo) || (d.fornecedor_texto?.toLowerCase() || "").includes(termo) || (d.chave_acesso?.toLowerCase() || "").includes(termo);
  });

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto mb-12 relative">
        <datalist id="lista-produtos-bd">{produtosBD.map((p) => <option key={p.id} value={`${p.sku || 'S/N'} - ${p.nome}`} />)}</datalist>
        <input type="file" accept=".xml,.pdf,image/*" ref={fileInputRef} style={{ display: "none" }} onChange={processarDocumentoComIA} />

        {/* LOADING OVERLAY DA IA */}
        {carregandoLeituraDoc && (
          <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm text-white">
            <Bot className="w-16 h-16 animate-bounce text-indigo-400 mb-4" />
            <h2 className="text-xl font-bold">A Inteligência Artificial está lendo o documento...</h2>
            <p className="text-slate-300 mt-2">Isso pode levar alguns segundos. Extraindo dados, valores e faturas.</p>
          </div>
        )}

        <div className="flex border-b border-slate-200">
          <button onClick={() => { setAbaAtiva("receber"); setModo("formulario"); }} className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${abaAtiva === "receber" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500"}`}>
            <div className="flex items-center gap-2"><PackageOpen className="w-4 h-4"/> {editandoId ? "Editando Recebimento" : "Novo Recebimento"}</div>
          </button>
          <button onClick={() => { setAbaAtiva("historico"); setModo("formulario"); }} className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${abaAtiva === "historico" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500"}`}>
            <div className="flex items-center gap-2"><History className="w-4 h-4"/> Histórico de Entradas</div>
          </button>
        </div>

        {/* ABA RECEBER: FORMULÁRIO OU BIPAGEM */}
        {abaAtiva === "receber" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">{editandoId ? "Modo Edição" : "Lançamento de Mercadorias"}</h1>
                <p className="text-slate-500">Importe XML ou Documentos PDF/Imagem para alimentar Estoque e Financeiro com IA.</p>
              </div>
              {modo === "formulario" ? (
                <div className="flex items-center gap-3">
                  {!editandoId && <Button variant="outline" onClick={limparFormulario} className="gap-2 text-slate-600 hover:text-red-600 hover:bg-red-50 border-slate-200 shadow-sm"><Eraser className="w-4 h-4" /> Limpar Tela</Button>}
                  {editandoId && <Button variant="outline" onClick={cancelarEdicao} className="gap-2 text-slate-600 hover:text-red-600 hover:bg-red-50 border-slate-200 shadow-sm"><X className="w-4 h-4" /> Cancelar Edição</Button>}
                  
                  {/* NOVO BOTÃO DE IA */}
                  <Button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm font-bold">
                    <Bot className="w-4 h-4" /> Leitura Inteligente (XML/PDF/Img)
                  </Button>
                </div>
              ) : (<Button variant="outline" onClick={() => setModo("formulario")} className="gap-2"><ArrowLeft className="w-4 h-4"/> Voltar</Button>)}
            </div>

            {modo === "formulario" && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600"/> Dados da Nota Fiscal / Documento</h3>
                  </div>
                  
                  {/* CABEÇALHO BÁSICO */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-semibold text-slate-700">Fornecedor / Emitente</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input value={fornecedorBusca} onChange={e => { setFornecedorBusca(e.target.value); setFornecedorId(null); setMostrarDropdownFornecedor(true); }} onFocus={() => setMostrarDropdownFornecedor(true)} onBlur={() => setTimeout(() => setMostrarDropdownFornecedor(false), 200)} placeholder="Buscar Razão, Fantasia..." className={fornecedorId ? "bg-emerald-50 border-emerald-200" : "bg-white"} />
                          {mostrarDropdownFornecedor && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-xl max-h-60 overflow-y-auto">
                              {fornecedoresFiltrados.map(f => (
                                  <div key={f.id} className="p-3 hover:bg-slate-50 cursor-pointer border-b" onClick={() => selecionarFornecedor(f)}>
                                    <p className="text-sm font-bold text-slate-800">#{f.codigo_sequencial} {f.nome_fantasia || f.razao_social}</p>
                                  </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button variant="outline" onClick={() => window.open('/fornecedores', '_blank')} className="shrink-0 gap-1 text-indigo-700 border-indigo-200 hover:bg-indigo-50"><Plus className="w-4 h-4" /> Novo</Button>
                      </div>
                    </div>
                    <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">Nº do Doc.</label><Input value={documento} onChange={e => setDocumento(e.target.value)} /></div>
                    <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">Data Emissão</label><Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} /></div>
                    <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">CFOP/Nat.Op</label><Input value={cfop} onChange={e => setCfop(e.target.value)} /></div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2"><Calculator className="w-4 h-4"/> Impostos</h4>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                      <div className="space-y-1"><label className="text-xs font-medium text-slate-500">Valor ICMS</label><Input type="number" step="0.01" value={valorIcms} onChange={e => setValorIcms(parseFloat(e.target.value)||0)} className="h-8 text-sm" /></div>
                      <div className="space-y-1"><label className="text-xs font-medium text-slate-500">ICMS ST</label><Input type="number" step="0.01" value={valorIcmsSt} onChange={e => setValorIcmsSt(parseFloat(e.target.value)||0)} className="h-8 text-sm bg-slate-50" /></div>
                      <div className="space-y-1"><label className="text-xs font-medium text-slate-500">Valor IPI</label><Input type="number" step="0.01" value={valorIpi} onChange={e => setValorIpi(parseFloat(e.target.value)||0)} className="h-8 text-sm bg-slate-50" /></div>
                      <div className="space-y-1"><label className="text-xs font-medium text-slate-500">Valor PIS</label><Input type="number" step="0.01" value={valorPis} onChange={e => setValorPis(parseFloat(e.target.value)||0)} className="h-8 text-sm" /></div>
                      <div className="space-y-1"><label className="text-xs font-medium text-slate-500">COFINS</label><Input type="number" step="0.01" value={valorCofins} onChange={e => setValorCofins(parseFloat(e.target.value)||0)} className="h-8 text-sm" /></div>
                      <div className="space-y-1"><label className="text-xs font-medium text-slate-500">Outros Val.</label><Input type="number" step="0.01" value={valorOutros} onChange={e => setValorOutros(parseFloat(e.target.value)||0)} className="h-8 text-sm bg-slate-100" /></div>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-3 bg-emerald-50/50 p-2 rounded border border-emerald-100">
                      <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2"><Landmark className="w-5 h-5"/> Integração Financeira (Contas a Pagar)</h4>
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setGerarFinanceiro(!gerarFinanceiro)}>
                          <button type="button" className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${gerarFinanceiro ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${gerarFinanceiro ? 'translate-x-5' : 'translate-x-1'}`} />
                          </button>
                          <label className="text-sm font-bold text-slate-700 cursor-pointer">Gerar Parcela(s)</label>
                      </div>
                    </div>
                    
                    {gerarFinanceiro && (
                        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 shadow-inner space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-emerald-900 uppercase">Forma de Pagamento</label>
                                    <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                                        <SelectTrigger className="bg-white border-emerald-300"><SelectValue /></SelectTrigger>
                                        <SelectContent position="popper" className="z-[99] bg-white"><SelectItem value="Boleto">Boleto Bancário</SelectItem><SelectItem value="PIX">PIX</SelectItem><SelectItem value="Transferência">Transferência Bancária</SelectItem><SelectItem value="Cartão">Cartão de Crédito</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-emerald-900 uppercase">Centro de Custo</label>
                                    <Input value={centroCusto} onChange={e => setCentroCusto(e.target.value)} className="bg-white border-emerald-300" placeholder="Ex: ShowRoom" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-emerald-900 uppercase">Transação Financeira</label>
                                    <Select value={categoriaFinId} onValueChange={setCategoriaFinId}>
                                        <SelectTrigger className="bg-white border-emerald-300"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                                        <SelectContent position="popper" className="z-[99] bg-white max-h-48 overflow-y-auto">
                                            {categoriasFin.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-3 border-t border-emerald-200/60 pt-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1">
                                        <Receipt className="w-3 h-3"/> Parcelas a Pagar ({faturas.length})
                                    </label>
                                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-100" onClick={() => setFaturas([...faturas, {numero: String(faturas.length + 1), vencimento: '', valor: 0}])}>
                                        <Plus className="w-3 h-3 mr-1"/> Adicionar Parcela
                                    </Button>
                                </div>
                                {faturas.length === 0 ? (
                                    <p className="text-xs text-emerald-700 italic bg-white p-3 rounded border border-emerald-100">Nenhuma parcela definida. O sistema gerará 1 parcela única com o valor total da nota para hoje se você salvar assim.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {faturas.map((fat, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-emerald-100 shadow-sm">
                                                <Input value={fat.numero} onChange={e => { const n = [...faturas]; n[idx].numero = e.target.value; setFaturas(n); }} placeholder="Nº" className="w-20 h-8 text-xs font-bold text-center" />
                                                <Input type="date" value={fat.vencimento} onChange={e => { const n = [...faturas]; n[idx].vencimento = e.target.value; setFaturas(n); }} className="w-40 h-8 text-xs" />
                                                <Input type="number" step="0.01" value={fat.valor} onChange={e => { const n = [...faturas]; n[idx].valor = parseFloat(e.target.value)||0; setFaturas(n); }} className="flex-1 h-8 text-xs font-bold text-emerald-700" placeholder="Valor R$" />
                                                <Button variant="ghost" size="icon" onClick={() => { const n = [...faturas]; n.splice(idx, 1); setFaturas(n); }} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4"/></Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
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
                          <th className="p-3 font-semibold border-b w-24 text-center">Qtd. Emb.</th>
                          <th className="p-3 font-semibold border-b w-24 text-center">Un. / Emb.</th>
                          <th className="p-3 font-semibold border-b w-24 text-center text-indigo-600">Estoque</th>
                          <th className="p-3 font-semibold border-b w-28">Preço Emb. (R$)</th>
                          <th className="p-3 font-semibold border-b w-28 text-indigo-600">Custo Un. (R$)</th>
                          <th className="p-3 font-semibold border-b w-32 text-right">Total Item</th>
                          <th className="p-3 font-semibold border-b w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itens.length === 0 ? (
                          <tr><td colSpan={9} className="p-8 text-center text-slate-400">Nenhum item na nota. Importe via IA ou insira manualmente.</td></tr>
                        ) : (
                          itens.map((item, index) => (
                            <tr key={index} className={item.precisaMapeamento ? 'bg-amber-50/50 text-sm' : 'hover:bg-slate-50 text-sm'}>
                              <td className="p-3">
                                {!item.precisaMapeamento ? (
                                  <><p className="font-semibold text-slate-800 text-sm">{item.nome}</p><p className="text-[10px] text-slate-500 font-mono">SKU: {item.sku}</p></>
                                ) : (
                                  <div className="space-y-2"><p className="text-xs text-amber-700 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Original: {item.nomeOriginalXML}</p><Input list="lista-produtos-bd" placeholder="Vincule ao Catálogo..." className="h-8 text-xs border-amber-300" onChange={(e) => vincularProdutoXML(index, e.target.value)} /></div>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {item.precisaMapeamento ? <span className="text-xs text-amber-600">Pendente</span> : item.rastreiaSerie ? (
                                  <Button size="sm" variant={item.series.length === item.quantidade ? "default" : "secondary"} onClick={() => {setIndexBipagem(index); setModo("bipagem");}} className={`h-7 text-[10px] w-full px-1 ${item.series.length === item.quantidade ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>{item.series.length === item.quantidade ? <CheckCircle2 className="w-3 h-3"/> : <Barcode className="w-3 h-3" />} {item.series.length}/{item.quantidade}</Button>
                                ) : <span className="text-[10px] text-slate-400">Lote</span>}
                              </td>
                              <td className="p-3"><Input type="number" value={item.qtdEmbalagem} onChange={e => atualizarItemConversao(index, 'qtdEmbalagem', parseFloat(e.target.value)||0)} className="h-8 text-center text-xs" /></td>
                              <td className="p-3"><Input type="number" value={item.fatorConversao} onChange={e => atualizarItemConversao(index, 'fatorConversao', parseInt(e.target.value)||1)} className="h-8 text-center text-xs" /></td>
                              <td className="p-3 text-center font-bold text-indigo-600 bg-indigo-50/30 text-xs">{item.quantidade}</td>
                              <td className="p-3"><Input type="number" step="0.01" value={item.custoEmbalagem} onChange={e => atualizarItemConversao(index, 'custoEmbalagem', parseFloat(e.target.value)||0)} className="h-8 text-xs" /></td>
                              <td className="p-3 text-indigo-700 font-semibold italic text-xs">R$ {item.custo.toFixed(4).replace('.',',')}</td>
                              <td className="p-3 text-right font-bold text-xs">R$ {(item.qtdEmbalagem * item.custoEmbalagem).toFixed(2).replace('.',',')}</td>
                              <td className="p-3 text-center"><Button variant="ghost" size="icon" onClick={() => { const n = [...itens]; n.splice(index, 1); setItens(n); }} className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {(itens.length > 0 || editandoId) && (
                  <div className="flex justify-between items-center bg-stone-800 p-4 rounded-xl text-white shadow-lg flex-wrap gap-4">
                    <div className="flex gap-6 md:gap-8 flex-wrap">
                      <div><p className="text-stone-400 text-xs uppercase tracking-wider">Itens</p><p className="text-lg font-semibold">R$ {itens.reduce((acc, i) => acc + (i.qtdEmbalagem * i.custoEmbalagem), 0).toFixed(2).replace('.', ',')}</p></div>
                      <div><p className="text-stone-400 text-xs uppercase tracking-wider">Frete ({modalidadeFrete.split(' ')[2] || 'CIF'})</p><p className="text-lg font-semibold text-amber-400">R$ {valorFrete.toFixed(2).replace('.', ',')}</p></div>
                      <div><p className="text-stone-400 text-xs uppercase tracking-wider">ST + IPI</p><p className="text-lg font-semibold text-amber-400">R$ {(valorIcmsSt + valorIpi).toFixed(2).replace('.', ',')}</p></div>
                      <div className="pl-4 md:pl-6 border-l border-stone-600"><p className="text-stone-300 text-xs uppercase tracking-wider font-bold">Total da Nota</p><p className="text-2xl font-bold text-emerald-400">R$ {(itens.reduce((acc, i) => acc + (i.qtdEmbalagem * i.custoEmbalagem), 0) + valorFrete + valorIcmsSt + valorIpi).toFixed(2).replace('.', ',')}</p></div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button onClick={salvarEntrada} disabled={salvando || itens.length === 0} className={`${editandoId ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white gap-2 h-12 px-6 flex-1`}>
                            {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 
                            {editandoId ? "Atualizar Entrada e Financeiro" : "Finalizar Recebimento"}
                        </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* BIPAGEM COMPRIMIDA */}
            {modo === "bipagem" && indexBipagem !== null && itens[indexBipagem] && (
               <div className="bg-white rounded-xl border shadow-sm p-8 text-center"><h2 className="text-xl font-bold">{itens[indexBipagem].nome}</h2><Button onClick={() => setModo("formulario")} className="mt-4">Voltar</Button></div>
            )}
          </div>
        )}

        {/* ABA HISTÓRICO */}
        {abaAtiva === "historico" && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            {/* LISTAGEM PRINCIPAL DO HISTÓRICO */}
            {modo !== "detalhe_historico" && (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b flex flex-wrap items-center gap-4 bg-slate-50 justify-between">
                  <div className="relative flex-1 min-w-[200px] max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Buscar por NF, fornecedor ou chave..." value={buscaHistorico} onChange={e => setBuscaHistorico(e.target.value)} className="pl-9 bg-white" /></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                        <th className="p-3 font-semibold border-b">Documento</th>
                        <th className="p-3 font-semibold border-b">Fornecedor</th>
                        <th className="p-3 font-semibold border-b text-right">Valor Total</th>
                        <th className="p-3 font-semibold border-b text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {docsFiltrados.map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3"><p className="font-bold text-slate-800 text-sm">{doc.tipo_documento} {doc.documento}</p></td>
                          <td className="p-3 text-sm text-slate-700">{doc.log_fornecedores?.nome_fantasia || doc.fornecedor_texto}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">R$ {Number(doc.valor_total).toFixed(2).replace('.', ',')}</td>
                          <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                  <Button onClick={() => abrirDetalhesDocumento(doc)} variant="outline" size="icon" className="h-8 w-8 text-indigo-600 border-indigo-200 hover:bg-indigo-50" title="Ver Detalhes"><Eye className="w-4 h-4"/></Button>
                                  <Button onClick={() => carregarParaEdicao(doc)} variant="outline" size="icon" className="h-8 w-8 text-amber-600 border-amber-200 hover:bg-amber-50" title="Editar / Retificar"><Pencil className="w-4 h-4"/></Button>
                                  <Button onClick={() => excluirEntrada(doc)} variant="outline" size="icon" className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50" title="Excluir Entrada"><Trash2 className="w-4 h-4"/></Button>
                              </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PAINEL DE VISUALIZAÇÃO DE DETALHES DA NOTA */}
            {modo === "detalhe_historico" && docSelecionado && (
              <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                    <div>
                        <Button variant="ghost" onClick={() => setModo("formulario")} className="mb-2 p-0 h-auto text-slate-400 hover:text-indigo-600 gap-2"><ArrowLeft className="w-4 h-4"/> Voltar à Lista</Button>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FileText className="w-6 h-6 text-indigo-600"/> Detalhes do Documento</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Valor Total da Nota</p>
                        <p className="text-3xl font-black text-emerald-600">R$ {Number(docSelecionado.valor_total).toFixed(2).replace('.',',')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-lg border border-slate-100">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Fornecedor / Emitente</p>
                        <p className="font-bold text-slate-800">{docSelecionado.log_fornecedores?.nome_fantasia || docSelecionado.fornecedor_texto || '--'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Nº Documento</p>
                            <p className="font-bold text-slate-800">{docSelecionado.documento}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Data de Emissão</p>
                            <p className="font-bold text-slate-800">{docSelecionado.data_emissao ? new Date(docSelecionado.data_emissao).toLocaleDateString('pt-BR', {timeZone:'UTC'}) : '--'}</p>
                        </div>
                    </div>
                    <div className="md:col-span-2 border-t border-slate-200 pt-3 mt-2 grid grid-cols-3 md:grid-cols-6 gap-2">
                        <div><p className="text-[9px] font-bold text-slate-400 uppercase">Frete</p><p className="font-semibold text-xs text-slate-700">R$ {Number(docSelecionado.valor_frete).toFixed(2).replace('.',',')}</p></div>
                        <div><p className="text-[9px] font-bold text-slate-400 uppercase">ICMS</p><p className="font-semibold text-xs text-slate-700">R$ {Number(docSelecionado.valor_icms).toFixed(2).replace('.',',')}</p></div>
                        <div><p className="text-[9px] font-bold text-slate-400 uppercase">ICMS ST</p><p className="font-semibold text-xs text-slate-700">R$ {Number(docSelecionado.valor_icms_st).toFixed(2).replace('.',',')}</p></div>
                        <div><p className="text-[9px] font-bold text-slate-400 uppercase">IPI</p><p className="font-semibold text-xs text-slate-700">R$ {Number(docSelecionado.valor_ipi).toFixed(2).replace('.',',')}</p></div>
                        <div><p className="text-[9px] font-bold text-slate-400 uppercase">PIS/COFINS</p><p className="font-semibold text-xs text-slate-700">R$ {(Number(docSelecionado.valor_pis) + Number(docSelecionado.valor_cofins)).toFixed(2).replace('.',',')}</p></div>
                        <div><p className="text-[9px] font-bold text-slate-400 uppercase">Outros Trib.</p><p className="font-semibold text-xs text-slate-700">R$ {Number(docSelecionado.valor_impostos).toFixed(2).replace('.',',')}</p></div>
                    </div>
                </div>

                <h4 className="font-bold text-slate-700 flex items-center gap-2 border-b pb-2"><PackageOpen className="w-5 h-5 text-indigo-500"/> Produtos que Entraram nesta Nota</h4>
                
                <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider">
                                <th className="p-3 font-semibold border-b">Produto / SKU</th>
                                <th className="p-3 font-semibold border-b">Local de Destino</th>
                                <th className="p-3 font-semibold border-b text-center">Quantidade</th>
                                <th className="p-3 font-semibold border-b text-right">Custo Un. (R$)</th>
                                <th className="p-3 font-semibold border-b text-right">Total (R$)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {carregandoDetalhes ? <tr><td colSpan={5} className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr> : itensDocSelecionado.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3">
                                        <p className="font-bold text-slate-800">{item.log_produtos?.nome || 'Produto Desconhecido'}</p>
                                        <p className="text-[10px] font-mono text-slate-500">{item.log_produtos?.sku || 'S/N'}</p>
                                    </td>
                                    <td className="p-3 text-xs font-medium text-slate-600">{item.log_locais?.nome || 'Não especificado'}</td>
                                    <td className="p-3 text-center font-bold text-indigo-600">{item.quantidade}</td>
                                    <td className="p-3 text-right text-xs">R$ {Number(item.custo_unitario).toFixed(4).replace('.',',')}</td>
                                    <td className="p-3 text-right font-bold text-slate-700">R$ {(item.quantidade * Number(item.custo_unitario)).toFixed(2).replace('.',',')}</td>
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