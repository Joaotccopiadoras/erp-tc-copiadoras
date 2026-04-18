import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSignature, Search, Plus, Building2, Calendar, Landmark, Settings, Printer, Calculator, CheckCircle2, History, AlertCircle, ArrowLeft, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function GestaoContratos() {
  const [abaAtiva, setAbaAtiva] = useState<"lista" | "novo" | "dossie">("lista");

  // ==========================================
  // ESTADOS: DADOS GERAIS
  // ==========================================
  const [contratos, setContratos] = useState<any[]>([]);
  const [clientesBD, setClientesBD] = useState<any[]>([]);
  const [catReceitaId, setCatReceitaId] = useState("");
  const [busca, setBusca] = useState("");

  // ==========================================
  // ESTADOS: NOVO CONTRATO
  // ==========================================
  const [form, setForm] = useState({
    cliente_id: "", titulo: "", tipo: "Locação de Impressoras", data_inicio: "", data_vencimento: "",
    valor_mensal: "", franquia_paginas: "0", valor_pagina_excedente: "0", exige_demonstrativo: "Sim", dia_faturamento: "1", contato_faturamento: "", observacoes: ""
  });
  const [salvando, setSalvando] = useState(false);

  // ==========================================
  // ESTADOS: DOSSIÊ DO CONTRATO E FATURAMENTO
  // ==========================================
  const [contratoSelecionado, setContratoSelecionado] = useState<any | null>(null);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [historicoFaturas, setHistoricoFaturas] = useState<any[]>([]);
  
  // Motor de Faturamento
  const mesAtualStr = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  const [mesFat, setMesFat] = useState(mesAtualStr);
  const [tipoFaturamento, setTipoFaturamento] = useState("Com Leitura/Excedente");
  const [leiturasAtuais, setLeiturasAtuais] = useState<Record<string, number>>({});
  const [faturando, setFaturando] = useState(false);

  useEffect(() => { fetchDadosBase(); fetchContratos(); }, []);

  const fetchDadosBase = async () => {
    const [cliRes, catRes] = await Promise.all([
      supabase.from('log_clientes').select('id, razao_social, nome_fantasia'),
      supabase.from('fin_categorias').select('id').eq('tipo', 'Receita').limit(1).single()
    ]);
    if (cliRes.data) setClientesBD(cliRes.data);
    if (catRes.data) setCatReceitaId(catRes.data.id);
  };

  const fetchContratos = async () => {
    const { data } = await supabase.from('crm_contratos').select('*, log_clientes(nome_fantasia)').order('data_inicio', { ascending: false });
    if (data) setContratos(data);
  };

  // --- CADASTRAR CONTRATO ---
  const salvarContrato = async () => {
    if (!form.cliente_id || !form.titulo || !form.data_inicio) return alert("Preencha Cliente, Título e Início.");
    setSalvando(true);
    try {
      const payload = {
        ...form,
        valor_mensal: parseFloat(form.valor_mensal) || 0,
        franquia_paginas: parseFloat(form.franquia_paginas) || 0,
        valor_pagina_excedente: parseFloat(form.valor_pagina_excedente) || 0,
        dia_faturamento: parseInt(form.dia_faturamento) || 1,
        exige_demonstrativo: form.exige_demonstrativo === "Sim"
      };
      
      const { error } = await supabase.from('crm_contratos').insert([payload]);
      if (error) throw error;
      
      alert("Contrato cadastrado com sucesso!");
      setAbaAtiva("lista"); fetchContratos();
    } catch (e: any) { alert("Erro: " + e.message); } finally { setSalvando(false); }
  };

  // --- ABRIR DOSSIÊ E PREPARAR MOTOR DE FATURAMENTO ---
  const abrirDossie = async (cont: any) => {
    setContratoSelecionado(cont); setAbaAtiva("dossie");
    setTipoFaturamento(cont.exige_demonstrativo ? "Com Leitura/Excedente" : "Franquia Fixa");

    const [eqRes, fatRes] = await Promise.all([
        // Puxa equipamentos instalados NESTE contrato
        supabase.from('srv_equipamentos').select('id, numero_serie, log_produtos(nome)').eq('contrato_id', cont.id),
        // Puxa histórico de faturas deste contrato
        supabase.from('com_faturamento_contratos').select('*').eq('contrato_id', cont.id).order('data_faturamento', { ascending: false })
    ]);

    if (eqRes.data) {
        setEquipamentos(eqRes.data);
        // Tenta puxar a última leitura de cada equipamento para facilitar a vida do faturista
        const stateLeituras: Record<string, number> = {};
        for (const eq of eqRes.data) {
             const { data: ultLeitura } = await supabase.from('srv_equipamentos_leituras').select('valor_leitura').eq('equipamento_id', eq.id).order('data_leitura', {ascending: false}).limit(1).single();
             stateLeituras[eq.id] = ultLeitura ? Number(ultLeitura.valor_leitura) : 0;
        }
        setLeiturasAtuais(stateLeituras);
    }
    if (fatRes.data) setHistoricoFaturas(fatRes.data);
  };

  // --- LÓGICA DO MOTOR DE FATURAMENTO ---
  // Calcula totais em tempo real
  const volumeTotalLido = Object.values(leiturasAtuais).reduce((a, b) => a + Number(b), 0);
  const excedente = Math.max(0, volumeTotalLido - Number(contratoSelecionado?.franquia_paginas || 0));
  const valorExcedente = excedente * Number(contratoSelecionado?.valor_pagina_excedente || 0);
  const valorTotalFatura = tipoFaturamento === "Franquia Fixa" 
      ? Number(contratoSelecionado?.valor_mensal || 0) 
      : Number(contratoSelecionado?.valor_mensal || 0) + valorExcedente;

  const processarFaturamento = async () => {
    if (!mesFat || mesFat.length !== 7) return alert("Informe o mês no formato MM/AAAA");
    if (!confirm(`Confirmar faturamento do contrato no valor de R$ ${valorTotalFatura.toFixed(2)}?\nIsso vai gerar uma Conta a Receber no Financeiro.`)) return;

    setFaturando(true);
    try {
        // 1. Gera a Fatura no Financeiro (Contas a Receber)
        const vencimento = new Date(); vencimento.setDate(contratoSelecionado.dia_faturamento);
        if (vencimento < new Date()) vencimento.setMonth(vencimento.getMonth() + 1);

        const payloadFin = {
            tipo: 'Receita',
            descricao: `Fatura Contrato: ${contratoSelecionado.titulo} (${mesFat})`,
            valor: valorTotalFatura,
            data_emissao: new Date().toISOString().split('T')[0],
            data_vencimento: vencimento.toISOString().split('T')[0],
            status: 'Pendente',
            categoria_id: catReceitaId || null,
            documento_origem: `FAT-${mesFat.replace('/','')}`,
            observacoes: `Franquia: R$ ${contratoSelecionado.valor_mensal} | Excedente: R$ ${valorExcedente.toFixed(2)} (${excedente} págs)`
        };

        const { data: finData, error: finErr } = await supabase.from('fin_lancamentos').insert([payloadFin]).select('id').single();
        if (finErr) throw finErr;

        // 2. Grava o Histórico do Faturamento no Contrato
        const payloadFatHist = {
            contrato_id: contratoSelecionado.id,
            mes_referencia: mesFat,
            tipo_faturamento: tipoFaturamento,
            volume_produzido: tipoFaturamento === "Franquia Fixa" ? 0 : volumeTotalLido,
            volume_excedente: tipoFaturamento === "Franquia Fixa" ? 0 : excedente,
            valor_franquia: contratoSelecionado.valor_mensal,
            valor_excedente: tipoFaturamento === "Franquia Fixa" ? 0 : valorExcedente,
            valor_total: valorTotalFatura,
            financeiro_id: finData.id,
            faturado_por: 'Gestor Interno'
        };

        await supabase.from('com_faturamento_contratos').insert([payloadFatHist]);

        // 3. Salva as leituras inseridas no histórico dos equipamentos (Bilhetagem)
        if (tipoFaturamento === "Com Leitura/Excedente") {
            for (const eqId of Object.keys(leiturasAtuais)) {
                if (leiturasAtuais[eqId] > 0) {
                    await supabase.from('srv_equipamentos_leituras').insert([{
                        equipamento_id: eqId, tipo_contador: 'Geral', valor_leitura: leiturasAtuais[eqId], origem: 'Faturamento'
                    }]);
                }
            }
        }

        alert("Faturamento concluído com sucesso e Conta a Receber gerada!");
        abrirDossie(contratoSelecionado); // Recarrega histórico
    } catch (e: any) { alert("Erro ao faturar: " + e.message); } finally { setFaturando(false); }
  };

  const contratosFiltrados = contratos.filter(c => 
    c.titulo.toLowerCase().includes(busca.toLowerCase()) || 
    (c.log_clientes?.nome_fantasia?.toLowerCase() || "").includes(busca.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto mb-12">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><FileSignature className="w-6 h-6 text-indigo-600" /> Gestão de Contratos</h1>
            <p className="text-slate-500">Administração de vigências, franquias, bilhetagem e faturamento recorrente.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => { setAbaAtiva("lista"); setContratoSelecionado(null); }} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "lista" ? "bg-white shadow-sm text-indigo-700" : "text-slate-600"}`}>Lista de Contratos</button>
            <button onClick={() => setAbaAtiva("novo")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "novo" ? "bg-white shadow-sm text-emerald-700" : "text-slate-600"}`}><Plus className="w-4 h-4"/> Novo Contrato</button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA: LISTA DE CONTRATOS */}
        {/* ========================================================================= */}
        {abaAtiva === "lista" && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4 bg-slate-50">
              <div className="relative w-full max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar contrato ou cliente..." className="pl-9 bg-white" /></div>
            </div>
            <div className="overflow-x-auto min-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b">Cliente / Título</th>
                    <th className="p-4 font-semibold border-b text-center">Tipo</th>
                    <th className="p-4 font-semibold border-b text-center">Vigência</th>
                    <th className="p-4 font-semibold border-b text-center">Status</th>
                    <th className="p-4 font-semibold border-b text-right">Mensalidade</th>
                    <th className="p-4 font-semibold border-b text-center w-28">Gestão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contratosFiltrados.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhum contrato cadastrado.</td></tr> : (
                    contratosFiltrados.map(cont => (
                      <tr key={cont.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => abrirDossie(cont)}>
                        <td className="p-4">
                            <p className="font-bold text-slate-800 text-sm leading-tight">{cont.log_clientes?.nome_fantasia || 'Sem Cliente'}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{cont.titulo}</p>
                        </td>
                        <td className="p-4 text-center"><span className="text-[10px] text-slate-500 bg-slate-100 border px-1.5 py-0.5 rounded font-bold uppercase">{cont.tipo}</span></td>
                        <td className="p-4 text-center">
                            <p className="text-xs font-semibold text-slate-700">{new Date(cont.data_inicio).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</p>
                            <p className="text-[10px] text-slate-400">até {new Date(cont.data_vencimento).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</p>
                        </td>
                        <td className="p-4 text-center"><span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full shadow-sm border border-white ${cont.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : cont.status === 'Cancelado' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>{cont.status}</span></td>
                        <td className="p-4 text-right font-bold text-indigo-700">R$ {Number(cont.valor_mensal).toFixed(2).replace('.', ',')}</td>
                        <td className="p-4 text-center"><Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 group-hover:bg-indigo-50 w-full gap-2"><Settings className="w-4 h-4"/> Faturar</Button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: NOVO CONTRATO (FORMULÁRIO) */}
        {/* ========================================================================= */}
        {abaAtiva === "novo" && (
          <div className="bg-white rounded-xl border shadow-sm p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="border-b pb-4 mb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FileSignature className="w-5 h-5 text-emerald-600"/> Registrar Novo Contrato</h2>
                <p className="text-sm text-slate-500 mt-1">Configure o cliente, a vigência e as regras de faturamento (franquia e excedente).</p>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase">Cliente (Tomador) *</label>
                        <Select value={form.cliente_id} onValueChange={v => setForm({...form, cliente_id: v})}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione do CRM..."/></SelectTrigger>
                            <SelectContent className="max-h-60 overflow-y-auto">{clientesBD.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-600 uppercase">Título do Contrato (Ref.) *</label><Input value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} className="bg-white" placeholder="Ex: Locação 5 Multifuncionais Administrativo" /></div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase">Modalidade</label>
                        <Select value={form.tipo} onValueChange={v => setForm({...form, tipo: v})}>
                            <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="Locação de Impressoras">Locação de Impressoras</SelectItem><SelectItem value="Assistência Técnica Mensal">Assistência Técnica Mensal</SelectItem><SelectItem value="Fornecimento Gráfico">Fornecimento Gráfico / Cota</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 md:col-span-1 flex gap-2">
                        <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Início Vigência *</label><Input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} className="bg-white" /></div>
                        <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Fim Vigência *</label><Input type="date" value={form.data_vencimento} onChange={e => setForm({...form, data_vencimento: e.target.value})} className="bg-white" /></div>
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-100">
                <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs flex items-center gap-2"><Calculator className="w-4 h-4 text-emerald-500"/> Regras de Faturamento e Bilhetagem</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-600 uppercase">Valor Mensal Fixo (R$) *</label><Input type="number" step="0.01" value={form.valor_mensal} onChange={e => setForm({...form, valor_mensal: e.target.value})} className="bg-white font-bold text-indigo-700" /></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-600 uppercase">Dia Base de Faturamento</label><Input type="number" min="1" max="31" value={form.dia_faturamento} onChange={e => setForm({...form, dia_faturamento: e.target.value})} className="bg-white text-center" /></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-600 uppercase">Contato/E-mail de Cobrança</label><Input value={form.contato_faturamento} onChange={e => setForm({...form, contato_faturamento: e.target.value})} className="bg-white" placeholder="Onde enviar a NF?" /></div>
                    
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-600 uppercase">Franquia (Págs/Mês Inclusas)</label><Input type="number" value={form.franquia_paginas} onChange={e => setForm({...form, franquia_paginas: e.target.value})} className="bg-white" /></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-600 uppercase">R$ por Página Excedente</label><Input type="number" step="0.0001" value={form.valor_pagina_excedente} onChange={e => setForm({...form, valor_pagina_excedente: e.target.value})} className="bg-white" /></div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase">Exige Demonstrativo (Leituras)?</label>
                        <Select value={form.exige_demonstrativo} onValueChange={v => setForm({...form, exige_demonstrativo: v})}>
                            <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="Sim">Sim (Mensal)</SelectItem><SelectItem value="Não">Não (Apenas na Preventiva)</SelectItem></SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <Button onClick={salvarContrato} disabled={salvando} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-md mt-6">
                Gerar Contrato
            </Button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: DOSSIÊ DO CONTRATO E MOTOR DE FATURAMENTO */}
        {/* ========================================================================= */}
        {abaAtiva === "dossie" && contratoSelecionado && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-200">
            
            <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-indigo-600">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Button variant="ghost" size="sm" onClick={() => setAbaAtiva("lista")} className="h-8 px-2 text-slate-400 hover:text-slate-700"><ArrowLeft className="w-4 h-4"/></Button>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{contratoSelecionado.titulo}</h2>
                        <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full shadow-sm border border-white ${contratoSelecionado.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{contratoSelecionado.status}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 ml-12">
                        <span className="flex items-center gap-1 font-bold text-slate-700"><Building2 className="w-4 h-4 text-slate-400"/> {contratoSelecionado.log_clientes?.nome_fantasia}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-slate-400"/> Fatura todo dia {contratoSelecionado.dia_faturamento}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* LADO ESQUERDO: INFOS E EQUIPAMENTOS */}
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Franquia Mensal Fixa</p><p className="text-xl font-black text-indigo-700">R$ {Number(contratoSelecionado.valor_mensal).toFixed(2).replace('.',',')}</p></div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Páginas Inclusas</p><p className="text-xl font-black text-slate-800">{contratoSelecionado.franquia_paginas} <span className="text-xs text-slate-500 font-medium">un.</span></p></div>
                    </div>

                    <div className="bg-white rounded-xl border shadow-sm p-5">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-3 mb-3"><Printer className="w-4 h-4 text-blue-500"/> Equipamentos no Contrato ({equipamentos.length})</h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {equipamentos.length === 0 ? <p className="text-sm text-slate-400 italic">Nenhum equipamento vinculado a este contrato (Vá no módulo Assistência para vincular).</p> : equipamentos.map(eq => (
                                <div key={eq.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-100">
                                    <div><p className="text-sm font-bold text-slate-700">{eq.log_produtos?.nome}</p><p className="text-[10px] font-mono text-slate-500">S/N: {eq.numero_serie}</p></div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border shadow-sm p-5">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-3 mb-3"><History className="w-4 h-4 text-amber-500"/> Histórico de Faturas Geradas</h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {historicoFaturas.length === 0 ? <p className="text-sm text-slate-400 italic">Nenhuma fatura gerada para este contrato ainda.</p> : historicoFaturas.map(fat => (
                                <div key={fat.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 uppercase">{fat.mes_referencia}</p>
                                        <p className="text-[10px] text-slate-500">{new Date(fat.data_faturamento).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-emerald-600">R$ {Number(fat.valor_total).toFixed(2).replace('.',',')}</p>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{fat.tipo_faturamento}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* LADO DIREITO: MOTOR DE FATURAMENTO DA COMPETÊNCIA */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border shadow-lg border-t-4 border-t-emerald-500 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider flex items-center gap-1"><Receipt className="w-3 h-3"/> Módulo Gerador</div>
                        
                        <h3 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2"><Calculator className="w-5 h-5 text-emerald-600"/> Processar Faturamento Mensal</h3>
                        <p className="text-xs text-slate-500 mb-6 pb-4 border-b border-slate-100">Calcule leituras ou fature apenas a franquia base e jogue para o Financeiro.</p>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Mês de Referência (Competência)</label>
                                <Input value={mesFat} onChange={e => { let val = e.target.value.replace(/\D/g, ''); if(val.length > 2) val = val.substring(0,2)+'/'+val.substring(2,6); setMesFat(val); }} placeholder="MM/AAAA" className="bg-slate-50 font-bold text-center" maxLength={7} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Método de Faturamento</label>
                                <Select value={tipoFaturamento} onValueChange={setTipoFaturamento}>
                                    <SelectTrigger className="bg-slate-50"><SelectValue/></SelectTrigger>
                                    <SelectContent><SelectItem value="Com Leitura/Excedente">Com Leitura (Excedente)</SelectItem><SelectItem value="Franquia Fixa">Apenas Franquia Fixa</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </div>

                        {tipoFaturamento === "Com Leitura/Excedente" && (
                            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2"><Settings className="w-3 h-3"/> Bilhetagem / Leituras do Mês</h4>
                                {equipamentos.length === 0 ? <p className="text-xs text-red-500 font-medium">Nenhuma máquina vinculada para leitura.</p> : (
                                    <div className="space-y-3">
                                        {equipamentos.map(eq => (
                                            <div key={eq.id} className="flex justify-between items-center gap-4">
                                                <p className="text-xs font-semibold text-slate-600 flex-1 truncate" title={`${eq.log_produtos?.nome} - ${eq.numero_serie}`}>{eq.numero_serie} <span className="font-normal opacity-70">({eq.log_produtos?.nome})</span></p>
                                                <Input type="number" min="0" value={leiturasAtuais[eq.id] || ''} onChange={e => setLeiturasAtuais({...leiturasAtuais, [eq.id]: parseFloat(e.target.value)||0})} className="w-32 h-8 text-right font-bold text-indigo-700 bg-white" placeholder="Leitura Final..." />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between text-xs">
                                    <span className="font-bold text-slate-500">Volume Total Lido:</span>
                                    <span className="font-black text-indigo-700 text-sm">{volumeTotalLido} págs</span>
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-800 p-5 rounded-xl text-white shadow-inner mb-6">
                            <div className="flex justify-between text-sm mb-2 text-slate-300"><span>Valor Franquia Fixa</span><span className="font-semibold text-white">R$ {Number(contratoSelecionado.valor_mensal).toFixed(2).replace('.',',')}</span></div>
                            {tipoFaturamento === "Com Leitura/Excedente" && (
                                <div className="flex justify-between text-sm mb-3 pb-3 border-b border-slate-600 text-amber-200">
                                    <span>Págs Excedentes ({excedente} x R$ {Number(contratoSelecionado.valor_pagina_excedente).toFixed(4).replace('.',',')})</span>
                                    <span className="font-semibold text-amber-400">+ R$ {valorExcedente.toFixed(2).replace('.',',')}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-end mt-2">
                                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Total a Faturar</span>
                                <span className="text-3xl font-black text-emerald-400">R$ {valorTotalFatura.toFixed(2).replace('.',',')}</span>
                            </div>
                        </div>

                        <Button onClick={processarFaturamento} disabled={faturando} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-md gap-2">
                            <Landmark className="w-5 h-5"/> {faturando ? "Gerando..." : "Gerar Fatura no Financeiro"}
                        </Button>
                        {!contratoSelecionado.exige_demonstrativo && tipoFaturamento === "Com Leitura/Excedente" && (
                            <p className="text-[10px] text-center text-amber-600 font-bold mt-3 flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3"/> Contrato prevê faturamento apenas na preventiva, mas leitura está habilitada.</p>
                        )}
                    </div>
                </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}