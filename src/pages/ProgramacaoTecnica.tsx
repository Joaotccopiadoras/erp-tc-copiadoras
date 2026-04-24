import { useMemo, useState, useEffect, useRef } from "react";
import { FileText, Table as TableIcon, Trash2, ChevronDown, ArrowUp, ArrowDown, Wrench, Filter, X } from "lucide-react";

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
const mapaStatus: Record<string, string> = { active: "ANDAMENTO", waiting: "AGUARDANDO", completed: "CONCLUÍDO"};
const formatarStatus = (status: string) => {
  if (!status) return "—";
  return mapaStatus[status.toLowerCase()] || status.toUpperCase();
};

function MultiSelectDropdown({ title, options, selected, onChange }: { title: string, options: string[], selected: string[], onChange: (val: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
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
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2 max-h-60 overflow-y-auto custom-scrollbar">
          {options.length === 0 ? (
            <div className="p-2 text-sm text-slate-400 text-center italic">Nenhum dado...</div>
          ) : (
            options.map(opt => (
              <label key={opt} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  checked={selected.includes(opt)} 
                  onChange={(e) => {
                    if (e.target.checked) onChange([...selected, opt]);
                    else onChange(selected.filter(x => x !== opt));
                  }} 
                />
                <span className="text-sm text-slate-700 truncate font-medium">{opt}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function TabelaPage() {
  const [allData, setAllData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // estados filtros e ordenac
  const [filterTecnicos, setFilterTecnicos] = useState<string[]>([]);
  const [filterFabricantes, setFilterFabricantes] = useState<string[]>([]);
  const [filterModelos, setFilterModelos] = useState<string[]>([]);
  const [filterTipos, setFilterTipos] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  
  const [dataEntradaInicio, setDataEntradaInicio] = useState("");
  const [dataEntradaFim, setDataEntradaFim] = useState("");
  const [dataPrevisaoInicio, setDataPrevisaoInicio] = useState("");
  const [dataPrevisaoFim, setDataPrevisaoFim] = useState("");
  const [dataConclusaoInicio, setDataConclusaoInicio] = useState("");
  const [dataConclusaoFim, setDataConclusaoFim] = useState("");
  
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(0);

  // autosave
  useEffect(() => {
    const savedFilters = sessionStorage.getItem("programacao_tecnica_filtros");
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        if (parsed.filterTecnicos) setFilterTecnicos(parsed.filterTecnicos);
        if (parsed.filterFabricantes) setFilterFabricantes(parsed.filterFabricantes);
        if (parsed.filterModelos) setFilterModelos(parsed.filterModelos);
        if (parsed.filterTipos) setFilterTipos(parsed.filterTipos);
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
      filterTecnicos, filterFabricantes, filterModelos, filterTipos, filterStatus,
      dataEntradaInicio, dataEntradaFim, dataPrevisaoInicio, dataPrevisaoFim, dataConclusaoInicio, dataConclusaoFim,
      sortConfig, page
    };
    sessionStorage.setItem("programacao_tecnica_filtros", JSON.stringify(stateToSave));
  }, [filterTecnicos, filterFabricantes, filterModelos, filterTipos, filterStatus, dataEntradaInicio, dataEntradaFim, dataPrevisaoInicio, dataPrevisaoFim, dataConclusaoInicio, dataConclusaoFim, sortConfig, page]);

  useEffect(() => {
    async function fetchAtendimentos() {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('atendimentos_tecnicos').select('*').order('data_entrada', { ascending: false });
        if (error) throw error;
        if (data) setAllData(data);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAtendimentos();
  }, []);

  const excluirAtendimento = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este atendimento definitivamente?")) return;
    try {
      await supabase.from('atendimentos_tecnicos').delete().eq('id', id);
      setAllData(prev => prev.filter(item => item.id !== id));
    } catch (error) { alert("Erro ao excluir. Tente novamente."); }
  };

  const filtered = useMemo(() => {
    let result = allData.filter((a) => {
      if (filterTecnicos.length > 0 && !filterTecnicos.includes(a.tecnico)) return false;
      if (filterFabricantes.length > 0 && !filterFabricantes.includes(a.fabricante)) return false;
      if (filterModelos.length > 0 && !filterModelos.includes(a.modelo)) return false;
      if (filterTipos.length > 0 && !filterTipos.includes(a.tipo_atividade)) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(formatarStatus(a.status))) return false;
      
      if (dataEntradaInicio && a.data_entrada < dataEntradaInicio) return false;
      if (dataEntradaFim && a.data_entrada > dataEntradaFim + "T23:59:59") return false;
      if (dataPrevisaoInicio && a.data_previsao < dataPrevisaoInicio) return false;
      if (dataPrevisaoFim && a.data_previsao > dataPrevisaoFim + "T23:59:59") return false;
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
  }, [allData, filterTecnicos, filterFabricantes, filterModelos, filterTipos, filterStatus, dataEntradaInicio, dataEntradaFim, dataPrevisaoInicio, dataPrevisaoFim, dataConclusaoInicio, dataConclusaoFim, sortConfig]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const hasFilters = filterTecnicos.length > 0 || filterFabricantes.length > 0 || filterModelos.length > 0 || filterTipos.length > 0 || filterStatus.length > 0 || dataEntradaInicio || dataEntradaFim || dataPrevisaoInicio || dataPrevisaoFim || dataConclusaoInicio || dataConclusaoFim;

  const clearFilters = () => {
    sessionStorage.removeItem("programacao_tecnica_filtros");
    setFilterTecnicos([]); setFilterFabricantes([]); setFilterModelos([]); setFilterTipos([]); setFilterStatus([]);
    setDataEntradaInicio(""); setDataEntradaFim(""); setDataPrevisaoInicio(""); setDataPrevisaoFim(""); setDataConclusaoInicio(""); setDataConclusaoFim("");
    setPage(0); setSortConfig(null);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev && prev.key === key) return prev.direction === 'asc' ? { key, direction: 'desc' } : null; 
      return { key, direction: 'asc' };
    });
  };

  const uniqueTecnicos = [...new Set(allData.map((a) => a.tecnico).filter(Boolean))].sort();
  const uniqueFabricantes = [...new Set(allData.map((a) => a.fabricante).filter(Boolean))].sort();
  const uniqueModelos = [...new Set(allData.map((a) => a.modelo).filter(Boolean))].sort();
  const uniqueTipos = [...new Set(allData.map((a) => a.tipo_atividade).filter(Boolean))].sort();
  const uniqueStatus = [...new Set(allData.map((a) => formatarStatus(a.status)).filter(s => s !== "—"))].sort();

  const formatarData = (dataStr: string) => {
    if (!dataStr) return "—";
    return new Date(dataStr).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
  };

  const exportarPDF = () => {
    try {
      const doc = new jsPDF("landscape"); 

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Programação/Produtividade Técnica", 14, 20); 
      doc.setFont("helvetica", "normal");
      
      const pesoStatus: Record<string, number> = {
        "CONCLUÍDO": 1,
        "ANDAMENTO": 2,
        "AGUARDANDO": 3
      };

      const dadosOrdenados = [...filtered].sort((a, b) => {
        const tecA = a.tecnico || "Sem Técnico";
        const tecB = b.tecnico || "Sem Técnico";
        if (tecA < tecB) return -1;
        if (tecA > tecB) return 1;
        
        const stA = formatarStatus(a.status);
        const stB = formatarStatus(b.status);
        const ordemA = pesoStatus[stA] || 99; 
        const ordemB = pesoStatus[stB] || 99;
        if (ordemA !== ordemB) return ordemA - ordemB;

        const dataA = new Date(a.data_entrada || 0).getTime();
        const dataB = new Date(b.data_entrada || 0).getTime();
        return dataA - dataB;
      });

      const tableColumn = ["Entrada", "Previsão", "Conclusão", "Cliente/OS", "Atividade", "Fabricante", "Modelo", "Status", "Resumo/Obs"];
      const tableRows: any[] = [];
      let tecnicoAtual = null;

      dadosOrdenados.forEach(item => {
        const tecItem = item.tecnico || "Sem Técnico";
        if (tecItem !== tecnicoAtual) {
          tableRows.push([{
            content: `Técnico: ${tecItem}`, colSpan: 9, 
            styles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'left' }
          }]);
          tecnicoAtual = tecItem;
        }

        tableRows.push([
          formatarData(item.data_entrada), formatarData(item.data_previsao), formatarData(item.data_conclusao),
          item.cliente_os_modelo_numero || "-", item.tipo_atividade || "-", item.fabricante || "-",
          item.modelo || "-", formatarStatus(item.status), item.resumo_obs || "-"
        ]);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 25,
        theme: 'grid', 
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, overflow: 'linebreak', lineColor: [200, 200, 200], lineWidth: 0.1 },
        columnStyles: {
          0: { halign: 'center' }, 1: { halign: 'center' }, 2: { halign: 'center' },
          5: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center' },
          8: { cellWidth: 50, halign: 'left' }
        },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 7 && data.cell.raw && (data.row.raw as any[]).length > 1) {
            const status = data.cell.raw as string;
            if (status === 'CONCLUÍDO') { data.cell.styles.textColor = [21, 128, 61]; data.cell.styles.fontStyle = 'bold'; } 
            else if (status === 'AGUARDANDO') { data.cell.styles.textColor = [161, 98, 7]; data.cell.styles.fontStyle = 'bold'; } 
            else if (status === 'ANDAMENTO') { data.cell.styles.textColor = [29, 78, 216]; data.cell.styles.fontStyle = 'bold'; }
          }
        }
      });
      doc.save("Programacao_Produtividade_Tecnica.pdf");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF.");
    }
  };
  
  const exportarExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Atendimentos");
      
      // Linha 1 como cabeçalho em vez de 5, já que removemos a logo
      worksheet.getRow(1).values = ["Data Entrada", "Data Previsão", "Data Conclusão", "Cliente/OS/Modelo", "Atividade", "Fabricante", "Modelo", "Técnico", "Status", "Resumo"];
      worksheet.getRow(1).font = { bold: true };
      
      filtered.forEach((item) => {
        worksheet.addRow([
          formatarData(item.data_entrada), formatarData(item.data_previsao), formatarData(item.data_conclusao),
          item.cliente_os_modelo_numero || "-", item.tipo_atividade || "-", item.fabricante || "-",
          item.modelo || "-", item.tecnico || "-", formatarStatus(item.status), item.resumo_obs || "-"
        ]);
      });
      worksheet.columns.forEach(column => { column.width = 18; });
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), "Programacao_Produtividade_Tecnica.xlsx");
    } catch (error) { 
      console.error("Erro ao gerar Excel:", error); 
      alert("Erro ao gerar Excel."); 
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
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Wrench className="w-6 h-6 text-indigo-600" /> Programação Técnica</h1>
            <p className="text-slate-500">Acompanhamento, filtros e rastreabilidade de produtividade técnica.</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Filter className="w-4 h-4 text-indigo-500"/> Filtros Avançados</h3>
            {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2 text-xs"><X className="h-3 w-3 mr-1" /> Limpar Tudo</Button>}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MultiSelectDropdown title="Técnico" options={uniqueTecnicos} selected={filterTecnicos} onChange={setFilterTecnicos} />
            <MultiSelectDropdown title="Fabricante" options={uniqueFabricantes} selected={filterFabricantes} onChange={setFilterFabricantes} />
            <MultiSelectDropdown title="Modelo" options={uniqueModelos} selected={filterModelos} onChange={setFilterModelos} />
            <MultiSelectDropdown title="Atividade" options={uniqueTipos} selected={filterTipos} onChange={setFilterTipos} />
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
          <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200"><strong className="text-slate-800 text-base">{filtered.length}</strong> atendimentos processados</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportarExcel} disabled={loading || filtered.length === 0} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2 font-bold shadow-sm">
              <TableIcon className="h-4 w-4" /> Exportar Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportarPDF} disabled={loading || filtered.length === 0} className="border-rose-200 text-rose-700 hover:bg-rose-50 gap-2 font-bold shadow-sm">
              <FileText className="h-4 w-4" /> Exportar PDF
            </Button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto min-h-[400px]">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow className="text-xs uppercase tracking-wider text-slate-600 hover:bg-slate-100">
                  <TableHead onClick={() => handleSort('data_entrada')} className="cursor-pointer font-semibold whitespace-nowrap p-4">Entrada {renderSortIcon('data_entrada')}</TableHead>
                  <TableHead onClick={() => handleSort('data_previsao')} className="cursor-pointer font-semibold whitespace-nowrap p-4">Previsão {renderSortIcon('data_previsao')}</TableHead>
                  <TableHead onClick={() => handleSort('cliente_os_modelo_numero')} className="cursor-pointer font-semibold p-4">Cliente/OS {renderSortIcon('cliente_os_modelo_numero')}</TableHead>
                  <TableHead onClick={() => handleSort('tipo_atividade')} className="cursor-pointer font-semibold p-4">Atividade {renderSortIcon('tipo_atividade')}</TableHead>
                  <TableHead onClick={() => handleSort('fabricante')} className="cursor-pointer font-semibold p-4">Fabricante {renderSortIcon('fabricante')}</TableHead>
                  <TableHead onClick={() => handleSort('modelo')} className="cursor-pointer font-semibold p-4">Modelo {renderSortIcon('modelo')}</TableHead>
                  <TableHead onClick={() => handleSort('tecnico')} className="cursor-pointer font-semibold p-4">Técnico {renderSortIcon('tecnico')}</TableHead>
                  <TableHead onClick={() => handleSort('status')} className="cursor-pointer font-semibold text-center p-4">Status {renderSortIcon('status')}</TableHead>
                  <TableHead onClick={() => handleSort('data_conclusao')} className="cursor-pointer font-semibold whitespace-nowrap p-4">Conclusão {renderSortIcon('data_conclusao')}</TableHead>
                  <TableHead className="font-semibold p-4">Resumo</TableHead>
                  <TableHead className="font-semibold text-center p-4">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {loading ? <TableRow><TableCell colSpan={11} className="text-center text-slate-400 font-medium py-12">Analisando banco de dados...</TableCell></TableRow> : paginated.length === 0 ? <TableRow><TableCell colSpan={11} className="text-center text-slate-400 font-medium py-12">Nenhum atendimento corresponde aos filtros aplicados.</TableCell></TableRow> : paginated.map(a => (
                    <TableRow key={a.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="whitespace-nowrap text-sm font-medium text-slate-600 p-4">{formatarData(a.data_entrada)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm font-bold text-amber-600 p-4">{formatarData(a.data_previsao)}</TableCell>
                      <TableCell className="font-bold text-sm text-slate-800 p-4">{a.cliente_os_modelo_numero || "—"}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700 p-4">{a.tipo_atividade || "—"}</TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium p-4">{a.fabricante || "—"}</TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium p-4">{a.modelo || "—"}</TableCell>
                      <TableCell className="text-xs font-bold text-indigo-700 p-4">{a.tecnico || "—"}</TableCell>
                      <TableCell className="text-center p-4"><span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border border-white ${a.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : a.status === 'waiting' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{formatarStatus(a.status)}</span></TableCell>
                      <TableCell className="whitespace-nowrap text-sm font-bold text-emerald-600 p-4">{formatarData(a.data_conclusao)}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs text-slate-500 italic p-4" title={a.resumo_obs}>{a.resumo_obs || "—"}</TableCell>
                      <TableCell className="text-center p-4"><Button variant="ghost" size="icon" onClick={() => excluirAtendimento(a.id)} className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-4 w-4" /></Button></TableCell>
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