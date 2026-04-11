import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, FileText, Plus, Download, GitMerge } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ProcessosPage() {
  const [modo, setModo] = useState<"lista" | "visualizar" | "editar">("lista");
  
  // Estados do Formulário
  const [codigo, setCodigo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("POP");
  const [centroCusto, setCentroCusto] = useState("Assistência Técnica");
  const [proposito, setProposito] = useState("");
  const [escopo, setEscopo] = useState("");
  const [procedimentos, setProcedimentos] = useState(""); // Num V2, isso pode ser um editor de texto rico ou um array dinâmico

  const salvarDocumento = async () => {
    console.log("Salvando no Supabase:", { codigo, titulo, tipo, centroCusto, proposito, escopo });
    // Após salvar, volta para a lista
    setModo("lista");
  };

  const exportarPDF = () => {
    alert("Gerando PDF nos moldes ISO 9001...");
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

        {/* MODO LISTA (Visão de todos os funcionários) */}
        {modo === "lista" && (
          <div className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex gap-4 mb-6">
              <Input placeholder="Buscar por código ou título..." className="max-w-sm" />
              <Select defaultValue="todos">
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Centro de Custo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Setores</SelectItem>
                  <SelectItem value="tecnica">Assistência Técnica</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Exemplo de Card de Documento */}
            <div 
              className="p-4 border rounded-lg hover:border-primary cursor-pointer transition-colors flex justify-between items-center"
              onClick={() => setModo("visualizar")}
            >
              <div>
                <div className="flex gap-2 items-center mb-1">
                  <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded">PO/TEC/00-01</span>
                  <span className="text-xs text-slate-500">v02 • 06/07/2026</span>
                </div>
                <h3 className="font-semibold text-slate-800">Aquisição de Relatórios de Uso de Equipamentos</h3>
                <p className="text-sm text-slate-500">Assistência Técnica</p>
              </div>
              <Button variant="ghost" size="icon"><FileText className="w-5 h-5 text-slate-400" /></Button>
            </div>
          </div>
        )}

        {/* MODO EDITAR / NOVO DOCUMENTO */}
        {modo === "editar" && (
          <div className="bg-white rounded-xl border shadow-sm">
            <Tabs defaultValue="cabecalho" className="w-full">
              <div className="border-b px-4 py-2">
                <TabsList>
                  <TabsTrigger value="cabecalho">Cabeçalho e Escopo</TabsTrigger>
                  <TabsTrigger value="procedimentos">Procedimentos (Passo a Passo)</TabsTrigger>
                  <TabsTrigger value="controles">Controles e Histórico</TabsTrigger>
                  <TabsTrigger value="fluxograma" className="gap-2"><GitMerge className="w-4 h-4"/> Fluxograma</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="cabecalho" className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Código do Documento</label>
                      <Input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ex: PO/TEC/00-01" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Título</label>
                      <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Aquisição de Relatórios..." />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Propósito</label>
                    <Textarea value={proposito} onChange={e => setProposito(e.target.value)} rows={3} placeholder="Transformar a atividade de retirada de relatórios..." />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Escopo</label>
                    <Textarea value={escopo} onChange={e => setEscopo(e.target.value)} rows={2} placeholder="Este Procedimento Operacional Padrão submete todo..." />
                  </div>
                </TabsContent>

                <TabsContent value="procedimentos" className="space-y-4">
                   <label className="text-sm font-medium">Detalhamento dos Procedimentos</label>
                   {/* Num cenário ideal futuro, aqui entraria um editor de texto com formatação (React Quill) para permitir negritos e listas automáticas */}
                   <Textarea value={procedimentos} onChange={e => setProcedimentos(e.target.value)} rows={15} placeholder="3.1. Coleta de Relatórios&#10;3.1.1. Verificar Relatório Equipamentos Contrato (RELEC)..." className="font-mono text-sm" />
                </TabsContent>

                <TabsContent value="fluxograma" className="space-y-4 text-center py-10">
                   <GitMerge className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                   <h3 className="text-lg font-medium">Editor de Fluxograma</h3>
                   <p className="text-slate-500 text-sm max-w-md mx-auto mb-4">
                     Futura área de integração com bibliotecas como React Flow ou Mermaid.js, onde você poderá desenhar a árvore de decisão visual do processo.
                   </p>
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

        {/* MODO VISUALIZAR (Simulando o Documento Final) */}
        {modo === "visualizar" && (
           <div className="bg-white rounded-xl border p-8 shadow-sm max-w-4xl mx-auto">
              <div className="flex justify-end mb-4 gap-2 border-b pb-4">
                 <Button variant="outline" className="gap-2" onClick={exportarPDF}><Download className="w-4 h-4"/> Baixar PDF Oficial</Button>
                 <Button onClick={() => setModo("editar")}>Editar Documento</Button>
              </div>
              
              {/* Cabeçalho Estilo ISO */}
              <div className="border-2 border-slate-800 grid grid-cols-4 mb-6 text-sm">
                 <div className="col-span-1 p-4 border-r-2 border-slate-800 flex items-center justify-center font-bold text-xl">TC COPIADORAS</div>
                 <div className="col-span-2 p-2 border-r-2 border-slate-800 text-center font-bold flex flex-col justify-center uppercase">
                    Procedimento Operacional Padrão - POP<br/>
                    AQUISIÇÃO DE RELATÓRIOS DE USO
                 </div>
                 <div className="col-span-1 p-2 flex flex-col text-xs">
                    <div className="border-b border-slate-400 pb-1 mb-1"><strong>CÓDIGO:</strong> PO/TEC/00-01</div>
                    <div className="border-b border-slate-400 pb-1 mb-1"><strong>VERSÃO:</strong> 02</div>
                    <div><strong>DATA:</strong> 09/04/2026</div>
                 </div>
              </div>

              {/* Corpo do Documento */}
              <div className="space-y-4 text-justify text-sm">
                 <p><strong>Propósito:</strong> Transformar a atividade de retirada de relatórios de uso em oportunidade estratégica...</p>
                 <p><strong>Escopo:</strong> Este Procedimento Operacional Padrão submete todo Responsável Técnico...</p>
                 {/* Aqui os dados do banco seriam renderizados */}
              </div>
           </div>
        )}
      </div>
    </AppLayout>
  );
}