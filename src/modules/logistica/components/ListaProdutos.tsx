import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { 
  Package, Plus, Search, Loader2, ListChecks, FileDown, 
  Table as TableIcon, Database, Edit, ArrowLeftRight, FileText, X, MapPin, CheckCircle2, Activity, RefreshCcw
} from "lucide-react";
import { supabase } from "@/shared/lib/supabase/client";
import { useExportacaoN8N } from "@/shared/hooks/useExportN8N";
import { SearchModal, SearchModalItem } from "@/shared/components/ui/SearchModal";

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

function ExportDropdown({ exportando, carregando, dispararExportacao, getDadosExportacao, produtosFiltrados, selecionadosLen }: any) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = (params: any) => { dispararExportacao(params); setOpen(false); };

  return (
    <div className="relative" ref={ref}>
      <Button disabled={exportando || carregando} variant="outline" size="sm" onClick={() => setOpen(!open)} className="gap-2 text-slate-700 border-slate-200">
        {exportando ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileDown className="w-4 h-4"/>} Exportar Relatórios
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-md shadow-lg z-[99999] py-1 overflow-hidden">
          <div className="px-2 py-1.5 text-xs font-semibold text-slate-500">Catálogo Principal</div>
          <button onClick={() => handleExport({ modulo: 'Catálogo de Produtos', tipo: 'excel', dados: getDadosExportacao() })} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-emerald-600"/> Excel {selecionadosLen > 0 && `(${selecionadosLen})`}
          </button>
          <button onClick={() => handleExport({ modulo: 'Catálogo de Produtos', tipo: 'pdf', dados: getDadosExportacao() })} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2">
            <FileDown className="w-4 h-4 text-rose-600"/> PDF {selecionadosLen > 0 && `(${selecionadosLen})`}
          </button>
          <div className="h-px bg-slate-200 my-1" />
          <div className="px-2 py-1.5 text-xs font-semibold text-slate-500">Cadastros Auxiliares</div>
          <button onClick={() => handleExport({ modulo: 'Catálogo Auxiliares', tipo: 'excel', dados: produtosFiltrados })} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-400"/> Bases e Famílias (Excel)
          </button>
          <div className="h-px bg-slate-200 my-1" />
          <div className="px-2 py-1.5 text-xs font-semibold text-slate-400">Performance (Em breve)</div>
          <button disabled className="w-full text-left px-3 py-2 text-sm text-slate-400 flex items-center gap-2 opacity-70 cursor-not-allowed"><Activity className="w-4 h-4"/> Curva ABC</button>
          <button disabled className="w-full text-left px-3 py-2 text-sm text-slate-400 flex items-center gap-2 opacity-70 cursor-not-allowed"><RefreshCcw className="w-4 h-4"/> Giro de Estoque</button>
        </div>
      )}
    </div>
  );
}

