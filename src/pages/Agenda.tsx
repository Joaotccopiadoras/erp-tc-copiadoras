import { useMemo, useState, useEffect, useRef } from "react";
import { supabase } from "../integrations/supabase/client"; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { FileText, Table as TableIcon, Trash2, ChevronDown, ArrowUp, ArrowDown, LogOut } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 15;
const mapaStatus: Record<string, string> = { active: "ANDAMENTO", waiting: "AGUARDANDO", completed: "CONCLUÍDO" };
const formatarStatus = (status: string) => {
  if (!status) return "—";
  return mapaStatus[status.toLowerCase()] || status.toUpperCase();
};

// multiselecao
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const HandleSair = async () => {
    await supabase.auth.signOut();
    navigate("/Login");
  }
  const [allData, setAllData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usuarioAtual, setUsuarioAtual] = useState<any>(null);

  const [filterLideres, setFilterLideres] = useState<string[]>([]);
  const [filterDepartamentos, setFilterDepartamentos] = useState<string[]>([]);
  const [filterSolicitantes, setFilterSolicitantes] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  
  // Filtros de Data
  const [dataEntradaInicio, setDataEntradaInicio] = useState("");
  const [dataEntradaFim, setDataEntradaFim] = useState("");
  const [dataPrevisaoInicio, setDataPrevisaoInicio] = useState("");
  const [dataPrevisaoFim, setDataPrevisaoFim] = useState("");
  const [dataConclusaoInicio, setDataConclusaoInicio] = useState("");
  const [dataConclusaoFim, setDataConclusaoFim] = useState("");
  
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(0);

  //BUSCA DADOS SUPA
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) return; 
        setUsuarioAtual(user);
        console.log("🔍 1. Email do usuário logado:", user.email);
        const { data, error } = await supabase
            .from('programacao_tc')
            .select('*')
            .order('data_entrada', { ascending: false });
        if (error) throw error;
        
        //quantos cards Supa deixou sair do banco
        console.log("📦 2. Cards que vieram do banco:", data?.length, data);
        if (data) {
           const dadosFiltrados = data.filter(item => {
               if (!item.lider_email) return false; 
               return item.lider_email.toLowerCase().trim() === user.email?.toLowerCase().trim();
           });
           
           //quantos cards sobreviveram ao filtro
           console.log("🎯 3. Cards após o filtro:", dadosFiltrados.length, dadosFiltrados);
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
    const confirmar = window.confirm("Tem certeza que deseja excluir este registro definitivamente?");
    if (!confirmar) return;
    try {
      const { error } = await supabase.from('programacao_tc').delete().eq('id', id);
      if (error) throw error;
      setAllData(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir. Tente novamente.");
    }
  };

  //FILTROS E ORDENAÇÃO
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
  }, [allData, filterLideres, filterDepartamentos, filterSolicitantes, filterStatus, dataEntradaInicio, dataEntradaFim, dataPrevisaoInicio, dataPrevisaoFim, dataConclusaoInicio, dataConclusaoFim, sortConfig]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const hasFilters = filterLideres.length > 0 || filterDepartamentos.length > 0 || filterSolicitantes.length > 0 || filterStatus.length > 0 || dataEntradaInicio || dataEntradaFim || dataPrevisaoInicio || dataPrevisaoFim || dataConclusaoInicio || dataConclusaoFim;

  const clearFilters = () => {
    setFilterLideres([]); setFilterDepartamentos([]); setFilterSolicitantes([]); setFilterStatus([]);
    setDataEntradaInicio(""); setDataEntradaFim(""); setDataPrevisaoInicio(""); setDataPrevisaoFim(""); setDataConclusaoInicio(""); setDataConclusaoFim("");
    setPage(0);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev && prev.key === key) return prev.direction === 'asc' ? { key, direction: 'desc' } : null; 
      return { key, direction: 'asc' };
    });
  };

  //Listas Únicas Filtros
  const uniqueLideres = [...new Set(allData.map((a) => a.lider_card).filter(Boolean))].sort();
  const uniqueDepartamentos = [...new Set(allData.map((a) => a.departamento).filter(Boolean))].sort();
  const uniqueSolicitantes = [...new Set(allData.map((a) => a.solicitante).filter(Boolean))].sort();
  const uniqueStatus = [...new Set(allData.map((a) => formatarStatus(a.status)).filter(s => s !== "—"))].sort();

