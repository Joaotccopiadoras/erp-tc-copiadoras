import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Search, Plus, Edit2, Trash2, Printer, Settings, Box, Barcode, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function CatalogoProdutos() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // ==========================================
  // ESTADOS DO FORMULÁRIO
  // ==========================================
  const [form, setForm] = useState({
    sku: "",
    nome: "",
    custo_base: "",
    preco_venda: "",
    rastreia_serie: "Não",
    is_equipamento: "Não",
    // Campos específicos se for equipamento
    fabricante: "",
    familia: "",
    ano_lancamento: "",
    formato_papel: "A4",
    ppm: ""
  });

  useEffect(() => {
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    const { data, error } = await supabase.from('log_produtos').select('*').order('nome');
    if (data) setProdutos(data);
    if (error) console.error("Erro ao buscar produtos:", error);
  };

  const abrirNovo = () => {
    setEditandoId(null);
    setForm({ sku: "", nome: "", custo_base: "", preco_venda: "", rastreia_serie: "Não", is_equipamento: "Não", fabricante: "", familia: "", ano_lancamento: "", formato_papel: "A4", ppm: "" });
    setMostrarForm(true);
  };

  const editarProduto = (prod: any) => {
    setEditandoId(prod.id);
    
    // Tenta ler o JSON de especificações de forma segura
    let specs = { ano: "", formato: "A4", ppm: "" };
    try {
      if (prod.especificacoes) {
        specs = typeof prod.especificacoes === 'string' ? JSON.parse(prod.especificacoes) : prod.especificacoes;
      }
    } catch(e) {}

    setForm({
      sku: prod.sku || "",
      nome: prod.nome || "",
      custo_base: prod.custo_base?.toString() || "",
      preco_venda: prod.preco_venda?.toString() || "",
      rastreia_serie: prod.rastreia_serie ? "Sim" : "Não",
      is_equipamento: prod.is_equipamento ? "Sim" : "Não",
      fabricante: prod.fabricante || "",
      familia: prod.familia || "",
      ano_lancamento: specs.ano || "",
      formato_papel: specs.formato || "A4",
      ppm: specs.ppm || ""
    });
    
    setMostrarForm(true);
  };

  const salvarProduto = async () => {
    if (!form.nome) return alert("O Nome do produto é obrigatório.");
    
    setSalvando(true);
    try {
      // Monta o JSON de especificações técnicas apenas se for equipamento
      const isEquip = form.is_equipamento === "Sim";
      const especificacoesJson = isEquip ? {
          ano: form.ano_lancamento,
          formato: form.formato_papel,
          ppm: form.ppm
      } : {};

      const payload = {
        sku: form.sku,
        nome: form.nome,
        custo_base: parseFloat(form.custo_base) || 0,
        preco_venda: parseFloat(form.preco_venda) || 0,
        rastreia_serie: form.rastreia_serie === "Sim",
        is_equipamento: isEquip,
        fabricante: isEquip ? form.fabricante : null,
        familia: isEquip ? form.familia : null,
        especificacoes: especificacoesJson
      };

      if (editandoId) {
        const { error } = await supabase.from('log_produtos').update(payload).eq('id', editandoId);
        if (error) throw error;
        alert("Produto atualizado com sucesso!");
      } else {
        const { error } = await supabase.from('log_produtos').insert([payload]);
        if (error) throw error;
        alert("Novo produto cadastrado com sucesso!");
      }

      setMostrarForm(false);
      fetchProdutos();
    } catch (e: any) {
      if (e.code === '23505') alert("Já existe um produto cadastrado com este SKU/Código.");
      else alert("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const deletarProduto = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto do catálogo? Isso pode falhar se ele já estiver vinculado a movimentações de estoque.")) return;
    try {
        const { error } = await supabase.from('log_produtos').delete().eq('id', id);
        if (error) throw error;
        fetchProdutos();
    } catch (e: any) {
        alert("Não foi possível excluir. O produto já possui histórico no sistema.");
    }
  };

  const produtosFiltrados = produtos.filter(p => 
    p.nome.toLowerCase().includes(busca.toLowerCase()) || 
    (p.sku?.toLowerCase() || "").includes(busca.toLowerCase()) ||
    (p.fabricante?.toLowerCase() || "").includes(busca.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto mb-12">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Package className="w-6 h-6 text-indigo-600" /> Catálogo de Produtos</h1>
            <p className="text-slate-500">Gestão de cadastros mestres, insumos e especificações de equipamentos.</p>
          </div>
          <Button onClick={abrirNovo} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Novo Produto
          </Button>
        </div>

        {/* ========================================================================= */}
        {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
        {/* ========================================================================= */}
        {mostrarForm && (
          <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-md animate-in slide-in-from-top-4 duration-200 space-y-6">
            <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-indigo-900 flex items-center gap-2 text-lg">
                    {form.is_equipamento === "Sim" ? <Printer className="w-5 h-5"/> : <Box className="w-5 h-5"/>} 
                    {editandoId ? 'Editar Ficha do Produto' : 'Cadastrar Novo Produto'}
                </h3>
            </div>

            {/* SEÇÃO 1: DADOS GERAIS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Barcode className="w-3 h-3"/> SKU / Código</label><Input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="Ex: DR2340C" className="bg-slate-50 font-mono font-bold text-indigo-700" /></div>
              <div className="space-y-2 md:col-span-3"><label className="text-xs font-bold text-slate-500 uppercase">Nome do Produto / Descrição *</label><Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Cartucho de Toner Brother..." className="bg-slate-50" /></div>
              
              <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Custo Base (R$)</label><Input type="number" step="0.01" value={form.custo_base} onChange={e => setForm({...form, custo_base: e.target.value})} className="bg-slate-50" /></div>
              <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Preço Venda (R$)</label><Input type="number" step="0.01" value={form.preco_venda} onChange={e => setForm({...form, preco_venda: e.target.value})} className="bg-slate-50" /></div>
              
              <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase" title="Obriga a bipar um número de série único ao dar entrada ou saída.">Rastrear N. de Série?</label>
                  <Select value={form.rastreia_serie} onValueChange={v => setForm({...form, rastreia_serie: v})}>
                      <SelectTrigger className="bg-slate-50"><SelectValue/></SelectTrigger>
                      <SelectContent><SelectItem value="Sim">Sim (Item Único)</SelectItem><SelectItem value="Não">Não (Lote / Granel)</SelectItem></SelectContent>
                  </Select>
              </div>
              <div className="space-y-2">
                  <label className="text-xs font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded">É um Equipamento?</label>
                  <Select value={form.is_equipamento} onValueChange={v => setForm({...form, is_equipamento: v})}>
                      <SelectTrigger className={`font-bold ${form.is_equipamento === "Sim" ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "bg-slate-50"}`}><SelectValue/></SelectTrigger>
                      <SelectContent><SelectItem value="Sim">Sim (Máquina)</SelectItem><SelectItem value="Não">Não (Peça/Insumo)</SelectItem></SelectContent>
                  </Select>
              </div>
            </div>

            {/* SEÇÃO 2: ESPECIFICAÇÕES TÉCNICAS (SÓ APARECE SE FOR EQUIPAMENTO) */}
            {form.is_equipamento === "Sim" && (
                <div className="p-5 bg-indigo-900 rounded-xl border border-indigo-800 space-y-4 shadow-inner animate-in fade-in zoom-in-95">
                    <h4 className="text-sm font-bold text-indigo-200 uppercase tracking-widest flex items-center gap-2"><Settings className="w-4 h-4"/> Especificações Técnicas da Máquina</h4>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-bold text-indigo-300 uppercase">Fabricante / Marca</label>
                            <Input value={form.fabricante} onChange={e => setForm({...form, fabricante: e.target.value})} placeholder="Ex: Brother, Konica..." className="bg-indigo-950/50 border-indigo-700 text-white placeholder:text-indigo-400/50" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-bold text-indigo-300 uppercase">Família / Categoria</label>
                            <Input value={form.familia} onChange={e => setForm({...form, familia: e.target.value})} placeholder="Ex: Laser Monocromática..." className="bg-indigo-950/50 border-indigo-700 text-white placeholder:text-indigo-400/50" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-indigo-300 uppercase">Ano Lançamento</label>
                            <Input type="number" value={form.ano_lancamento} onChange={e => setForm({...form, ano_lancamento: e.target.value})} placeholder="Ex: 2022" className="bg-indigo-950/50 border-indigo-700 text-white placeholder:text-indigo-400/50 text-center" />
                        </div>
                        
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-bold text-indigo-300 uppercase">Tamanho Max. de Papel</label>
                            <Select value={form.formato_papel} onValueChange={v => setForm({...form, formato_papel: v})}>
                                <SelectTrigger className="bg-indigo-950/50 border-indigo-700 text-white font-bold"><SelectValue/></SelectTrigger>
                                <SelectContent position="popper" className="z-[99] bg-slate-800 text-white border-slate-700">
                                    <SelectItem value="A4">Formato A4</SelectItem>
                                    <SelectItem value="A3">Formato A3</SelectItem>
                                    <SelectItem value="SUPERA3">Formato Super A3</SelectItem>
                                    <SelectItem value="A0">Formato A0 (Plotter)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-indigo-300 uppercase">Velocidade (PPM)</label>
                            <div className="relative">
                                <Input type="number" value={form.ppm} onChange={e => setForm({...form, ppm: e.target.value})} className="bg-indigo-950/50 border-indigo-700 text-white font-bold pr-12 text-center" />
                                <span className="absolute right-3 top-2.5 text-[10px] font-bold text-indigo-400">PPM</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setMostrarForm(false)}>Cancelar</Button>
              <Button onClick={salvarProduto} disabled={salvando} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold px-6 shadow-md">
                 {salvando ? "Salvando..." : <><CheckCircle2 className="w-4 h-4"/> Salvar Produto</>}
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TABELA DE LISTAGEM DO CATÁLOGO */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4 bg-slate-50">
              <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por Nome, SKU ou Fabricante..." className="pl-9 bg-white" />
              </div>
            </div>
            
            <div className="overflow-x-auto min-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b w-32">SKU</th>
                    <th className="p-4 font-semibold border-b min-w-[300px]">Produto / Especificações</th>
                    <th className="p-4 font-semibold border-b text-center">Tipo</th>
                    <th className="p-4 font-semibold border-b text-center w-24">Estoque</th>
                    <th className="p-4 font-semibold border-b text-right w-28">Custo/Venda</th>
                    <th className="p-4 font-semibold border-b text-center w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {produtosFiltrados.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhum produto encontrado no catálogo.</td></tr> : (
                    produtosFiltrados.map(prod => {
                        let specs = { ano: "", formato: "", ppm: "" };
                        if (prod.is_equipamento && prod.especificacoes) {
                            try { specs = typeof prod.especificacoes === 'string' ? JSON.parse(prod.especificacoes) : prod.especificacoes; } catch(e){}
                        }

                        return (
                        <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-500 text-xs">{prod.sku || 'S/N'}</td>
                          <td className="p-4">
                              <div className="flex items-start gap-2">
                                  {prod.is_equipamento ? <Printer className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5"/> : <Box className="w-4 h-4 text-slate-400 shrink-0 mt-0.5"/>}
                                  <div>
                                      <p className="font-bold text-slate-800 text-sm leading-tight">{prod.nome}</p>
                                      {prod.is_equipamento && (
                                          <div className="flex flex-wrap gap-2 mt-1.5">
                                              {prod.fabricante && <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border">{prod.fabricante}</span>}
                                              {specs.formato && <span className="text-[9px] font-bold uppercase bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">Max: {specs.formato}</span>}
                                              {specs.ppm && <span className="text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">{specs.ppm} PPM</span>}
                                              {specs.ano && <span className="text-[9px] font-bold uppercase bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100">{specs.ano}</span>}
                                          </div>
                                      )}
                                      {!prod.is_equipamento && prod.rastreia_serie && <span className="text-[9px] font-bold uppercase bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100 inline-block mt-1">Controlado por Lote/Série</span>}
                                  </div>
                              </div>
                          </td>
                          <td className="p-4 text-center">
                              {prod.is_equipamento ? (
                                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full uppercase tracking-wider shadow-sm">Equipamento</span>
                              ) : (
                                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-full uppercase tracking-wider">Insumo/Peça</span>
                              )}
                          </td>
                          <td className="p-4 text-center">
                              <span className={`text-sm font-black px-3 py-1 rounded-lg ${prod.estoque_atual > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                                  {prod.estoque_atual || 0}
                              </span>
                          </td>
                          <td className="p-4 text-right">
                              <p className="text-xs font-semibold text-slate-500 mb-0.5">C: R$ {Number(prod.custo_base || 0).toFixed(2).replace('.', ',')}</p>
                              <p className="text-xs font-bold text-emerald-600">V: R$ {Number(prod.preco_venda || 0).toFixed(2).replace('.', ',')}</p>
                          </td>
                          <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                  <Button variant="outline" size="icon" onClick={() => editarProduto(prod)} className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50"><Edit2 className="w-4 h-4"/></Button>
                                  <Button variant="outline" size="icon" onClick={() => deletarProduto(prod.id)} className="h-8 w-8 text-rose-500 border-rose-200 hover:bg-rose-50"><Trash2 className="w-4 h-4"/></Button>
                              </div>
                          </td>
                        </tr>
                      )})
                  )}
                </tbody>
              </table>
            </div>
        </div>
      </div>
    </AppLayout>
  );
}