import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { 
  Package, Plus, Search, Loader2, ListChecks, FileDown, 
  Table as TableIcon, Database, Edit, ArrowLeftRight, Activity, RefreshCcw
} from "lucide-react";
import { supabase } from "@/shared/lib/supabase/client";
import { useExportacaoN8N } from "@/shared/hooks/useExportN8N";

interface ListaProdutosProps {
  produtos: any[];
  carregando: boolean;
  onNovo: () => void;
  onEditar: (prod: any) => void;
  onInventario: (prod: any) => void;
  onExtrato: (prod: any) => void;
  refreshProdutos: () => void;
}

const ITENS_POR_PAGINA = 15;

function ExportDropdown({ 
  exportando, 
  carregando, 
  dispararExportacao, 
  getDadosExportacao, 
  produtosFiltrados, 
  selecionadosLen 
}: any) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = (params: any) => {
    dispararExportacao(params);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <Button 
        disabled={exportando || carregando} 
        variant="outline" 
        size="sm" 
        onClick={() => setOpen(!open)}
        className="gap-2 text-slate-700 border-slate-200"
      >
        {exportando ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileDown className="w-4 h-4"/>} 
        Exportar Relatórios
      </Button>
      
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-md shadow-lg z-[99999] py-1 overflow-hidden">
          <div className="px-2 py-1.5 text-xs font-semibold text-slate-500">Catálogo Principal</div>
          
          <button 
            onClick={() => handleExport({ modulo: 'Catálogo de Produtos', tipo: 'excel', dados: getDadosExportacao() })}
            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <TableIcon className="w-4 h-4 text-emerald-600"/> Excel {selecionadosLen > 0 && `(${selecionadosLen})`}
          </button>
          
          <button 
            onClick={() => handleExport({ modulo: 'Catálogo de Produtos', tipo: 'pdf', dados: getDadosExportacao() })}
            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <FileDown className="w-4 h-4 text-rose-600"/> PDF {selecionadosLen > 0 && `(${selecionadosLen})`}
          </button>

          <div className="h-px bg-slate-200 my-1" />
          
          <div className="px-2 py-1.5 text-xs font-semibold text-slate-500">Cadastros Auxiliares</div>
          
          <button 
            onClick={() => handleExport({ modulo: 'Catálogo Auxiliares', tipo: 'excel', dados: produtosFiltrados })}
            className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 flex items-center gap-2"
          >
            <Database className="w-4 h-4 text-slate-400"/> Bases e Famílias (Excel)
          </button>

          <div className="h-px bg-slate-200 my-1" />
          
          <div className="px-2 py-1.5 text-xs font-semibold text-slate-400">Performance (Em breve)</div>
          
          <button disabled className="w-full text-left px-3 py-2 text-sm text-slate-400 flex items-center gap-2 opacity-70 cursor-not-allowed">
            <Activity className="w-4 h-4"/> Curva ABC
          </button>
          
          <button disabled className="w-full text-left px-3 py-2 text-sm text-slate-400 flex items-center gap-2 opacity-70 cursor-not-allowed">
            <RefreshCcw className="w-4 h-4"/> Giro de Estoque
          </button>
        </div>
      )}
    </div>
  );
}

