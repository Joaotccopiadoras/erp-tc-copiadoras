import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Recycle, Wrench, Factory, Plus, Clock, Search, Trash2, ArrowRight, PlayCircle, CheckCircle2, Box, Save, Settings2, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Recondicionamento() {
  const [abaAtiva, setAbaAtiva] = useState<"fichas" | "vazios" | "producao">("producao");

  // ==========================================
  // ESTADOS GERAIS DO BANCO
  // ==========================================
  const [produtosBD, setProdutosBD] = useState<any[]>([]);
  const [clientesBD, setClientesBD] = useState<any[]>([]);
  const [fichas, setFichas] = useState<any[]>([]);
  const [vazios, setVazios] = useState<any[]>([]);
  const [ordens, setOrdens] = useState<any[]>([]);

  // ==========================================
  // ESTADOS: FICHAS TÉCNICAS
  // ==========================================
  const [mostrarFormFicha, setMostrarFormFicha] = useState(false);
  const [fichaProdFinalId, setFichaProdFinalId] = useState("");
  const [tempoEstimado, setTempoEstimado] = useState("");
  const [custoMaoObraHora, setCustoMaoObraHora] = useState("");
  const [pctCustoFixo, setPctCustoFixo] = useState("");
  const [insumosFicha, setInsumosFicha] = useState<{ id: string; insumo_id: string; nome: string; custo_base: number; quantidade: number }[]>([]);
  const [buscaInsumo, setBuscaInsumo] = useState("");

  // ==========================================
  // ESTADOS: LOGÍSTICA REVERSA
  // ==========================================
  const [mostrarFormVazio, setMostrarFormVazio] = useState(false);
  const [vazioProdId, setVazioProdId] = useState("");
  const [vazioClienteId, setVazioClienteId] = useState("");
  const [vazioQtd, setVazioQtd] = useState("1");
  const [vazioPartes, setVazioPartes] = useState("");

  // ==========================================
  // ESTADOS: CHÃO DE FÁBRICA (PRODUÇÃO)
  // ==========================================
  const [mostrarFormOS, setMostrarFormOS] = useState(false);
  const [osFichaId, setOsFichaId] = useState("");
  const [osTecnico, setOsTecnico] = useState("");
  const [osQtd, setOsQtd] = useState("1");
  const [processando, setProcessando] = useState(false);

  useEffect(() => { fetchDados(); }, [abaAtiva]);

  const fetchDados = async () => {
    const [pRes, cRes, fRes, vRes, oRes] = await Promise.all([
      supabase.from('log_produtos').select('*').order('nome'),
      supabase.from('log_clientes').select('id, nome_fantasia'),
      supabase.from('srv_recond_fichas').select('*, log_produtos(nome, sku)'),
      supabase.from('srv_recond_vazios').select('*, log_produtos(nome), log_clientes(nome_fantasia)').order('data_entrada', {ascending: false}),
      supabase.from('srv_recond_os').select('*, srv_recond_fichas(log_produtos(nome))').order('numero_os', {ascending: false})
    ]);
    if (pRes.data) setProdutosBD(pRes.data);
    if (cRes.data) setClientesBD(cRes.data);
    if (fRes.data) setFichas(fRes.data);
    if (vRes.data) setVazios(vRes.data);
    if (oRes.data) setOrdens(oRes.data);
  };

  // --- LÓGICA DE FICHAS TÉCNICAS ---
  const addInsumoFicha = () => {
    if (!buscaInsumo) return;
    const prod = produtosBD.find(p => p.nome === buscaInsumo || `${p.sku} - ${p.nome}` === buscaInsumo);
    if (prod) {
        setInsumosFicha([...insumosFicha, { id: crypto.randomUUID(), insumo_id: prod.id, nome: prod.nome, custo_base: prod.custo_base || 0, quantidade: 1 }]);
        setBuscaInsumo("");
    }
  };

  const calcularCustoFicha = () => {
      const custoInsumos = insumosFicha.reduce((a, b) => a + (b.quantidade * b.custo_base), 0);
      const custoMO = ((parseFloat(custoMaoObraHora) || 0) / 60) * (parseInt(tempoEstimado) || 0);
      const parcial = custoInsumos + custoMO;
      const total = parcial + (parcial * ((parseFloat(pctCustoFixo) || 0) / 100));
      return { custoInsumos, custoMO, total };
  };

  const salvarFicha = async () => {
      if (!fichaProdFinalId || insumosFicha.length === 0) return alert("Selecione o Produto Final e adicione pelo menos um insumo.");
      setProcessando(true);
      try {
          const { data: novaFicha, error: errFicha } = await supabase.from('srv_recond_fichas').insert([{
              produto_final_id: fichaProdFinalId, tempo_estimado_min: parseInt(tempoEstimado) || 0,
              custo_mao_obra_hora: parseFloat(custoMaoObraHora) || 0, percentual_custo_fixo: parseFloat(pctCustoFixo) || 0
          }]).select().single();
          
          if (errFicha) throw errFicha;

          const insumosPayload = insumosFicha.map(i => ({ ficha_id: novaFicha.id, insumo_id: i.insumo_id, quantidade: i.quantidade }));
          await supabase.from('srv_recond_insumos').insert(insumosPayload);

          alert("Ficha Técnica salva!");
          setMostrarFormFicha(false); setInsumosFicha([]); fetchDados();
      } catch (e: any) { alert(e.code === '23505' ? 'Já existe uma Ficha para este produto.' : e.message); } finally { setProcessando(false); }
  };

  // --- LÓGICA DE LOGÍSTICA REVERSA ---
  const salvarVazio = async () => {
      if (!vazioProdId) return alert("Informe o produto devolvido.");
      setProcessando(true);
      try {
          await supabase.from('srv_recond_vazios').insert([{
              produto_original_id: vazioProdId, cliente_origem_id: vazioClienteId || null,
              quantidade: parseInt(vazioQtd) || 1, partes_extraidas: vazioPartes
          }]);
          
          // Opcional: Aqui você poderia dar entrada no estoque de uma "Carcaça Genérica"
          alert("Recebimento registrado na Logística Reversa!");
          setMostrarFormVazio(false); setVazioProdId(""); setVazioClienteId(""); setVazioPartes(""); fetchDados();
      } catch (e: any) { alert(e.message); } finally { setProcessando(false); }
  };

  // --- LÓGICA DE PRODUÇÃO (OS) ---
  const criarOS = async () => {
      if (!osFichaId || !osTecnico) return alert("Ficha e Técnico são obrigatórios.");
      setProcessando(true);
      try {
          await supabase.from('srv_recond_os').insert([{ ficha_id: osFichaId, tecnico: osTecnico, quantidade_produzir: parseInt(osQtd) || 1 }]);
          alert("OS de Recondicionamento criada!");
          setMostrarFormOS(false); fetchDados();
      } catch(e:any) { alert(e.message); } finally { setProcessando(false); }
  };

  const iniciarOS = async (id: string) => {
      await supabase.from('srv_recond_os').update({ status: 'Em Produção', data_inicio: new Date().toISOString() }).eq('id', id);
      fetchDados();
  };

  const concluirOS = async (os: any) => {
      if(!confirm("Deseja concluir esta OS? Os insumos serão baixados do estoque e o produto recondicionado será adicionado ao catálogo.")) return;
      setProcessando(true);
      try {
          const dataFim = new Date();
          const dataInicio = new Date(os.data_inicio);
          // Calcula tempo real em minutos
          const tempoReal = Math.max(1, Math.round((dataFim.getTime() - dataInicio.getTime()) / 60000));
          
          // Puxa a ficha técnica para cálculos
          const { data: ficha } = await supabase.from('srv_recond_fichas').select('*, srv_recond_insumos(*)').eq('id', os.ficha_id).single();
          if(!ficha) throw new Error("Ficha não encontrada.");

          // Calcula novo tempo médio (Média Simples entre o estimado atual e o real)
          const novoTempoEstimado = Math.round((ficha.tempo_estimado_min + tempoReal) / 2);

          // Puxa custos atualizados dos insumos da Logística
          let custoTotalInsumos = 0;
          for (const ins of ficha.srv_recond_insumos) {
              const { data: prodInfo } = await supabase.from('log_produtos').select('custo_base, estoque_atual').eq('id', ins.insumo_id).single();
              if (prodInfo) {
                  // Baixa de Insumos
                  await supabase.from('log_produtos').update({ estoque_atual: Math.max(0, prodInfo.estoque_atual - (ins.quantidade * os.quantidade_produzir)) }).eq('id', ins.insumo_id);
                  custoTotalInsumos += (prodInfo.custo_base * ins.quantidade);
              }
          }

          // Cálculo do novo custo unitário do Produto Recondicionado
          const custoMO = (ficha.custo_mao_obra_hora / 60) * tempoReal;
          const custoParcial = custoTotalInsumos + custoMO;
          const custoFinalCalculado = custoParcial + (custoParcial * (ficha.percentual_custo_fixo / 100));

          // Atualiza o Produto Final (Entrada de Estoque e Atualização de Custo)
          const { data: prodFinal } = await supabase.from('log_produtos').select('estoque_atual').eq('id', ficha.produto_final_id).single();
          if (prodFinal) {
              await supabase.from('log_produtos').update({ 
                  estoque_atual: prodFinal.estoque_atual + os.quantidade_produzir,
                  custo_base: custoFinalCalculado // Atualiza o custo no catálogo com o custo de produção real
              }).eq('id', ficha.produto_final_id);
          }

          // Atualiza a Ficha Técnica com a nova média de tempo
          await supabase.from('srv_recond_fichas').update({ tempo_estimado_min: novoTempoEstimado }).eq('id', ficha.id);

          // Atualiza a OS
          await supabase.from('srv_recond_os').update({ 
              status: 'Concluída', data_fim: dataFim.toISOString(), 
              tempo_real_min: tempoReal, custo_unitario_calculado: custoFinalCalculado 
          }).eq('id', os.id);

          alert(`Produção Concluída!\nTempo Gasto: ${tempoReal} min\nCusto Unit. Atualizado: R$ ${custoFinalCalculado.toFixed(2)}`);
          fetchDados();
      } catch(e:any) { alert(e.message); } finally { setProcessando(false); }
  };

  const simulaçãoCusto = calcularCustoFicha();

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto mb-12">
        <datalist id="produtos-list">{produtosBD.map((p) => <option key={p.id} value={`${p.sku || 'S/N'} - ${p.nome}`} />)}</datalist>

        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Recycle className="w-6 h-6 text-emerald-600" /> Manufatura e Recondicionamento</h1>
            <p className="text-slate-500">Gestão de produção, logística reversa, fichas técnicas e apontamento fabril.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setAbaAtiva("producao")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "producao" ? "bg-white shadow-sm text-blue-700" : "text-slate-600"}`}><Factory className="w-4 h-4"/> Chão de Fábrica</button>
            <button onClick={() => setAbaAtiva("vazios")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "vazios" ? "bg-white shadow-sm text-amber-700" : "text-slate-600"}`}><Recycle className="w-4 h-4"/> Logística Reversa</button>
            <button onClick={() => setAbaAtiva("fichas")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "fichas" ? "bg-white shadow-sm text-indigo-700" : "text-slate-600"}`}><Wrench className="w-4 h-4"/> Engenharia (Fichas)</button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA: CHÃO DE FÁBRICA (PRODUÇÃO) */}
        {/* ========================================================================= */}
        {abaAtiva === "producao" && (
            <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><Factory className="w-4 h-4 text-blue-500"/> Ordens de Produção Interna</h3>
                        <Button onClick={() => setMostrarFormOS(!mostrarFormOS)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><Plus className="w-4 h-4"/> Nova OS de Produção</Button>
                    </div>

                    {mostrarFormOS && (
                        <div className="p-6 bg-blue-50/50 border-b border-blue-100 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Receita (Ficha Técnica) *</label>
                                    <Select value={osFichaId} onValueChange={setOsFichaId}>
                                        <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                                        <SelectContent>{fichas.map(f => <SelectItem key={f.id} value={f.id}>{f.log_produtos?.nome}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Técnico / Montador *</label><Input value={osTecnico} onChange={e => setOsTecnico(e.target.value)} className="bg-white" /></div>
                                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Qtd. a Produzir *</label><Input type="number" min="1" value={osQtd} onChange={e => setOsQtd(e.target.value)} className="bg-white text-center font-bold text-blue-700" /></div>
                            </div>
                            <div className="flex justify-end gap-2"><Button onClick={criarOS} disabled={processando} className="bg-blue-600 text-white">Criar Ordem</Button></div>
                        </div>
                    )}

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ordens.length === 0 ? <div className="col-span-full text-center text-slate-500 py-8">Nenhuma produção na fila.</div> : ordens.map(os => (
                            <div key={os.id} className={`p-5 rounded-xl border shadow-sm ${os.status === 'Pendente' ? 'bg-white border-slate-200' : os.status === 'Em Produção' ? 'bg-blue-50 border-blue-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">OP-{String(os.numero_os).padStart(4,'0')}</span>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${os.status === 'Pendente' ? 'bg-slate-100 text-slate-600' : os.status === 'Em Produção' ? 'bg-blue-100 text-blue-700 border-blue-300 animate-pulse' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>{os.status}</span>
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm mb-1">{os.srv_recond_fichas?.log_produtos?.nome}</h4>
                                <p className="text-xs text-slate-500 font-medium mb-4">Técnico: {os.tecnico} | <strong className="text-slate-700">Qtd: {os.quantidade_produzir}</strong></p>
                                
                                {os.status === 'Pendente' && (
                                    <Button onClick={() => iniciarOS(os.id)} className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"><PlayCircle className="w-4 h-4"/> Iniciar Produção</Button>
                                )}
                                {os.status === 'Em Produção' && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] text-blue-700 font-bold text-center flex items-center justify-center gap-1"><Clock className="w-3 h-3"/> Iniciada às {new Date(os.data_inicio).toLocaleTimeString('pt-BR')}</p>
                                        <Button onClick={() => concluirOS(os)} disabled={processando} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white gap-2 shadow-md"><CheckCircle2 className="w-4 h-4"/> Concluir e Baixar Estoque</Button>
                                    </div>
                                )}
                                {os.status === 'Concluída' && (
                                    <div className="flex justify-between border-t border-emerald-200/50 pt-3 mt-2 text-xs">
                                        <span className="text-emerald-700 font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> {os.tempo_real_min} min</span>
                                        <span className="text-emerald-900 font-black">R$ {Number(os.custo_unitario_calculado).toFixed(2).replace('.',',')} / un</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: LOGÍSTICA REVERSA (VAZIOS) */}
        {/* ========================================================================= */}
        {abaAtiva === "vazios" && (
            <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><Recycle className="w-4 h-4 text-amber-500"/> Entrada de Carcaças / Vazios</h3>
                        <Button onClick={() => setMostrarFormVazio(!mostrarFormVazio)} className="bg-amber-500 hover:bg-amber-600 text-white gap-2"><Plus className="w-4 h-4"/> Registrar Retorno</Button>
                    </div>

                    {mostrarFormVazio && (
                        <div className="p-6 bg-amber-50/50 border-b border-amber-100 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Produto Devolvido (Original) *</label>
                                    <Select value={vazioProdId} onValueChange={setVazioProdId}>
                                        <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                                        <SelectContent>{produtosBD.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Cliente Origem (Contrato)</label>
                                    <Select value={vazioClienteId} onValueChange={setVazioClienteId}>
                                        <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                                        <SelectContent><SelectItem value="nenhum">Avulso / Balcão</SelectItem>{clientesBD.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Quantidade *</label><Input type="number" min="1" value={vazioQtd} onChange={e => setVazioQtd(e.target.value)} className="bg-white text-center" /></div>
                                <div className="space-y-2 md:col-span-3"><label className="text-xs font-bold text-slate-500 uppercase">Partes Extraídas / Aproveitáveis</label><Input value={vazioPartes} onChange={e => setVazioPartes(e.target.value)} placeholder="Ex: Carcaça em bom estado, chip..." className="bg-white" /></div>
                            </div>
                            <div className="flex justify-end gap-2"><Button onClick={salvarVazio} disabled={processando} className="bg-amber-500 text-white">Salvar Entrada</Button></div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead><tr className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider"><th className="p-3">Data</th><th className="p-3">Produto Original</th><th className="p-3">Cliente Origem</th><th className="p-3 text-center">Qtd</th><th className="p-3">Aproveitamento Físico</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {vazios.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum retorno registrado.</td></tr> : vazios.map(v => (
                                    <tr key={v.id} className="hover:bg-slate-50">
                                        <td className="p-3 font-medium text-slate-600">{new Date(v.data_entrada).toLocaleDateString('pt-BR')}</td>
                                        <td className="p-3 font-bold text-slate-800">{v.log_produtos?.nome}</td>
                                        <td className="p-3 text-slate-600">{v.log_clientes?.nome_fantasia || 'Avulso'}</td>
                                        <td className="p-3 text-center font-bold text-amber-600">{v.quantidade}</td>
                                        <td className="p-3 text-xs italic text-slate-500">{v.partes_extraidas || 'Nenhum registro de extração'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: ENGENHARIA (FICHAS TÉCNICAS) */}
        {/* ========================================================================= */}
        {abaAtiva === "fichas" && (
            <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><Wrench className="w-4 h-4 text-indigo-500"/> Cadastro de Fichas (BOM)</h3>
                        <Button onClick={() => setMostrarFormFicha(!mostrarFormFicha)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"><Plus className="w-4 h-4"/> Criar Nova Ficha</Button>
                    </div>

                    {mostrarFormFicha && (
                        <div className="p-6 bg-indigo-50/50 border-b border-indigo-100 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2 md:col-span-4">
                                    <label className="text-xs font-bold text-indigo-900 uppercase flex items-center gap-1"><Box className="w-4 h-4"/> Produto Final (Catálogo) *</label>
                                    <Select value={fichaProdFinalId} onValueChange={setFichaProdFinalId}>
                                        <SelectTrigger className="bg-white font-bold border-indigo-300"><SelectValue placeholder="Qual produto recondicionado será criado?"/></SelectTrigger>
                                        <SelectContent>{produtosBD.map(p => <SelectItem key={p.id} value={p.id}>{p.sku} - {p.nome}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Tempo Est. (Minutos)</label><Input type="number" value={tempoEstimado} onChange={e => setTempoEstimado(e.target.value)} className="bg-white" placeholder="Ex: 20" /></div>
                                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Custo MO / Hora (R$)</label><Input type="number" step="0.01" value={custoMaoObraHora} onChange={e => setCustoMaoObraHora(e.target.value)} className="bg-white" placeholder="Ex: 35.00" /></div>
                                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Margem Custo Fixo (%)</label><Input type="number" step="0.1" value={pctCustoFixo} onChange={e => setPctCustoFixo(e.target.value)} className="bg-white" placeholder="Ex: 15" /></div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Settings2 className="w-4 h-4"/> Insumos Necessários</h4>
                                <div className="flex gap-2 mb-4">
                                    <Input list="produtos-list" value={buscaInsumo} onChange={e => setBuscaInsumo(e.target.value)} onKeyDown={e => {if(e.key === 'Enter') addInsumoFicha()}} placeholder="Buscar insumo (Pó, Chip, Carcaça)..." className="flex-1" />
                                    <Button onClick={addInsumoFicha} className="bg-indigo-600 text-white px-3"><Plus className="w-4 h-4"/></Button>
                                </div>
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead><tr className="border-b bg-slate-50"><th className="p-2 font-medium">Insumo</th><th className="p-2 font-medium text-center w-24">Qtd</th><th className="p-2 font-medium text-right w-24">Custo Base</th><th className="p-2 w-10"></th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {insumosFicha.length === 0 ? <tr><td colSpan={4} className="p-4 text-center text-xs text-slate-400">Adicione os materiais que compõem o produto final.</td></tr> : insumosFicha.map((ins, idx) => (
                                            <tr key={ins.id}>
                                                <td className="p-2 font-semibold text-slate-700 text-xs">{ins.nome}</td>
                                                <td className="p-2 text-center"><Input type="number" min="0.0001" step="0.0001" value={ins.quantidade} onChange={e => {const n = [...insumosFicha]; n[idx].quantidade = parseFloat(e.target.value)||0; setInsumosFicha(n)}} className="h-7 text-xs text-center"/></td>
                                                <td className="p-2 text-right text-xs font-bold text-slate-500">R$ {Number(ins.custo_base).toFixed(2)}</td>
                                                <td className="p-2 text-center"><button onClick={() => setInsumosFicha(insumosFicha.filter(x => x.id !== ins.id))} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="bg-slate-800 p-4 rounded-xl text-white flex justify-between items-center shadow-inner">
                                <div className="text-xs space-y-1 opacity-80">
                                    <p>Matéria-Prima: R$ {simulaçãoCusto.custoInsumos.toFixed(2)}</p>
                                    <p>Mão de Obra ({tempoEstimado || 0}m): R$ {simulaçãoCusto.custoMO.toFixed(2)}</p>
                                    <p>Custo Fixo ({pctCustoFixo || 0}%): R$ {(simulaçãoCusto.total - simulaçãoCusto.custoMO - simulaçãoCusto.custoInsumos).toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 mb-1">Custo Total de Produção</p>
                                    <p className="text-2xl font-black text-emerald-400">R$ {simulaçãoCusto.total.toFixed(2).replace('.',',')}</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setMostrarFormFicha(false)}>Cancelar</Button><Button onClick={salvarFicha} disabled={processando} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"><Save className="w-4 h-4"/> Salvar Ficha e Precificar</Button></div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                        {fichas.map(f => (
                            <div key={f.id} className="p-4 border border-slate-200 rounded-xl hover:border-indigo-300 bg-white shadow-sm flex flex-col">
                                <h4 className="font-bold text-indigo-900 text-sm mb-1 line-clamp-2" title={f.log_produtos?.nome}>{f.log_produtos?.nome}</h4>
                                <p className="text-[10px] text-slate-500 font-mono mb-4">{f.log_produtos?.sku}</p>
                                <div className="grid grid-cols-2 gap-2 mb-4 mt-auto">
                                    <div className="bg-slate-50 p-2 rounded text-center"><p className="text-[9px] font-bold text-slate-400 uppercase">Tempo Médio</p><p className="font-black text-slate-700 text-sm flex justify-center items-center gap-1"><Clock className="w-3 h-3"/> {f.tempo_estimado_min}m</p></div>
                                    <div className="bg-slate-50 p-2 rounded text-center"><p className="text-[9px] font-bold text-slate-400 uppercase">Custo Fixo</p><p className="font-black text-slate-700 text-sm">{f.percentual_custo_fixo}%</p></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

      </div>
    </AppLayout>
  );
}