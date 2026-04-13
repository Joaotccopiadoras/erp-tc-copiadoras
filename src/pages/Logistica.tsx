import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Search, Edit, FileDigit, DollarSign, Settings2, Barcode, Image as ImageIcon, Sparkles, ShoppingCart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Logistica() {
  const [modo, setModo] = useState<"lista" | "editar">("lista");

  // --- estados de lista e filtros ---
  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroFabricante, setFiltroFabricante] = useState("todos");

  // --- estados de formularios ---
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

  // -estados ia ---
  const [carregandoIAFiscal, setCarregandoIAFiscal] = useState(false);
  const [carregandoIAMercado, setCarregandoIAMercado] = useState(false);
  const [cotacoesMercado, setCotacoesMercado] = useState<any[]>([]);

  useEffect(() => {
    const rascunhoSalvo = sessionStorage.getItem("logistica_rascunho");
    if (rascunhoSalvo) {
      try {
        const draft = JSON.parse(rascunhoSalvo);
        if (draft.modo === "editar") {
          setProdutoId(draft.produtoId); setSku(draft.sku); setNome(draft.nome);
          setFabricante(draft.fabricante); setModelo(draft.modelo); setCategoria(draft.categoria);
          setRastreiaSerie(draft.rastreiaSerie); setImagemUrl(draft.imagemUrl);
          setCicloRecomendado(draft.cicloRecomendado); setCicloMaximo(draft.cicloMaximo);
          setRendimentoVolume(draft.rendimentoVolume); setVidaUtilEstimada(draft.vidaUtilEstimada);
          setCustoBase(draft.custoBase); setPrecoVenda(draft.precoVenda);
          setEstoqueMinimo(draft.estoqueMinimo); setPontoPedido(draft.pontoPedido);
          setNcm(draft.ncm); setCest(draft.cest);
          setModo("editar"); // Força a tela a ficar no modo edição!
        }
      } catch (e) {
        console.error("Erro ao recuperar rascunho", e);
      }
    }
  }, []);

  useEffect(() => {
    if (modo === "editar") {
      const draft = {
        modo, produtoId, sku, nome, fabricante, modelo, categoria, rastreiaSerie, imagemUrl,
        cicloRecomendado, cicloMaximo, rendimentoVolume, vidaUtilEstimada,
        custoBase, precoVenda, estoqueMinimo, pontoPedido, ncm, cest
      };
      sessionStorage.setItem("logistica_rascunho", JSON.stringify(draft));
    } else {
        sessionStorage.removeItem("logistica_rascunho");
    }
  }, [modo, produtoId, sku, nome, fabricante, modelo, categoria, rastreiaSerie, imagemUrl, cicloRecomendado, cicloMaximo, rendimentoVolume, vidaUtilEstimada, custoBase, precoVenda, estoqueMinimo, pontoPedido, ncm, cest]);

  // busca produtos
  useEffect(() => {
    if (modo === "lista") {
      fetchProdutos();
    }
  }, [modo]);

  const fetchProdutos = async () => {
    const { data, error } = await supabase
      .from('log_produtos')
      .select('*')
      .order('nome', { ascending: true });

    if (data) setProdutos(data);
    if (error) console.error("Erro ao buscar produtos:", error);
  };

  // formulario novo cadastro
  const novoProduto = () => {
    setProdutoId(null);
    setSku(""); setNome(""); setFabricante(""); setModelo("");
    setCategoria("Peça"); setCondicao(""); setRastreiaSerie(false);
    setCicloRecomendado(""); setCicloMaximo(""); setRendimentoVolume(""); setVidaUtilEstimada("");
    setCustoBase(""); setPrecoVenda("");
    setEstoqueMinimo(""); setPontoPedido("");
    setNcm(""); setCest("");
    setModo("editar");
  };

  // carrega dados produto a ser editado
  const editarProduto = (prod: any) => {
    setProdutoId(prod.id);
    setSku(prod.sku || "");
    setNome(prod.nome || "");
    setFabricante(prod.fabricante || "");
    setModelo(prod.modelo || "");
    setCategoria(prod.categoria || "Peça");
    setCondicao(prod.condicao || "");
    setRastreiaSerie(prod.rastreia_serie || false);
    setImagemUrl(prod.imagem_url || "");
    setCicloRecomendado(prod.ciclo_mensal_recomendado?.toString() || "");
    setCicloMaximo(prod.ciclo_mensal_maximo?.toString() || "");
    setRendimentoVolume(prod.rendimento_volume?.toString() || "");
    setVidaUtilEstimada(prod.vida_util_estimada?.toString() || "");
    setCustoBase(prod.custo_base?.toString() || "");
    setPrecoVenda(prod.preco_venda?.toString() || "");
    setEstoqueMinimo(prod.estoque_minimo?.toString() || "");
    setPontoPedido(prod.ponto_pedido?.toString() || "");
    setNcm(prod.ncm || "");
    setCest(prod.cest || "");
    setModo("editar");
  };

  // salvamento insert ou updt
  const salvarProduto = async () => {
    const payload = {
      sku,
      nome,
      fabricante,
      modelo,
      categoria,
      condicao,
      rastreia_serie: rastreiaSerie,
      imagem_url: imagemUrl,
      ciclo_mensal_recomendado: parseInt(cicloRecomendado) || 0,
      ciclo_mensal_maximo: parseInt(cicloMaximo) || 0,
      rendimento_volume: parseInt(rendimentoVolume) || 0,
      vida_util_estimada: parseInt(vidaUtilEstimada) || 0,
      custo_base: parseFloat(custoBase.replace(',', '.')) || 0,
      preco_venda: parseFloat(precoVenda.replace(',', '.')) || 0,
      estoque_minimo: parseInt(estoqueMinimo) || 0,
      ponto_pedido: parseInt(pontoPedido) || 0,
      ncm,
      cest
    };

    let erroBanco;

    if (produtoId) {
      // Atualizar existente
      const { error } = await supabase.from('log_produtos').update(payload).eq('id', produtoId);
      erroBanco = error;
    } else {
      // Criar novo
      const { error } = await supabase.from('log_produtos').insert([payload]);
      erroBanco = error;
    }

    if (erroBanco) {
      alert("Erro ao salvar produto: " + erroBanco.message);
    } else {
      alert("Produto salvo com sucesso!");
      setModo("lista");
    }
  };

  const sugerirFiscalComIA = async () => {
    if (!nome) return alert("Digite o nome do produto primeiro!");
    setCarregandoIAFiscal(true);
    
    const resposta = await fetch("https://n8n.srv1338428.hstgr.cloud/webhook-test/fiscal-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto: nome, categoria })
    });

    const dadosIA = await resposta.json();
    setNcm(dadosIA.ncm);
    setCest(dadosIA.cest);

  const cotarNoMercadoComIA = async () => {
    if (!nome) return alert("Digite o nome do produto primeiro!");
    setCarregandoIAMercado(true);

    // n8n rasp
    setTimeout(() => {
      setCotacoesMercado([
        { loja: "Mercado Livre", preco: "R$ 145,90", link: "#" },
        { loja: "Shopee", preco: "R$ 129,00", link: "#" },
        { loja: "AliExpress", preco: "R$ 89,50", link: "#" }
      ]);
      setCarregandoIAMercado(false);
    }, 3000);
  };

  // filtro na tela
  const fabricantesUnicos = Array.from(
    new Set(produtos.map(p => p.fabricante).filter(f => f && f.trim() !== ""))
  ).sort();
  
  const produtosFiltrados = produtos.filter(prod => {
    const bateCategoria = filtroCategoria === "todas" || prod.categoria === filtroCategoria;
    const bateFabricante = filtroFabricante === "todos" || prod.fabricante === filtroFabricante;
    const termoBusca = busca.toLowerCase();
    const bateBusca = (prod.nome?.toLowerCase() || "").includes(termoBusca) || 
                      (prod.sku?.toLowerCase() || "").includes(termoBusca);
    return bateCategoria && bateFabricante && bateBusca;
  });

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
            <Button onClick={novoProduto} className="gap-2 bg-stone-700 hover:bg-stone-800"><Plus className="w-4 h-4" /> Novo Produto</Button>
          ) : (
            <Button variant="outline" onClick={() => setModo("lista")}>Voltar ao Catálogo</Button>
          )}
        </div>

        {/* lista */}
        {modo === "lista" && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b flex flex-wrap gap-4 bg-slate-50">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Buscar por Nome ou SKU..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-[200px] bg-white"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="Equipamento">Equipamentos</SelectItem>
                  <SelectItem value="Peça">Peças</SelectItem>
                  <SelectItem value="Suprimento">Suprimentos</SelectItem>
                  <SelectItem value="Insumo para Recondicionamento">Insumo Recondic.</SelectItem>
                  <SelectItem value="Insumo Gráfico">Insumos Gráficos</SelectItem>
                  <SelectItem value="Uso e Consumo">Uso e Consumo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroFabricante} onValueChange={setFiltroFabricante}>
                <SelectTrigger className="w-[200px] bg-white"><SelectValue placeholder="Fabricante" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Fabricantes</SelectItem>
                  {fabricantesUnicos.map((fab, idx) => (<SelectItem key={idx} value={fab as string}>{fab as string}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="divide-y">
              {produtosFiltrados.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Nenhum produto encontrado.</div>
              ) : (
                produtosFiltrados.map(prod => (
                  <div key={prod.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
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

        {/* edicao */}
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
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Equipamento">Equipamento</SelectItem>
                            <SelectItem value="Peça">Peça</SelectItem>
                            <SelectItem value="Suprimento">Suprimento</SelectItem>
                            <SelectItem value="Insumo para Recondicionamento">Insumo Recondic.</SelectItem>
                            <SelectItem value="Insumo Gráfico">Insumo (Gráfica)</SelectItem>
                            <SelectItem value="Ferramenta">Ferramenta</SelectItem>
                            <SelectItem value="Uso e Consumo">Materiais de Uso e Consumo</SelectItem>
                            <SelectItem value="Serviço">Serviço</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* condicao de supr e pecas */}
                      {categoria === "Suprimento" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-emerald-700">Condição do Suprimento</label>
                          <Select value={condicao} onValueChange={setCondicao}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
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
                          <Select value={condicao} onValueChange={setCondicao}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
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
                        <div className="space-y-2"><label className="text-sm font-medium text-emerald-700">Rendimento de Volume (Páginas)</label><Input type="number" value={rendimentoVolume} onChange={e => setRendimentoVolume(e.target.value)} placeholder="Ex: 25000" /></div>
                      )}
                      {categoria === "Peça" && (
                        <div className="space-y-2"><label className="text-sm font-medium text-orange-700">Vida Útil Estimada (Páginas)</label><Input type="number" value={vidaUtilEstimada} onChange={e => setVidaUtilEstimada(e.target.value)} placeholder="Ex: 200000" /></div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="financeiro" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* fiscal com ia */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="text-sm font-bold text-slate-800">Dados Fiscais</h3>
                        <Button size="sm" variant="outline" className="gap-2 text-violet-600 border-violet-200 hover:bg-violet-50" onClick={sugerirFiscalComIA} disabled={carregandoIAFiscal}>
                          {carregandoIAFiscal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          Sugerir com IA
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

                    {/* precificacao e cotacao com ia */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="text-sm font-bold text-slate-800">Precificação</h3>
                        <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={cotarNoMercadoComIA} disabled={carregandoIAMercado}>
                          {carregandoIAMercado ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                          Cotar no Mercado
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

                      {/* radar de cotacao */}
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
}