import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Plus, Search, CheckCircle2, AlertCircle, ArrowLeft, QrCode, ShieldCheck, MapPin, User, Settings, Calculator, Activity, FileText, History, Repeat, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function GestaoEquipamentos() {
  const [abaAtiva, setAbaAtiva] = useState<"lista" | "novo" | "dossie">("lista");

  // ==========================================
  // ESTADOS: DADOS BASE
  // ==========================================
  const [produtosBD, setProdutosBD] = useState<any[]>([]);
  const [clientesBD, setClientesBD] = useState<any[]>([]);
  const [contratosBD, setContratosBD] = useState<any[]>([]);
  const [fornecedoresBD, setFornecedoresBD] = useState<any[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");

  // ==========================================
  // ESTADOS: DOSSIÊ DO EQUIPAMENTO
  // ==========================================
  const [equipSelecionado, setEquipSelecionado] = useState<any | null>(null);
  const [abaDossie, setAbaDossie] = useState<"geral" | "movimentacao" | "os" | "contadores" | "financeiro">("geral");
  const [historicoMov, setHistoricoMov] = useState<any[]>([]);
  const [historicoOS, setHistoricoOS] = useState<any[]>([]);
  const [historicoPecas, setHistoricoPecas] = useState<any[]>([]);
  const [leituras, setLeituras] = useState<any[]>([]);
  
  // ==========================================
  // ESTADOS: FORMULÁRIO NOVO EQUIPAMENTO
  // ==========================================
  const [form, setForm] = useState({
    produto_id: "", proprietario: "TC Copiadoras", cliente_id: "nenhum", contrato_id: "nenhum", data_instalacao: "",
    numero_serie: "", patrimonio: "", status: "Ativo", endereco_instalacao: "", contato_responsavel: "", tecnico_responsavel: "",
    vendido_por_tc: "Não", vendedor: "", garantia_fornecedor_id: "nenhum", garantia_nf_compra: "", garantia_inicio: "", garantia_fim: ""
  });

  // Especificações Dinâmicas (que vem do produto ou são criadas na hora)
  const [specs, setSpecs] = useState({ formato: "A4", ppm: "", ano: "", fabricante: "", familia: "" });
  const [contadoresSelecionados, setContadoresSelecionados] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect (() => {
    const rascunho = sessionStorage.getItem("equipamentos_rascunho");
    if (rascunho) {
      try {
        const draft = JSON.parse(rascunho);
        if (draft.equipSelecionado !== undefined) setEquipSelecionado(draft.equipSelecionado);
        if (draft.abaDossie !== undefined) setAbaDossie(draft.abaDossie);
        if (draft.historicoMov !== undefined) setHistoricoMov(draft.historicoMov);
        if (draft.historicoOS !== undefined) setHistoricoOS(draft.historicoOS);
        if (draft.historicoPecas !== undefined) setHistoricoPecas(draft.historicoPecas);
        if (draft.leituras !== undefined) setLeituras(draft.leituras);
      } catch(e) {}
    }
  }, []);

  useEffect (() => {
    if (equipSelecionado || abaDossie || historicoMov) {
        const draft = {
            equipSelecionado, abaDossie, historicoMov, historicoOS, historicoPecas. leituras
        };
        sessionStorage.setItem("equipamentos_rascunho", JSON.stringify(draft))
    }
  }, [equipSelecionado, abaDossie, historicoMov, historicoOS, historicoPecas, leituras]);

  const limparFormulario = () => {
    sessionStorage.removeItem("equipamentos_rascunho");
    setEquipSelecionado(""); setAbaDossie(""); setHistoricoMov(""); setHistoricoOS(""); setHistoricoPecas(""); setLeituras("");
  };

  useEffect(() => { fetchDadosBase(); fetchEquipamentos(); }, []);

  const fetchDadosBase = async () => {
    const [prodRes, cliRes, contRes, fornRes] = await Promise.all([
      supabase.from('log_produtos').select('*').order('nome'),
      supabase.from('log_clientes').select('id, razao_social, nome_fantasia'),
      supabase.from('crm_contratos').select('id, titulo, cliente_id').eq('status', 'Ativo'),
      supabase.from('log_fornecedores').select('id, nome_fantasia')
    ]);
    if (prodRes.data) setProdutosBD(prodRes.data);
    if (cliRes.data) setClientesBD(cliRes.data);
    if (contRes.data) setContratosBD(contRes.data);
    if (fornRes.data) setFornecedoresBD(fornRes.data);
  };

  const fetchEquipamentos = async () => {
    const { data } = await supabase.from('srv_equipamentos').select(`
      *, log_produtos(nome, sku, custo_base), log_clientes(nome_fantasia), crm_contratos(titulo)
    `).order('sequencial', { ascending: false });
    if (data) setEquipamentos(data);
  };

  const handleProdutoChange = (prodId: string) => {
    setForm({ ...form, produto_id: prodId });
    const prod = produtosBD.find(p => p.id === prodId);
    if (prod) {
        let parsedSpecs = { formato: "A4", ppm: "", ano: "" };
        try { if (prod.especificacoes) parsedSpecs = typeof prod.especificacoes === 'string' ? JSON.parse(prod.especificacoes) : prod.especificacoes; } catch(e){}
        setSpecs({ formato: parsedSpecs.formato || "A4", ppm: parsedSpecs.ppm || "", ano: parsedSpecs.ano || "", fabricante: prod.fabricante || "", familia: prod.familia || "" });
    }
  };

  const toggleContador = (tipo: string) => {
    setContadoresSelecionados(prev => prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]);
  };

  const salvarEquipamento = async () => {
    if (!form.produto_id || !form.numero_serie) return alert("Produto e Número de Série são obrigatórios.");
    setSalvando(true);

    try {
      // 1. Atualiza as especificações no Cadastro do Produto na Logística (se mudaram)
      const produtoSpecs = { formato: specs.formato, ppm: specs.ppm, ano: specs.ano };
      await supabase.from('log_produtos').update({ is_equipamento: true, fabricante: specs.fabricante, familia: specs.familia, especificacoes: produtoSpecs }).eq('id', form.produto_id);

      // 2. Salva o Equipamento
      const payload = {
          ...form,
          cliente_id: form.cliente_id === "nenhum" ? null : form.cliente_id,
          contrato_id: form.contrato_id === "nenhum" ? null : form.contrato_id,
          garantia_fornecedor_id: form.garantia_fornecedor_id === "nenhum" ? null : form.garantia_fornecedor_id,
          data_instalacao: form.data_instalacao || null,
          garantia_inicio: form.garantia_inicio || null,
          garantia_fim: form.garantia_fim || null,
          vendido_por_tc: form.vendido_por_tc === "Sim",
          tipos_contadores: contadoresSelecionados
      };

      const { data: newEq, error } = await supabase.from('srv_equipamentos').insert([payload]).select().single();
      if (error) throw error;

      // 3. Se foi instalado em cliente, gera o histórico inicial de Movimentação
      if (payload.cliente_id) {
          await supabase.from('srv_equipamentos_movimentacao').insert([{
              equipamento_id: newEq.id, tipo: 'Instalação', cliente_id: payload.cliente_id, 
              contrato_id: payload.contrato_id, data_movimentacao: payload.data_instalacao || new Date().toISOString().split('T')[0],
              observacoes: 'Instalação inicial (Cadastro)'
          }]);
      }

      alert("Equipamento cadastrado com sucesso!");
      setAbaAtiva("lista"); fetchEquipamentos();
    } catch (e: any) {
      if (e.code === '23505') alert("Este Número de Série já está cadastrado no sistema.");
      else alert("Erro: " + e.message);
    } finally { setSalvando(false); }
  };

  const abrirDossie = async (eq: any) => {
    setEquipSelecionado(eq); setAbaDossie("geral"); setAbaAtiva("dossie");
    
    const [movRes, osRes, leitRes] = await Promise.all([
        supabase.from('srv_equipamentos_movimentacao').select('*, log_clientes(nome_fantasia), crm_contratos(titulo)').eq('equipamento_id', eq.id).order('data_movimentacao', { ascending: false }),
        supabase.from('srv_ordens_servico').select('*').eq('equipamento_id', eq.id).order('data_abertura', { ascending: false }),
        supabase.from('srv_equipamentos_leituras').select('*').eq('equipamento_id', eq.id).order('data_leitura', { ascending: false })
    ]);
    
    if (movRes.data) setHistoricoMov(movRes.data);
    if (osRes.data) {
        setHistoricoOS(osRes.data);
        // Puxar as peças trocadas vinculadas a essas OS
        if (osRes.data.length > 0) {
            const osIds = osRes.data.map(os => os.id);
            const { data: pecasRes } = await supabase.from('srv_os_pecas').select('*, srv_ordens_servico(numero_os, data_abertura)').in('os_id', osIds);
            if (pecasRes) setHistoricoPecas(pecasRes);
        } else { setHistoricoPecas([]); }
    }
    if (leitRes.data) setLeituras(leitRes.data);
  };

  const imprimirQrCode = () => {
    const qrWindow = window.open('', '_blank');
    qrWindow?.document.write(`
      <html><head><title>Imprimir QR Code</title><style>body{text-align:center;font-family:sans-serif;margin-top:50px;}</style></head><body>
      <h2>EQUIPAMENTO TC COPIADORAS</h2>
      <h3>S/N: ${equipSelecionado.numero_serie}</h3>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${window.location.origin}/equipamento/${equipSelecionado.id}" />
      <p>Patrimônio: ${equipSelecionado.patrimonio || 'N/A'}</p>
      <script>setTimeout(() => window.print(), 500);</script>
      </body></html>
    `);
  };

  const eqFiltrados = equipamentos.filter(e => 
    e.numero_serie.toLowerCase().includes(busca.toLowerCase()) || 
    (e.log_produtos?.nome?.toLowerCase() || "").includes(busca.toLowerCase()) ||
    (e.log_clientes?.nome_fantasia?.toLowerCase() || "").includes(busca.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto mb-12">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Printer className="w-6 h-6 text-blue-600" /> Gestão de Equipamentos</h1>
            <p className="text-slate-500">Prontuário completo, contadores, depreciação e movimentação do parque.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => { setAbaAtiva("lista"); setEquipSelecionado(null); }} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "lista" ? "bg-white shadow-sm text-blue-700" : "text-slate-600"}`}>Parque Instalado</button>
            <button onClick={() => setAbaAtiva("novo")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "novo" ? "bg-white shadow-sm text-emerald-700" : "text-slate-600"}`}><Plus className="w-4 h-4"/> Cadastrar Máquina</button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA: PARQUE INSTALADO (LISTAGEM) */}
        {/* ========================================================================= */}
        {abaAtiva === "lista" && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4 bg-slate-50">
              <div className="relative w-full max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por S/N, Modelo ou Cliente..." className="pl-9 bg-white" /></div>
            </div>
            <div className="overflow-x-auto min-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b text-center w-20">Seq.</th>
                    <th className="p-4 font-semibold border-b">Modelo / S.N.</th>
                    <th className="p-4 font-semibold border-b">Alocação (Cliente)</th>
                    <th className="p-4 font-semibold border-b text-center">Propriedade</th>
                    <th className="p-4 font-semibold border-b text-center">Status</th>
                    <th className="p-4 font-semibold border-b text-center w-28">Prontuário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {eqFiltrados.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhum equipamento no parque.</td></tr> : (
                    eqFiltrados.map(eq => (
                      <tr key={eq.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => abrirDossie(eq)}>
                        <td className="p-4 text-center font-mono font-bold text-slate-400">#{String(eq.sequencial).padStart(4,'0')}</td>
                        <td className="p-4">
                            <p className="font-bold text-slate-800 text-sm">{eq.log_produtos?.nome || 'Modelo Desconhecido'}</p>
                            <p className="text-[10px] text-blue-600 font-bold font-mono mt-0.5 flex items-center gap-1"><QrCode className="w-3 h-3"/> SN: {eq.numero_serie}</p>
                        </td>
                        <td className="p-4">
                            <p className="text-sm font-semibold text-slate-700">{eq.log_clientes?.nome_fantasia || <span className="text-slate-400 italic">Em Estoque / TC</span>}</p>
                            {eq.crm_contratos?.titulo && <p className="text-[10px] text-slate-500 bg-slate-100 border px-1.5 py-0.5 rounded inline-block mt-1 truncate max-w-[200px]">{eq.crm_contratos.titulo}</p>}
                        </td>
                        <td className="p-4 text-center"><span className={`text-[10px] font-bold px-2 py-1 rounded border ${eq.proprietario === 'TC Copiadoras' ? 'border-indigo-200 text-indigo-700 bg-indigo-50' : 'border-amber-200 text-amber-700 bg-amber-50'}`}>{eq.proprietario}</span></td>
                        <td className="p-4 text-center"><span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full shadow-sm border border-white ${eq.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : eq.status === 'Inativo' ? 'bg-slate-100 text-slate-700' : eq.status === 'Em Manutenção' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{eq.status}</span></td>
                        <td className="p-4 text-center"><Button variant="outline" size="sm" className="text-blue-600 border-blue-200 group-hover:bg-blue-50 w-full gap-2"><Activity className="w-4 h-4"/> Abrir</Button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: NOVO EQUIPAMENTO (FORMULÁRIO) */}
        {/* ========================================================================= */}
        {abaAtiva === "novo" && (
          <div className="bg-white rounded-xl border shadow-sm p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="border-b pb-4 mb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Printer className="w-5 h-5 text-blue-600"/> Cadastrar Novo Equipamento</h2>
                <p className="text-sm text-slate-500 mt-1">Insira os dados técnicos, de propriedade e alocação inicial.</p>
            </div>

            {/* SEÇÃO 1: IDENTIFICAÇÃO E MODELO */}
            <div className="space-y-4">
                <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs flex items-center gap-2"><Settings className="w-4 h-4 text-slate-400"/> 1. Identificação e Modelo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-slate-600 uppercase">Modelo do Equipamento (Catálogo de Produtos) *</label>
                        <Select value={form.produto_id} onValueChange={handleProdutoChange}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione do Catálogo..."/></SelectTrigger>
                            <SelectContent className="max-h-60 overflow-y-auto">{produtosBD.map(p => <SelectItem key={p.id} value={p.id}>{p.sku} - {p.nome}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    {/* Infos puxadas/editadas do Produto */}
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Fabricante</label><Input value={specs.fabricante} onChange={e => setSpecs({...specs, fabricante: e.target.value})} className="bg-white" /></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Família / Categoria</label><Input value={specs.familia} onChange={e => setSpecs({...specs, familia: e.target.value})} className="bg-white" placeholder="Ex: Laser, Jato de Tinta..." /></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Tamanho Max. Papel</label><Select value={specs.formato} onValueChange={v => setSpecs({...specs, formato: v})}><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="A4">A4</SelectItem><SelectItem value="A3">A3</SelectItem><SelectItem value="A0">A0 (Plotter)</SelectItem><SelectItem value="SuperA3">Super A3</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">PPM (Pág. por Minuto)</label><Input type="number" value={specs.ppm} onChange={e => setSpecs({...specs, ppm: e.target.value})} className="bg-white" /></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-600 uppercase">Número de Série (S/N) *</label><Input value={form.numero_serie} onChange={e => setForm({...form, numero_serie: e.target.value})} className="bg-white font-mono text-blue-700 font-bold" /></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-600 uppercase">Tombo / Patrimônio</label><Input value={form.patrimonio} onChange={e => setForm({...form, patrimonio: e.target.value})} className="bg-white" placeholder="Opcional" /></div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase">Propriedade do Equipamento *</label>
                        <Select value={form.proprietario} onValueChange={v => setForm({...form, proprietario: v})}>
                            <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="TC Copiadoras">TC Copiadoras (Ativo Próprio)</SelectItem><SelectItem value="Cliente">Cliente (Terceiros)</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase">Status Inicial</label>
                        <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                            <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="Ativo">Ativo / Operacional</SelectItem><SelectItem value="Inativo">Inativo / Estoque</SelectItem><SelectItem value="Em Manutenção">Em Manutenção</SelectItem></SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* SEÇÃO 2: LOCALIZAÇÃO E CONTRATO */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-500"/> 2. Alocação Atual (Instalação)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase">Cliente Vinculado</label>
                        <Select value={form.cliente_id} onValueChange={v => setForm({...form, cliente_id: v})}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                            <SelectContent className="max-h-60 overflow-y-auto"><SelectItem value="nenhum">Nenhum (Fica na TC)</SelectItem>{clientesBD.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase">Contrato Vinculado</label>
                        <Select value={form.contrato_id} onValueChange={v => setForm({...form, contrato_id: v})} disabled={form.cliente_id === "nenhum"}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder={form.cliente_id === "nenhum" ? "Selecione o cliente primeiro" : "Selecione..."}/></SelectTrigger>
                            <SelectContent><SelectItem value="nenhum">Sem contrato (Avulso)</SelectItem>{contratosBD.filter(c => c.cliente_id === form.cliente_id).map(c => <SelectItem key={c.id} value={c.id}>{c.titulo}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-600 uppercase">Endereço Exato de Instalação (Andar, Setor)</label><Input value={form.endereco_instalacao} onChange={e => setForm({...form, endereco_instalacao: e.target.value})} className="bg-white" /></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1"><User className="w-3 h-3"/> Contato do Responsável no Cliente</label><Input value={form.contato_responsavel} onChange={e => setForm({...form, contato_responsavel: e.target.value})} className="bg-white" placeholder="Nome e Telefone..." /></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-600 uppercase">Técnico TC Responsável (Território)</label><Input value={form.tecnico_responsavel} onChange={e => setForm({...form, tecnico_responsavel: e.target.value})} className="bg-white" /></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-600 uppercase">Data de Instalação</label><Input type="date" value={form.data_instalacao} onChange={e => setForm({...form, data_instalacao: e.target.value})} className="bg-white" /></div>
                </div>
            </div>

            {/* SEÇÃO 3: CONTADORES E GARANTIA */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-amber-500"/> 3. Configurações e Garantia</h3>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 mb-4">
                    <label className="text-xs font-bold text-slate-600 uppercase">Tipos de Contadores de Uso Habilitados</label>
                    <div className="flex flex-wrap gap-2">
                        {['Monocromático A4', 'Colorido A4', 'Monocromático A3', 'Colorido A3', 'Scanner / Digitalização', 'Metros Lona'].map(tipo => (
                            <Button key={tipo} type="button" variant={contadoresSelecionados.includes(tipo) ? "default" : "outline"} size="sm" onClick={() => toggleContador(tipo)} className={contadoresSelecionados.includes(tipo) ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}>
                                {contadoresSelecionados.includes(tipo) && <CheckCircle2 className="w-4 h-4 mr-1"/>} {tipo}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase">Foi vendido pela TC?</label>
                        <Select value={form.vendido_por_tc} onValueChange={v => setForm({...form, vendido_por_tc: v})}><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select>
                    </div>
                    {form.vendido_por_tc === "Sim" && (
                        <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-600 uppercase">Vendedor</label><Input value={form.vendedor} onChange={e => setForm({...form, vendedor: e.target.value})} className="bg-white" /></div>
                    )}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase">Fornecedor da Garantia</label>
                        <Select value={form.garantia_fornecedor_id} onValueChange={v => setForm({...form, garantia_fornecedor_id: v})}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                            <SelectContent><SelectItem value="nenhum">Sem Garantia</SelectItem>{fornecedoresBD.map(f => <SelectItem key={f.id} value={f.id}>{f.nome_fantasia}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-600 uppercase">NF de Compra</label><Input value={form.garantia_nf_compra} onChange={e => setForm({...form, garantia_nf_compra: e.target.value})} className="bg-white" /></div>
                    <div className="space-y-2 md:col-span-1 flex gap-2">
                        <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Garantia Início</label><Input type="date" value={form.garantia_inicio} onChange={e => setForm({...form, garantia_inicio: e.target.value})} className="bg-white text-xs px-1" /></div>
                        <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Garantia Fim</label><Input type="date" value={form.garantia_fim} onChange={e => setForm({...form, garantia_fim: e.target.value})} className="bg-white text-xs px-1" /></div>
                    </div>
                </div>
            </div>

            <Button onClick={salvarEquipamento} disabled={salvando} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-md mt-6">
                Cadastrar Equipamento
            </Button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: PRONTUÁRIO DO EQUIPAMENTO (DOSSIÊ 360) */}
        {/* ========================================================================= */}
        {abaAtiva === "dossie" && equipSelecionado && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-200">
            
            {/* TOPO DO PRONTUÁRIO */}
            <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-blue-600">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Button variant="ghost" size="sm" onClick={() => setAbaAtiva("lista")} className="h-8 px-2 text-slate-400 hover:text-slate-700"><ArrowLeft className="w-4 h-4"/></Button>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{equipSelecionado.log_produtos?.nome || 'Equipamento'}</h2>
                        <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full shadow-sm border border-white ${equipSelecionado.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : equipSelecionado.status === 'Inativo' ? 'bg-slate-100 text-slate-700' : equipSelecionado.status === 'Em Manutenção' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{equipSelecionado.status}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 ml-12">
                        <span className="flex items-center gap-1 font-bold text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200"><QrCode className="w-4 h-4 text-blue-500"/> S/N: {equipSelecionado.numero_serie}</span>
                        {equipSelecionado.patrimonio && <span className="flex items-center gap-1 font-semibold text-slate-500"><AlertCircle className="w-4 h-4"/> Tombamento: {equipSelecionado.patrimonio}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={imprimirQrCode} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 gap-2"><QrCode className="w-4 h-4"/> Imprimir Etiqueta (QR)</Button>
                </div>
            </div>

            {/* NAVEGAÇÃO DAS ABAS DO DOSSIÊ */}
            <div className="flex bg-white rounded-lg p-1 border shadow-sm overflow-x-auto custom-scrollbar">
                <button onClick={() => setAbaDossie("geral")} className={`flex-1 min-w-[120px] py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-md transition-colors ${abaDossie === "geral" ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:bg-slate-50"}`}><FileText className="w-4 h-4"/> Ficha & Garantia</button>
                <button onClick={() => setAbaDossie("movimentacao")} className={`flex-1 min-w-[120px] py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-md transition-colors ${abaDossie === "movimentacao" ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"}`}><MapPin className="w-4 h-4"/> Local & Contrato</button>
                <button onClick={() => setAbaDossie("os")} className={`flex-1 min-w-[120px] py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-md transition-colors ${abaDossie === "os" ? "bg-amber-50 text-amber-700" : "text-slate-500 hover:bg-slate-50"}`}><Activity className="w-4 h-4"/> OS & Peças</button>
                <button onClick={() => setAbaDossie("contadores")} className={`flex-1 min-w-[120px] py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-md transition-colors ${abaDossie === "contadores" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}><Repeat className="w-4 h-4"/> Contadores</button>
                <button onClick={() => setAbaDossie("financeiro")} className={`flex-1 min-w-[120px] py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-md transition-colors ${abaDossie === "financeiro" ? "bg-rose-50 text-rose-700" : "text-slate-500 hover:bg-slate-50"}`}><Calculator className="w-4 h-4"/> Depreciação</button>
            </div>

            {/* CONTEÚDO DAS ABAS DO DOSSIÊ */}
            <div className="bg-white rounded-xl border shadow-sm p-6 min-h-[400px]">
                
                {abaDossie === "geral" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2"><Settings className="w-4 h-4 text-slate-400"/> Especificações Técnicas</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded border"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fabricante</p><p className="font-bold text-slate-800">{equipSelecionado.log_produtos?.fabricante || 'N/A'}</p></div>
                                <div className="bg-slate-50 p-3 rounded border"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Família</p><p className="font-bold text-slate-800">{equipSelecionado.log_produtos?.familia || 'N/A'}</p></div>
                                <div className="bg-slate-50 p-3 rounded border"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Formato Máximo</p><p className="font-bold text-slate-800">{typeof equipSelecionado.log_produtos?.especificacoes === 'object' ? equipSelecionado.log_produtos?.especificacoes?.formato : 'A4'}</p></div>
                                <div className="bg-slate-50 p-3 rounded border"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Velocidade (PPM)</p><p className="font-bold text-slate-800">{typeof equipSelecionado.log_produtos?.especificacoes === 'object' ? equipSelecionado.log_produtos?.especificacoes?.ppm : 'N/A'}</p></div>
                            </div>
                            
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2 mt-8"><User className="w-4 h-4 text-slate-400"/> Origem e Venda</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded border"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Propriedade</p><p className={`font-bold ${equipSelecionado.proprietario === 'TC Copiadoras' ? 'text-indigo-700' : 'text-amber-700'}`}>{equipSelecionado.proprietario}</p></div>
                                <div className="bg-slate-50 p-3 rounded border"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vendido pela TC?</p><p className="font-bold text-slate-800">{equipSelecionado.vendido_por_tc ? `Sim (${equipSelecionado.vendedor})` : 'Não'}</p></div>
                            </div>
                        </div>
                        
                        <div>
                            <div className={`p-6 rounded-xl border ${equipSelecionado.garantia_fim && new Date(equipSelecionado.garantia_fim) > new Date() ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                                <h3 className={`font-bold flex items-center gap-2 mb-4 ${equipSelecionado.garantia_fim && new Date(equipSelecionado.garantia_fim) > new Date() ? 'text-emerald-800' : 'text-rose-800'}`}>
                                    {equipSelecionado.garantia_fim && new Date(equipSelecionado.garantia_fim) > new Date() ? <ShieldCheck className="w-5 h-5"/> : <ShieldAlert className="w-5 h-5"/>} 
                                    Informações de Garantia
                                </h3>
                                <div className="space-y-4">
                                    <div><p className="text-[10px] font-bold uppercase opacity-60">Status Atual</p><p className="text-xl font-black">{equipSelecionado.garantia_fim ? (new Date(equipSelecionado.garantia_fim) > new Date() ? 'DENTRO DA GARANTIA' : 'GARANTIA EXPIRADA') : 'SEM GARANTIA CADASTRADA'}</p></div>
                                    {equipSelecionado.garantia_nf_compra && (
                                        <>
                                            <div className="flex justify-between border-t border-black/10 pt-2"><span className="text-xs font-bold uppercase opacity-60">NF Compra</span><span className="font-mono font-bold">{equipSelecionado.garantia_nf_compra}</span></div>
                                            <div className="flex justify-between border-t border-black/10 pt-2"><span className="text-xs font-bold uppercase opacity-60">Vigência</span><span className="font-bold">{new Date(equipSelecionado.garantia_inicio).toLocaleDateString('pt-BR')} até {new Date(equipSelecionado.garantia_fim).toLocaleDateString('pt-BR')}</span></div>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            <div className="mt-8 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">QR Code de Rastreio (Etiqueta)</p>
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${window.location.origin}/equipamento/${equipSelecionado.id}`} alt="QR Code" className="mx-auto border-4 border-white shadow-md rounded-lg" />
                            </div>
                        </div>
                    </div>
                )}

                {abaDossie === "movimentacao" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="space-y-6">
                            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl">
                                <h3 className="font-bold text-emerald-900 flex items-center gap-2 mb-4"><MapPin className="w-5 h-5"/> Alocação Atual</h3>
                                <div className="space-y-3">
                                    <div><p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Cliente Local</p><p className="font-bold text-emerald-950">{equipSelecionado.log_clientes?.nome_fantasia || 'Estoque TC'}</p></div>
                                    <div><p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Contrato Vinculado</p><p className="font-bold text-emerald-950">{equipSelecionado.crm_contratos?.titulo || 'Avulso'}</p></div>
                                    <div><p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Endereço Exato</p><p className="font-medium text-emerald-900">{equipSelecionado.endereco_instalacao || 'Não informado'}</p></div>
                                    <div className="border-t border-emerald-200 pt-3 mt-3">
                                        <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Contatos</p>
                                        <p className="text-sm font-medium text-emerald-900 mt-1">Responsável: {equipSelecionado.contato_responsavel || 'N/A'}</p>
                                        <p className="text-sm font-medium text-emerald-900">Técnico N1: {equipSelecionado.tecnico_responsavel || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-2">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><History className="w-5 h-5 text-slate-400"/> Histórico de Movimentação do Ativo</h3>
                            <div className="relative before:absolute before:inset-0 before:ml-4 before:h-full before:w-0.5 before:bg-slate-100 space-y-6">
                                {historicoMov.length === 0 ? <p className="ml-10 text-sm text-slate-400 italic">Nenhuma movimentação registrada.</p> : historicoMov.map(mov => (
                                    <div key={mov.id} className="relative flex items-center justify-between md:justify-normal">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full border-4 border-white shadow shrink-0 z-10 ${mov.tipo === 'Instalação' ? 'bg-emerald-500' : mov.tipo === 'Retirada' ? 'bg-red-500' : 'bg-amber-500'}`}><MapPin className="w-3 h-3 text-white"/></div>
                                        <div className="w-[calc(100%-3rem)] md:w-full ml-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-slate-200">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${mov.tipo === 'Instalação' ? 'text-emerald-600' : mov.tipo === 'Retirada' ? 'text-red-600' : 'text-amber-600'}`}>{mov.tipo}</span>
                                                <span className="text-[10px] font-semibold text-slate-400">{new Date(mov.data_movimentacao).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</span>
                                            </div>
                                            <p className="font-bold text-slate-800 text-sm">{mov.log_clientes?.nome_fantasia || 'Estoque TC'}</p>
                                            {mov.crm_contratos?.titulo && <p className="text-xs text-slate-500 mt-1 bg-slate-50 inline-block px-1.5 rounded">{mov.crm_contratos.titulo}</p>}
                                            {mov.observacoes && <p className="text-xs text-slate-600 mt-2 italic border-l-2 border-slate-200 pl-2">"{mov.observacoes}"</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {abaDossie === "os" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Activity className="w-5 h-5 text-amber-500"/> Ordens de Serviço (OS)</h3>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {historicoOS.length === 0 ? <p className="text-sm text-slate-400 italic">Nenhuma OS registrada para esta máquina.</p> : historicoOS.map(os => (
                                    <div key={os.id} className="p-4 border border-slate-200 rounded-lg hover:border-amber-300 bg-white shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="font-black text-amber-700">OS-{String(os.numero_os).padStart(4,'0')}</p>
                                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${os.status === 'Concluída' || os.status === 'Faturada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{os.status}</span>
                                        </div>
                                        <p className="text-xs text-slate-700 mb-2 line-clamp-2"><strong>Defeito:</strong> {os.defeito_relatado}</p>
                                        <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-2">
                                            <span className="text-[10px] text-slate-500 font-medium">{new Date(os.data_abertura).toLocaleDateString('pt-BR')}</span>
                                            <p className="text-xs font-bold text-slate-800">Custo: R$ {Number(os.valor_total).toFixed(2).replace('.',',')}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Settings className="w-5 h-5 text-blue-500"/> Peças Trocadas (Histórico Físico)</h3>
                            <table className="w-full text-left text-sm border-collapse">
                                <thead><tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider"><th className="p-3">Data / OS</th><th className="p-3">Peça Aplicada</th><th className="p-3 text-center">Qtd</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {historicoPecas.length === 0 ? <tr><td colSpan={3} className="p-8 text-center text-slate-400">Nenhuma peça trocada.</td></tr> : historicoPecas.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50">
                                            <td className="p-3">
                                                <p className="text-xs font-bold text-slate-700">OS-{String(p.srv_ordens_servico?.numero_os).padStart(4,'0')}</p>
                                                <p className="text-[10px] text-slate-400">{new Date(p.srv_ordens_servico?.data_abertura).toLocaleDateString('pt-BR')}</p>
                                            </td>
                                            <td className="p-3 font-semibold text-slate-800 text-xs">{p.produto_nome}</td>
                                            <td className="p-3 text-center font-bold text-blue-600">{p.quantidade}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {abaDossie === "contadores" && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Repeat className="w-5 h-5 text-indigo-600"/> Histórico de Contadores (Leituras)</h3>
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"><Plus className="w-4 h-4"/> Inserir Leitura Manual</Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-6">
                            {equipSelecionado.tipos_contadores?.map((c: string) => <span key={c} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">{c}</span>)}
                        </div>
                        <table className="w-full text-left text-sm border-collapse">
                            <thead><tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider"><th className="p-3">Data Leitura</th><th className="p-3">Tipo Contador</th><th className="p-3 text-right">Valor Registrado</th><th className="p-3 text-center">Origem</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {leituras.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhuma leitura registrada.</td></tr> : leituras.map(l => (
                                    <tr key={l.id} className="hover:bg-slate-50">
                                        <td className="p-3 font-medium text-slate-700">{new Date(l.data_leitura).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                        <td className="p-3 font-bold text-slate-800">{l.tipo_contador}</td>
                                        <td className="p-3 text-right font-black text-indigo-700 text-lg">{Number(l.valor_leitura).toLocaleString('pt-BR')}</td>
                                        <td className="p-3 text-center"><span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 border">{l.origem}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {abaDossie === "financeiro" && (
                    <div className="max-w-2xl mx-auto text-center py-12">
                        <Calculator className="w-16 h-16 text-slate-200 mx-auto mb-4"/>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Simulador de Depreciação</h3>
                        <p className="text-slate-500 text-sm mb-8">Baseado no custo de aquisição do catálogo logístico (R$ {Number(equipSelecionado.log_produtos?.custo_base || 0).toFixed(2).replace('.',',')}) e depreciação linear padrão de 5 anos (20% a.a).</p>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase">Custo Base Aquisição</p><p className="text-xl font-black text-slate-800 mt-1">R$ {Number(equipSelecionado.log_produtos?.custo_base || 0).toFixed(2).replace('.',',')}</p></div>
                            <div className="bg-rose-50 p-4 rounded-xl border border-rose-200"><p className="text-[10px] font-bold text-rose-500 uppercase">Depreciação Mensal</p><p className="text-xl font-black text-rose-700 mt-1">R$ {((equipSelecionado.log_produtos?.custo_base || 0) * 0.2 / 12).toFixed(2).replace('.',',')}</p></div>
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200"><p className="text-[10px] font-bold text-indigo-500 uppercase">Valor Residual Atual</p><p className="text-xl font-black text-indigo-700 mt-1">
                                R$ {Math.max(0, (equipSelecionado.log_produtos?.custo_base || 0) - (((equipSelecionado.log_produtos?.custo_base || 0) * 0.2 / 365) * Math.floor((new Date().getTime() - new Date(equipSelecionado.data_instalacao || equipSelecionado.data_cadastro).getTime()) / (1000 * 60 * 60 * 24)))).toFixed(2).replace('.',',')}
                            </p></div>
                        </div>
                    </div>
                )}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}