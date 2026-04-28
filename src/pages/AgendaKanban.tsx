import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText,
  KanbanSquare, 
  Plus, MoreVertical, Clock, AlertTriangle, Calendar as CalendarIcon, User, Search, Settings, Layers, FolderKanban, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Workflow = { id: string; nome: string; descricao: string };
type Coluna = { id: string; workflow_id: string; nome: string; ordem: number; status_global: string };
type Card = { id: string; workflow_id: string; coluna_id: string; titulo: string; descricao: string; responsavel_nome: string; responsavel_email: string; prioridade: string; data_vencimento: string; kanban_colunas?: { status_global: string, nome: string }; kanban_workflows?: { nome: string } };

const STATUS_GLOBAIS = ["Backlog", "Andamento", "Aguardando", "Concluído"];

export default function AgendaKanban() {
  const [usuarioAtual, setUsuarioAtual] = useState<any>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [colunas, setColunas] = useState<Coluna[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [workflowAtivo, setWorkflowAtivo] = useState<string>("global");
  
  // Modais
  const [modalWF, setModalWF] = useState(false);
  const [modalColuna, setModalColuna] = useState(false);
  const [modalCard, setModalCard] = useState(false);
  const [cardSendoEditado, setCardSendoEditado] = useState<Card | null>(null);

  // Forms
  const [nomeWf, setNomeWf] = useState("");
  const [nomeColuna, setNomeColuna] = useState("");
  const [statusGlobalColuna, setStatusGlobalColuna] = useState("Backlog");
  
  const [cardForm, setCardForm] = useState({ titulo: "", descricao: "", responsavel: "", prioridade: "Normal", vencimento: "", coluna_id: "" });

  useEffect(() => {
    fetchInitData();
  }, []);

  useEffect(() => {
    fetchQuadro();
  }, [workflowAtivo]);

  const fetchInitData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUsuarioAtual(user);
    const { data } = await supabase.from('kanban_workflows').select('*').order('criado_em');
    if (data) setWorkflows(data);
  };

  const fetchQuadro = async () => {
    if (workflowAtivo === "global") {
      const [colsRes, cardsRes] = await Promise.all([
        supabase.from('kanban_colunas').select('*'),
        supabase.from('kanban_cards').select('*, kanban_colunas(status_global, nome), kanban_workflows(nome)')
      ]);
      if (colsRes.data) setColunas(colsRes.data);
      if (cardsRes.data) {
        const meusCards = cardsRes.data.filter(c => c.responsavel_email === usuarioAtual?.email || !c.responsavel_email);
        setCards(meusCards);
      }
    } else {
      const [colsRes, cardsRes] = await Promise.all([
        supabase.from('kanban_colunas').select('*').eq('workflow_id', workflowAtivo).order('ordem'),
        supabase.from('kanban_cards').select('*, kanban_colunas(status_global, nome), kanban_workflows(nome)').eq('workflow_id', workflowAtivo)
      ]);
      if (colsRes.data) setColunas(colsRes.data);
      if (cardsRes.data) setCards(cardsRes.data);
    }
  };

  const criarWorkflow = async () => {
    if (!nomeWf) return;
    const { data, error } = await supabase.from('kanban_workflows').insert([{ nome: nomeWf }]).select().single();
    if (!error && data) {
      setWorkflows([...workflows, data]);
      setWorkflowAtivo(data.id);
      setModalWF(false); setNomeWf("");
    }
  };

  const criarColuna = async () => {
    if (!nomeColuna || workflowAtivo === "global") return;
    const ordem = colunas.length;
    const { error } = await supabase.from('kanban_colunas').insert([{ workflow_id: workflowAtivo, nome: nomeColuna, status_global: statusGlobalColuna, ordem }]);
    if (!error) { setModalColuna(false); setNomeColuna(""); fetchQuadro(); }
  };

  const salvarCard = async () => {
    if (!cardForm.titulo || !cardForm.coluna_id) return alert("Título e Coluna são obrigatórios.");
    
    //vincula coluna a wf
    const colSelecionada = colunas.find(c => c.id === cardForm.coluna_id);
    const wfId = colSelecionada?.workflow_id || workflowAtivo;

    const payload = {
      workflow_id: wfId,
      coluna_id: cardForm.coluna_id,
      titulo: cardForm.titulo,
      descricao: cardForm.descricao,
      responsavel_nome: cardForm.responsavel || usuarioAtual?.user_metadata?.full_name || "Usuário",
      responsavel_email: usuarioAtual?.email,
      prioridade: cardForm.prioridade,
      data_vencimento: cardForm.vencimento || null,
      atualizado_em: new Date().toISOString()
    };

    if (cardSendoEditado) {
      await supabase.from('kanban_cards').update(payload).eq('id', cardSendoEditado.id);
    } else {
      await supabase.from('kanban_cards').insert([payload]);
    }
    
    setModalCard(false); setCardSendoEditado(null);
    setCardForm({ titulo: "", descricao: "", responsavel: "", prioridade: "Normal", vencimento: "", coluna_id: "" });
    fetchQuadro();
  };

  const abrirModalCard = (card?: Card, defaultColId?: string) => {
    if (card) {
      setCardSendoEditado(card);
      setCardForm({ titulo: card.titulo, descricao: card.descricao || "", responsavel: card.responsavel_nome || "", prioridade: card.prioridade || "Normal", vencimento: card.data_vencimento ? card.data_vencimento.split('T')[0] : "", coluna_id: card.coluna_id });
    } else {
      setCardSendoEditado(null);
      setCardForm({ titulo: "", descricao: "", responsavel: "", prioridade: "Normal", vencimento: "", coluna_id: defaultColId || (colunas[0]?.id || "") });
    }
    setModalCard(true);
  };

  const deletarCard = async (id: string) => {
    if(!confirm("Excluir este card?")) return;
    await supabase.from('kanban_cards').delete().eq('id', id);
    fetchQuadro();
    setModalCard(false);
  };

  // --- DRAG AND DROP NATIVO ---
  const handleDragStart = (e: React.DragEvent, card: Card) => {
    e.dataTransfer.setData("cardId", card.id);
  };

  const handleDrop = async (e: React.DragEvent, dropTargetId: string, isGlobal: boolean) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("cardId");
    if (!cardId) return;

    const cardMovido = cards.find(c => c.id === cardId);
    if (!cardMovido) return;

    let novaColunaId = dropTargetId;

    // Magia da Visão Global: Se estou soltando no "Concluído" global, preciso achar a coluna do workflow original que equivale a "Concluído"
    if (isGlobal) {
      const statusGlobalAlvo = dropTargetId; // Neste caso, o dropTargetId é o nome do status global
      const colunaEquivalente = colunas.find(c => c.workflow_id === cardMovido.workflow_id && c.status_global === statusGlobalAlvo);
      
      if (!colunaEquivalente) {
        return alert(`Atenção: O fluxo original deste card não possui nenhuma coluna mapeada para o status "${statusGlobalAlvo}".`);
      }
      novaColunaId = colunaEquivalente.id;
    }

    if (cardMovido.coluna_id === novaColunaId) return;

    // Atualização otimista na UI
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, coluna_id: novaColunaId, kanban_colunas: { ...c.kanban_colunas, status_global: isGlobal ? dropTargetId : (colunas.find(x => x.id === novaColunaId)?.status_global || 'Backlog') } as any } : c));

    // Atualização no banco
    await supabase.from('kanban_cards').update({ coluna_id: novaColunaId, atualizado_em: new Date().toISOString() }).eq('id', cardId);
  };

  // --- RENDERIZAÇÃO DAS COLUNAS (GLOBAL OU ESPECÍFICA) ---
  const getColunasRenderizacao = () => {
    if (workflowAtivo === "global") {
      return STATUS_GLOBAIS.map(status => ({
        id: status, nome: status, isGlobal: true, cards: cards.filter(c => c.kanban_colunas?.status_global === status)
      }));
    } else {
      return colunas.map(col => ({
        id: col.id, nome: col.nome, isGlobal: false, statusBadge: col.status_global, cards: cards.filter(c => c.coluna_id === col.id)
      }));
    }
  };

  const colunasAtivas = getColunasRenderizacao();

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-6rem)] max-w-[1600px] mx-auto overflow-hidden bg-slate-50 rounded-xl border shadow-sm">
        
        {/* MENU LATERAL: WORKFLOWS */}
        <div className="w-64 bg-slate-900 text-slate-300 flex flex-col">
          <div className="p-5 border-b border-slate-800">
            <h2 className="text-white font-bold flex items-center gap-2 text-lg"><KanbanSquare className="w-5 h-5 text-indigo-400"/> Agenda Kanban</h2>
          </div>
          
          <div className="p-3 overflow-y-auto flex-1 space-y-1 custom-scrollbar">
            <button onClick={() => setWorkflowAtivo("global")} className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${workflowAtivo === "global" ? "bg-indigo-600 text-white font-bold" : "hover:bg-slate-800 hover:text-white"}`}>
              <Layers className="w-4 h-4" /> Programação (Global)
            </button>
            
            <div className="pt-4 pb-2">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Seus Workflows</span>
            </div>

            {workflows.map(wf => (
              <button key={wf.id} onClick={() => setWorkflowAtivo(wf.id)} className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-sm ${workflowAtivo === wf.id ? "bg-slate-800 text-white font-semibold shadow-inner" : "hover:bg-slate-800 hover:text-white"}`}>
                <FolderKanban className="w-4 h-4 opacity-70" /> <span className="truncate">{wf.nome}</span>
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-slate-800">
            <Button onClick={() => setModalWF(true)} variant="outline" className="w-full bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white gap-2">
              <Plus className="w-4 h-4" /> Criar Fluxo
            </Button>
          </div>
        </div>

        {/* ÁREA DO KANBAN */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header do Quadro */}
          <div className="bg-white p-4 border-b flex justify-between items-center shadow-sm z-10">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {workflowAtivo === "global" ? "Programação da Semana" : workflows.find(w => w.id === workflowAtivo)?.nome}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {workflowAtivo === "global" ? "Visão unificada mapeada por status global. Mostrando suas tarefas." : "Gerencie as etapas e cards deste processo."}
              </p>
            </div>
            <div className="flex gap-2">
              {workflowAtivo !== "global" && (
                <Button onClick={() => setModalColuna(true)} variant="outline" className="gap-2 border-dashed border-slate-300 text-slate-600 hover:bg-slate-50"><Plus className="w-4 h-4"/> Nova Coluna</Button>
              )}
              <Button onClick={() => abrirModalCard()} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md"><Plus className="w-4 h-4"/> Novo Card</Button>
            </div>
          </div>

          {/* O Board de Fato */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar flex gap-6">
            {colunasAtivas.map(col => (
              <div 
                key={col.id} 
                className="w-80 shrink-0 flex flex-col bg-slate-100/50 rounded-xl border border-slate-200/60 max-h-full"
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, col.id, col.isGlobal)}
              >
                {/* Header da Coluna */}
                <div className="p-3 border-b border-slate-200/60 bg-slate-100 rounded-t-xl flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-700">{col.nome}</h3>
                    <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{col.cards.length}</span>
                  </div>
                  {!col.isGlobal && (
                    <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">{col.statusBadge}</span>
                  )}
                </div>

                {/* Área de Drop dos Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {col.cards.map(card => (
                    <div 
                      key={card.id} 
                      draggable 
                      onDragStart={(e) => handleDragStart(e, card)}
                      onClick={() => abrirModalCard(card)}
                      className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md cursor-grab active:cursor-grabbing transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${card.prioridade === 'Emergência' || card.prioridade === 'Urgente' ? 'bg-red-50 text-red-600 border border-red-100' : card.prioridade === 'Alta' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                          {card.prioridade}
                        </span>
                        {card.data_vencimento && (
                          <span className={`flex items-center gap-1 text-[10px] font-bold ${new Date(card.data_vencimento) < new Date() ? 'text-red-500' : 'text-slate-400'}`}>
                            <CalendarIcon className="w-3 h-3"/> {new Date(card.data_vencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                          </span>
                        )}
                      </div>
                      
                      <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{card.titulo}</h4>
                      {workflowAtivo === "global" && card.kanban_workflows?.nome && (
                        <p className="text-[10px] text-indigo-600 font-semibold mb-2">De: {card.kanban_workflows.nome}</p>
                      )}
                      
                      {card.descricao && <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">{card.descricao}</p>}
                      
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-50 mt-auto">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[9px]">
                          {card.responsavel_nome.substring(0,2).toUpperCase()}
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 truncate">{card.responsavel_nome}</span>
                      </div>
                    </div>
                  ))}
                  
                  {col.cards.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400 font-medium">
                      Solte cards aqui
                    </div>
                  )}
                </div>

                {!col.isGlobal && (
                  <div className="p-2 bg-slate-100 border-t border-slate-200/60 rounded-b-xl">
                    <Button variant="ghost" className="w-full text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 h-8 gap-2 text-xs" onClick={() => abrirModalCard(undefined, col.id)}>
                      <Plus className="w-3 h-3"/> Adicionar Card
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL: NOVO WORKFLOW */}
      {modalWF && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center animate-in fade-in">
          <div className="bg-white p-6 rounded-xl shadow-xl w-[400px]">
            <h3 className="font-bold text-lg mb-4">Criar Novo Workflow</h3>
            <div className="space-y-4 mb-6">
              <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Nome do Processo</label><Input value={nomeWf} onChange={e => setNomeWf(e.target.value)} placeholder="Ex: Central de Compras" autoFocus/></div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setModalWF(false)}>Cancelar</Button><Button className="bg-indigo-600 text-white" onClick={criarWorkflow}>Salvar</Button></div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA COLUNA */}
      {modalColuna && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center animate-in fade-in">
          <div className="bg-white p-6 rounded-xl shadow-xl w-[400px]">
            <h3 className="font-bold text-lg mb-1">Nova Coluna (Etapa)</h3>
            <p className="text-xs text-slate-500 mb-4">Vincule a etapa a um Status Global para a visão da Programação.</p>
            <div className="space-y-4 mb-6">
              <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Nome da Etapa</label><Input value={nomeColuna} onChange={e => setNomeColuna(e.target.value)} placeholder="Ex: Cotar Preços" autoFocus/></div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-indigo-600 uppercase flex items-center gap-1"><Settings className="w-3 h-3"/> Mapeamento Global</label>
                <Select value={statusGlobalColuna} onValueChange={setStatusGlobalColuna}>
                  <SelectTrigger className="z-[99999]"><SelectValue/></SelectTrigger>
                  <SelectContent className="z-[99999]">
                    {STATUS_GLOBAIS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setModalColuna(false)}>Cancelar</Button><Button className="bg-indigo-600 text-white" onClick={criarColuna}>Adicionar</Button></div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO/EDITAR CARD */}
      {modalCard && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center animate-in fade-in p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600"/> {cardSendoEditado ? "Editar Tarefa" : "Nova Tarefa"}</h3>
              <Button variant="ghost" size="icon" onClick={() => setModalCard(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5"/></Button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">O que precisa ser feito? *</label>
                <Input value={cardForm.titulo} onChange={e => setCardForm({...cardForm, titulo: e.target.value})} placeholder="Título resumido..." className="text-base font-medium h-10" autoFocus/>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Coluna / Etapa Atual</label>
                  <Select value={cardForm.coluna_id} onValueChange={v => setCardForm({...cardForm, coluna_id: v})}>
                    <SelectTrigger className="z-[99999]"><SelectValue placeholder="Selecione a coluna..."/></SelectTrigger>
                    <SelectContent className="z-[99999]">
                      {(workflowAtivo === "global" ? colunas : colunas.filter(c => c.workflow_id === workflowAtivo)).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome} {workflowAtivo === "global" && `(Mapeado: ${c.status_global})`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Responsável</label>
                  <Input value={cardForm.responsavel} onChange={e => setCardForm({...cardForm, responsavel: e.target.value})} placeholder="Nome de quem vai executar" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Data de Vencimento</label>
                  <Input type="date" value={cardForm.vencimento} onChange={e => setCardForm({...cardForm, vencimento: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Prioridade</label>
                  <Select value={cardForm.prioridade} onValueChange={v => setCardForm({...cardForm, prioridade: v})}>
                    <SelectTrigger className="z-[99999]"><SelectValue/></SelectTrigger>
                    <SelectContent className="z-[99999]">
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Urgente">Urgente</SelectItem>
                      <SelectItem value="Emergência">Emergência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Detalhes e Informações Adicionais</label>
                <textarea value={cardForm.descricao} onChange={e => setCardForm({...cardForm, descricao: e.target.value})} className="w-full min-h-[120px] p-3 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Adicione links, observações ou checklist do que deve ser feito..."></textarea>
              </div>
            </div>

            <div className="p-5 border-t bg-slate-50 rounded-b-xl flex justify-between items-center">
              {cardSendoEditado ? (
                <Button variant="ghost" onClick={() => deletarCard(cardSendoEditado.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-2"><Trash2 className="w-4 h-4"/> Excluir Tarefa</Button>
              ) : <div></div>}
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setModalCard(false)}>Cancelar</Button>
                <Button className="bg-indigo-600 text-white shadow-sm" onClick={salvarCard}>Salvar Tarefa</Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}