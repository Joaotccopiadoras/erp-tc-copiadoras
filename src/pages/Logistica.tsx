import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Search, Edit, FileDigit, DollarSign, Settings2, Barcode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Logistica() {
  const [modo, setModo] = useState<"lista" | "editar">("lista");

  // --- estados de lista e filtros ---
  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");

  // --- estados de formularios ---
  const [produtoId, setProdutoId] = useState<string | null>(null);
  const [sku, setSku] = useState("");
  const [nome, setNome] = useState("");
  const [fabricante, setFabricante] = useState("");
  const [modelo, setModelo] = useState("");
  const [categoria, setCategoria] = useState("Peça");
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
    setCategoria("Peça"); setRastreiaSerie(false);
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

  // filtro na tela
  const produtosFiltrados = produtos.filter(prod => {
    const bateCategoria = filtroCategoria === "todas" || prod.categoria === filtroCategoria;
    const termoBusca = busca.toLowerCase();
    const bateBusca = (prod.nome?.toLowerCase() || "").includes(termoBusca) || 
                      (prod.sku?.toLowerCase() || "").includes(termoBusca);
    return bateCategoria && bateBusca;
  });

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <Package className="w-6 h-6 text-stone-600" />
              Catálogo de Produtos
            </h1>
            <p className="text-slate-500">Gestão unificada de equipamentos, peças e insumos.</p>
          </div>
          {modo === "lista" ? (
            <Button onClick={novoProduto} className="gap-2 bg-stone-700 hover:bg-stone-800">
              <Plus className="w-4 h-4" /> Novo Produto
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setModo("lista")}>Voltar ao Catálogo</Button>
          )}
        </div>

        {/* lista */}
        {modo === "lista" && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b flex gap-4 bg-slate-50">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Buscar por Nome ou SKU..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-[200px] bg-white"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Categorias</SelectItem>
                  <SelectItem value="Equipamento">Equipamentos</SelectItem>
                  <SelectItem value="Peça">Peças</SelectItem>
                  <SelectItem value="Suprimento">Suprimentos</SelectItem>
                  <SelectItem value="Insumo Gráfico">Insumos Gráficos</SelectItem>
                  <SelectItem value="Uso e Consumo">Uso e Consumo</SelectItem>
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
                      {/* se tiver imagem mostra, senao padrao */}
                      <div className="h-14 w-14 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {prod.imagem_url ? (
                          <img src={prod.imagem_url} alt={prod.nome} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="w-6 h-6 text-stone-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border">{prod.sku || "S/N"}</span>
                          {prod.rastreia_serie && (
                            <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center gap-1">
                              <Barcode className="w-3 h-3"/> Seriado
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-slate-800">{prod.nome}</h3>
                        <p className="text-sm text-slate-500">{prod.categoria} • {prod.fabricante || "Fabricante não informado"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="icon" onClick={() => editarProduto(prod)} className="text-slate-400 hover:text-stone-700">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
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
                  
                  {/* bloco sup */}
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex flex-col items-center gap-2 w-full md:w-1/4">
                      <div className="w-full aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 overflow-hidden relative">
                        {imagemUrl ? (
                          <img src={imagemUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <ImageIcon className="w-8 h-8 mb-2 text-slate-300" />
                            <span className="text-xs">Sem Imagem</span>
                          </>
                        )}
                      </div>
                      <Input value={imagemUrl} onChange={e => setImagemUrl(e.target.value)} placeholder="Cole a URL da Imagem aqui" className="text-xs" />
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
                        <Select value={categoria} onValueChange={setCategoria}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Equipamento">Equipamento</SelectItem>
                            <SelectItem value="Peça">Peça</SelectItem>
                            <SelectItem value="Suprimento">Suprimento</SelectItem>
                            <SelectItem value="Insumo Gráfico">Insumo (Gráfica)</SelectItem>
                            <SelectItem value="Uso e Consumo">Materiais de Uso e Consumo</SelectItem>
                            <SelectItem value="Serviço">Serviço</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Fabricante</label>
                        <Input value={fabricante} onChange={e => setFabricante(e.target.value)} placeholder="Ex: Brother" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Modelos Compatíveis</label>
                        <Input value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Ex: DCP-L5652, MFC-L6702" />
                      </div>
                    </div>
                  </div>

                  {/* renderi p categ */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 border-b pb-2">Especificações Técnicas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* aparece tudo */}
                      <div className="space-y-2 flex flex-col justify-center">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={rastreiaSerie} onChange={(e) => setRastreiaSerie(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-stone-600 focus:ring-stone-600" />
                          <div>
                            <p className="text-sm font-bold text-slate-800">Rastrear Série</p>
                            <p className="text-xs text-slate-500">Bipar serial no estoque</p>
                          </div>
                        </label>
                      </div>

                      {/* aparece quando equip */}
                      {categoria === "Equipamento" && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-blue-700">Ciclo Mensal Recomendado</label>
                            <Input type="number" value={cicloRecomendado} onChange={e => setCicloRecomendado(e.target.value)} placeholder="Ex: 5000" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-red-700">Ciclo Mensal Máximo</label>
                            <Input type="number" value={cicloMaximo} onChange={e => setCicloMaximo(e.target.value)} placeholder="Ex: 20000" />
                          </div>
                        </>
                      )}

                      {/* aparece quando supr */}
                      {categoria === "Suprimento" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-emerald-700">Rendimento de Volume (Qtd Páginas)</label>
                          <Input type="number" value={rendimentoVolume} onChange={e => setRendimentoVolume(e.target.value)} placeholder="Ex: 25000" />
                        </div>
                      )}

                      {/* aparece quando peca */}
                      {categoria === "Peça" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-orange-700">Vida Útil Estimada (Qtd Páginas)</label>
                          <Input type="number" value={vidaUtilEstimada} onChange={e => setVidaUtilEstimada(e.target.value)} placeholder="Ex: 200000" />
                        </div>
                      )}

                    </div>
                  </div>

                </TabsContent>

                {/* restante */}
                <TabsContent value="financeiro" className="space-y-4 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Custo Base (R$)</label>
                      <Input type="number" step="0.01" value={custoBase} onChange={e => setCustoBase(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Preço de Venda (R$)</label>
                      <Input type="number" step="0.01" value={precoVenda} onChange={e => setPrecoVenda(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">NCM (Nomenclatura Comum do Mercosul)</label>
                      <div className="relative">
                        <FileDigit className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input value={ncm} onChange={e => setNcm(e.target.value)} className="pl-9" placeholder="Ex: 8443.99.33" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">CEST</label>
                      <Input value={cest} onChange={e => setCest(e.target.value)} placeholder="Ex: 21.050.00" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="parametros" className="space-y-4 mt-0">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <h3 className="text-sm font-bold text-amber-800 mb-1">Dica de Logística</h3>
                    <p className="text-xs text-amber-700">O <strong>Ponto de Pedido</strong> é o momento ideal para comprar mais. O <strong>Estoque Mínimo</strong> é o limite de segurança antes de faltar para o cliente.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ponto de Pedido (Qtd)</label>
                      <Input type="number" value={pontoPedido} onChange={e => setPontoPedido(e.target.value)} placeholder="Ex: 10" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Estoque Mínimo Crítico (Qtd)</label>
                      <Input type="number" value={estoqueMinimo} onChange={e => setEstoqueMinimo(e.target.value)} placeholder="Ex: 3" />
                    </div>
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