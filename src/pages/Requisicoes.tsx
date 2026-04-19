import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Plus, Search, CheckCircle2, Clock, AlertTriangle, ArrowRight, Package, ShoppingCart, User, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Requisicoes() {
  const [abaAtiva, setAbaAtiva] = useState<"nova" | "painel">("painel");

  // ==========================================
  // ESTADOS: DADOS BASE
  // ==========================================
  const [produtosBD, setProdutosBD] = useState<any[]>([]);
  const [requisicoes, setRequisicoes] = useState<any[]>([]);
  const [buscaReq, setBuscaReq] = useState("");

  // ==========================================
  // ESTADOS: NOVA REQUISIÇÃO
  // ==========================================
  const [setor, setSetor] = useState("");
  const [colaborador, setColaborador] = useState("");
  const [produtoBusca, setProdutoBusca] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [prioridade, setPrioridade] = useState("Normal");
  const [salvando, setSalvando] = useState(false);

  // Listas de Motivos dinâmicas baseadas no Setor
  const motivosPorSetor: Record<string, string[]> = {
    "Técnico / Assistência": ["OS Avulsa", "OS de Contrato (Locação)", "Suprimento p/ Locação", "Uso e Consumo (Bancada)", "Ferramentas", "Insumo p/ Recondicionamento"],
    "Gráfica / Produção": ["Insumo p/ Produção Gráfica", "Uso e Consumo Gráfica", "Ferramentas / Manutenção"],
    "Administrativo / Frota": ["Material de Escritório", "Uso e Consumo Geral", "Manutenção Estrutural (Lâmpadas, etc)", "Peças/Manutenção Veículos"],
    "Comercial / Vendas": ["Material para Demonstração", "Brindes / Cortesia", "Material de Escritório"],
    "Licitações / Contratos": ["Equipamento p/ Contrato de Locação", "Itens para Edital/Licitação"]
  };

  useEffect(() => {
    fetchDadosBase();
    fetchRequisicoes();
  }, [abaAtiva]);

  const fetchDadosBase = async () => {
    const { data } = await supabase.from('log_produtos').select('id, sku, nome, estoque_atual').order('nome');
    if (data) setProdutosBD(data);
  };

  const fetchRequisicoes = async () => {
    const { data } = await supabase
      .from('log_requisicoes')
      .select(`*, log_produtos(nome, sku, estoque_atual)`)
      .order('id', { ascending: false });
    if (data) setRequisicoes(data);
  };

  // --- ENVIAR NOVA REQUISIÇÃO ---
  const enviarRequisicao = async () => {
    if (!setor || !colaborador || !produtoBusca || !motivo) return alert("Preencha todos os campos obrigatórios.");
    
    setSalvando(true);
    try {
      const prodMatch = produtosBD.find(p => p.nome === produtoBusca || `${p.sku || 'S/N'} - ${p.nome}` === produtoBusca);
      
      // Para evitar erro no Supabase, juntamos o Motivo dentro da coluna Setor Solicitante
      const payload = {
        setor_solicitante: `${setor} (${motivo})`,
        colaborador_nome: colaborador,
        produto_id: prodMatch ? prodMatch.id : null,
        produto_texto: prodMatch ? prodMatch.nome : produtoBusca,
        quantidade: quantidade,
        prioridade: prioridade,
        status: 'Pendente'
      };

      const { error } = await supabase.from('log_requisicoes').insert([payload]);
      if (error) throw error;

      alert("Requisição enviada com sucesso! O Estoquista será notificado.");
      setProdutoBusca(""); setQuantidade(1); setMotivo(""); setPrioridade("Normal");
      fetchRequisicoes();
      setAbaAtiva("painel");

    } catch (e: any) {
      alert("Erro ao enviar: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  // --- AÇÕES DO ALMOXARIFADO ---
  const atualizarStatus = async (reqId: string, novoStatus: string, produtoId: string | null, qtd: number) => {
    let obs = "";

    // Se for ATENDER, dá baixa no estoque
    if (novoStatus === 'Atendido') {
        if (!produtoId) return alert("Este item foi digitado manualmente e não existe no catálogo. Não é possível dar baixa automática. Cadastre o item primeiro ou envie para compras.");
        
        const prod = produtosBD.find(p => p.id === produtoId);
        if (!prod || prod.estoque_atual < qtd) {
            return alert(`Estoque insuficiente! Você tem ${prod?.estoque_atual || 0} na prateleira, mas a requisição pede ${qtd}. Considere "Enviar p/ Compras" ou "Atender Parcialmente".`);
        }

        if (!confirm(`Confirma a entrega deste material? O estoque será reduzido em ${qtd} unidades.`)) return;

        // Baixa no estoque
        const novoEstoque = prod.estoque_atual - qtd;
        await supabase.from('log_produtos').update({ estoque_atual: novoEstoque }).eq('id', produtoId);
        
        // Log de Movimentação
        await supabase.from('log_movimentacoes').insert({
            produto_id: produtoId, tipo: 'Saída', quantidade: qtd, 
            documento: `REQ-INTERNA`, fornecedor_cliente: `Consumo Interno`, observacoes: `Requisição via Sistema`
        });
        
        obs = "Material entregue e baixado do estoque.";
    } 
    // Se for enviar para compras
    else if (novoStatus === 'Enviado p/ Compras') {
        if (!confirm("Este item ficará marcado como pendente de compra. A equipe de Suprimentos deverá providenciá-lo.")) return;
        obs = "Aguardando processo de compra.";
    }
    // Se for negar
    else if (novoStatus === 'Negado') {
        const motivoNegacao = prompt("Qual o motivo da negação?");
        if (!motivoNegacao) return;
        obs = `Negado: ${motivoNegacao}`;
    }

    try {
        const { error } = await supabase
            .from('log_requisicoes')
            .update({ status: novoStatus, data_atendimento: new Date().toISOString(), observacoes_atendimento: obs })
            .eq('id', reqId);
            
        if (error) throw error;
        fetchDadosBase(); // Atualiza os estoques na tela
        fetchRequisicoes();
    } catch (e: any) {
        alert("Erro ao processar requisição: " + e.message);
    }
  };

  const reqFiltradas = requisicoes.filter(r => 
    (r.produto_texto?.toLowerCase() || "").includes(buscaReq.toLowerCase()) || 
    (r.setor_solicitante?.toLowerCase() || "").includes(buscaReq.toLowerCase()) ||
    (r.colaborador_nome?.toLowerCase() || "").includes(buscaReq.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto mb-12">
        <datalist id="lista-produtos-req">{produtosBD.map((p) => <option key={p.id} value={`${p.sku || 'S/N'} - ${p.nome}`} />)}</datalist>

        {/* CABEÇALHO E ABAS */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><ClipboardList className="w-6 h-6 text-indigo-600" /> Requisições Internas</h1>
            <p className="text-slate-500">Solicitação de materiais, ferramentas e insumos para os setores.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setAbaAtiva("painel")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "painel" ? "bg-white shadow-sm text-indigo-700" : "text-slate-600 hover:text-slate-900"}`}><Package className="w-4 h-4"/> Painel do Estoquista</button>
            <button onClick={() => setAbaAtiva("nova")} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${abaAtiva === "nova" ? "bg-white shadow-sm text-emerald-700" : "text-slate-600 hover:text-slate-900"}`}><Plus className="w-4 h-4"/> Nova Solicitação</button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABA: NOVA REQUISIÇÃO (TELA DO COLABORADOR) */}
        {/* ========================================================================= */}
        {abaAtiva === "nova" && (
          <div className="bg-white p-8 rounded-xl border shadow-sm max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center border-b pb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-3"><ClipboardList className="w-6 h-6"/></div>
                <h2 className="text-xl font-bold text-slate-800">Formulário de Requisição de Material</h2>
                <p className="text-slate-500 text-sm mt-1">Preencha os dados abaixo para solicitar itens ao Estoquista ou Comprador.</p>
            </div>
            
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Setor Solicitante <span className="text-red-500">*</span></label>
                    <Select value={setor} onValueChange={(val) => { setSetor(val); setMotivo(""); }}>
                        <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Selecione seu setor..." /></SelectTrigger>
                        <SelectContent>
                            {Object.keys(motivosPorSetor).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><User className="w-4 h-4 text-slate-400"/> Nome do Colaborador <span className="text-red-500">*</span></label>
                    <Input value={colaborador} onChange={e => setColaborador(e.target.value)} placeholder="Quem está pedindo?" className="bg-slate-50" />
                  </div>
              </div>

              <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2 md:col-span-3">
                        <label className="text-sm font-bold text-indigo-900">Produto / Material Necessário <span className="text-red-500">*</span></label>
                        <Input list="lista-produtos-req" value={produtoBusca} onChange={e => setProdutoBusca(e.target.value)} placeholder="Busque no catálogo ou digite o nome..." className="bg-white border-indigo-200" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-indigo-900">Quantidade <span className="text-red-500">*</span></label>
                        <Input type="number" min="1" value={quantidade} onChange={e => setQuantidade(parseFloat(e.target.value)||1)} className="bg-white border-indigo-200 text-center font-bold" />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-indigo-900">Aplicação / Destinação (Centro de Custo) <span className="text-red-500">*</span></label>
                        <Select value={motivo} onValueChange={setMotivo} disabled={!setor}>
                            <SelectTrigger className="bg-white border-indigo-200"><SelectValue placeholder={setor ? "Para onde vai este material?" : "Selecione o setor primeiro"} /></SelectTrigger>
                            <SelectContent>
                                {setor && motivosPorSetor[setor]?.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                <SelectItem value="Outros">Outros (Especificar na observação)</SelectItem>
                            </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-indigo-900">Prioridade <span className="text-red-500">*</span></label>
                        <Select value={prioridade} onValueChange={setPrioridade}>
                            <SelectTrigger className="bg-white border-indigo-200"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Baixa">Baixa (Pode aguardar)</SelectItem>
                                <SelectItem value="Normal">Normal (Rotina)</SelectItem>
                                <SelectItem value="Urgente">Urgente (Impacta o serviço)</SelectItem>
                                <SelectItem value="Emergência">Emergência (Máquina/Empresa parada)</SelectItem>
                            </SelectContent>
                        </Select>
                      </div>
                  </div>
              </div>
            </div>

            <div className="pt-4 border-t">
                <Button onClick={enviarRequisicao} disabled={salvando} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-md gap-2">
                    {salvando ? "Enviando..." : <><ArrowRight className="w-5 h-5"/> Enviar Requisição ao Setor de Estoque/Compras</>}
                </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: PAINEL DO ALMOXARIFADO (APROVAÇÃO E BAIXA) */}
        {/* ========================================================================= */}
        {abaAtiva === "painel" && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex flex-wrap items-center gap-4 bg-slate-50 justify-between">
              <div className="relative w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={buscaReq} onChange={e => setBuscaReq(e.target.value)} placeholder="Buscar item ou setor..." className="pl-9 bg-white" /></div>
            </div>
            
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b text-center w-20">Req</th>
                    <th className="p-4 font-semibold border-b">Solicitante / Setor</th>
                    <th className="p-4 font-semibold border-b">Material Solicitado</th>
                    <th className="p-4 font-semibold border-b text-center">Prioridade</th>
                    <th className="p-4 font-semibold border-b text-center">Status</th>
                    <th className="p-4 font-semibold border-b text-center w-64">Decisão do Estoquista</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reqFiltradas.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-500">A caixa de entrada de requisições está vazia.</td></tr>
                  ) : (
                    reqFiltradas.map(req => {
                        const corPrioridade = req.prioridade === 'Emergência' ? 'text-red-600 bg-red-100' : req.prioridade === 'Urgente' ? 'text-amber-600 bg-amber-100' : 'text-slate-600 bg-slate-100';
                        const corStatus = req.status === 'Pendente' ? 'bg-slate-800 text-white animate-pulse' : req.status === 'Atendido' ? 'bg-emerald-100 text-emerald-700' : req.status === 'Enviado p/ Compras' ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700';

                        const estoqueItem = req.log_produtos ? req.log_produtos.estoque_atual : null;

                        return (
                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 text-center font-bold text-slate-400 font-mono text-sm">#{String(req.id).substring(0,4).toUpperCase()}</td>
                          
                          <td className="p-4">
                              <p className="font-bold text-slate-800 text-sm leading-tight">{req.colaborador_nome}</p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">{req.setor_solicitante}</p>
                              <p className="text-[10px] text-slate-400 mt-1">{new Date(req.data_solicitacao).toLocaleDateString('pt-BR')} às {new Date(req.data_solicitacao).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                          </td>
                          
                          <td className="p-4">
                              <p className="font-bold text-indigo-700 text-sm flex items-center gap-2">
                                {req.produto_texto} 
                                <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-xs">x{req.quantidade}</span>
                              </p>
                              
                              {/* Alerta de Estoque visual rápido */}
                              {req.status === 'Pendente' && req.log_produtos && (
                                  <p className={`text-[10px] font-bold mt-2 ${estoqueItem >= req.quantidade ? 'text-emerald-600' : 'text-red-500'}`}>
                                      ▶ Saldo Atual na Prateleira: {estoqueItem}
                                  </p>
                              )}
                              {req.status === 'Pendente' && !req.log_produtos && (
                                  <p className="text-[10px] font-bold mt-2 text-amber-600">▶ Item não catalogado (Avulso).</p>
                              )}
                          </td>
                          
                          <td className="p-4 text-center">
                              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${corPrioridade}`}>
                                  {req.prioridade === 'Emergência' && <AlertTriangle className="w-3 h-3 inline mr-1"/>}
                                  {req.prioridade}
                              </span>
                          </td>
                          
                          <td className="p-4 text-center">
                              <span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full shadow-sm ${corStatus}`}>{req.status}</span>
                          </td>
                          
                          <td className="p-4 text-center">
                              {req.status === 'Pendente' ? (
                                  <div className="flex flex-col gap-1.5">
                                      <Button size="sm" onClick={() => atualizarStatus(req.id, 'Atendido', req.produto_id, req.quantidade)} className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white w-full"><CheckCircle2 className="w-3 h-3 mr-1"/> Entregar & Baixar</Button>
                                      <Button size="sm" onClick={() => atualizarStatus(req.id, 'Enviado p/ Compras', req.produto_id, req.quantidade)} className="h-7 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white w-full"><ShoppingCart className="w-3 h-3 mr-1"/> Falta! Comprar</Button>
                                      <Button size="sm" variant="outline" onClick={() => atualizarStatus(req.id, 'Negado', req.produto_id, req.quantidade)} className="h-7 text-[10px] text-red-600 hover:bg-red-50 border-red-200 w-full"><XCircle className="w-3 h-3 mr-1"/> Negar Pedido</Button>
                                  </div>
                              ) : (
                                  <div className="text-[10px] text-slate-500 text-left bg-slate-50 p-2 rounded border border-slate-100">
                                      <p className="font-bold text-slate-700 flex items-center gap-1 mb-1"><Clock className="w-3 h-3"/> Resolvido em:</p>
                                      {new Date(req.data_atendimento).toLocaleDateString('pt-BR')} às {new Date(req.data_atendimento).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                      {req.observacoes_atendimento && <p className="mt-1 italic border-t pt-1 border-slate-200">{req.observacoes_atendimento}</p>}
                                  </div>
                              )}
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

      </div>
    </AppLayout>
  );
}