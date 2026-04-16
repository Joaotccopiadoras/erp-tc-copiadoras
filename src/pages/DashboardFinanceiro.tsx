import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, DollarSign, TrendingUp, Filter, X, ListOrdered, Download, FileText } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import AppLayout from "@/components/AppLayout";
import KpiCard from "@/components/KpiCard";
import { useCsvData } from "@/hooks/useCsvData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type TransactionFilter = "all" | "receitas" | "despesas" | "receita_faturada" | "receita_recebida" | "despesa_contraida" | "despesa_paga";
type RegimeFilter = "all" | "caixa" | "competencia";
type AnalysisDimension = "segmento" | "centro_custo" | "conta" | "transacao" | "cliente_razao" | "fornecedor_razao" | "status_receita" | "pagamento";

const dimensionLabels: Record<AnalysisDimension, string> = {
  segmento: "Segmento de Negócio",
  centro_custo: "Centro de Custo",
  conta: "Conta Corrente",
  transacao: "Transação Financeira",
  cliente_razao: "Cliente (Razão)",
  fornecedor_razao: "Fornecedor (Razão)",
  status_receita: "Status da Receita",
  pagamento: "Forma de Pagamento",
};

const LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const parseNumber = (val: unknown): number => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    let cleaned = val.replace(/[^\d.,-]/g, "");
    if (cleaned.includes(",") && cleaned.includes(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(",", ".");
    }
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

const parseDate = (val: unknown): Date | null => {
  if (!val || typeof val !== "string") return null;
  const dateString = val.split(" ")[0]; 
  const parts = dateString.split(/[/\-]/);
  if (parts.length === 3) {
    if (parts[0].length <= 2 && parts[2].length === 4) {
      const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      if (!isNaN(d.getTime())) return d;
    } else if (parts[0].length === 4) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (!isNaN(d.getTime())) return d;
    }
  }
  const fallback = new Date(val);
  if (!isNaN(fallback.getTime())) return fallback;
  return null;
};

const getTransactionValue = (row: Record<string, unknown>, type: string): number => {
  const val = row["Valor A Receber / Recebido"] || 
              row["Valor A pagar / Pago"] || 
              row["Valor Receita"] || 
              row["Valor Despesa"];
  return Math.abs(parseNumber(val));
};

const getTransactionDate = (row: Record<string, unknown>, type: string): Date | null => {
  let dateVal = null;
  if (type === "despesa_paga") dateVal = row["Data Pagamento"];
  else if (type === "receita_recebida") dateVal = row["Data Recebimento"];
  else if (type === "despesa_contraida" || type === "receita_faturada") dateVal = row["Data Emissão"];
  return parseDate(dateVal);
};

const getDimensionValue = (row: Record<string, unknown>, dimension: AnalysisDimension): string => {
  const data = (row.row_data as Record<string, any>) || row || {};
  const keys = Object.keys(data);
  
  // Função que limpa e normaliza para comparação total
  const clean = (s: string) => s?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '') || '';

  // Busca qualquer chave que contenha o termo, priorizando nomes mais longos (Razão Social)
  const findValue = (targets: string[]) => {
    for (const target of targets) {
      const normalizedTarget = clean(target);
      const foundKey = keys.find(k => clean(k).includes(normalizedTarget));
      if (foundKey && data[foundKey] && String(data[foundKey]).trim() !== "") {
        return String(data[foundKey]);
      }
    }
    return null;
  };

  let val: any = "";

  switch (dimension) {
    case "cliente_razao":
      // Procura primeiro por "Razão" para evitar o ID numérico da coluna "Cliente"
      val = findValue(["Razao", "Cliente"]);
      break;
    case "fornecedor_razao":
      val = findValue(["Razao", "Fornecedor"]);
      break;
    case "centro_custo":
      val = findValue(["CentroCusto", "Custo"]);
      break;
    case "status_receita":
      val = findValue(["STATUSRECEITA", "Status"]);
      break;
    case "pagamento":
      val = findValue(["FormaPagamento", "Pagamento"]);
      break;
    case "conta":
      val = findValue(["ContaCorrente", "Conta"]);
      break;
    case "transacao":
      val = findValue(["Transacao"]);
      break;
    case "segmento":
      val = findValue(["SegmentoNegocio", "Segmento"]);
      break;
    default:
      val = "";
  }

  return val && String(val).trim() !== "" ? String(val) : "Não Informado / Outros";
};