export default function ListaProdutos({ produtos, carregando, onNovo, onEditar, refreshProdutos }: ListaProdutosProps) {
  const [usuarioAtual, setUsuarioAtual] = useState("Sistema");
  const [locaisEstoque, setLocaisEstoque] = useState<any[]>([]);
  
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

  // ESTADOS DO MODAL DE INVENTÁRIO
  const [modalSaldosAberto, setModalSaldosAberto] = useState(false);
  const [produtoSaldos, setProdutoSaldos] = useState<any | null>(null);
  const [saldosLocais, setSaldosLocais] = useState<any[]>([]);
  const [salvandoSaldos, setSalvandoSaldos] = useState(false);

  // ESTADOS DO MODAL DE EXTRATO/HISTÓRICO
  const [modalExtratoAberto, setModalExtratoAberto] = useState(false);
  const [produtoExtrato, setProdutoExtrato] = useState<any | null>(null);
  const [movimentacoesProduto, setMovimentacoesProduto] = useState<any[]>([]);
  const [saldosAtuaisProduto, setSaldosAtuaisProduto] = useState<any[]>([]);
  const [carregandoExtrato, setCarregandoExtrato] = useState(false);

  // Estados dos modais de busca (Spotlight)
  const [modalLoteAberto, setModalLoteAberto] = useState(false);
  const [buscaLote, setBuscaLote] = useState("");
  const [modalBuscaFabricante, setModalBuscaFabricante] = useState(false);
  const [buscaTermoFabricante, setBuscaTermoFabricante] = useState("");
  const [modalBuscaFamilia, setModalBuscaFamilia] = useState(false);
  const [buscaTermoFamilia, setBuscaTermoFamilia] = useState("");
  const [modalBuscaPerfil, setModalBuscaPerfil] = useState(false);
  const [buscaTermoPerfil, setBuscaTermoPerfil] = useState("");

  const { dispararExportacao, exportando } = useExportacaoN8N();

  useEffect(() => { setPaginaAtual(0); }, [busca, filtroCategoria, filtroFabricante, filtroCondicao, filtroFamilia, filtroPerfil, ordenacao]);

  useEffect(() => {
    const fetchDadosAuxiliares = async () => {
      const { data: locais } = await supabase.from('log_locais').select('*').order('nome');
      if (locais) setLocaisEstoque(locais);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data } = await supabase.from('permissoes').select('nome').eq('email', user.email).single();
        setUsuarioAtual(data?.nome || user.email);
      }
    };
    fetchDadosAuxiliares();
  }, []);

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

  const toggleSelecao = (id: string) => { setSelecionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); };

  const aplicarEdicaoLote = async () => {
    if (!loteCampo) return alert("Selecione qual campo deseja alterar!");
    if (!loteValor && !['condicao', 'familia', 'perfil'].includes(loteCampo)) return alert("Informe o novo valor!");
    const { error } = await supabase.from('log_produtos').update({ [loteCampo]: loteValor }).in('id', selecionados);
    if (error) alert("Erro ao atualizar: " + error.message);
    else { alert(`${selecionados.length} produtos atualizados com sucesso!`); refreshProdutos(); setModoLote(false); setSelecionados([]); setLoteCampo(""); setLoteValor(""); }
  };

  const getDadosExportacao = () => selecionados.length > 0 ? produtosFiltrados.filter(p => selecionados.includes(p.id)) : produtosFiltrados;

  const abrirSaldosEstoque = async (prod: any) => {
      setProdutoSaldos(prod);
      setModalSaldosAberto(true);
      const { data: saldosSalvos } = await supabase.from('log_produto_saldos').select('*').eq('produto_id', prod.id);
      const listaSaldos = locaisEstoque.map(local => {
          const saldoEncontrado = saldosSalvos?.find(s => s.local_id === local.id);
          return { local_id: local.id, nome: local.nome, tipo: local.tipo || 'Físico', quantidade: saldoEncontrado ? Number(saldoEncontrado.quantidade) : 0 };
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

          for (const s of saldosLocais) {
              await supabase.from('log_produto_saldos').upsert({ produto_id: produtoSaldos.id, local_id: s.local_id, quantidade: s.quantidade }, { onConflict: 'produto_id, local_id' });
          }
          await supabase.from('log_produtos').update({ estoque_atual: estoqueGlobalRecalculado }).eq('id', produtoSaldos.id);

          if (diferenca !== 0) {
              await supabase.from('log_movimentacoes').insert({
                  produto_id: produtoSaldos.id, tipo: 'Ajuste', quantidade: diferenca, 
                  documento: 'INV-' + new Date().getTime(), fornecedor_cliente: 'Balanço Físico',
                  usuario_nome: usuarioAtual, centro_custo: 'Ajuste de Inventário'
              });
          }
          alert("Inventário concluído! O estoque global e físico foram sincronizados.");
          setModalSaldosAberto(false);
          refreshProdutos(); 
      } catch (e: any) { alert("Erro ao atualizar saldos: " + e.message); } 
      finally { setSalvandoSaldos(false); }
  };

  const abrirExtrato = async (prod: any) => {
    setProdutoExtrato(prod);
    setModalExtratoAberto(true);
    setCarregandoExtrato(true);
    try {
        const { data: saldosSalvos } = await supabase.from('log_produto_saldos').select('*').eq('produto_id', prod.id).gt('quantidade', 0);
        const saldosMapeados = (saldosSalvos || []).map(s => {
            const localEncontrado = locaisEstoque.find(l => l.id === s.local_id);
            return { nome: localEncontrado?.nome || 'Local Desconhecido', quantidade: s.quantidade };
        });
        setSaldosAtuaisProduto(saldosMapeados);
        const { data: movs } = await supabase.from('log_movimentacoes').select('*').eq('produto_id', prod.id).order('data_movimentacao', { ascending: false }).limit(50);
        if (movs) setMovimentacoesProduto(movs);
    } catch(e) { console.error(e); }
    finally { setCarregandoExtrato(false); }
  };

  return (
    <div className="space-y-6">

      {/* MODAL DE INVENTÁRIO (Sincronização de Saldos Físicos) */}
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
                                  <div><p className="font-bold text-slate-800 text-sm">{local.nome}</p><p className="text-[10px] uppercase text-slate-500">{local.tipo}</p></div>
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

      {/* MODAL DE EXTRATO (FICHA DO PRODUTO) */}
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
                                                  <td className="p-3"><span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{mov.documento || 'Sem Ref'}</span></td>
                                                  <td className="p-3 text-right">
                                                      <p className={`font-black text-base ${isEntrada ? 'text-emerald-600' : isSaida ? 'text-rose-600' : 'text-slate-600'}`}>{mov.quantidade > 0 ? '+' : ''}{mov.quantidade}</p>
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

      {/* CABEÇALHO DA TELA */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Package className="w-6 h-6 text-stone-600" /> Catálogo de Produtos</h1>
          <p className="text-slate-500">Gestão unificada de equipamentos, peças e insumos.</p>
        </div>
        {!modoLote ? (
          <div className="flex gap-2 flex-wrap justify-end">
            <ExportDropdown exportando={exportando} carregando={carregando} dispararExportacao={dispararExportacao} getDadosExportacao={getDadosExportacao} produtosFiltrados={produtosFiltrados} selecionadosLen={selecionados.length} />
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
                  <SelectContent className="bg-white z-[99999]">
                    <SelectItem value="Equipamento">Equipamento</SelectItem>
                    <SelectItem value="Peça">Peça</SelectItem>
                    <SelectItem value="Suprimento">Suprimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {(loteCampo === "fabricante" || loteCampo === "familia" || loteCampo === "perfil" || loteCampo === "condicao") && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Novo Valor:</label>
                {loteCampo === "condicao" ? (
                  <Input value={loteValor} onChange={e => setLoteValor(e.target.value)} placeholder="Ex: Novo, Usado..." />
                ) : (
                  <div onClick={() => setModalLoteAberto(true)} className="flex items-center justify-between h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 cursor-pointer hover:border-indigo-400 hover:ring-1 hover:ring-indigo-100 transition-all">
                    <span className={loteValor ? "text-slate-800" : "text-slate-400"}>{loteValor || `Selecionar ${loteCampo}...`}</span>
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                )}
              </div>
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
            <div onClick={() => setModalBuscaFabricante(true)} className="flex items-center justify-between w-[150px] h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 cursor-pointer hover:border-indigo-400">
               <span className="truncate">{filtroFabricante === "todos" ? "Fabricante" : filtroFabricante}</span>
               <Search className="w-3 h-3 text-slate-400 shrink-0" />
            </div>
            <Select value={filtroCondicao} onValueChange={setFiltroCondicao}><SelectTrigger className="w-[150px] bg-white z-[99999] text-xs"><SelectValue placeholder="Condição" /></SelectTrigger><SelectContent className="bg-white z-[99999]"><SelectItem value="todas">Condição (Todas)</SelectItem>{condicoesUnicas.map((cond, idx) => (<SelectItem key={idx} value={cond as string}>{cond as string}</SelectItem>))}</SelectContent></Select>
            <div onClick={() => setModalBuscaFamilia(true)} className="flex items-center justify-between w-[150px] h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 cursor-pointer hover:border-indigo-400">
               <span className="truncate">{filtroFamilia === "todas" ? "Família" : filtroFamilia}</span>
               <Search className="w-3 h-3 text-slate-400 shrink-0" />
            </div>
            <div onClick={() => setModalBuscaPerfil(true)} className="flex items-center justify-between w-[150px] h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 cursor-pointer hover:border-indigo-400">
               <span className="truncate">{filtroPerfil === "todos" ? "Perfil" : filtroPerfil}</span>
               <Search className="w-3 h-3 text-slate-400 shrink-0" />
            </div>
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
                          <Button variant="outline" size="sm" onClick={() => abrirExtrato(prod)} className="h-7 text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-1 bg-indigo-50/30" title="Ver histórico">
                              <Search className="w-3 h-3"/> Extrato
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => abrirSaldosEstoque(prod)} className="h-7 text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1 bg-emerald-50/30" title="Balanço Físico">
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

      {/* MODAIS OCULTOS DE BUSCA SPOTLIGHT */}
      <SearchModal
        isOpen={modalLoteAberto}
        onClose={() => setModalLoteAberto(false)}
        title={`Selecionar ${loteCampo}`}
        placeholder={`Pesquisar ${loteCampo}...`}
        searchValue={buscaLote}
        onSearchChange={setBuscaLote}
      >
        {(loteCampo === 'fabricante' ? fabricantesUnicos : loteCampo === 'familia' ? familiasUnicas : loteCampo === 'perfil' ? perfisUnicos : [])
          .filter((item) => String(item).toLowerCase().includes(buscaLote.toLowerCase()))
          .map((item, idx) => (
            <SearchModalItem
              key={idx}
              title={String(item)}
              colorClass="indigo"
              onClick={() => { setLoteValor(String(item)); setModalLoteAberto(false); setBuscaLote(""); }}
            />
          ))}
      </SearchModal>
      
      <SearchModal
        isOpen={modalBuscaFabricante}
        onClose={() => setModalBuscaFabricante(false)}
        title="Filtrar por Fabricante"
        placeholder="Digite a marca do equipamento..."
        searchValue={buscaTermoFabricante}
        onSearchChange={setBuscaTermoFabricante}
      >
        <SearchModalItem title="Fabricantes (Todos)" colorClass="slate" onClick={() => { setFiltroFabricante("todos"); setModalBuscaFabricante(false); }} />
        {fabricantesUnicos
          .filter((fab) => String(fab).toLowerCase().includes(buscaTermoFabricante.toLowerCase()))
          .map((fab, idx) => (
            <SearchModalItem key={idx} title={String(fab)} colorClass="indigo" onClick={() => { setFiltroFabricante(String(fab)); setModalBuscaFabricante(false); setBuscaTermoFabricante(""); }} />
          ))}
      </SearchModal>

      <SearchModal
        isOpen={modalBuscaFamilia}
        onClose={() => setModalBuscaFamilia(false)}
        title="Filtrar por Família"
        placeholder="Ex: Jato de Tinta, Laser..."
        searchValue={buscaTermoFamilia}
        onSearchChange={setBuscaTermoFamilia}
      >
        <SearchModalItem title="Família (Todas)" colorClass="slate" onClick={() => { setFiltroFamilia("todas"); setModalBuscaFamilia(false); }} />
        {familiasUnicas
          .filter((fam) => String(fam).toLowerCase().includes(buscaTermoFamilia.toLowerCase()))
          .map((fam, idx) => (
            <SearchModalItem key={idx} title={String(fam)} colorClass="purple" onClick={() => { setFiltroFamilia(String(fam)); setModalBuscaFamilia(false); setBuscaTermoFamilia(""); }} />
          ))}
      </SearchModal>

      <SearchModal
        isOpen={modalBuscaPerfil}
        onClose={() => setModalBuscaPerfil(false)}
        title="Filtrar por Perfil"
        placeholder="Ex: Monocromática, Policromática..."
        searchValue={buscaTermoPerfil}
        onSearchChange={setBuscaTermoPerfil}
      >
        <SearchModalItem title="Perfil (Todos)" colorClass="slate" onClick={() => { setFiltroPerfil("todos"); setModalBuscaPerfil(false); }} />
        {perfisUnicos
          .filter((perf) => String(perf).toLowerCase().includes(buscaTermoPerfil.toLowerCase()))
          .map((perf, idx) => (
            <SearchModalItem key={idx} title={String(perf)} colorClass="emerald" onClick={() => { setFiltroPerfil(String(perf)); setModalBuscaPerfil(false); setBuscaTermoPerfil(""); }} />
          ))}
      </SearchModal>
      
    </div>
  );
}