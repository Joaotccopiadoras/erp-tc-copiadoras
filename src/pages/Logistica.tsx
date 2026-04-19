import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Barcode,
  CheckCircle2,
  Edit,
  Package, 
  Plus, 
  Search, FileDigit, DollarSign, Settings2, Image as ImageIcon, Sparkles, ShoppingCart, Loader2, ListChecks, FileDown, Table as TableIcon, Database, Printer, Layers, MapPin, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Logistica() {
  const [modo, setModo] = useState<"lista" | "editar" | "lote">("lista");

  const [produtos, setProdutos] = useState<any[]>([]);
  const [locaisEstoque, setLocaisEstoque] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroFabricante, setFiltroFabricante] = useState("todos");
  const [filtroCondicao, setFiltroCondicao] = useState("todas");
  const [filtroFamilia, setFiltroFamilia] = useState("todas");
  const [filtroPerfil, setFiltroPerfil] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("nome_asc");

  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [loteCampo, setLoteCampo] = useState("");
  const [loteValor, setLoteValor] = useState("");

  const [produtoId, setProdutoId] = useState<string | null>(null);
  const [sku, setSku] = useState("");
  const [nome, setNome] = useState("");
  const [fabricante, setFabricante] = useState("");
  const [familia, setFamilia] = useState(""); 
  const [perfil, setPerfil] = useState(""); 
  const [modelo, setModelo] = useState("");
  const [categoria, setCategoria] = useState("Peça");
  const [condicao, setCondicao] = useState("");
  const [rastreiaSerie, setRastreiaSerie] = useState(false);
  const [imagemUrl, setImagemUrl] = useState("");
  
  // Especificações e Tipagem
  const [isEquipamento, setIsEquipamento] = useState("Não");
  const [specs, setSpecs] = useState({ formato: "A4", ppm: "", ano: "" });

  const [cicloRecomendado, setCicloRecomendado] = useState("");
  const [cicloMaximo, setCicloMaximo] = useState("");
  const [rendimentoVolume, setRendimentoVolume] = useState("");
  const [vidaUtilEstimada, setVidaUtilEstimada] = useState("");

  const [custoBase, setCustoBase] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("");
  const [pontoPedido, setPontoPedido] = useState("");
  const [ncm, setNcm] = useState("");
  const [cest, setCest] = useState("");

  const [carregandoIAFiscal, setCarregandoIAFiscal] = useState(false);
  const [carregandoIAMercado, setCarregandoIAMercado] = useState(false);
  const [carregandoPDF, setCarregandoPDF] = useState(false);
  const [cotacoesMercado, setCotacoesMercado] = useState<any[]>([]);

  // ==========================================
  // ESTADOS DO MODAL DE SALDOS POR LOCAL
  // ==========================================
  const [modalSaldosAberto, setModalSaldosAberto] = useState(false);
  const [produtoSaldos, setProdutoSaldos] = useState<any | null>(null);
  const [saldosLocais, setSaldosLocais] = useState<any[]>([]);
  const [salvandoSaldos, setSalvandoSaldos] = useState(false);

  useEffect(() => {
    const rascunhoSalvo = sessionStorage.getItem("logistica_rascunho");
    if (rascunhoSalvo) {
      try {
        const draft = JSON.parse(rascunhoSalvo);
        if (draft.modo === "editar") {
          setProdutoId(draft.produtoId); setSku(draft.sku); setNome(draft.nome);
          setFabricante(draft.fabricante); setFamilia(draft.familia || ""); setPerfil(draft.perfil || "");
          setModelo(draft.modelo); setCategoria(draft.categoria);
          setCondicao(draft.condicao || ""); setRastreiaSerie(draft.rastreiaSerie); setImagemUrl(draft.imagemUrl);
          setIsEquipamento(draft.isEquipamento || "Não");
          if (draft.specs) setSpecs(draft.specs);
          setCicloRecomendado(draft.cicloRecomendado); setCicloMaximo(draft.cicloMaximo);
          setRendimentoVolume(draft.rendimentoVolume); setVidaUtilEstimada(draft.vidaUtilEstimada);
          setCustoBase(draft.custoBase); setPrecoVenda(draft.precoVenda);
          setEstoqueMinimo(draft.estoqueMinimo); setPontoPedido(draft.pontoPedido);
          setNcm(draft.ncm); setCest(draft.cest);
          setCotacoesMercado(draft.cotacoesMercado || []);
          setModo("editar"); 
        }
      } catch (e) {
        console.error("Erro ao recuperar rascunho", e);
      }
    }
  }, []);

  useEffect(() => {
    if (modo === "editar") {
      const draft = {
        modo, produtoId, sku, nome, fabricante, familia, perfil, modelo, categoria, condicao, rastreiaSerie, imagemUrl,
        isEquipamento, specs, cicloRecomendado, cicloMaximo, rendimentoVolume, vidaUtilEstimada,
        custoBase, precoVenda, estoqueMinimo, pontoPedido, ncm, cest, cotacoesMercado
      };
      sessionStorage.setItem("logistica_rascunho", JSON.stringify(draft));
    } else {
      sessionStorage.removeItem("logistica_rascunho");
    }
  }, [modo, produtoId, sku, nome, fabricante, familia, perfil, modelo, categoria, condicao, rastreiaSerie, imagemUrl, isEquipamento, specs, cicloRecomendado, cicloMaximo, rendimentoVolume, vidaUtilEstimada, custoBase, precoVenda, estoqueMinimo, pontoPedido, ncm, cest, cotacoesMercado]);

  useEffect(() => { 
      if (modo === "lista") {
          fetchProdutos(); 
          fetchLocaisEstoque();
      }
  }, [modo]);

  const fetchProdutos = async () => {
    const { data, error } = await supabase.from('log_produtos').select('*').order('nome', { ascending: true });
    if (data) setProdutos(data);
    if (error) console.error(error);
  };

  const fetchLocaisEstoque = async () => {
      const { data } = await supabase.from('log_locais_estoque').select('*').order('nome');
      if (data) setLocaisEstoque(data);
  };

  const novoProduto = () => {
    setProdutoId(null); setSku(""); setNome(""); setFabricante(""); setFamilia(""); setPerfil(""); setModelo("");
    setCategoria("Peça"); setCondicao(""); setRastreiaSerie(false); setImagemUrl("");
    setIsEquipamento("Não"); setSpecs({ formato: "A4", ppm: "", ano: "" });
    setCicloRecomendado(""); setCicloMaximo(""); setRendimentoVolume(""); setVidaUtilEstimada("");
    setCustoBase(""); setPrecoVenda(""); setEstoqueMinimo(""); setPontoPedido("");
    setNcm(""); setCest(""); setCotacoesMercado([]);
    setModo("editar");
  };

  const editarProduto = (prod: any) => {
    let loadedSpecs = { formato: "A4", ppm: "", ano: "" };
    try {
        if (prod.especificacoes) loadedSpecs = typeof prod.especificacoes === 'string' ? JSON.parse(prod.especificacoes) : prod.especificacoes;
    } catch(e){}

    setProdutoId(prod.id); setSku(prod.sku || ""); setNome(prod.nome || "");
    setFabricante(prod.fabricante || ""); setFamilia(prod.familia || ""); setPerfil(prod.perfil || ""); setModelo(prod.modelo || "");
    setCategoria(prod.categoria || "Peça"); setCondicao(prod.condicao || "");
    setRastreiaSerie(prod.rastreia_serie || false); setImagemUrl(prod.imagem_url || "");
    setIsEquipamento(prod.is_equipamento ? "Sim" : "Não"); setSpecs(loadedSpecs);
    setCicloRecomendado(prod.ciclo_mensal_recomendado?.toString() || "");
    setCicloMaximo(prod.ciclo_mensal_maximo?.toString() || "");
    setRendimentoVolume(prod.rendimento_volume?.toString() || "");
    setVidaUtilEstimada(prod.vida_util_estimada?.toString() || "");
    setCustoBase(prod.custo_base?.toString() || ""); setPrecoVenda(prod.preco_venda?.toString() || "");
    setEstoqueMinimo(prod.estoque_minimo?.toString() || ""); setPontoPedido(prod.ponto_pedido?.toString() || "");
    setNcm(prod.ncm || ""); setCest(prod.cest || ""); setCotacoesMercado([]);
    setModo("editar");
  };

  const salvarProduto = async () => {
    const isEq = isEquipamento === "Sim";
    
    const payload = {
      sku, nome, fabricante, familia, perfil, modelo, categoria, condicao, rastreia_serie: rastreiaSerie, imagem_url: imagemUrl,
      is_equipamento: isEq,
      especificacoes: isEq ? specs : {},
      ciclo_mensal_recomendado: parseInt(cicloRecomendado) || 0,
      ciclo_mensal_maximo: parseInt(cicloMaximo) || 0,
      rendimento_volume: parseInt(rendimentoVolume) || 0,
      vida_util_estimada: parseInt(vidaUtilEstimada) || 0,
      custo_base: parseFloat(custoBase.replace(',', '.')) || 0,
      preco_venda: parseFloat(precoVenda.replace(',', '.')) || 0,
      estoque_minimo: parseInt(estoqueMinimo) || 0,
      ponto_pedido: parseInt(pontoPedido) || 0,
      ncm, cest
    };

    let erroBanco;
    if (produtoId) {
      const { error } = await supabase.from('log_produtos').update(payload).eq('id', produtoId);
      erroBanco = error;
    } else {
      const { error } = await supabase.from('log_produtos').insert([payload]);
      erroBanco = error;
    }

    if (erroBanco) {
      alert("Erro ao salvar produto: " + erroBanco.message);
    } else {
      alert("Produto salvo com sucesso!");
      sessionStorage.removeItem("logistica_rascunho");
      setModo("lista");
    }
  };

  // ==========================================
  // FUNÇÕES DE DISTRIBUIÇÃO DE SALDOS POR LOCAL
  // ==========================================
  const abrirSaldosEstoque = async (prod: any) => {
      setProdutoSaldos(prod);
      setModalSaldosAberto(true);

      // Puxa os saldos já salvos deste produto
      const { data: saldosSalvos } = await supabase.from('log_produto_saldos').select('*').eq('produto_id', prod.id);
      
      // Mescla os locais existentes com os saldos salvos (se não tiver salvo, fica 0)
      const listaSaldos = locaisEstoque.map(local => {
          const saldoEncontrado = saldosSalvos?.find(s => s.local_id === local.id);
          return {
              local_id: local.id,
              nome: local.nome,
              tipo: local.tipo,
              quantidade: saldoEncontrado ? saldoEncontrado.quantidade : 0
          };
      });
      setSaldosLocais(listaSaldos);
  };

  const salvarSaldosLocais = async () => {
      setSalvandoSaldos(true);
      try {
          // 1. Salva cada local na tabela de saldos detalhados (Fazendo Upsert)
          for (const s of saldosLocais) {
              await supabase.from('log_produto_saldos').upsert({
                  produto_id: produtoSaldos.id,
                  local_id: s.local_id,
                  quantidade: s.quantidade
              }, { onConflict: 'produto_id, local_id' });
          }

          // 2. Soma tudo e atualiza o Saldo Global (estoque_atual) do Produto
          const estoqueGlobal = saldosLocais.reduce((acc, curr) => acc + Number(curr.quantidade), 0);
          await supabase.from('log_produtos').update({ estoque_atual: estoqueGlobal }).eq('id', produtoSaldos.id);

          alert("Saldos por local atualizados e Estoque Global recalculado!");
          setModalSaldosAberto(false);
          fetchProdutos(); // Recarrega a tabela principal para mostrar o novo saldo global
      } catch (e: any) {
          alert("Erro ao atualizar saldos: " + e.message);
      } finally {
          setSalvandoSaldos(false);
      }
  };

  const atualizarQuantidadeLocal = (localId: string, novaQtd: number) => {
      setSaldosLocais(prev => prev.map(s => s.local_id === localId ? { ...s, quantidade: novaQtd } : s));
  };


  const toggleSelecao = (id: string) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const aplicarEdicaoLote = async () => {
    if (!loteCampo) return alert("Selecione qual campo deseja alterar!");
    if (!loteValor && !['condicao', 'familia', 'perfil'].includes(loteCampo)) return alert("Informe o novo valor!");
    const payload = { [loteCampo]: loteValor };
    const { error } = await supabase.from('log_produtos').update(payload).in('id', selecionados);
    if (error) {
      alert("Erro ao atualizar produtos: " + error.message);
    } else {
      alert(`${selecionados.length} produtos atualizados com sucesso!`);
      fetchProdutos(); setModo("lista"); setSelecionados([]); setLoteCampo(""); setLoteValor("");
    }
  };

  const sugerirFiscalComIA = async () => {
    if (!nome) return alert("Digite o nome do produto primeiro!");
    setCarregandoIAFiscal(true);
    try {
      const resposta = await fetch("https://n8n.srv1338428.hstgr.cloud/webhook/fiscal-ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto: nome, categoria: categoria })
      });
      const dadosIA = await resposta.json();
      setNcm(dadosIA.ncm || ""); setCest(dadosIA.cest || "");
    } catch (error) { alert("Houve um erro ao consultar a IA. Verifique sua conexão ou o n8n."); } finally { setCarregandoIAFiscal(false); }
  };

  const cotarNoMercadoComIA = async () => {
    if (!nome) return alert("Digite o nome do produto primeiro!");
    setCarregandoIAMercado(true);
    try {
      setTimeout(() => {
        setCotacoesMercado([
          { loja: "Mercado Livre", preco: "R$ 145,90", link: "https://mercadolivre.com.br" },
          { loja: "Shopee", preco: "R$ 129,00", link: "https://shopee.com.br" },
          { loja: "AliExpress", preco: "R$ 89,50", link: "https://aliexpress.com" }
        ]);
      }, 3000);
    } catch (error) { alert("Erro ao buscar cotações."); } finally { setCarregandoIAMercado(false); }
  };

  const extrairUnicos = (campo: string) => Array.from(new Set(produtos.map(p => p[campo]).filter(f => f && f.trim() !== ""))).sort();
  const fabricantesUnicos = extrairUnicos("fabricante");
  const familiasUnicas = extrairUnicos("familia");
  const perfisUnicos = extrairUnicos("perfil");
  const ncmUnicos = extrairUnicos("ncm");
  const cestUnicos = extrairUnicos("cest");
  const condicoesUnicas = extrairUnicos("condicao");
  const categoriasUnicas = extrairUnicos("categoria");
  
  let produtosFiltrados = produtos.filter(prod => {
    const bateCategoria = filtroCategoria === "todas" || prod.categoria === filtroCategoria;
    const bateFabricante = filtroFabricante === "todos" || prod.fabricante === filtroFabricante;
    const bateCondicao = filtroCondicao === "todas" || prod.condicao === filtroCondicao;
    const bateFamilia = filtroFamilia === "todas" || prod.familia === filtroFamilia;
    const batePerfil = filtroPerfil === "todos" || prod.perfil === filtroPerfil;
    const termoBusca = busca.toLowerCase();
    const bateBusca = (prod.nome?.toLowerCase() || "").includes(termoBusca) || 
                      (prod.sku?.toLowerCase() || "").includes(termoBusca) || 
                      (prod.familia?.toLowerCase() || "").includes(termoBusca) || 
                      (prod.perfil?.toLowerCase() || "").includes(termoBusca) ||
                      (prod.modelo?.toLowerCase() || "").includes(termoBusca);
    return bateCategoria && bateFabricante && bateCondicao && bateFamilia && batePerfil && bateBusca;
  });

  produtosFiltrados = produtosFiltrados.sort((a, b) => {
    if (ordenacao === "nome_asc") return (a.nome || "").localeCompare(b.nome || "");
    if (ordenacao === "categoria_asc") return (a.categoria || "").localeCompare(b.categoria || "");
    if (ordenacao === "fabricante_asc") return (a.fabricante || "").localeCompare(b.fabricante || "");
    return 0;
  });

  const exportarPDFProdutos = async () => {
    if (produtosFiltrados.length === 0) return alert("Não há produtos para exportar!");
    setCarregandoPDF(true); 
    try {
      const doc = new jsPDF("l", "mm", "a4");
      const adicionarCabecalhoRodape = (data: any) => {
        doc.setFillColor(41, 37, 36); doc.rect(14, 10, 269, 14, 'F');
        doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(255, 255, 255);
        doc.text("TC COPIADORAS - Catálogo de Produtos", 18, 19);
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
        doc.text(`Filtros: Categoria: ${filtroCategoria} | Fabricante: ${filtroFabricante} | Total de Itens: ${produtosFiltrados.length}`, 14, 30);
        doc.setFontSize(8); doc.setTextColor(150, 150, 150);
        doc.text("TC COPIADORAS - Sistema ERP", 14, doc.internal.pageSize.height - 10);
        doc.text(`Página ${data.pageNumber}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: "right" });
      };

      const carregarImagem = (url: string) => {
        return new Promise<string | null>((resolve) => {
          const img = new Image(); img.crossOrigin = "Anonymous"; img.src = url;
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas"); canvas.width = img.width; canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              if (ctx) { ctx.drawImage(img, 0, 0); resolve(canvas.toDataURL("image/jpeg", 0.5)); } else resolve(null);
            } catch(e) { resolve(null); }
          };
          img.onerror = () => resolve(null); 
        });
      };

      const listaDeImagens: (string | null)[] = [];
      const bodyDataParaTabela = [];
      for (const p of produtosFiltrados) {
        let imgData = null; if (p.imagem_url) imgData = await carregarImagem(p.imagem_url);
        listaDeImagens.push(imgData);
        bodyDataParaTabela.push([ { content: "", styles: { minCellHeight: 16 } }, p.sku || "S/N", p.nome, p.categoria, p.familia || "-", p.perfil || "-", p.fabricante || "-", `R$ ${Number(p.custo_base).toFixed(2)}`, `R$ ${Number(p.preco_venda).toFixed(2)}` ]);
      }

      autoTable(doc, {
        startY: 35, margin: { top: 35},
        head: [['FOTO', 'SKU', 'NOME', 'CATEGORIA', 'FAMÍLIA', 'PERFIL', 'FABRICANTE', 'CUSTO BASE', 'PREÇO VENDA']],
        body: bodyDataParaTabela, theme: 'grid',
        headStyles: { fillColor: [41, 37, 36], textColor: [255,255,255], valign: 'middle', halign: 'center' },
        styles: { fontSize: 7, cellPadding: 2, valign: 'middle' },
        columnStyles: { 0: { cellWidth: 20, halign: 'center' } },
        didDrawPage: adicionarCabecalhoRodape,
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const imgData = listaDeImagens[data.row.index];
            if (imgData) {
              try {
                const tamanho = 12; const x = data.cell.x + (data.cell.width - tamanho) / 2; const y = data.cell.y + (data.cell.height - tamanho) / 2;
                doc.addImage(imgData as string, 'JPEG', x, y, tamanho, tamanho);
              } catch(e) { doc.setFontSize(6); doc.setTextColor(200, 0, 0); doc.text("Erro", data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: 'center' }); }
            } else { doc.setFontSize(6); doc.setTextColor(150, 150, 150); doc.text("Sem foto", data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: 'center' }); }
          }
        }
      });
      doc.save("Catalogo_TC_Copiadoras.pdf");
    } catch (error) { alert("Houve um problema ao processar o PDF. Verifique o console."); } finally { setCarregandoPDF(false); }
  };

  const exportarExcelProdutos = () => {
    if (produtosFiltrados.length === 0) return alert("Não há produtos para exportar!");
    let csvContent = "SKU;NOME;CATEGORIA;CONDIÇÃO;FAMÍLIA;PERFIL;FABRICANTE;CUSTO_BASE;PRECO_VENDA;ESTOQUE_MINIMO;NCM;CEST\n";
    produtosFiltrados.forEach(p => {
      const linha = [ p.sku || "", `"${p.nome || ""}"`, p.categoria || "", p.condicao || "", p.familia || "", p.perfil || "", p.fabricante || "", Number(p.custo_base || 0).toFixed(2).replace('.', ','), Number(p.preco_venda || 0).toFixed(2).replace('.', ','), p.estoque_minimo || "0", `"${p.ncm || ""}"`, `"${p.cest || ""}"` ].join(";");
      csvContent += linha + "\n";
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = "Produtos_TC_Copiadoras.csv"; a.click();
  };

  const exportarAuxiliaresPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text("Relatório de Cadastros Auxiliares", 14, 20);
    let yPos = 30;
    const adicionarTabela = (titulo: string, itens: string[]) => {
      if (itens.length === 0) return;
      doc.setFontSize(12); doc.text(titulo, 14, yPos);
      autoTable(doc, { startY: yPos + 4, head: [[titulo.toUpperCase()]], body: itens.map(i => [i]), theme: 'grid', headStyles: { fillColor: [240, 240, 240], textColor: [0,0,0] }, styles: { fontSize: 9, cellPadding: 2 } });
      yPos = (doc as any).lastAutoTable.finalY + 15; if (yPos > 270) { doc.addPage(); yPos = 20; }
    };
    adicionarTabela("Categorias Ativas", categoriasUnicas as string[]); adicionarTabela("Famílias de Produtos", familiasUnicas as string[]); adicionarTabela("Perfis de Produtos", perfisUnicos as string[]); adicionarTabela("Condições", condicoesUnicas as string[]); adicionarTabela("Fabricantes / Marcas", fabricantesUnicos as string[]); adicionarTabela("NCMs Registrados", ncmUnicos as string[]); adicionarTabela("CESTs Registrados", cestUnicos as string[]);
    doc.save("Cadastros_Auxiliares.pdf");
  };

  const exportarAuxiliaresExcel = () => {
    const maxLinhas = Math.max(categoriasUnicas.length, familiasUnicas.length, perfisUnicos.length, condicoesUnicas.length, fabricantesUnicos.length, ncmUnicos.length, cestUnicos.length);
    let csvContent = "CATEGORIAS;FAMILIAS;PERFIS;CONDICOES;FABRICANTES;NCM;CEST\n";
    for (let i = 0; i < maxLinhas; i++) {
      const linha = [ categoriasUnicas[i] || "", familiasUnicas[i] || "", perfisUnicos[i] || "", condicoesUnicas[i] || "", fabricantesUnicos[i] || "", `"${ncmUnicos[i] || ""}"`, `"${cestUnicos[i] || ""}"` ].join(";");
      csvContent += linha + "\n";
    }
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = "Cadastros_Auxiliares.csv"; a.click();
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto mb-12">
        
        {/* Renderiz datalists */}
        <datalist id="lista-fabricantes">{fabricantesUnicos.map((f, i) => <option key={i} value={f as string} />)}</datalist>
        <datalist id="lista-familias">{familiasUnicas.map((f, i) => <option key={i} value={f as string} />)}</datalist>
        <datalist id="lista-perfis">{perfisUnicos.map((f, i) => <option key={i} value={f as string} />)}</datalist>
        <datalist id="lista-ncm">{ncmUnicos.map((f, i) => <option key={i} value={f as string} />)}</datalist>
        <datalist id="lista-cest">{cestUnicos.map((f, i) => <option key={i} value={f as string} />)}</datalist>

        {/* ========================================================================= */}
        {/* MODAL DE DISTRIBUIÇÃO DE SALDOS (NOVO) */}
        {/* ========================================================================= */}
        {modalSaldosAberto && produtoSaldos && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
                        <div>
                            <h2 className="text-lg font-black text-emerald-900 flex items-center gap-2"><Layers className="w-5 h-5 text-emerald-600"/> Gestão de Saldos e Estoque</h2>
                            <p className="text-xs text-emerald-700 font-bold mt-1 uppercase tracking-widest">{produtoSaldos.sku} - {produtoSaldos.nome}</p>
                        </div>
                        <button onClick={() => setModalSaldosAberto(false)} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-full"><X className="w-5 h-5"/></button>
                    </div>

                    <div className="p-6 bg-slate-50 border-b">
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Estoque Global (Soma Atual)</p>
                                <p className="text-sm text-slate-400 mt-1">Este é o valor que aparecerá no catálogo principal.</p>
                            </div>
                            <div className="text-3xl font-black text-slate-800 bg-slate-100 px-6 py-2 rounded-lg border">
                                {saldosLocais.reduce((acc, curr) => acc + Number(curr.quantidade), 0)} <span className="text-base font-medium text-slate-500">un</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Distribuição por Locais Físicos/Lógicos</h3>
                        
                        {saldosLocais.map(local => (
                            <div key={local.local_id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-emerald-300 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-100 p-2 rounded-lg"><MapPin className="w-4 h-4 text-slate-500"/></div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{local.nome}</p>
                                        <p className="text-[10px] uppercase text-slate-500">{local.tipo}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase mr-2">Qtd:</span>
                                    <Input 
                                        type="number" 
                                        value={local.quantidade} 
                                        onChange={e => atualizarQuantidadeLocal(local.local_id, parseFloat(e.target.value) || 0)}
                                        className="w-24 text-center font-bold text-emerald-700 bg-emerald-50 border-emerald-200 focus-visible:ring-emerald-500"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setModalSaldosAberto(false)}>Cancelar</Button>
                        <Button onClick={salvarSaldosLocais} disabled={salvandoSaldos} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
                            {salvandoSaldos ? "Atualizando..." : <><Save className="w-4 h-4"/> Salvar Saldos e Atualizar Global</>}
                        </Button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <Package className="w-6 h-6 text-stone-600" /> Catálogo de Produtos
            </h1>
            <p className="text-slate-500">Gestão unificada de equipamentos, peças e insumos.</p>
          </div>
          {modo === "lista" ? (
            <div className="flex gap-2 flex-wrap justify-end">
              <Button onClick={exportarExcelProdutos} variant="outline" size="sm" className="gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                <TableIcon className="w-4 h-4"/> Excel
              </Button>
              <Button onClick={exportarPDFProdutos} disabled={carregandoPDF} variant="outline" size="sm" className="gap-2 text-red-700 border-red-200 hover:bg-red-50">
                {carregandoPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4"/>} 
                {carregandoPDF ? "Gerando..." : "PDF"}
              </Button>
              <Button onClick={novoProduto} className="gap-2 bg-stone-700 hover:bg-stone-800"><Plus className="w-4 h-4" /> Novo Produto</Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => { setModo("lista"); setSelecionados([]); }}>Voltar ao Catálogo</Button>
          )}
        </div>

        {/* MODO LOTE */}
        {modo === "lote" && (
          <div className="bg-white rounded-xl border shadow-sm p-8 max-w-2xl mx-auto mt-8">
            <div className="flex items-center gap-4 mb-6 border-b pb-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <ListChecks className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Edição em Massa</h2>
                <p className="text-slate-500">Você está alterando <strong>{selecionados.length} produtos</strong> simultaneamente.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Qual campo deseja alterar em todos?</label>
                <Select value={loteCampo} onValueChange={(val) => { setLoteCampo(val); setLoteValor(""); }}>
                  <SelectTrigger className="bg-white z-50"><SelectValue placeholder="Selecione o campo..." /></SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="fabricante">Fabricante (Marca)</SelectItem>
                    <SelectItem value="familia">Família de Produto</SelectItem>
                    <SelectItem value="perfil">Perfil de Produto</SelectItem>
                    <SelectItem value="categoria">Categoria do Produto</SelectItem>
                    <SelectItem value="condicao">Condição (Novo/Recondicionado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loteCampo === "fabricante" && (
                <div className="space-y-2"><label className="text-sm font-medium">Novo Fabricante:</label><Input list="lista-fabricantes" value={loteValor} onChange={e => setLoteValor(e.target.value)} placeholder="Ex: BROTHER" /></div>
              )}
              {loteCampo === "familia" && (
                <div className="space-y-2"><label className="text-sm font-medium">Nova Família:</label><Input list="lista-familias" value={loteValor} onChange={e => setLoteValor(e.target.value)} placeholder="Ex: Impressão" /></div>
              )}
              {loteCampo === "perfil" && (
                <div className="space-y-2"><label className="text-sm font-medium">Novo Perfil:</label><Input list="lista-perfis" value={loteValor} onChange={e => setLoteValor(e.target.value)} placeholder="Ex: Laser Monocromática" /></div>
              )}

              {loteCampo === "categoria" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nova Categoria:</label>
                  <Select value={loteValor} onValueChange={setLoteValor}>
                    <SelectTrigger className="bg-white z-50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="Equipamento">Equipamento</SelectItem>
                      <SelectItem value="Peça">Peça</SelectItem>
                      <SelectItem value="Suprimento">Suprimento</SelectItem>
                      <SelectItem value="Produto Final Gráfico">Produto Final Gráfico</SelectItem>
                      <SelectItem value="Insumo Gráfico">Insumo (Gráfica)</SelectItem>
                      <SelectItem value="Insumo para Recondicionamento">Insumo Recondic.</SelectItem>
                      <SelectItem value="Ferramenta">Ferramenta</SelectItem>
                      <SelectItem value="EPI">EPI</SelectItem>
                      <SelectItem value="Acessório">Acessório</SelectItem>
                      <SelectItem value="Uso e Consumo">Materiais de Uso e Consumo</SelectItem>
                      <SelectItem value="Serviço">Serviço</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {loteCampo === "condicao" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nova Condição:</label>
                  <Select value={loteValor} onValueChange={setLoteValor}>
                    <SelectTrigger className="bg-white z-50"><SelectValue placeholder="Selecione (ou deixe em branco para limpar)..." /></SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="Original Novo">Original Novo</SelectItem>
                      <SelectItem value="Original Recondicionado">Original Recondicionado</SelectItem>
                      <SelectItem value="Compatível Novo">Compatível Novo</SelectItem>
                      <SelectItem value="Compatível Recondicionado">Compatível Recondicionado</SelectItem>
                      <SelectItem value="Nova">Nova (Peça)</SelectItem>
                      <SelectItem value="Recondicionada">Recondicionada (Peça)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="outline" onClick={() => setModo("lista")}>Cancelar</Button>
                <Button onClick={aplicarEdicaoLote} className="bg-blue-600 hover:bg-blue-700 text-white">Aplicar Alteração em Massa</Button>
              </div>
            </div>
          </div>
        )}

        {/* MODO LISTA */}
        {modo === "lista" && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            
            {/* acoes auxil e export */}
            <div className="bg-stone-50 border-b p-3 px-4 flex justify-between items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-stone-500" />
                <span className="text-sm font-semibold text-stone-700">Relatórios Auxiliares:</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={exportarAuxiliaresPDF} variant="outline" size="sm" className="gap-2 text-slate-700 border-slate-200 hover:bg-slate-100"><FileDown className="w-4 h-4"/> PDF</Button>
                <Button onClick={exportarAuxiliaresExcel} variant="outline" size="sm" className="gap-2 text-slate-700 border-slate-200 hover:bg-slate-100"><TableIcon className="w-4 h-4"/> Excel</Button>
              </div>
            </div>

            {selecionados.length > 0 && (
              <div className="bg-blue-50 border-b border-blue-100 p-3 px-6 flex justify-between items-center animate-in slide-in-from-top-2">
                <span className="text-blue-800 font-semibold">{selecionados.length} produto(s) selecionado(s)</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelecionados([])} className="text-blue-700 hover:bg-blue-100">Desmarcar Todos</Button>
                  <Button size="sm" onClick={() => setModo("lote")} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    <ListChecks className="w-4 h-4" /> Editar Selecionados
                  </Button>
                </div>
              </div>
            )}

            <div className="p-4 border-b flex flex-wrap gap-3 bg-white items-center">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Buscar Nome, SKU, Compatibilidade..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-[160px] bg-white z-50 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="todas">Todas as Categorias</SelectItem>
                  <SelectItem value="Equipamento">Equipamentos</SelectItem>
                  <SelectItem value="Peça">Peças</SelectItem>
                  <SelectItem value="Suprimento">Suprimentos</SelectItem>
                  <SelectItem value="Produto Final Gráfico">Produtos Finais</SelectItem>
                  <SelectItem value="Insumo Gráfico">Insumos Gráficos</SelectItem>
                  <SelectItem value="Insumo para Recondicionamento">Insumo Recondic.</SelectItem>
                  <SelectItem value="Ferramenta">Ferramentas</SelectItem>
                  <SelectItem value="EPI">EPIs</SelectItem>
                  <SelectItem value="Acessório">Acessórios</SelectItem>
                  <SelectItem value="Uso e Consumo">Uso e Consumo</SelectItem>
                  <SelectItem value="Serviço">Serviços</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroFabricante} onValueChange={setFiltroFabricante}>
                <SelectTrigger className="w-[150px] bg-white z-50 text-xs"><SelectValue placeholder="Fabricante" /></SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="todos">Fabricantes (Todos)</SelectItem>
                  {fabricantesUnicos.map((fab, idx) => (<SelectItem key={idx} value={fab as string}>{fab as string}</SelectItem>))}
                </SelectContent>
              </Select>

              <Select value={filtroCondicao} onValueChange={setFiltroCondicao}>
                <SelectTrigger className="w-[150px] bg-white z-50 text-xs"><SelectValue placeholder="Condição" /></SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="todas">Condição (Todas)</SelectItem>
                  {condicoesUnicas.map((cond, idx) => (<SelectItem key={idx} value={cond as string}>{cond as string}</SelectItem>))}
                </SelectContent>
              </Select>

              <Select value={filtroFamilia} onValueChange={setFiltroFamilia}>
                <SelectTrigger className="w-[150px] bg-white z-50 text-xs"><SelectValue placeholder="Família" /></SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="todas">Família (Todas)</SelectItem>
                  {familiasUnicas.map((fam, idx) => (<SelectItem key={idx} value={fam as string}>{fam as string}</SelectItem>))}
                </SelectContent>
              </Select>

              <Select value={filtroPerfil} onValueChange={setFiltroPerfil}>
                <SelectTrigger className="w-[150px] bg-white z-50 text-xs"><SelectValue placeholder="Perfil" /></SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="todos">Perfil (Todos)</SelectItem>
                  {perfisUnicos.map((perf, idx) => (<SelectItem key={idx} value={perf as string}>{perf as string}</SelectItem>))}
                </SelectContent>
              </Select>

              <div className="border-l border-slate-200 h-6 mx-1 hidden xl:block"></div>
              
              <Select value={ordenacao} onValueChange={setOrdenacao}>
                <SelectTrigger className="w-[140px] bg-white z-50 text-xs"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="nome_asc">A-Z (Nome)</SelectItem>
                  <SelectItem value="categoria_asc">Por Categoria</SelectItem>
                  <SelectItem value="fabricante_asc">Por Fabricante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="divide-y">
              {produtosFiltrados.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Nenhum produto encontrado.</div>
              ) : (
                produtosFiltrados.map(prod => {
                    let sp = { ano: "", formato: "", ppm: "" };
                    if (prod.is_equipamento && prod.especificacoes) {
                        try { sp = typeof prod.especificacoes === 'string' ? JSON.parse(prod.especificacoes) : prod.especificacoes; } catch(e){}
                    }

                    return (
                  <div key={prod.id} className={`p-4 flex items-center justify-between transition-colors ${selecionados.includes(prod.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-4">
                      
                      <input 
                        type="checkbox" 
                        checked={selecionados.includes(prod.id)}
                        onChange={() => toggleSelecao(prod.id)}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer ml-2"
                      />

                      <div className="h-14 w-14 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {prod.imagem_url ? <img src={prod.imagem_url} alt={prod.nome} className="h-full w-full object-cover" /> : <Package className="w-6 h-6 text-stone-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border">{prod.sku || "S/N"}</span>
                          {prod.condicao && <span className="text-xs text-slate-500 italic">{prod.condicao}</span>}
                          {prod.rastreia_serie && <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center gap-1"><Barcode className="w-3 h-3"/> Seriado</span>}
                          {prod.is_equipamento && <span className="text-xs font-bold uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1"><Printer className="w-3 h-3"/> Equipamento</span>}
                        </div>
                        <h3 className="font-semibold text-slate-800">{prod.nome}</h3>
                        <p className="text-sm text-slate-500 flex gap-2 items-center flex-wrap">
                          <span>{prod.categoria}</span>
                          {prod.familia && <span>• {prod.familia}</span>}
                          {prod.perfil && <span>• {prod.perfil}</span>}
                          {prod.fabricante && <span>• {prod.fabricante}</span>}
                        </p>
                        {prod.is_equipamento && (
                            <div className="flex gap-2 mt-1">
                                {sp.ano && <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-1.5 rounded">Lanç.: {sp.ano}</span>}
                                {sp.formato && <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-1.5 rounded">Formato: {sp.formato}</span>}
                                {sp.ppm && <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-1.5 rounded">{sp.ppm} PPM</span>}
                            </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden md:block">
                            <p className="text-xs font-semibold text-slate-500">Custo: R$ {Number(prod.custo_base || 0).toFixed(2).replace('.', ',')}</p>
                            <p className="text-sm font-bold text-emerald-600">Venda: R$ {Number(prod.preco_venda || 0).toFixed(2).replace('.', ',')}</p>
                        </div>
                        <div className="text-center bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">Estoque</p>
                            <p className={`text-lg font-black leading-none ${prod.estoque_atual > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{prod.estoque_atual || 0}</p>
                        </div>
                        
                        <div className="flex flex-col gap-1 ml-2 border-l border-slate-200 pl-3">
                            <Button variant="outline" size="sm" onClick={() => abrirSaldosEstoque(prod)} className="h-7 text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1 bg-emerald-50/30">
                                <MapPin className="w-3 h-3"/> Saldos
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => editarProduto(prod)} className="h-7 text-xs text-slate-500 hover:text-stone-700 gap-1">
                                <Edit className="w-3 h-3" /> Editar
                            </Button>
                        </div>
                    </div>
                  </div>
                )})
              )}
            </div>
          </div>
        )}

        {/* MODO EDITAR */}
        {modo === "editar" && (
          <div className="bg-white rounded-xl border shadow-sm">
            <Tabs defaultValue="geral" className="w-full">
              <div className="border-b px-4 py-2 bg-slate-50 rounded-t-xl">
                <TabsList className="bg-transparent space-x-2">
                  <TabsTrigger value="geral" className="data-[state=active]:bg-white data-[state=active]:shadow-sm"><Package className="w-4 h-4 mr-2"/> Dados Gerais</TabsTrigger>
                  <TabsTrigger value="financeiro" className="data-[state=active]:bg-white data-[state=active]:shadow-sm"><DollarSign className="w-4 h-4 mr-2"/> Financeiro e Fiscal</TabsTrigger>
                  <TabsTrigger value="parametros" className="data-[state=active]:bg-white data-[state=active]:shadow-sm"><Settings2 className="w-4 h-4 mr-2"/> Parâmetros de Estoque</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="geral" className="space-y-6 mt-0">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex flex-col items-center gap-2 w-full md:w-1/4">
                      <div className="w-full aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 overflow-hidden relative">
                        {imagemUrl ? <img src={imagemUrl} alt="Preview" className="w-full h-full object-cover" /> : <><ImageIcon className="w-8 h-8 mb-2 text-slate-300" /><span className="text-xs">Sem Imagem</span></>}
                      </div>
                      <Input value={imagemUrl} onChange={e => setImagemUrl(e.target.value)} placeholder="URL da Imagem" className="text-xs" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full md:w-3/4">
                      <div className="space-y-2 col-span-2">
                        <label className="text-sm font-medium">Nome do Produto <span className="text-red-500">*</span></label>
                        <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Toner Brother TN-3472" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">SKU / Partnumber</label>
                        <Input value={sku} onChange={e => setSku(e.target.value)} placeholder="Ex: TN3472-BR" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Categoria <span className="text-red-500">*</span></label>
                        <Select value={categoria} onValueChange={(val) => { setCategoria(val); setCondicao(""); }}>
                          <SelectTrigger className="bg-white z-50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent className="bg-white z-50">
                            <SelectItem value="Equipamento">Equipamento</SelectItem>
                            <SelectItem value="Peça">Peça</SelectItem>
                            <SelectItem value="Suprimento">Suprimento</SelectItem>
                            <SelectItem value="Produto Final Gráfico">Produto Final Gráfico</SelectItem>
                            <SelectItem value="Insumo Gráfico">Insumo (Gráfica)</SelectItem>
                            <SelectItem value="Insumo para Recondicionamento">Insumo Recondic.</SelectItem>
                            <SelectItem value="Ferramenta">Ferramenta</SelectItem>
                            <SelectItem value="EPI">EPI</SelectItem>
                            <SelectItem value="Acessório">Acessório</SelectItem>
                            <SelectItem value="Uso e Consumo">Materiais de Uso e Consumo</SelectItem>
                            <SelectItem value="Serviço">Serviço</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Família de Produto</label>
                        <Input list="lista-familias" value={familia} onChange={e => setFamilia(e.target.value)} placeholder="Ex: Impressão" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Perfil de Produto</label>
                        <Input list="lista-perfis" value={perfil} onChange={e => setPerfil(e.target.value)} placeholder="Ex: Laser Monocromática" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Fabricante / Marca</label>
                        <Input list="lista-fabricantes" value={fabricante} onChange={e => setFabricante(e.target.value)} placeholder="Ex: Brother" />
                      </div>

                      {categoria === "Suprimento" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-emerald-700">Condição do Suprimento</label>
                          <Select value={condicao || undefined} onValueChange={setCondicao}>
                            <SelectTrigger className="bg-white z-50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent className="bg-white z-50">
                              <SelectItem value="Original Novo">Original Novo</SelectItem>
                              <SelectItem value="Original Recondicionado">Original Recondicionado</SelectItem>
                              <SelectItem value="Compatível Novo">Compatível Novo</SelectItem>
                              <SelectItem value="Compatível Recondicionado">Compatível Recondicionado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      {categoria === "Peça" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-orange-700">Condição da Peça</label>
                          <Select value={condicao || undefined} onValueChange={setCondicao}>
                            <SelectTrigger className="bg-white z-50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent className="bg-white z-50">
                              <SelectItem value="Nova">Nova</SelectItem>
                              <SelectItem value="Recondicionada">Recondicionada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2 col-span-2">
                        <label className="text-sm font-medium">Modelos Compatíveis</label>
                        <Input value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Ex: DCP-L5652" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="text-sm font-bold text-slate-700">Especificações Técnicas e de Controle</h3>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-md border shadow-sm">
                                <input type="checkbox" checked={rastreiaSerie} onChange={(e) => setRastreiaSerie(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-stone-600 focus:ring-stone-600" />
                                <div className="text-xs font-bold text-slate-800"><Barcode className="w-3 h-3 inline mr-1"/> Rastrear Série</div>
                            </label>
                            
                            {/* AQUI ESTÁ O BOTÃO DE EQUIPAMENTO */}
                            <Select value={isEquipamento} onValueChange={setIsEquipamento}>
                                <SelectTrigger className={`h-8 w-44 font-bold text-xs ${isEquipamento === "Sim" ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "bg-white"}`}><SelectValue/></SelectTrigger>
                                <SelectContent><SelectItem value="Sim">É Equipamento (Máquina)</SelectItem><SelectItem value="Não">Insumo / Peça comum</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* SE É EQUIPAMENTO, ABRE AS ESPECIFICAÇÕES AQUI MESMO */}
                    {isEquipamento === "Sim" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-indigo-900 p-4 rounded-xl shadow-inner animate-in fade-in">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-indigo-300 uppercase">Ano Lançamento</label>
                                <Input type="number" value={specs.ano} onChange={e => setSpecs({...specs, ano: e.target.value})} placeholder="Ex: 2022" className="bg-indigo-950/50 border-indigo-700 text-white placeholder:text-indigo-400/50 text-center" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-indigo-300 uppercase">Tamanho Max. de Papel</label>
                                <Select value={specs.formato} onValueChange={v => setSpecs({...specs, formato: v})}>
                                    <SelectTrigger className="bg-indigo-950/50 border-indigo-700 text-white font-bold"><SelectValue/></SelectTrigger>
                                    <SelectContent position="popper" className="z-[99] bg-slate-800 text-white border-slate-700">
                                        <SelectItem value="A4">A4</SelectItem><SelectItem value="A3">A3</SelectItem><SelectItem value="SUPERA3">Super A3</SelectItem><SelectItem value="A0">A0 (Plotter)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-indigo-300 uppercase">Velocidade (PPM)</label>
                                <div className="relative">
                                    <Input type="number" value={specs.ppm} onChange={e => setSpecs({...specs, ppm: e.target.value})} className="bg-indigo-950/50 border-indigo-700 text-white font-bold pr-12 text-center" />
                                    <span className="absolute right-3 top-2 text-[10px] font-bold text-indigo-400">PPM</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {categoria === "Equipamento" && (
                        <><div className="space-y-2"><label className="text-sm font-medium text-blue-700">Ciclo Recomendado</label><Input type="number" value={cicloRecomendado} onChange={e => setCicloRecomendado(e.target.value)} placeholder="Ex: 5000" /></div>
                        <div className="space-y-2"><label className="text-sm font-medium text-red-700">Ciclo Máximo</label><Input type="number" value={cicloMaximo} onChange={e => setCicloMaximo(e.target.value)} placeholder="Ex: 20000" /></div></>
                      )}
                      {categoria === "Suprimento" && (
                        <div className="space-y-2"><label className="text-sm font-medium text-emerald-700">Rend. de Volume (Pág)</label><Input type="number" value={rendimentoVolume} onChange={e => setRendimentoVolume(e.target.value)} placeholder="Ex: 25000" /></div>
                      )}
                      {categoria === "Peça" && (
                        <div className="space-y-2"><label className="text-sm font-medium text-orange-700">Vida Útil Estimada (Pág)</label><Input type="number" value={vidaUtilEstimada} onChange={e => setVidaUtilEstimada(e.target.value)} placeholder="Ex: 200000" /></div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="financeiro" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="text-sm font-bold text-slate-800">Dados Fiscais</h3>
                        <Button size="sm" variant="outline" className="gap-2 text-violet-600 border-violet-200 hover:bg-violet-50" onClick={sugerirFiscalComIA} disabled={carregandoIAFiscal}>
                          {carregandoIAFiscal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Sugerir com IA
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">NCM</label>
                        <div className="relative">
                          <FileDigit className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input list="lista-ncm" value={ncm} onChange={e => setNcm(e.target.value)} className="pl-9 bg-white" placeholder="Ex: 8443.99.33 - Partes e acessórios..." />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">CEST</label>
                        <Input list="lista-cest" value={cest} onChange={e => setCest(e.target.value)} placeholder="Ex: 21.050.00 - Produtos de TI..." className="bg-white" />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="text-sm font-bold text-slate-800">Precificação</h3>
                        <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={cotarNoMercadoComIA} disabled={carregandoIAMercado}>
                          {carregandoIAMercado ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />} Cotar no Mercado
                        </Button>
                      </div>
                      <div className="flex gap-4">
                        <div className="space-y-2 flex-1">
                          <label className="text-sm font-medium">Custo Base (R$)</label>
                          <Input type="number" step="0.01" value={custoBase} onChange={e => setCustoBase(e.target.value)} placeholder="0.00" className="bg-white"/>
                        </div>
                        <div className="space-y-2 flex-1">
                          <label className="text-sm font-medium">Preço de Venda (R$)</label>
                          <Input type="number" step="0.01" value={precoVenda} onChange={e => setPrecoVenda(e.target.value)} placeholder="0.00" className="bg-white"/>
                        </div>
                      </div>

                      {cotacoesMercado.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Radar de Preços Web</p>
                          <div className="space-y-2">
                            {cotacoesMercado.map((cot, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-white p-2 rounded text-sm border shadow-sm">
                                <a href={cot.link} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                                  {cot.loja}
                                </a>
                                <span className="text-emerald-600 font-bold">{cot.preco}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </TabsContent>

                <TabsContent value="parametros" className="space-y-4 mt-0">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <h3 className="text-sm font-bold text-amber-800 mb-1">Dica de Logística</h3>
                    <p className="text-xs text-amber-700">O <strong>Ponto de Pedido</strong> é o momento ideal para comprar mais. O <strong>Estoque Mínimo</strong> é o limite de segurança antes de faltar para o cliente.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-sm font-medium">Ponto de Pedido (Qtd)</label><Input type="number" value={pontoPedido} onChange={e => setPontoPedido(e.target.value)} placeholder="Ex: 10" /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Estoque Mínimo Crítico (Qtd)</label><Input type="number" value={estoqueMinimo} onChange={e => setEstoqueMinimo(e.target.value)} placeholder="Ex: 3" /></div>
                  </div>
                </TabsContent>

                <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setModo("lista")}>Cancelar</Button>
                  <Button onClick={salvarProduto} className="bg-stone-700 hover:bg-stone-800 gap-2"><CheckCircle2 className="w-4 h-4"/> Salvar Produto</Button>
                </div>
              </div>
            </Tabs>
          </div>
        )}

      </div>
    </AppLayout>
  );
}