const Financeiro = () => {
  console.log("A PÁGINA DO FINANCEIRO TENTOU RENDERIZAR")
  const { data, isLoading } = useCsvData();
  const [regimeFilter, setRegimeFilter] = useState<RegimeFilter>("caixa");
  const [typeFilter, setTypeFilter] = useState<TransactionFilter>("all");
  const [analysisDimension, setAnalysisDimension] = useState<AnalysisDimension>("segmento");
  const [dimensionValueFilter, setDimensionValueFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const records = data?.records || [];

  const filterOptions = useMemo(() => {
    const vals = new Set<string>();
    records.forEach((r) => {
      const cat = getDimensionValue(r.row_data as Record<string, unknown>, analysisDimension);
      if (cat && cat !== "Não Informado / Outros") vals.add(cat);
    });
    return Array.from(vals).sort();
  }, [records, analysisDimension]);

  const filtered = useMemo(() => {
    let result = records;
    if (regimeFilter === "caixa") {
      result = result.filter((r) => r.transaction_type === "receita_recebida" || r.transaction_type === "despesa_paga");
    } else if (regimeFilter === "competencia") {
      result = result.filter((r) => r.transaction_type === "receita_faturada" || r.transaction_type === "despesa_contraida");
    }
    if (typeFilter !== "all") {
      if (typeFilter === "receitas") result = result.filter((r) => r.transaction_type?.startsWith("receita"));
      else if (typeFilter === "despesas") result = result.filter((r) => r.transaction_type?.startsWith("despesa"));
      else result = result.filter((r) => r.transaction_type === typeFilter);
    }
    if (dimensionValueFilter !== "all") {
      result = result.filter((r) => getDimensionValue(r.row_data as Record<string, unknown>, analysisDimension) === dimensionValueFilter);
    }
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;
      result = result.filter((r) => {
        const d = getTransactionDate(r.row_data as Record<string, unknown>, r.transaction_type);
        if (!d) return true;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }
    return result;
  }, [records, regimeFilter, typeFilter, analysisDimension, dimensionValueFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    let totalEntrada = 0;
    let totalSaida = 0;
    let countEntrada = 0;
    let countSaida = 0;
    filtered.forEach((r) => {
      const val = getTransactionValue(r.row_data as Record<string, unknown>, r.transaction_type);
      if (r.transaction_type?.startsWith("receita")) {
        totalEntrada += val;
        countEntrada++;
      } else if (r.transaction_type?.startsWith("despesa")) {
        totalSaida += val;
        countSaida++;
      }
    });
    return { totalEntrada, totalSaida, saldo: totalEntrada - totalSaida, countEntrada, countSaida };
  }, [filtered]);

  const dimensionSummary = useMemo(() => {
    const grouped: Record<string, { entrada: number; saida: number; saldo: number }> = {};
    filtered.forEach((r) => {
      const key = getDimensionValue(r.row_data as Record<string, unknown>, analysisDimension);
      const val = getTransactionValue(r.row_data as Record<string, unknown>, r.transaction_type);
      if (!grouped[key]) grouped[key] = { entrada: 0, saida: 0, saldo: 0 };
      if (r.transaction_type?.startsWith("receita")) {
        grouped[key].entrada += val;
        grouped[key].saldo += val;
      } else if (r.transaction_type?.startsWith("despesa")) {
        grouped[key].saida += val;
        grouped[key].saldo -= val;
      }
    });
    return Object.entries(grouped)
      .map(([name, vals]) => ({ 
        name, 
        ...vals, 
        volumeTotal: vals.entrada + vals.saida
      }))
      .sort((a, b) => b.volumeTotal - a.volumeTotal);
  }, [filtered, analysisDimension]);

  const categoryChart = dimensionSummary.slice(0, 10).map(d => ({
    name: d.name.length > 20 ? d.name.slice(0, 20) + "…" : d.name,
    valor: d.volumeTotal
  }));

  const timeChart = useMemo(() => {
    const grouped: Record<string, { entrada: number; saida: number }> = {};
    filtered.forEach((r) => {
      const d = getTransactionDate(r.row_data as Record<string, unknown>, r.transaction_type);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!grouped[key]) grouped[key] = { entrada: 0, saida: 0 };
      const val = getTransactionValue(r.row_data as Record<string, unknown>, r.transaction_type);
      if (r.transaction_type?.startsWith("receita")) grouped[key].entrada += val;
      else if (r.transaction_type?.startsWith("despesa")) grouped[key].saida += val;
    });
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])).map(([month, vals]) => ({ month, ...vals }));
  }, [filtered]);

  const pieData = [
    { name: "Entrada", value: stats.totalEntrada },
    { name: "Saída", value: stats.totalSaida },
  ].filter((d) => d.value > 0);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const exportToPDF = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString("pt-BR");

    if (LOGO_BASE64.startsWith("data:image")) {
      doc.addImage(LOGO_BASE64, 'PNG', 14, 10, 40, 20);
    }

    doc.setFontSize(16);
    doc.text("Relatório Financeiro Consolidado", 60, 20); 
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("TC Copiadoras - Assistência Técnica e Revenda", 60, 25);
    doc.text(`Gerado em: ${date} | Dimensão: ${dimensionLabels[analysisDimension]}`, 60, 30);
    doc.text(`Regime: ${regimeFilter.toUpperCase()} | Saldo Total: ${fmt(stats.saldo)}`, 60, 35);

    const tableRows = dimensionSummary.map(item => {
      const porcEntrada = stats.totalEntrada > 0 ? (item.entrada / stats.totalEntrada) * 100 : 0;
      const porcSaida = stats.totalSaida > 0 ? (item.saida / stats.totalSaida) * 100 : 0;
      return [
        item.name,
        fmt(item.entrada),
        `${porcEntrada.toFixed(1)}%`,
        fmt(item.saida),
        `${porcSaida.toFixed(1)}%`,
        fmt(item.saldo)
      ];
    });

    autoTable(doc, {
      startY: 45,
      head: [["Descrição", "Entradas (+)", "% Entr.", "Saídas (-)", "% Saíd.", "Saldo Líquido"]],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      }
    });

    doc.save(`TC_Copiadoras_Relatorio_${analysisDimension}.pdf`);
  };

  const exportToExcel = () => {
    if (dimensionSummary.length === 0) return;
    const BOM = "\uFEFF";
    const headers = ["Descrição", "Entradas (+)", "% Entr.", "Saídas (-)", "% Saíd.", "Saldo Líquido"];
    const fmtExcel = (num: number) => num.toFixed(2).replace(".", ",");
    
    const csvRows = dimensionSummary.map(item => {
      const porcEntrada = stats.totalEntrada > 0 ? (item.entrada / stats.totalEntrada) * 100 : 0;
      const porcSaida = stats.totalSaida > 0 ? (item.saida / stats.totalSaida) * 100 : 0;
      return [
        `"${item.name}"`, 
        fmtExcel(item.entrada),
        `${porcEntrada.toFixed(1).replace(".", ",")}%`,
        fmtExcel(item.saida),
        `${porcSaida.toFixed(1).replace(".", ",")}%`,
        fmtExcel(item.saldo)
      ].join(";");
    });

    const csvContent = BOM + headers.join(";") + "\n" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `TC_Copiadoras_Relatorio_${analysisDimension}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
      <AppLayout>
        <div className="space-y-6"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Financeiro</h1>
            <p className="text-sm text-muted-foreground mt-1">Análise detalhada - TC Copiadoras</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportToExcel} variant="outline" size="sm" className="h-9">
              <Download className="w-4 h-4 mr-2" /> Excel
            </Button>
            <Button onClick={exportToPDF} variant="default" size="sm" className="h-9 bg-red-600 hover:bg-red-700 text-white border-none">
              <FileText className="w-4 h-4 mr-2" /> PDF
            </Button>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Select value={regimeFilter} onValueChange={(v) => setRegimeFilter(v as RegimeFilter)}>
              <SelectTrigger><SelectValue placeholder="Regime" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="caixa">Regime de Caixa</SelectItem>
                <SelectItem value="competencia">Regime de Competência</SelectItem>
                <SelectItem value="all">Visão Total</SelectItem>
              </SelectContent>
            </Select>

            {/* AQUI ESTÁ A CORREÇÃO DOS FILTROS "POR..." */}
            <Select value={analysisDimension} onValueChange={(v) => setAnalysisDimension(v as AnalysisDimension)}>
              <SelectTrigger className="border-primary bg-primary/5 text-primary font-medium">
                <SelectValue placeholder="Analisar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="segmento">Por Segmento de Negócio</SelectItem>
                <SelectItem value="centro_custo">Por Centro de Custo</SelectItem>
                <SelectItem value="conta">Por Conta Corrente</SelectItem>
                <SelectItem value="transacao">Por Transação Financ.</SelectItem>
                <SelectItem value="cliente_razao">Por Cliente (Razão)</SelectItem>
                <SelectItem value="fornecedor_razao">Por Fornecedor (Razão)</SelectItem>
                <SelectItem value="status_receita">Por Status da Receita</SelectItem>
                <SelectItem value="pagamento">Por Forma de Pagamento</SelectItem>
              </SelectContent>
            </Select>

            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Total Entradas" value={isLoading ? "..." : fmt(stats.totalEntrada)} icon={ArrowDownCircle} />
          <KpiCard title="Total Saídas" value={isLoading ? "..." : fmt(stats.totalSaida)} icon={ArrowUpCircle} />
          <KpiCard title="Saldo" value={isLoading ? "..." : fmt(stats.saldo)} icon={DollarSign} />
          <KpiCard title="Total Registros" value={isLoading ? "..." : filtered.length.toLocaleString("pt-BR")} icon={TrendingUp} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Volume por {dimensionLabels[analysisDimension]}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Entrada vs Saída</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie 
                  data={pieData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60} 
                  outerRadius={100} 
                  dataKey="value" 
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="hsl(var(--success))" />
                  <Cell fill="hsl(var(--destructive))" />
                </Pie>
                <Tooltip formatter={(v: any) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {timeChart.length > 0 && (
          <div className="glass-card rounded-xl p-5 lg:col-span-2 mt-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Evolução Mensal (Entradas vs Saídas)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={timeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                  tickFormatter={(value) => {
                    const [year, month] = value.split('-');
                    return `${month}/${year.slice(2)}`;
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} 
                />
                <Tooltip 
                  formatter={(v: any) => fmt(v)} 
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} 
                />
                <Line type="monotone" dataKey="entrada" stroke="hsl(var(--success))" strokeWidth={3} name="Entrada" dot={{ fill: "hsl(var(--success))", r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="saida" stroke="hsl(var(--destructive))" strokeWidth={3} name="Saída" dot={{ fill: "hsl(var(--destructive))", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {dimensionSummary.length > 0 && (
          <div className="glass-card rounded-xl overflow-hidden mt-6">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Detalhamento Analítico por {dimensionLabels[analysisDimension]}</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground uppercase text-xs">Descrição</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground uppercase text-xs">Entradas (+)</th>
                    <th className="text-right px-5 py-3 font-medium text-primary uppercase text-xs">% Entr.</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground uppercase text-xs">Saídas (-)</th>
                    <th className="text-right px-5 py-3 font-medium text-destructive uppercase text-xs">% Saíd.</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground uppercase text-xs">Saldo Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {dimensionSummary.map((item, i) => {
                    const porcEntrada = stats.totalEntrada > 0 ? (item.entrada / stats.totalEntrada) * 100 : 0;
                    const porcSaida = stats.totalSaida > 0 ? (item.saida / stats.totalSaida) * 100 : 0;
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                        <td className="px-5 py-3 font-medium text-foreground">{item.name}</td>
                        <td className="px-5 py-3 text-right text-success">{item.entrada > 0 ? fmt(item.entrada) : "-"}</td>
                        <td className="px-5 py-3 text-right text-primary font-mono text-[11px] bg-primary/5">{porcEntrada.toFixed(1)}%</td>
                        <td className="px-5 py-3 text-right text-destructive">{item.saida > 0 ? fmt(item.saida) : "-"}</td>
                        <td className="px-5 py-3 text-right text-destructive font-mono text-[11px] bg-destructive/5">{porcSaida.toFixed(1)}%</td>
                        <td className={cn("px-5 py-3 text-right font-semibold", item.saldo > 0 ? "text-success" : item.saldo < 0 ? "text-destructive" : "text-muted-foreground")}>
                          {fmt(item.saldo)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </AppLayout>
  );
};

export default Financeiro;