import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Search, Edit, FileDigit, DollarSign, Settings2, Barcode, Image as ImageIcon, Sparkles, ShoppingCart, Loader2, ListChecks, FileDown, Table as TableIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Logistica() {
  const [modo, setModo] = useState<"lista" | "editar" | "lote">("lista");

  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroFabricante, setFiltroFabricante] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("nome_asc"); // 

  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [loteCampo, setLoteCampo] = useState("");
  const [loteValor, setLoteValor] = useState("");

  const [produtoId, setProdutoId] = useState<string | null>(null);
  const [sku, setSku] = useState("");
  const [nome, setNome] = useState("");
  const [fabricante, setFabricante] = useState("");
  const [modelo, setModelo] = useState("");
  const [categoria, setCategoria] = useState("Peça");
  const [condicao, setCondicao] = useState("");
  const [rastreiaSerie, setRastreiaSerie] = useState(false);
  const [imagemUrl, setImagemUrl] = useState("");
  
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
  const [cotacoesMercado, setCotacoesMercado] = useState<any[]>([]);

  // autosav rasc
  useEffect(() => {
    const rascunhoSalvo = sessionStorage.getItem("logistica_rascunho");
    if (rascunhoSalvo) {
      try {
        const draft = JSON.parse(rascunhoSalvo);
        if (draft.modo === "editar") {
          setProdutoId(draft.produtoId); setSku(draft.sku); setNome(draft.nome);
          setFabricante(draft.fabricante); setModelo(draft.modelo); setCategoria(draft.categoria);
          setCondicao(draft.condicao || ""); setRastreiaSerie(draft.rastreiaSerie); setImagemUrl(draft.imagemUrl);
          setCicloRecomendado(draft.cicloRecomendado); setCicloMaximo(draft.cicloMaximo);
          setRendimentoVolume(draft.rendimentoVolume); setVidaUtilEstimada(draft.vidaUtilEstimada);
          setCustoBase(draft.custoBase); setPrecoVenda(draft.precoVenda);
          setEstoqueMinimo(draft.estoqueMinimo); setPontoPedido(draft.pontoPedido);
          setNcm(draft.ncm); setCest(draft.cest);
          setCotacoesMercado(draft.cotacoesMercado || []);
          setModo("editar"); 
        }
      } catch (e) {
        console.error("Erro ao recuperar rascunho", e);
      }
    }
  }, []);

  useEffect(() => {
    if (modo === "editar") {
      const draft = {
        modo, produtoId, sku, nome, fabricante, modelo, categoria, condicao, rastreiaSerie, imagemUrl,
        cicloRecomendado, cicloMaximo, rendimentoVolume, vidaUtilEstimada,
        custoBase, precoVenda, estoqueMinimo, pontoPedido, ncm, cest, cotacoesMercado
      };
      sessionStorage.setItem("logistica_rascunho", JSON.stringify(draft));
    } else {
      sessionStorage.removeItem("logistica_rascunho");
    }
  }, [modo, produtoId, sku, nome, fabricante, modelo, categoria, condicao, rastreiaSerie, imagemUrl, cicloRecomendado, cicloMaximo, rendimentoVolume, vidaUtilEstimada, custoBase, precoVenda, estoqueMinimo, pontoPedido, ncm, cest, cotacoesMercado]);

  useEffect(() => { if (modo === "lista") fetchProdutos(); }, [modo]);

  const fetchProdutos = async () => {
    const { data, error } = await supabase.from('log_produtos').select('*').order('nome', { ascending: true });
    if (data) setProdutos(data);
    if (error) console.error(error);
  };

  const novoProduto = () => {
    setProdutoId(null); setSku(""); setNome(""); setFabricante(""); setModelo("");
    setCategoria("Peça"); setCondicao(""); setRastreiaSerie(false); setImagemUrl("");
    setCicloRecomendado(""); setCicloMaximo(""); setRendimentoVolume(""); setVidaUtilEstimada("");
    setCustoBase(""); setPrecoVenda(""); setEstoqueMinimo(""); setPontoPedido("");
    setNcm(""); setCest(""); setCotacoesMercado([]);
    setModo("editar");
  };

  const editarProduto = (prod: any) => {
    setProdutoId(prod.id); setSku(prod.sku || ""); setNome(prod.nome || "");
    setFabricante(prod.fabricante || ""); setModelo(prod.modelo || "");
    setCategoria(prod.categoria || "Peça"); setCondicao(prod.condicao || "");
    setRastreiaSerie(prod.rastreia_serie || false); setImagemUrl(prod.imagem_url || "");
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
    const payload = {
      sku, nome, fabricante, modelo, categoria, condicao, rastreia_serie: rastreiaSerie, imagem_url: imagemUrl,
      ciclo_mensal_recomendado: parseInt(cicloRecomendado) || 0,
      ciclo_mensal_maximo: parseInt(cicloMaximo) || 0,
      rendimento_volume: parseInt(rendimentoVolume) || 0,
      vida_util_estimada: parseInt(vidaUtilEstimada) || 0,
      custo_base: parseFloat(custoBase.replace(',', '.')) || 0,
      preco_venda: parseFloat(precoVenda.replace(',', '.')) || 0,
      estoque_minimo: parseInt(estoqueMinimo) || 0,
      ponto_pedido: parseInt(pontoPedido) || 0,
      ncm, cest
    };

    let erroBanco;
    if (produtoId) {
      const { error } = await supabase.from('log_produtos').update(payload).eq('id', produtoId);
      erroBanco = error;
    } else {
      const { error } = await supabase.from('log_produtos').insert([payload]);
      erroBanco = error;
    }

    if (erroBanco) {
      alert("Erro ao salvar produto: " + erroBanco.message);
    } else {
      alert("Produto salvo com sucesso!");
      sessionStorage.removeItem("logistica_rascunho");
      setModo("lista");
    }
  };

  const toggleSelecao = (id: string) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const aplicarEdicaoLote = async () => {
    if (!loteCampo) return alert("Selecione qual campo deseja alterar!");
    if (!loteValor && loteCampo !== 'condicao') return alert("Informe o novo valor!");
    
    const payload = { [loteCampo]: loteValor };
    
    const { error } = await supabase
      .from('log_produtos')
      .update(payload)
      .in('id', selecionados);
      
    if (error) {
      alert("Erro ao atualizar produtos: " + error.message);
    } else {
      alert(`${selecionados.length} produtos atualizados com sucesso!`);
      fetchProdutos();
      setModo("lista");
      setSelecionados([]);
      setLoteCampo("");
      setLoteValor("");
    }
  };

  const sugerirFiscalComIA = async () => {
    if (!nome) return alert("Digite o nome do produto primeiro!");
    setCarregandoIAFiscal(true);
    
    try {
      const resposta = await fetch("https://n8n.srv1338428.hstgr.cloud/webhook/fiscal-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto: nome, categoria })
      });
      const dadosIA = await resposta.json();
      setNcm(dadosIA.ncm || "");
    } catch (error) {
      console.error("Erro na IA:", error);
      alert("Houve um erro ao consultar a IA. Verifique sua conexão ou o n8n.");
    } finally {
      setCarregandoIAFiscal(false);
    }
  };

  const cotarNoMercadoComIA = async () => {
    if (!nome) return alert("Digite o nome do produto primeiro!");
    setCarregandoIAMercado(true);
    try {
      /* Descomente quando o n8n estiver pronto
      const resposta = await fetch("SUA_URL_DO_WEBHOOK_MERCADO_AQUI", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto: nome })
      });
      const dados = await resposta.json();
      setCotacoesMercado(dados.cotacoes || []);
      */
      setTimeout(() => {
        setCotacoesMercado([
          { loja: "Mercado Livre", preco: "R$ 145,90", link: "https://mercadolivre.com.br" },
          { loja: "Shopee", preco: "R$ 129,00", link: "https://shopee.com.br" }
        ]);
        setCarregandoIAMercado(false);
      }, 3000);
    } catch (error) {
      console.error("Erro na cotação:", error);
      alert("Erro ao buscar cotações.");
      setCarregandoIAMercado(false);
    }
  };

  const fabricantesUnicos = Array.from(new Set(produtos.map(p => p.fabricante).filter(f => f && f.trim() !== ""))).sort();
  
  let produtosFiltrados = produtos.filter(prod => {
    const bateCategoria = filtroCategoria === "todas" || prod.categoria === filtroCategoria;
    const bateFabricante = filtroFabricante === "todos" || prod.fabricante === filtroFabricante;
    const termoBusca = busca.toLowerCase();
    const bateBusca = (prod.nome?.toLowerCase() || "").includes(termoBusca) || (prod.sku?.toLowerCase() || "").includes(termoBusca);
    return bateCategoria && bateFabricante && bateBusca;
  });

  // ordenacao
  produtosFiltrados = produtosFiltrados.sort((a, b) => {
    if (ordenacao === "nome_asc") return (a.nome || "").localeCompare(b.nome || "");
    if (ordenacao === "categoria_asc") return (a.categoria || "").localeCompare(b.categoria || "");
    if (ordenacao === "fabricante_asc") return (a.fabricante || "").localeCompare(b.fabricante || "");
    return 0;
  });

  const exportarPDF = () => {
    if (produtosFiltrados.length === 0) return alert("Não há produtos para exportar!");
    const doc = new jsPDF("l", "mm", "a4"); // format paisag
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Relatório de Produtos - Catálogo ERP", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Filtros: Categoria: ${filtroCategoria} | Fabricante: ${filtroFabricante}`, 14, 28);
    doc.text(`Total de Itens: ${produtosFiltrados.length}`, 14, 34);

    const bodyData = produtosFiltrados.map(p => [
      p.sku || "S/N",
      p.nome,
      p.categoria,
      p.fabricante || "-",
      `R$ ${Number(p.custo_base).toFixed(2)}`,
      `R$ ${Number(p.preco_venda).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['SKU', 'NOME DO PRODUTO', 'CATEGORIA', 'FABRICANTE', 'CUSTO BASE', 'PREÇO VENDA']],
      body: bodyData,
      theme: 'grid',
      headStyles: { fillColor: [41, 37, 36], textColor: [255,255,255] },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    doc.save("Relatorio_Produtos_TC_Copiadoras.pdf");
  };

  const exportarExcel = () => {
    if (produtosFiltrados.length === 0) return alert("Não há produtos para exportar!");
    
    // cabec CSV
    let csvContent = "SKU;NOME;CATEGORIA;CONDIÇÃO;FABRICANTE;CUSTO_BASE;PRECO_VENDA;ESTOQUE_MINIMO;NCM;CEST\n";
    
    produtosFiltrados.forEach(p => {
      const linha = [
        p.sku || "",
        `"${p.nome || ""}"`,
        p.categoria || "",
        p.condicao || "",
        p.fabricante || "",
        Number(p.custo_base || 0).toFixed(2).replace('.', ','), // Formato BR para Excel
        Number(p.preco_venda || 0).toFixed(2).replace('.', ','),
        p.estoque_minimo || "0",
        p.ncm || "",
        p.cest || ""
      ].join(";");
      csvContent += linha + "\n";
    });

    // criac arq
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "Relatorio_Produtos_TC_Copiadoras.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };


  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <Package className="w-6 h-6 text-stone-600" /> Catálogo de Produtos
            </h1>
            <p className="text-slate-500">Gestão unificada de equipamentos, peças e insumos.</p>
          </div>
          {modo === "lista" ? (
            <div className="flex gap-2">
              <Button onClick={exportarExcel} variant="outline" className="gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"><TableIcon className="w-4 h-4"/> Excel</Button>
              <Button onClick={exportarPDF} variant="outline" className="gap-2 text-red-700 border-red-200 hover:bg-red-50"><FileDown className="w-4 h-4"/> PDF</Button>
              <Button onClick={novoProduto} className="gap-2 bg-stone-700 hover:bg-stone-800"><Plus className="w-4 h-4" /> Novo Produto</Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => { setModo("lista"); setSelecionados([]); }}>Voltar ao Catálogo</Button>
          )}
        </div>

        {modo === "lote" && (
          <div className="bg-white rounded-xl border shadow-sm p-8 max-w-2xl mx-auto mt-8">
            <div className="flex items-center gap-4 mb-6 border-b pb-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <ListChecks className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Edição em Massa</h2>
                <p className="text-slate-500">Você está alterando <strong>{selecionados.length} produtos</strong> simultaneamente.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Qual campo deseja alterar em todos?</label>
                <Select value={loteCampo} onValueChange={(val) => { setLoteCampo(val); setLoteValor(""); }}>
                  <SelectTrigger className="bg-white z-50"><SelectValue placeholder="Selecione o campo..." /></SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="fabricante">Fabricante (Marca)</SelectItem>
                    <SelectItem value="categoria">Categoria do Produto</SelectItem>
                    <SelectItem value="condicao">Condição (Novo/Recondicionado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loteCampo === "fabricante" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Digite o novo Fabricante para todos:</label>
                  <Input value={loteValor} onChange={e => setLoteValor(e.target.value)} placeholder="Ex: BROTHER" />
                </div>
              )}

              {loteCampo === "categoria" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Selecione a nova Categoria para todos:</label>
                  <Select value={loteValor} onValueChange={setLoteValor}>
                    <SelectTrigger className="bg-white z-50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="Equipamento">Equipamento</SelectItem>
                      <SelectItem value="Peça">Peça</SelectItem>
                      <SelectItem value="Suprimento">Suprimento</SelectItem>
                      <SelectItem value="Produto Final Gráfico">Produto Final Gráfico</SelectItem>
                      <SelectItem value="Insumo Gráfico">Insumo (Gráfica)</SelectItem>
                      <SelectItem value="Insumo para Recondicionamento">Insumo Recondic.</SelectItem>
                      <SelectItem value="Ferramenta">Ferramenta</SelectItem>
                      <SelectItem value="EPI">EPI</SelectItem>
                      <SelectItem value="Acessório">Acessório</SelectItem>
                      <SelectItem value="Uso e Consumo">Materiais de Uso e Consumo</SelectItem>
                      <SelectItem value="Serviço">Serviço</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {loteCampo === "condicao" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Selecione a nova Condição para todos:</label>
                  <Select value={loteValor} onValueChange={setLoteValor}>
                    <SelectTrigger className="bg-white z-50"><SelectValue placeholder="Selecione (ou deixe em branco para limpar)..." /></SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="Original Novo">Original Novo</SelectItem>
                      <SelectItem value="Original Recondicionado">Original Recondicionado</SelectItem>
                      <SelectItem value="Compatível Novo">Compatível Novo</SelectItem>
                      <SelectItem value="Compatível Recondicionado">Compatível Recondicionado</SelectItem>
                      <SelectItem value="Nova">Nova (Peça)</SelectItem>
                      <SelectItem value="Recondicionada">Recondicionada (Peça)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="outline" onClick={() => setModo("lista")}>Cancelar</Button>
                <Button onClick={aplicarEdicaoLote} className="bg-blue-600 hover:bg-blue-700 text-white">Aplicar Alteração em Massa</Button>
              </div>
            </div>
          </div>
        )}

        {modo === "lista" && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            
            {selecionados.length > 0 && (
              <div className="bg-blue-50 border-b border-blue-100 p-3 px-6 flex justify-between items-center animate-in slide-in-from-top-2">
                <span className="text-blue-800 font-semibold">{selecionados.length} produto(s) selecionado(s)</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelecionados([])} className="text-blue-700 hover:bg-blue-100">Desmarcar Todos</Button>
                  <Button size="sm" onClick={() => setModo("lote")} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    <ListChecks className="w-4 h-4" /> Editar Selecionados
                  </Button>
                </div>
              </div>
            )}

            <div className="p-4 border-b flex flex-wrap gap-4 bg-slate-50 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Buscar por Nome ou SKU..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-[180px] bg-white z-50"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="todas">Todas as Categorias</SelectItem>
                  <SelectItem value="Equipamento">Equipamentos</SelectItem>
                  <SelectItem value="Peça">Peças</SelectItem>
                  <SelectItem value="Suprimento">Suprimentos</SelectItem>
                  <SelectItem value="Produto Final Gráfico">Produtos Finais Gráficos</SelectItem>
                  <SelectItem value="Insumo Gráfico">Insumos Gráficos</SelectItem>
                  <SelectItem value="Insumo para Recondicionamento">Insumo Recondic.</SelectItem>
                  <SelectItem value="Ferramenta">Ferramentas</SelectItem>
                  <SelectItem value="EPI">EPIs</SelectItem>
                  <SelectItem value="Acessório">Acessórios</SelectItem>
                  <SelectItem value="Uso e Consumo">Uso e Consumo</SelectItem>
                  <SelectItem value="Serviço">Serviços</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroFabricante} onValueChange={setFiltroFabricante}>
                <SelectTrigger className="w-[180px] bg-white z-50"><SelectValue placeholder="Fabricante" /></SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="todos">Todos os Fabricantes</SelectItem>
                  {fabricantesUnicos.map((fab, idx) => (<SelectItem key={idx} value={fab as string}>{fab as string}</SelectItem>))}
                </SelectContent>
              </Select>

              {/* botao ordenacao */}
              <div className="border-l border-slate-200 h-8 mx-1"></div>
              <Select value={ordenacao} onValueChange={setOrdenacao}>
                <SelectTrigger className="w-[160px] bg-white z-50"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="nome_asc">A-Z (Nome)</SelectItem>
                  <SelectItem value="categoria_asc">Por Categoria</SelectItem>
                  <SelectItem value="fabricante_asc">Por Fabricante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="divide-y">
              {produtosFiltrados.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Nenhum produto encontrado.</div>
              ) : (
                produtosFiltrados.map(prod => (
                  <div key={prod.id} className={`p-4 flex items-center justify-between transition-colors ${selecionados.includes(prod.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-4">
                      
                      <input 
                        type="checkbox" 
                        checked={selecionados.includes(prod.id)}
                        onChange={() => toggleSelecao(prod.id)}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer ml-2"
                      />

                      <div className="h-14 w-14 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {prod.imagem_url ? <img src={prod.imagem_url} alt={prod.nome} className="h-full w-full object-cover" /> : <Package className="w-6 h-6 text-stone-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border">{prod.sku || "S/N"}</span>
                          {prod.condicao && <span className="text-xs text-slate-500 italic">{prod.condicao}</span>}
                          {prod.rastreia_serie && <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center gap-1"><Barcode className="w-3 h-3"/> Seriado</span>}
                        </div>
                        <h3 className="font-semibold text-slate-800">{prod.nome}</h3>
                        <p className="text-sm text-slate-500">{prod.categoria} • {prod.fabricante || "Fabricante não informado"}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => editarProduto(prod)} className="text-slate-400 hover:text-stone-700"><Edit className="w-4 h-4" /></Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

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
                      <div className="space-y-2">
                        <label className="text-sm font-medium">SKU / Partnumber</label>
                        <Input value={sku} onChange={e => setSku(e.target.value)} placeholder="Ex: TN3472-BR" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Categoria <span className="text-red-500">*</span></label>
                        <Select value={categoria} onValueChange={(val) => { setCategoria(val); setCondicao(""); }}>
                          <SelectTrigger className="bg-white z-50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent className="bg-white z-50">
                            <SelectItem value="Equipamento">Equipamento</SelectItem>
                            <SelectItem value="Peça">Peça</SelectItem>
                            <SelectItem value="Suprimento">Suprimento</SelectItem>
                            <SelectItem value="Produto Final Gráfico">Produto Final Gráfico</SelectItem>
                            <SelectItem value="Insumo Gráfico">Insumo (Gráfica)</SelectItem>
                            <SelectItem value="Insumo para Recondicionamento">Insumo Recondic.</SelectItem>
                            <SelectItem value="Ferramenta">Ferramenta</SelectItem>
                            <SelectItem value="EPI">EPI</SelectItem>
                            <SelectItem value="Acessório">Acessório</SelectItem>
                            <SelectItem value="Uso e Consumo">Materiais de Uso e Consumo</SelectItem>
                            <SelectItem value="Serviço">Serviço</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {categoria === "Suprimento" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-emerald-700">Condição do Suprimento</label>
                          <Select value={condicao || undefined} onValueChange={setCondicao}>
                            <SelectTrigger className="bg-white z-50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent className="bg-white z-50">
                              <SelectItem value="Original Novo">Original Novo</SelectItem>
                              <SelectItem value="Original Recondicionado">Original Recondicionado</SelectItem>
                              <SelectItem value="Compatível Novo">Compatível Novo</SelectItem>
                              <SelectItem value="Compatível Recondicionado">Compatível Recondicionado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      {categoria === "Peça" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-orange-700">Condição da Peça</label>
                          <Select value={condicao || undefined} onValueChange={setCondicao}>
                            <SelectTrigger className="bg-white z-50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent className="bg-white z-50">
                              <SelectItem value="Nova">Nova</SelectItem>
                              <SelectItem value="Recondicionada">Recondicionada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Fabricante</label>
                        <Input value={fabricante} onChange={e => setFabricante(e.target.value)} placeholder="Ex: Brother" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Modelos Compatíveis</label>
                        <Input value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Ex: DCP-L5652" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 border-b pb-2">Especificações Técnicas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 flex flex-col justify-center">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={rastreiaSerie} onChange={(e) => setRastreiaSerie(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-stone-600 focus:ring-stone-600" />
                          <div><p className="text-sm font-bold text-slate-800">Rastrear Série</p><p className="text-xs text-slate-500">Bipar serial no estoque</p></div>
                        </label>
                      </div>
                      {categoria === "Equipamento" && (
                        <><div className="space-y-2"><label className="text-sm font-medium text-blue-700">Ciclo Recomendado</label><Input type="number" value={cicloRecomendado} onChange={e => setCicloRecomendado(e.target.value)} placeholder="Ex: 5000" /></div>
                        <div className="space-y-2"><label className="text-sm font-medium text-red-700">Ciclo Máximo</label><Input type="number" value={cicloMaximo} onChange={e => setCicloMaximo(e.target.value)} placeholder="Ex: 20000" /></div></>
                      )}
                      {categoria === "Suprimento" && (
                        <div className="space-y-2"><label className="text-sm font-medium text-emerald-700">Rend. de Volume (Pág)</label><Input type="number" value={rendimentoVolume} onChange={e => setRendimentoVolume(e.target.value)} placeholder="Ex: 25000" /></div>
                      )}
                      {categoria === "Peça" && (
                        <div className="space-y-2"><label className="text-sm font-medium text-orange-700">Vida Útil Estimada (Pág)</label><Input type="number" value={vidaUtilEstimada} onChange={e => setVidaUtilEstimada(e.target.value)} placeholder="Ex: 200000" /></div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="financeiro" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="text-sm font-bold text-slate-800">Dados Fiscais</h3>
                        <Button size="sm" variant="outline" className="gap-2 text-violet-600 border-violet-200 hover:bg-violet-50" onClick={sugerirFiscalComIA} disabled={carregandoIAFiscal}>
                          {carregandoIAFiscal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Sugerir com IA
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">NCM</label>
                        <div className="relative"><FileDigit className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={ncm} onChange={e => setNcm(e.target.value)} className="pl-9 bg-white" placeholder="Ex: 8443.99.33" /></div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">CEST</label>
                        <Input value={cest} onChange={e => setCest(e.target.value)} placeholder="Ex: 21.050.00" className="bg-white" />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="text-sm font-bold text-slate-800">Precificação</h3>
                        <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={cotarNoMercadoComIA} disabled={carregandoIAMercado}>
                          {carregandoIAMercado ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />} Cotar no Mercado
                        </Button>
                      </div>
                      <div className="flex gap-4">
                        <div className="space-y-2 flex-1">
                          <label className="text-sm font-medium">Custo Base (R$)</label>
                          <Input type="number" step="0.01" value={custoBase} onChange={e => setCustoBase(e.target.value)} placeholder="0.00" className="bg-white"/>
                        </div>
                        <div className="space-y-2 flex-1">
                          <label className="text-sm font-medium">Preço de Venda (R$)</label>
                          <Input type="number" step="0.01" value={precoVenda} onChange={e => setPrecoVenda(e.target.value)} placeholder="0.00" className="bg-white"/>
                        </div>
                      </div>

                      {cotacoesMercado.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Radar de Preços Web</p>
                          <div className="space-y-2">
                            {cotacoesMercado.map((cot, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-white p-2 rounded text-sm border shadow-sm">
                                <a href={cot.link} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                                  {cot.loja}
                                </a>
                                <span className="text-emerald-600 font-bold">{cot.preco}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </TabsContent>

                <TabsContent value="parametros" className="space-y-4 mt-0">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <h3 className="text-sm font-bold text-amber-800 mb-1">Dica de Logística</h3>
                    <p className="text-xs text-amber-700">O <strong>Ponto de Pedido</strong> é o momento ideal para comprar mais. O <strong>Estoque Mínimo</strong> é o limite de segurança antes de faltar para o cliente.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-sm font-medium">Ponto de Pedido (Qtd)</label><Input type="number" value={pontoPedido} onChange={e => setPontoPedido(e.target.value)} placeholder="Ex: 10" /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Estoque Mínimo Crítico (Qtd)</label><Input type="number" value={estoqueMinimo} onChange={e => setEstoqueMinimo(e.target.value)} placeholder="Ex: 3" /></div>
                  </div>
                </TabsContent>

                <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setModo("lista")}>Cancelar</Button>
                  <Button onClick={salvarProduto} className="bg-stone-700 hover:bg-stone-800">Salvar Produto</Button>
                </div>
              </div>
            </Tabs>
          </div>
        )}

      </div>
    </AppLayout>
  );
}