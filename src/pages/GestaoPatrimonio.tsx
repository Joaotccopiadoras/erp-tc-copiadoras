import { useState, useEffect, useRef } from "react";
import { 
    AlertTriangle, Building, Calculator, Car, CheckCircle2, FileBadge, 
    Landmark, Laptop, MapPin, Plus, Search, Server, Shield, Sofa, 
    Tag, Trash2, Wifi, Wrench, Edit, Activity, ArrowLeft, PenTool, 
    UploadCloud, Link as LinkIcon, Loader2 
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const defaultFormAtivo = {
    categoria: "TI / Informática", descricao: "", marca_modelo: "", identificacao_extra: "",
    data_aquisicao: "", valor_aquisicao: "", taxa_depreciacao_anual: "20", status: "Ativo", setor_alocado: "", responsavel: ""
};

const defaultFormServico = {
    categoria: "Internet/Telefonia", descricao: "", fornecedor_nome: "", periodicidade: "Mensal", 
    valor_custo: "", data_vencimento: "", dia_vencimento: "10", status: "Ativo"
};

const defaultFormPeca = { nome: "", ultima_revisao: "", ultima_troca: "", vida_util_estimada: "", proxima_troca: "", estado_atual: "Excelente" };
const defaultFormManutencao = { data_manutencao: "", tipo: "Preventiva", descricao: "", odometro: "", valor: "" };

export default function GestaoPatrimonio() {
  const [abaAtiva, setAbaAtiva] = useState<"ativos" | "servicos">("ativos");

  // ==========================================
  // ESTADOS: ATIVOS FÍSICOS
  // ==========================================
  const [ativos, setAtivos] = useState<any[]>([]);
  const [buscaAtivos, setBuscaAtivos] = useState("");
  const [mostrarFormAtivo, setMostrarFormAtivo] = useState(false);
  const [editandoAtivoId, setEditandoAtivoId] = useState<string | null>(null);
  const [formAtivo, setFormAtivo] = useState(defaultFormAtivo);

  // ==========================================
  // ESTADOS: DOSSIÊ E MANUTENÇÕES
  // ==========================================
  const [ativoSelecionado, setAtivoSelecionado] = useState<any | null>(null);
  const [pecas, setPecas] = useState<any[]>([]);
  const [manutencoes, setManutencoes] = useState<any[]>([]);
  const [carregandoDossie, setCarregandoDossie] = useState(false);
  
  const [mostrarFormPeca, setMostrarFormPeca] = useState(false);
  const [formPeca, setFormPeca] = useState(defaultFormPeca);
  
  const [mostrarFormManutencao, setMostrarFormManutencao] = useState(false);
  const [formManutencao, setFormManutencao] = useState(defaultFormManutencao);
  const [comprovanteUpload, setComprovanteUpload] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // ESTADOS: SERVIÇOS E CONTRATOS
  // ==========================================
  const [servicos, setServicos] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [catInfraId, setCatInfraId] = useState("");
  const [buscaServicos, setBuscaServicos] = useState("");
  
  const [mostrarFormServico, setMostrarFormServico] = useState(false);
  const [editandoServicoId, setEditandoServicoId] = useState<string | null>(null);
  const [formServico, setFormServico] = useState(defaultFormServico);

  const mesAtualStr = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  const [mostrarMotor, setMostrarMotor] = useState(false);
  const [mesLancamento, setMesLancamento] = useState(mesAtualStr);
  const [processando, setProcessando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // ==========================================
  // AUTO-SAVE BLINDADO (RECUPERAÇÃO DE RASCUNHO)
  // ==========================================
  useEffect(() => {
    const saved = sessionStorage.getItem("patrimonio_rascunho_v3");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.abaAtiva) setAbaAtiva(parsed.abaAtiva);
        
        if (parsed.mostrarFormAtivo !== undefined) setMostrarFormAtivo(parsed.mostrarFormAtivo);
        if (parsed.editandoAtivoId !== undefined) setEditandoAtivoId(parsed.editandoAtivoId);
        if (parsed.formAtivo) setFormAtivo(parsed.formAtivo);
        
        if (parsed.mostrarFormServico !== undefined) setMostrarFormServico(parsed.mostrarFormServico);
        if (parsed.editandoServicoId !== undefined) setEditandoServicoId(parsed.editandoServicoId);
        if (parsed.formServico) setFormServico(parsed.formServico);
        
        if (parsed.buscaAtivos !== undefined) setBuscaAtivos(parsed.buscaAtivos);
        if (parsed.buscaServicos !== undefined) setBuscaServicos(parsed.buscaServicos);

        if (parsed.ativoSelecionado !== undefined) setAtivoSelecionado(parsed.ativoSelecionado);
        if (parsed.mostrarFormPeca !== undefined) setMostrarFormPeca(parsed.mostrarFormPeca);
        if (parsed.formPeca) setFormPeca(parsed.formPeca);
        if (parsed.mostrarFormManutencao !== undefined) setMostrarFormManutencao(parsed.mostrarFormManutencao);
        if (parsed.formManutencao) setFormManutencao(parsed.formManutencao);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const stateToSave = { 
        abaAtiva, mostrarFormAtivo, editandoAtivoId, formAtivo, 
        mostrarFormServico, editandoServicoId, formServico, 
        buscaAtivos, buscaServicos,
        ativoSelecionado, mostrarFormPeca, formPeca, mostrarFormManutencao, formManutencao
    };
    sessionStorage.setItem("patrimonio_rascunho_v3", JSON.stringify(stateToSave));
  }, [abaAtiva, mostrarFormAtivo, editandoAtivoId, formAtivo, mostrarFormServico, editandoServicoId, formServico, buscaAtivos, buscaServicos, ativoSelecionado, mostrarFormPeca, formPeca, mostrarFormManutencao, formManutencao]);
  // ==========================================

  useEffect(() => {
    if (!ativoSelecionado) fetchDados();
  }, [abaAtiva, ativoSelecionado]);

  useEffect(() => {
    if (ativoSelecionado) carregarDossie(ativoSelecionado.id);
  }, [ativoSelecionado]);

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
  const abrirNovoAtivo = () => {
    setEditandoAtivoId(null);
    setFormAtivo(defaultFormAtivo);
    setMostrarFormAtivo(true);
  };

  const abrirEditarAtivo = (ativo: any) => {
    setEditandoAtivoId(ativo.id);
    setFormAtivo({
        categoria: ativo.categoria || "TI / Informática",
        descricao: ativo.descricao || "",
        marca_modelo: ativo.marca_modelo || "",
        identificacao_extra: ativo.identificacao_extra || "",
        data_aquisicao: ativo.data_aquisicao || "",
        valor_aquisicao: ativo.valor_aquisicao?.toString() || "",
        taxa_depreciacao_anual: ativo.taxa_depreciacao_anual?.toString() || "20",
        status: ativo.status || "Ativo",
        setor_alocado: ativo.setor_alocado || "",
        responsavel: ativo.responsavel || ""
    });
    setMostrarFormAtivo(true);
  };

  const salvarAtivo = async () => {
    if (!formAtivo.descricao || !formAtivo.valor_aquisicao || !formAtivo.data_aquisicao) return alert("Descrição, Data e Valor são obrigatórios.");
    setSalvando(true);
    try {
        const payload = { 
            ...formAtivo, 
            valor_aquisicao: parseFloat(formAtivo.valor_aquisicao), 
            taxa_depreciacao_anual: parseFloat(formAtivo.taxa_depreciacao_anual) || 0 
        };
        
        if (editandoAtivoId) {
            const { error } = await supabase.from('adm_ativos_fisicos').update(payload).eq('id', editandoAtivoId);
            if (error) throw error;
            alert("Ativo atualizado com sucesso!");
        } else {
            const { error } = await supabase.from('adm_ativos_fisicos').insert([payload]);
            if (error) throw error;
            alert("Ativo cadastrado com sucesso!");
        }
        
        setMostrarFormAtivo(false);
        setEditandoAtivoId(null);
        setFormAtivo(defaultFormAtivo);
        fetchDados();
    } catch(e:any) { alert("Erro ao salvar: " + e.message); } finally { setSalvando(false); }
  };

  const deletarAtivo = async (id: string) => {
      if(!confirm("Tem certeza que deseja excluir este ativo?")) return;
      const { error } = await supabase.from('adm_ativos_fisicos').delete().eq('id', id);
      if (error) alert("Erro ao excluir: " + error.message);
      else fetchDados();
  };

  const calcularValorResidual = (ativo: any) => {
      if (!ativo.data_aquisicao || !ativo.taxa_depreciacao_anual || ativo.taxa_depreciacao_anual === 0) return ativo.valor_aquisicao;
      const anosPassados = (new Date().getTime() - new Date(ativo.data_aquisicao).getTime()) / (1000 * 60 * 60 * 24 * 365);
      const depreciacaoTotal = (ativo.taxa_depreciacao_anual / 100) * anosPassados;
      const residual = ativo.valor_aquisicao * (1 - depreciacaoTotal);
      return Math.max(0, residual);
  };

  // --- LÓGICA DOSSIÊ (PEÇAS E MANUTENÇÕES) ---
  const abrirDossie = (ativo: any) => {
      setAtivoSelecionado(ativo);
  };

  const carregarDossie = async (idAtivo: string) => {
      setCarregandoDossie(true);
      try {
          const { data: pData } = await supabase.from('adm_ativo_pecas').select('*').eq('ativo_id', idAtivo).order('proxima_troca', { ascending: true });
          const { data: mData } = await supabase.from('adm_ativo_manutencoes').select('*').eq('ativo_id', idAtivo).order('data_manutencao', { ascending: false });
          if (pData) setPecas(pData);
          if (mData) setManutencoes(mData);
      } catch (e) { console.error(e); } finally { setCarregandoDossie(false); }
  };

  const salvarPeca = async () => {
      if (!formPeca.nome) return alert("O nome da peça é obrigatório.");
      setSalvando(true);
      try {
          const payload = {
              ativo_id: ativoSelecionado.id,
              nome: formPeca.nome,
              ultima_revisao: formPeca.ultima_revisao || null,
              ultima_troca: formPeca.ultima_troca || null,
              vida_util_estimada: formPeca.vida_util_estimada,
              proxima_troca: formPeca.proxima_troca || null,
              estado_atual: formPeca.estado_atual
          };
          const { error } = await supabase.from('adm_ativo_pecas').insert([payload]);
          if (error) throw error;
          setMostrarFormPeca(false);
          setFormPeca(defaultFormPeca);
          carregarDossie(ativoSelecionado.id);
      } catch(e:any) { alert("Erro ao salvar peça: " + e.message); } finally { setSalvando(false); }
  };

  const deletarPeca = async (id: string) => {
      if(!confirm("Excluir esta peça?")) return;
      await supabase.from('adm_ativo_pecas').delete().eq('id', id);
      carregarDossie(ativoSelecionado.id);
  };

  const salvarManutencao = async () => {
      if (!formManutencao.descricao || !formManutencao.data_manutencao) return alert("Data e Descrição são obrigatórios.");
      setSalvando(true);
      try {
          let comprovanteUrl = null;

          if (comprovanteUpload) {
              const ext = comprovanteUpload.name.split('.').pop();
              const fileName = `manut_${ativoSelecionado.id}_${Date.now()}.${ext}`;
              const { error: uploadError } = await supabase.storage.from('comprovantes_patrimonio').upload(fileName, comprovanteUpload, { upsert: true });
              if (uploadError) throw uploadError;
              const { data: { publicUrl } } = supabase.storage.from('comprovantes_patrimonio').getPublicUrl(fileName);
              comprovanteUrl = publicUrl;
          }

          const payload = {
              ativo_id: ativoSelecionado.id,
              data_manutencao: formManutencao.data_manutencao,
              tipo: formManutencao.tipo,
              descricao: formManutencao.descricao,
              odometro: formManutencao.odometro ? parseInt(formManutencao.odometro.toString()) : null,
              valor: formManutencao.valor ? parseFloat(formManutencao.valor.toString()) : 0,
              comprovante_url: comprovanteUrl
          };

          const { error } = await supabase.from('adm_ativo_manutencoes').insert([payload]);
          if (error) throw error;
          
          setMostrarFormManutencao(false);
          setFormManutencao(defaultFormManutencao);
          setComprovanteUpload(null);
          carregarDossie(ativoSelecionado.id);
      } catch(e:any) { alert("Erro ao salvar manutenção: " + e.message); } finally { setSalvando(false); }
  };

  const deletarManutencao = async (id: string) => {
      if(!confirm("Excluir registro de manutenção?")) return;
      await supabase.from('adm_ativo_manutencoes').delete().eq('id', id);
      carregarDossie(ativoSelecionado.id);
  };

  // --- LÓGICA SERVIÇOS ---
  const abrirNovoServico = () => {
    setEditandoServicoId(null);
    setFormServico(defaultFormServico);
    setMostrarFormServico(true);
  };

  const abrirEditarServico = (servico: any) => {
    setEditandoServicoId(servico.id);
    setFormServico({
        categoria: servico.categoria || "Internet/Telefonia",
        descricao: servico.descricao || "",
        fornecedor_nome: servico.fornecedor_nome || "",
        periodicidade: servico.periodicidade || "Mensal",
        valor_custo: servico.valor_custo?.toString() || "",
        data_vencimento: servico.data_vencimento || "",
        dia_vencimento: servico.dia_vencimento?.toString() || "10",
        status: servico.status || "Ativo"
    });
    setMostrarFormServico(true);
  };

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

        if (editandoServicoId) {
            const { error } = await supabase.from('adm_servicos_estruturais').update(payload).eq('id', editandoServicoId);
            if (error) throw error;
            alert("Serviço atualizado com sucesso!");
        } else {
            const { error } = await supabase.from('adm_servicos_estruturais').insert([payload]);
            if (error) throw error;
            alert("Serviço registrado com sucesso!");
        }

        setMostrarFormServico(false);
        setEditandoServicoId(null);
        setFormServico(defaultFormServico);
        fetchDados();
    } catch(e:any) { alert("Erro ao salvar: " + e.message); } finally { setSalvando(false); }
  };

  const deletarServico = async (id: string) => {
      if(!confirm("Tem certeza que deseja excluir este serviço?")) return;
      const { error } = await supabase.from('adm_servicos_estruturais').delete().eq('id', id);
      if (error) alert("Erro ao excluir: " + error.message);
      else fetchDados();
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
          
          {ativoSelecionado ? (
            <Button variant="outline" onClick={() => setAtivoSelecionado(null)} className="gap-2 text-slate-600 font-bold shadow-sm border-slate-300">
                <ArrowLeft className="w-4 h-4"/> Voltar à Lista de Ativos
            </Button>
          ) : (
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setAbaAtiva("ativos")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "ativos" ? "bg-white shadow-sm text-indigo-700" : "text-slate-600"}`}><Laptop className="w-4 h-4"/> Ativos Físicos</button>
                <button onClick={() => setAbaAtiva("servicos")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "servicos" ? "bg-white shadow-sm text-emerald-700" : "text-slate-600"}`}><Wifi className="w-4 h-4"/> Serviços e Contratos</button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TELA DE DOSSIÊ DO ATIVO (PEÇAS E MANUTENÇÕES) */}
        {/* ========================================================================= */}
        {ativoSelecionado && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                <div className="bg-slate-800 text-white p-6 rounded-xl border border-slate-700 shadow-md relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 text-slate-700/30 opacity-20"><Wrench className="w-64 h-64"/></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                        <div>
                            <h2 className="text-3xl font-black">{ativoSelecionado.descricao}</h2>
                            <div className="flex gap-4 mt-2 text-sm font-medium text-slate-300">
                                <span className="flex items-center gap-1"><Tag className="w-4 h-4"/> Pat: #{String(ativoSelecionado.codigo_patrimonio).padStart(4,'0')}</span>
                                <span className="flex items-center gap-1"><MapPin className="w-4 h-4"/> {ativoSelecionado.setor_alocado || 'Uso Comum'}</span>
                                {ativoSelecionado.identificacao_extra && <span className="text-indigo-400 font-mono bg-slate-900 px-2 rounded border border-slate-700">{ativoSelecionado.identificacao_extra}</span>}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Custo Acumulado (Manutenções)</p>
                            <p className="text-2xl font-bold text-rose-400">R$ {manutencoes.reduce((acc, m) => acc + Number(m.valor), 0).toFixed(2).replace('.',',')}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* BLOCO PEÇAS E COMPONENTES */}
                    <div className="bg-white rounded-xl border shadow-sm flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><PenTool className="w-4 h-4 text-indigo-600"/> Vida Útil de Componentes</h3>
                            <Button size="sm" onClick={() => setMostrarFormPeca(!mostrarFormPeca)} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200 h-8 gap-2"><Plus className="w-4 h-4"/> Nova Peça</Button>
                        </div>

                        {mostrarFormPeca && (
                            <div className="p-5 bg-indigo-50 border-b border-indigo-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Componente / Peça *</label><Input value={formPeca.nome} onChange={e=>setFormPeca({...formPeca, nome:e.target.value})} placeholder="Ex: Pneu Dianteiro Esquerdo" className="bg-white" /></div>
                                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Última Troca</label><Input type="date" value={formPeca.ultima_troca} onChange={e=>setFormPeca({...formPeca, ultima_troca:e.target.value})} className="bg-white" /></div>
                                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Última Revisão</label><Input type="date" value={formPeca.ultima_revisao} onChange={e=>setFormPeca({...formPeca, ultima_revisao:e.target.value})} className="bg-white" /></div>
                                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Vida Útil Estimada</label><Input value={formPeca.vida_util_estimada} onChange={e=>setFormPeca({...formPeca, vida_util_estimada:e.target.value})} placeholder="Ex: 2 Anos / 50.000 KM" className="bg-white" /></div>
                                <div className="space-y-2"><label className="text-xs font-bold text-indigo-600 uppercase">Agendamento (Próx. Troca)</label><Input type="date" value={formPeca.proxima_troca} onChange={e=>setFormPeca({...formPeca, proxima_troca:e.target.value})} className="bg-white border-indigo-200" /></div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Estado Atual</label>
                                    <Select value={formPeca.estado_atual} onValueChange={v => setFormPeca({...formPeca, estado_atual: v})}>
                                        <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                                        <SelectContent className="z-50 bg-white">
                                            <SelectItem value="Excelente">Excelente / Novo</SelectItem><SelectItem value="Bom">Bom</SelectItem><SelectItem value="Atenção">Atenção (Desgaste)</SelectItem><SelectItem value="Crítico">Crítico (Trocar)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                                    <Button variant="outline" size="sm" onClick={() => setMostrarFormPeca(false)}>Cancelar</Button>
                                    <Button size="sm" onClick={salvarPeca} disabled={salvando} className="bg-indigo-600 text-white">Salvar Componente</Button>
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto flex-1 max-h-[500px] overflow-y-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="sticky top-0 bg-white shadow-sm z-10">
                                    <tr className="text-[10px] uppercase text-slate-500 border-b">
                                        <th className="p-3 font-bold">Componente</th>
                                        <th className="p-3 font-bold text-center">Última Troca/Rev.</th>
                                        <th className="p-3 font-bold text-center">Estimativa / Troca</th>
                                        <th className="p-3 font-bold text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {carregandoDossie ? <tr><td colSpan={4} className="text-center p-8 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr> : pecas.length === 0 ? <tr><td colSpan={4} className="text-center p-8 text-slate-400 italic">Nenhum componente mapeado.</td></tr> : pecas.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50">
                                            <td className="p-3">
                                                <p className="font-bold text-slate-800">{p.nome}</p>
                                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mt-1 inline-block ${p.estado_atual === 'Excelente' ? 'bg-emerald-100 text-emerald-700' : p.estado_atual === 'Bom' ? 'bg-blue-100 text-blue-700' : p.estado_atual === 'Atenção' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{p.estado_atual}</span>
                                            </td>
                                            <td className="p-3 text-center text-xs text-slate-600">
                                                <p>T: {p.ultima_troca ? new Date(p.ultima_troca).toLocaleDateString('pt-BR') : '--'}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">R: {p.ultima_revisao ? new Date(p.ultima_revisao).toLocaleDateString('pt-BR') : '--'}</p>
                                            </td>
                                            <td className="p-3 text-center text-xs font-semibold text-slate-700">
                                                <p className="text-[10px] text-slate-500 font-normal mb-0.5">{p.vida_util_estimada || 'Não informada'}</p>
                                                <span className={`${p.proxima_troca && new Date(p.proxima_troca) < new Date() ? 'text-rose-600' : 'text-indigo-600'}`}>{p.proxima_troca ? new Date(p.proxima_troca).toLocaleDateString('pt-BR') : 'Sem Agendamento'}</span>
                                            </td>
                                            <td className="p-3 text-center"><button onClick={() => deletarPeca(p.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* BLOCO MANUTENÇÕES E DESPESAS */}
                    <div className="bg-white rounded-xl border shadow-sm flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Wrench className="w-4 h-4 text-emerald-600"/> Histórico de Manutenções</h3>
                            <Button size="sm" onClick={() => setMostrarFormManutencao(!mostrarFormManutencao)} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 h-8 gap-2"><Plus className="w-4 h-4"/> Lançar Evento</Button>
                        </div>

                        {mostrarFormManutencao && (
                            <div className="p-5 bg-emerald-50 border-b border-emerald-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Data da Manutenção *</label><Input type="date" value={formManutencao.data_manutencao} onChange={e=>setFormManutencao({...formManutencao, data_manutencao:e.target.value})} className="bg-white border-emerald-200" /></div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
                                    <Select value={formManutencao.tipo} onValueChange={v => setFormManutencao({...formManutencao, tipo: v})}>
                                        <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                                        <SelectContent className="bg-white z-50"><SelectItem value="Preventiva">Preventiva</SelectItem><SelectItem value="Corretiva">Corretiva (Quebra)</SelectItem><SelectItem value="Melhoria">Melhoria / Upgrade</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Descrição do que foi feito *</label><Input value={formManutencao.descricao} onChange={e=>setFormManutencao({...formManutencao, descricao:e.target.value})} placeholder="Ex: Troca de Óleo, Substituição bateria..." className="bg-white" /></div>
                                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Odômetro / Horímetro</label><Input type="number" value={formManutencao.odometro} onChange={e=>setFormManutencao({...formManutencao, odometro:e.target.value})} placeholder="KM/Horas no momento" className="bg-white" /></div>
                                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Custo / Valor Pago (R$)</label><Input type="number" step="0.01" value={formManutencao.valor} onChange={e=>setFormManutencao({...formManutencao, valor:e.target.value})} className="bg-white" /></div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Comprovante / Nota (PDF ou Foto)</label>
                                    <div className="flex gap-2 items-center">
                                        <Button variant="outline" className="w-full bg-white gap-2 text-slate-600" onClick={() => fileInputRef.current?.click()}><UploadCloud className="w-4 h-4"/> {comprovanteUpload ? comprovanteUpload.name : "Selecionar Arquivo..."}</Button>
                                        {comprovanteUpload && <Button variant="ghost" onClick={()=>setComprovanteUpload(null)} className="text-red-500 hover:bg-red-50 px-2 h-10">Remover</Button>}
                                        <input type="file" className="hidden" ref={fileInputRef} onChange={e => e.target.files && setComprovanteUpload(e.target.files[0])} />
                                    </div>
                                </div>
                                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                                    <Button variant="outline" size="sm" onClick={() => { setMostrarFormManutencao(false); setComprovanteUpload(null); }}>Cancelar</Button>
                                    <Button size="sm" onClick={salvarManutencao} disabled={salvando} className="bg-emerald-600 text-white">Salvar Registro</Button>
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto flex-1 max-h-[500px] overflow-y-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="sticky top-0 bg-white shadow-sm z-10">
                                    <tr className="text-[10px] uppercase text-slate-500 border-b">
                                        <th className="p-3 font-bold">Data / Tipo</th>
                                        <th className="p-3 font-bold">Descrição do Evento</th>
                                        <th className="p-3 font-bold text-right">Odômetro / Valor</th>
                                        <th className="p-3 font-bold text-center w-12">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {carregandoDossie ? <tr><td colSpan={4} className="text-center p-8 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr> : manutencoes.length === 0 ? <tr><td colSpan={4} className="text-center p-8 text-slate-400 italic">Nenhuma manutenção registrada.</td></tr> : manutencoes.map(m => (
                                        <tr key={m.id} className="hover:bg-slate-50">
                                            <td className="p-3">
                                                <p className="font-bold text-slate-800">{new Date(m.data_manutencao).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</p>
                                                <span className={`text-[9px] font-bold uppercase tracking-wider ${m.tipo === 'Preventiva' ? 'text-indigo-600' : m.tipo === 'Corretiva' ? 'text-rose-600' : 'text-emerald-600'}`}>{m.tipo}</span>
                                            </td>
                                            <td className="p-3">
                                                <p className="text-sm font-medium text-slate-700 leading-tight">{m.descricao}</p>
                                            </td>
                                            <td className="p-3 text-right">
                                                {m.odometro && <p className="text-[10px] font-mono text-slate-500 mb-0.5">{m.odometro} KM/H</p>}
                                                <p className="font-black text-rose-600">R$ {Number(m.valor).toFixed(2).replace('.',',')}</p>
                                            </td>
                                            <td className="p-3 text-center space-y-2">
                                                {m.comprovante_url && <Button variant="outline" size="icon" onClick={() => window.open(m.comprovante_url, '_blank')} className="h-7 w-7 text-emerald-600 border-emerald-200 bg-emerald-50" title="Ver Comprovante"><LinkIcon className="w-3 h-3"/></Button>}
                                                <Button variant="ghost" size="icon" onClick={() => deletarManutencao(m.id)} className="h-7 w-7 text-slate-300 hover:text-red-500 p-0"><Trash2 className="w-3 h-3"/></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: ATIVOS FÍSICOS (LISTA PRINCIPAL) */}
        {/* ========================================================================= */}
        {!ativoSelecionado && abaAtiva === "ativos" && (
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
                        <Button onClick={abrirNovoAtivo} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"><Plus className="w-4 h-4"/> Novo Ativo Físico</Button>
                    </div>

                    {mostrarFormAtivo && (
                        <div className="p-6 bg-white border-b border-slate-100 space-y-6">
                            <h3 className="font-bold text-indigo-800 flex items-center gap-2 border-b border-indigo-100 pb-2">
                                {editandoAtivoId ? <><Edit className="w-5 h-5"/> Editar Bem Físico</> : <><Plus className="w-5 h-5"/> Registrar Novo Bem Físico</>}
                            </h3>
                            <div className="space-y-4 relative z-20">
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Tag className="w-4 h-4 text-indigo-500"/> 1. Identificação Geral</h4>
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
                            <div className="space-y-4 relative z-10">
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><MapPin className="w-4 h-4 text-indigo-500"/> 2. Financeiro e Alocação</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
                                    <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Data Aquisição *</label><Input type="date" value={formAtivo.data_aquisicao} onChange={e => setFormAtivo({...formAtivo, data_aquisicao: e.target.value})} className="bg-white" /></div>
                                    <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Valor Aquisição (R$) *</label><Input type="number" step="0.01" value={formAtivo.valor_aquisicao} onChange={e => setFormAtivo({...formAtivo, valor_aquisicao: e.target.value})} className="bg-white" /></div>
                                    <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">% Depreciação (Ao Ano)</label><Input type="number" value={formAtivo.taxa_depreciacao_anual} onChange={e => setFormAtivo({...formAtivo, taxa_depreciacao_anual: e.target.value})} className="bg-white" /></div>
                                    <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Setor Alocado</label><Input value={formAtivo.setor_alocado} onChange={e => setFormAtivo({...formAtivo, setor_alocado: e.target.value})} placeholder="Ex: Recepção" className="bg-white" /></div>
                                    <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Responsável (Em posse)</label><Input value={formAtivo.responsavel} onChange={e => setFormAtivo({...formAtivo, responsavel: e.target.value})} placeholder="Nome do funcionário..." className="bg-white" /></div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Status Físico</label>
                                        <Select value={formAtivo.status} onValueChange={v => setFormAtivo({...formAtivo, status: v})}>
                                            <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                                            <SelectContent className="bg-white z-50"><SelectItem value="Ativo">Ativo (Em uso)</SelectItem><SelectItem value="Em Manutenção">Em Manutenção</SelectItem><SelectItem value="Descartado">Descartado/Sucata</SelectItem><SelectItem value="Vendido">Vendido</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-indigo-100">
                                <Button variant="outline" onClick={() => { setMostrarFormAtivo(false); setEditandoAtivoId(null); setFormAtivo(defaultFormAtivo); }}>Cancelar</Button>
                                <Button onClick={salvarAtivo} disabled={salvando} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md">
                                    {editandoAtivoId ? "Atualizar Ativo" : "Salvar Ativo"}
                                </Button>
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
                                    <th className="p-4 font-semibold border-b w-32 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {ativosFiltrados.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhum ativo cadastrado.</td></tr> : (
                                    ativosFiltrados.map(a => {
                                        const valorResidual = calcularValorResidual(a);
                                        const iconeCat = a.categoria === 'Veículos' ? <Car className="w-4 h-4"/> : a.categoria === 'TI / Informática' ? <Laptop className="w-4 h-4"/> : a.categoria === 'Móveis' ? <Sofa className="w-4 h-4"/> : <Building className="w-4 h-4"/>;

                                        return (
                                        <tr key={a.id} className="hover:bg-slate-50 transition-colors group">
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
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex justify-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="outline" size="icon" onClick={() => abrirDossie(a)} className="h-8 w-8 text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100" title="Ver Dossiê/Manutenção"><Activity className="w-4 h-4"/></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => abrirEditarAtivo(a)} className="h-8 w-8 text-slate-400 hover:text-indigo-600 transition-colors" title="Editar"><Edit className="w-4 h-4"/></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => deletarAtivo(a.id)} className="h-8 w-8 text-slate-300 hover:text-red-500 transition-colors" title="Excluir"><Trash2 className="w-4 h-4"/></Button>
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
        )}

        {/* ========================================================================= */}
        {/* ABA: SERVIÇOS E CONTRATOS (Não mexemos, mantém igual) */}
        {/* ========================================================================= */}
        {!ativoSelecionado && abaAtiva === "servicos" && (
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
                            <Button onClick={abrirNovoServico} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"><Plus className="w-4 h-4"/> Registrar Serviço</Button>
                        </div>
                    </div>

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

                    {mostrarFormServico && (
                        <div className="p-6 bg-white border-b border-slate-100 space-y-6">
                            <h3 className="font-bold text-emerald-800 flex items-center gap-2 border-b border-emerald-100 pb-2">
                                {editandoServicoId ? <><Edit className="w-5 h-5"/> Editar Contrato de Serviço</> : <><Plus className="w-5 h-5"/> Novo Contrato de Serviço</>}
                            </h3>
                            <div className="space-y-4 relative z-20">
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Wifi className="w-4 h-4 text-emerald-500"/> 1. Identificação do Serviço</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Categoria *</label>
                                        <Select value={formServico.categoria} onValueChange={v => setFormServico({...formServico, categoria: v})}>
                                            <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                                            <SelectContent className="bg-white z-50"><SelectItem value="Internet/Telefonia">Internet/Telefonia</SelectItem><SelectItem value="Software/Hospedagem">Software/Hospedagem</SelectItem><SelectItem value="Certificado Digital/Registro">Certificados e Registros</SelectItem><SelectItem value="Segurança/Alarmes">Segurança/Alarmes</SelectItem><SelectItem value="Elétrica/Hidráulica">Manutenção Predial</SelectItem><SelectItem value="Outros">Outros</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 lg:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Serviço Contratado *</label><Input value={formServico.descricao} onChange={e => setFormServico({...formServico, descricao: e.target.value})} placeholder="Ex: Link Dedicado 1Gbps, Hospedagem Locaweb..." className="bg-white" /></div>
                                    <div className="space-y-2 lg:col-span-3"><label className="text-xs font-bold text-slate-500 uppercase">Fornecedor</label><Input list="lista-forns-pat" value={formServico.fornecedor_nome} onChange={e => setFormServico({...formServico, fornecedor_nome: e.target.value})} className="bg-white" placeholder="Opcional" /><datalist id="lista-forns-pat">{fornecedores.map(f => <option key={f.id} value={f.nome_fantasia}/>)}</datalist></div>
                                </div>
                            </div>
                            <div className="space-y-4 relative z-10">
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Landmark className="w-4 h-4 text-emerald-500"/> 2. Condições de Pagamento e Vencimento</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Periodicidade *</label>
                                        <Select value={formServico.periodicidade} onValueChange={v => setFormServico({...formServico, periodicidade: v})}>
                                            <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                                            <SelectContent className="bg-white z-50"><SelectItem value="Mensal">Mensal</SelectItem><SelectItem value="Anual">Anual</SelectItem><SelectItem value="Sob Demanda">Sob Demanda (Avulso)</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Custo (R$)</label><Input type="number" step="0.01" value={formServico.valor_custo} onChange={e => setFormServico({...formServico, valor_custo: e.target.value})} className="bg-white" /></div>
                                    <div className="space-y-2"><label className="text-xs font-bold text-emerald-600 uppercase">Dia Vencimento (Mês)</label><Input type="number" min="1" max="31" value={formServico.dia_vencimento} onChange={e => setFormServico({...formServico, dia_vencimento: e.target.value})} className="bg-white border-emerald-300 font-bold" placeholder="Ex: 10" /></div>
                                    <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Data Fim Contrato</label><Input type="date" value={formServico.data_vencimento} onChange={e => setFormServico({...formServico, data_vencimento: e.target.value})} className="bg-white" /></div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-emerald-100">
                                <Button variant="outline" onClick={() => { setMostrarFormServico(false); setEditandoServicoId(null); setFormServico(defaultFormServico); }}>Cancelar</Button>
                                <Button onClick={salvarServico} disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md">
                                    {editandoServicoId ? "Atualizar Serviço" : "Salvar Serviço"}
                                </Button>
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
                                    <th className="p-4 font-semibold border-b w-24 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {servicosFiltrados.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhum serviço registrado.</td></tr> : (
                                    servicosFiltrados.map(s => {
                                        const iconeCat = s.categoria === 'Internet/Telefonia' ? <Wifi className="w-4 h-4"/> : s.categoria === 'Segurança/Alarmes' ? <Shield className="w-4 h-4"/> : s.categoria === 'Certificado Digital/Registro' ? <FileBadge className="w-4 h-4"/> : s.categoria === 'Software/Hospedagem' ? <Server className="w-4 h-4"/> : <Wrench className="w-4 h-4"/>;
                                        
                                        return (
                                        <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
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
                                                <div className="flex justify-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => abrirEditarServico(s)} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Editar"><Edit className="w-4 h-4"/></button>
                                                    <button onClick={() => deletarServico(s.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Excluir"><Trash2 className="w-4 h-4"/></button>
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
        )}

      </div>
    </AppLayout>
  );
}