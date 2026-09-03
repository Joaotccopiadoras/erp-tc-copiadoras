import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  CalendarRange,
  ChevronDown, 
  FileText,
  Filter,
  Loader2,
  Table as TableIcon,
  Trash2, 
  X } from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/AppLayout";

import { supabase } from "../integrations/supabase/client"; 

const PAGE_SIZE = 15;
const mapaStatus: Record<string, string> = { active: "ANDAMENTO", waiting: "AGUARDANDO", completed: "CONCLUÍDO" };
const formatarStatus = (status: string) => {
  if (!status) return "—";
  return mapaStatus[status.toLowerCase()] || status.toUpperCase();
};

function MultiSelectDropdown({ title, options, selected, onChange }: { title: string, options: string[], selected: string[], onChange: (val: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" onClick={() => setOpen(!open)} className="w-full justify-between bg-white text-left font-normal h-10 px-3 border-slate-200 hover:bg-slate-50 transition-colors">
        <span className="truncate text-slate-600">
          {selected.length === 0 ? title : <span className="font-bold text-indigo-600">{title} ({selected.length})</span>}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>
      {open && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2 max-h-60 overflow-y-auto custom-scrollbar">
          {options.length === 0 ? (
            <div className="p-2 text-sm text-slate-400 text-center italic">Nenhum dado...</div>
          ) : (
            options.map(opt => (
              <label key={opt} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors">
                <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" checked={selected.includes(opt)} onChange={(e) => { if (e.target.checked) onChange([...selected, opt]); else onChange(selected.filter(x => x !== opt)); }} />
                <span className="text-sm text-slate-700 truncate font-medium">{opt}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [allData, setAllData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);

  // estados filtros e ordenac
  const [filterLideres, setFilterLideres] = useState<string[]>([]);
  const [filterDepartamentos, setFilterDepartamentos] = useState<string[]>([]);
  const [filterSolicitantes, setFilterSolicitantes] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  
  const [dataEntradaInicio, setDataEntradaInicio] = useState("");
  const [dataEntradaFim, setDataEntradaFim] = useState("");
  const [dataPrevisaoInicio, setDataPrevisaoInicio] = useState("");
  const [dataPrevisaoFim, setDataPrevisaoFim] = useState("");
  const [dataConclusaoInicio, setDataConclusaoInicio] = useState("");
  const [dataConclusaoFim, setDataConclusaoFim] = useState("");
  
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(0);

  const [selecionados, setSelecionados] = useState<number[]>([]);
  const toggleSelecao = (id: number) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const toggleTodos = (itensDaPagina: any[]) => {
    setSelecionados(selecionados.length === itensDaPagina.length ? [] : itensDaPagina.map(item => item.id));
  };
  const excluirEmLote = async () => {
    if (!window.confirm(`Tem certeza que deseja excluir ${selecionados.length} projetos definitivamente?`)) return;
    
    try {
      setLoading(true);
      const { error } = await supabase.from('programacao_tc').delete().in('id', selecionados);
      if (error) throw error;
    
      setAllData(prev => prev.filter(item => !selecionados.includes(item.id)));
      setSelecionados([]);
    } catch (error) {
      console.error("Erro ao excluir em lote:", error);
      alert("Erro ao excluir. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };


  // autosave
  useEffect(() => {
    const savedFilters = sessionStorage.getItem("agenda_ummense_filtros");
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        if (parsed.filterLideres) setFilterLideres(parsed.filterLideres);
        if (parsed.filterDepartamentos) setFilterDepartamentos(parsed.filterDepartamentos);
        if (parsed.filterSolicitantes) setFilterSolicitantes(parsed.filterSolicitantes);
        if (parsed.filterStatus) setFilterStatus(parsed.filterStatus);
        if (parsed.dataEntradaInicio) setDataEntradaInicio(parsed.dataEntradaInicio);
        if (parsed.dataEntradaFim) setDataEntradaFim(parsed.dataEntradaFim);
        if (parsed.dataPrevisaoInicio) setDataPrevisaoInicio(parsed.dataPrevisaoInicio);
        if (parsed.dataPrevisaoFim) setDataPrevisaoFim(parsed.dataPrevisaoFim);
        if (parsed.dataConclusaoInicio) setDataConclusaoInicio(parsed.dataConclusaoInicio);
        if (parsed.dataConclusaoFim) setDataConclusaoFim(parsed.dataConclusaoFim);
        if (parsed.sortConfig !== undefined) setSortConfig(parsed.sortConfig);
        if (parsed.page !== undefined) setPage(parsed.page);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const stateToSave = {
      filterLideres, filterDepartamentos, filterSolicitantes, filterStatus,
      dataEntradaInicio, dataEntradaFim, dataPrevisaoInicio, dataPrevisaoFim, dataConclusaoInicio, dataConclusaoFim,
      sortConfig, page
    };
    sessionStorage.setItem("agenda_ummense_filtros", JSON.stringify(stateToSave));
  }, [filterLideres, filterDepartamentos, filterSolicitantes, filterStatus, dataEntradaInicio, dataEntradaFim, dataPrevisaoInicio, dataPrevisaoFim, dataConclusaoInicio, dataConclusaoFim, sortConfig, page]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) return; 
        
        const { data, error } = await supabase.from('programacao_tc').select('*').order('data_entrada', { ascending: false });
        if (error) throw error;
        
        if (data) {
           const dadosFiltrados = data.filter(item => {
               if (!item.lider_email) return false; 
               return item.lider_email.toLowerCase().trim() === user.email?.toLowerCase().trim();
           });
           setAllData(dadosFiltrados); 
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const excluirRegistro = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este registro definitivamente?")) return;
    try {
      await supabase.from('programacao_tc').delete().eq('id', id);
      setAllData(prev => prev.filter(item => item.id !== id));
    } catch (error) { alert("Erro ao excluir. Tente novamente."); }
  };

  const filtered = useMemo(() => {
    let result = allData.filter((a) => {
      if (filterLideres.length > 0 && !filterLideres.includes(a.lider_card)) return false;
      if (filterDepartamentos.length > 0 && !filterDepartamentos.includes(a.departamento)) return false;
      if (filterSolicitantes.length > 0 && !filterSolicitantes.includes(a.solicitante)) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(formatarStatus(a.status))) return false;
      
      if (dataEntradaInicio && a.data_entrada < dataEntradaInicio) return false;
      if (dataEntradaFim && a.data_entrada > dataEntradaFim + "T23:59:59") return false;
      if (dataPrevisaoInicio && a.previsao_prazo < dataPrevisaoInicio) return false;
      if (dataPrevisaoFim && a.previsao_prazo > dataPrevisaoFim + "T23:59:59") return false;
      if (dataConclusaoInicio && a.data_conclusao < dataConclusaoInicio) return false;
      if (dataConclusaoFim && a.data_conclusao > dataConclusaoFim + "T23:59:59") return false;
      return true;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key]; let valB = b[sortConfig.key];
        if (sortConfig.key === 'status') { valA = formatarStatus(a.status); valB = formatarStatus(b.status); }
        if (!valA) valA = ""; if (!valB) valB = "";
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [allData, filterLideres, filterDepartamentos, filterSolicitantes, filterStatus, dataEntradaInicio, dataEntradaFim, dataPrevisaoInicio, dataPrevisaoFim, dataConclusaoInicio, dataConclusaoFim, sortConfig]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const hasFilters = filterLideres.length > 0 || filterDepartamentos.length > 0 || filterSolicitantes.length > 0 || filterStatus.length > 0 || dataEntradaInicio || dataEntradaFim || dataPrevisaoInicio || dataPrevisaoFim || dataConclusaoInicio || dataConclusaoFim;

  const clearFilters = () => {
    sessionStorage.removeItem("agenda_ummense_filtros");
    setFilterLideres([]); setFilterDepartamentos([]); setFilterSolicitantes([]); setFilterStatus([]);
    setDataEntradaInicio(""); setDataEntradaFim(""); setDataPrevisaoInicio(""); setDataPrevisaoFim(""); setDataConclusaoInicio(""); setDataConclusaoFim("");
    setPage(0); setSortConfig(null);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev && prev.key === key) return prev.direction === 'asc' ? { key, direction: 'desc' } : null; 
      return { key, direction: 'asc' };
    });
  };

  const uniqueLideres = [...new Set(allData.map((a) => a.lider_card).filter(Boolean))].sort();
  const uniqueDepartamentos = [...new Set(allData.map((a) => a.departamento).filter(Boolean))].sort();
  const uniqueSolicitantes = [...new Set(allData.map((a) => a.solicitante).filter(Boolean))].sort();
  const uniqueStatus = [...new Set(allData.map((a) => formatarStatus(a.status)).filter(s => s !== "—"))].sort();

  const formatarData = (dataStr: string) => {
    if (!dataStr) return "—";
    return new Date(dataStr).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
  };

  // Função Auxiliar para carregar a imagem de forma segura
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

  // ==========================================
  // EXPORTAÇÃO DE PDF
  // ==========================================
  const exportarPDF = async () => {
    setExportando(true);
    try {
      const doc = new jsPDF("landscape"); 
      const logoBase64 = await getBase64ImageFromUrl("/logo.png");
      
      const pesoStatus: Record<string, number> = { "CONCLUÍDO": 1, "ANDAMENTO": 2, "AGUARDANDO": 3 };

      const dadosOrdenados = [...filtered].sort((a, b) => {
        const liderA = a.lider_card || "Sem Responsável";
        const liderB = b.lider_card || "Sem Responsável";
        if (liderA < liderB) return -1;
        if (liderA > liderB) return 1;
        
        const stA = formatarStatus(a.status);
        const stB = formatarStatus(b.status);
        const ordemA = pesoStatus[stA] || 99; 
        const ordemB = pesoStatus[stB] || 99;
        if (ordemA !== ordemB) return ordemA - ordemB;

        const dataA = new Date(a.data_entrada || 0).getTime();
        const dataB = new Date(b.data_entrada || 0).getTime();
        return dataA - dataB;
      });

      const tableColumn = ["Entrada", "Previsão", "Conclusão", "Solicitante", "Projeto/Processo", "Depto", "Tarefa Atual", "Status", "Resumo/Obs"];
      const tableRows: any[] = [];
      
      let liderAtual: string | null = null; 

      dadosOrdenados.forEach(item => {
        const liderItem = item.lider_card || "Sem Responsável";
        if (liderItem !== liderAtual) {
          tableRows.push([{
            content: `Responsável: ${liderItem}`, colSpan: 9, 
            styles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'left' }
          }]);
          liderAtual = liderItem;
        }

        tableRows.push([
          formatarData(item.data_entrada), formatarData(item.previsao_prazo), formatarData(item.data_conclusao),
          item.solicitante || "-", item.processo_projeto || "-", item.departamento || "-",
          item.tarefa_atual || "-", formatarStatus(item.status), item.resumo_observacoes || "-"
        ]);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35, 
        margin: { bottom: 35 }, 
        theme: 'grid', 
        styles: { font: 'helvetica', fontSize: 7, cellPadding: 2, overflow: 'linebreak', lineColor: [200, 200, 200], lineWidth: 0.1 },
        columnStyles: {
          0: { halign: 'center' }, 1: { halign: 'center' }, 2: { halign: 'center' },
          5: { halign: 'center' }, 7: { halign: 'center' },
          8: { cellWidth: 40, halign: 'left' } 
        },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        
        didDrawPage: function () {
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();

          // --- CABEÇALHO ---
          if (logoBase64) {
            doc.addImage(logoBase64, "PNG", 14, 10, 40, 15);
          }
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16);
          doc.setTextColor(0, 0, 0);
          doc.text("Agenda TC Copiadoras", pageWidth / 2, 20, { align: "center" });
          
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(14, 28, pageWidth - 14, 28);

          // --- RODAPÉ ---
          doc.setFillColor(235, 235, 235);
          doc.rect(0, pageHeight - 25, pageWidth, 25, "F");

          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);

          doc.setTextColor(100, 100, 100);
          const col1Text = "Trav. Angustura 2813;\nMarco - Belém - PA - Brasil.\nCEP: 66.093-040\nF.: 055 (91) 3366-5107/5108\nFAX: 055 (91) 3366-5100 Wp: 055 (91) 98156-6556\nCNPJ: 07.679.989/0001-50   //   I.E.: 15.250.057-0";
          doc.text(col1Text, 14, pageHeight - 20);

          doc.setTextColor(59, 130, 246);
          const col2Text = "vendas@tccopiadoras.com.br\nvendas2@tccopiadoras.com.br\nlicitacoes1@tccopiadoras.com.br\nlicitacoes2@tccopiadoras.com.br\nlicitacoes3@tccopiadoras.com.br";
          doc.text(col2Text, pageWidth / 2 - 45, pageHeight - 20);

          const col3Text = "diretoria@tccopiadoras.com.br\nsuportetecnico@tccopiadoras.com.br\nsuportetecnico1@tccopiadoras.com.br\nsuportetecnico2@tccopiadoras.com.br\ntcservicos@tccopiadoras.com.br";
          doc.text(col3Text, pageWidth / 2 + 45, pageHeight - 20);
        },
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 7 && data.cell.raw && (data.row.raw as any[]).length > 1) {
            const status = data.cell.raw as string;
            if (status === 'CONCLUÍDO') { data.cell.styles.textColor = [21, 128, 61]; data.cell.styles.fontStyle = 'bold'; } 
            else if (status === 'AGUARDANDO') { data.cell.styles.textColor = [161, 98, 7]; data.cell.styles.fontStyle = 'bold'; } 
            else if (status === 'ANDAMENTO') { data.cell.styles.textColor = [29, 78, 216]; data.cell.styles.fontStyle = 'bold'; }
          }
        }
      });
      doc.save("Agenda_TC_Copiadoras.pdf");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF.");
    } finally {
      setExportando(false);
    }
  };

  // ==========================================
  // EXPORTAÇÃO EXCEL
  // ==========================================
  const exportarExcel = async () => {
    setExportando(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Projetos");
      const logoBase64 = await getBase64ImageFromUrl("/logo.png");
      
      let startRow = 1;
      
      if (logoBase64) {
        const imageId = workbook.addImage({ base64: logoBase64, extension: "png" });
        worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 50 } });
        startRow = 5; // Empurra a tabela para baixo se tiver logo
      }
      
      worksheet.getRow(startRow).values = ["Data Entrada", "Data Previsão", "Data Conclusão", "Líder", "Solicitante", "Projeto", "Departamento", "Tarefa Atual", "Status", "Resumo"];
      worksheet.getRow(startRow).font = { bold: true };
      
      filtered.forEach((item) => {
        worksheet.addRow([
          formatarData(item.data_entrada), formatarData(item.previsao_prazo), formatarData(item.data_conclusao),
          item.lider_card || "-", item.solicitante || "-", item.processo_projeto || "-",
          item.departamento || "-", item.tarefa_atual || "-", formatarStatus(item.status), item.resumo_observacoes || "-"
        ]);
      });
      
      worksheet.columns.forEach(column => { column.width = 18; });
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), "Acompanhamento_Projetos.xlsx");
    } catch (error) { 
      console.error("Erro ao gerar Excel:", error); 
      alert("Erro ao gerar Excel."); 
    } finally {
      setExportando(false);
    }
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key === key) return sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 inline ml-1" /> : <ArrowDown className="h-4 w-4 inline ml-1" />;
    return null;
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><CalendarRange className="w-6 h-6 text-indigo-600" /> Gestão de Projetos e Processos</h1>
            <p className="text-slate-500">Acompanhamento e rastreabilidade de atividades da Agenda (Ummense).</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Filter className="w-4 h-4 text-indigo-500"/> Filtros Avançados</h3>
            {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2 text-xs"><X className="h-3 w-3 mr-1" /> Limpar Tudo</Button>}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MultiSelectDropdown title="Líder" options={uniqueLideres} selected={filterLideres} onChange={setFilterLideres} />
            <MultiSelectDropdown title="Departamento" options={uniqueDepartamentos} selected={filterDepartamentos} onChange={setFilterDepartamentos} />
            <MultiSelectDropdown title="Solicitante" options={uniqueSolicitantes} selected={filterSolicitantes} onChange={setFilterSolicitantes} />
            <MultiSelectDropdown title="Status" options={uniqueStatus} selected={filterStatus} onChange={setFilterStatus} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="flex flex-col space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Período de Entrada</span>
              <div className="flex gap-2 items-center"><Input type="date" className="text-xs h-8 bg-white" value={dataEntradaInicio} onChange={e => {setDataEntradaInicio(e.target.value); setPage(0);}} /><span className="text-xs text-slate-400 font-medium">até</span><Input type="date" className="text-xs h-8 bg-white" value={dataEntradaFim} onChange={e => {setDataEntradaFim(e.target.value); setPage(0);}} /></div>
            </div>
            <div className="flex flex-col space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Período de Previsão</span>
              <div className="flex gap-2 items-center"><Input type="date" className="text-xs h-8 bg-white" value={dataPrevisaoInicio} onChange={e => {setDataPrevisaoInicio(e.target.value); setPage(0);}} /><span className="text-xs text-slate-400 font-medium">até</span><Input type="date" className="text-xs h-8 bg-white" value={dataPrevisaoFim} onChange={e => {setDataPrevisaoFim(e.target.value); setPage(0);}} /></div>
            </div>
            <div className="flex flex-col space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Período de Conclusão</span>
              <div className="flex gap-2 items-center"><Input type="date" className="text-xs h-8 bg-white" value={dataConclusaoInicio} onChange={e => {setDataConclusaoInicio(e.target.value); setPage(0);}} /><span className="text-xs text-slate-400 font-medium">até</span><Input type="date" className="text-xs h-8 bg-white" value={dataConclusaoFim} onChange={e => {setDataConclusaoFim(e.target.value); setPage(0);}} /></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200"><strong className="text-slate-800 text-base">{filtered.length}</strong> projetos listados</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportarExcel} disabled={loading || filtered.length === 0 || exportando} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2 font-bold shadow-sm">
              {exportando ? <Loader2 className="h-4 w-4 animate-spin"/> : <TableIcon className="h-4 w-4" />} Exportar Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportarPDF} disabled={loading || filtered.length === 0 || exportando} className="border-rose-200 text-rose-700 hover:bg-rose-50 gap-2 font-bold shadow-sm">
              {exportando ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileText className="h-4 w-4" />} Exportar PDF
            </Button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto min-h-[400px]">

            {selecionados.length > 0 && (
              <div className="bg-red-50 border-b border-red-100 p-3 px-6 flex justify-between items-center animate-in slide-in-from-top-2 mb-4 rounded-lg m-4">
                <span className="text-red-800 font-semibold">{selecionados.length} projeto(s) selecionado(s)</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelecionados([])} className="text-red-700 hover:bg-red-100">Desmarcar Todos</Button>
                  <Button size="sm" onClick={excluirEmLote} className="bg-red-600 hover:bg-red-700 text-white gap-2">
                    <Trash2 className="w-4 h-4" /> Excluir Selecionados
                  </Button>
                </div>
              </div>
            )}

            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow className="text-xs uppercase tracking-wider text-slate-600 hover:bg-slate-100">
                  <TableHead onClick={() => handleSort('data_entrada')} className="cursor-pointer font-semibold whitespace-nowrap p-4">Entrada {renderSortIcon('data_entrada')}</TableHead>
                  <TableHead onClick={() => handleSort('previsao_prazo')} className="cursor-pointer font-semibold whitespace-nowrap p-4">Previsão {renderSortIcon('previsao_prazo')}</TableHead>
                  <TableHead onClick={() => handleSort('solicitante')} className="cursor-pointer font-semibold p-4">Solicitante {renderSortIcon('solicitante')}</TableHead>
                  <TableHead onClick={() => handleSort('processo_projeto')} className="cursor-pointer font-semibold p-4">Projeto {renderSortIcon('processo_projeto')}</TableHead>
                  <TableHead onClick={() => handleSort('departamento')} className="cursor-pointer font-semibold p-4">Depto {renderSortIcon('departamento')}</TableHead>
                  <TableHead onClick={() => handleSort('lider_card')} className="cursor-pointer font-semibold p-4">Líder {renderSortIcon('lider_card')}</TableHead>
                  <TableHead onClick={() => handleSort('tarefa_atual')} className="cursor-pointer font-semibold p-4">Tarefa Atual {renderSortIcon('tarefa_atual')}</TableHead>
                  <TableHead onClick={() => handleSort('status')} className="cursor-pointer font-semibold text-center p-4">Status {renderSortIcon('status')}</TableHead>
                  <TableHead onClick={() => handleSort('data_conclusao')} className="cursor-pointer font-semibold whitespace-nowrap p-4">Conclusão {renderSortIcon('data_conclusao')}</TableHead>
                  <TableHead className="font-semibold p-4">Resumo</TableHead>
                  <TableHead className="font-semibold text-center p-4">Ação</TableHead>
                  <TableHead className="w-10 text-center">
                    <input 
                      type="checkbox"
                      checked={paginated.length > 0 && selecionados.length === paginated.length}
                      onChange={() => toggleTodos(paginated)}
                      className="rounded border-slate-300 w-4 h-4 cursor-pointer"
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {loading ? <TableRow><TableCell colSpan={12} className="text-center text-slate-400 font-medium py-12">Analisando banco de dados...</TableCell></TableRow> : paginated.length === 0 ? <TableRow><TableCell colSpan={12} className="text-center text-slate-400 font-medium py-12">Nenhum projeto corresponde aos filtros aplicados.</TableCell></TableRow> : paginated.map(a => (
                    <TableRow key={a.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="whitespace-nowrap text-sm font-medium text-slate-600 p-4">{formatarData(a.data_entrada)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm font-bold text-amber-600 p-4">{formatarData(a.previsao_prazo)}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700 p-4">{a.solicitante || "—"}</TableCell>
                      <TableCell className="font-bold text-sm text-slate-800 p-4">{a.processo_projeto || "—"}</TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium p-4">{a.departamento || "—"}</TableCell>
                      <TableCell className="text-xs font-bold text-indigo-700 p-4">{a.lider_card || "—"}</TableCell>
                      <TableCell className="text-xs text-slate-600 font-medium p-4">{a.tarefa_atual || "—"}</TableCell>
                      <TableCell className="text-center p-4"><span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border border-white ${a.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : a.status === 'waiting' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{formatarStatus(a.status)}</span></TableCell>
                      <TableCell className="whitespace-nowrap text-sm font-bold text-emerald-600 p-4">{formatarData(a.data_conclusao)}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs text-slate-500 italic p-4" title={a.resumo_observacoes}>{a.resumo_observacoes || "—"}</TableCell>
                      <TableCell className="text-center p-4"><Button variant="ghost" size="icon" onClick={() => excluirRegistro(a.id)} className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-4 w-4" /></Button></TableCell>
                      <TableCell className="text-center">
                        <input 
                          type="checkbox"
                          checked={selecionados.includes(a.id)}
                          onChange={() => toggleSelecao(a.id)}
                          className="rounded border-slate-300 w-4 h-4 cursor-pointer"
                        />
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm bg-white p-3 rounded-xl border border-slate-200 shadow-sm"><span className="text-slate-500 font-medium pl-2">Página <strong className="text-slate-800">{page + 1}</strong> de {totalPages}</span><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="font-semibold text-slate-600">Anterior</Button><Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="font-semibold text-slate-600">Próxima</Button></div></div>
        )}
      </div>
    </AppLayout>
  );
}