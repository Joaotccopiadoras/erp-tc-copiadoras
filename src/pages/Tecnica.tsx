import { useMemo, useState, useEffect, useRef } from "react";
import { supabase } from "../integrations/supabase/client"; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { FileText, Table as TableIcon, Trash2, ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/AppLayout";
import { X } from "lucide-react";

const PAGE_SIZE = 15;
const mapaStatus: Record<string, string> = { active: "ANDAMENTO", waiting: "AGUARDANDO", completed: "CONCLUÍDO"};
const formatarStatus = (status: string) => {
  if (!status) return "—";
  return mapaStatus[status.toLowerCase()] || status.toUpperCase();
};

// multiselecao
function MultiSelectDropdown({ title, options, selected, onChange }: { title: string, options: string[], selected: string[], onChange: (val: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora dele
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
      <Button variant="outline" onClick={() => setOpen(!open)} className="w-full justify-between bg-white text-left font-normal h-10 px-3">
        <span className="truncate">
          {selected.length === 0 ? title : `${title} (${selected.length})`}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg p-2 max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="p-2 text-sm text-gray-500 text-center">Nenhum dado...</div>
          ) : (
            options.map(opt => (
              <label key={opt} className="flex items-center space-x-2 p-1.5 hover:bg-gray-100 rounded cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={selected.includes(opt)} 
                  onChange={(e) => {
                    if (e.target.checked) onChange([...selected, opt]);
                    else onChange(selected.filter(x => x !== opt));
                  }} 
                />
                <span className="text-sm text-gray-700 truncate">{opt}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// PÁGINA PRINCIPAL
export default function TabelaPage() {
  const [allData, setAllData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Filtros
  const [filterTecnicos, setFilterTecnicos] = useState<string[]>([]);
  const [filterFabricantes, setFilterFabricantes] = useState<string[]>([]);
  const [filterModelos, setFilterModelos] = useState<string[]>([]);
  const [filterTipos, setFilterTipos] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  
  //Filtros de Data (Início e Fim)
  const [dataEntradaInicio, setDataEntradaInicio] = useState("");
  const [dataEntradaFim, setDataEntradaFim] = useState("");
  const [dataPrevisaoInicio, setDataPrevisaoInicio] = useState("");
  const [dataPrevisaoFim, setDataPrevisaoFim] = useState("");
  const [dataConclusaoInicio, setDataConclusaoInicio] = useState("");
  const [dataConclusaoFim, setDataConclusaoFim] = useState("");
  
  // Estado para a Ordenação na Tabela
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(0);

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
    const confirmar = window.confirm("Tem certeza que deseja excluir este atendimento definitivamente?");
    if (!confirmar) return;
    try {
      const { error } = await supabase.from('atendimentos_tecnicos').delete().eq('id', id);
      if (error) throw error;
      setAllData(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir. Tente novamente.");
    }
  };

  //filtros
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
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        if (sortConfig.key === 'status') {
          valA = formatarStatus(a.status);
          valB = formatarStatus(b.status);
        }

        if (!valA) valA = "";
        if (!valB) valB = "";

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
    setFilterTecnicos([]); setFilterFabricantes([]); setFilterModelos([]); setFilterTipos([]); setFilterStatus([]);
    setDataEntradaInicio(""); setDataEntradaFim(""); setDataPrevisaoInicio(""); setDataPrevisaoFim(""); setDataConclusaoInicio(""); setDataConclusaoFim("");
    setPage(0);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev && prev.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : null; // Clica 3 vezes: desc, asc, volta ao normal
      }
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
    return new Date(dataStr).toLocaleDateString("pt-BR");
  };

  const getBase64ImageFromUrl = async (imageUrl: string): Promise<string> => {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const exportarPDF = async () => {
    try {
      const doc = new jsPDF("landscape"); 
      const logoBase64 = await getBase64ImageFromUrl("/logo.png");

      doc.addImage(logoBase64, "PNG", 14, 10, 40, 15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Programação/Produtividade Técnica", 14, 35); 
      doc.setFont("helvetica", "normal");
      
      // Peso do Status Ordenação do PDF
      const pesoStatus: Record<string, number> = {
        "CONCLUÍDO": 1,
        "ANDAMENTO": 2,
        "AGUARDANDO": 3
      };

      const dadosOrdenados = [...filtered].sort((a, b) => {
        // ordem alfab nome tec
        const tecA = a.tecnico || "Sem Técnico";
        const tecB = b.tecnico || "Sem Técnico";
        if (tecA < tecB) return -1;
        if (tecA > tecB) return 1;
        
        // ordem Concluído > Andamento > Aguardando
        const stA = formatarStatus(a.status);
        const stB = formatarStatus(b.status);
        const ordemA = pesoStatus[stA] || 99; // Se não tiver peso, joga pro fim
        const ordemB = pesoStatus[stB] || 99;
        if (ordemA !== ordemB) return ordemA - ordemB;

        // ordem data entr crescente
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
        startY: 40,
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
          if (data.section === 'body' && data.column.index === 7 && data.cell.raw && data.row.raw.length > 1) {
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
      const logoBase64 = await getBase64ImageFromUrl("/logo.png");
      const imageId = workbook.addImage({ base64: logoBase64, extension: "png" });
      worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 50 } });
      worksheet.getRow(5).values = ["Data Entrada", "Data Previsão", "Data Conclusão", "Cliente/OS/Modelo", "Atividade", "Fabricante", "Modelo", "Técnico", "Status", "Resumo"];
      worksheet.getRow(5).font = { bold: true };
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
    } catch (error) { console.error("Erro ao gerar Excel:", error); alert("Erro ao gerar Excel."); }
  };

  // ordenacao
  const renderSortIcon = (key: string) => {
    if (sortConfig?.key === key) {
      return sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 inline ml-1" /> : <ArrowDown className="h-4 w-4 inline ml-1" />;
    }
    return null;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <img src="/logo.png" alt="Logo da Empresa" className="h-12 object-contain" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tabela de Produtividade</h1>
            <p className="text-muted-foreground text-sm mt-1">Filtre, cruze, ordene e exporte dados de atendimentos</p>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Filtros Múltiplos e Períodos</span>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                <X className="h-4 w-4 mr-1" /> Limpar Tudo
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MultiSelectDropdown title="Técnico" options={uniqueTecnicos} selected={filterTecnicos} onChange={setFilterTecnicos} />
            <MultiSelectDropdown title="Fabricante" options={uniqueFabricantes} selected={filterFabricantes} onChange={setFilterFabricantes} />
            <MultiSelectDropdown title="Modelo" options={uniqueModelos} selected={filterModelos} onChange={setFilterModelos} />
            <MultiSelectDropdown title="Atividade" options={uniqueTipos} selected={filterTipos} onChange={setFilterTipos} />
            <MultiSelectDropdown title="Status" options={uniqueStatus} selected={filterStatus} onChange={setFilterStatus} />
          </div>

          {/* COMPONENTES DE FILTRO DE DATA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t pt-4">
            <div className="flex flex-col space-y-2 border rounded-md p-3 bg-gray-50/50">
              <span className="text-xs font-semibold text-gray-700 uppercase">Período de Entrada</span>
              <div className="flex gap-2 items-center">
                <Input type="date" className="text-xs h-8" value={dataEntradaInicio} onChange={(e) => { setDataEntradaInicio(e.target.value); setPage(0); }} />
                <span className="text-xs text-gray-400">até</span>
                <Input type="date" className="text-xs h-8" value={dataEntradaFim} onChange={(e) => { setDataEntradaFim(e.target.value); setPage(0); }} />
              </div>
            </div>
            <div className="flex flex-col space-y-2 border rounded-md p-3 bg-gray-50/50">
              <span className="text-xs font-semibold text-gray-700 uppercase">Período de Previsão</span>
              <div className="flex gap-2 items-center">
                <Input type="date" className="text-xs h-8" value={dataPrevisaoInicio} onChange={(e) => { setDataPrevisaoInicio(e.target.value); setPage(0); }} />
                <span className="text-xs text-gray-400">até</span>
                <Input type="date" className="text-xs h-8" value={dataPrevisaoFim} onChange={(e) => { setDataPrevisaoFim(e.target.value); setPage(0); }} />
              </div>
            </div>
            <div className="flex flex-col space-y-2 border rounded-md p-3 bg-gray-50/50">
              <span className="text-xs font-semibold text-gray-700 uppercase">Período de Conclusão</span>
              <div className="flex gap-2 items-center">
                <Input type="date" className="text-xs h-8" value={dataConclusaoInicio} onChange={(e) => { setDataConclusaoInicio(e.target.value); setPage(0); }} />
                <span className="text-xs text-gray-400">até</span>
                <Input type="date" className="text-xs h-8" value={dataConclusaoFim} onChange={(e) => { setDataConclusaoFim(e.target.value); setPage(0); }} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">
            <strong className="text-foreground text-lg">{filtered.length}</strong> atendimentos processados
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportarExcel} disabled={loading || filtered.length === 0} className="border-green-600 text-green-600 hover:bg-green-50">
              <TableIcon className="h-4 w-4 mr-2" /> Exportar Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportarPDF} disabled={loading || filtered.length === 0} className="border-red-600 text-red-600 hover:bg-red-50">
              <FileText className="h-4 w-4 mr-2" /> Exportar PDF
            </Button>
          </div>
        </div>

        <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  {/* Cabeçalhos Clicáveis para Ordenação */}
                  <TableHead onClick={() => handleSort('data_entrada')} className="cursor-pointer hover:bg-gray-100 whitespace-nowrap">Entrada {renderSortIcon('data_entrada')}</TableHead>
                  <TableHead onClick={() => handleSort('data_previsao')} className="cursor-pointer hover:bg-gray-100 whitespace-nowrap">Previsão {renderSortIcon('data_previsao')}</TableHead>
                  <TableHead onClick={() => handleSort('cliente_os_modelo_numero')} className="cursor-pointer hover:bg-gray-100">Cliente/OS {renderSortIcon('cliente_os_modelo_numero')}</TableHead>
                  <TableHead onClick={() => handleSort('tipo_atividade')} className="cursor-pointer hover:bg-gray-100">Atividade {renderSortIcon('tipo_atividade')}</TableHead>
                  <TableHead onClick={() => handleSort('fabricante')} className="cursor-pointer hover:bg-gray-100">Fabricante {renderSortIcon('fabricante')}</TableHead>
                  <TableHead onClick={() => handleSort('modelo')} className="cursor-pointer hover:bg-gray-100">Modelo {renderSortIcon('modelo')}</TableHead>
                  <TableHead onClick={() => handleSort('tecnico')} className="cursor-pointer hover:bg-gray-100">Técnico {renderSortIcon('tecnico')}</TableHead>
                  <TableHead onClick={() => handleSort('status')} className="cursor-pointer hover:bg-gray-100">Status {renderSortIcon('status')}</TableHead>
                  <TableHead onClick={() => handleSort('data_conclusao')} className="cursor-pointer hover:bg-gray-100 whitespace-nowrap">Conclusão {renderSortIcon('data_conclusao')}</TableHead>
                  <TableHead>Resumo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-12">Analisando banco de dados...</TableCell></TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-12">Nenhum atendimento corresponde aos filtros aplicados.</TableCell></TableRow>
                ) : (
                  paginated.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap">{formatarData(a.data_entrada)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatarData(a.data_previsao)}</TableCell>
                      <TableCell className="font-medium text-xs">{a.cliente_os_modelo_numero || "—"}</TableCell>
                      <TableCell className="text-xs">{a.tipo_atividade || "—"}</TableCell>
                      <TableCell className="text-xs">{a.fabricante || "—"}</TableCell>
                      <TableCell className="text-xs">{a.modelo || "—"}</TableCell>
                      <TableCell className="text-xs">{a.tecnico || "—"}</TableCell>
                      <TableCell>
                        <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold tracking-wider ${
                          a.status === 'completed' ? 'bg-green-100 text-green-700' :
                          a.status === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {formatarStatus(a.status)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatarData(a.data_conclusao)}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs text-gray-500" title={a.resumo_obs}>{a.resumo_obs || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => excluirAtendimento(a.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm bg-white p-2 rounded-lg border">
            <span className="text-muted-foreground font-medium pl-2">Página {page + 1} de {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Anterior</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Próxima</Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}