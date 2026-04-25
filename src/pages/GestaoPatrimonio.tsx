import { useState, useEffect } from "react";
import { 
    AlertTriangle, Building, Calculator, Car, CheckCircle2, FileBadge, 
    Landmark, Laptop, MapPin, Plus, Search, Server, Shield, Sofa, 
    Tag, Trash2, Wifi, Wrench 
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export default function GestaoPatrimonio() {
  const [abaAtiva, setAbaAtiva] = useState<"ativos" | "servicos">("ativos");

  // ==========================================
  // ESTADOS: ATIVOS FÍSICOS
  // ==========================================
  const [ativos, setAtivos] = useState<any[]>([]);
  const [buscaAtivos, setBuscaAtivos] = useState("");
  const [mostrarFormAtivo, setMostrarFormAtivo] = useState(false);
  const [formAtivo, setFormAtivo] = useState({
    categoria: "TI / Informática", descricao: "", marca_modelo: "", identificacao_extra: "",
    data_aquisicao: "", valor_aquisicao: "", taxa_depreciacao_anual: "20", status: "Ativo", setor_alocado: "", responsavel: ""
  });

  // ==========================================
  // ESTADOS: SERVIÇOS E CONTRATOS
  // ==========================================
  const [servicos, setServicos] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [catInfraId, setCatInfraId] = useState("");
  const [buscaServicos, setBuscaServicos] = useState("");
  
  const [mostrarFormServico, setMostrarFormServico] = useState(false);
  const [formServico, setFormServico] = useState({
    categoria: "Internet/Telefonia", descricao: "", fornecedor_nome: "", periodicidade: "Mensal", 
    valor_custo: "", data_vencimento: "", dia_vencimento: "10", status: "Ativo"
  });

  const mesAtualStr = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  const [mostrarMotor, setMostrarMotor] = useState(false);
  const [mesLancamento, setMesLancamento] = useState(mesAtualStr);
  const [processando, setProcessando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetchDados();
  }, [abaAtiva]);

  const fetchDados = async () => {
    if (abaAtiva === "ativos") {
        const { data } = await supabase.from('adm_ativos_fisicos').select('*').order('codigo_patrimonio', { ascending: false });
        if (data) setAtivos(data);
    } else {
        const { data: servs } = await supabase.from('adm_servicos_estruturais').select('*').order('data_vencimento', { ascending: true });
        const { data: forns } = await supabase.from('log_fornecedores').select('id, nome_fantasia');
        const { data: cat } = await supabase.from('fin_categorias').select('id').ilike('nome', '%Infraestrutura%').limit(1).single();
        
        if (servs) setServicos(servs);
        if (forns) setFornecedores(forns);
        if (cat) setCatInfraId(cat.id);
    }
  };

  // --- LÓGICA ATIVOS ---
  const salvarAtivo = async () => {
    if (!formAtivo.descricao || !formAtivo.valor_aquisicao || !formAtivo.data_aquisicao) return alert("Descrição, Data e Valor são obrigatórios.");
    setSalvando(true);
    try {
        const payload = { ...formAtivo, valor_aquisicao: parseFloat(formAtivo.valor_aquisicao), taxa_depreciacao_anual: parseFloat(formAtivo.taxa_depreciacao_anual) || 0 };
        await supabase.from('adm_ativos_fisicos').insert([payload]);
        alert("Ativo cadastrado com sucesso!");
        setMostrarFormAtivo(false);
        setFormAtivo({ categoria: "TI / Informática", descricao: "", marca_modelo: "", identificacao_extra: "", data_aquisicao: "", valor_aquisicao: "", taxa_depreciacao_anual: "20", status: "Ativo", setor_alocado: "", responsavel: "" });
        fetchDados();
    } catch(e:any) { alert(e.message); } finally { setSalvando(false); }
  };

  const deletarAtivo = async (id: string) => {
      if(!confirm("Tem certeza que deseja excluir este ativo?")) return;
      await supabase.from('adm_ativos_fisicos').delete().eq('id', id);
      fetchDados();
  };

  const calcularValorResidual = (ativo: any) => {
      if (!ativo.data_aquisicao || !ativo.taxa_depreciacao_anual || ativo.taxa_depreciacao_anual === 0) return ativo.valor_aquisicao;
      const anosPassados = (new Date().getTime() - new Date(ativo.data_aquisicao).getTime()) / (1000 * 60 * 60 * 24 * 365);
      const depreciacaoTotal = (ativo.taxa_depreciacao_anual / 100) * anosPassados;
      const residual = ativo.valor_aquisicao * (1 - depreciacaoTotal);
      return Math.max(0, residual);
  };

  // --- LÓGICA SERVIÇOS ---
  const salvarServico = async () => {
    if (!formServico.descricao) return alert("A descrição é obrigatória.");
    setSalvando(true);
    try {
        const payload = { 
            ...formServico, 
            valor_custo: parseFloat(formServico.valor_custo) || 0, 
            dia_vencimento: parseInt(formServico.dia_vencimento) || 10,
            data_vencimento: formServico.data_vencimento || null 
        };
        await supabase.from('adm_servicos_estruturais').insert([payload]);
        alert("Serviço/Contrato registrado!");
        setMostrarFormServico(false);
        setFormServico({ categoria: "Internet/Telefonia", descricao: "", fornecedor_nome: "", periodicidade: "Mensal", valor_custo: "", data_vencimento: "", dia_vencimento: "10", status: "Ativo" });
        fetchDados();
    } catch(e:any) { alert(e.message); } finally { setSalvando(false); }
  };

  const deletarServico = async (id: string) => {
      if(!confirm("Tem certeza que deseja excluir este serviço?")) return;
      await supabase.from('adm_servicos_estruturais').delete().eq('id', id);
      fetchDados();
  };

  // --- INTEGRAÇÃO FINANCEIRO (FACILITIES) ---
  const processarLancamentosDoMes = async () => {
      if (!mesLancamento || mesLancamento.length !== 7) return alert("Informe o mês no formato MM/AAAA.");
      
      const servicosAtivos = servicos.filter(s => s.status === 'Ativo' && Number(s.valor_custo) > 0);
      if (servicosAtivos.length === 0) return alert("Não há serviços ativos com custo cadastrado para gerar.");

      if (!confirm(`Deseja gerar as obrigações financeiras (Contas a Pagar) para ${servicosAtivos.length} serviços referentes ao mês ${mesLancamento}?`)) return;

      setProcessando(true);
      try {
          const [mes, ano] = mesLancamento.split('/');
          
          const lancamentosFinanceiros = servicosAtivos.map(s => {
              const dataVenc = new Date(Number(ano), Number(mes) - 1, s.dia_vencimento || 10);
              return {
                  tipo: 'Despesa',
                  descricao: `${s.categoria}: ${s.descricao} - Ref. ${mesLancamento}`,
                  valor: s.valor_custo,
                  data_vencimento: dataVenc.toISOString().split('T')[0],
                  status: 'Pendente',
                  categoria_id: catInfraId || null,
                  centro_custo: 'Administrativo / Infraestrutura',
                  forma_pagamento: 'Boleto',
                  documento_origem: `FACIL-${mesLancamento.replace('/','')}`,
                  observacoes: `Fornecedor: ${s.fornecedor_nome || 'N/A'}`
              };
          });

          const { error } = await supabase.from('fin_lancamentos').insert(lancamentosFinanceiros);
          if (error) throw error;

          alert("Lote de Contas a Pagar gerado com sucesso no Módulo Financeiro!");
          setMostrarMotor(false);
      } catch (e: any) { alert("Erro ao integrar com financeiro: " + e.message); } finally { setProcessando(false); }
  };

  const ativosFiltrados = ativos.filter(a => a.descricao.toLowerCase().includes(buscaAtivos.toLowerCase()) || a.identificacao_extra?.toLowerCase().includes(buscaAtivos.toLowerCase()));
  const servicosFiltrados = servicos.filter(s => s.descricao.toLowerCase().includes(buscaServicos.toLowerCase()) || s.fornecedor_nome?.toLowerCase().includes(buscaServicos.toLowerCase()));

  const totalPatrimonioAquisicao = ativos.reduce((acc, a) => acc + Number(a.valor_aquisicao), 0);
  const totalPatrimonioResidual = ativos.reduce((acc, a) => acc + calcularValorResidual(a), 0);
  const custoMensalServicos = servicos.filter(s => s.status === 'Ativo' && s.periodicidade === 'Mensal').reduce((acc, s) => acc + Number(s.valor_custo), 0);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto mb-12">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Building className="w-6 h-6 text-indigo-600" /> Gestão de Patrimônio e Facilities</h1>
            <p className="text-slate-500">Controle de bens físicos (ativos), infraestrutura e serviços da empresa.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setAbaAtiva("ativos")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "ativos" ? "bg-white shadow-sm text-indigo-700" : "text-slate-600"}`}><Laptop className="w-4 h-4"/> Ativos Físicos</button>
            <button onClick={() => setAbaAtiva("servicos")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "servicos" ? "bg-white shadow-sm text-emerald-700" : "text-slate-600"}`}><Wifi className="w-4 h-4"/> Serviços e Contratos</button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA: ATIVOS FÍSICOS */}
        {/* ========================================================================= */}
        {abaAtiva === "ativos" && (
            <div className="space-y-6 animate-in fade-in duration-200">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="bg-indigo-100 p-3 rounded-full text-indigo-600"><Laptop className="w-6 h-6"/></div>
                        <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ativos Registrados</p><p className="text-2xl font-black text-slate-800">{ativos.length} <span className="text-sm font-medium text-slate-500">itens</span></p></div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="bg-slate-100 p-3 rounded-full text-slate-600"><Calculator className="w-6 h-6"/></div>
                        <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valor Bruto (Aquisição)</p><p className="text-2xl font-black text-slate-800">R$ {totalPatrimonioAquisicao.toFixed(2).replace('.',',')}</p></div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="bg-rose-100 p-3 rounded-full text-rose-600"><AlertTriangle className="w-6 h-6"/></div>
                        <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valor Residual (Depreciado)</p><p className="text-2xl font-black text-rose-600">R$ {totalPatrimonioResidual.toFixed(2).replace('.',',')}</p></div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border shadow-sm">
                    <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4 bg-slate-50 rounded-t-xl">
                        <div className="relative w-full max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={buscaAtivos} onChange={e => setBuscaAtivos(e.target.value)} placeholder="Buscar ativo por descrição, placa ou S/N..." className="pl-9 bg-white" /></div>
                        <Button onClick={() => setMostrarFormAtivo(!mostrarFormAtivo)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"><Plus className="w-4 h-4"/> Novo Ativo Físico</Button>
                    </div>

                    {mostrarFormAtivo && (
                        <div className="p-6 bg-white border-b border-slate-100 space-y-6">
                            <h3 className="font-bold text-indigo-800 flex items-center gap-2 border-b border-indigo-100 pb-2"><Plus className="w-5 h-5"/> Registrar Novo Bem Físico</h3>
                            
                            {/* BLOCO 1: IDENTIFICAÇÃO DO BEM */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Tag className="w-4 h-4 text-indigo-500"/> 1. Identificação Geral</h4>
                                
                                {/* Removido bg-slate-50/50 e relative para evitar conflito de z-index */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Categoria *</label>
                                        <Select value={formAtivo.categoria} onValueChange={v => setFormAtivo({...formAtivo, categoria: v})}>
                                            <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                                            <SelectContent className="bg-white z-50">
                                                <SelectItem value="Veículos">Veículos (Frota)</SelectItem>
                                                <SelectItem value="TI / Informática">TI / Informática</SelectItem>
                                                <SelectItem value="Ar-Condicionado">Ar-Condicionado</SelectItem>
                                                <SelectItem value="Móveis">Móveis e Estofados</SelectItem>
                                                <SelectItem value="Eletrodomésticos">Eletrodomésticos</SelectItem>
                                                <SelectItem value="Ferramentas">Ferramentas</SelectItem>
                                                <SelectItem value="Miscelânea">Outros (Miscelânea)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 lg:col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Descrição / Nome do Ativo *</label>
                                        <Input value={formAtivo.descricao} onChange={e => setFormAtivo({...formAtivo, descricao: e.target.value})} placeholder="Ex: Notebook Dell Inspiron, Ford Ka..." className="bg-white" />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Marca / Modelo</label>
                                        <Input value={formAtivo.marca_modelo} onChange={e => setFormAtivo({...formAtivo, marca_modelo: e.target.value})} className="bg-white" />
                                    </div>
                                    <div className="space-y-2 lg:col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Identificação (S/N, Placa, MAC)</label>
                                        <Input value={formAtivo.identificacao_extra} onChange={e => setFormAtivo({...formAtivo, identificacao_extra: e.target.value})} className="bg-white font-mono uppercase text-indigo-700" placeholder="Opcional" />
                                    </div>
                                </div>
                            </div>

                            {/* BLOCO 2: FINANCEIRO E ALOCAÇÃO */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><MapPin className="w-4 h-4 text-indigo-500"/> 2. Financeiro e Alocação</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Data Aquisição *</label>
                                        <Input type="date" value={formAtivo.data_aquisicao} onChange={e => setFormAtivo({...formAtivo, data_aquisicao: e.target.value})} className="bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Valor Aquisição (R$) *</label>
                                        <Input type="number" step="0.01" value={formAtivo.valor_aquisicao} onChange={e => setFormAtivo({...formAtivo, valor_aquisicao: e.target.value})} className="bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">% Depreciação (Ao Ano)</label>
                                        <Input type="number" value={formAtivo.taxa_depreciacao_anual} onChange={e => setFormAtivo({...formAtivo, taxa_depreciacao_anual: e.target.value})} className="bg-white" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Setor Alocado</label>
                                        <Input value={formAtivo.setor_alocado} onChange={e => setFormAtivo({...formAtivo, setor_alocado: e.target.value})} placeholder="Ex: Recepção" className="bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Responsável (Em posse)</label>
                                        <Input value={formAtivo.responsavel} onChange={e => setFormAtivo({...formAtivo, responsavel: e.target.value})} placeholder="Nome do funcionário..." className="bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Status Físico</label>
                                        <Select value={formAtivo.status} onValueChange={v => setFormAtivo({...formAtivo, status: v})}>
                                            <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                                            <SelectContent className="bg-white z-50">
                                                <SelectItem value="Ativo">Ativo (Em uso)</SelectItem>
                                                <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                                                <SelectItem value="Descartado">Descartado/Sucata</SelectItem>
                                                <SelectItem value="Vendido">Vendido</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setMostrarFormAtivo(false)}>Cancelar</Button>
                                <Button onClick={salvarAtivo} disabled={salvando} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md">Salvar Ativo</Button>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider border-t border-slate-200">
                                    <th className="p-4 font-semibold border-b text-center w-20">Pat.</th>
                                    <th className="p-4 font-semibold border-b">Descrição / Identificação</th>
                                    <th className="p-4 font-semibold border-b">Alocação</th>
                                    <th className="p-4 font-semibold border-b text-center">Status</th>
                                    <th className="p-4 font-semibold border-b text-right">Depreciação e Valor</th>
                                    <th className="p-4 font-semibold border-b w-12 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {ativosFiltrados.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhum ativo cadastrado.</td></tr> : (
                                    ativosFiltrados.map(a => {
                                        const valorResidual = calcularValorResidual(a);
                                        const iconeCat = a.categoria === 'Veículos' ? <Car className="w-4 h-4"/> : a.categoria === 'TI / Informática' ? <Laptop className="w-4 h-4"/> : a.categoria === 'Móveis' ? <Sofa className="w-4 h-4"/> : <Building className="w-4 h-4"/>;

                                        return (
                                        <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 text-center font-bold text-slate-400 font-mono text-xs">#{String(a.codigo_patrimonio).padStart(4,'0')}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-slate-400">{iconeCat}</span>
                                                    <p className="font-bold text-slate-800 text-sm">{a.descricao}</p>
                                                </div>
                                                <p className="text-[10px] text-slate-500 uppercase flex gap-2"><span>{a.marca_modelo}</span> {a.identificacao_extra && <span className="font-bold border-l pl-2 text-indigo-600 font-mono">{a.identificacao_extra}</span>}</p>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-xs font-semibold text-slate-700">{a.setor_alocado || 'Uso Comum'}</p>
                                                {a.responsavel && <p className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-1">Com: {a.responsavel}</p>}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${a.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : a.status === 'Em Manutenção' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>{a.status}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <p className="text-xs text-slate-400 line-through">R$ {Number(a.valor_aquisicao).toFixed(2).replace('.',',')}</p>
                                                <p className="text-sm font-black text-rose-600">R$ {valorResidual.toFixed(2).replace('.',',')}</p>
                                                <p className="text-[9px] text-slate-400 uppercase mt-0.5">Depreciação {a.taxa_depreciacao_anual}% a.a.</p>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button onClick={() => deletarAtivo(a.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                                            </td>
                                        </tr>
                                    )})
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: SERVIÇOS E CONTRATOS */}
        {/* ========================================================================= */}
        {abaAtiva === "servicos" && (
            <div className="space-y-6 animate-in fade-in duration-200">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-emerald-500">
                        <div className="bg-emerald-100 p-3 rounded-full text-emerald-600"><Server className="w-6 h-6"/></div>
                        <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Custo Fixo Mensal (Estrutura)</p><p className="text-3xl font-black text-slate-800">R$ {custoMensalServicos.toFixed(2).replace('.',',')}</p></div>
                    </div>
                    <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-sm">
                        <h3 className="text-xs font-bold text-amber-800 uppercase flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4"/> Atenção: Contratos Vencendo</h3>
                        <div className="space-y-2">
                            {servicos.filter(s => s.data_vencimento && new Date(s.data_vencimento) < new Date(new Date().setMonth(new Date().getMonth() + 1)) && s.status === 'Ativo').length === 0 ? (
                                <p className="text-sm text-amber-700/60 font-medium">Nenhum serviço vencendo nos próximos 30 dias.</p>
                            ) : (
                                servicos.filter(s => s.data_vencimento && new Date(s.data_vencimento) < new Date(new Date().setMonth(new Date().getMonth() + 1)) && s.status === 'Ativo').map(s => (
                                    <div key={s.id} className="flex justify-between items-center text-sm border-b border-amber-200/50 pb-1">
                                        <span className="font-semibold text-amber-900">{s.descricao}</span>
                                        <span className={`font-bold ${new Date(s.data_vencimento) < new Date() ? 'text-red-600' : 'text-amber-600'}`}>{new Date(s.data_vencimento).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border shadow-sm">
                    <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4 bg-slate-50 rounded-t-xl">
                        <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={buscaServicos} onChange={e => setBuscaServicos(e.target.value)} placeholder="Buscar serviço ou fornecedor..." className="pl-9 bg-white" /></div>
                        <div className="flex gap-2">
                            <Button onClick={() => setMostrarMotor(!mostrarMotor)} variant="outline" className="text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-2"><Landmark className="w-4 h-4"/> Gerar Contas a Pagar (Mês)</Button>
                            <Button onClick={() => setMostrarFormServico(!mostrarFormServico)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"><Plus className="w-4 h-4"/> Registrar Serviço</Button>
                        </div>
                    </div>

                    {/* PAGAMENTO EM LOTE */}
                    {mostrarMotor && (
                        <div className="p-6 bg-indigo-50 border-b border-indigo-200 space-y-4 animate-in slide-in-from-top-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-indigo-900 flex items-center gap-2"><Landmark className="w-5 h-5"/> Integração com Contas a Pagar</h3>
                                    <p className="text-xs text-indigo-700 mt-1">Gere as despesas do mês automaticamente para todos os serviços fixos ativos.</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setMostrarMotor(false)}>Fechar</Button>
                            </div>
                            
                            <div className="flex items-end gap-4 bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Mês de Referência</label>
                                    <Input value={mesLancamento} onChange={e => { let val = e.target.value.replace(/\D/g, ''); if(val.length > 2) val = val.substring(0,2)+'/'+val.substring(2,6); setMesLancamento(val); }} placeholder="MM/AAAA" className="w-32 text-center font-bold" maxLength={7} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-slate-600">Serão gerados <strong className="text-indigo-700">{servicos.filter(s => s.status === 'Ativo' && Number(s.valor_custo) > 0).length} lançamentos</strong> no valor total de <strong className="text-rose-600">R$ {custoMensalServicos.toFixed(2).replace('.',',')}</strong> no Módulo Financeiro.</p>
                                </div>
                                <Button onClick={processarLancamentosDoMes} disabled={processando} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-md gap-2">
                                    {processando ? "Processando..." : <><CheckCircle2 className="w-4 h-4"/> Confirmar e Lançar</>}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* FORMULÁRIO NOVO SERVIÇO */}
                    {mostrarFormServico && (
                        <div className="p-6 bg-white border-b border-slate-100 space-y-6">
                            <h3 className="font-bold text-emerald-800 flex items-center gap-2 border-b border-emerald-100 pb-2"><Plus className="w-5 h-5"/> Novo Contrato de Serviço</h3>
                            
                            {/* BLOCO 1: IDENTIFICAÇÃO SERVIÇO */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Wifi className="w-4 h-4 text-emerald-500"/> 1. Identificação do Serviço</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Categoria *</label>
                                        <Select value={formServico.categoria} onValueChange={v => setFormServico({...formServico, categoria: v})}>
                                            <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                                            <SelectContent className="bg-white z-50">
                                                <SelectItem value="Internet/Telefonia">Internet/Telefonia</SelectItem>
                                                <SelectItem value="Software/Hospedagem">Software/Hospedagem</SelectItem>
                                                <SelectItem value="Certificado Digital/Registro">Certificados e Registros</SelectItem>
                                                <SelectItem value="Segurança/Alarmes">Segurança/Alarmes</SelectItem>
                                                <SelectItem value="Elétrica/Hidráulica">Manutenção Predial</SelectItem>
                                                <SelectItem value="Outros">Outros</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 lg:col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Serviço Contratado *</label>
                                        <Input value={formServico.descricao} onChange={e => setFormServico({...formServico, descricao: e.target.value})} placeholder="Ex: Link Dedicado 1Gbps, Hospedagem Locaweb..." className="bg-white" />
                                    </div>
                                    <div className="space-y-2 lg:col-span-3">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Fornecedor</label>
                                        <Input list="lista-forns-pat" value={formServico.fornecedor_nome} onChange={e => setFormServico({...formServico, fornecedor_nome: e.target.value})} className="bg-white" placeholder="Opcional" />
                                        <datalist id="lista-forns-pat">{fornecedores.map(f => <option key={f.id} value={f.nome_fantasia}/>)}</datalist>
                                    </div>
                                </div>
                            </div>
                            
                            {/* BLOCO 2: CONDIÇÕES DE PAGAMENTO */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Landmark className="w-4 h-4 text-emerald-500"/> 2. Condições de Pagamento e Vencimento</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Periodicidade *</label>
                                        <Select value={formServico.periodicidade} onValueChange={v => setFormServico({...formServico, periodicidade: v})}>
                                            <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                                            <SelectContent className="bg-white z-50">
                                                <SelectItem value="Mensal">Mensal</SelectItem>
                                                <SelectItem value="Anual">Anual</SelectItem>
                                                <SelectItem value="Sob Demanda">Sob Demanda (Avulso)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Custo (R$)</label>
                                        <Input type="number" step="0.01" value={formServico.valor_custo} onChange={e => setFormServico({...formServico, valor_custo: e.target.value})} className="bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-emerald-600 uppercase">Dia Vencimento (Mês)</label>
                                        <Input type="number" min="1" max="31" value={formServico.dia_vencimento} onChange={e => setFormServico({...formServico, dia_vencimento: e.target.value})} className="bg-white border-emerald-300 font-bold" placeholder="Ex: 10" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Data Fim Contrato</label>
                                        <Input type="date" value={formServico.data_vencimento} onChange={e => setFormServico({...formServico, data_vencimento: e.target.value})} className="bg-white" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-emerald-100">
                                <Button variant="outline" onClick={() => setMostrarFormServico(false)}>Cancelar</Button>
                                <Button onClick={salvarServico} disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md">Salvar Serviço</Button>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider border-t border-slate-200">
                                    <th className="p-4 font-semibold border-b">Serviço / Estrutura</th>
                                    <th className="p-4 font-semibold border-b text-center">Status</th>
                                    <th className="p-4 font-semibold border-b text-center">Frequência</th>
                                    <th className="p-4 font-semibold border-b text-center">Dia Vencimento</th>
                                    <th className="p-4 font-semibold border-b text-right">Custo Declarado</th>
                                    <th className="p-4 font-semibold border-b w-12 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {servicosFiltrados.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhum serviço registrado.</td></tr> : (
                                    servicosFiltrados.map(s => {
                                        const iconeCat = s.categoria === 'Internet/Telefonia' ? <Wifi className="w-4 h-4"/> : s.categoria === 'Segurança/Alarmes' ? <Shield className="w-4 h-4"/> : s.categoria === 'Certificado Digital/Registro' ? <FileBadge className="w-4 h-4"/> : s.categoria === 'Software/Hospedagem' ? <Server className="w-4 h-4"/> : <Wrench className="w-4 h-4"/>;
                                        
                                        return (
                                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-slate-400">{iconeCat}</span>
                                                    <p className="font-bold text-slate-800 text-sm">{s.descricao}</p>
                                                </div>
                                                <p className="text-[10px] text-slate-500 uppercase">{s.fornecedor_nome || 'Fornecedor não especificado'}</p>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${s.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{s.status}</span>
                                            </td>
                                            <td className="p-4 text-center"><span className="text-[10px] text-slate-500 bg-slate-100 border px-1.5 py-0.5 rounded font-bold uppercase">{s.periodicidade}</span></td>
                                            <td className="p-4 text-center font-bold text-slate-700">
                                                Dia {s.dia_vencimento || '--'}
                                            </td>
                                            <td className="p-4 text-right font-black text-emerald-700">R$ {Number(s.valor_custo).toFixed(2).replace('.',',')}</td>
                                            <td className="p-4 text-center">
                                                <button onClick={() => deletarServico(s.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                                            </td>
                                        </tr>
                                    )})
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

      </div>
    </AppLayout>
  );
}