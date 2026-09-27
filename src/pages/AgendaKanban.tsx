import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, KanbanSquare, Plus, Calendar as CalendarIcon, Settings, Layers, FolderKanban, Trash2, X, Table as TableIcon, Loader2, Edit
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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
  const [exportando, setExportando] = useState(false);
  
  // Modais
  const [modalWF, setModalWF] = useState(false);
  const [modalColuna, setModalColuna] = useState(false);
  const [modalCard, setModalCard] = useState(false);
  const [cardSendoEditado, setCardSendoEditado] = useState<Card | null>(null);
  const [colunaSendoEditada, setColunaSendoEditada] = useState<Coluna | null>(null);

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
  }, [workflowAtivo, usuarioAtual]);

  const fetchInitData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUsuarioAtual(user);
    const { data } = await supabase.from('kanban_workflows').select('*').order('criado_em');
    if (data) setWorkflows(data);
  };

  const fetchQuadro = async () => {
    let currentUser = usuarioAtual;
    if (!currentUser) {
      const { data: { user } } = await supabase.auth.getUser();
      currentUser = user;
      if (user) setUsuarioAtual(user);
    }

    if (workflowAtivo === "global") {
      const [colsRes, cardsRes] = await Promise.all([
        supabase.from('kanban_colunas').select('*'),
        supabase.from('kanban_cards').select('*, kanban_colunas(status_global, nome), kanban_workflows(nome)')
      ]);
      if (colsRes.data) setColunas(colsRes.data);
      if (cardsRes.data) {
        const meusCards = cardsRes.data.filter(c => c.responsavel_email === currentUser?.email || !c.responsavel_email);
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

  const abrirEditarColuna = (col: Coluna) => {
    setColunaSendoEditada(col);
    setNomeColuna(col.nome);
    setStatusGlobalColuna(col.status_global);
    setModalColuna(true);
  };

  const deletarColuna = async (id: string, cardsCount: number) => {
    if (cardsCount > 0) {
      return alert("Não é possível excluir uma coluna que possui cards. Mova-os para outra etapa ou exclua-os primeiro.");
    }
    if (!window.confirm("Deseja realmente excluir esta etapa?")) return;
    
    try {
      const { error } = await supabase.from('kanban_colunas').delete().eq('id', id);
      if (error) throw error;
      fetchQuadro();
    } catch (error: any) {
      alert("Erro ao excluir coluna: " + error.message);
    }
  };

  const salvarColuna = async () => {
    if (!nomeColuna || workflowAtivo === "global") return;
    
    if (colunaSendoEditada) {
      const { error } = await supabase.from('kanban_colunas').update({ nome: nomeColuna, status_global: statusGlobalColuna }).eq('id', colunaSendoEditada.id);
      if (!error) { 
        setModalColuna(false); 
        setColunaSendoEditada(null);
        setNomeColuna(""); 
        fetchQuadro(); 
      } else {
        alert("Erro ao editar etapa: " + error.message);
      }
    } else {
      const ordem = colunas.length;
      const { error } = await supabase.from('kanban_colunas').insert([{ workflow_id: workflowAtivo, nome: nomeColuna, status_global: statusGlobalColuna, ordem }]);
      if (!error) { 
        setModalColuna(false); 
        setNomeColuna(""); 
        fetchQuadro(); 
      } else {
        alert("Erro ao criar etapa: " + error.message);
      }
    }
  };

  const salvarCard = async () => {
    if (!cardForm.titulo || !cardForm.coluna_id) return alert("Título e Coluna/Etapa são obrigatórios.");
    
    let finalColunaId = cardForm.coluna_id;
    let finalWfId = workflowAtivo;

    if (workflowAtivo === "global") {
      if (cardSendoEditado) {
        // Editando na Visão Global
        const statusGlobalAlvo = cardForm.coluna_id;
        finalWfId = cardSendoEditado.workflow_id;
        let colunaEquivalente = colunas.find(c => c.workflow_id === finalWfId && c.status_global === statusGlobalAlvo);

        // Se não existir, cria automaticamente para não travar o usuário
        if (!colunaEquivalente) {
          const ordem = colunas.filter(c => c.workflow_id === finalWfId).length;
          const { data: newCol } = await supabase.from('kanban_colunas').insert([{
            workflow_id: finalWfId, nome: statusGlobalAlvo, status_global: statusGlobalAlvo, ordem
          }]).select().single();
          if (newCol) colunaEquivalente = newCol;
        }
        
        if (colunaEquivalente) finalColunaId = colunaEquivalente.id;
      } else {
        // Criando Novo na Visão Global
        let wfGeral = workflows.find(w => w.nome === "Tarefas Avulsas");
        if (!wfGeral) {
          const { data: newWf } = await supabase.from('kanban_workflows').insert([{ nome: "Tarefas Avulsas" }]).select().single();
          if (newWf) { wfGeral = newWf; setWorkflows([...workflows, newWf]); }
        }
        if (wfGeral) {
          finalWfId = wfGeral.id;
          let colGeral = colunas.find(c => c.workflow_id === wfGeral!.id && c.status_global === cardForm.coluna_id);
          if (!colGeral) {
            const { data: newCol } = await supabase.from('kanban_colunas').insert([{ workflow_id: wfGeral.id, nome: cardForm.coluna_id, status_global: cardForm.coluna_id, ordem: STATUS_GLOBAIS.indexOf(cardForm.coluna_id) }]).select().single();
            if (newCol) { colGeral = newCol; }
          }
          if (colGeral) finalColunaId = colGeral.id;
        }
      }
    } else {
      const colSelecionada = colunas.find(c => c.id === cardForm.coluna_id);
      finalWfId = colSelecionada?.workflow_id || workflowAtivo;
    }

    const payload = {
      workflow_id: finalWfId,
      coluna_id: finalColunaId,
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
      // Se estiver na visão global, o form carrega o nome do Status Global (ex: "Andamento"). 
      // Se não, carrega o ID da coluna específica.
      const initialCol = workflowAtivo === "global" ? (card.kanban_colunas?.status_global || "Backlog") : card.coluna_id;
      
      setCardForm({ 
        titulo: card.titulo, 
        descricao: card.descricao || "", 
        responsavel: card.responsavel_nome || "", 
        prioridade: card.prioridade || "Normal", 
        vencimento: card.data_vencimento ? card.data_vencimento.split('T')[0] : "", 
        coluna_id: initialCol 
      });
    } else {
      setCardSendoEditado(null);
      setCardForm({ 
        titulo: "", 
        descricao: "", 
        responsavel: "", 
        prioridade: "Normal", 
        vencimento: "", 
        coluna_id: workflowAtivo === "global" ? "Backlog" : (defaultColId || (colunas[0]?.id || "")) 
      });
    }
    setModalCard(true);
  };

  const deletarCard = async (id: string) => {
    if(!window.confirm("Excluir este card?")) return;
    await supabase.from('kanban_cards').delete().eq('id', id);
    fetchQuadro();
    setModalCard(false);
  };

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

    if (isGlobal) {
      const statusGlobalAlvo = dropTargetId;
      let colunaEquivalente = colunas.find(c => c.workflow_id === cardMovido.workflow_id && c.status_global === statusGlobalAlvo);
      
      // Criação Inteligente: Se não houver coluna equivalente, cria automaticamente em vez de bloquear
      if (!colunaEquivalente) {
        const ordem = colunas.filter(c => c.workflow_id === cardMovido.workflow_id).length;
        const { data: newCol } = await supabase.from('kanban_colunas').insert([{
            workflow_id: cardMovido.workflow_id, nome: statusGlobalAlvo, status_global: statusGlobalAlvo, ordem
        }]).select().single();

        if (newCol) {
           colunaEquivalente = newCol;
           setColunas(prev => [...prev, newCol]); // Update local
        } else {
           return alert(`Erro ao mover: O fluxo original não possui etapa para "${statusGlobalAlvo}".`);
        }
      }
      novaColunaId = colunaEquivalente.id;
    }

    if (cardMovido.coluna_id === novaColunaId) return;

    setCards(prev => prev.map(c => c.id === cardId ? { ...c, coluna_id: novaColunaId, kanban_colunas: { ...c.kanban_colunas, status_global: isGlobal ? dropTargetId : (colunas.find(x => x.id === novaColunaId)?.status_global || 'Backlog') } as any } : c));
    await supabase.from('kanban_cards').update({ coluna_id: novaColunaId, atualizado_em: new Date().toISOString() }).eq('id', cardId);
  };

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

  // EXPORTAÇÕES (MANTIDAS)
  const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  };

  const formatarData = (dataStr: string) => {
    if (!dataStr) return "—";
    return new Date(dataStr).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
  };

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const doc = new jsPDF("landscape");
      const logoData = await getBase64ImageFromUrl("/logo.png");
      const pesoStatus: Record<string, number> = { "CONCLUÍDO": 1, "ANDAMENTO": 2, "AGUARDANDO": 3, "BACKLOG": 4 };

      const dadosOrdenados = [...cards].sort((a, b) => {
        const respA = a.responsavel_nome || "Sem Responsável";
        const respB = b.responsavel_nome || "Sem Responsável";
        if (respA < respB) return -1;
        if (respA > respB) return 1;
        const stA = formatarStatus(a.kanban_colunas?.status_global || "BACKLOG");
        const stB = formatarStatus(b.kanban_colunas?.status_global || "BACKLOG");
        const ordemA = pesoStatus[stA] || 99;
        const ordemB = pesoStatus[stB] || 99;
        if (ordemA !== ordemB) return ordemA - ordemB;
        return new Date(a.data_vencimento || 0).getTime() - new Date(b.data_vencimento || 0).getTime();
      });

      const tableColumn = ["Workflow / Etapa", "Título do Card", "Responsável", "Prioridade", "Vencimento", "Status Global", "Resumo/Obs"];
      const tableRows: any[] = [];
      let grupoAtual = null;

      dadosOrdenados.forEach(item => {
        let valGrupo = item.responsavel_nome || "Sem Responsável";
        if (valGrupo !== grupoAtual) {
          tableRows.push([{
            content: `Responsável: ${valGrupo}`, colSpan: 7, 
            styles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'left' }
          }]);
          grupoAtual = valGrupo;
        }
        tableRows.push([
          `${item.kanban_workflows?.nome || "-"} / ${item.kanban_colunas?.nome || "-"}`, 
          item.titulo || "-", item.responsavel_nome || "-", item.prioridade || "-", formatarData(item.data_vencimento), 
          item.kanban_colunas?.status_global || "-", item.descricao || "-"
        ]);
      });

      autoTable(doc, {
        head: [tableColumn], body: tableRows, startY: 40, margin: { top: 40, bottom: 40, left: 14, right: 14 },
        theme: 'grid', styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2, overflow: 'linebreak', lineColor: [200, 200, 200], lineWidth: 0.1 },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didDrawPage: function (data) {
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setFillColor(255, 255, 255);
          doc.rect(0, 0, pageWidth, 38, "F"); 
          doc.rect(0, pageHeight - 35, pageWidth, 35, "F");

          if (logoData) doc.addImage(logoData, "PNG", 14, 10, 40, 15);
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16);
          doc.setTextColor(0, 0, 0);
          doc.text("Agenda Kanban TC Copiadoras", pageWidth / 2, 20, { align: "center" });

          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(14, 28, pageWidth - 14, 28);

          const today = new Date();
          const dia = String(today.getDate()).padStart(2, '0');
          const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(`Belém, ${dia} de ${meses[today.getMonth()]} de ${today.getFullYear()}.`, pageWidth - 14, 25, { align: "right" });

          doc.setFillColor(0, 0, 0);
          doc.rect(0, pageHeight - 25, pageWidth, 25, "F");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(255, 255, 255);
          doc.text("Av. Gov. José Malcher, 2266.\nSão Brás, Belém - PA. CEP: 66060-232\n\nCNPJ: 07.679.989/0001-50 | I.E.: 15.250.057-0", 14, pageHeight - 16);
          doc.text("(91) 988159-2777\n(91) 3366-5100\nequipetc@tccopiadoras.com.br", pageWidth - 14, pageHeight - 16, { align: "right" });
        },
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 5 && data.cell.raw) {
            const status = String(data.cell.raw).toUpperCase();
            if (status === 'CONCLUÍDO') { data.cell.styles.textColor = [21, 128, 61]; data.cell.styles.fontStyle = 'bold'; } 
            else if (status === 'AGUARDANDO') { data.cell.styles.textColor = [161, 98, 7]; data.cell.styles.fontStyle = 'bold'; } 
            else if (status === 'ANDAMENTO') { data.cell.styles.textColor = [29, 78, 216]; data.cell.styles.fontStyle = 'bold'; }
          }
        }
      });
      doc.save("Agenda_Kanban_TC_Copiadoras.pdf");
    } catch (error) { alert("Erro ao gerar PDF."); } finally { setExportando(false); }
  };

  const formatarStatus = (str: string) => str ? str.toUpperCase() : "";

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Kanban Cards");
      const logoBase64 = await getBase64ImageFromUrl("/logo.png");
      let startRow = 1;
      
      if (logoBase64) {
        const imageId = workbook.addImage({ base64: logoBase64, extension: "png" });
        worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 50 } });
        startRow = 5; 
      }
      
      worksheet.getRow(startRow).values = ["Etapa/Coluna", "Título", "Responsável", "Prioridade", "Vencimento", "Workflow", "Status Global", "Resumo/Descrição"];
      worksheet.getRow(startRow).font = { bold: true };
      
      cards.forEach((item) => {
        worksheet.addRow([
          item.kanban_colunas?.nome || "-", item.titulo || "-", item.responsavel_nome || "-", item.prioridade || "-", 
          formatarData(item.data_vencimento), item.kanban_workflows?.nome || "-", item.kanban_colunas?.status_global || "-", item.descricao || "-"
        ]);
      });
      
      worksheet.columns.forEach(column => { column.width = 20; });
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), "Agenda_Kanban_TC_Copiadoras.xlsx");
    } catch (error) { alert("Erro ao gerar Excel."); } finally { setExportando(false); }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-6rem)] max-w-[1600px] mx-auto overflow-hidden bg-slate-50 rounded-xl border shadow-sm">
        
        {/* MENU LATERAL */}
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

            {workflows.filter(wf => wf.nome !== "Tarefas Avulsas").map(wf => (
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
          <div className="bg-white p-4 border-b flex justify-between items-center shadow-sm z-10 flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {workflowAtivo === "global" ? "Programação da Semana" : workflows.find(w => w.id === workflowAtivo)?.nome}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {workflowAtivo === "global" ? "Visão unificada mapeada por status global. Mostrando suas tarefas." : "Gerencie as etapas e cards deste processo."}
              </p>
            </div>
            
            <div className="flex gap-2 items-center flex-wrap">
              <Button variant="outline" size="sm" onClick={exportarExcel} disabled={exportando || cards.length === 0} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2 font-bold shadow-sm">
                {exportando ? <Loader2 className="h-4 w-4 animate-spin"/> : <TableIcon className="h-4 w-4" />} Excel
              </Button>
              <Button variant="outline" size="sm" onClick={exportarPDF} disabled={exportando || cards.length === 0} className="border-rose-200 text-rose-700 hover:bg-rose-50 gap-2 font-bold shadow-sm">
                {exportando ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileText className="h-4 w-4" />} PDF
              </Button>
              <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
              {workflowAtivo !== "global" && (
                <Button onClick={() => { setColunaSendoEditada(null); setNomeColuna(""); setStatusGlobalColuna("Backlog"); setModalColuna(true); }} variant="outline" size="sm" className="gap-2 border-dashed border-slate-300 text-slate-600 hover:bg-slate-50"><Plus className="w-4 h-4"/> Nova Etapa</Button>
              )}
              <Button onClick={() => abrirModalCard()} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md"><Plus className="w-4 h-4"/> Novo Card</Button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar flex gap-6">
            {colunasAtivas.map(col => (
              <div key={col.id} className="w-80 shrink-0 flex flex-col bg-slate-100/50 rounded-xl border border-slate-200/60 max-h-full" onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, col.id, col.isGlobal)}>
                
                {/* Header da Coluna */}
                <div className="p-3 border-b border-slate-200/60 bg-slate-100 rounded-t-xl flex justify-between items-center group">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-700">{col.nome}</h3>
                    <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{col.cards.length}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {!col.isGlobal && (
                      <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded group-hover:hidden">{col.statusBadge}</span>
                    )}
                    
                    {!col.isGlobal && (
                      <div className="hidden group-hover:flex items-center ml-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100" onClick={() => abrirEditarColuna(col as Coluna)}>
                          <Settings className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => deletarColuna(col.id, col.cards.length)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Área de Drop dos Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {col.cards.map(card => (
                    <div key={card.id} draggable onDragStart={(e) => handleDragStart(e, card)} onClick={() => abrirModalCard(card)} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md cursor-grab active:cursor-grabbing transition-all">
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
                    <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400 font-medium">Solte cards aqui</div>
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

      {/* MODAL: NOVA/EDITAR COLUNA */}
      {modalColuna && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center animate-in fade-in">
          <div className="bg-white p-6 rounded-xl shadow-xl w-[400px]">
            <h3 className="font-bold text-lg mb-1">{colunaSendoEditada ? "Editar Etapa" : "Nova Coluna (Etapa)"}</h3>
            <p className="text-xs text-slate-500 mb-4">Vincule a etapa a um Status Global para a visão da Programação.</p>
            <div className="space-y-4 mb-6">
              <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Nome da Etapa</label><Input value={nomeColuna} onChange={e => setNomeColuna(e.target.value)} placeholder="Ex: Cotar Preços" autoFocus/></div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-indigo-600 uppercase flex items-center gap-1"><Settings className="w-3 h-3"/> Mapeamento Global</label>
                <Select value={statusGlobalColuna} onValueChange={setStatusGlobalColuna}>
                  <SelectTrigger className="bg-white z-[99999]"><SelectValue/></SelectTrigger>
                  <SelectContent className="bg-white z-[99999]">
                    {STATUS_GLOBAIS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setModalColuna(false); setColunaSendoEditada(null); setNomeColuna(""); }}>Cancelar</Button>
              <Button className="bg-indigo-600 text-white" onClick={salvarColuna}>{colunaSendoEditada ? "Atualizar" : "Adicionar"}</Button>
            </div>
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
                    <SelectTrigger className="bg-white z-[99999]"><SelectValue placeholder="Selecione a coluna..."/></SelectTrigger>
                    <SelectContent className="bg-white z-[99999]">
                      {workflowAtivo === "global" ? (
                        /* APENAS as 4 opções globais quando editando/criando na Visão Global */
                        STATUS_GLOBAIS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)
                      ) : (
                        colunas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)
                      )}
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
                    <SelectTrigger className="bg-white z-[99999]"><SelectValue/></SelectTrigger>
                    <SelectContent className="bg-white z-[99999]">
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