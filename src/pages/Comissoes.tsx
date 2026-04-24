import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BadgePercent, Target, TrendingUp, BarChart4, Users, Plus, Trash2, Search, CalendarDays, DollarSign, PieChart, Layers, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function GestaoComissoes() {
  const [abaAtiva, setAbaAtiva] = useState<"dashboard" | "vendedores">("dashboard");

  // ==========================================
  // ESTADOS: VENDEDORES E METAS
  // ==========================================
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  
  const [formVendedorId, setFormVendedorId] = useState<string | null>(null);
  const [colaboradorId, setColaboradorId] = useState("");
  const [tipoVendedor, setTipoVendedor] = useState("Licitação");
  const [metas, setMetas] = useState<{id: string, min: string, max: string, pct: string}[]>([]);

  // ==========================================
  // ESTADOS: DASHBOARD & RELATÓRIOS
  // ==========================================
  const [vendedorSelecionado, setVendedorSelecionado] = useState<any | null>(null);
  const [dataFatInicio, setDataFatInicio] = useState("");
  const [dataFatFim, setDataFatFim] = useState("");
  const [dataRecInicio, setDataRecInicio] = useState("");
  const [dataRecFim, setDataRecFim] = useState("");
  
  const [pedidosReport, setPedidosReport] = useState<any[]>([]);
  const [contratosReport, setContratosReport] = useState<any[]>([]);
  const [carregandoRelatorio, setCarregandoRelatorio] = useState(false);

  useEffect(() => {
    fetchDadosBase();
  }, [abaAtiva]);

  const fetchDadosBase = async () => {
    const { data: colabs } = await supabase.from('rh_colaboradores').select('id, nome, cargo').eq('status', 'Ativo');
    if (colabs) setColaboradores(colabs);

    const { data: vends } = await supabase.from('rh_vendedores').select('*, rh_colaboradores(nome), rh_vendedores_metas(*)');
    if (vends) setVendedores(vends);
  };

  // --- GESTÃO DE VENDEDORES E METAS ---
  const adicionarFaixaMeta = () => {
    setMetas([...metas, { id: crypto.randomUUID(), min: "", max: "", pct: "" }]);
  };

  const atualizarFaixa = (id: string, campo: string, valor: string) => {
    setMetas(prev => prev.map(m => m.id === id ? { ...m, [campo]: valor } : m));
  };

  const removerFaixa = (id: string) => {
    setMetas(prev => prev.filter(m => m.id !== id));
  };

  const salvarVendedor = async () => {
    if (!colaboradorId) return alert("Selecione um colaborador.");
    try {
      let vendId = formVendedorId;

      // 1. Salva o Vendedor
      if (vendId) {
        await supabase.from('rh_vendedores').update({ tipo: tipoVendedor }).eq('id', vendId);
      } else {
        const { data, error } = await supabase.from('rh_vendedores').insert([{ colaborador_id: colaboradorId, tipo: tipoVendedor }]).select().single();
        if (error) throw error;
        vendId = data.id;
      }

      // 2. Salva as Metas (Recria limpando as antigas)
      await supabase.from('rh_vendedores_metas').delete().eq('vendedor_id', vendId);
      if (metas.length > 0) {
        const payloadMetas = metas.map(m => ({
          vendedor_id: vendId,
          valor_min: parseFloat(m.min) || 0,
          valor_max: m.max ? parseFloat(m.max) : null,
          percentual: parseFloat(m.pct) || 0
        }));
        await supabase.from('rh_vendedores_metas').insert(payloadMetas);
      }

      alert("Vendedor e Metas configurados com sucesso!");
      limparFormVendedor();
      fetchDadosBase();
    } catch (e: any) { alert("Erro ao salvar: " + e.message); }
  };

  const abrirEditarVendedor = (v: any) => {
    setFormVendedorId(v.id);
    setColaboradorId(v.colaborador_id);
    setTipoVendedor(v.tipo);
    setMetas(v.rh_vendedores_metas.map((m: any) => ({
      id: m.id, min: m.valor_min.toString(), max: m.valor_max ? m.valor_max.toString() : "", pct: m.percentual.toString()
    })));
  };

  const limparFormVendedor = () => {
    setFormVendedorId(null); setColaboradorId(""); setTipoVendedor("Licitação"); setMetas([]);
  };

  // --- MOTOR DE RELATÓRIOS E DASHBOARD ---
  const gerarRelatorio = async () => {
    if (!vendedorSelecionado) return alert("Selecione um vendedor para gerar o relatório.");
    setCarregandoRelatorio(true);
    
    try {
      // Puxa Pedidos de Venda vinculados a este vendedor
      let queryPedidos = supabase.from('com_pedidos_venda').select('*, log_clientes(nome_fantasia)').eq('vendedor_id', vendedorSelecionado.id);
      
      if (dataFatInicio) queryPedidos = queryPedidos.gte('data_emissao', dataFatInicio);
      if (dataFatFim) queryPedidos = queryPedidos.lte('data_emissao', dataFatFim);
      if (dataRecInicio) queryPedidos = queryPedidos.gte('data_recebimento', dataRecInicio);
      if (dataRecFim) queryPedidos = queryPedidos.lte('data_recebimento', dataRecFim);
      
      const { data: pedData } = await queryPedidos;
      if (pedData) setPedidosReport(pedData);

      // Se for Gráfica, puxa também os contratos trabalhados
      if (vendedorSelecionado.tipo === 'Gráfica') {
        const { data: contData } = await supabase.from('crm_contratos').select('*, log_clientes(nome_fantasia)').eq('vendedor_id', vendedorSelecionado.id);
        if (contData) setContratosReport(contData);
      }

    } catch (e) { console.error(e); } finally { setCarregandoRelatorio(false); }
  };

  // Cálculos do Dashboard Dinâmico
  const totalFaturadoMês = pedidosReport.reduce((acc, p) => acc + Number(p.valor_total || 0), 0);
  const totalRecebidoMês = pedidosReport.reduce((acc, p) => p.data_recebimento && (!dataRecInicio || p.data_recebimento >= dataRecInicio) && (!dataRecFim || p.data_recebimento <= dataRecFim) ? acc + Number(p.valor_recebido || 0) : acc, 0);
  const totalRetroativo = pedidosReport.reduce((acc, p) => p.data_recebimento && p.data_recebimento >= dataRecInicio && p.data_emissao < dataFatInicio ? acc + Number(p.valor_recebido || 0) : acc, 0);

  // Calcula a comissão baseada na escadinha (Metas)
  const baseCalculo = vendedorSelecionado?.tipo === 'ShowRoom' ? totalRecebidoMês : totalFaturadoMês; // Regra de exemplo
  let comissaoCalculada = 0;
  let aliquotaAplicada = 0;

  if (vendedorSelecionado?.rh_vendedores_metas) {
      for (const meta of vendedorSelecionado.rh_vendedores_metas) {
          const min = Number(meta.valor_min);
          const max = meta.valor_max ? Number(meta.valor_max) : Infinity;
          if (baseCalculo >= min && baseCalculo <= max) {
              aliquotaAplicada = Number(meta.percentual);
              comissaoCalculada = baseCalculo * (aliquotaAplicada / 100);
              break;
          }
      }
  }

  // Separação por formas de pagamento (Exclusivo ShowRoom)
  const faturamentoPorPgto = pedidosReport.reduce((acc, p) => {
      const fp = p.forma_pagamento || 'Outros';
      acc[fp] = (acc[fp] || 0) + Number(p.valor_total || 0);
      return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto mb-12">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><BadgePercent className="w-6 h-6 text-purple-600" /> Inteligência de Comissões</h1>
            <p className="text-slate-500">Gestão de metas escalonadas, relatórios faturado vs recebido e apuração de pagamentos.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setAbaAtiva("dashboard")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "dashboard" ? "bg-white shadow-sm text-purple-700" : "text-slate-600"}`}><BarChart4 className="w-4 h-4"/> Dashboard & Relatórios</button>
            <button onClick={() => setAbaAtiva("vendedores")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "vendedores" ? "bg-white shadow-sm text-purple-700" : "text-slate-600"}`}><Target className="w-4 h-4"/> Vendedores & Metas</button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA: CONFIGURAÇÃO DE VENDEDORES E METAS */}
        {/* ========================================================================= */}
        {abaAtiva === "vendedores" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
                
                {/* LISTA LATERAL */}
                <div className="bg-white rounded-xl border shadow-sm p-4 h-fit">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2"><Users className="w-4 h-4 text-slate-400"/> Vendedores Cadastrados</h3>
                    <div className="space-y-2">
                        {vendedores.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Nenhum vendedor configurado.</p> : vendedores.map(v => (
                            <div key={v.id} onClick={() => abrirEditarVendedor(v)} className={`p-3 rounded-lg border cursor-pointer transition-colors ${formVendedorId === v.id ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}>
                                <p className="font-bold text-slate-800 text-sm">{v.rh_colaboradores?.nome}</p>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-[10px] font-bold uppercase bg-white border px-1.5 py-0.5 rounded text-slate-600">{v.tipo}</span>
                                    <span className="text-[10px] text-purple-600 font-bold">{v.rh_vendedores_metas?.length || 0} Metas/Faixas</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FORMULÁRIO DE CADASTRO/EDIÇÃO */}
                <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm p-6 space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg"><Target className="w-5 h-5 text-purple-600"/> {formVendedorId ? 'Editar Perfil e Metas' : 'Novo Perfil de Vendas'}</h3>
                        <Button variant="ghost" onClick={limparFormVendedor} className="text-slate-400 hover:text-slate-700">Limpar</Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Colaborador (Vínculo DP) *</label>
                            <Select value={colaboradorId} onValueChange={setColaboradorId} disabled={!!formVendedorId}>
                                <SelectTrigger><SelectValue placeholder="Selecione do quadro..."/></SelectTrigger>
                                <SelectContent>{colaboradores.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} ({c.cargo})</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Segmentação da Venda *</label>
                            <Select value={tipoVendedor} onValueChange={setTipoVendedor}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Licitação">Consultor de Licitação</SelectItem>
                                    <SelectItem value="ShowRoom">Vendedor ShowRoom (Loja)</SelectItem>
                                    <SelectItem value="Gráfica">Consultor Gráfica (Contratos)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mt-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h4 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600"/> Escada de Metas e Alíquotas</h4>
                                <p className="text-xs text-slate-500">Defina os gatilhos para progressão de comissão do vendedor.</p>
                            </div>
                            <Button size="sm" onClick={adicionarFaixaMeta} className="bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200 gap-1"><Plus className="w-4 h-4"/> Adicionar Faixa</Button>
                        </div>

                        <div className="space-y-3">
                            {metas.length === 0 ? <p className="text-center text-sm text-slate-400 py-4 italic border-2 border-dashed border-slate-200 rounded-lg">Nenhuma regra definida. A comissão será zerada.</p> : (
                                metas.map((m, index) => (
                                    <div key={m.id} className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border shadow-sm">
                                        <span className="font-black text-slate-300">#{index+1}</span>
                                        <div className="flex-1 space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Valor Mínimo (R$)</label><Input type="number" value={m.min} onChange={e => atualizarFaixa(m.id, 'min', e.target.value)} className="h-8 text-sm font-semibold"/></div>
                                        <span className="text-slate-300 mt-5">até</span>
                                        <div className="flex-1 space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Valor Máximo (Deixe vazio p/ ilimitado)</label><Input type="number" value={m.max} onChange={e => atualizarFaixa(m.id, 'max', e.target.value)} className="h-8 text-sm font-semibold"/></div>
                                        <div className="w-24 space-y-1"><label className="text-[10px] font-bold text-emerald-600 uppercase">Comissão (%)</label><Input type="number" step="0.01" value={m.pct} onChange={e => atualizarFaixa(m.id, 'pct', e.target.value)} className="h-8 text-sm font-bold text-emerald-700 border-emerald-200 bg-emerald-50"/></div>
                                        <Button variant="ghost" size="icon" onClick={() => removerFaixa(m.id)} className="h-8 w-8 text-slate-400 hover:text-red-500 mt-5"><Trash2 className="w-4 h-4"/></Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end border-t border-slate-100 pt-4">
                        <Button onClick={salvarVendedor} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 shadow-md">Salvar Regras de Comissionamento</Button>
                    </div>
                </div>
            </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: DASHBOARD & RELATÓRIOS */}
        {/* ========================================================================= */}
        {abaAtiva === "dashboard" && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-200">
                
                {/* PAINEL DE FILTROS AVANÇADOS */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2"><Search className="w-4 h-4 text-purple-600"/> Extração de Relatórios e Filtros</h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
                        <div className="space-y-2 md:col-span-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Vendedor *</label>
                            <Select onValueChange={(id) => setVendedorSelecionado(vendedores.find(v => v.id === id) || null)}>
                                <SelectTrigger className="font-semibold text-purple-700 border-purple-200 bg-purple-50"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                                <SelectContent>{vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.rh_colaboradores?.nome} ({v.tipo})</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><CalendarDays className="w-3 h-3 text-sky-500"/> Período de Faturamento (Emissão)</label>
                            <div className="flex items-center gap-2">
                                <Input type="date" value={dataFatInicio} onChange={e=>setDataFatInicio(e.target.value)} className="h-9" /> <span className="text-xs font-medium text-slate-400">até</span> <Input type="date" value={dataFatFim} onChange={e=>setDataFatFim(e.target.value)} className="h-9" />
                            </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><DollarSign className="w-3 h-3 text-emerald-500"/> Período de Recebimento (Caixa)</label>
                            <div className="flex items-center gap-2">
                                <Input type="date" value={dataRecInicio} onChange={e=>setDataRecInicio(e.target.value)} className="h-9" /> <span className="text-xs font-medium text-slate-400">até</span> <Input type="date" value={dataRecFim} onChange={e=>setDataRecFim(e.target.value)} className="h-9" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end"><Button onClick={gerarRelatorio} disabled={carregandoRelatorio || !vendedorSelecionado} className="bg-slate-800 hover:bg-slate-900 text-white font-bold gap-2"><BarChart4 className="w-4 h-4"/> Gerar Visão de Comissões</Button></div>
                </div>

                {/* RESULTADOS - DASHBOARD */}
                {vendedorSelecionado && pedidosReport.length > 0 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        
                        {/* CARDS DE KPI */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-sky-50 border border-sky-200 p-5 rounded-xl shadow-sm">
                                <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-1 flex items-center justify-between">Total Faturado no Período <CalendarDays className="w-4 h-4 opacity-50"/></p>
                                <p className="text-3xl font-black text-sky-900">R$ {totalFaturadoMês.toFixed(2).replace('.',',')}</p>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl shadow-sm">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 flex items-center justify-between">Recebido no Período <DollarSign className="w-4 h-4 opacity-50"/></p>
                                <p className="text-3xl font-black text-emerald-900">R$ {totalRecebidoMês.toFixed(2).replace('.',',')}</p>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl shadow-sm">
                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1 flex items-center justify-between" title="Faturado antes do período selecionado, mas recebido agora">Recebido Retroativo <Clock className="w-4 h-4 opacity-50"/></p>
                                <p className="text-3xl font-black text-amber-900">R$ {totalRetroativo.toFixed(2).replace('.',',')}</p>
                            </div>
                            <div className="bg-purple-900 border border-purple-800 p-5 rounded-xl shadow-lg relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 bg-purple-500/20 w-24 h-24 rounded-full blur-xl"></div>
                                <p className="text-[10px] font-bold text-purple-300 uppercase tracking-widest mb-1 relative z-10 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Comissão Aprovada (Aliq: {aliquotaAplicada}%)</p>
                                <p className="text-4xl font-black text-white relative z-10">R$ {comissaoCalculada.toFixed(2).replace('.',',')}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* DETALHES POR FORMA DE PAGAMENTO (SHOWROOM) */}
                            {vendedorSelecionado.tipo === 'ShowRoom' && (
                                <div className="bg-white p-5 rounded-xl border shadow-sm">
                                    <h4 className="font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-slate-400"/> Faturamento por Forma de Pgto</h4>
                                    <div className="space-y-3">
                                        {Object.entries(faturamentoPorPgto).map(([fp, valor]) => (
                                            <div key={fp} className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-600">{fp}</span>
                                                <span className="text-sm font-bold text-slate-800">R$ {Number(valor).toFixed(2).replace('.',',')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* LISTA SINTÉTICA DOS PEDIDOS */}
                            <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${vendedorSelecionado.tipo === 'ShowRoom' ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                                <div className="p-4 border-b bg-slate-50">
                                    <h4 className="font-bold text-slate-800 flex items-center gap-2"><Layers className="w-4 h-4 text-slate-400"/> Memória de Cálculo (Pedidos)</h4>
                                </div>
                                <div className="overflow-x-auto max-h-[400px]">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead className="sticky top-0 bg-white shadow-sm">
                                            <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b">
                                                <th className="p-3 font-semibold">Nº Pedido</th>
                                                <th className="p-3 font-semibold">Cliente</th>
                                                <th className="p-3 font-semibold text-center">Data Faturamento</th>
                                                <th className="p-3 font-semibold text-center">Data Recebimento</th>
                                                <th className="p-3 font-semibold text-right">Valor Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {pedidosReport.map(p => (
                                                <tr key={p.id} className="hover:bg-slate-50">
                                                    <td className="p-3 font-bold font-mono text-purple-700">PED-{String(p.numero_pedido).padStart(4,'0')}</td>
                                                    <td className="p-3 font-medium text-slate-700">{p.log_clientes?.nome_fantasia || 'Cliente'}</td>
                                                    <td className="p-3 text-center text-slate-500">{new Date(p.data_emissao).toLocaleDateString('pt-BR')}</td>
                                                    <td className="p-3 text-center font-medium text-emerald-600">{p.data_recebimento ? new Date(p.data_recebimento).toLocaleDateString('pt-BR') : 'Pendente'}</td>
                                                    <td className="p-3 text-right font-bold text-slate-800">R$ {Number(p.valor_total).toFixed(2).replace('.',',')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        )}

      </div>
    </AppLayout>
  );
}