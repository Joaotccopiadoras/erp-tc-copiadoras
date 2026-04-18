import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, FileSpreadsheet, Plus, Search, UserPlus, CheckCircle2, Landmark, Wallet, Briefcase, CalendarDays, FileSignature, XCircle, FileWarning } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function DepartamentoPessoal() {
  const [abaAtiva, setAbaAtiva] = useState<"colaboradores" | "folha">("colaboradores");

  // ==========================================
  // ESTADOS: COLABORADORES
  // ==========================================
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [buscaColab, setBuscaColab] = useState("");
  const [mostrarFormColab, setMostrarFormColab] = useState(false);
  
  // Form Colaborador
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [cargo, setCargo] = useState("");
  const [setor, setSetor] = useState("");
  const [dataAdmissao, setDataAdmissao] = useState("");
  const [salarioBase, setSalarioBase] = useState("");
  const [statusColab, setStatusColab] = useState("Ativo");
  
  // Novos Campos
  const [tipoContrato, setTipoContrato] = useState("CLT");
  const [valorVT, setValorVT] = useState("");
  const [valorVA, setValorVA] = useState("");

  // ==========================================
  // ESTADOS: FOLHA DE PAGAMENTO
  // ==========================================
  const mesAtualStr = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  const [mesReferencia, setMesReferencia] = useState(mesAtualStr);
  const [folha, setFolha] = useState<any[]>([]);
  const [categoriaDpId, setCategoriaDpId] = useState("");
  const [carregandoFolha, setCarregandoFolha] = useState(false);

  useEffect(() => {
    fetchColaboradores();
    fetchCategoriaDP();
  }, []);

  useEffect(() => {
    if (abaAtiva === "folha") carregarFolhaDoMes();
  }, [abaAtiva, mesReferencia]);

  const fetchCategoriaDP = async () => {
    const { data } = await supabase.from('fin_categorias').select('id').ilike('nome', '%Pessoal%').limit(1).single();
    if (data) setCategoriaDpId(data.id);
  };

  const fetchColaboradores = async () => {
    const { data } = await supabase.from('rh_colaboradores').select('*').order('nome');
    if (data) setColaboradores(data);
  };

  // --- GESTÃO DE COLABORADORES ---
  const salvarColaborador = async () => {
    if (!nome || !cargo || !setor || !salarioBase || !dataAdmissao) return alert("Preencha todos os campos obrigatórios com asterisco (*).");
    
    const payload = {
      nome, cpf, cargo, setor, status: statusColab,
      data_admissao: dataAdmissao,
      salario_base: parseFloat(salarioBase),
      tipo_contrato: tipoContrato,
      valor_vt: parseFloat(valorVT) || 0,
      valor_va: parseFloat(valorVA) || 0
    };

    try {
      if (editandoId) {
        await supabase.from('rh_colaboradores').update(payload).eq('id', editandoId);
        alert("Ficha do colaborador atualizada!");
      } else {
        const { error } = await supabase.from('rh_colaboradores').insert([payload]);
        if (error) throw error;
        alert("Colaborador cadastrado com sucesso!");
      }
      
      limparFormColab();
      fetchColaboradores();
    } catch (e: any) {
      if (e.code === '23505') alert("Este CPF já está cadastrado.");
      else alert("Erro: " + e.message);
    }
  };

  const editarColaborador = (c: any) => {
    setEditandoId(c.id);
    setNome(c.nome); setCpf(c.cpf || ""); setCargo(c.cargo); setSetor(c.setor);
    setDataAdmissao(c.data_admissao); setSalarioBase(c.salario_base.toString()); setStatusColab(c.status);
    setTipoContrato(c.tipo_contrato || "CLT"); setValorVT(c.valor_vt?.toString() || ""); setValorVA(c.valor_va?.toString() || "");
    setMostrarFormColab(true);
  };

  const limparFormColab = () => {
    setEditandoId(null); setNome(""); setCpf(""); setCargo(""); setSetor("");
    setDataAdmissao(""); setSalarioBase(""); setStatusColab("Ativo");
    setTipoContrato("CLT"); setValorVT(""); setValorVA("");
    setMostrarFormColab(false);
  };

  // --- GESTÃO DE FOLHA DE PAGAMENTO ---
  const carregarFolhaDoMes = async () => {
    if (!mesReferencia || mesReferencia.length !== 7) return;
    setCarregandoFolha(true);
    
    try {
      const { data: folhaGravada } = await supabase
        .from('rh_folha_pagamento')
        .select('*, rh_colaboradores(nome, cargo, setor, status, tipo_contrato)')
        .eq('mes_referencia', mesReferencia);

      if (folhaGravada && folhaGravada.length > 0) {
        setFolha(folhaGravada);
      } else {
        // Prévia: Puxa ativos e já injeta o VT e VA padrão do cadastro
        const ativos = colaboradores.filter(c => c.status === 'Ativo' || c.status === 'Férias');
        const previa = ativos.map(c => {
          const liq = Number(c.salario_base) + Number(c.valor_vt || 0) + Number(c.valor_va || 0);
          return {
            colaborador_id: c.id,
            mes_referencia: mesReferencia,
            tipo_contrato: c.tipo_contrato,
            salario_base: c.salario_base,
            comissoes: 0,
            vale_transporte: c.valor_vt || 0,
            ticket_alimentacao: c.valor_va || 0,
            adicionais: 0,
            descontos: 0,
            salario_liquido: liq,
            recibo_assinado: false,
            status: 'Pendente',
            rh_colaboradores: { nome: c.nome, cargo: c.cargo, setor: c.setor, status: c.status, tipo_contrato: c.tipo_contrato }
          };
        });
        setFolha(previa);
      }
    } catch (e) { console.error(e); } finally { setCarregandoFolha(false); }
  };

  const atualizarValoresFolha = (colabId: string, campo: string, valor: number) => {
    setFolha(prev => prev.map(f => {
      if (f.colaborador_id === colabId) {
        const n = { ...f, [campo]: valor };
        // Nova fórmula: Base + Comissões + VT + VA + Adicionais - Descontos
        n.salario_liquido = Number(n.salario_base) + Number(n.comissoes) + Number(n.vale_transporte) + Number(n.ticket_alimentacao) + Number(n.adicionais) - Number(n.descontos);
        return n;
      }
      return f;
    }));
  };

  const alternarAssinaturaRecibo = async (colabId: string, assinadoAtual: boolean) => {
    const novoStatus = !assinadoAtual;
    
    // Atualiza a tela instantaneamente
    setFolha(prev => prev.map(f => f.colaborador_id === colabId ? { ...f, recibo_assinado: novoStatus } : f));

    // Salva no banco de dados, independentemente se a folha está fechada ou não
    try {
      const { data } = await supabase.from('rh_folha_pagamento').select('id').eq('colaborador_id', colabId).eq('mes_referencia', mesReferencia).single();
      if (data) {
          await supabase.from('rh_folha_pagamento').update({ recibo_assinado: novoStatus }).eq('id', data.id);
      } else {
          // Se não tem ID, é porque a folha nem foi salva como rascunho ainda. Vamos forçar o save do rascunho.
          await salvarRascunhoFolha();
          await supabase.from('rh_folha_pagamento').update({ recibo_assinado: novoStatus }).eq('colaborador_id', colabId).eq('mes_referencia', mesReferencia);
      }
    } catch (e) { console.error(e); }
  };

  const salvarRascunhoFolha = async () => {
    try {
      for (const item of folha) {
        const payload = {
          colaborador_id: item.colaborador_id, mes_referencia: item.mes_referencia, tipo_contrato: item.tipo_contrato,
          salario_base: item.salario_base, comissoes: item.comissoes, vale_transporte: item.vale_transporte,
          ticket_alimentacao: item.ticket_alimentacao, adicionais: item.adicionais, descontos: item.descontos,
          salario_liquido: item.salario_liquido, recibo_assinado: item.recibo_assinado, status: item.status
        };
        await supabase.from('rh_folha_pagamento').upsert(payload, { onConflict: 'colaborador_id, mes_referencia' });
      }
      alert("Rascunho da folha salvo com sucesso!");
      carregarFolhaDoMes();
    } catch (e: any) { alert("Erro ao salvar rascunho: " + e.message); }
  };

  const fecharFolhaEGerarFinanceiro = async () => {
    if (!confirm(`Deseja FECHAR a folha de ${mesReferencia}?\nSerão geradas Contas a Pagar individuais no Financeiro para cada colaborador e os valores serão travados.`)) return;

    try {
      await salvarRascunhoFolha();
      const vencimentoFolha = new Date();
      vencimentoFolha.setDate(5);
      if (vencimentoFolha < new Date()) vencimentoFolha.setMonth(vencimentoFolha.getMonth() + 1);

      const lancamentosFinanceiros = folha.map(f => ({
        tipo: 'Despesa',
        descricao: `Folha ${mesReferencia} - ${f.rh_colaboradores?.nome} (${f.tipo_contrato})`,
        valor: f.salario_liquido,
        data_vencimento: vencimentoFolha.toISOString().split('T')[0],
        status: 'Pendente',
        categoria_id: categoriaDpId || null,
        centro_custo: f.rh_colaboradores?.setor || 'Geral',
        forma_pagamento: 'Transferência',
        documento_origem: `FOLHA-${mesReferencia.replace('/','')}`,
        observacoes: `Base: R$ ${f.salario_base} | Comissões: R$ ${f.comissoes} | Benefícios: R$ ${Number(f.vale_transporte) + Number(f.ticket_alimentacao)} | Outros/Desc: R$ ${f.adicionais} / R$ ${f.descontos}`
      }));

      const { error: finErr } = await supabase.from('fin_lancamentos').insert(lancamentosFinanceiros);
      if (finErr) throw new Error("Falha ao integrar com o Financeiro: " + finErr.message);

      for (const item of folha) {
        await supabase.from('rh_folha_pagamento').update({ status: 'Fechada' }).eq('colaborador_id', item.colaborador_id).eq('mes_referencia', mesReferencia);
      }

      alert("Folha Fechada e Contas a Pagar geradas com sucesso no Módulo Financeiro!");
      carregarFolhaDoMes();
    } catch (e: any) { alert("Erro crítico: " + e.message); }
  };

  const colaboradoresFiltrados = colaboradores.filter(c => 
    c.nome.toLowerCase().includes(buscaColab.toLowerCase()) || 
    c.cargo.toLowerCase().includes(buscaColab.toLowerCase()) ||
    c.tipo_contrato?.toLowerCase().includes(buscaColab.toLowerCase())
  );

  const totalFolha = folha.reduce((acc, f) => acc + Number(f.salario_liquido), 0);
  const isFolhaFechada = folha.length > 0 && folha.every(f => f.status === 'Fechada');

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto mb-12">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Users className="w-6 h-6 text-sky-600" /> Departamento Pessoal (DP)</h1>
            <p className="text-slate-500">Gestão de colaboradores, vínculos, benefícios e fechamento de folha.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setAbaAtiva("colaboradores")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "colaboradores" ? "bg-white shadow-sm text-sky-700" : "text-slate-600"}`}><Briefcase className="w-4 h-4"/> Quadro de Pessoal</button>
            <button onClick={() => setAbaAtiva("folha")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "folha" ? "bg-white shadow-sm text-sky-700" : "text-slate-600"}`}><FileSpreadsheet className="w-4 h-4"/> Folha de Pagamento</button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA: QUADRO DE COLABORADORES */}
        {/* ========================================================================= */}
        {abaAtiva === "colaboradores" && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex flex-wrap items-center gap-4 bg-slate-50 justify-between">
              <div className="relative w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={buscaColab} onChange={e => setBuscaColab(e.target.value)} placeholder="Buscar nome, cargo ou vínculo..." className="pl-9 bg-white" /></div>
              <Button onClick={() => { limparFormColab(); setMostrarFormColab(true); }} className="bg-sky-600 hover:bg-sky-700 text-white gap-2"><UserPlus className="w-4 h-4"/> Novo Colaborador</Button>
            </div>

            {mostrarFormColab && (
              <div className="p-6 bg-sky-50/50 border-b border-sky-100 space-y-6">
                <h3 className="font-bold text-sky-800 flex items-center gap-2 border-b border-sky-100 pb-2"><UserPlus className="w-5 h-5"/> {editandoId ? 'Editar Ficha do Colaborador' : 'Nova Ficha de Admissão'}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Nome Completo <span className="text-red-500">*</span></label><Input value={nome} onChange={e => setNome(e.target.value)} className="bg-white" /></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">CPF</label><Input value={cpf} onChange={e => setCpf(e.target.value)} className="bg-white" /></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Data de Início <span className="text-red-500">*</span></label><Input type="date" value={dataAdmissao} onChange={e => setDataAdmissao(e.target.value)} className="bg-white" /></div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Vínculo / Tipo de Contrato <span className="text-red-500">*</span></label>
                    <Select value={tipoContrato} onValueChange={setTipoContrato}>
                        <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="CLT">CLT (Por Dentro)</SelectItem><SelectItem value="PJ">Contrato PJ (Por Fora)</SelectItem><SelectItem value="Experiência">Período de Experiência</SelectItem><SelectItem value="Estágio">Estágio</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Cargo / Função <span className="text-red-500">*</span></label><Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Técnico N1" className="bg-white" /></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Setor <span className="text-red-500">*</span></label>
                    <Select value={setor} onValueChange={setSetor}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                        <SelectContent><SelectItem value="Administrativo / Frota">Administrativo</SelectItem><SelectItem value="Técnico / Assistência">Técnico</SelectItem><SelectItem value="Comercial / Vendas">Comercial</SelectItem><SelectItem value="Gráfica / Produção">Gráfica</SelectItem><SelectItem value="Almoxarifado">Almoxarifado</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Remuneração e Benefícios Padrão</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Salário Base (R$) <span className="text-red-500">*</span></label><Input type="number" step="0.01" value={salarioBase} onChange={e => setSalarioBase(e.target.value)} placeholder="0,00" className="bg-slate-50" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Vale Transporte (R$)</label><Input type="number" step="0.01" value={valorVT} onChange={e => setValorVT(e.target.value)} placeholder="0,00" className="bg-slate-50" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Vale Alimentação (R$)</label><Input type="number" step="0.01" value={valorVA} onChange={e => setValorVA(e.target.value)} placeholder="0,00" className="bg-slate-50" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Status no Sistema</label>
                          <Select value={statusColab} onValueChange={setStatusColab}>
                              <SelectTrigger className="bg-slate-50"><SelectValue/></SelectTrigger>
                              <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Férias">Férias</SelectItem><SelectItem value="Afastado">Afastado</SelectItem><SelectItem value="Desligado">Desligado</SelectItem></SelectContent>
                          </Select>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-sky-100">
                  <Button variant="outline" onClick={limparFormColab}>Cancelar</Button>
                  <Button onClick={salvarColaborador} className="bg-sky-600 hover:bg-sky-700 text-white">Salvar Ficha</Button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b">Colaborador</th>
                    <th className="p-4 font-semibold border-b">Vínculo</th>
                    <th className="p-4 font-semibold border-b">Função / Setor</th>
                    <th className="p-4 font-semibold border-b text-center">Admissão</th>
                    <th className="p-4 font-semibold border-b text-center">Status</th>
                    <th className="p-4 font-semibold border-b text-right">Salário Base</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {colaboradoresFiltrados.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhum colaborador encontrado.</td></tr>
                  ) : (
                    colaboradoresFiltrados.map(c => {
                        const corStatus = c.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : c.status === 'Férias' ? 'bg-amber-100 text-amber-700' : c.status === 'Desligado' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700';
                        const corVinculo = c.tipo_contrato === 'CLT' ? 'border-sky-200 text-sky-700 bg-sky-50' : c.tipo_contrato === 'PJ' ? 'border-purple-200 text-purple-700 bg-purple-50' : 'border-amber-200 text-amber-700 bg-amber-50';

                        return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => editarColaborador(c)}>
                          <td className="p-4">
                              <p className="font-bold text-slate-800">{c.nome}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Matrícula: {String(c.matricula).padStart(4,'0')}</p>
                          </td>
                          <td className="p-4">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded border ${corVinculo}`}>{c.tipo_contrato || 'CLT'}</span>
                          </td>
                          <td className="p-4">
                              <p className="text-sm font-semibold text-slate-700">{c.cargo}</p>
                              <p className="text-[10px] uppercase text-slate-500 bg-slate-100 border px-1.5 py-0.5 rounded inline-block mt-1">{c.setor}</p>
                          </td>
                          <td className="p-4 text-center text-xs text-slate-600 font-medium">{new Date(c.data_admissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                          <td className="p-4 text-center">
                              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${corStatus}`}>{c.status}</span>
                          </td>
                          <td className="p-4 text-right font-bold text-sky-700">R$ {Number(c.salario_base).toFixed(2).replace('.', ',')}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: FOLHA DE PAGAMENTO */}
        {/* ========================================================================= */}
        {abaAtiva === "folha" && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-200">
            
            <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-sky-600"/> Apuração Mensal</h2>
                    <p className="text-sm text-slate-500">Lançamento de comissões, benefícios (VT/VA), horas extras e assinaturas.</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="text-sm font-bold text-slate-700">Mês/Ano de Referência:</label>
                    <Input value={mesReferencia} onChange={e => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 6);
                        setMesReferencia(val);
                    }} placeholder="MM/AAAA" className="w-32 text-center font-bold bg-slate-50" maxLength={7} />
                </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto pb-4">
                    <table className="w-full text-left border-collapse text-sm min-w-[1200px]">
                        <thead>
                            <tr className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
                                <th className="p-3 font-semibold rounded-tl-lg min-w-[200px]">Colaborador / Vínculo</th>
                                <th className="p-3 font-semibold text-right border-l border-slate-700">Salário Base</th>
                                <th className="p-3 font-semibold text-center border-l border-slate-700 w-28">Comissões (+)</th>
                                <th className="p-3 font-semibold text-center w-24">VT (+)</th>
                                <th className="p-3 font-semibold text-center w-24">VA / VR (+)</th>
                                <th className="p-3 font-semibold text-center border-l border-slate-700 w-28" title="Horas Extras, Bônus">Outros (+)</th>
                                <th className="p-3 font-semibold text-center w-28" title="Faltas, Adiantamentos, INSS">Descontos (-)</th>
                                <th className="p-3 font-semibold text-right border-l border-slate-700">Líquido a Pagar</th>
                                <th className="p-3 font-semibold text-center rounded-tr-lg border-l border-slate-700 w-32">Recibo Assinado?</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {carregandoFolha ? (
                                <tr><td colSpan={9} className="p-8 text-center text-slate-400">Carregando dados da folha...</td></tr>
                            ) : folha.length === 0 ? (
                                <tr><td colSpan={9} className="p-8 text-center text-slate-400">Nenhum colaborador elegível para este mês.</td></tr>
                            ) : (
                                folha.map((item) => (
                                    <tr key={item.colaborador_id} className={`hover:bg-slate-50 ${item.status === 'Fechada' ? 'bg-slate-50' : ''}`}>
                                        <td className="p-3">
                                            <p className="font-bold text-slate-800 truncate" title={item.rh_colaboradores?.nome}>{item.rh_colaboradores?.nome}</p>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-300 text-slate-500 uppercase">{item.tipo_contrato || 'CLT'}</span>
                                                {item.rh_colaboradores?.status === 'Férias' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">FÉRIAS</span>}
                                            </div>
                                        </td>
                                        <td className="p-3 text-right font-medium text-slate-500 border-l border-slate-100">
                                            {Number(item.salario_base).toFixed(2).replace('.',',')}
                                        </td>
                                        
                                        {/* CÉLULAS DE INPUT */}
                                        <td className="p-2 border-l border-slate-100">
                                            <Input type="number" step="0.01" min="0" disabled={isFolhaFechada} value={item.comissoes || ''} onChange={e => atualizarValoresFolha(item.colaborador_id, 'comissoes', parseFloat(e.target.value)||0)} className="h-8 text-center text-emerald-600 font-semibold bg-white border-slate-200" placeholder="0,00" />
                                        </td>
                                        <td className="p-2">
                                            <Input type="number" step="0.01" min="0" disabled={isFolhaFechada} value={item.vale_transporte || ''} onChange={e => atualizarValoresFolha(item.colaborador_id, 'vale_transporte', parseFloat(e.target.value)||0)} className="h-8 text-center text-sky-600 font-semibold bg-white border-slate-200" placeholder="0,00" />
                                        </td>
                                        <td className="p-2">
                                            <Input type="number" step="0.01" min="0" disabled={isFolhaFechada} value={item.ticket_alimentacao || ''} onChange={e => atualizarValoresFolha(item.colaborador_id, 'ticket_alimentacao', parseFloat(e.target.value)||0)} className="h-8 text-center text-sky-600 font-semibold bg-white border-slate-200" placeholder="0,00" />
                                        </td>
                                        <td className="p-2 border-l border-slate-100">
                                            <Input type="number" step="0.01" min="0" disabled={isFolhaFechada} value={item.adicionais || ''} onChange={e => atualizarValoresFolha(item.colaborador_id, 'adicionais', parseFloat(e.target.value)||0)} className="h-8 text-center text-emerald-600 font-semibold bg-white border-slate-200" placeholder="0,00" />
                                        </td>
                                        <td className="p-2">
                                            <Input type="number" step="0.01" min="0" disabled={isFolhaFechada} value={item.descontos || ''} onChange={e => atualizarValoresFolha(item.colaborador_id, 'descontos', parseFloat(e.target.value)||0)} className="h-8 text-center text-rose-600 font-semibold bg-white border-slate-200" placeholder="0,00" />
                                        </td>
                                        
                                        <td className="p-3 text-right font-black text-sky-800 text-base border-l border-slate-100">
                                            {Number(item.salario_liquido).toFixed(2).replace('.',',')}
                                        </td>

                                        {/* CONTROLE DE ASSINATURA (Sempre ativo, mesmo se folha fechada) */}
                                        <td className="p-2 text-center border-l border-slate-100">
                                            <button 
                                                onClick={() => alternarAssinaturaRecibo(item.colaborador_id, item.recibo_assinado)}
                                                className={`w-full flex items-center justify-center gap-1 h-8 rounded text-[10px] font-bold uppercase transition-colors border ${item.recibo_assinado ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'}`}
                                            >
                                                {item.recibo_assinado ? <><CheckCircle2 className="w-3 h-3"/> Assinado</> : <><FileSignature className="w-3 h-3"/> Pendente</>}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* RODAPÉ DO FECHAMENTO */}
                {folha.length > 0 && (
                    <div className="bg-slate-50 p-5 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Líquido a Pagar ({mesReferencia})</p>
                            <p className="text-3xl font-black text-sky-800">R$ {totalFolha.toFixed(2).replace('.',',')}</p>
                        </div>
                        {isFolhaFechada ? (
                            <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-sm"><CheckCircle2 className="w-5 h-5"/> Folha Fechada e Lançada no Financeiro</div>
                        ) : (
                            <div className="flex gap-2 w-full md:w-auto">
                                <Button variant="outline" onClick={salvarRascunhoFolha} className="bg-white hover:bg-slate-100 text-slate-700 border-slate-300 font-semibold shadow-sm">Salvar Rascunho</Button>
                                <Button onClick={fecharFolhaEGerarFinanceiro} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-md"><Landmark className="w-4 h-4"/> Fechar Folha e Gerar Contas a Pagar</Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* ALERTAS INFORMATIVOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isFolhaFechada && (
                    <div className="flex items-start gap-3 p-4 bg-sky-50 border border-sky-200 rounded-lg text-sky-800 text-sm shadow-sm">
                        <Wallet className="w-5 h-5 shrink-0 mt-0.5"/>
                        <p>As obrigações referentes a esta folha já constam no <strong>Módulo Financeiro (Contas a Pagar)</strong>. Você ainda pode marcar as assinaturas de recibo acima conforme os funcionários forem assinando.</p>
                    </div>
                )}
                
                {folha.some(f => !f.recibo_assinado) && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm shadow-sm">
                        <FileWarning className="w-5 h-5 shrink-0 mt-0.5"/>
                        <p><strong>Atenção:</strong> Existem recibos marcados como "Pendente". Lembre-se de recolher as assinaturas para proteção jurídica da empresa (especialmente para contratos CLT e Experiência).</p>
                    </div>
                )}
            </div>

          </div>
        )}

      </div>
    </AppLayout>
  );
}