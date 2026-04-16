import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Barcode, Loader2, Plus, Search, Trash2, Printer, CheckCircle2, Clock, PlayCircle, FileText, ArrowLeft, Package, User, Toolbox, Landmark, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PecaOS = { id: string; produtoId: string; nome: string; quantidade: number; preco: number; estoqueAtual: number };
type ServicoOS = { id: string; descricao: string; quantidade: number; preco: number };

export default function OrdensServico() {
  const [abaAtiva, setAbaAtiva] = useState<"abrir" | "painel">("painel");

  // DADOS BASE
  const [clientesBD, setClientesBD] = useState<any[]>([]);
  const [produtosBD, setProdutosBD] = useState<any[]>([]);
  const [catReceitaId, setCatReceitaId] = useState("");

  // ESTADOS: ABERTURA DE CHAMADO
  const [clienteBusca, setClienteBusca] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [equipamento, setEquipamento] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [defeito, setDefeito] = useState("");
  const [salvandoOS, setSalvandoOS] = useState(false);

  // ESTADOS: PAINEL E EXECUÇÃO
  const [ordens, setOrdens] = useState<any[]>([]);
  const [buscaOS, setBuscaOS] = useState("");
  const [osSelecionada, setOsSelecionada] = useState<any | null>(null);
  
  const [statusOS, setStatusOS] = useState("");
  const [laudo, setLaudo] = useState("");
  
  const [buscaPeca, setBuscaPeca] = useState("");
  const [pecas, setPecas] = useState<PecaOS[]>([]);
  
  const [descServico, setDescServico] = useState("");
  const [valorServico, setValorServico] = useState("");
  const [servicos, setServicos] = useState<ServicoOS[]>([]);

  useEffect(() => {
    fetchDadosBase();
    fetchOrdens();
  }, [abaAtiva]);

  const fetchDadosBase = async () => {
    const [cliRes, prodRes, catRes] = await Promise.all([
      supabase.from('log_clientes').select('id, razao_social, nome_fantasia'),
      supabase.from('log_produtos').select('id, sku, nome, preco_venda, estoque_atual'),
      supabase.from('fin_categorias').select('id').eq('tipo', 'Receita').limit(1).single()
    ]);
    if (cliRes.data) setClientesBD(cliRes.data);
    if (prodRes.data) setProdutosBD(prodRes.data);
    if (catRes.data) setCatReceitaId(catRes.data.id);
  };

  const fetchOrdens = async () => {
    const { data } = await supabase.from('srv_ordens_servico').select('*').order('numero_os', { ascending: false });
    if (data) setOrdens(data);
  };

  // --- ABRIR CHAMADO ---
  const abrirChamado = async () => {
    if (!clienteBusca || !equipamento || !defeito) return alert("Cliente, Equipamento e Defeito são obrigatórios.");
    
    setSalvandoOS(true);
    try {
      let idCliente = clienteId;
      if (!idCliente) {
        const c = clientesBD.find(x => x.nome_fantasia === clienteBusca || x.razao_social === clienteBusca);
        if (c) idCliente = c.id;
      }

      const payload = {
        cliente_id: idCliente, cliente_nome: clienteBusca, equipamento, numero_serie: numeroSerie, defeito_relatado: defeito, status: 'Aberta'
      };

      const { error } = await supabase.from('srv_ordens_servico').insert([payload]);
      if (error) throw error;

      alert("Ordem de Serviço aberta com sucesso!");
      setClienteBusca(""); setClienteId(null); setEquipamento(""); setNumeroSerie(""); setDefeito("");
      setAbaAtiva("painel");
    } catch (e: any) { alert("Erro ao abrir OS: " + e.message); } finally { setSalvandoOS(false); }
  };

  // --- ABRIR PRANCHETA DO TÉCNICO ---
  const abrirExecucao = async (os: any) => {
    setOsSelecionada(os);
    setStatusOS(os.status);
    setLaudo(os.laudo_tecnico || "");

    const [pecasRes, servRes] = await Promise.all([
      supabase.from('srv_os_pecas').select('*').eq('os_id', os.id),
      supabase.from('srv_os_servicos').select('*').eq('os_id', os.id)
    ]);

    if (pecasRes.data) {
        setPecas(pecasRes.data.map(p => ({
            id: p.id, produtoId: p.produto_id, nome: p.produto_nome, quantidade: p.quantidade, preco: p.preco_unitario, estoqueAtual: 999 
        })));
    }
    if (servRes.data) {
        setServicos(servRes.data.map(s => ({
            id: s.id, descricao: s.descricao, quantidade: s.quantidade, preco: s.preco_unitario
        })));
    }
  };

  // --- ADICIONAR PEÇAS E SERVIÇOS NA OS ---
  const adicionarPeca = () => {
    if (!buscaPeca) return;
    const prod = produtosBD.find(p => p.nome === buscaPeca || `${p.sku || 'S/N'} - ${p.nome}` === buscaPeca);
    if (!prod) return alert("Peça não encontrada no estoque.");

    setPecas([...pecas, { id: crypto.randomUUID(), produtoId: prod.id, nome: prod.nome, quantidade: 1, preco: prod.preco_venda || 0, estoqueAtual: prod.estoque_atual || 0 }]);
    setBuscaPeca("");
  };

  const adicionarServico = () => {
    if (!descServico || !valorServico) return alert("Informe a descrição e o valor do serviço.");
    setServicos([...servicos, { id: crypto.randomUUID(), descricao: descServico, quantidade: 1, preco: parseFloat(valorServico) }]);
    setDescServico(""); setValorServico("");
  };

  // --- SALVAR EXECUÇÃO (SEM FATURAR) ---
  const salvarExecucao = async (novoStatus?: string) => {
    setSalvandoOS(true);
    try {
      const statusFinal = novoStatus || statusOS;
      const tPecas = pecas.reduce((a, b) => a + (b.quantidade * b.preco), 0);
      const tServicos = servicos.reduce((a, b) => a + (b.quantidade * b.preco), 0);
      const tGeral = tPecas + tServicos;

      const payloadOS: any = { status: statusFinal, laudo_tecnico: laudo, valor_pecas: tPecas, valor_servicos: tServicos, valor_total: tGeral };
      if (statusFinal === 'Concluída' && osSelecionada.status !== 'Concluída') payloadOS.data_conclusao = new Date().toISOString();

      await supabase.from('srv_ordens_servico').update(payloadOS).eq('id', osSelecionada.id);

      // Limpa e recria peças/serviços para espelhar a tela
      await supabase.from('srv_os_pecas').delete().eq('os_id', osSelecionada.id);
      if (pecas.length > 0) {
        const insertPecas = pecas.map(p => ({ os_id: osSelecionada.id, produto_id: p.produtoId, produto_nome: p.nome, quantidade: p.quantidade, preco_unitario: p.preco, total_peca: p.quantidade * p.preco }));
        await supabase.from('srv_os_pecas').insert(insertPecas);
      }

      await supabase.from('srv_os_servicos').delete().eq('os_id', osSelecionada.id);
      if (servicos.length > 0) {
        const insertServ = servicos.map(s => ({ os_id: osSelecionada.id, descricao: s.descricao, quantidade: s.quantidade, preco_unitario: s.preco, total_servico: s.quantidade * s.preco }));
        await supabase.from('srv_os_servicos').insert(insertServ);
      }

      alert("Ordem de Serviço atualizada com sucesso!");
      fetchOrdens(); setOsSelecionada(null);
    } catch (e: any) { alert(e.message); } finally { setSalvandoOS(false); }
  };

  // --- FATURAR OS (BAIXA ESTOQUE + GERA FINANCEIRO) ---
  const faturarOS = async () => {
    if (!confirm("Deseja Faturar esta OS?\nAs peças serão baixadas do estoque e uma Conta a Receber será gerada no Financeiro.")) return;
    
    setSalvandoOS(true);
    try {
      // 1. Salva a OS para garantir que os dados estão atualizados
      await salvarExecucao('Faturada');

      // 2. Baixa de Estoque
      for (const p of pecas) {
        const { data: prodData } = await supabase.from('log_produtos').select('estoque_atual').eq('id', p.produtoId).single();
        if (prodData) {
            const novoEst = Math.max(0, prodData.estoque_atual - p.quantidade);
            await supabase.from('log_produtos').update({ estoque_atual: novoEst }).eq('id', p.produtoId);
        }
        await supabase.from('log_movimentacoes').insert({
            produto_id: p.produtoId, tipo: 'Saída', quantidade: p.quantidade, 
            documento: `OS-${osSelecionada.numero_os}`, fornecedor_cliente: osSelecionada.cliente_nome, observacoes: 'Aplicação em OS'
        });
      }

      // 3. Gera Financeiro
      const tPecas = pecas.reduce((a, b) => a + (b.quantidade * b.preco), 0);
      const tServicos = servicos.reduce((a, b) => a + (b.quantidade * b.preco), 0);
      
      const payloadFin = {
          tipo: 'Receita',
          descricao: `Faturamento OS #${osSelecionada.numero_os} - ${osSelecionada.cliente_nome}`,
          valor: tPecas + tServicos,
          data_emissao: new Date().toISOString().split('T')[0],
          data_vencimento: new Date().toISOString().split('T')[0],
          status: 'Pendente',
          categoria_id: catReceitaId || null,
          documento_origem: `OS-${osSelecionada.numero_os}`,
          observacoes: `Peças: R$ ${tPecas.toFixed(2)} | Serviços: R$ ${tServicos.toFixed(2)}`
      };
      await supabase.from('fin_lancamentos').insert([payloadFin]);

      alert("OS Faturada com sucesso! Estoque e Financeiro atualizados.");
      fetchOrdens(); setOsSelecionada(null);
    } catch (e: any) { alert("Erro ao Faturar: " + e.message); } finally { setSalvandoOS(false); }
  };

  const ordensFiltradas = ordens.filter(o => 
    (o.cliente_nome?.toLowerCase() || "").includes(buscaOS.toLowerCase()) || 
    (o.equipamento?.toLowerCase() || "").includes(buscaOS.toLowerCase()) ||
    (o.numero_os?.toString() || "").includes(buscaOS)
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto mb-12">
        <datalist id="os-clientes">{clientesBD.map((c) => <option key={c.id} value={c.nome_fantasia || c.razao_social} />)}</datalist>
        <datalist id="os-pecas">{produtosBD.map((p) => <option key={p.id} value={`${p.sku || 'S/N'} - ${p.nome}`} />)}</datalist>

        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Wrench className="w-6 h-6 text-blue-600" /> Ordens de Serviço</h1>
            <p className="text-slate-500">Gestão de chamados, aplicação de peças e laudos técnicos.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setAbaAtiva("painel")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${abaAtiva === "painel" ? "bg-white shadow-sm text-blue-700" : "text-slate-600"}`}>Painel de OS</button>
            <button onClick={() => setAbaAtiva("abrir")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${abaAtiva === "abrir" ? "bg-white shadow-sm text-emerald-700" : "text-slate-600"}`}>+ Abrir Chamado</button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA: ABRIR CHAMADO (RECEPÇÃO) */}
        {/* ========================================================================= */}
        {abaAtiva === "abrir" && (
          <div className="bg-white p-8 rounded-xl border shadow-sm max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center border-b pb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mb-3"><Plus className="w-6 h-6"/></div>
                <h2 className="text-xl font-bold text-slate-800">Abertura de Chamado Técnico</h2>
                <p className="text-slate-500 text-sm">Registre o equipamento e o relato do cliente.</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><User className="w-4 h-4 text-slate-400"/> Cliente Solicitante <span className="text-red-500">*</span></label><Input list="os-clientes" value={clienteBusca} onChange={e => { setClienteBusca(e.target.value); const c = clientesBD.find(x => x.nome_fantasia === e.target.value || x.razao_social === e.target.value); if(c) setClienteId(c.id); else setClienteId(null); }} placeholder="Buscar ou digitar nome do cliente..." className="bg-slate-50" /></div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Printer className="w-4 h-4 text-slate-400"/> Equipamento <span className="text-red-500">*</span></label><Input value={equipamento} onChange={e => setEquipamento(e.target.value)} placeholder="Ex: Impressora Brother L5652" /></div>
                  <div className="space-y-2"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Barcode className="w-4 h-4 text-slate-400"/> Nº de Série</label><Input value={numeroSerie} onChange={e => setNumeroSerie(e.target.value)} placeholder="Série do equipamento" /></div>
              </div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-slate-400"/> Defeito Relatado pelo Cliente <span className="text-red-500">*</span></label><textarea value={defeito} onChange={e => setDefeito(e.target.value)} className="w-full min-h-[100px] p-3 border rounded-md bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Descreva exatamente o que o cliente relatou..."></textarea></div>
            </div>

            <Button onClick={abrirChamado} disabled={salvandoOS} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-md">
                {salvandoOS ? <Loader2 className="w-5 h-5 animate-spin"/> : "Gerar Ordem de Serviço"}
            </Button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: PAINEL DE OS (HISTÓRICO) */}
        {/* ========================================================================= */}
        {abaAtiva === "painel" && !osSelecionada && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex flex-wrap items-center gap-4 bg-slate-50 justify-between">
              <div className="relative w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={buscaOS} onChange={e => setBuscaOS(e.target.value)} placeholder="Buscar OS, cliente ou equip..." className="pl-9 bg-white" /></div>
            </div>
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b text-center w-24">OS Nº</th>
                    <th className="p-4 font-semibold border-b">Cliente / Equipamento</th>
                    <th className="p-4 font-semibold border-b text-center">Abertura</th>
                    <th className="p-4 font-semibold border-b text-center">Status</th>
                    <th className="p-4 font-semibold border-b text-right">Total (R$)</th>
                    <th className="p-4 font-semibold border-b text-center w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordensFiltradas.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhuma Ordem de Serviço encontrada.</td></tr>
                  ) : (
                    ordensFiltradas.map(os => {
                        const corStatus = os.status === 'Aberta' ? 'bg-slate-100 text-slate-700' : os.status === 'Em Andamento' ? 'bg-blue-100 text-blue-700' : os.status === 'Aguardando Peça' ? 'bg-amber-100 text-amber-700' : os.status === 'Concluída' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700';

                        return (
                        <tr key={os.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => abrirExecucao(os)}>
                          <td className="p-4 text-center font-bold text-blue-700 font-mono text-sm">OS-{String(os.numero_os).padStart(4,'0')}</td>
                          <td className="p-4">
                              <p className="font-bold text-slate-800 text-sm">{os.cliente_nome}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Printer className="w-3 h-3"/> {os.equipamento}</p>
                          </td>
                          <td className="p-4 text-center text-xs text-slate-600 font-medium">
                              {new Date(os.data_abertura).toLocaleDateString('pt-BR')}
                              <span className="block text-[10px] text-slate-400 mt-0.5">{new Date(os.data_abertura).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                          </td>
                          <td className="p-4 text-center">
                              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${corStatus}`}>{os.status}</span>
                          </td>
                          <td className="p-4 text-right font-bold text-slate-700">R$ {Number(os.valor_total).toFixed(2).replace('.', ',')}</td>
                          <td className="p-4 text-center">
                              <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 group-hover:bg-blue-50 h-8">Abrir</Button>
                          </td>
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
        {/* ABA: PRANCHETA DO TÉCNICO (EXECUÇÃO E FATURAMENTO) */}
        {/* ========================================================================= */}
        {abaAtiva === "painel" && osSelecionada && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-200">
            
            {/* TOPO DA OS */}
            <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-blue-600">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Button variant="ghost" size="sm" onClick={() => setOsSelecionada(null)} className="h-8 px-2 text-slate-400 hover:text-slate-700"><ArrowLeft className="w-4 h-4"/></Button>
                        <h2 className="text-2xl font-black text-slate-800">OS Nº {String(osSelecionada.numero_os).padStart(4,'0')}</h2>
                        <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${statusOS === 'Aberta' ? 'bg-slate-100 text-slate-700' : statusOS === 'Em Andamento' ? 'bg-blue-100 text-blue-700' : statusOS === 'Aguardando Peça' ? 'bg-amber-100 text-amber-700' : statusOS === 'Concluída' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>{statusOS}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 ml-12">
                        <span className="flex items-center gap-1 font-semibold"><User className="w-4 h-4 text-slate-400"/> {osSelecionada.cliente_nome}</span>
                        <span className="flex items-center gap-1"><Printer className="w-4 h-4 text-slate-400"/> {osSelecionada.equipamento} {osSelecionada.numero_serie && `(S/N: ${osSelecionada.numero_serie})`}</span>
                    </div>
                </div>
                {osSelecionada.status === 'Faturada' ? (
                     <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> OS Encerrada e Faturada</div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Select value={statusOS} onValueChange={setStatusOS}>
                            <SelectTrigger className="w-44 bg-white font-semibold"><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="Aberta">Aberta</SelectItem><SelectItem value="Em Andamento">Em Andamento</SelectItem><SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem><SelectItem value="Concluída">Concluída</SelectItem><SelectItem value="Cancelada">Cancelada</SelectItem></SelectContent>
                        </Select>
                        <Button onClick={() => salvarExecucao()} disabled={salvandoOS} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm">Salvar Alterações</Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* COLUNA ESQUERDA: RELATOS E LAUDO */}
                <div className="space-y-6">
                    <div className="bg-rose-50 p-5 rounded-xl border border-rose-100">
                        <h4 className="text-sm font-bold text-rose-800 uppercase flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4"/> Defeito Relatado</h4>
                        <p className="text-sm text-rose-900/80 italic">"{osSelecionada.defeito_relatado}"</p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border shadow-sm h-full">
                        <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2 mb-3"><FileText className="w-4 h-4 text-blue-500"/> Laudo Técnico</h4>
                        <textarea value={laudo} onChange={e => setLaudo(e.target.value)} disabled={osSelecionada.status === 'Faturada'} className="w-full h-48 p-3 border rounded-md bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" placeholder="Descreva o diagnóstico, causa do defeito e solução adotada..."></textarea>
                    </div>
                </div>

                {/* COLUNA DIREITA: PEÇAS, SERVIÇOS E FINANCEIRO */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* BLOCO: PEÇAS APLICADAS */}
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                            <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2"><Package className="w-4 h-4 text-indigo-500"/> Peças e Insumos Aplicados</h4>
                            {osSelecionada.status !== 'Faturada' && (
                                <div className="flex gap-2">
                                    <Input list="os-pecas" value={buscaPeca} onChange={e => setBuscaPeca(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') adicionarPeca() }} placeholder="Buscar peça no estoque..." className="h-8 text-xs w-48 bg-white" />
                                    <Button size="sm" onClick={adicionarPeca} className="h-8 px-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200"><Plus className="w-4 h-4"/></Button>
                                </div>
                            )}
                        </div>
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b bg-white">
                                    <th className="p-3 font-medium">Produto</th><th className="p-3 font-medium text-center">Qtd</th><th className="p-3 font-medium text-right">R$ Unit.</th><th className="p-3 font-medium text-right">Total</th>{osSelecionada.status !== 'Faturada' && <th className="p-3"></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pecas.length === 0 ? (
                                    <tr><td colSpan={5} className="p-4 text-center text-xs text-slate-400">Nenhuma peça aplicada.</td></tr>
                                ) : (
                                    pecas.map((p, idx) => (
                                        <tr key={p.id} className="bg-white hover:bg-slate-50">
                                            <td className="p-3 font-semibold text-slate-700">{p.nome}</td>
                                            <td className="p-3 text-center"><Input type="number" min="1" disabled={osSelecionada.status === 'Faturada'} value={p.quantidade} onChange={e => { const np = [...pecas]; np[idx].quantidade = parseFloat(e.target.value)||1; setPecas(np); }} className="h-7 w-16 text-center mx-auto text-xs font-bold bg-slate-50"/></td>
                                            <td className="p-3 text-right"><Input type="number" step="0.01" disabled={osSelecionada.status === 'Faturada'} value={p.preco} onChange={e => { const np = [...pecas]; np[idx].preco = parseFloat(e.target.value)||0; setPecas(np); }} className="h-7 w-20 ml-auto text-right text-xs bg-slate-50"/></td>
                                            <td className="p-3 text-right font-bold text-indigo-700">R$ {(p.quantidade * p.preco).toFixed(2).replace('.', ',')}</td>
                                            {osSelecionada.status !== 'Faturada' && <td className="p-3 text-center"><button onClick={() => setPecas(pecas.filter(x => x.id !== p.id))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></td>}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* BLOCO: SERVIÇOS (MÃO DE OBRA) */}
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                            <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2"><Toolbox className="w-4 h-4 text-amber-500"/> Mão de Obra e Serviços</h4>
                            {osSelecionada.status !== 'Faturada' && (
                                <div className="flex gap-2">
                                    <Input value={descServico} onChange={e => setDescServico(e.target.value)} placeholder="Descrição do serviço..." className="h-8 text-xs w-48 bg-white" />
                                    <Input type="number" step="0.01" value={valorServico} onChange={e => setValorServico(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') adicionarServico() }} placeholder="R$ Valor" className="h-8 text-xs w-24 bg-white" />
                                    <Button size="sm" onClick={adicionarServico} className="h-8 px-2 bg-amber-100 text-amber-700 hover:bg-amber-200"><Plus className="w-4 h-4"/></Button>
                                </div>
                            )}
                        </div>
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b bg-white">
                                    <th className="p-3 font-medium">Serviço Executado</th><th className="p-3 font-medium text-center">Horas/Qtd</th><th className="p-3 font-medium text-right">Valor</th>{osSelecionada.status !== 'Faturada' && <th className="p-3"></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {servicos.length === 0 ? (
                                    <tr><td colSpan={4} className="p-4 text-center text-xs text-slate-400">Nenhum serviço lançado.</td></tr>
                                ) : (
                                    servicos.map((s, idx) => (
                                        <tr key={s.id} className="bg-white hover:bg-slate-50">
                                            <td className="p-3 font-semibold text-slate-700"><Input value={s.descricao} disabled={osSelecionada.status === 'Faturada'} onChange={e => { const ns = [...servicos]; ns[idx].descricao = e.target.value; setServicos(ns); }} className="h-7 text-xs bg-slate-50 border-transparent hover:border-slate-200"/></td>
                                            <td className="p-3 text-center"><Input type="number" min="1" disabled={osSelecionada.status === 'Faturada'} value={s.quantidade} onChange={e => { const ns = [...servicos]; ns[idx].quantidade = parseFloat(e.target.value)||1; setServicos(ns); }} className="h-7 w-16 text-center mx-auto text-xs font-bold bg-slate-50"/></td>
                                            <td className="p-3 text-right"><Input type="number" step="0.01" disabled={osSelecionada.status === 'Faturada'} value={s.preco} onChange={e => { const ns = [...servicos]; ns[idx].preco = parseFloat(e.target.value)||0; setServicos(ns); }} className="h-7 w-24 ml-auto text-right text-xs font-bold text-amber-700 bg-slate-50"/></td>
                                            {osSelecionada.status !== 'Faturada' && <td className="p-3 text-center"><button onClick={() => setServicos(servicos.filter(x => x.id !== s.id))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></td>}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* FECHAMENTO DE TOTAIS */}
                    <div className="bg-slate-800 rounded-xl p-5 text-white flex justify-between items-center shadow-lg">
                        <div className="flex gap-8">
                            <div><p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Total Peças</p><p className="text-lg font-semibold text-indigo-300">R$ {pecas.reduce((a,b) => a+(b.quantidade*b.preco), 0).toFixed(2).replace('.',',')}</p></div>
                            <div><p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Mão de Obra</p><p className="text-lg font-semibold text-amber-300">R$ {servicos.reduce((a,b) => a+(b.quantidade*b.preco), 0).toFixed(2).replace('.',',')}</p></div>
                            <div className="pl-6 border-l border-slate-600"><p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold mb-1">Total da OS</p><p className="text-3xl font-black text-emerald-400">R$ {(pecas.reduce((a,b) => a+(b.quantidade*b.preco), 0) + servicos.reduce((a,b) => a+(b.quantidade*b.preco), 0)).toFixed(2).replace('.',',')}</p></div>
                        </div>
                        {osSelecionada.status !== 'Faturada' && (
                            <Button onClick={faturarOS} disabled={salvandoOS || (pecas.length === 0 && servicos.length === 0)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 px-6 gap-2 shadow-md animate-pulse duration-2000"><Landmark className="w-5 h-5"/> Encerrar e Faturar OS</Button>
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