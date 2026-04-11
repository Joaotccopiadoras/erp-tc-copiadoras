import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, FileText, Plus, Download, GitMerge } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Processos() {
  const [modo, setModo] = useState<"lista" | "visualizar" | "editar">("lista");

  // --- estados filtro ---
  const [busca, setBusca] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("todos");
  const [documentos, setDocumentos] = useState([
    {
        id: "1",
        codigo: "PO/TEC/00-01",
        versao: "02",
        data: "06/07/2026",
        titulo: "Aquisição de Relatórios de Uso de Equipamentos",
        setor: "tecnica",
        nomeSetor: "Assistência Técnica"
      },
      {
        id: "2",
        codigo: "PO/FIN/00-01",
        versao: "01",
        data: "10/08/2026",
        titulo: "Faturamento Mensal de Contratos",
        setor: "financeiro",
        nomeSetor: "Financeiro"
      }
  ]);

  const documentosFiltrados = documentos.filter(doc => {
    const bateSetor = filtroSetor === "todos" || doc.setor === filtroSetor;
    const bateBusca = doc.titulo.toLowerCase().includes(busca.toLowerCase()) ||
                      doc.codigo.toLowerCase().includes(busca.toLowerCase());
    return bateSetor && bateBusca; 
  });
  
  // --- estados formulario ---
  const [codigo, setCodigo] = useState("PO/TEC/00-01");
  const [titulo, setTitulo] = useState("AQUISIÇÃO DE RELATÓRIOS DE USO DE EQUIPAMENTOS DE IMPRESSÃO");
  const [tipo, setTipo] = useState("POP");
  const [centroCusto, setCentroCusto] = useState("ASSISTÊNCIA TÉCNICA");
  const [versao, setVersao] = useState("02");
  const [dataEmissao, setDataEmissao] = useState("09/04/2026");
  const [dataRevisao, setDataRevisao] = useState("06/07/2026");
  const [aprovador, setAprovador] = useState("João Gaia");

  // Textos
  const [proposito, setProposito] = useState("Transformar a atividade de retirada de relatórios de uso em oportunidade estratégica de percepção do desempenho do equipamento, uso do cliente, necessidade de suprimentos, conveniência de manutenções preventivas.");
  const [escopo, setEscopo] = useState("Este Procedimento Operacional Padrão submete todo Responsável Técnico de Serviço ao Cliente, em sua completude, e também colaboradores do corpo administrativo...");
  const [objetivo, setObjetivo] = useState("1.1. Estabelecer procedimentos operacionais padronizados de retirada de Relatórios Gerais de Uso (RGU)...");
  const [funcoes, setFuncoes] = useState("2.1. Responsável Técnico de Serviço ao Cliente (RTSC): Executar as etapas.\n2.2. Supervisor Técnico (SVT): Garantir execução.");
  const [procedimentos, setProcedimentos] = useState("3.1. Coleta de Relatórios\n3.1.1. Verificar Relatório Equipamentos Contrato (RELEC).\n3.1.2. Se HOUVER bilhetagem...\n(Restante dos passos aqui...)");
  const [historico, setHistorico] = useState("8.1. Emissão em 06/04/2026.\n8.2. Alteração em 09/04/2026.\n8.2.1. Reescrita do Centro de Custo.");

  const salvarDocumento = async () => {
    console.log("Salvando no Supabase:", { codigo, titulo, tipo, centroCusto, proposito, escopo });
    setModo("lista");
  };

  // --- pdf ---
  const exportarPDF = () => {
    const doc = new jsPDF ("p", "mm", "a4");
    const margem = 15;
    
    const inicioTextoY = 55; 
    let yAtual = inicioTextoY;
    const adicionarSecao = (tituloSecao: string, conteudo: string, numerado = false) => {
      if (yAtual > 260) {
        doc.addPage();
        yAtual = inicioTextoY;
      }
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);

      if(numerado) {
        doc.text(tituloSecao, margem, yAtual);
        yAtual += 6;
      } else {
        doc.text(tituloSecao, margem, yAtual);
        doc.setFont("helvetica", "normal");
      }

      doc.setFont("helvetica", "normal");
      
      const margemTexto = numerado ? margem + 5 : margem;
      const larguraTexto = numerado ? 175 : 180;
      const offsetMesmaLinha = numerado ? 0 : doc.getTextWidth(tituloSecao) + 2;
      const textoFormatado = doc.splitTextToSize(conteudo || "Não preenchido.", larguraTexto - offsetMesmaLinha);
      
      doc.text(textoFormatado, margemTexto + offsetMesmaLinha, yAtual);
      yAtual += (textoFormatado.length * 5) + 4;
    };

    adicionarSecao("Propósito:", proposito);
    adicionarSecao("Escopo:", escopo);
    adicionarSecao("1. Objetivo:", objetivo, true);
    adicionarSecao("2. Funções e Responsabilidades:", funcoes, true);
    adicionarSecao("3. Procedimentos:", procedimentos, true);

    if (yAtual > 220) { doc.addPage(); yAtual = inicioTextoY; } 
    doc.setFont("helvetica", "bold");
    doc.text("6. Controle dos Registros:", margem, yAtual);
    yAtual += 6;

    autoTable(doc, {
      startY: yAtual,
      head: [['IDENTIFICAÇÃO', 'LOCAL DO ARQUIVO', 'TIPO DE ARQUIVO', 'TEMPO DE RETENÇÃO', 'DESCARTE']],
      body: [
        ['RGU', 'Servidor Local', '.pdf', '5 anos', 'Exclusão'],
        ['MTV + MTCS', 'Servidor Local', '.xlsx', '30 dias', 'Atualização'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0,0,0], fontSize: 8, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 8, cellPadding: 3, halign: 'center', valign: 'middle' },
      margin: { left: margem, right: margem }
    });
    
    yAtual = (doc as any).lastAutoTable.finalY + 10;

    adicionarSecao("8. Histórico de Revisões:", historico, true);

    const totalPaginas = (doc as any).internal.getNumberOfPages();

    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i); // Volta na página
      const yTop = 15;
      
      // O Grande Retângulo
      doc.rect(margem, yTop, 180, 30);

      // As Divisórias Verticais do V02
      doc.line(margem + 30, yTop, margem + 30, yTop + 30); // Logo
      doc.line(margem + 105, yTop, margem + 105, yTop + 30); // Título
      doc.line(margem + 130, yTop, margem + 130, yTop + 30); // Coluna Info 1
      doc.line(margem + 155, yTop, margem + 155, yTop + 30); // Coluna Info 2

      // Divisórias Horizontais (Infos)
      doc.line(margem + 105, yTop + 10, margem + 180, yTop + 10);
      doc.line(margem + 105, yTop + 20, margem + 180, yTop + 20);

      // Bloco 1: Logo
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("TC", margem + 15, yTop + 12, { align: "center" });
      doc.text("COPIADORAS", margem + 15, yTop + 20, { align: "center" });

      // Bloco 2: Título Central
      doc.setFontSize(9);
      doc.text("PROCEDIMENTO OPERACIONAL PADRÃO-POP", margem + 67.5, yTop + 6, { align: "center" });
      doc.setFontSize(10);
      const tituloQuebrado = doc.splitTextToSize(titulo.toUpperCase(), 70);
      doc.text(tituloQuebrado, margem + 67.5, yTop + 14, { align: "center" });

      // Bloco 3: Informações Rigorosas V02
      doc.setFontSize(7);
      
      // Linha 1 (Código, Data Emissão, Aprovado por)
      doc.setFont("helvetica", "normal");
      doc.text("CÓDIGO:", margem + 107, yTop + 4);
      doc.setFont("helvetica", "bold");
      doc.text(codigo, margem + 107, yTop + 8);

      doc.setFont("helvetica", "normal");
      doc.text("Data de Emissão:", margem + 132, yTop + 4);
      doc.text(dataEmissao, margem + 132, yTop + 8);

      doc.setFont("helvetica", "normal");
      doc.text("Aprovado por:", margem + 157, yTop + 4);
      doc.text(aprovador, margem + 157, yTop + 8);

      // Linha 2 (Centro de Custo, Data Revisão, Versão)
      doc.setFont("helvetica", "normal");
      doc.text("Centro de Custo:", margem + 107, yTop + 14);
      doc.setFont("helvetica", "bold");
      const ccQuebrado = doc.splitTextToSize(centroCusto, 20);
      doc.text(ccQuebrado, margem + 107, yTop + 18);

      doc.setFont("helvetica", "normal");
      doc.text("Data de Revisão:", margem + 132, yTop + 14);
      doc.text(dataRevisao, margem + 132, yTop + 18);

      doc.setFont("helvetica", "normal");
      doc.text("Versão:", margem + 157, yTop + 14);
      doc.text(versao, margem + 157, yTop + 18);

      // Linha 3 (Página)
      doc.setFont("helvetica", "normal");
      doc.text("Página:", margem + 157, yTop + 24);
      doc.setFont("helvetica", "bold");
      doc.text(`${i}/${totalPaginas}`, margem + 157, yTop + 28);
    }

    // --- EXPORTAÇÃO ---
    const nomeArquivo = `${codigo}_${titulo.substring(0, 20).replace(/\s+/g, '_')}_v${versao}.pdf`;
    doc.save(nomeArquivo);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              Gestão da Qualidade (Processos e POPs)
            </h1>
            <p className="text-slate-500">Consulta e padronização de procedimentos internos</p>
          </div>
          {modo === "lista" && (
            <Button onClick={() => setModo("editar")} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Documento
            </Button>
          )}
          {modo !== "lista" && (
            <Button variant="outline" onClick={() => setModo("lista")}>Voltar à Lista</Button>
          )}
        </div>

        {/* --- MODO LISTA --- */}
        {modo === "lista" && (
          <div className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex gap-4 mb-6">
              <Input
              placeholder="Buscar por código ou título..."
              className="max-w-sm"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              />
              <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Centro de Custo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Setores</SelectItem>
                  <SelectItem value="tecnica">Assistência Técnica</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              {documentosFiltrados.length === 0 ? (
                <div className="text-center py-8 text-slate-500">Nenhum documento encontrado.</div>
              ) : (
                documentosFiltrados.map(doc => (
                  <div 
                    key={doc.id}
                    className="p-4 border rounded-lg hover:border-primary cursor-pointer transition-colors flex justify-between items-center bg-white"
                    onClick={() => setModo("visualizar")}
                  >
                    <div>
                      <div className="flex gap-2 items-center mb-1">
                        <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded">{doc.codigo}</span>
                        <span className="text-xs text-slate-500">v{doc.versao} • {doc.data}</span>
                      </div>
                      <h3 className="font-semibold text-slate-800">{doc.titulo}</h3>
                      <p className="text-sm text-slate-500">{doc.nomeSetor}</p>
                    </div>
                    <Button variant="ghost" size="icon"><FileText className="w-5 h-5 text-slate-400" /></Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- MODO EDITAR --- */}
        {modo === "editar" && (
          <div className="bg-white rounded-xl border shadow-sm">
            <Tabs defaultValue="cabecalho" className="w-full">
              <div className="border-b px-4 py-2">
                <TabsList>
                  <TabsTrigger value="cabecalho">Cabeçalho</TabsTrigger>
                  <TabsTrigger value="corpo">Corpo do Documento</TabsTrigger>
                  <TabsTrigger value="controles">Controles e Histórico</TabsTrigger>
                  <TabsTrigger value="fluxograma" className="gap-2"><GitMerge className="w-4 h-4"/> Fluxograma</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="cabecalho" className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium">Código</label>
                      <Input value={codigo} onChange={e => setCodigo(e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <label className="text-sm font-medium">Título do Documento</label>
                      <Input value={titulo} onChange={e => setTitulo(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Centro de Custo</label>
                      <Input value={centroCusto} onChange={e => setCentroCusto(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Versão</label>
                      <Input value={versao} onChange={e => setVersao(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Data Emissão</label>
                      <Input value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Data Revisão</label>
                      <Input value={dataRevisao} onChange={e => setDataRevisao(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Propósito</label>
                    <Textarea value={proposito} onChange={e => setProposito(e.target.value)} rows={3} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Escopo</label>
                    <Textarea value={escopo} onChange={e => setEscopo(e.target.value)} rows={2} />
                  </div>
                </TabsContent>

                <TabsContent value="corpo" className="space-y-4">
                   <label className="text-sm font-medium">1. Objetivo</label>
                   <Textarea value={objetivo} onChange={e => setObjetivo(e.target.value)} rows={3} className="font-mono text-sm" />
                   
                   <label className="text-sm font-medium mt-4">2. Funções e Responsabilidades</label>
                   <Textarea value={funcoes} onChange={e => setFuncoes(e.target.value)} rows={3} className="font-mono text-sm" />

                   <label className="text-sm font-medium mt-4">3. Procedimentos (Detalhamento)</label>
                   <Textarea value={procedimentos} onChange={e => setProcedimentos(e.target.value)} rows={10} className="font-mono text-sm" />
                </TabsContent>

                <TabsContent value="controles" className="space-y-4">
                   <label className="text-sm font-medium">8. Histórico de Revisões</label>
                   <Textarea value={historico} onChange={e => setHistorico(e.target.value)} rows={5} className="font-mono text-sm" />
                </TabsContent>

                <TabsContent value="fluxograma" className="space-y-4 text-center py-10">
                   <GitMerge className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                   <h3 className="text-lg font-medium">Editor de Fluxograma</h3>
                   <Button variant="outline">Anexar Imagem do Fluxograma (Temporário)</Button>
                </TabsContent>

                <div className="mt-8 flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setModo("lista")}>Cancelar</Button>
                  <Button onClick={salvarDocumento}>Salvar Documento</Button>
                </div>
              </div>
            </Tabs>
          </div>
        )}

        {/* --- MODO VISUALIZAR --- */}
        {modo === "visualizar" && (
           <div className="bg-white rounded-xl border p-8 shadow-sm max-w-4xl mx-auto">
              <div className="flex justify-end mb-4 gap-2 border-b pb-4">
                 <Button className="gap-2 bg-slate-900 hover:bg-slate-800" onClick={exportarPDF}>
                   <Download className="w-4 h-4"/> Baixar PDF Oficial (Padrão ISO)
                 </Button>
                 <Button variant="outline" onClick={() => setModo("editar")}>Editar Documento</Button>
              </div>
              
              <div className="text-center py-12 text-slate-500">
                 <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                 <p>O documento está pronto para ser gerado.</p>
                 <p className="text-sm mt-2">Clique no botão acima para compilar e baixar o PDF oficial com o cabeçalho V02.</p>
              </div>
           </div>
        )}
      </div>
    </AppLayout>
  );
}