const formatarData = (dataStr: string) => {
    if (!dataStr) return "—";
    return new Date(dataStr).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
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

  // EXPORTAÇÃO DE PDF
  const exportarPDF = async () => {
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
            // ALTEARADO DE LÍDER PARA RESPONSÁVEL
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
        startY: 35, // Margem no topo para não bater no cabeçalho
        margin: { bottom: 35 }, // Margem no fundo para não bater no rodapé cinza
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
          doc.addImage(logoBase64, "PNG", 14, 10, 40, 15);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16);
          doc.setTextColor(0, 0, 0);
          doc.text("Agenda TC Copiadoras", pageWidth / 2, 20, { align: "center" });
          
          // Linha divisória do cabeçalho
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(14, 28, pageWidth - 14, 28);

          // --- RODAPÉ (BLOCO CINZA) ---
          doc.setFillColor(235, 235, 235); // Cor de fundo cinza clara
          doc.rect(0, pageHeight - 25, pageWidth, 25, "F");

          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);

          // Coluna 1: Endereço e Dados
          doc.setTextColor(100, 100, 100);
          const col1Text = "Trav. Angustura 2813;\nMarco - Belém - PA - Brasil.\nCEP: 66.093-040\nF.: 055 (91) 3366-5107/5108\nFAX: 055 (91) 3366-5100 Wp: 055 (91) 98156-6556\nCNPJ: 07.679.989/0001-50   //   I.E.: 15.250.057-0";
          doc.text(col1Text, 14, pageHeight - 20);

          // Coluna 2: Emails de Vendas/Licitação (Em Azul)
          doc.setTextColor(59, 130, 246);
          const col2Text = "vendas@tccopiadoras.com.br\nvendas2@tccopiadoras.com.br\nlicitacoes1@tccopiadoras.com.br\nlicitacoes2@tccopiadoras.com.br\nlicitacoes3@tccopiadoras.com.br";
          doc.text(col2Text, pageWidth / 2 - 45, pageHeight - 20);

          // Coluna 3: Emails Diretoria/Técnico (Em Azul)
          const col3Text = "diretoria@tccopiadoras.com.br\nsuportetecnico@tccopiadoras.com.br\nsuportetecnico1@tccopiadoras.com.br\nsuportetecnico2@tccopiadoras.com.br\ntcservicos@tccopiadoras.com.br";
          doc.text(col3Text, pageWidth / 2 + 45, pageHeight - 20);
        },

        // CORES DOS STATUS
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 7 && data.cell.raw && (data.row.raw as any[]).length > 1) {
            const status = data.cell.raw as string;
            if (status === 'CONCLUÍDO') { data.cell.styles.textColor = [21, 128, 61]; data.cell.styles.fontStyle = 'bold'; } 
            else if (status === 'AGUARDANDO') { data.cell.styles.textColor = [161, 98, 7]; data.cell.styles.fontStyle = 'bold'; } 
            else if (status === 'ANDAMENTO') { data.cell.styles.textColor = [29, 78, 216]; data.cell.styles.fontStyle = 'bold'; }
          }
        }
      });
      // NOME DO ARQUIVO SALVO ATUALIZADO
      doc.save("Agenda_TC_Copiadoras.pdf");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF.");
    }
  };

  const exportarExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Projetos");
      const logoBase64 = await getBase64ImageFromUrl("/logo.png");
      const imageId = workbook.addImage({ base64: logoBase64, extension: "png" });
      worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 50 } });
      worksheet.getRow(5).values = ["Data Entrada", "Data Previsão", "Data Conclusão", "Líder", "Solicitante", "Projeto", "Departamento", "Tarefa Atual", "Status", "Resumo"];
      worksheet.getRow(5).font = { bold: true };
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
    } catch (error) { console.error("Erro ao gerar Excel:", error); alert("Erro ao gerar Excel."); }
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key === key) return sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 inline ml-1" /> : <ArrowDown className="h-4 w-4 inline ml-1" />;
    return null;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      
     {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Logo" className="h-12 object-contain" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Projetos e Processos</h1>
            <p className="text-muted-foreground text-sm mt-1">Acompanhamento e rastreabilidade de atividades</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {usuarioAtual && (
            <div className="text-sm text-gray-500 hidden sm:block text-right">
              Logado como:<br/>
              <strong className="text-gray-800">{usuarioAtual.email}</strong>
            </div>
          )}
          
          {/* BOTÃO DE SAIR */}
          <Button variant="outline" onClick={HandleSair} className="text-red-600 hover:bg-red-50 border-red-200">
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </div>

      {/* ÁREA DE FILTROS */}
      <div className="bg-card border rounded-lg p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Filtros Avançados</span>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 hover:text-red-700 hover:bg-red-50">
              <X className="h-4 w-4 mr-1" /> Limpar Tudo
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MultiSelectDropdown title="Líder" options={uniqueLideres} selected={filterLideres} onChange={setFilterLideres} />
          <MultiSelectDropdown title="Departamento" options={uniqueDepartamentos} selected={filterDepartamentos} onChange={setFilterDepartamentos} />
          <MultiSelectDropdown title="Solicitante" options={uniqueSolicitantes} selected={filterSolicitantes} onChange={setFilterSolicitantes} />
          <MultiSelectDropdown title="Status" options={uniqueStatus} selected={filterStatus} onChange={setFilterStatus} />
        </div>

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
          <strong className="text-foreground text-lg">{filtered.length}</strong> projetos listados
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

      {/* TABELA PRINCIPAL */}
      <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead onClick={() => handleSort('data_entrada')} className="cursor-pointer hover:bg-gray-100 whitespace-nowrap">Entrada {renderSortIcon('data_entrada')}</TableHead>
                <TableHead onClick={() => handleSort('previsao_prazo')} className="cursor-pointer hover:bg-gray-100 whitespace-nowrap">Previsão {renderSortIcon('previsao_prazo')}</TableHead>
                <TableHead onClick={() => handleSort('solicitante')} className="cursor-pointer hover:bg-gray-100">Solicitante {renderSortIcon('solicitante')}</TableHead>
                <TableHead onClick={() => handleSort('processo_projeto')} className="cursor-pointer hover:bg-gray-100">Projeto {renderSortIcon('processo_projeto')}</TableHead>
                <TableHead onClick={() => handleSort('departamento')} className="cursor-pointer hover:bg-gray-100">Depto {renderSortIcon('departamento')}</TableHead>
                <TableHead onClick={() => handleSort('lider_card')} className="cursor-pointer hover:bg-gray-100">Líder {renderSortIcon('lider_card')}</TableHead>
                <TableHead onClick={() => handleSort('tarefa_atual')} className="cursor-pointer hover:bg-gray-100">Tarefa Atual {renderSortIcon('tarefa_atual')}</TableHead>
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
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-12">Nenhum projeto corresponde aos filtros aplicados.</TableCell></TableRow>
              ) : (
                paginated.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap">{formatarData(a.data_entrada)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatarData(a.previsao_prazo)}</TableCell>
                    <TableCell className="text-xs">{a.solicitante || "—"}</TableCell>
                    <TableCell className="font-medium text-xs">{a.processo_projeto || "—"}</TableCell>
                    <TableCell className="text-xs">{a.departamento || "—"}</TableCell>
                    <TableCell className="text-xs font-semibold">{a.lider_card || "—"}</TableCell>
                    <TableCell className="text-xs text-blue-600 font-medium">{a.tarefa_atual || "—"}</TableCell>
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
                    <TableCell className="max-w-[150px] truncate text-xs text-gray-500" title={a.resumo_observacoes}>{a.resumo_observacoes || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => excluirRegistro(a.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
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
        <div className="flex items-center justify-between text-sm bg-white p-2 rounded-lg border shadow-sm">
          <span className="text-muted-foreground font-medium pl-2">Página {page + 1} de {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}