export default function ListaProdutos({ produtos, carregando, onNovo, onEditar, onInventario, onExtrato, refreshProdutos }: ListaProdutosProps) {
  const [modoLote, setModoLote] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [loteCampo, setLoteCampo] = useState("");
  const [loteValor, setLoteValor] = useState("");

  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroFabricante, setFiltroFabricante] = useState("todos");
  const [filtroCondicao, setFiltroCondicao] = useState("todas");
  const [filtroFamilia, setFiltroFamilia] = useState("todas");
  const [filtroPerfil, setFiltroPerfil] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("nome_asc");
  const [paginaAtual, setPaginaAtual] = useState(0);

  const { dispararExportacao, exportando } = useExportacaoN8N();

  useEffect(() => {
    setPaginaAtual(0);
  }, [busca, filtroCategoria, filtroFabricante, filtroCondicao, filtroFamilia, filtroPerfil, ordenacao]);

  const extrairUnicos = (campo: string) => Array.from(new Set(produtos.map(p => p[campo]).filter(f => f && f.trim() !== ""))).sort();
  const fabricantesUnicos = extrairUnicos("fabricante");
  const familiasUnicas = extrairUnicos("familia");
  const perfisUnicos = extrairUnicos("perfil");
  const condicoesUnicas = extrairUnicos("condicao");

  const produtosFiltrados = useMemo(() => {
    let filtrados = produtos.filter(prod => {
      const bateCategoria = filtroCategoria === "todas" || prod.categoria === filtroCategoria;
      const bateFabricante = filtroFabricante === "todos" || prod.fabricante === filtroFabricante;
      const bateCondicao = filtroCondicao === "todas" || prod.condicao === filtroCondicao;
      const bateFamilia = filtroFamilia === "todas" || prod.familia === filtroFamilia;
      const batePerfil = filtroPerfil === "todos" || prod.perfil === filtroPerfil;
      const termoBusca = busca.toLowerCase();
      const bateBusca = (prod.nome?.toLowerCase() || "").includes(termoBusca) || (prod.sku?.toLowerCase() || "").includes(termoBusca) || (prod.familia?.toLowerCase() || "").includes(termoBusca) || (prod.perfil?.toLowerCase() || "").includes(termoBusca) || (prod.modelo?.toLowerCase() || "").includes(termoBusca);
      return bateCategoria && bateFabricante && bateCondicao && bateFamilia && batePerfil && bateBusca;
    });

    return filtrados.sort((a, b) => {
      if (ordenacao === "nome_asc") return (a.nome || "").localeCompare(b.nome || "");
      if (ordenacao === "categoria_asc") return (a.categoria || "").localeCompare(b.categoria || "");
      if (ordenacao === "fabricante_asc") return (a.fabricante || "").localeCompare(b.fabricante || "");
      return 0;
    });
  }, [produtos, busca, filtroCategoria, filtroFabricante, filtroCondicao, filtroFamilia, filtroPerfil, ordenacao]);

  const totalPaginas = Math.ceil(produtosFiltrados.length / ITENS_POR_PAGINA);
  const produtosPaginados = produtosFiltrados.slice(paginaAtual * ITENS_POR_PAGINA, (paginaAtual + 1) * ITENS_POR_PAGINA);

  const toggleSelecao = (id: string) => { 
    setSelecionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); 
  };

  const aplicarEdicaoLote = async () => {
    if (!loteCampo) return alert("Selecione qual campo deseja alterar!");
    if (!loteValor && !['condicao', 'familia', 'perfil'].includes(loteCampo)) return alert("Informe o novo valor!");
    const payload = { [loteCampo]: loteValor };
    
    const { error } = await supabase.from('log_produtos').update(payload).in('id', selecionados);
    if (error) alert("Erro ao atualizar: " + error.message);
    else { 
      alert(`${selecionados.length} produtos atualizados com sucesso!`); 
      refreshProdutos(); 
      setModoLote(false); 
      setSelecionados([]); 
      setLoteCampo(""); 
      setLoteValor(""); 
    }
  };

  const getDadosExportacao = () => {
    if (selecionados.length > 0) {
      return produtosFiltrados.filter(p => selecionados.includes(p.id));
    }
    return produtosFiltrados;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <Package className="w-6 h-6 text-stone-600" /> Catálogo de Produtos
          </h1>
          <p className="text-slate-500">Gestão unificada de equipamentos, peças e insumos.</p>
        </div>
        {!modoLote ? (
          <div className="flex gap-2 flex-wrap justify-end">
            <ExportDropdown 
              exportando={exportando} 
              carregando={carregando} 
              dispararExportacao={dispararExportacao} 
              getDadosExportacao={getDadosExportacao} 
              produtosFiltrados={produtosFiltrados} 
              selecionadosLen={selecionados.length} 
            />
            <Button onClick={onNovo} className="gap-2 bg-stone-700 hover:bg-stone-800"><Plus className="w-4 h-4" /> Novo Produto</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => { setModoLote(false); setSelecionados([]); }}>Voltar ao Catálogo</Button>
        )}
      </div>

      {modoLote && (
        <div className="bg-white rounded-xl border shadow-sm p-8 max-w-2xl mx-auto mt-8">
          <div className="flex items-center gap-4 mb-6 border-b pb-4">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center"><ListChecks className="w-6 h-6 text-blue-600" /></div>
            <div><h2 className="text-xl font-bold text-slate-800">Edição em Massa</h2><p className="text-slate-500">Alterando <strong>{selecionados.length} produtos</strong> simultaneamente.</p></div>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Qual campo deseja alterar em todos?</label>
              <Select value={loteCampo} onValueChange={(val) => { setLoteCampo(val); setLoteValor(""); }}>
                <SelectTrigger className="bg-white z-[99999]"><SelectValue placeholder="Selecione o campo..." /></SelectTrigger>
                <SelectContent className="bg-white z-[99999]">
                  <SelectItem value="fabricante">Fabricante (Marca)</SelectItem>
                  <SelectItem value="familia">Família de Produto</SelectItem>
                  <SelectItem value="perfil">Perfil de Produto</SelectItem>
                  <SelectItem value="categoria">Categoria do Produto</SelectItem>
                  <SelectItem value="condicao">Condição (Novo/Recondicionado)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loteCampo === "categoria" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Nova Categoria:</label>
                <Select value={loteValor} onValueChange={setLoteValor}>
                  <SelectTrigger className="bg-white z-[99999]"><SelectValue/></SelectTrigger>
                  <SelectContent className="bg-white z-[99999]"><SelectItem value="Equipamento">Equipamento</SelectItem><SelectItem value="Peça">Peça</SelectItem><SelectItem value="Suprimento">Suprimento</SelectItem></SelectContent>
                </Select>
              </div>
            )}
            {(loteCampo === "fabricante" || loteCampo === "familia" || loteCampo === "perfil" || loteCampo === "condicao") && (
               <div className="space-y-2"><label className="text-sm font-medium">Novo Valor:</label><Input value={loteValor} onChange={e => setLoteValor(e.target.value)} /></div>
            )}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => setModoLote(false)}>Cancelar</Button>
              <Button onClick={aplicarEdicaoLote} className="bg-blue-600 hover:bg-blue-700 text-white">Aplicar Alteração em Massa</Button>
            </div>
          </div>
        </div>
      )}

      {!modoLote && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {selecionados.length > 0 && (
            <div className="bg-blue-50 border-b border-blue-100 p-3 px-6 flex justify-between items-center animate-in slide-in-from-top-2">
              <span className="text-blue-800 font-semibold">{selecionados.length} produto(s) selecionado(s)</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelecionados([])} className="text-blue-700 hover:bg-blue-100">Desmarcar Todos</Button>
                <Button size="sm" onClick={() => setModoLote(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><ListChecks className="w-4 h-4" /> Editar Selecionados</Button>
              </div>
            </div>
          )}

          <div className="p-4 border-b flex flex-wrap gap-3 bg-white items-center">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar Nome, SKU, Compatibilidade..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}><SelectTrigger className="w-[160px] bg-white z-[99999] text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger><SelectContent className="bg-white z-[99999]"><SelectItem value="todas">Todas as Categorias</SelectItem><SelectItem value="Equipamento">Equipamentos</SelectItem><SelectItem value="Peça">Peças</SelectItem><SelectItem value="Suprimento">Suprimentos</SelectItem></SelectContent></Select>
            <Select value={filtroFabricante} onValueChange={setFiltroFabricante}><SelectTrigger className="w-[150px] bg-white z-[99999] text-xs"><SelectValue placeholder="Fabricante" /></SelectTrigger><SelectContent className="bg-white z-[99999]"><SelectItem value="todos">Fabricantes (Todos)</SelectItem>{fabricantesUnicos.map((fab, idx) => (<SelectItem key={idx} value={fab as string}>{fab as string}</SelectItem>))}</SelectContent></Select>
            <Select value={filtroCondicao} onValueChange={setFiltroCondicao}><SelectTrigger className="w-[150px] bg-white z-[99999] text-xs"><SelectValue placeholder="Condição" /></SelectTrigger><SelectContent className="bg-white z-[99999]"><SelectItem value="todas">Condição (Todas)</SelectItem>{condicoesUnicas.map((cond, idx) => (<SelectItem key={idx} value={cond as string}>{cond as string}</SelectItem>))}</SelectContent></Select>
            <Select value={filtroFamilia} onValueChange={setFiltroFamilia}><SelectTrigger className="w-[150px] bg-white z-[99999] text-xs"><SelectValue placeholder="Família" /></SelectTrigger><SelectContent className="bg-white z-[99999]"><SelectItem value="todas">Família (Todas)</SelectItem>{familiasUnicas.map((fam, idx) => (<SelectItem key={idx} value={fam as string}>{fam as string}</SelectItem>))}</SelectContent></Select>
            <Select value={filtroPerfil} onValueChange={setFiltroPerfil}><SelectTrigger className="w-[150px] bg-white z-[99999] text-xs"><SelectValue placeholder="Perfil" /></SelectTrigger><SelectContent className="bg-white z-[99999]"><SelectItem value="todos">Perfil (Todos)</SelectItem>{perfisUnicos.map((perf, idx) => (<SelectItem key={idx} value={perf as string}>{perf as string}</SelectItem>))}</SelectContent></Select>
          </div>

          <div className="divide-y min-h-[400px]">
            {carregando ? (
              <div className="p-12 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600"/> Carregando catálogo...</div>
            ) : produtosPaginados.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Nenhum produto encontrado.</div>
            ) : (
              produtosPaginados.map(prod => (
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
                          <Button variant="outline" size="sm" onClick={() => onExtrato(prod)} className="h-7 text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-1 bg-indigo-50/30" title="Ver histórico">
                              <Search className="w-3 h-3"/> Extrato
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => onInventario(prod)} className="h-7 text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1 bg-emerald-50/30" title="Balanço Físico">
                              <ArrowLeftRight className="w-3 h-3"/> Inventário
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => onEditar(prod)} className="h-7 text-xs text-slate-500 hover:text-stone-700 gap-1">
                              <Edit className="w-3 h-3" /> Editar
                          </Button>
                      </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPaginas > 1 && (
            <div className="p-4 border-t flex justify-between items-center bg-slate-50">
              <span className="text-sm text-slate-500 font-medium">Página <strong className="text-slate-800">{paginaAtual + 1}</strong> de {totalPaginas}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPaginaAtual(p => Math.max(0, p - 1))} disabled={paginaAtual === 0} className="font-semibold">Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setPaginaAtual(p => Math.min(totalPaginas - 1, p + 1))} disabled={paginaAtual >= totalPaginas - 1} className="font-semibold">Próxima</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}