import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Package, DollarSign, Settings2, Image as ImageIcon, Sparkles, Loader2, CheckCircle2, Barcode } from "lucide-react";
import { supabase } from "@/shared/lib/supabase/client";
import { useToast } from "@/shared/hooks/use-toast";

interface FormProdutoProps {
  produtoInicial: any | null;
  onVoltar: () => void;
}

export default function FormProduto({ produtoInicial, onVoltar }: FormProdutoProps) {
  const { toast } = useToast();
  
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
  const [salvando, setSalvando] = useState(false);

  const [fabricantesUnicos, setFabricantesUnicos] = useState<string[]>([]);
  const [familiasUnicas, setFamiliasUnicas] = useState<string[]>([]);
  const [perfisUnicos, setPerfisUnicos] = useState<string[]>([]);
  const [ncmUnicos, setNcmUnicos] = useState<string[]>([]);
  const [cestUnicos, setCestUnicos] = useState<string[]>([]);

  useEffect(() => {
    const fetchUnicos = async () => {
      const { data } = await supabase.from('log_produtos').select('fabricante, familia, perfil, ncm, cest');
      if (data) {
        setFabricantesUnicos(Array.from(new Set(data.map(d => d.fabricante).filter(Boolean))).sort() as string[]);
        setFamiliasUnicas(Array.from(new Set(data.map(d => d.familia).filter(Boolean))).sort() as string[]);
        setPerfisUnicos(Array.from(new Set(data.map(d => d.perfil).filter(Boolean))).sort() as string[]);
        setNcmUnicos(Array.from(new Set(data.map(d => d.ncm).filter(Boolean))).sort() as string[]);
        setCestUnicos(Array.from(new Set(data.map(d => d.cest).filter(Boolean))).sort() as string[]);
      }
    };
    fetchUnicos();
  }, []);

  useEffect(() => {
    if (produtoInicial) {
      let loadedSpecs = { formato: "A4", ppm: "", ano: "" };
      try { if (produtoInicial.especificacoes) loadedSpecs = typeof produtoInicial.especificacoes === 'string' ? JSON.parse(produtoInicial.especificacoes) : produtoInicial.especificacoes; } catch(e){}

      setProdutoId(produtoInicial.id); setSku(produtoInicial.sku || ""); setNome(produtoInicial.nome || "");
      setFabricante(produtoInicial.fabricante || ""); setFamilia(produtoInicial.familia || ""); setPerfil(produtoInicial.perfil || ""); setModelo(produtoInicial.modelo || "");
      setCategoria(produtoInicial.categoria || "Peça"); setCondicao(produtoInicial.condicao || "");
      setRastreiaSerie(produtoInicial.rastreia_serie || false); setImagemUrl(produtoInicial.imagem_url || "");
      setIsEquipamento(produtoInicial.is_equipamento ? "Sim" : "Não"); setSpecs(loadedSpecs);
      setCicloRecomendado(produtoInicial.ciclo_mensal_recomendado?.toString() || "");
      setCicloMaximo(produtoInicial.ciclo_mensal_maximo?.toString() || "");
      setRendimentoVolume(produtoInicial.rendimento_volume?.toString() || "");
      setVidaUtilEstimada(produtoInicial.vida_util_estimada?.toString() || "");
      setCustoBase(produtoInicial.custo_base?.toString() || ""); setPrecoVenda(produtoInicial.preco_venda?.toString() || "");
      setEstoqueMinimo(produtoInicial.estoque_minimo?.toString() || ""); setPontoPedido(produtoInicial.ponto_pedido?.toString() || "");
      setNcm(produtoInicial.ncm || ""); setCest(produtoInicial.cest || "");
    }
  }, [produtoInicial]);

  const sugerirFiscalComIA = async () => {
    if (!nome) return alert("Digite o nome do produto primeiro!");
    setCarregandoIAFiscal(true);
    try {
      const resposta = await fetch("https://n8n01-n8njoaogaia.fdumjq.easypanel.host/webhook/fiscal-ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ produto: nome, categoria: categoria }) });
      const dadosIA = await resposta.json();
      setNcm(dadosIA.ncm || ""); setCest(dadosIA.cest || "");
    } catch (error) { alert("Erro na IA."); } finally { setCarregandoIAFiscal(false); }
  };

  const salvarProduto = async () => {
    const isEq = isEquipamento === "Sim";
    const payload = {
      sku, nome, fabricante, familia, perfil, modelo, categoria, condicao, rastreia_serie: rastreiaSerie, imagem_url: imagemUrl,
      is_equipamento: isEq, especificacoes: isEq ? specs : {},
      ciclo_mensal_recomendado: parseInt(cicloRecomendado) || 0, ciclo_mensal_maximo: parseInt(cicloMaximo) || 0,
      rendimento_volume: parseInt(rendimentoVolume) || 0, vida_util_estimada: parseInt(vidaUtilEstimada) || 0,
      custo_base: parseFloat(String(custoBase).replace(',', '.')) || 0, preco_venda: parseFloat(String(precoVenda).replace(',', '.')) || 0,
      estoque_minimo: parseInt(estoqueMinimo) || 0, ponto_pedido: parseInt(pontoPedido) || 0, ncm, cest
    };

    setSalvando(true);
    try {
      if (produtoId) {
        const { error } = await supabase.from('log_produtos').update(payload).eq('id', produtoId); 
        if (error) throw error;
      } else {
        const { error } = await supabase.from('log_produtos').insert([payload]); 
        if (error) throw error;
      }
      toast({ title: "Sucesso", description: "Produto salvo com sucesso!" });
      onVoltar();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm">
      <datalist id="lista-fabricantes">{fabricantesUnicos.map((f, i) => <option key={i} value={f} />)}</datalist>
      <datalist id="lista-familias">{familiasUnicas.map((f, i) => <option key={i} value={f} />)}</datalist>
      <datalist id="lista-perfis">{perfisUnicos.map((f, i) => <option key={i} value={f} />)}</datalist>
      <datalist id="lista-ncm">{ncmUnicos.map((f, i) => <option key={i} value={f} />)}</datalist>
      <datalist id="lista-cest">{cestUnicos.map((f, i) => <option key={i} value={f} />)}</datalist>

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
                <div className="flex justify-between items-center border-b pb-2"><h3 className="text-sm font-bold text-slate-800">Dados Fiscais</h3><Button type="button" size="sm" variant="outline" className="gap-2 text-violet-600 border-violet-200" onClick={sugerirFiscalComIA} disabled={carregandoIAFiscal}>{carregandoIAFiscal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Sugerir com IA</Button></div>
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
            <Button variant="outline" onClick={onVoltar}>Cancelar</Button>
            <Button onClick={salvarProduto} disabled={salvando} className="bg-stone-700 hover:bg-stone-800 gap-2">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>} Salvar Produto
            </Button>
          </div>
        </div>
      </Tabs>
    </div>
  );
}