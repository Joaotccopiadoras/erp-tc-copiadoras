import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, FileSpreadsheet, Plus, Search, UserPlus, CheckCircle2, Landmark, Wallet, Briefcase, CalendarDays, FileSignature, FileWarning, Bus, Utensils, Printer, UploadCloud, Link as LinkIcon, Save, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function DepartamentoPessoal() {
  const [abaAtiva, setAbaAtiva] = useState<"colaboradores" | "folha" | "beneficios">("colaboradores");

  // ==========================================
  // ESTADOS: COLABORADORES
  // ==========================================
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [buscaColab, setBuscaColab] = useState("");
  const [mostrarFormColab, setMostrarFormColab] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [cargo, setCargo] = useState("");
  const [setor, setSetor] = useState("");
  const [dataAdmissao, setDataAdmissao] = useState("");
  const [salarioBase, setSalarioBase] = useState("");
  const [statusColab, setStatusColab] = useState("Ativo");
  const [tipoContrato, setTipoContrato] = useState("CLT");
  const [recebeVT, setRecebeVT] = useState("Não");
  const [recebeVA, setRecebeVA] = useState("Não");

  // ==========================================
  // ESTADOS: FOLHA & BENEFÍCIOS
  // ==========================================
  const mesAtualStr = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  const [mesReferencia, setMesReferencia] = useState(mesAtualStr);
  const [folha, setFolha] = useState<any[]>([]);
  const [beneficios, setBeneficios] = useState<any[]>([]);
  const [categoriaDpId, setCategoriaDpId] = useState("");
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [filtroVinculoBen, setFiltroVinculoBen] = useState<"todos" | "clt" | "pj">("todos");

  // Controles Globais de Benefício (Para aplicar a todos)
  const [globalDiasVT, setGlobalDiasVT] = useState("");
  const [globalValorDiarioVT, setGlobalValorDiarioVT] = useState("");
  const [globalDiasVA, setGlobalDiasVA] = useState("");
  const [globalValorDiarioVA, setGlobalValorDiarioVA] = useState("");

  // Estado para impressão e uploads
  const [reciboParaImprimir, setReciboParaImprimir] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchColaboradores();
    fetchCategoriaDP();
  }, []);

  useEffect(() => {
    if (abaAtiva === "folha") carregarFolhaDoMes();
    if (abaAtiva === "beneficios") carregarBeneficiosDoPeriodo();
  }, [abaAtiva, mesReferencia]);

  // Se houver recibos na fila de impressão, aciona o print automaticamente
  useEffect(() => {
    if (reciboParaImprimir && reciboParaImprimir.length > 0) {
      setTimeout(() => window.print(), 500);
    }
  }, [reciboParaImprimir]);

  const fetchCategoriaDP = async () => {
    const { data } = await supabase.from('fin_categorias').select('id').ilike('nome', '%Pessoal%').limit(1).single();
    if (data) setCategoriaDpId(data.id);
  };

  const fetchColaboradores = async () => {
    const { data } = await supabase.from('rh_colaboradores').select('*').order('nome');
    if (data) setColaboradores(data);
  };

  // --- CRUD COLABORADORES ---
  const salvarColaborador = async () => {
    if (!nome || !cargo || !setor || !salarioBase || !dataAdmissao) return alert("Preencha todos os campos obrigatórios (*).");
    
    const payload = {
      nome, cpf, cargo, setor, status: statusColab, data_admissao: dataAdmissao,
      salario_base: parseFloat(salarioBase), tipo_contrato: tipoContrato,
      recebe_vt: recebeVT === "Sim", recebe_va: recebeVA === "Sim"
    };

    try {
      if (editandoId) {
        await supabase.from('rh_colaboradores').update(payload).eq('id', editandoId);
        alert("Ficha do colaborador atualizada!");
      } else {
        await supabase.from('rh_colaboradores').insert([payload]);
        alert("Colaborador cadastrado com sucesso!");
      }
      limparFormColab(); fetchColaboradores();
    } catch (e: any) { alert("Erro: " + e.message); }
  };

  const editarColaborador = (c: any) => {
    setEditandoId(c.id); setNome(c.nome); setCpf(c.cpf || ""); setCargo(c.cargo); setSetor(c.setor);
    setDataAdmissao(c.data_admissao); setSalarioBase(c.salario_base.toString()); setStatusColab(c.status);
    setTipoContrato(c.tipo_contrato || "CLT"); 
    setRecebeVT(c.recebe_vt ? "Sim" : "Não"); setRecebeVA(c.recebe_va ? "Sim" : "Não");
    setMostrarFormColab(true);
  };

  const limparFormColab = () => {
    setEditandoId(null); setNome(""); setCpf(""); setCargo(""); setSetor(""); setDataAdmissao(""); 
    setSalarioBase(""); setStatusColab("Ativo"); setTipoContrato("CLT"); setRecebeVT("Não"); setRecebeVA("Não");
    setMostrarFormColab(false);
  };

  // --- LÓGICA DA FOLHA DE PAGAMENTO ---
  const carregarFolhaDoMes = async () => {
    if (!mesReferencia || mesReferencia.length !== 7) return;
    setCarregandoDados(true);
    try {
      const { data: folhaGravada } = await supabase.from('rh_folha_pagamento' as any).select('*, rh_colaboradores(nome, cargo, setor, status, tipo_contrato)').eq('mes_referencia', mesReferencia);
      
      // Puxa os benefícios do mesmo período para injetar os valores na folha automaticamente
      const { data: benGravados } = await supabase.from('rh_beneficios' as any).select('colaborador_id, total_vt, total_va').eq('periodo', mesReferencia);
      const mapaBeneficios = new Map(benGravados?.map((b: any) => [b.colaborador_id, b]));

      if (folhaGravada && folhaGravada.length > 0) {
        setFolha(folhaGravada);
      } else {
        const ativos = colaboradores.filter(c => c.status === 'Ativo' || c.status === 'Férias');
        const previa = ativos.map(c => {
          const ben = mapaBeneficios.get(c.id) as any;
          const vt = ben ? Number(ben.total_vt) : 0;
          const va = ben ? Number(ben.total_va) : 0;
          const liq = Number(c.salario_base) + vt + va;
          return {
            colaborador_id: c.id, mes_referencia: mesReferencia, tipo_contrato: c.tipo_contrato,
            salario_base: c.salario_base, comissoes: 0, vale_transporte: vt, ticket_alimentacao: va,
            adicionais: 0, descontos: 0, salario_liquido: liq, recibo_assinado: false, status: 'Pendente',
            rh_colaboradores: { nome: c.nome, cargo: c.cargo, setor: c.setor, status: c.status, tipo_contrato: c.tipo_contrato }
          };
        });
        setFolha(previa);
      }
    } catch (e) { console.error(e); } finally { setCarregandoDados(false); }
  };

  const atualizarValoresFolha = (colabId: string, campo: string, valor: number) => {
    setFolha(prev => prev.map(f => {
      if (f.colaborador_id === colabId) {
        const n = { ...f, [campo]: valor };
        n.salario_liquido = Number(n.salario_base) + Number(n.comissoes) + Number(n.vale_transporte) + Number(n.ticket_alimentacao) + Number(n.adicionais) - Number(n.descontos);
        return n;
      }
      return f;
    }));
  };

  const alternarAssinaturaRecibo = async (colabId: string, assinadoAtual: boolean) => {
    const novoStatus = !assinadoAtual;
    setFolha(prev => prev.map(f => f.colaborador_id === colabId ? { ...f, recibo_assinado: novoStatus } : f));
    try {
      const { data } = await supabase.from('rh_folha_pagamento' as any).select('id').eq('colaborador_id', colabId).eq('mes_referencia', mesReferencia).single();
      if (data) {
          await supabase.from('rh_folha_pagamento' as any).update({ recibo_assinado: novoStatus }).eq('id', data.id);
      } else {
          await salvarRascunhoFolha();
          await supabase.from('rh_folha_pagamento' as any).update({ recibo_assinado: novoStatus }).eq('colaborador_id', colabId).eq('mes_referencia', mesReferencia);
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
        await supabase.from('rh_folha_pagamento' as any).upsert(payload, { onConflict: 'colaborador_id, mes_referencia' });
      }
      alert("Rascunho da folha salvo com sucesso!");
      carregarFolhaDoMes();
    } catch (e: any) { alert("Erro ao salvar: " + e.message); }
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
        await supabase.from('rh_folha_pagamento' as any).update({ status: 'Fechada' }).eq('colaborador_id', item.colaborador_id).eq('mes_referencia', mesReferencia);
      }

      alert("Folha Fechada e Contas a Pagar geradas com sucesso no Módulo Financeiro!");
      carregarFolhaDoMes();
    } catch (e: any) { alert("Erro crítico: " + e.message); }
  };

  // --- LÓGICA DE BENEFÍCIOS (VT / VA) ---
  const carregarBeneficiosDoPeriodo = async () => {
    if (!mesReferencia || mesReferencia.length !== 7) return;
    setCarregandoDados(true);
    try {
      const { data: benGravados } = await supabase.from('rh_beneficios' as any).select('*, rh_colaboradores(nome, cargo, tipo_contrato)').eq('periodo', mesReferencia);
      
      if (benGravados && benGravados.length > 0) {
        setBeneficios(benGravados);
      } else {
        // Gera a prévia para quem tem a flag de VT ou VA ativada no cadastro
        const elegiveis = colaboradores.filter(c => (c.status === 'Ativo' || c.status === 'Férias') && (c.recebe_vt || c.recebe_va));
        const previa = elegiveis.map(c => ({
          colaborador_id: c.id, periodo: mesReferencia, tipo_contrato: c.tipo_contrato,
          dias_vt: 0, valor_diario_vt: 0, total_vt: 0,
          dias_va: 0, valor_diario_va: 0, total_va: 0,
          recibo_assinado: false, recibo_url: null,
          recebe_vt: c.recebe_vt, recebe_va: c.recebe_va,
          rh_colaboradores: { nome: c.nome, cargo: c.cargo, tipo_contrato: c.tipo_contrato }
        }));
        setBeneficios(previa);
      }
    } catch(e) { console.error(e); } finally { setCarregandoDados(false); }
  };

  const aplicarRegraGlobalBeneficios = () => {
    const dVt = parseFloat(globalDiasVT) || 0;
    const vVt = parseFloat(globalValorDiarioVT) || 0;
    const dVa = parseFloat(globalDiasVA) || 0;
    const vVa = parseFloat(globalValorDiarioVA) || 0;

    setBeneficios(prev => prev.map(b => {
      const novoVtDias = b.recebe_vt ? dVt : 0;
      const novoVtValor = b.recebe_vt ? vVt : 0;
      const novoVaDias = b.recebe_va ? dVa : 0;
      const novoVaValor = b.recebe_va ? vVa : 0;
      return {
        ...b,
        dias_vt: novoVtDias, valor_diario_vt: novoVtValor, total_vt: novoVtDias * novoVtValor,
        dias_va: novoVaDias, valor_diario_va: novoVaValor, total_va: novoVaDias * novoVaValor
      };
    }));
  };

  const atualizarBeneficioIndividual = (idColab: string, campo: string, valor: number) => {
    setBeneficios(prev => prev.map(b => {
      if (b.colaborador_id === idColab) {
        const n = { ...b, [campo]: valor };
        n.total_vt = n.dias_vt * n.valor_diario_vt;
        n.total_va = n.dias_va * n.valor_diario_va;
        return n;
      }
      return b;
    }));
  };

  const salvarRascunhoBeneficios = async () => {
    setCarregandoDados(true);
    try {
      for (const b of beneficios) {
        const payload = {
          colaborador_id: b.colaborador_id, periodo: b.periodo, tipo_contrato: b.tipo_contrato,
          dias_vt: b.dias_vt, valor_diario_vt: b.valor_diario_vt, total_vt: b.total_vt,
          dias_va: b.dias_va, valor_diario_va: b.valor_diario_va, total_va: b.total_va,
          recibo_assinado: b.recibo_assinado, recibo_url: b.recibo_url
        };
        await supabase.from('rh_beneficios' as any).upsert(payload, { onConflict: 'colaborador_id, periodo' });
      }
      alert("Cálculo de benefícios salvo com sucesso!");
      carregarBeneficiosDoPeriodo();
    } catch(e:any) { alert("Erro ao salvar: "+e.message); } finally { setCarregandoDados(false); }
  };

  const acionarImpressaoRecibos = (apenasEste?: any) => {
    if (apenasEste) setReciboParaImprimir([apenasEste]);
    else setReciboParaImprimir(beneficiosFiltrados);
  };

  const fecharImpressao = () => {
    setReciboParaImprimir(null);
  };

  // Upload de Recibo Assinado
  const uploadReciboAssinado = async (event: React.ChangeEvent<HTMLInputElement>, colabId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingId(colabId);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `recibo_${colabId}_${mesReferencia.replace('/','-')}.${ext}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage.from('comprovantes_dp').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('comprovantes_dp').getPublicUrl(fileName);

      await supabase.from('rh_beneficios' as any).update({ recibo_assinado: true, recibo_url: publicUrl }).eq('colaborador_id', colabId).eq('periodo', mesReferencia);
      
      alert("Recibo anexado e marcado como assinado com sucesso!");
      carregarBeneficiosDoPeriodo();
    } catch (e:any) {
      alert("Erro ao anexar recibo (Verifique se o Bucket 'comprovantes_dp' existe no Supabase): " + e.message);
    } finally {
      setUploadingId(null);
    }
  };

  // --- FILTROS E VARIÁVEIS DERIVADAS ---
  const colaboradoresFiltrados = colaboradores.filter(c => c.nome.toLowerCase().includes(buscaColab.toLowerCase()) || c.cargo.toLowerCase().includes(buscaColab.toLowerCase()));
  
  const beneficiosFiltrados = beneficios.filter(b => {
    if (filtroVinculoBen === "clt" && b.tipo_contrato !== "CLT") return false;
    if (filtroVinculoBen === "pj" && b.tipo_contrato === "CLT") return false;
    return true;
  });

  const totalFolha = folha.reduce((acc, f) => acc + Number(f.salario_liquido), 0);
  const isFolhaFechada = folha.length > 0 && folha.every(f => f.status === 'Fechada');

  // ==========================================
  // VIEW DE IMPRESSÃO (Fica oculta até clicar em Imprimir)
  // ==========================================
  if (reciboParaImprimir) {
    return (
      <div className="bg-white min-h-screen text-black">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { margin: 15mm; size: A4 portrait; }
            .print-break { page-break-after: always; }
            .no-print { display: none !important; }
            body { background: white; }
          }
        `}} />
        <div className="p-4 bg-slate-800 text-white flex justify-between items-center no-print">
          <p>Preparando {reciboParaImprimir.length} recibo(s) para impressão. O diálogo de impressão abrirá automaticamente.</p>
          <Button variant="outline" onClick={fecharImpressao} className="text-black">Voltar ao Sistema</Button>
        </div>
        
        {reciboParaImprimir.map((recibo, index) => (
          <div key={recibo.colaborador_id} className={`p-8 max-w-3xl mx-auto ${index < reciboParaImprimir.length - 1 ? 'print-break' : ''}`}>
            <div className="text-center border-b-2 border-slate-800 pb-4 mb-8">
              <h1 className="text-2xl font-black uppercase tracking-wider">Recibo de Benefícios</h1>
              <p className="text-lg font-bold mt-1">Período de Referência: {recibo.periodo}</p>
              <p className="text-sm text-slate-600 mt-2">TC Copiadoras • Departamento Pessoal</p>
            </div>

            <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="mb-2"><strong>Colaborador:</strong> {recibo.rh_colaboradores?.nome}</p>
              <p className="mb-2"><strong>Função / Cargo:</strong> {recibo.rh_colaboradores?.cargo}</p>
              <p><strong>Vínculo:</strong> {recibo.tipo_contrato}</p>
            </div>

            <table className="w-full text-left border-collapse mb-12">
              <thead>
                <tr className="bg-slate-200 border border-slate-300">
                  <th className="p-3 border border-slate-300">Benefício</th>
                  <th className="p-3 border border-slate-300 text-center">Dias Considerados</th>
                  <th className="p-3 border border-slate-300 text-right">Valor Diário</th>
                  <th className="p-3 border border-slate-300 text-right">Total a Pagar</th>
                </tr>
              </thead>
              <tbody>
                {recibo.recebe_vt && (
                  <tr>
                    <td className="p-3 border border-slate-300">Vale Transporte</td>
                    <td className="p-3 border border-slate-300 text-center">{recibo.dias_vt}</td>
                    <td className="p-3 border border-slate-300 text-right">R$ {Number(recibo.valor_diario_vt).toFixed(2).replace('.',',')}</td>
                    <td className="p-3 border border-slate-300 text-right font-bold">R$ {Number(recibo.total_vt).toFixed(2).replace('.',',')}</td>
                  </tr>
                )}
                {recibo.recebe_va && (
                  <tr>
                    <td className="p-3 border border-slate-300">Vale Alimentação / Refeição</td>
                    <td className="p-3 border border-slate-300 text-center">{recibo.dias_va}</td>
                    <td className="p-3 border border-slate-300 text-right">R$ {Number(recibo.valor_diario_va).toFixed(2).replace('.',',')}</td>
                    <td className="p-3 border border-slate-300 text-right font-bold">R$ {Number(recibo.total_va).toFixed(2).replace('.',',')}</td>
                  </tr>
                )}
                <tr className="bg-slate-100">
                  <td colSpan={3} className="p-3 border border-slate-300 text-right font-bold uppercase tracking-wider">Total Depositado:</td>
                  <td className="p-3 border border-slate-300 text-right font-black text-lg">R$ {(Number(recibo.total_vt) + Number(recibo.total_va)).toFixed(2).replace('.',',')}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-24 pt-8 text-center w-2/3 mx-auto">
              <div className="border-t border-black mb-2"></div>
              <p className="font-bold">{recibo.rh_colaboradores?.nome}</p>
              <p className="text-sm text-slate-500">Declaro ter recebido os valores descritos acima referentes aos benefícios do período.</p>
              <p className="text-sm text-slate-500 mt-4">Data: ____/____/________</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto mb-12">
        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={(e) => { if(uploadingId) uploadReciboAssinado(e, uploadingId) }} />

        {/* CABEÇALHO PRINCIPAL */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Users className="w-6 h-6 text-sky-600" /> Departamento Pessoal (DP)</h1>
            <p className="text-slate-500">Gestão de colaboradores, vínculos, benefícios e fechamento de folha.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
            <button onClick={() => setAbaAtiva("colaboradores")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 whitespace-nowrap ${abaAtiva === "colaboradores" ? "bg-white shadow-sm text-sky-700" : "text-slate-600"}`}><Briefcase className="w-4 h-4"/> Quadro de Pessoal</button>
            <button onClick={() => setAbaAtiva("beneficios")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 whitespace-nowrap ${abaAtiva === "beneficios" ? "bg-white shadow-sm text-sky-700" : "text-slate-600"}`}><Bus className="w-4 h-4"/> VT e VA</button>
            <button onClick={() => setAbaAtiva("folha")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 whitespace-nowrap ${abaAtiva === "folha" ? "bg-white shadow-sm text-sky-700" : "text-slate-600"}`}><FileSpreadsheet className="w-4 h-4"/> Folha de Pagamento</button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA: COLABORADORES */}
        {/* ========================================================================= */}
        {abaAtiva === "colaboradores" && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b flex flex-wrap items-center gap-4 bg-slate-50 justify-between">
              <div className="relative w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={buscaColab} onChange={e => setBuscaColab(e.target.value)} placeholder="Buscar nome, cargo ou vínculo..." className="pl-9 bg-white" /></div>
              <Button onClick={() => { limparFormColab(); setMostrarFormColab(true); }} className="bg-sky-600 hover:bg-sky-700 text-white gap-2"><UserPlus className="w-4 h-4"/> Novo Colaborador</Button>
            </div>

            {mostrarFormColab && (
              <div className="p-6 bg-sky-50/50 border-b border-sky-100 space-y-6">
                <h3 className="font-bold text-sky-800 flex items-center gap-2 border-b border-sky-100 pb-2"><UserPlus className="w-5 h-5"/> {editandoId ? 'Editar Ficha do Colaborador' : 'Nova Ficha de Admissão'}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Nome Completo *</label><Input value={nome} onChange={e => setNome(e.target.value)} className="bg-white" /></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">CPF</label><Input value={cpf} onChange={e => setCpf(e.target.value)} className="bg-white" /></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Data de Início *</label><Input type="date" value={dataAdmissao} onChange={e => setDataAdmissao(e.target.value)} className="bg-white" /></div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Vínculo / Tipo de Contrato *</label>
                    <Select value={tipoContrato} onValueChange={setTipoContrato}>
                        <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="CLT">CLT (Por Dentro)</SelectItem><SelectItem value="PJ">Contrato PJ (Por Fora)</SelectItem><SelectItem value="Experiência">Período de Experiência</SelectItem><SelectItem value="Estágio">Estágio</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Cargo / Função *</label><Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Técnico N1" className="bg-white" /></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Setor *</label>
                    <Select value={setor} onValueChange={setSetor}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                        <SelectContent><SelectItem value="Administrativo">Administrativo</SelectItem><SelectItem value="Técnico / Assistência">Técnico</SelectItem><SelectItem value="Comercial / Vendas">Comercial</SelectItem><SelectItem value="Gráfica / Produção">Gráfica</SelectItem><SelectItem value="Compras/Estoque">Compras</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Remuneração e Configuração de Benefícios</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Salário Base (R$) *</label><Input type="number" step="0.01" value={salarioBase} onChange={e => setSalarioBase(e.target.value)} placeholder="0,00" className="bg-slate-50" /></div>
                        
                        <div className="space-y-2 border-l border-slate-100 pl-4"><label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Bus className="w-3 h-3 text-sky-500"/> Recebe VT?</label>
                          <Select value={recebeVT} onValueChange={setRecebeVT}><SelectTrigger className="bg-slate-50"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>
                        </div>
                        
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Utensils className="w-3 h-3 text-amber-500"/> Recebe VA / VR?</label>
                          <Select value={recebeVA} onValueChange={setRecebeVA}><SelectTrigger className="bg-slate-50"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>
                        </div>
                        
                        <div className="space-y-2 border-l border-slate-100 pl-4"><label className="text-xs font-bold text-slate-500 uppercase">Status</label>
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
                    <th className="p-4 font-semibold border-b text-center">Benefícios</th>
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
                              <p className="text-[10px] uppercase text-slate-500 mt-0.5">{c.cargo} • {c.setor}</p>
                          </td>
                          <td className="p-4"><span className={`text-[10px] font-bold px-2 py-1 rounded border ${corVinculo}`}>{c.tipo_contrato || 'CLT'}</span></td>
                          <td className="p-4 text-center">
                              <div className="flex justify-center gap-1">
                                  {c.recebe_vt && <span className="bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1" title="Vale Transporte"><Bus className="w-3 h-3"/> VT</span>}
                                  {c.recebe_va && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1" title="Vale Alimentação"><Utensils className="w-3 h-3"/> VA</span>}
                                  {!c.recebe_vt && !c.recebe_va && <span className="text-[10px] text-slate-400 font-medium italic">Nenhum</span>}
                              </div>
                          </td>
                          <td className="p-4 text-center text-xs text-slate-600 font-medium">{new Date(c.data_admissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                          <td className="p-4 text-center"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${corStatus}`}>{c.status}</span></td>
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
        {/* ABA: VT E VA (BENEFÍCIOS) */}
        {/* ========================================================================= */}
        {abaAtiva === "beneficios" && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-200">
            
            {/* Header Benefícios */}
            <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Bus className="w-5 h-5 text-indigo-600"/> Gestão de Vale Transporte e Alimentação</h2>
                    <p className="text-sm text-slate-500">Cálculo quinzenal/mensal por dias efetivamente trabalhados.</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="text-sm font-bold text-slate-700">Período Referência:</label>
                    <Input value={mesReferencia} onChange={e => { let val = e.target.value.replace(/\D/g, ''); if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 6); setMesReferencia(val); }} placeholder="MM/AAAA" className="w-32 text-center font-bold bg-slate-50" maxLength={7} />
                </div>
            </div>

            {/* Motor Global de Cálculo */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2"><Calculator className="w-4 h-4"/> Calculadora Global do Período</h3>
                    <p className="text-xs text-indigo-700">Insira a regra geral para preencher a tabela abaixo automaticamente.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-indigo-800 uppercase">Dias Úteis VT</label><Input type="number" min="0" value={globalDiasVT} onChange={e=>setGlobalDiasVT(e.target.value)} className="bg-white" placeholder="Ex: 11" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-indigo-800 uppercase">R$ Diário VT</label><Input type="number" step="0.01" value={globalValorDiarioVT} onChange={e=>setGlobalValorDiarioVT(e.target.value)} className="bg-white" placeholder="R$ Padrão" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-indigo-800 uppercase">Dias Úteis VA</label><Input type="number" min="0" value={globalDiasVA} onChange={e=>setGlobalDiasVA(e.target.value)} className="bg-white" placeholder="Ex: 10" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-indigo-800 uppercase">R$ Diário VA</label><Input type="number" step="0.01" value={globalValorDiarioVA} onChange={e=>setGlobalValorDiarioVA(e.target.value)} className="bg-white" placeholder="R$ Padrão" /></div>
                    <Button onClick={aplicarRegraGlobalBeneficios} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2"><ArrowRight className="w-4 h-4"/> Aplicar a Todos</Button>
                </div>
            </div>

            {/* Tabela de Lançamento e Assinaturas */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b flex flex-wrap items-center gap-4 justify-between bg-slate-50">
                    <div className="flex bg-white rounded-lg border p-1">
                        <button onClick={() => setFiltroVinculoBen("todos")} className={`px-3 py-1.5 text-xs font-bold rounded ${filtroVinculoBen === "todos" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}>Todos</button>
                        <button onClick={() => setFiltroVinculoBen("clt")} className={`px-3 py-1.5 text-xs font-bold rounded ${filtroVinculoBen === "clt" ? "bg-sky-100 text-sky-700 border border-sky-200" : "text-slate-500 hover:bg-slate-100"}`}>Por Dentro (CLT)</button>
                        <button onClick={() => setFiltroVinculoBen("pj")} className={`px-3 py-1.5 text-xs font-bold rounded ${filtroVinculoBen === "pj" ? "bg-purple-100 text-purple-700 border border-purple-200" : "text-slate-500 hover:bg-slate-100"}`}>Por Fora (PJ/Estágio)</button>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => acionarImpressaoRecibos()} className="border-slate-300 text-slate-700 hover:bg-slate-100 gap-2"><Printer className="w-4 h-4"/> Imprimir Todos da Lista</Button>
                        <Button onClick={salvarRascunhoBeneficios} disabled={carregandoDados} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm"><Save className="w-4 h-4"/> Gravar Lançamentos</Button>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left border-collapse text-sm min-w-[1200px]">
                        <thead>
                            <tr className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
                                <th className="p-3 font-semibold rounded-tl-lg">Colaborador</th>
                                <th className="p-3 font-semibold text-center border-l border-slate-700" colSpan={3}>Vale Transporte</th>
                                <th className="p-3 font-semibold text-center border-l border-slate-700" colSpan={3}>Vale Alimentação</th>
                                <th className="p-3 font-semibold text-center border-l border-slate-700 w-44 rounded-tr-lg">Controle de Recibos</th>
                            </tr>
                            <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-200">
                                <th className="p-2 border-r border-slate-200">Nome e Vínculo</th>
                                <th className="p-2 text-center">Dias</th><th className="p-2 text-center">Diária (R$)</th><th className="p-2 text-right border-r border-slate-200">Total VT</th>
                                <th className="p-2 text-center">Dias</th><th className="p-2 text-center">Diária (R$)</th><th className="p-2 text-right border-r border-slate-200">Total VA</th>
                                <th className="p-2 text-center">Status / Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {carregandoDados ? <tr><td colSpan={8} className="p-8 text-center text-slate-400">Carregando dados...</td></tr> : beneficiosFiltrados.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-slate-400">Nenhum colaborador elegível. Verifique se as opções "Recebe VT/VA" estão ativadas no cadastro.</td></tr> : (
                                beneficiosFiltrados.map((b) => (
                                    <tr key={b.colaborador_id} className="hover:bg-slate-50">
                                        <td className="p-3 border-r border-slate-100">
                                            <p className="font-bold text-slate-800 truncate">{b.rh_colaboradores?.nome}</p>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-block mt-0.5 ${b.tipo_contrato === 'CLT' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>{b.tipo_contrato}</span>
                                        </td>
                                        
                                        {/* VT INPUTS */}
                                        <td className="p-2 text-center bg-sky-50/30">
                                            <Input type="number" min="0" disabled={!b.recebe_vt} value={b.dias_vt} onChange={e => atualizarBeneficioIndividual(b.colaborador_id, 'dias_vt', parseFloat(e.target.value)||0)} className="h-7 w-16 text-center mx-auto text-xs font-bold disabled:opacity-30 bg-white" />
                                        </td>
                                        <td className="p-2 text-center bg-sky-50/30">
                                            <Input type="number" step="0.01" disabled={!b.recebe_vt} value={b.valor_diario_vt} onChange={e => atualizarBeneficioIndividual(b.colaborador_id, 'valor_diario_vt', parseFloat(e.target.value)||0)} className="h-7 w-20 text-center mx-auto text-xs bg-white disabled:opacity-30" />
                                        </td>
                                        <td className="p-3 text-right font-bold text-sky-700 bg-sky-50/30 border-r border-slate-100">
                                            R$ {Number(b.total_vt).toFixed(2).replace('.',',')}
                                        </td>

                                        {/* VA INPUTS */}
                                        <td className="p-2 text-center bg-amber-50/30">
                                            <Input type="number" min="0" disabled={!b.recebe_va} value={b.dias_va} onChange={e => atualizarBeneficioIndividual(b.colaborador_id, 'dias_va', parseFloat(e.target.value)||0)} className="h-7 w-16 text-center mx-auto text-xs font-bold disabled:opacity-30 bg-white" />
                                        </td>
                                        <td className="p-2 text-center bg-amber-50/30">
                                            <Input type="number" step="0.01" disabled={!b.recebe_va} value={b.valor_diario_va} onChange={e => atualizarBeneficioIndividual(b.colaborador_id, 'valor_diario_va', parseFloat(e.target.value)||0)} className="h-7 w-20 text-center mx-auto text-xs bg-white disabled:opacity-30" />
                                        </td>
                                        <td className="p-3 text-right font-bold text-amber-700 bg-amber-50/30 border-r border-slate-100">
                                            R$ {Number(b.total_va).toFixed(2).replace('.',',')}
                                        </td>

                                        {/* RECIBOS */}
                                        <td className="p-2 text-center space-y-1">
                                            {b.recibo_assinado ? (
                                                <div className="flex gap-1">
                                                    <span className="w-full flex items-center justify-center gap-1 h-7 rounded text-[9px] font-bold uppercase border bg-emerald-100 text-emerald-700 border-emerald-300">
                                                        <CheckCircle2 className="w-3 h-3"/> Arquivado
                                                    </span>
                                                    {b.recibo_url && (
                                                        <Button variant="outline" size="sm" onClick={() => window.open(b.recibo_url, '_blank')} className="h-7 w-8 p-0 text-emerald-700 border-emerald-300" title="Ver Arquivo"><LinkIcon className="w-3 h-3"/></Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex gap-1">
                                                    <Button variant="outline" size="sm" onClick={() => acionarImpressaoRecibos(b)} className="flex-1 h-7 text-[9px] uppercase tracking-wider text-slate-600 px-1" title="Imprimir este"><Printer className="w-3 h-3 mr-1"/> Imprimir</Button>
                                                    <Button variant="outline" size="sm" onClick={() => { setUploadingId(b.colaborador_id); fileInputRef.current?.click(); }} disabled={uploadingId === b.colaborador_id} className="h-7 w-8 p-0 text-indigo-600 border-indigo-200 hover:bg-indigo-50" title="Anexar Recibo Assinado">
                                                        {uploadingId === b.colaborador_id ? <Loader2 className="w-3 h-3 animate-spin"/> : <UploadCloud className="w-3 h-3"/>}
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-800 text-sm shadow-sm">
                <FileWarning className="w-5 h-5 shrink-0 mt-0.5"/>
                <p>Lembre-se de clicar em <strong>"Gravar Lançamentos"</strong> antes de fechar a Folha de Pagamento. Os totais de VT e VA gravados aqui serão espelhados automaticamente na aba de Folha de Pagamento para o cálculo do salário líquido final.</p>
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
                    <p className="text-sm text-slate-500">Lançamento de comissões, horas extras, descontos e fechamento do mês.</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="text-sm font-bold text-slate-700">Mês/Ano Referência:</label>
                    <Input value={mesReferencia} onChange={e => { let val = e.target.value.replace(/\D/g, ''); if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 6); setMesReferencia(val); }} placeholder="MM/AAAA" className="w-32 text-center font-bold bg-slate-50" maxLength={7} />
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
                                <th className="p-3 font-semibold text-center w-24" title="Vem da Aba VT e VA">VT (+)</th>
                                <th className="p-3 font-semibold text-center w-24" title="Vem da Aba VT e VA">VA / VR (+)</th>
                                <th className="p-3 font-semibold text-center border-l border-slate-700 w-28" title="Horas Extras, Bônus">Outros (+)</th>
                                <th className="p-3 font-semibold text-center w-28" title="Faltas, Adiantamentos, INSS">Descontos (-)</th>
                                <th className="p-3 font-semibold text-right border-l border-slate-700">Líquido a Pagar</th>
                                <th className="p-3 font-semibold text-center rounded-tr-lg border-l border-slate-700 w-32">Recibo Assinado?</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {carregandoDados ? (
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
                                        
                                        <td className="p-2 border-l border-slate-100">
                                            <Input type="number" step="0.01" min="0" disabled={isFolhaFechada} value={item.comissoes || ''} onChange={e => atualizarValoresFolha(item.colaborador_id, 'comissoes', parseFloat(e.target.value)||0)} className="h-8 text-center text-emerald-600 font-semibold bg-white border-slate-200" placeholder="0,00" />
                                        </td>
                                        <td className="p-3 text-center text-sky-600 font-bold bg-sky-50/20" title="Integrado da Aba de Benefícios">
                                            {Number(item.vale_transporte).toFixed(2)}
                                        </td>
                                        <td className="p-3 text-center text-amber-600 font-bold bg-amber-50/20" title="Integrado da Aba de Benefícios">
                                            {Number(item.ticket_alimentacao).toFixed(2)}
                                        </td>
                                        <td className="p-2 border-l border-slate-100">
                                            <Input type="number" step="0.01" min="0" disabled={isFolhaFechada} value={item.adicionais || ''} onChange={e => atualizarValoresFolha(item.colaborador_id, 'adicionais', parseFloat(e.target.value)||0)} className="h-8 text-center text-emerald-600 font-semibold bg-white border-slate-200" placeholder="0,00" />
                                        </td>
                                        <td className="p-2">
                                            <Input type="number" step="0.01" min="0" disabled={isFolhaFechada} value={item.descontos || ''} onChange={e => atualizarValoresFolha(item.colaborador_id, 'descontos', parseFloat(e.target.value)||0)} className="h-8 text-center text-rose-600 font-semibold bg-white border-slate-200" placeholder="0,00" />
                                        </td>
                                        
                                        <td className="p-3 text-right font-black text-sky-800 text-base border-l border-slate-100 bg-slate-50/50">
                                            {Number(item.salario_liquido).toFixed(2).replace('.',',')}
                                        </td>

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
                        <p><strong>Atenção:</strong> Existem holerites marcados como "Pendente". Lembre-se de recolher as assinaturas para proteção jurídica da empresa.</p>
                    </div>
                )}
            </div>

          </div>
        )}

      </div>
    </AppLayout>
  );
}