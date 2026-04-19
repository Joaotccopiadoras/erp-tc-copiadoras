import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard, Plus, Clock, User, AlertCircle, Calendar, CheckCircle2, GripVertical, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Definição das Colunas do Kanban
const COLUNAS = [
  { id: 'Backlog', titulo: 'Backlog', cor: 'bg-slate-100', borda: 'border-slate-300' },
  { id: 'Andamento', titulo: 'Em Andamento', cor: 'bg-blue-50', borda: 'border-blue-300' },
  { id: 'Aguardando', titulo: 'Aguardando Terceiros', cor: 'bg-amber-50', borda: 'border-amber-300' },
  { id: 'Concluído', titulo: 'Concluído', cor: 'bg-emerald-50', borda: 'border-emerald-300' }
];

export default function AgendaKanban() {
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Estados do Formulário
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState("Normal");
  const [responsavel, setResponsavel] = useState("");
  const [dataPrevisao, setDataPrevisao] = useState("");

  useEffect(() => {
    // Quando a tela carrega, descobre quem é o usuário e puxa só as tarefas dele
    const loadUserAndTasks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        
        // Se o responsável estiver em branco, pré-preenche com o nome do usuário logado
        const nomeCompleto = user.user_metadata?.nome || user.user_metadata?.full_name || user.email?.split('@')[0];
        if (nomeCompleto) setResponsavel(nomeCompleto);

        fetchTarefas(user.id);
      }
    };

    loadUserAndTasks();
  }, []);

  // Agora a busca filtra estritamente pelo dono do Card
  const fetchTarefas = async (userId: string) => {
    const { data } = await supabase
      .from('ger_agenda_tarefas')
      .select('*')
      .eq('user_id', userId) // <-- O FILTRO MÁGICO AQUI
      .order('data_criacao', { ascending: false });
      
    if (data) setTarefas(data);
  };

  const salvarTarefa = async () => {
    if (!titulo) return alert("O título da tarefa é obrigatório.");
    if (!currentUserId) return alert("Erro de autenticação. Atualize a página.");

    const novaTarefa = {
      titulo,
      descricao,
      prioridade,
      responsavel,
      data_previsao: dataPrevisao || null,
      status: 'Backlog',
      user_id: currentUserId // <-- CARIMBA O CARD COM O SEU ID
    };

    const { error } = await supabase.from('ger_agenda_tarefas').insert([novaTarefa]);
    
    if (!error) {
      setMostrarForm(false);
      setTitulo(""); setDescricao(""); setDataPrevisao(""); setPrioridade("Normal");
      fetchTarefas(currentUserId);
    } else {
      alert("Erro ao salvar: " + error.message);
    }
  };

  const deletarTarefa = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este card?")) return;
    await supabase.from('ger_agenda_tarefas').delete().eq('id', id);
    if (currentUserId) fetchTarefas(currentUserId);
  };

  // ==========================================
  // LÓGICA DE DRAG AND DROP (ARRASTAR E SOLTAR)
  // ==========================================
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    setTimeout(() => {
      const element = document.getElementById(`card-${taskId}`);
      if (element) element.classList.add("opacity-50");
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent, taskId: string) => {
    const element = document.getElementById(`card-${taskId}`);
    if (element) element.classList.remove("opacity-50");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, novoStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    
    const tarefa = tarefas.find(t => t.id === taskId);
    if (!tarefa || tarefa.status === novoStatus) return;

    // Atualização Visual Imediata
    const tarefasAtualizadas = tarefas.map(t => {
      if (t.id === taskId) {
        return { ...t, status: novoStatus, data_conclusao: novoStatus === 'Concluído' ? new Date().toISOString() : null };
      }
      return t;
    });
    setTarefas(tarefasAtualizadas);

    // Salva no Supabase
    const payload: any = { status: novoStatus };
    if (novoStatus === 'Concluído') payload.data_conclusao = new Date().toISOString();
    
    await supabase.from('ger_agenda_tarefas').update(payload).eq('id', taskId);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto mb-12 h-full flex flex-col">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <LayoutDashboard className="w-6 h-6 text-indigo-600" /> Minha Agenda (Kanban)
            </h1>
            <p className="text-slate-500">Gestão privada das suas tarefas e processos diários.</p>
          </div>
          <Button onClick={() => setMostrarForm(!mostrarForm)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <Plus className="w-4 h-4" /> Novo Card / Tarefa
          </Button>
        </div>

        {/* FORMULÁRIO DE NOVA TAREFA */}
        {mostrarForm && (
          <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-md animate-in slide-in-from-top-4 duration-200">
            <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Criar Novo Card</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Título da Tarefa *</label>
                <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="O que precisa ser feito?" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Responsável</label>
                <Input value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Quem vai fazer?" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Prioridade</label>
                <Select value={prioridade} onValueChange={setPrioridade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-3">
                <label className="text-xs font-bold text-slate-500 uppercase">Descrição / Detalhes</label>
                <Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Adicione links, orientações..." />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Data Limite (Previsão)</label>
                <Input type="date" value={dataPrevisao} onChange={e => setDataPrevisao(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setMostrarForm(false)}>Cancelar</Button>
              <Button onClick={salvarTarefa} className="bg-indigo-600 hover:bg-indigo-700 text-white">Criar Tarefa</Button>
            </div>
          </div>
        )}

        {/* BOARD KANBAN */}
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-6 h-full min-h-[600px] min-w-[1000px] items-start">
            
            {COLUNAS.map(coluna => {
              const tarefasDaColuna = tarefas.filter(t => t.status === coluna.id);

              return (
                <div 
                  key={coluna.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, coluna.id)}
                  className={`flex-1 min-w-[280px] rounded-xl border ${coluna.borda} ${coluna.cor} flex flex-col max-h-full overflow-hidden transition-colors`}
                >
                  <div className="p-3 border-b border-black/5 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                    <h3 className="font-bold text-slate-700 uppercase tracking-wide text-sm">{coluna.titulo}</h3>
                    <span className="bg-white text-slate-600 text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                      {tarefasDaColuna.length}
                    </span>
                  </div>

                  <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                    {tarefasDaColuna.length === 0 && (
                      <div className="border-2 border-dashed border-black/10 rounded-lg h-24 flex items-center justify-center text-slate-400 text-xs font-medium">
                        Solte cards aqui
                      </div>
                    )}

                    {tarefasDaColuna.map(tarefa => {
                      const corBadge = 
                        tarefa.prioridade === 'Urgente' ? 'bg-red-100 text-red-700 border-red-200' :
                        tarefa.prioridade === 'Alta' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        tarefa.prioridade === 'Baixa' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                        'bg-blue-50 text-blue-600 border-blue-100';

                      return (
                        <div
                          id={`card-${tarefa.id}`}
                          key={tarefa.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, tarefa.id)}
                          onDragEnd={(e) => handleDragEnd(e, tarefa.id)}
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all group relative"
                        >
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <div className="pl-4">
                            <div className="flex justify-between items-start mb-2">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${corBadge}`}>
                                {tarefa.prioridade}
                              </span>
                              <button onClick={() => deletarTarefa(tarefa.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            
                            <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{tarefa.titulo}</h4>
                            {tarefa.descricao && <p className="text-xs text-slate-500 line-clamp-2 mb-3">{tarefa.descricao}</p>}

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
                              {tarefa.responsavel ? (
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-200 uppercase">
                                    {tarefa.responsavel.charAt(0)}
                                  </div>
                                  <span className="truncate max-w-[100px]">{tarefa.responsavel}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Sem dono</span>
                              )}

                              {tarefa.status === 'Concluído' ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600"><CheckCircle2 className="w-3 h-3"/> Feito</span>
                              ) : tarefa.data_previsao ? (
                                <span className={`flex items-center gap-1 text-[10px] font-bold ${new Date(tarefa.data_previsao) < new Date(new Date().setHours(0,0,0,0)) ? 'text-red-500' : 'text-slate-400'}`}>
                                  <Calendar className="w-3 h-3"/> {new Date(tarefa.data_previsao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}