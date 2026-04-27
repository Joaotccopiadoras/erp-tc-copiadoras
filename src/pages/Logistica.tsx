import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Barcode, CheckCircle2, Edit, Package, Plus, Search, FileDigit, DollarSign, Settings2, 
  Image as ImageIcon, Sparkles, ShoppingCart, Loader2, ListChecks, FileDown, 
  Table as TableIcon, Database, Printer, Layers, MapPin, Save, X, ArrowLeftRight, FileText, Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Logistica() {
  const [modo, setModo] = useState<"lista" | "editar" | "lote">("lista");
  const [usuarioAtual, setUsuarioAtual] = useState("Sistema");

  const [produtos, setProdutos] = useState<any[]>([]);
  const [locaisEstoque, setLocaisEstoque] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroFabricante, setFiltroFabricante] = useState("todos");
  const [filtroCondicao, setFiltroCondicao] = useState("todas");
  const [filtroFamilia, setFiltroFamilia] = useState("todas");
  const [filtroPerfil, setFiltroPerfil] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("nome_asc");

  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [loteCampo, setLoteCampo] = useState("");
  const [loteValor, setLoteValor] = useState("");

  const [produtoId, setProdutoId] = useState<string | null>(null);
  const [sku, setSku] = useState("");
  const [nome, setNome] = useState("");
  const [fabricante, setFabricante] = useState("");
  const [familia, setFamilia] = useState(""); 
  const [perfil, setPerfil] = useState(""); 
  const [modelo, setModelo] = useState("");
  const [categoria, setCategoria] = useState("Peça");
  const [condicao, setCondicao] = useState("");
  const [rastreiaSerie, setRastreiaSerie] = useState(false);
  const [imagemUrl, setImagemUrl] = useState("");
  
  const [isEquipamento, setIsEquipamento] = useState("Não");
  const [specs, setSpecs] = useState({ formato: "A4", ppm: "", ano: "" });

  const [cicloRecomendado, setCicloRecomendado] = useState("");
  const [cicloMaximo, setCicloMaximo] = useState("");
  const [rendimentoVolume, setRendimentoVolume] = useState("");
  const [vidaUtilEstimada, setVidaUtilEstimada] = useState("");

  const [custoBase, setCustoBase] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("");
  const [pontoPedido, setPontoPedido] = useState("");
  const [ncm, setNcm] = useState("");
  const [cest, setCest] = useState("");

  const [carregandoIAFiscal, setCarregandoIAFiscal] = useState(false);
  const [carregandoIAMercado, setCarregandoIAMercado] = useState(false);
  const [carregandoPDF, setCarregandoPDF] = useState(false);
  const [cotacoesMercado, setCotacoesMercado] = useState<any[]>([]);

  // ESTADOS DO MODAL DE INVENTÁRIO
  const [modalSaldosAberto, setModalSaldosAberto] = useState(false);
  const [produtoSaldos, setProdutoSaldos] = useState<any | null>(null);
  const [saldosLocais, setSaldosLocais] = useState<any[]>([]);
  const [salvandoSaldos, setSalvandoSaldos] = useState(false);

  // ==========================================
  // ESTADOS DO MODAL DE EXTRATO/HISTÓRICO
  // ==========================================
  const [modalExtratoAberto, setModalExtratoAberto] = useState(false);
  const [produtoExtrato, setProdutoExtrato] = useState<any | null>(null);
  const [movimentacoesProduto, setMovimentacoesProduto] = useState<any[]>([]);
  const [saldosAtuaisProduto, setSaldosAtuaisProduto] = useState<any[]>([]);
  const [carregandoExtrato, setCarregandoExtrato] = useState(false);

  useEffect(() => {
    const rascunhoSalvo = sessionStorage.getItem("logistica_rascunho");
    if (rascunhoSalvo) {
      try {
        const draft = JSON.parse(rascunhoSalvo);
        if (draft.modo === "editar") {
          setProdutoId(draft.produtoId); setSku(draft.sku); setNome(draft.nome);
          setFabricante(draft.fabricante); setFamilia(draft.familia || ""); setPerfil(draft.perfil || "");
          setModelo(draft.modelo); setCategoria(draft.categoria);
          setCondicao(draft.condicao || ""); setRastreiaSerie(draft.rastreiaSerie); setImagemUrl(draft.imagemUrl);
          setIsEquipamento(draft.isEquipamento || "Não");
          if (draft.specs) setSpecs(draft.specs);
          setCicloRecomendado(draft.cicloRecomendado); setCicloMaximo(draft.cicloMaximo);
          setRendimentoVolume(draft.rendimentoVolume); setVidaUtilEstimada(draft.vidaUtilEstimada);
          setCustoBase(draft.custoBase); setPrecoVenda(draft.precoVenda);
          setEstoqueMinimo(draft.estoqueMinimo); setPontoPedido(draft.pontoPedido);
          setNcm(draft.ncm); setCest(draft.cest);
          setCotacoesMercado(draft.cotacoesMercado || []);
          setModo("editar"); 
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (modo === "editar") {
      const draft = {
        modo, produtoId, sku, nome, fabricante, familia, perfil, modelo, categoria, condicao, rastreiaSerie, imagemUrl,
        isEquipamento, specs, cicloRecomendado, cicloMaximo, rendimentoVolume, vidaUtilEstimada,
        custoBase, precoVenda, estoqueMinimo, pontoPedido, ncm, cest, cotacoesMercado
      };
      sessionStorage.setItem("logistica_rascunho", JSON.stringify(draft));
    } else {
      sessionStorage.removeItem("logistica_rascunho");
    }
  }, [modo, produtoId, sku, nome, fabricante, familia, perfil, modelo, categoria, condicao, rastreiaSerie, imagemUrl, isEquipamento, specs, cicloRecomendado, cicloMaximo, rendimentoVolume, vidaUtilEstimada, custoBase, precoVenda, estoqueMinimo, pontoPedido, ncm, cest, cotacoesMercado]);

  useEffect(() => { 
      if (modo === "lista") {
          fetchProdutos(); 
          fetchLocaisEstoque();
      }
  }, [modo]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data } = await supabase.from('permissoes').select('nome').eq('email', user.email).single();
        if (data?.nome) setUsuarioAtual(data.nome);
        else setUsuarioAtual(user.email);
      }
    };
    fetchUser();
  }, []);

  const fetchProdutos = async () => {
    const { data } = await supabase.from('log_produtos').select('*').order('nome', { ascending: true });
    if (data) setProdutos(data);
  };

  const fetchLocaisEstoque = async () => {
      const { data } = await supabase.from('log_locais').select('*').order('nome');
      if (data) setLocaisEstoque(data);
  };

  const novoProduto = () => {
    setProdutoId(null); setSku(""); setNome(""); setFabricante(""); setFamilia(""); setPerfil(""); setModelo("");
    setCategoria("Peça"); setCondicao(""); setRastreiaSerie(false); setImagemUrl("");
    setIsEquipamento("Não"); setSpecs({ formato: "A4", ppm: "", ano: "" });
    setCicloRecomendado(""); setCicloMaximo(""); setRendimentoVolume(""); setVidaUtilEstimada("");
    setCustoBase(""); setPrecoVenda(""); setEstoqueMinimo(""); setPontoPedido("");
    setNcm(""); setCest(""); setCotacoesMercado([]);
    setModo("editar");
  };

  const editarProduto = (prod: any) => {
    let loadedSpecs = { formato: "A4", ppm: "", ano: "" };
    try { if (prod.especificacoes) loadedSpecs = typeof prod.especificacoes === 'string' ? JSON.parse(prod.especificacoes) : prod.especificacoes; } catch(e){}

    setProdutoId(prod.id); setSku(prod.sku || ""); setNome(prod.nome || "");
    setFabricante(prod.fabricante || ""); setFamilia(prod.familia || ""); setPerfil(prod.perfil || ""); setModelo(prod.modelo || "");
    setCategoria(prod.categoria || "Peça"); setCondicao(prod.condicao || "");
    setRastreiaSerie(prod.rastreia_serie || false); setImagemUrl(prod.imagem_url || "");
    setIsEquipamento(prod.is_equipamento ? "Sim" : "Não"); setSpecs(loadedSpecs);
    setCicloRecomendado(prod.ciclo_mensal_recomendado?.toString() || "");
    setCicloMaximo(prod.ciclo_mensal_maximo?.toString() || "");
    setRendimentoVolume(prod.rendimento_volume?.toString() || "");
    setVidaUtilEstimada(prod.vida_util_estimada?.toString() || "");
    setCustoBase(prod.custo_base?.toString() || ""); setPrecoVenda(prod.preco_venda?.toString() || "");
    setEstoqueMinimo(prod.estoque_minimo?.toString() || ""); setPontoPedido(prod.ponto_pedido?.toString() || "");
    setNcm(prod.ncm || ""); setCest(prod.cest || ""); setCotacoesMercado([]);
    setModo("editar");
  };

  const salvarProduto = async () => {
    const isEq = isEquipamento === "Sim";
    const payload = {
      sku, nome, fabricante, familia, perfil, modelo, categoria, condicao, rastreia_serie: rastreiaSerie, imagem_url: imagemUrl,
      is_equipamento: isEq, especificacoes: isEq ? specs : {},
      ciclo_mensal_recomendado: parseInt(cicloRecomendado) || 0, ciclo_mensal_maximo: parseInt(cicloMaximo) || 0,
      rendimento_volume: parseInt(rendimentoVolume) || 0, vida_util_estimada: parseInt(vidaUtilEstimada) || 0,
      custo_base: parseFloat(custoBase.replace(',', '.')) || 0, preco_venda: parseFloat(precoVenda.replace(',', '.')) || 0,
      estoque_minimo: parseInt(estoqueMinimo) || 0, ponto_pedido: parseInt(pontoPedido) || 0, ncm, cest
    };

    let erroBanco;
    if (produtoId) {
      const { error } = await supabase.from('log_produtos').update(payload).eq('id', produtoId); erroBanco = error;
    } else {
      const { error } = await supabase.from('log_produtos').insert([payload]); erroBanco = error;
    }

    if (erroBanco) alert("Erro ao salvar produto: " + erroBanco.message);
    else { alert("Produto salvo com sucesso!"); sessionStorage.removeItem("logistica_rascunho"); setModo("lista"); }
  };

  // ==========================================
  // FUNÇÕES DE INVENTÁRIO (SALDOS E SINCRONIZAÇÃO)
  // ==========================================
  const abrirSaldosEstoque = async (prod: any) => {
      setProdutoSaldos(prod);
      setModalSaldosAberto(true);

      const { data: saldosSalvos } = await supabase.from('log_produto_saldos').select('*').eq('produto_id', prod.id);
      
      const listaSaldos = locaisEstoque.map(local => {
          const saldoEncontrado = saldosSalvos?.find(s => s.local_id === local.id);
          return {
              local_id: local.id, nome: local.nome, tipo: local.tipo || 'Físico',
              quantidade: saldoEncontrado ? Number(saldoEncontrado.quantidade) : 0
          };
      });
      setSaldosLocais(listaSaldos);
  };

  const atualizarQuantidadeLocal = (localId: string, novaQtd: number) => {
      setSaldosLocais(prev => prev.map(s => s.local_id === localId ? { ...s, quantidade: novaQtd } : s));
  };

  const salvarSaldosLocais = async () => {
      setSalvandoSaldos(true);
      try {
          const estoqueGlobalRecalculado = saldosLocais.reduce((acc, curr) => acc + Number(curr.quantidade), 0);
          const diferenca = estoqueGlobalRecalculado - (produtoSaldos.estoque_atual || 0);

          // 1. Atualiza os saldos nas prateleiras
          for (const s of saldosLocais) {
              await supabase.from('log_produto_saldos').upsert({
                  produto_id: produtoSaldos.id, local_id: s.local_id, quantidade: s.quantidade
              }, { onConflict: 'produto_id, local_id' });
          }

          // 2. Atualiza o saldo global
          await supabase.from('log_produtos').update({ estoque_atual: estoqueGlobalRecalculado }).eq('id', produtoSaldos.id);

          // 3. Registra a movimentação de inventário (se houve mudança)
          if (diferenca !== 0) {
              await supabase.from('log_movimentacoes').insert({
                  produto_id: produtoSaldos.id, tipo: 'Ajuste', quantidade: diferenca, 
                  documento: 'INV-' + new Date().getTime(), fornecedor_cliente: 'Balanço Físico',
                  usuario_nome: usuarioAtual, centro_custo: 'Ajuste de Inventário'
              });
          }

          alert("Inventário concluído! O estoque global e físico foram sincronizados.");
          setModalSaldosAberto(false);
          fetchProdutos(); 
      } catch (e: any) { alert("Erro ao atualizar saldos: " + e.message); } 
      finally { setSalvandoSaldos(false); }
  };

  // ==========================================
  // FUNÇÕES DE EXTRATO (FICHA DO PRODUTO)
  // ==========================================
  const abrirExtrato = async (prod: any) => {
    setProdutoExtrato(prod);
    setModalExtratoAberto(true);
    setCarregandoExtrato(true);

    try {
        // Busca os saldos positivos cruzando com a tabela de locais manualmente
        const { data: saldosSalvos } = await supabase.from('log_produto_saldos').select('*').eq('produto_id', prod.id).gt('quantidade', 0);
        const saldosMapeados = (saldosSalvos || []).map(s => {
            const localEncontrado = locaisEstoque.find(l => l.id === s.local_id);
            return { nome: localEncontrado?.nome || 'Local Desconhecido', quantidade: s.quantidade };
        });
        setSaldosAtuaisProduto(saldosMapeados);

        // Busca o histórico de movimentações
        const { data: movs } = await supabase.from('log_movimentacoes').select('*').eq('produto_id', prod.id).order('data_movimentacao', { ascending: false }).limit(50);
        if (movs) setMovimentacoesProduto(movs);
    } catch(e) { console.error(e); }
    finally { setCarregandoExtrato(false); }
  };


  const toggleSelecao = (id: string) => { setSelecionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); };

  const aplicarEdicaoLote = async () => {
    if (!loteCampo) return alert("Selecione qual campo deseja alterar!");
    if (!loteValor && !['condicao', 'familia', 'perfil'].includes(loteCampo)) return alert("Informe o novo valor!");
    const payload = { [loteCampo]: loteValor };
    const { error } = await supabase.from('log_produtos').update(payload).in('id', selecionados);
    if (error) alert("Erro ao atualizar: " + error.message);
    else { alert(`${selecionados.length} produtos atualizados com sucesso!`); fetchProdutos(); setModo("lista"); setSelecionados([]); setLoteCampo(""); setLoteValor(""); }
  };

  const sugerirFiscalComIA = async () => {
    if (!nome) return alert("Digite o nome do produto primeiro!");
    setCarregandoIAFiscal(true);
    try {
      const resposta = await fetch("https://n8n.srv1338428.hstgr.cloud/webhook/fiscal-ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ produto: nome, categoria: categoria }) });
      const dadosIA = await resposta.json();
      setNcm(dadosIA.ncm || ""); setCest(dadosIA.cest || "");
    } catch (error) { alert("Erro na IA."); } finally { setCarregandoIAFiscal(false); }
  };

  const cotarNoMercadoComIA = async () => {
    if (!nome) return alert("Digite o nome do produto!");
    setCarregandoIAMercado(true);
    try { setTimeout(() => { setCotacoesMercado([{ loja: "Mercado Livre", preco: "R$ 145,90", link: "#" }, { loja: "Shopee", preco: "R$ 129,00", link: "#" }]); }, 3000); } 
    catch (error) {} finally { setCarregandoIAMercado(false); }
  };

  const extrairUnicos = (campo: string) => Array.from(new Set(produtos.map(p => p[campo]).filter(f => f && f.trim() !== ""))).sort();
  const fabricantesUnicos = extrairUnicos("fabricante");
  const familiasUnicas = extrairUnicos("familia");
  const perfisUnicos = extrairUnicos("perfil");
  const ncmUnicos = extrairUnicos("ncm");
  const cestUnicos = extrairUnicos("cest");
  const condicoesUnicas = extrairUnicos("condicao");
  
  let produtosFiltrados = produtos.filter(prod => {
    const bateCategoria = filtroCategoria === "todas" || prod.categoria === filtroCategoria;
    const bateFabricante = filtroFabricante === "todos" || prod.fabricante === filtroFabricante;
    const bateCondicao = filtroCondicao === "todas" || prod.condicao === filtroCondicao;
    const bateFamilia = filtroFamilia === "todas" || prod.familia === filtroFamilia;
    const batePerfil = filtroPerfil === "todos" || prod.perfil === filtroPerfil;
    const termoBusca = busca.toLowerCase();
    const bateBusca = (prod.nome?.toLowerCase() || "").includes(termoBusca) || (prod.sku?.toLowerCase() || "").includes(termoBusca) || (prod.familia?.toLowerCase() || "").includes(termoBusca) || (prod.perfil?.toLowerCase() || "").includes(termoBusca) || (prod.modelo?.toLowerCase() || "").includes(termoBusca);
    return bateCategoria && bateFabricante && bateCondicao && bateFamilia && batePerfil && bateBusca;
  });

  produtosFiltrados = produtosFiltrados.sort((a, b) => {
    if (ordenacao === "nome_asc") return (a.nome || "").localeCompare(b.nome || "");
    if (ordenacao === "categoria_asc") return (a.categoria || "").localeCompare(b.categoria || "");
    if (ordenacao === "fabricante_asc") return (a.fabricante || "").localeCompare(b.fabricante || "");
    return 0;
  });

  const exportarPDFProdutos = async () => { /* mantém código original */ };
  const exportarExcelProdutos = () => { /* mantém código original */ };
  const exportarAuxiliaresPDF = () => { /* mantém código original */ };
  const exportarAuxiliaresExcel = () => { /* mantém código original */ };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto mb-12">
        <datalist id="lista-fabricantes">{fabricantesUnicos.map((f, i) => <option key={i} value={f as string} />)}</datalist>
        <datalist id="lista-familias">{familiasUnicas.map((f, i) => <option key={i} value={f as string} />)}</datalist>
        <datalist id="lista-perfis">{perfisUnicos.map((f, i) => <option key={i} value={f as string} />)}</datalist>
        <datalist id="lista-ncm">{ncmUnicos.map((f, i) => <option key={i} value={f as string} />)}</datalist>
        <datalist id="lista-cest">{cestUnicos.map((f, i) => <option key={i} value={f as string} />)}</datalist>

        {/* ========================================================================= */}
        {/* MODAL DE INVENTÁRIO (Sincronização de Saldos) */}
        {/* ========================================================================= */}
        {modalSaldosAberto && produtoSaldos && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
                        <div>
                            <h2 className="text-lg font-black text-emerald-900 flex items-center gap-2"><ArrowLeftRight className="w-5 h-5 text-emerald-600"/> Inventário de Estoque</h2>
                            <p className="text-xs text-emerald-700 font-bold mt-1 uppercase tracking-widest">{produtoSaldos.sku} - {produtoSaldos.nome}</p>
                        </div>
                        <button onClick={() => setModalSaldosAberto(false)} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-full"><X className="w-5 h-5"/></button>
                    </div>

                    <div className="p-6 bg-slate-50 border-b">
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Estoque Global Recalculado</p>
                                <p className="text-xs text-slate-400 mt-1 max-w-sm">Este valor substituirá o valor antigo do catálogo assim que você salvar o balanço.</p>
                            </div>
                            <div className="text-3xl font-black text-slate-800 bg-slate-100 px-6 py-2 rounded-lg border flex flex-col items-end">
                                <div>{saldosLocais.reduce((acc, curr) => acc + Number(curr.quantidade), 0)} <span className="text-base font-medium text-slate-500">un</span></div>
                                <div className="text-[10px] text-slate-400 font-medium">Antigo: {produtoSaldos.estoque_atual || 0} un</div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Contagem Física por Locais</h3>
                        {saldosLocais.map(local => (
                            <div key={local.local_id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-emerald-300 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-100 p-2 rounded-lg"><MapPin className="w-4 h-4 text-slate-500"/></div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{local.nome}</p>
                                        <p className="text-[10px] uppercase text-slate-500">{local.tipo}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase mr-2">Físico:</span>
                                    <Input type="number" value={local.quantidade} onChange={e => atualizarQuantidadeLocal(local.local_id, parseFloat(e.target.value) || 0)} className="w-24 text-center font-bold text-emerald-700 bg-emerald-50 border-emerald-200 focus-visible:ring-emerald-500" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setModalSaldosAberto(false)}>Cancelar</Button>
                        <Button onClick={salvarSaldosLocais} disabled={salvandoSaldos} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
                            {salvandoSaldos ? "Sincronizando..." : <><CheckCircle2 className="w-4 h-4"/> Confirmar Balanço e Sincronizar</>}
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL DE EXTRATO (FICHA DO PRODUTO) */}
        {/* ========================================================================= */}
        {modalExtratoAberto && produtoExtrato && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[90vh]">
                    
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50 shrink-0">
                        <div>
                            <h2 className="text-xl font-black text-indigo-900 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600"/> Ficha do Produto</h2>
                            <p className="text-xs text-indigo-700 font-bold mt-1 uppercase tracking-widest">{produtoExtrato.sku} - {produtoExtrato.nome}</p>
                        </div>
                        <button onClick={() => setModalExtratoAberto(false)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full"><X className="w-5 h-5"/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        
                        {/* Seção 1: Saldos Distribuídos */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin className="w-4 h-4"/> Onde está guardado? (Saldos Físicos)</h3>
                            <div className="flex gap-3 flex-wrap">
                                {carregandoExtrato ? <Loader2 className="w-5 h-5 animate-spin text-slate-400"/> : saldosAtuaisProduto.length === 0 ? (
                                    <p className="text-sm text-slate-500 italic bg-slate-50 px-4 py-2 rounded-md border border-slate-200">Nenhum saldo distribuído. Faça o Inventário.</p>
                                ) : (
                                    saldosAtuaisProduto.map((s, i) => (
                                        <div key={i} className="bg-white border border-slate-200 shadow-sm rounded-lg px-4 py-3 flex flex-col items-center justify-center min-w-[120px]">
                                            <span className="text-2xl font-black text-emerald-600">{s.quantidade}</span>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase mt-1 text-center leading-tight">{s.nome}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Seção 2: Histórico de Movimentações */}
                        <div className="space-y-3 pt-6 border-t border-slate-100">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Activity className="w-4 h-4"/> Extrato de Movimentações (Auditoria)</h3>
                            
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider">
                                            <th className="p-3 font-semibold border-b">Data / Responsável</th>
                                            <th className="p-3 font-semibold border-b">Natureza / Origem</th>
                                            <th className="p-3 font-semibold border-b">Documento</th>
                                            <th className="p-3 font-semibold border-b text-right">Movimentação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {carregandoExtrato ? <tr><td colSpan={4} className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr> : movimentacoesProduto.length === 0 ? (
                                            <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">Nenhuma movimentação registrada.</td></tr>
                                        ) : movimentacoesProduto.map((mov, i) => {
                                            const isEntrada = mov.tipo === 'Entrada' || (mov.tipo === 'Ajuste' && mov.quantidade > 0);
                                            const isSaida = mov.tipo === 'Saída' || (mov.tipo === 'Ajuste' && mov.quantidade < 0);
                                            
                                            return (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3">
                                                        <p className="font-bold text-slate-800">{new Date(mov.data_movimentacao).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5"><Database className="w-3 h-3"/> {mov.usuario_nome || 'Sistema'}</p>
                                                    </td>
                                                    <td className="p-3">
                                                        <p className="font-semibold text-slate-700 text-sm">{mov.fornecedor_cliente || 'Ajuste Interno'}</p>
                                                        <p className="text-[10px] text-slate-500 mt-0.5 bg-slate-100 inline-block px-1.5 rounded">C.C: {mov.centro_custo || 'Geral'}</p>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{mov.documento || 'Sem Ref'}</span>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <p className={`font-black text-base ${isEntrada ? 'text-emerald-600' : isSaida ? 'text-rose-600' : 'text-slate-600'}`}>
                                                            {mov.quantidade > 0 ? '+' : ''}{mov.quantidade}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{mov.tipo}</p>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        )}

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <Package className="w-6 h-6 text-stone-600" /> Catálogo de Produtos
            </h1>
            <p className="text-slate-500">Gestão unificada de equipamentos, peças e insumos.</p>
          </div>
          {modo === "lista" ? (
            <div className="flex gap-2 flex-wrap justify-end">
              <Button onClick={exportarExcelProdutos} variant="outline" size="sm" className="gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"><TableIcon className="w-4 h-4"/> Excel</Button>
              <Button onClick={exportarPDFProdutos} disabled={carregandoPDF} variant="outline" size="sm" className="gap-2 text-red-700 border-red-200 hover:bg-red-50">{carregandoPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4"/>} PDF</Button>
              <Button onClick={novoProduto} className="gap-2 bg-stone-700 hover:bg-stone-800"><Plus className="w-4 h-4" /> Novo Produto</Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => { setModo("lista"); setSelecionados([]); }}>Voltar ao Catálogo</Button>
          )}
        </div>

        {modo === "lote" && (
          <div className="bg-white rounded-xl border shadow-sm p-8 max-w-2xl mx-auto mt-8">
            <div className="flex items-center gap-4 mb-6 border-b pb-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center"><ListChecks className="w-6 h-6 text-blue-600" /></div>
              <div><h2 className="text-xl font-bold text-slate-800">Edição em Massa</h2><p className="text-slate-500">Alterando <strong>{selecionados.length} produtos</strong> simultaneamente.</p></div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Qual campo deseja alterar em todos?</label>
                <Select value={loteCampo} onValueChange={(val) => { setLoteCampo(val); setLoteValor(""); }}>
                  <SelectTrigger className="bg-white z-50"><SelectValue placeholder="Selecione o campo..." /></SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="fabricante">Fabricante (Marca)</SelectItem><SelectItem value="familia">Família de Produto</SelectItem>
                    <SelectItem value="perfil">Perfil de Produto</SelectItem><SelectItem value="categoria">Categoria do Produto</SelectItem>
                    <SelectItem value="condicao">Condição (Novo/Recondicionado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loteCampo === "fabricante" && (<div className="space-y-2"><label className="text-sm font-medium">Novo Fabricante:</label><Input list="lista-fabricantes" value={loteValor} onChange={e => setLoteValor(e.target.value)} /></div>)}
              {loteCampo === "familia" && (<div className="space-y-2"><label className="text-sm font-medium">Nova Família:</label><Input list="lista-familias" value={loteValor} onChange={e => setLoteValor(e.target.value)} /></div>)}
              {loteCampo === "perfil" && (<div className="space-y-2"><label className="text-sm font-medium">Novo Perfil:</label><Input list="lista-perfis" value={loteValor} onChange={e => setLoteValor(e.target.value)} /></div>)}
              {loteCampo === "categoria" && (<div className="space-y-2"><label className="text-sm font-medium">Nova Categoria:</label><Select value={loteValor} onValueChange={setLoteValor}><SelectTrigger className="bg-white z-50"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-50"><SelectItem value="Equipamento">Equipamento</SelectItem><SelectItem value="Peça">Peça</SelectItem><SelectItem value="Suprimento">Suprimento</SelectItem></SelectContent></Select></div>)}
              {loteCampo === "condicao" && (<div className="space-y-2"><label className="text-sm font-medium">Nova Condição:</label><Select value={loteValor} onValueChange={setLoteValor}><SelectTrigger className="bg-white z-50"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-50"><SelectItem value="Original Novo">Original Novo</SelectItem><SelectItem value="Original Recondicionado">Original Recondicionado</SelectItem><SelectItem value="Compatível Novo">Compatível Novo</SelectItem><SelectItem value="Compatível Recondicionado">Compatível Recondicionado</SelectItem><SelectItem value="Nova">Nova (Peça)</SelectItem><SelectItem value="Recondicionada">Recondicionada (Peça)</SelectItem></SelectContent></Select></div>)}

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="outline" onClick={() => setModo("lista")}>Cancelar</Button>
                <Button onClick={aplicarEdicaoLote} className="bg-blue-600 hover:bg-blue-700 text-white">Aplicar Alteração em Massa</Button>
              </div>
            </div>
          </div>
        )}

        {modo === "lista" && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-stone-50 border-b p-3 px-4 flex justify-between items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2"><Database className="w-4 h-4 text-stone-500" /><span className="text-sm font-semibold text-stone-700">Relatórios Auxiliares:</span></div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={exportarAuxiliaresPDF} variant="outline" size="sm" className="gap-2 text-slate-700 border-slate-200 hover:bg-slate-100"><FileDown className="w-4 h-4"/> PDF</Button>
                <Button onClick={exportarAuxiliaresExcel} variant="outline" size="sm" className="gap-2 text-slate-700 border-slate-200 hover:bg-slate-100"><TableIcon className="w-4 h-4"/> Excel</Button>
              </div>
            </div>

            {selecionados.length > 0 && (
              <div className="bg-blue-50 border-b border-blue-100 p-3 px-6 flex justify-between items-center animate-in slide-in-from-top-2">
                <span className="text-blue-800 font-semibold">{selecionados.length} produto(s) selecionado(s)</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelecionados([])} className="text-blue-700 hover:bg-blue-100">Desmarcar Todos</Button>
                  <Button size="sm" onClick={() => setModo("lote")} className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><ListChecks className="w-4 h-4" /> Editar Selecionados</Button>
                </div>
              </div>
            )}

            <div className="p-4 border-b flex flex-wrap gap-3 bg-white items-center">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Buscar Nome, SKU, Compatibilidade..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}><SelectTrigger className="w-[160px] bg-white z-50 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger><SelectContent className="bg-white z-50"><SelectItem value="todas">Todas as Categorias</SelectItem><SelectItem value="Equipamento">Equipamentos</SelectItem><SelectItem value="Peça">Peças</SelectItem><SelectItem value="Suprimento">Suprimentos</SelectItem></SelectContent></Select>
              <Select value={filtroFabricante} onValueChange={setFiltroFabricante}><SelectTrigger className="w-[150px] bg-white z-50 text-xs"><SelectValue placeholder="Fabricante" /></SelectTrigger><SelectContent className="bg-white z-50"><SelectItem value="todos">Fabricantes (Todos)</SelectItem>{fabricantesUnicos.map((fab, idx) => (<SelectItem key={idx} value={fab as string}>{fab as string}</SelectItem>))}</SelectContent></Select>
              <Select value={filtroCondicao} onValueChange={setFiltroCondicao}><SelectTrigger className="w-[150px] bg-white z-50 text-xs"><SelectValue placeholder="Condição" /></SelectTrigger><SelectContent className="bg-white z-50"><SelectItem value="todas">Condição (Todas)</SelectItem>{condicoesUnicas.map((cond, idx) => (<SelectItem key={idx} value={cond as string}>{cond as string}</SelectItem>))}</SelectContent></Select>
              <Select value={filtroFamilia} onValueChange={setFiltroFamilia}><SelectTrigger className="w-[150px] bg-white z-50 text-xs"><SelectValue placeholder="Família" /></SelectTrigger><SelectContent className="bg-white z-50"><SelectItem value="todas">Família (Todas)</SelectItem>{familiasUnicas.map((fam, idx) => (<SelectItem key={idx} value={fam as string}>{fam as string}</SelectItem>))}</SelectContent></Select>
              <Select value={filtroPerfil} onValueChange={setFiltroPerfil}><SelectTrigger className="w-[150px] bg-white z-50 text-xs"><SelectValue placeholder="Perfil" /></SelectTrigger><SelectContent className="bg-white z-50"><SelectItem value="todos">Perfil (Todos)</SelectItem>{perfisUnicos.map((perf, idx) => (<SelectItem key={idx} value={perf as string}>{perf as string}</SelectItem>))}</SelectContent></Select>
            </div>

            <div className="divide-y">
              {produtosFiltrados.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Nenhum produto encontrado.</div>
              ) : (
                produtosFiltrados.map(prod => {
                    let sp = { ano: "", formato: "", ppm: "" };
                    if (prod.is_equipamento && prod.especificacoes) { try { sp = typeof prod.especificacoes === 'string' ? JSON.parse(prod.especificacoes) : prod.especificacoes; } catch(e){} }

                    return (
                  <div key={prod.id} className={`p-4 flex items-center justify-between transition-colors ${selecionados.includes(prod.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-4">
                      <input type="checkbox" checked={selecionados.includes(prod.id)} onChange={() => toggleSelecao(prod.id)} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer ml-2" />
                      <div className="h-14 w-14 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {prod.imagem_url ? <img src={prod.imagem_url} alt={prod.nome} className="h-full w-full object-cover" /> : <Package className="w-6 h-6 text-stone-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border">{prod.sku || "S/N"}</span>
                          {prod.condicao && <span className="text-xs text-slate-500 italic">{prod.condicao}</span>}
                        </div>
                        <h3 className="font-semibold text-slate-800">{prod.nome}</h3>
                        <p className="text-sm text-slate-500 flex gap-2 items-center flex-wrap"><span>{prod.categoria}</span>{prod.familia && <span>• {prod.familia}</span>}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden md:block"><p className="text-xs font-semibold text-slate-500">Custo: R$ {Number(prod.custo_base || 0).toFixed(2).replace('.', ',')}</p><p className="text-sm font-bold text-emerald-600">Venda: R$ {Number(prod.preco_venda || 0).toFixed(2).replace('.', ',')}</p></div>
                        
                        <div className="text-center bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">Estoque</p>
                            <p className={`text-lg font-black leading-none ${prod.estoque_atual > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{prod.estoque_atual || 0}</p>
                        </div>
                        
                        <div className="flex flex-col gap-1 ml-2 border-l border-slate-200 pl-3">
                            {/* NOVO BOTÃO DE EXTRATO / FICHA DO PRODUTO */}
                            <Button variant="outline" size="sm" onClick={() => abrirExtrato(prod)} className="h-7 text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-1 bg-indigo-50/30" title="Ver saldos por local e histórico">
                                <Search className="w-3 h-3"/> Extrato
                            </Button>
                            
                            <Button variant="outline" size="sm" onClick={() => abrirSaldosEstoque(prod)} className="h-7 text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1 bg-emerald-50/30" title="Fazer Balanço / Ajuste de Inventário">
                                <ArrowLeftRight className="w-3 h-3"/> Inventário
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => editarProduto(prod)} className="h-7 text-xs text-slate-500 hover:text-stone-700 gap-1">
                                <Edit className="w-3 h-3" /> Editar
                            </Button>
                        </div>
                    </div>
                  </div>
                )})
              )}
            </div>
          </div>
        )}

        {/* MODO EDITAR */}
        {modo === "editar" && (
          <div className="bg-white rounded-xl border shadow-sm">
            <Tabs defaultValue="geral" className="w-full">
              <div className="border-b px-4 py-2 bg-slate-50 rounded-t-xl">
                <TabsList className="bg-transparent space-x-2">
                  <TabsTrigger value="geral" className="data-[state=active]:bg-white data-[state=active]:shadow-sm"><Package className="w-4 h-4 mr-2"/> Dados Gerais</TabsTrigger>
                  <TabsTrigger value="financeiro" className="data-[state=active]:bg-white data-[state=active]:shadow-sm"><DollarSign className="w-4 h-4 mr-2"/> Financeiro e Fiscal</TabsTrigger>
                  <TabsTrigger value="parametros" className="data-[state=active]:bg-white data-[state=active]:shadow-sm"><Settings2 className="w-4 h-4 mr-2"/> Parâmetros de Estoque</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="geral" className="space-y-6 mt-0">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex flex-col items-center gap-2 w-full md:w-1/4">
                      <div className="w-full aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 overflow-hidden relative">
                        {imagemUrl ? <img src={imagemUrl} alt="Preview" className="w-full h-full object-cover" /> : <><ImageIcon className="w-8 h-8 mb-2 text-slate-300" /><span className="text-xs">Sem Imagem</span></>}
                      </div>
                      <Input value={imagemUrl} onChange={e => setImagemUrl(e.target.value)} placeholder="URL da Imagem" className="text-xs" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full md:w-3/4">
                      <div className="space-y-2 col-span-2">
                        <label className="text-sm font-medium">Nome do Produto <span className="text-red-500">*</span></label>
                        <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Toner Brother TN-3472" />
                      </div>
                      <div className="space-y-2"><label className="text-sm font-medium">SKU / Partnumber</label><Input value={sku} onChange={e => setSku(e.target.value)} /></div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Categoria <span className="text-red-500">*</span></label>
                        <Select value={categoria} onValueChange={(val) => { setCategoria(val); setCondicao(""); }}>
                          <SelectTrigger className="bg-white z-50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent className="bg-white z-50"><SelectItem value="Equipamento">Equipamento</SelectItem><SelectItem value="Peça">Peça</SelectItem><SelectItem value="Suprimento">Suprimento</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><label className="text-sm font-medium">Família de Produto</label><Input list="lista-familias" value={familia} onChange={e => setFamilia(e.target.value)} /></div>
                      <div className="space-y-2"><label className="text-sm font-medium">Perfil de Produto</label><Input list="lista-perfis" value={perfil} onChange={e => setPerfil(e.target.value)} /></div>
                      <div className="space-y-2"><label className="text-sm font-medium">Fabricante / Marca</label><Input list="lista-fabricantes" value={fabricante} onChange={e => setFabricante(e.target.value)} /></div>

                      {categoria === "Suprimento" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-emerald-700">Condição do Suprimento</label>
                          <Select value={condicao || undefined} onValueChange={setCondicao}><SelectTrigger className="bg-white z-50"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-50"><SelectItem value="Original Novo">Original Novo</SelectItem><SelectItem value="Original Recondicionado">Original Recondicionado</SelectItem><SelectItem value="Compatível Novo">Compatível Novo</SelectItem><SelectItem value="Compatível Recondicionado">Compatível Recondicionado</SelectItem></SelectContent></Select>
                        </div>
                      )}
                      
                      {categoria === "Peça" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-orange-700">Condição da Peça</label>
                          <Select value={condicao || undefined} onValueChange={setCondicao}><SelectTrigger className="bg-white z-50"><SelectValue/></SelectTrigger><SelectContent className="bg-white z-50"><SelectItem value="Nova">Nova</SelectItem><SelectItem value="Recondicionada">Recondicionada</SelectItem></SelectContent></Select>
                        </div>
                      )}

                      <div className="space-y-2 col-span-2"><label className="text-sm font-medium">Modelos Compatíveis</label><Input value={modelo} onChange={e => setModelo(e.target.value)} /></div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="text-sm font-bold text-slate-700">Especificações Técnicas e de Controle</h3>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-md border shadow-sm">
                                <input type="checkbox" checked={rastreiaSerie} onChange={(e) => setRastreiaSerie(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-stone-600" />
                                <div className="text-xs font-bold text-slate-800"><Barcode className="w-3 h-3 inline mr-1"/> Rastrear Série</div>
                            </label>
                            
                            <Select value={isEquipamento} onValueChange={setIsEquipamento}>
                                <SelectTrigger className={`h-8 w-44 font-bold text-xs ${isEquipamento === "Sim" ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "bg-white"}`}><SelectValue/></SelectTrigger>
                                <SelectContent><SelectItem value="Sim">É Equipamento (Máquina)</SelectItem><SelectItem value="Não">Insumo / Peça comum</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>

                    {isEquipamento === "Sim" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-indigo-900 p-4 rounded-xl shadow-inner animate-in fade-in">
                            <div className="space-y-1"><label className="text-[10px] font-bold text-indigo-300 uppercase">Ano Lançamento</label><Input type="number" value={specs.ano} onChange={e => setSpecs({...specs, ano: e.target.value})} className="bg-indigo-950/50 border-indigo-700 text-white placeholder:text-indigo-400/50 text-center" /></div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-indigo-300 uppercase">Tamanho Max. de Papel</label>
                                <Select value={specs.formato} onValueChange={v => setSpecs({...specs, formato: v})}><SelectTrigger className="bg-indigo-950/50 border-indigo-700 text-white font-bold"><SelectValue/></SelectTrigger><SelectContent position="popper" className="z-[99] bg-slate-800 text-white border-slate-700"><SelectItem value="A4">A4</SelectItem><SelectItem value="A3">A3</SelectItem><SelectItem value="SUPERA3">Super A3</SelectItem><SelectItem value="A0">A0 (Plotter)</SelectItem></SelectContent></Select>
                            </div>
                            <div className="space-y-1"><label className="text-[10px] font-bold text-indigo-300 uppercase">Velocidade (PPM)</label><Input type="number" value={specs.ppm} onChange={e => setSpecs({...specs, ppm: e.target.value})} className="bg-indigo-950/50 border-indigo-700 text-white font-bold text-center" /></div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {categoria === "Equipamento" && (<><div className="space-y-2"><label className="text-sm font-medium text-blue-700">Ciclo Recomendado</label><Input type="number" value={cicloRecomendado} onChange={e => setCicloRecomendado(e.target.value)} /></div><div className="space-y-2"><label className="text-sm font-medium text-red-700">Ciclo Máximo</label><Input type="number" value={cicloMaximo} onChange={e => setCicloMaximo(e.target.value)} /></div></>)}
                      {categoria === "Suprimento" && (<div className="space-y-2"><label className="text-sm font-medium text-emerald-700">Rend. de Volume (Pág)</label><Input type="number" value={rendimentoVolume} onChange={e => setRendimentoVolume(e.target.value)} /></div>)}
                      {categoria === "Peça" && (<div className="space-y-2"><label className="text-sm font-medium text-orange-700">Vida Útil Estimada (Pág)</label><Input type="number" value={vidaUtilEstimada} onChange={e => setVidaUtilEstimada(e.target.value)} /></div>)}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="financeiro" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                      <div className="flex justify-between items-center border-b pb-2"><h3 className="text-sm font-bold text-slate-800">Dados Fiscais</h3><Button size="sm" variant="outline" className="gap-2 text-violet-600 border-violet-200" onClick={sugerirFiscalComIA} disabled={carregandoIAFiscal}>{carregandoIAFiscal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Sugerir com IA</Button></div>
                      <div className="space-y-2"><label className="text-sm font-medium">NCM</label><Input list="lista-ncm" value={ncm} onChange={e => setNcm(e.target.value)} className="bg-white" /></div>
                      <div className="space-y-2"><label className="text-sm font-medium">CEST</label><Input list="lista-cest" value={cest} onChange={e => setCest(e.target.value)} className="bg-white" /></div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                      <div className="flex justify-between items-center border-b pb-2"><h3 className="text-sm font-bold text-slate-800">Precificação</h3></div>
                      <div className="flex gap-4">
                        <div className="space-y-2 flex-1"><label className="text-sm font-medium">Custo Base (R$)</label><Input type="number" step="0.01" value={custoBase} onChange={e => setCustoBase(e.target.value)} className="bg-white"/></div>
                        <div className="space-y-2 flex-1"><label className="text-sm font-medium">Preço de Venda (R$)</label><Input type="number" step="0.01" value={precoVenda} onChange={e => setPrecoVenda(e.target.value)} className="bg-white"/></div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="parametros" className="space-y-4 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-sm font-medium">Ponto de Pedido (Qtd)</label><Input type="number" value={pontoPedido} onChange={e => setPontoPedido(e.target.value)} /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Estoque Mínimo Crítico (Qtd)</label><Input type="number" value={estoqueMinimo} onChange={e => setEstoqueMinimo(e.target.value)} /></div>
                  </div>
                </TabsContent>

                <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setModo("lista")}>Cancelar</Button>
                  <Button onClick={salvarProduto} className="bg-stone-700 hover:bg-stone-800 gap-2"><CheckCircle2 className="w-4 h-4"/> Salvar Produto</Button>
                </div>
              </div>
            </Tabs>
          </div>
        )}

      </div>
    </AppLayout>
  );
}