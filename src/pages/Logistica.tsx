import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Search, Edit, FileDigit, DollarSign, Settings2, Barcode, Image as ImageIcon, Sparkles, ShoppingCart, Loader2, ListChecks, FileDown, Table as TableIcon, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Logistica() {
  const [modo, setModo] = useState<"lista" | "editar" | "lote">("lista");

  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroFabricante, setFiltroFabricante] = useState("todos");
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
  const [carregandoPDF, setCarregandoPDF] = useState(false); // NOVO ESTADO
  const [cotacoesMercado, setCotacoesMercado] = useState<any[]>([]);

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
        cicloRecomendado, cicloMaximo, rendimentoVolume, vidaUtilEstimada,
        custoBase, precoVenda, estoqueMinimo, pontoPedido, ncm, cest, cotacoesMercado
      };
      sessionStorage.setItem("logistica_rascunho", JSON.stringify(draft));
    } else {
      sessionStorage.removeItem("logistica_rascunho");
    }
  }, [modo, produtoId, sku, nome, fabricante, familia, perfil, modelo, categoria, condicao, rastreiaSerie, imagemUrl, cicloRecomendado, cicloMaximo, rendimentoVolume, vidaUtilEstimada, custoBase, precoVenda, estoqueMinimo, pontoPedido, ncm, cest, cotacoesMercado]);

  useEffect(() => { if (modo === "lista") fetchProdutos(); }, [modo]);

  const fetchProdutos = async () => {
    const { data, error } = await supabase.from('log_produtos').select('*').order('nome', { ascending: true });
    if (data) setProdutos(data);
    if (error) console.error(error);
  };

  const novoProduto = () => {
    setProdutoId(null); setSku(""); setNome(""); setFabricante(""); setFamilia(""); setPerfil(""); setModelo("");
    setCategoria("Peça"); setCondicao(""); setRastreiaSerie(false); setImagemUrl("");
    setCicloRecomendado(""); setCicloMaximo(""); setRendimentoVolume(""); setVidaUtilEstimada("");
    setCustoBase(""); setPrecoVenda(""); setEstoqueMinimo(""); setPontoPedido("");
    setNcm(""); setCest(""); setCotacoesMercado([]);
    setModo("editar");
  };

  const editarProduto = (prod: any) => {
    setProdutoId(prod.id); setSku(prod.sku || ""); setNome(prod.nome || "");
    setFabricante(prod.fabricante || ""); setFamilia(prod.familia || ""); setPerfil(prod.perfil || ""); setModelo(prod.modelo || "");
    setCategoria(prod.categoria || "Peça"); setCondicao(prod.condicao || "");
    setRastreiaSerie(prod.rastreia_serie || false); setImagemUrl(prod.imagem_url || "");
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
    const payload = {
      sku, nome, fabricante, familia, perfil, modelo, categoria, condicao, rastreia_serie: rastreiaSerie, imagem_url: imagemUrl,
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
      fetchProdutos();
      setModo("lista");
      setSelecionados([]);
      setLoteCampo("");
      setLoteValor("");
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
      setNcm(dadosIA.ncm || "");
      setCest(dadosIA.cest || "");
    } catch (error) {
      console.error("Erro na IA:", error);
      alert("Houve um erro ao consultar a IA. Verifique sua conexão ou o n8n.");
    } finally {
      setCarregandoIAFiscal(false);
    }
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
    } catch (error) {
      console.error("Erro na cotação:", error);
      alert("Erro ao buscar cotações.");
    } finally {
      setCarregandoIAMercado(false);
    }
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
    const termoBusca = busca.toLowerCase();
    const bateBusca = (prod.nome?.toLowerCase() || "").includes(termoBusca) || (prod.sku?.toLowerCase() || "").includes(termoBusca) || (prod.familia?.toLowerCase() || "").includes(termoBusca) || (prod.perfil?.toLowerCase() || "").includes(termoBusca);
    return bateCategoria && bateFabricante && bateBusca;
  });

  produtosFiltrados = produtosFiltrados.sort((a, b) => {
    if (ordenacao === "nome_asc") return (a.nome || "").localeCompare(b.nome || "");
    if (ordenacao === "categoria_asc") return (a.categoria || "").localeCompare(b.categoria || "");
    if (ordenacao === "fabricante_asc") return (a.fabricante || "").localeCompare(b.fabricante || "");
    return 0;
  });

  const logoBase64 = "data:image/png;base64, iVBORw0KGgoAAAANSUhEUgAAAUAAAAEtCAYAAAB5+rkuAAAQAElEQVR4AexdBYBV1dpd+5zb00NLo4ggKnYjit3d3d0tdjcm2AgKCEgIgpSAdEmK0p3DdN2+/1p7uMrz+fx97/nMuXO/u/fZZ/f59tpfnHPGQe2ndgZqZ6B2Bv6mM1ALgH/TC1877NoZqJ0BoBYAa7mgdgZqZ+BvOwN/awD821712oHXzkDtDNgZqAVAOw21P7UzUDsDf8cZqAXAv+NVrx1z7QzUzoCdgVoAtNPwN/z5lYc8ZcqU4PQx0+t8M+Wb/G+nf1tnxrgZDWeMnNH0u0lf7zBr9Kxm00dObzl5+OQdxwwe027CsAltJ42Y1GbimIk7jxs2rv24kePaTxwzfefpE6a3nDJ2SuN5k+fVnzVrVs7KcSsDCxcu9M0aOis0pd+U4K/c5drqameg1glSywM/PwMEIi8pNH/ixLy5U8Y2njJu5C6jhg4+/pMe79/X/aWuz73wyAuvP3Hvsz0H9RzW54P3e/V55rkXht57X5fRD9z38Jf3P/TQlzfd9cDEBx5+eOJzL774Vfe33x3f88Peo95/v+fId97tMebNV9758r0eH416++2eY1/p+uqExx9/bsrDjzw149Y775l9980Pfn1llxvm3n/Lw9Nf69l97CejB31+1/X3D7rr+i69Hr/nmfffeuG91/t9OOiW4Z8OP2DCyAlN1b9JkyZlLR2+1J9KpczPj6r2bO0M1MxArQRYMw9/69+F4xZmLpiwoOnC6Qv3mDJq+llfDhn/3Aev9xz1zEMvTBvw4cBZrz79xtyHH39l/oNdXlvw7JNvzR49Ytpn3yxa/1Qk5rurWfOWNxx+xGEXXXLZRafc1+Xeo159/ZWDevT8YM8vRg1v+/mIYTuNGj281RejhjXr/+knTXr2e7/Jh33ea9yj17tNP+jxTpPeAz9s/GGvdxt93Pf9+v0HftRw6BcDGo4cPXSHL8ePaDJ2/PBWw7/4vE3Pj3t2eO6F5w646547D7/xlhtPPfOc0y/ssE+Hy5JI3PDtd992HfHFmClvvPH2ovu6PLfs+Ude+vaxd59YeP8tD85+9uHnpvZ5r+/QMUPHPDb9y1knzJ8/P2/+xPl5f+sLXTv4f5qBWgD8pyn56yaMGzfOM2fcnNyFMxY2XDRtUetJIyddMeD9QX2HjBo+tv/gwWPvuPP+8V1ffvXjAQMH37Vixeqj2u+6+/5nnXXe7i+//Grr3r0/afLpp4PyBg/9NPTYE0+7Dz3YBTffch3OuvB0HNR5fzRr1QQNmzVAbv0sbCraiJSbhC/HBTxAdSICEwCi0bg9TjHNUKGNRRMwijtAPAkUF5cjxbgILOr6gJx6IdRvlEeqg4aN62G/g/bEUccegWtvvQoPPXIfXnnlRdOnz0eZg4Z+lj9gwKeNn332hZ0uuOCiPXdp0/6ApUuWn9j7o/4PvvDCCwPvubHLNx9+3GvkS491/fST9/s/P+HzSefP+HLGrrO+mtVo3sh5GX/dq147sp+bAbLbz52uPfdnngGphbOnTdt94fR5V86d8vV7m1ZsnDx+yrjpzz33/Kz7Hrx/7quvvfbuzDlTz9lrn/b7nXP+aa2HDOuf+8nAj7wvv/YcHnuuC44+vhP2Oqg9svL88IUAbxaBKhFHIAdweZxIEdAIVOs3rMGGzatwxNGH4pZbr8e9Xe7A2g3LsaVgI+BNwBNIobq6jHUYxGPVML4kqqvKkHKjSKQiqApXwONPIq9uBlJOjKCYRIT5XOZLmQTC8Up4QwbwxEhJ+DNdxKJVgJOAgNLxA46H5AUaNa+LdrvtjJPPOA4PPnE/3uvVHf0+7eMbPHRwozPPOWvfNm13Pn3hNwvufOudbh8//uQT09966+3JIyZ/8dXQvkM/pw3ynplfzTxYoPhnvu61ff/lM+D88qy1Of/IM7By3LjAV1981WjCyLEHLZ674LQpoyd0mzh99oQBfQaNvufee9/p0qXL5UuWLNmvZcuWOz/y+CONBw8dFHr/w/fxzAtP49DDD0K7PXeFP8OLwuLN8HhTgAFiBB6kkvD6UnC8SQte4Vg5QOCLRarg+h2UlhZg+Igh6Nu/D5Yt/xYDh3yKispiVEUqUVlVgtNOPxn77LsHps+ahtVrlsH1OXjssS444qjD0b59W7ZXgFDIjwMP2g97dGiPE0481tJZZ5+O666/Gg8/0gXrBLDr1+DNN19Dn969MHfOLKxZvxrwpJBIxFBaXAaXIChpUlbtZIrAyP6Dn4LNBUhyDL4MgwMO2hfHn3wcHnvqUXz4UQ/2uW/GY4891rJd+/Z7fTVxwvFdX3nlmWeefmp4z549xvZ9v8/g8SO+vP7ridP3mDdtXpOlS5eyBVZY+/1LzYDzlxrN32ww8+bNy5gzeca+E0aMf6U8mDdq1aoV0yZPnDqmy0OPDXzimWevNa5vtxNPObn+p4MHcbH3w0NPPox99t8XeXXyUBWuRkZuCOWVZQyzUF1VwdlLoE69fJsGJLBsxVK89NLzeOe9twk0UTz+1OM48ZQT8fSzT1Fi8+CKKy7B/gfsi0ceeQhjvxyNI47oRPB0sGLFMrTasQXOOecszF8wF2VlJbj0sovRvHlTlJQW4bPPBhMslyASrUZ+Xg4KCjZhw/q1KNiyCQvmz8Xi7xZh6ZLv8OmAfvio14f4cuxoHHTwAej6ykt4ueuLOJl96NjpUFx2+cVou9tOeOSJ+7B23XJcee1FePHlZyhFhrFq9WJs3boe9RrX4XG0RmIkiIej5aioKoYn5CCY6UV2fgbHdDyeePpJfNT7I7zy+mvZ11x/XduVa1ad8s57773x4KOPzRwwcMCkz/oNmbhkznfPTvpi/OHjho6ry8n6s35r+73dDDjbxWujf4IZmDZ8ePbXE7/eY85Xc+5etXDV5xMnTh82YsTImy+//KpDN27c0myPPfcJ9u7dB7SH4ZprrsEBBxxACc5FIOiDpKPcOlnIyg4iRCovLaFdLox1q1djPoGnrLQUQ4YMwvHHH4tGDerhkksuodT1Oj77fBgqqivx9dezsW7dWrz1VneECaBjx45FeXk56tVrQKqHOXPmobKyEj5fADNmzEBBQSGqq6vRtGlzAmgCt99+J/Ly8nH44Z2RTCZx8MEHU9B0UbdOfbTduS2ys3Lhc3044/SzUF5WCb8viObNWuL5515EvboNUCe/ns2Tk52H/Py67PNClJWXYGvhJguQkyZ/hTfefBUPPHw/ur/1Bg4+5CBcSZAsLCzAunVr0OO9d9i/cmTmZCHKfkWjYYRyMqmqb4Av00eJtRSNWzZG0+ZNcNvtt+CjPh+hb9++3kMP7dg84Avse931N979wYcfDfl63txxY4Z8+eKsL6fuv2DaggZ/Arap7eK/mAHnX6TXJv+BZkDOi5ULl3SYOmbSk9WJ4JjPh42Y9PgTTz47ftykwzxuoP5lV1yDaQScu++/C8efdAySCcpvVPvijFSFKyntVSIcrUSCdrOM7BBeePlZ3HbbDXB9hqB0Ozp27Igrr7mS0uE+CGSEUFpRDrjOtngZlixZDNd1sXT5MjorEojRDvjwo48gJycHHtePzwYOxUc9PgbiBk7SRTycwEvPvQyX3g4PvKiXVx+5mXmIVEYRq44R0F7G1k2F+PC9njBJB0UFxXj9lTfh0mMSqYphj/YdsEODxnBSbPO7ZWjcsAk2rtuEr8ZNxMknn4bKyjDWr92I4sJi1KvfEGvWrofjepGdk4doLIEhnw3DqDFf0r4I+IMhfDLgUxx2RGc8+sSTeLHrK5g7dx6+/XYxXnzxRTzxxMMExCBStEVm5WWivLwIWfmZYOMgOsPv9+PII4/E9bfegF4f98Hbb72T1aBew/bdu79z+3Mvvv7VoIFDxk0Y9tVHMyfMPH7GuBkNUfv5U82A86fq7d+os7qxeMmchR2WLVh8zta1BUPHjhk//J5777u/T5+P991nvz0ze/fthZdeeRbX3nAldt6lORdwys5OLBKHSzub3++Dx+OgqHirVTkfeOA+qqv7of1uuxAgBuHTgf2x2+7tsM8+eyEWi2Dr1gICSwWef/45FBZuRVZWFtasWY2MjAymV+K9D95HUVERotEoHMehhDnApgcCIdx00y0466xz4KPkFwplMk/cSoMej495PVixYhU2bdqCJ598Gl6vH+UlZXR0+GAMvRYUS+sQxFLGoVQIBEIZqKoKW+kxlkihRYtW2FSwBZmZ2bjznrvxxRdfsP4o6tWrRyk0yjF6UFFRBfXpiCOOYL5Mglg5PcrFdj4E7h9++AHV9SsQj8cxZswYjq8Qxx13DF5943V8wHEt+nYhjj7mSLTdpQ2GDfkMqVgU/qAf6yk1CvgTiQSqK8Jo1Lgu2wHOOOMM9B/cm5JwN9+++x3QdsDAgRc89uiTA2bOmDl86pipdy+f++3OC6ZNq5UM7RX4Y/38uDe1APjjGfmdj+dNn9dy4qjJ93gioaETJswe+chDz/YdPnzcsa4n0GjcVxPw1vtv4diTjkTKE0Z1ohTRZBWSTooURmllCWbNmYYRo4bhtrtuQvMdm+K2O2/Bcy8+h08HD8SqNWsIGmGC0Sa0bNmSIFOAQUMHwhv0wPUYBKgmN2xUH5lZtA2WlyGRjFk7XV5+Dj7p0xc5Wdnwuh5ClkFeTi46depEJ0gpVhIop86YjsKSYjRr2QKReAyO14MzzzmbgJaJzVSFp8+cjczsXBQR/LIoqW1YvxEev58SJX0qSWDl6rV0iJQSeIKMr0Y0EUUwI4BlK5dhn/32RjAziP6f9mP5QiRpn9x5l9aQh3jt6jVo0rgRpd4YPv6oJ0qKC5GZEYThnMQTERQVF0Be6v4DeiOHNs8NG1fjqacfxdaSrZTuPPB7vbjq8quwYukKlJWUoLKiAv379UPDuvXQ5f4HEE+E4bgp1pdEZSUlYx/ozXbZTgl0y8+xJ3fGS6++gD79+gQbNW2258uvvvns5dfcMnPo55PGTh41/cXvZn7XZuG4cZm/M1vVNv8vZqAWAP/FxPyWyXrSYsLnIzt+O+ebO+fPnT/44159n3rmmWc6h6uj9Z957gW8886buPTKi+BQZQWBCgQAw0UZzArCG3Dx3vvdrCH/+ReexgUXn4crr7oUW+hQCIUCtL3FsWHDekpXSdSpU8eGGtvRRx+NJk2aUDpbYdMjkQgXeCWdD8tRXRUhOPgRCmYiEU9B9rjVBJry8gokEklKh9mscyPatdsVr7/+OlbThli3bl2ceOKJeOCBB2g3fJOq5RO44IILrMQ1c+ZM2v7y4CHY5LMP69evR6NGjVFEFdYf8KGsohydO3cm8K3AtGnTcPW112DSpEl49dVX8e67b9MR8hFOOOE4qr8no8kOO9CG2AmdqLYLjPPz8/Fhj162r35fELu0aYdjjj4OPm+A9ZegW7duCAaD0PgCgQBth/lU6ZegQ4fdCGoplJWVIegPIBqOwHEcOlKuwV13382+Opg5expVfwPjJiklV6PLQ/dhQP++9SEELwAAEABJREFUcAIOcvOzuEFEAQ8sEGfkBXDKaSeiR88PMX7SyOydd95lV1672++9//5J85ZtGDj281HnTR03roXmvpb+ODPg/HG68vfryYoFCxp8O2P+1au/Wz526vQZQy675LLntxYX7n773Tc7n37eB1ddfzEat8yjzS1MO141YEAwKsUMSlNIeWlTi1gJbNq0qVQ5vyZoTASXI1XECBYt+gbllOImT56MvfbaywLQpk2b0LDBDvB6/OjxQU/oRmSa81BcVIY6+fXRdpf2VD/ZjhqCS6/uUTj99LPoTLkeN9xwE3r2/Ahjx47DwoWLsHrVetx042249667kZedhWuuvALd33wDRx3RGccedTTOO/sctG61I+rXzbeUl5dDNbKM3UuhcaNGiNMBkV8nj+pwCXJYvqqiDH6fh1JaNuqxTMtmzQl6J+C4o49BJaWyJ2i/e/+99zHg00/ZTjfcevPNVNHXYMGCRQgEMtCnTz/cf/+DGDVqLHbbrQPatNkF9es3wM6t26Jd291QVRnBOtoNr7ziariOF4Vbi7HH7nvCTyl07fo11vu9G0HxsksuhON14WFfookYwS2JGCXhmbNn0Jb4Cd7s/hoB/hVMmToJa1hu8+YNcCgVxsJRG/q4ScWjVJPPPQGfDeuHt959t25B0dajPnivR+8pk6eN7/9hryGzJk7cf8OsWSFerNrv7zwDzu/c/m/a/B+hsZXjxgVmjJ+87/wps6/p23fw2J4f935z1MixB+y//0G5U7+eTuntMhr285GiGumnpFFSuAWBTC9C2X5EqitwN6WTM888m5LWg/DT/paXl4crr7zSSjYCuH322QehUAiu68JLiathw4bYe++9UVhYSImtHb76aiIBMop4PIG6VPPatGmLPTvsi1Ytd0bHQ4/A/fc9hAnjJ2PunIXo9uY7eOnFV3HffV0suBzZ+Vi02bkdQHD0ETi8Ph+WLV+NVQSW22+/D+WlYRA9kJGVC8fxE0SC8Pky4PWHEI8AwVA2QHDl0JgWIIBH6ZHORSKStKGHZRBz4DV+COARM3C9IQS9WUDCA2qjiFXGKYHWgevJ4Bw58LtBC4Dt2u6OSy6+grV7bTig/2DMm/sN+n0yEK90fQMXX3Q5Xn+tO6XI0yiZXkwJtAlmzZoNj4egS2fOFto999xzT0yaOgVen0vJ2guf34PKSIUNu73dHXAEhnE889wz+Oa7hZhNUNxrrz1w0UUXIEWpHLRZwqRYJzi2JPSp3yAPN998M3p98jFatdqp+fwFi05+8813Phs8YUqfSWPGH7541uK6yldLv88M1ALgbzTvS5cu9X89efqBxd6st2bPnjvs1ttu795qx512PeGEE9zutOsddsThKNi8BZl52citl4ty2vO2Fm3GF6OH42KqtW+82pXSitdKHS4X6IiRI9G7bx8CRRJ777kH110KleXlaN60Ke10LiHKQQ4dB0Wyv02ZhqxQJoq3FtETnMCXo8fi5htuxlmU7t576wP07z8An/YbhLtuvwfnnXM+dtxxJ2QGs+B1PAiFgkAcKCuqgGMMYuEEklEgEUkhxTBamUKsQscgiGWDzlRUFMVQVZrE1g3lKCAt/WYNlixajfmzlmDmpAX4Zt4yzJ7yDebN/g4zJy/AdwtXYsZXc7Fq6UasWLwOZcVRFG+upMSYAmIgeLocJwjqHoJ6EKkwEC5OwBgPUvQiE33g83kRpYc5GUvZuEMPdMAbAoU3tGjaCvff0wVnnnYW6uY2xJOPPoOzTz8fXQj2nw4aDH8wg3W7+OijjyBA3Lx5M6rDYYKsBxmZmSgpK8L0mdOQVycX9RrURXFpEebOn4M7774DyVQcs2ZPJ/zFrKRI1zf69O9HAHWgVzKUV1aA3eRYqnHyqafj4UefwNPPvlC/YGvZye+903Pk5GkTR48Y8PlLi6fMbfwbsWJtM9vNgLNdvDb6P5iBtVOmBKeNmXT4llWbXv2k74Dh99xz78XG46k/dtx4nHPBuTi44yEo2LKFiyWJenRAVFMVLC8pQTYlu8uvuAy33XabtYu98mpXjP1yDHbZZWf2MoloLIw777ydaixRCA7OP/985ObmEsz60x6WQRvgFlx44cUEzSBycvLw3HMvYdy4iVzgPrRosRPrvQO333EPmrdqga2biyCHQ2YOPbAVUYQr4nAMWYP4A1JJcQWyczKZr4SqZBjfLPwW476cQMD4BN26vYU7br8bt992D4454hSceMIZuPCCiyhlXYS777oHjz76OLq9+bZVn/v27YehQz/HoEFD6JkeRml0EkaNGIVP+/enaj0Wr7zUlVLamwTiOymJdsHF51+C4486HeeeeT467n80rrjwBtx49Z149aW30KtnbwwdOBrz5n1DQF2MjWsLEMoMwEepN0XQRMqxUq5jXDiOQ8dIJqXgYjpiMsDdAZdecgUuv+xqSsXt2Y+JmDZ1Bl595XUc1vFw3HvP/YjFEvQuV8B1XZx91rkU7pKUNAOYt2A+9t9/XwwZOhgZdBbl0kGUnZ3NNgxcTwrffbcIjz32EFq3boXXXnsF48aPBpyUnd94PE7QNqjfoB4l+AfwUtdXvaUVFR0+HTL4tg/69v5i8ZzFp+q1Yaj9/GYz4PxmLf3NGtK9e5tXbN5jdUXio/GTJg28r0uXqy+78srcYSM+p5H/asALlJQWM0wQ+OrQixvHQw89YG/NyMrLpdE+iptuuR05eXVhXA8lwircdscdWL16Fc+FUV5RRFUwE6eccgrC1RE82OUhGv2LUbdOPdr89rHgd/75F2LZshXo128ATj31DDRq3ITA5qPH1CGQRVFVEcaWDUWoWz8f4cokiraUUXry0TFQQdCdhffe60Ub30N4icDUqePRuPba63HLLbcR+Hpj1qyvbd699+2Aq669DNffdDVGjhuCgUP6od+nvTFg0Me0f73B8TyHF7s+gWeefwiPPtEFjz1zLx556m50efge3HH39XjgsTtw7wN34b6H78DLbz6Ll958Cu9/2B1dX38R/Qf1wtARAzFweG98NW0Unnz2Mdx+9y044JB90bh5QxRs3YQRI0bglVde42ZwN22PJ+O6627GI488SYD93Dp0imjfNC7o/U4gKzMHFNVQWRrhBhOCP+RDPJxEyJ9JysDxx5yAp59+jmaG+/B297fx8IOP0o5aZTcRn8eP6sqwBUbdkpOXVwclJWWQLTGXm5Xr9cBxXdx407WoqCyjdz6MwcMG4sZbrsedd92Kl15+Dr5MH6ojlbDSZQAWQG+57RY8/+LzuOjSS9tfde3Vg157942Roz4b9dDCGQsb/s2WzO8yXOd3afUv3Ghq3DjP15Om75Moj33w7HPPfPn8Sy+evnObNrkTJo9H0+ZN4XhcLqIIJIVkZgUwecpEzJv3NU466QQCzjvo0aMHkEpBDoojDj8SyWSSntcUdt99d2zatBmrVq2iqplhpREvVeFF33yLjz/ug0J6VKdQ1R0/fhJefvkVPPXkc2jSpDnKy6ohm5skuUrGjQHrTiIYCCIUDED2wjEjx1tv7r333ovjjz8Rd911BwjgdJzk4KyzzsKZZ56O8V+NonTZm318G8++8Djuvf92njsNhxx6AHbbqy3a7Loj6CCGP8OF8QKuH/CGDMcLgjsgb6lUwVQCHA/gDTI9leRQkwQGl/ZNzkmK+ZKQ8AZ/pgOVcQkU0UgcMEDDpnXQomUT7H/oXjj+xKNw+TUX4f4H7qRT4nV83PcDfPJJH0pfj+HYY4/GunXrePwJbr31VnQ69EjoqZi3334bAwZ8howMPzZvKEZpYSV8QT8qysNUb+vD66G0nJGHVNLFKSefgTNOPwcZgWwMGvgZ3ur2DjeAG3ATnUGTJ05FTH1KGl6HEG2p9SltxrF6zWp6xzfASyfKU089gY0b18FxDFq2aoZnn3sKHQ/eH489/hAi0UpuPtXwBgxBtAi5eTlot1tbiEe6dXuzdZ8+/R699/4HxvXo1vPuOePmtEDt5382A87/rOa/YcXfzfuuzfCC8v4DPh08qmfPXheee8H5+YOHDcKpp56KaDiGUFaQqmsVwcGgoqIYDz36EM4++yysozdxjz12p0Tl5UKKYt9990ZMXgOTtAb0aDSK6upqpAiMl19+OYFwE6W8vXDLzbdh1dr12HXX3SjFNUKjhk2RmZ2DnGwu4pSBQCNAoPNT0ikuKkeKC3bhgu/w1lvv4I477sVhhx2FW265BbO/nsn6OuAR9mfQoE/R/a03KQXdidPPPBl7770bdm3fFvEooPpcD4hQpCTguEDSpAh8KQJ1CpK0UqkkPD7DDClibgpS/xyqhuCR60vBMO54U/a8y3zGxyidC/4sL+BlpQwEoHCYzvrVpi/IRo1qAByW4RlG+MvsSZLL05LssnMyCEa5OODAfXHTzdfg8acfpur9PoZ8NojA/Q4aN2nEjaIA519wIa666go6d+7DU488izmz5qFgfRFgDAoLihGPJFBRXEWgzKTaX0SwS+LITkfj5htvx2GHHIFJE6bSpvgQDj6oIwEwSEBPwu8PoFevXhDw7rbbbnjyySdQWlaMJA2lTz/9JOo2yEfrtjvh474fYe/99sStd96IJA2cefVzURkuQ1W4kjMEeP1evPzqSxg4cOAu69avf7bLEw+PHTF4xPPjvhi3E2o/v/oMOL96jX/DCudPmbXLhOFjn3+n+1tjiX6nnn7a6XnvfvA+7Uvt6CzgCuUs+4JeLqQwBgwagPbt2+Goo45EJQ3kmTSy33brHbQZtYaALskVvWnTJqqw58P1OHahZmQErWRxNz3AyWQKy5auRK+evXnuWuixs46HHU5jP6VG2q0k5Xm9Pqp8EWzZtBUbN2ym0f9ZAt1tOOWU0/DBBx8S7PbCJZdchtGjR+O9D96iPfBWgsZ+qFevLjLobQ5m+uEl0MRZn4CIuABDkDKGF5dj4S+UTjMbQwOBHByDFAE7HQp/dZwgICboKPhXYYqgLhK81YQJEFJ5uA1ADaMEWbBd1Ql7rDQS0wzBT8Aridr2j3lVD6sFEQYOz2dmZtg6TzrpRFx+xaVU4T/Ca6+/gueefwZ77rk3pk+fiTvvvBvHdD4RH3/0CebOngfZQ+NVKXt7kKGjJcXBVlNSbNemPVo13wmnnnQ6+nzcDyOGjcJ1196ARNzgtVffQB5V40MPPRR+vx8+n4/mhDJkZ2fy2Ivhwz9Dw0Z1EU9E4LrA6aefgoMO3I/5PBYsw+Eq+AM+5ORnETjjuP2OW/Hpp5+2mjnj6zu7vfHmF5/3+/zeMUPGNLDzX/vzq8wAWehXqedvWcnsKVN2Gjd8TNcxYyeM/LDnR3eeffY5jaVm7X3QPgQQDzJyQnADDiTRVNMu9Hq3V/Hxxz1RUVmKyuoKFBRu5by5qKioRjyeQiiUAS3iWDwMPcHQps2OgEngwovOw+23304V7HrceONtqFd3B8SqDUBVTQsTjEYiUWRkhqjeJvBW9/dwI629xPwAABAASURBVFpMmjyeUmE6PAHggQceQJXLLiPw5eLD999FjRrV8M67b+Gbb79mfyyFs885EwFu0JUscRxSU4pAqpXvvtuFhx96FEuWLEX79h1Ro9aV0BXnjl2zhk03lS5Vot+QsTfeJ7dCKuCAVWD8s3+r1qt6oHO/rkMm3HHzlTNn3f3cxIl3IDktgJ3cBXaiMYwdczNqXnkV6tauT+XydtSsUQdJgTSce25FbN68GbZt4PFY7lGZB2bPxD33zkBaWpKrH/R4DfwBDztyEOXKFce0aRNxbfu2uO76vrj++kH49ttdyM0OwuO1KBVYMDYQizgcTICWwMI6LZ+MMZQKowAdHJJMQwiUqRfeJX1QUHF1P65dIoeU8odMii+Me+SdANMj3f4c+1+Zi3ipZanMgnJYNCyyx7im+CmSv4gebAtzmKLhGAwBTyQ+g4AHx8Cw4QRyYncs5sCmvlgUDQOGYZKSfFINujrlj7d/gZ49r8OsWbMwYMAATJo6AedfcA50eX0sC5fK02dMQSSaz8m1C/r264Ws7ExOoFNRvnxZSK2yf/9eDBw4ECkpqVzyRpCdkYvqVavjrdffwp7v9yI5kAQnGMeA667b0aVLpweGjRvetNuAXuuVRyH9wAG1/g9P/3DbJdWrf96nU7825cuWvat61Wq7eSGfOrkrLr8CCx59DBMnTsZd0+4CHC9n9Djefed9d9f2oosr8jlCiS6Kbdu2uS+en/Kvk1394Hfffc0xFENyMqd1cjsnJw+VLjkXc+c+gGHDhuCWsbdi0qQp+PSjb7jc4a4xB4xN0AyHojAMz9EDw2WUBq3H42EeMabnwKJnJMKdQ4bTmcUIdxgNpQ2L5NqNwsbdsG6zGuMa2mzRERuZrsPf/McFsSPqaIyBeGRMAT+0+x6JRCBTPMahyxgDY0jkZ4y78yFuVMlLbSAzAYQCvAilOjiA9LYe26JpQ8AX41KX0eH1GeRlhdk3PkavXr2wYMFj1PWNxJ13TsZJJ5+AvOx8t//k5eWyvQiwNnDccSW5ZD6IN6nzU/n04VL9i4cDBw5AK4+FCxfi2muvxYgRI9kfPZh57314as3TnLhTULRIOiLBULRW7Vqbrq5bu+2StSuGVKtWLRuF1//jgPX/XP7hDhfWvDCjS++ug6dPm3zVyhXLnxo3dkwm+zQiBBqLs/rggcNw5mlnY9Twm6mzS4PH44MOVuuk/WmnnUbQWwYddyhduhRupz6nfv2r8cyzT1ORnQUNoiJFk9nJQYkwB/869QTMe2QWmjZtCn2b8Oabb8aqVU8iEnQQ4M5eXla+2xpRDsBYJIooB6pteRGnhGBgcaD5OLh8HABwywFekkK8PrkRJBnWMh76W/QpuI0xsCwLxqI7/v6XMZSTJQmTflpbgaPARPozAZsxhhNM3J3UBHqaJNTutu2DnxtVrsTHyUimJh2lxy4Br22xTQDZw5S6DD3UDjZZzCSxauXTaNehPRYvW4qHHpqHAQOvd/8Xr2UDah6PF/Ale9mWBu++9xbOPecMHMzYB0l9F11UEWeccRpuuOEGzJw5E3l5eQRLTqgsz5z75uLiCy7BV59/hYb1GyFzfybyMvMwasSNn7e5ps29986bWa9x25ZbUXj9IgesX/T5B3sYY+KXXH75By3rX9Wxft063Vu1bvXRylXL4XCmL168BBYvWowu3TrjkYcXIBKO4/33P0Tjxk25E3cAqampSEpKwpdffomsrCz4fF4qrq/D2WefDT+XQUK/KMWDIkWSESGo5eWEceGF5+HOGXdgzJibsI+7epdXq4JxY27loAtA6QeDYQ4OH2zLjyjLYFEC1SCMRw30ocy8vHwYtqTstm27LRclSErSg2EYiimSWGIEUj27xFCuP82/+22MIOnHtZS0J9JkJdIko2eBojEGNqVtw4nCJj8FhPkEHn2HT27gFYsCwfwIgnlRiPd0YlsAOgmQnRXCZ599xv6xENWq1YS+urxo0eMYMuQG5OTmoGSp4hCwhsMhxs+FL4ntSr1xq1Yt0K9fH0QpOmZkHEDlypdg9erV0Pcr2YRcMt+PTz7+DMlJaejWtSfKl6+AcuXLw7JsqC8tWbIkt0uHjutr1b7qmtXr19xw7rnncj2hkhXSL3GAw+aXvArdL6xZM6NOk4bLRo0Y2uDrL754okXTZpm7vtuJGPVAYNe6sGJFPP74Yoy/dSIuuvAS7N+XgYyD2QSuJBQpUpQd08KUKVNQrFhR7N79Pa6/ri8urnQhhg0fAstjuOTdB8uOweM3yOXSuPQJJdGmTWu88srLqFWrpmsfMmgw3n5zK2Ihx8UtDwek16aEFwdktyyD5JQkSnngMs4hvhqWIRMerw0NDG2qaFC7pGMZ3GxxdYXc6ZbbP7mVVX8fpWVJgDb5aoyBwC5CdYI+ChrS15flblnwev2wbYpq5Lvez6UzAgEvAj6Py3vLgauHe+OVt9Gvdx+sW7cOup5/fiMlvj5wqLcNcFPMseLQe985+Zwck/3Y/sl2lClTCmdyU6ND547IzstBMBLkRkdp6ps/wN69+yn1BZEcSEZqUhEkJadj04YXMWLYaDRr0hI5mbnY9sGHmHT7HW8GPN7+/Yb1b92wVcM3lXch/XsOWP8+SGGIylde+UWNinW69evft+XUqXduuvXWW2MH92chTmns/HMvRP16jXHZZdUIaFkYMGAQB4ShNOBg0KBB3Ek+Dfofq2eeeSbee+89fPnl59iw4Tkcz5l7zdrVeO31l5Cbl4GUVD8YCek68pCfiypVqmDZyqWUGobgww+2ozoliWmT78WrL70DAVgwFwjlOVxWx5CXGyL4FbSTzfGYkpLmPkgq0CC36ej1+aBBLilH0k6Bu+2G+zv/qJ4i1VFmgowxnCAsbiAEEQqFKEFFID8PJb8Ad1f1hoafJnjFKE0bY4NsdHm/b98BRPIdthc9eW/e+BKXp7O5YdGDbbsBd9xxB6X+/tyJbQev9H95IYaKw+f3crLyISv7AIqVKIIZ3Oho06YVgTSA5OQk6oSHoUHDevCxrXT4XpL/okWLcPBABpfF52PF6jVwIkDR9BKUHGPuauCee+85OHfunNnnV7zgmo59ujxUk5M2Cq/fzAHrN4f8hwes1LhSXt3G9Te07XZt6wvPrzimT+8+H1MRHY+E4ihTphzOOvM8AtXHxDANqigqVrwIs2behw4dOiInJ5cz+V53gJUsWdK1X3ppJRw8uB/dunfG6qeWI+6E8O67b7mK79SiaQS0CGf3PJx4wglo2bI1XnzxeVxS6TIsWrgEzZt2xMplT2Hbhzvg8djM04GtluRupJZlXu4khkMxDj6iIdtN6q8CSdC4g96m+GIZ+f39ARA/uQRyCTLGuOAjwBHwWZT0FNz155pT0mBcO7rc4ZeEF9Zy1wDFihbnsvQ7TJ96j3sy4IUtz0PHUpYsXYgRNw5FmbLHwaLEJ90ek4HOESZzgssm8OUFc1CseDoOHNyLYiXSYVNSP+mUk1Dh5JNwMDMD6h/6aOmpp54Om+20YvlKVKp0KUaNuhkx6he19PbQ/eNtO9Dg6gYvF0lO63D37Lv7tWzf8nMc9dfRV0ANm6OvVEdxiSpXrry/ZZeWdwwfOaTu9zu/faxO3bo7N298gTqdiHsk4aYxozFp4hRUqHAya2Hhi0+/wM6dO9mBR6FYsWLIyDiItLRUTJhwGx56eC4BCShbtiw3T5ag/4DruXz2Ijcrw91ISU1LhvECSdQR5efHOBAqYcY9E7Bi5WM4mJFB/dAqdOvck4r1R/Day28RDA38thfxKOCBzTI5sAiKAsNgbpBpRvlswbJtGA5RbargN11xhvqBHA5uuETno+B2fqUMxhgYU0AKJnCLE5VkirT7G6VuNBqOQBtNcX2CyvEwqMV4FhyqDSJSP9jAnt37MPGOO3H11Q3w8MMPQ3rdNWvWYPiNI1DzqispRcYYD/BwAvJ6bTAbOE6c0n0yxOuUlBSkJqdwcgujWNGiaN2qFQ4c2IfvvvsOlNzcZe+C+QvRtUsPZGflwWLj79y5B7t27kXV6tUQCkbwwubNuGnEmO1zH5wzYey40a2vH379WkOdtZtx4c9/zAHrP45RGMHlQKXqlb6u2ah2zzvG31zv9ddefaJ7l+7fvvbKq9DZ5ObNWuDOO6dj5fLVuK7v9bim1TWYfudUvPv2VnhtgxpXVMXgIQOgj1bWqFED1atfySXTQD7vAhXZ0JKsSIk07Duwl0u0EFKLJiEl3QZVQIhQh5cfCaPvwA64+ZZhmD17No4vezw2b3oRNa+oh2l33ovnN7yMWBhwuEmSnREmqNoIeAMIcAnGUeWWMRqMEjC9DORWB9n6FBOtAgMavOMuxVkhh2AXol5KZsyJ8inu6rTirh+TY9AYKe4UJEeD/j9vV5gjKUaAUGo/jSM3UcL9l8JF4xGEYiHmF4fsDkun/36muCJW4vAdDkdhjM16e2Bbtnu8SKbP4+Wy0093LwwBz7AuWmrmZsbw2cff4P5756F+7ea49+77IJXH+o1rcev40QTC2swzBl/AQ3478PqZps16s9D51CMyC+Tm5wEGbpvqOIvt8SAvO4d63beQ7A/ghS1byPtM3D/rPsQiMRw8kINy5SqgerXaKFvmJHTv3BfrN25Exu5MDOh/3Y733n97ysUVz2o066G7R1erW20nCq//iQOFAPg/sE8vkVetc+X7l155SY8+fXo3W75kyarrevfb+97WdxANRVGmdDkMHzUKjRs2ob7nbnCso0SJUpTc1uCTTz6h3ieZu8eNufs7hlJeEk7gcrdZs2YoXqoEYpRKSh5XAhZbKJ86wTzu9Gog2RROYvEwpY0oQL9AqoV6detg+IiB2Lh+HS644AJ8tG07l81t0KdnP2za+DzWr30RoSAQD7GyHJyMDo/fg0gwhngMzAtIS02jJ+CxOJi57MvLCyJK3ZfFTHOZt9/rI8g4sIxFaSaM/GA+fYwbx9DgjYSpJXeUgzkUijB9x5WEGNkNaymgbCyHwtlMz0B/YJACR4c25SvXxE51IhwYKU5GGqVBsi0vpV4/yxOCpbITXb0ePxQfBDPVgcEQpqrCYxPg+KAPXUhvaizWne5g/nt37Uf2wXxkZeZj4eMr0KhhS7RqeY0rXZ9zzjlY8eQKTJxyC+rWraXgLuUHgwhwY4PFRYg7+/ncrWf2eqS/gexFiqRS8g5z8kmGzxdAnx69UK9eAyxbshz5+SEUL16cKo0WMCzMZZWr4TuuFvbvzeQqYjK2bHoJzZs0R++ufT7p0qnzzN6dO9UeNHLw8Jbd2hcud/H7XOwCv09C/z6Vv28ILl9yql9d/a22za/t3KpVi44z7525ftyYmzNi4QiC2UGce+75aMSOvP7ZTRg+7CaULFEWxdKOg89KciW/FStWwM/BcfuEO1CkaFECUxA2l6mZGRnwEaiSkv0IBHzQZWwgOTUJXrpreQUOt6Q0OvIOx/JxVYPq6NyffuuGAAAQAElEQVTtWqx6ajGm3XWnu6P4/JbNaNf+Wtw2YQrm3D8fn3/xHaVDwEv9oSEA6iMMES6x83MiygK2ZZCclAyP7UGEAJGanOYq3S14CX4GHpY7OZAGA4vPBB4ThWVFCZj5iITzYPHZ63U46A1s7nLb9DPgEjMWJNgGAW6hK7zNHdF4NAaBnEMR0hD/jJuqUbVoA2zLhsO1pLtE5aRg6GobCwqv3dpYhEFjQJIvict7ls3YUDoO3SwDulmgoErJ24JNa5igz2rD7/Eh52AQn3/2HebetwC33ToFLVu0xbCho1geg6VLl+Lpp5diwu2jUaNmFQRS4YKcJ8UgGM4FPBEkie+eKPQlGK/XwLYdEINhbOZL0vKaRYckP/AyVEs888xz+O7bXXjs0ceRlJKGtKSiuGva3dj2/kdYsOBxbq5EUaJkOt584w3cMLj/F/MeemBis+Z1a6/asOr6S6++8hsUXr8rB6zfNbV/eGKV6lTKrNWozjOd+3Vtf8EF5w69ecyY5yfdfseBrW+9A4c7xhVO/BeuvaYjO/d7HGg3oVTJ8rAtH/bu2Qe/34/c3FxkZWTBtr3cOMlxzxTGNYLIV2OMCwR6tgmOdOLyK4IQl6bwGMAT5yBNQpySV0p6EhwGKJKejNatm2D8bTdhydLHUb9BXRx/QnncdfcM6pzqo2XL9pgyZQbeYfk+2v4ppVAvwnlxhHKIHlEmwEQ8xkNpFgRgPyJBB17Lhq2yhAkIOUGCqJegFkU0GHLtXkqKjIlYKEypMwgQ4ARgIHAJUG2CqkW73GOUmizLYnpyITE/gVVccSJxLgmjiIdjoA88Hi8UH3FA/oYg6GNeAjO5CfRcMAwzS1KYejvpQkPcDALZw+B4e+uH3Ex6FWNGj0eP7n3QsWNnzLx3FnVvZamjHY1161bhgXnT0b5DM3gIaCqO5QEcm8QHfxIfCO4Bnedkpo7Ow7DAxo7D67fg8VoA3eMUq222kermUGKV7k/Lb70iN/7WOzhpwP3IRtb+LAQ4uXjsAOsaJ3+jWLp4Cbp36vHpgsfm39/o6oaNpt8/fWSDli2/ZcKF9x/AAbXYH5DsPzvJyy+/fE+bLu3ntWp+TatTTz+9/7Nrn1l42y23fSLFtuFoDPj8uKZ1G6xetQYfvLcdVSpXJfBl46QTT0aRYiVgeb3Q4BGJk3odLxwNwXAg2rZBjCNdujiP108JMQnxuOVSOBKF5bOJLXGacMlQcBTB4+CSqhegRu1qmDLtDmzY/DTuvnsaWFa89srrWLhgEWpWq4tuXbrjjgkTsWjBMrz20tv4+oudyOBApdCGKKXBUE4c3LBmLQB/IIAYJSrbIjj5kkAsAKijhGPB9gYI6skEKweO3Ahorl9MNbJZOC9sO8AHA3CjRnHjDKOwFuMby6K/B5aLcAwTZ1ClEwUMl7YKT6xhfoDFXrzv+2zYACXVKLSc/ejDj7DmyWcw8+6Z6NiuO2pUq4cnHn+CktY21K9bHzffPA4rVjzhHkBv3LwW0kukuvzSshUewD7ENxXN9jJhyyGPCVJaP7u1t+DAglHmtLESUBtJ6lP72Gwnl4yRF3xM0LYtdLi2I55YuBgL5j/Bti6OzH1ZcGIGW19/GyNvvPHDgwf2j27dqFGdu+fc3bdBmwbbmHPh/QdywPoD0/7HJ31Vi6v2d+jR4fHL61brxB3DTsNuGDana6ce723e9FJYOrkIpRuvx8+BuAofffQpjj/+RGTtz4AGdjIlAwGJRXDx+XwEkySXn5IobNuGZSz3OS8vDNfKcebzegqGokOU4XN+MJdgGeZGSi48Pse125IUkz2wKLWUPeE4VKlyCYbeOBDjx4/FpuefxT33zESTJs3gcOQ/98x6TJ58J/r1uQ61azfgMnEC5s59EPPnL8amZ1/Ejg8+x749mQjnxgHunsbDNqUYwlCEZdNz0MDyBJiXHzBElLgXiBFdwvQXheCCKVfH0GVZNozNggtgmKTrTsCLBxmNYUHgc+i+n3m+8epWrFyyBvPmzMeYERPw4LyHqGtthc6du2Lo4GFYvHgpdIi4SpXLMWPGDDy/eR1GjhyJfv16omrVSjj51LIQ0HlYJGUXSGIelLYtFk/PAj3pOeNE2lAon8XjpGJZ8LK9wpRQ+QRjFBmQTlL/58MYlZ3JcnltjCG/Her/YqBACItxwbIfOHDQnXRsmxnxefsH29GhbbvX16x5avQlF1/S9Loh/SfUb9f8SxRefwoHrD8ll394JtQRRlt1avXaw0vn9WrWonGjF57fNLjdNa03vPD883tC3GDQERUn4sAXSKZUUBQwbBZimKShODckLMPBAlCXFOOSNwoHFslwcEWhD2rm5EVAvKJfHOAY9Hi91FPlI5Dkh83lsU+7lNz5KLBbCIWyoWUbOCJjcKDLHfjMtlipZFS86By069QCo0YPg75P9/DDD2LD82vRtm1bnHna6fCwfG+//TYee+xx3DJuMpo364zqVRujWdNO6NHjBnTvOhj9+43BuLHTMH7sPZg8YTZm3r0ADz+4Ao8vWIsnFq3DItLjj6/BwoWrsWDBk/RbhtmzHse0KXNw69jpGDHsNtww6GZ07zYI7dv3QtOm7VDnqhY022PUqNvwzDMvYNfuAyhOiblpsya4ssYVTPNxPPzoQ3h0/oOYMHEMOnW6FpdfeTHSi6eBbCRvk2D7WVuyk1iH3JwQHFY/yl3kSDQI2xtHWCoFLnMdE0FSkhe27cBH9QSM4Y5ukLvwgIGXZLM9HMQJynIx5ImfUrDDhhDYaQ4SxagHli7S2EA0DOpWU92D63fcNuFgo3qNnlu+dEnPkbfdVOu2abdPaNul7WcovP5UDrDL/6n5/eMza9au2TdjJo2ZOXj0wNZfff3VsO49us+fdMfkbW+++aYjlVIkP+K+0C7ws7w2LA68IHcXY1we2rYXfq9GMNnIgebzebh8ApKSvXQAbJ+FAmkkAr9PbkwyFmUaFmzLhqSUaIR+FHfih16F83gNB7UDCTP53LUVHrpj2gEEikVKJCE53UvJDjiv4umoVecKtGnXCjcM7Y9bbhuNe2dOxlNPPY7Nm1djyZLHKEHehQkTJmDgwAFo1aoVdY013POLJ51UAWlpaWB1KBkRdinKCSi4noXN5bnOPJY/vjQuvOgC1Kt/FTp2ao++lNbG33YLZs66C0uXLcQzzy7HylULcN/9UzHqpoHo3bsjmreujwsvPg+VL6+IlDQfklM85AMQI9hYXiCYH4WHpmUBxgbc+rFuYW6o+Mk3x4nR3wsveRkOhSCexqg8NAwapaohSvEt7kT5BIJXMjwey6UYQFMJeshfn0sOl+7a2Q1TVUBv+hskpQYQkR6SDlu2bKHaYfo3nbt0mP+v005tedPwm9pOuW/qXO7c59K78P4LOGD9BXkWZkkO6J9ODx83/NHFq5d2/NcZpzdZt+7Zfm1at3n60YceyQAM4nEHGnfZmblITkmCwMLiqOR4RMw9ngJKIByGlFSME4ZF9LRJliG40Ixz6QZeHttD4IvTZiPMgejxJjOeYXp+YoHHBQWP34B4Cr8AgT3C9gFMEFKqObSyOPCm0MLxbrx0pr9WtMYPWAEgYfpTgSIlgDInJOFfZ5bCeRdVQLVa56HW1RejYbNqaNn2KkqWDXBt54au2bZTfdqb4poOjelXn2FqokadS6mrPAfnVDwZp51dHuUqpKN46QACaYDld6B8LX/cNSmIFdTSQ1yLA1SFSmvAAgE2yyUA9HO5H43HEaEEHCagxU3crbOfGxoCM6iiBK48SoM+nyppwYgZrLTH9sIm08kdMHWEtPtLqTlKdDUEcGPAUEAoGIcKEo8Aackp8HEzJEpeB3Oi+Pbz73HvXTODl1eu9uJbb7zW05/sb7SUbd6+e/tN+g4lCq+/lAPWX5p7YeYuB7r07vLZhOkT7h/Sr2vbzIys/oMG9F/UvXOXbYsXLc7zSXyhAJKdke2G5XiEQFAPPkqIcQ5qSyORA1NKeLkbYwigcTh64BANh6LQDmRSkgY44PXYBT4cwAoTc7ibHMpDlMtALY0ZnanFOeBDAJX/UUpE4XCEwBmlO2MwOn8ZPkb9Yj7D5XHpmI9oPER/ooAVg6GuUQQCMvj8syQ/kqF/gsDl548phoJnmgpH3aVbxkMm8Z0SJIMQmC2W1RgHjgg0Kd0ZAp5lxWFRFSAzTqSKsZwxolWUZNkGxDLYBDscuizXbh16MrCM7dbTz80rOA55GYNFviqeeOXzWOAjsrIKBLlQbgxLFi+Lde3a9YtbbrllfkpSoN2EO2+rOfzm4XMHDRv0Hgqvo4YDbLmjpiz/+IJc1qBB1pCbh8yfM39eux69e9X/+quv+nfv3m1+t27dt7788st58bADjl9XwtC5vSiffd6AyzcDDzieOQ5teCgmGW44WBSR4hSLBHy2bRMUQdCKg8IlorE4BB6SZiz2An/ABy0DBQoCUgGFz09UIZhw/CNBAhKO/sPPgeQk+APJ8PmT4PH6IfBwGMChFEXBizBk/Ruy6e8lrhSYgAdg+RNmPG6zvF7IdBwPHNYnYUL5kCEOKU5xWWWO0RSpHglyXBBkshZ4xUERD4b1Ur0dho8T4FV/2bUMlnoAvDi3MCj1qXkRJPnTEI0YxKM2At4kgDu3Sk56PSYFzh349ONP0bv7ddubNG68KDMzs0WX9h0unzt/dsfeN/ReKT0wkyy8jzIOqA2PsiIVFkccqF6n+teUGB5csHRBx0bNG7beseOjQTVr1Fgx+qab3nj9lTfyHAKYh1INOCidqAfxkIOkQAoggOAObER6KAdwaHc45nUOTQNeyz5JQqJwJA9eW12AEBKPIc6AtmXD67FhW4ZL5wiLEgetBDe6SdIBEztEts0w1CXGSPF4HI7jMDwILsYly7Lw7y7DAC7ppyA6iIh05c1nQ3feTI/OzFpZsJjMC2CWDMTbxGEk/ZEslslmgT22BY8QHnDjKg3wsoxhfSzYxoLcaACML1I9fH4/wCWxyGZ85WXbcgOnExsUJhELAlkH890zkxuf3Zg5dtQtL9auWevRjRuea1bzyupXP7v56Xb9BvV6sl7Let8DhdfRzAHraC5cYdkKONCyZcvPBwwZNGfLq1taVL64crMlixd2aNWs+fR2rdqtW7F09R5Lg9qxQVUg8rNj4KoSST4fJMEQB1yTQ54DG4jTMZifA4vLSZ/XLsiAQAPufHDFCA14A3YLSnAWbEhadAgVDlFJpHdyowRLUSQWBVOEMY5ryv5bSXGMIQTxhogpGGZLA4lnmW4Qusu0bECYag49y02geySB5RYZ1kHksby0WTCOdahoBmBxpUeNhMLUi4bgsOJh7sZ7lAHDZR7IRCg3DF3cIIaXwM+Nc2iDGHHgvplzvp565/SVbVpdc+OH771bt8JZJzTY8vqmzjeOHbaqXbd23yheIR0bHGCvODYKWljKAg40bdd05513T1+xeuOawR26d7j2vbff7tysOy6kKgAACAlJREFUYYvbW7Vo89TDD87f8d477xMBGZYDNcYxvH9PLjwecDc0hAP7M2FZXgSSkgmEDpX3YS7rFNymtORjOEqSjBfhTjFgMawF23iYGCBpS0Bj8dkmUBhjEzgc2LbXDWdZHhhjGLagSzkEIoUHCp5lGmMYxiaZw+FoKbjp5IZ3wZQIdciME5HlLvBNmEwGhskaxjGGP0qBwOUQxCWJiqTzjFMyJba5UnAs6kD8QAwwcQ8sN7wND3dLPJ4k13R0RpFZpyQXhT/JB+6bgAIl1q7akDFt2rQXrqp51aMDrh/Uyo5H61Y5/sK2q55ZOmnw6MGvd+/evUBBi8LrWOMAu9GxVuTC8iY40KhRo4Pjpoxbt+qZFTcte3pJY9vEa85/+OF2rZq1v6tZ03ZrHnt44WdfffltXFJLakoARVPTCQYEMy6Z4fjhp17LY/sQFzhwo0Smlo1ejx+GfwIR8DIECws2ZBo9E9QsIpDH4+PmQBih/DAijK+jOgIcEIgM4xs3Dm2MbwiIoAkCzA8m4BZIkUgGccb6MR3p/3N2YwwsQ0Aj2QT3H8iGxWeHdSsAPYZT/iobTcPwXssPJ2JTfaBiqH7A/p35+ODdT3Lvv+vRD9q16fJQvTpNu2x9+62qFUueVWfLWxs63/vgXcv6jej3cYMBDbhDhMLrVzlw9HtaR38RC0v4WznQuW/n7+59+K4ly9Y+PmjCjaPbRp14k/kLHm3XonG7SQ3rtVw2dcrdrz3x+PLcrz//Flo252UFEc6NwkQt2NR38RcCC0SZIyUl29gIB6kbjBLE4kCMZigvRmkyStAELIJawO+DPxCA1+eBTVHTuD3KEFF4Mw5T4s1n/v7ynQiYMAtCSuKzbBvGsn4gc0RaBLJQfpQAHEU4FEEkHKVE67CcjH+oDpbF+LYFy7ZhwQNDnShYN5EhGIaDcaxdvf67CeMnrejT64a7OnfuNOzhRx5sWCTJc8Xi1Y90e/alJx8Zc9uI7YWAh7/lZf0ta1VYKZxb89ycPgM6bJs+8/bFK55ZdOPaDctbnXR82cZf7vi82dhRY4c3qNnkob5d+264c+K0zzc+uznv60+/QySHAES5Rq+eiYWxfMBH4LCJOYaSm03w8VNvGBDYMUCMIOPQPUZAiURj7s4yH0Gk+XkyjHSIHIqCojhB1FEEgq1MPYtAcDPGAxza1JGJKLsrd4UltYG7sfEIKMX64Ke+0+fxwuvxwGMbyp0gWpNYPnfZS1N127H9s8hzz2zcNX7s7ZuubdNpTp2r6o7o3L5t7bdee6lumZOLXTP70RmD1mxceuc9c6Zsbt+v/UGmUHj/zTnAHvU3r2Fh9Q5zoE23NntH3jZs/aPLHpzy9Auru3Ud0LnZ2aedUXvzpo3XTJ44aXjLFi0eat6s1aqhw4ZtvG3MHe8+s/aZXW+/uS2+8+v9CBMMBThBmonNAGIjAQqggMXdZJsSoYUod6PD+XEorCEaxgk+CeIq113F6tmJGcRJINCBGzjEQxhCl0UwNHRz/RiXq2JKbUAkn4nx1g6spDeHfhbBTno6PUeYb8b+HOz8Zg8+/ODjg6tWrd1+59S7l426cdS9LRq3vL15syYDZj8wq8kH77935YWnnN9o4ZOP9drw8nOTlzy9ZOO4qeO29e7dm3CKwusfxgHrj6tvYcpHOwdq1qyZ07xr8y9vu+u2p2Y+es+U1ZtWdVu5flmz9LKpdU4ud+IVn3y8vdbSxQuaDB3Wv0+9elfd3KRxk6nX9e390C3jbl5394yZ7z08d8Gup1dvyn9587v47KNdyNgXQjRoCFjsVgQoEFKsOMANZxg+a5faSbiROcQvgiYgMItS8hSwxmkqrEWwA0kvX+RxiyE3K4aP3/sGH3/4JTZveP3g44+t+OqWkbe/OGzI8PmdOna6rXmzZv06d2jfZujwodUfeGDWFds+f7f6sNEDW02+947+K55bftOazWvumT57+roh44Z80rh34zxmX3gXcoDTbSETCjnwEw6MGzcu3mFAh6wbxtyw/fYZt69ZuHzh7E2vbBj/9MbVQx98/IFuF1x6XouiKWm1svbsv2Lr6681eurJla2nT5nUfeB1fYa0b9t2bLNGzabUr9Ponjq1GtzX4Kqm9zVt1Oq+9m06z+7Rpdfsfj36zundvd8DPTr2mdOlfc8HOnfsMadrxx5zu3bsNrdz+85z2lzT8YFGjVvOrl2zwZwrq1w1u0G9+tO6dLh2+OABfbvNmzu71f2zZ129efP6Gtnf77707EtPqz1t1pSOjy1+bMya9U/e9+RzTy5ZuOSxF+++/+4PRo0atf8n1Sp8LOTA/+MAp+r/51boUMiBX+VAmzZt8jtf33n/wDEDd4yZOHLjHTPGLZ358IwH5694eNqKZ564de3mVcOffWnNgPUvP93v6Ree7Pfk+mX9Fq5+tM9Di+f0mb3g/l4PzL+v97xFs3s98sTc3o8umtfr0cXzes5f+lDPhSse7bVs9fzea55b3mfjy0/32rJ1Q58Nr64bsmTdwikPLZ370JT7Jyy758Epz46786b3+o7ru4flCP9qQQs9CznwbzhQCID/hkH/pXdhtEIOFHLgGOBAIQAeA41UWMRCDhRy4I/hQCEA/jF8LUy1kAOFHDgGOFAIgMdAIx1rRSwsbyEHjhUOFALgsdJSheUs5EAhB353DhQC4O/O0sIECzlQyIFjhQOFAHistFRhOY8NDhSW8pjiQCEAHlPNVVjYQg4UcuD35MD/AQAA//9EExQaAAAABklEQVQDAIuizJm4WmD4AAAAAElFTkSuQmCC";

  const exportarPDFProdutos = async () => {
    if (produtosFiltrados.length === 0) return alert("Não há produtos para exportar!");
    
    setCarregandoPDF(true); // Liga o botão de carregamento
    const doc = new jsPDF("l", "mm", "a4");

    // Função para renderizar Cabeçalho e Rodapé em TODAS as páginas
    const adicionarCabecalhoRodape = (data: any) => {
      // Cabeçalho
      doc.addImage(logoBase64, 'PNG', 14, 10, 25, 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("TC COPIADORAS - Catálogo de Produtos", 42, 18);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Filtros Ativos: Categoria: ${filtroCategoria} | Fabricante: ${filtroFabricante} | Ordenação: ${ordenacao}`, 42, 24);
      doc.text(`Total de Itens: ${produtosFiltrados.length}`, 42, 29);

      // Rodapé
      const numPagina = data.pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("TC COPIADORAS - Sistema ERP Interno", 14, doc.internal.pageSize.height - 10);
      doc.text(`Página ${numPagina}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: "right" });
    };

    // Função auxiliar para tentar baixar a imagem e converter em Base64
    const carregarImagem = (url: string) => {
      return new Promise<string | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Tenta contornar bloqueios de CORS
        img.src = url;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/jpeg"));
        };
        img.onerror = () => resolve(null); // Se der erro, não trava o PDF
      });
    };

    // Prep dados (pré-carregan as imagens)
    const bodyData = [];
    for (const p of produtosFiltrados) {
      let imgData = null;
      if (p.imagem_url) {
        imgData = await carregarImagem(p.imagem_url);
      }
      bodyData.push([
        { content: "", styles: { minCellHeight: 20 } }, // espaço vazio para a foto desenhada por cima
        p.sku || "S/N", 
        p.nome, 
        p.categoria, 
        p.familia || "-", 
        p.perfil || "-", 
        p.fabricante || "-", 
        `R$ ${Number(p.custo_base).toFixed(2)}`, 
        `R$ ${Number(p.preco_venda).toFixed(2)}`,
        imgData // Base64 na coluna 9 invisível para usar no didDrawCell
      ]);
    }

    autoTable(doc, {
      startY: 35, // comeca depois do cabeçalho
      head: [['FOTO', 'SKU', 'NOME', 'CATEGORIA', 'FAMÍLIA', 'PERFIL', 'FABRICANTE', 'CUSTO BASE', 'PREÇO VENDA']],
      body: bodyData.map(row => row.slice(0, 9)), // apenas os textos para a tabela
      theme: 'grid',
      headStyles: { fillColor: [41, 37, 36], textColor: [255,255,255], valign: 'middle', halign: 'center' },
      styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' }, // largura fixa para a coluna da Foto
      },
      didDrawPage: adicionarCabecalhoRodape,
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const rowIndex = data.row.index;
          const imgData = bodyData[rowIndex][9]; // puxa imagem base64 logo
          
          if (imgData) {
            // desenha imagem
            const tamanhoImg = 16; 
            const x = data.cell.x + (data.cell.width - tamanhoImg) / 2;
            const y = data.cell.y + (data.cell.height - tamanhoImg) / 2;
            doc.addImage(imgData as string, 'JPEG', x, y, tamanhoImg, tamanhoImg);
          } else {
            doc.setFontSize(6);
            doc.setTextColor(150, 150, 150);
            doc.text("Sem foto", data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 2, { align: 'center' });
          }
        }
      }
    });

    doc.save("Catálogo_de_Produtos_TC_Copiadoras.pdf");
    setCarregandoPDF(false); // desliga botao
  };

  const exportarExcelProdutos = () => {
    if (produtosFiltrados.length === 0) return alert("Não há produtos para exportar!");
    let csvContent = "SKU;NOME;CATEGORIA;CONDIÇÃO;FAMÍLIA;PERFIL;FABRICANTE;CUSTO_BASE;PRECO_VENDA;ESTOQUE_MINIMO;NCM;CEST\n";
    produtosFiltrados.forEach(p => {
      const linha = [
        p.sku || "", `"${p.nome || ""}"`, p.categoria || "", p.condicao || "", p.familia || "", p.perfil || "", p.fabricante || "",
        Number(p.custo_base || 0).toFixed(2).replace('.', ','), Number(p.preco_venda || 0).toFixed(2).replace('.', ','),
        p.estoque_minimo || "0", `"${p.ncm || ""}"`, `"${p.cest || ""}"`
      ].join(";");
      csvContent += linha + "\n";
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "Produtos_TC_Copiadoras.csv";
    a.click();
  };

  const exportarAuxiliaresPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Relatório de Cadastros Auxiliares", 14, 20);
    
    let yPos = 30;
    const adicionarTabela = (titulo: string, itens: string[]) => {
      if (itens.length === 0) return;
      doc.setFontSize(12);
      doc.text(titulo, 14, yPos);
      autoTable(doc, {
        startY: yPos + 4,
        head: [[titulo.toUpperCase()]],
        body: itens.map(i => [i]),
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0,0,0] },
        styles: { fontSize: 9, cellPadding: 2 }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
      if (yPos > 270) { doc.addPage(); yPos = 20; }
    };

    adicionarTabela("Categorias Ativas", categoriasUnicas as string[]);
    adicionarTabela("Famílias de Produtos", familiasUnicas as string[]);
    adicionarTabela("Perfis de Produtos", perfisUnicos as string[]);
    adicionarTabela("Condições", condicoesUnicas as string[]);
    adicionarTabela("Fabricantes / Marcas", fabricantesUnicos as string[]);
    adicionarTabela("NCMs Registrados", ncmUnicos as string[]);
    adicionarTabela("CESTs Registrados", cestUnicos as string[]);

    doc.save("Cadastros_Auxiliares.pdf");
  };

  const exportarAuxiliaresExcel = () => {
    const maxLinhas = Math.max(categoriasUnicas.length, familiasUnicas.length, perfisUnicos.length, condicoesUnicas.length, fabricantesUnicos.length, ncmUnicos.length, cestUnicos.length);
    let csvContent = "CATEGORIAS;FAMILIAS;PERFIS;CONDICOES;FABRICANTES;NCM;CEST\n";
    
    for (let i = 0; i < maxLinhas; i++) {
      const linha = [
        categoriasUnicas[i] || "", familiasUnicas[i] || "", perfisUnicos[i] || "", condicoesUnicas[i] || "",
        fabricantesUnicos[i] || "", `"${ncmUnicos[i] || ""}"`, `"${cestUnicos[i] || ""}"`
      ].join(";");
      csvContent += linha + "\n";
    }
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "Cadastros_Auxiliares.csv";
    a.click();
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        
        {/* renderiz autocompl */}
        <datalist id="lista-fabricantes">{fabricantesUnicos.map((f, i) => <option key={i} value={f as string} />)}</datalist>
        <datalist id="lista-familias">{familiasUnicas.map((f, i) => <option key={i} value={f as string} />)}</datalist>
        <datalist id="lista-perfis">{perfisUnicos.map((f, i) => <option key={i} value={f as string} />)}</datalist>
        <datalist id="lista-ncm">{ncmUnicos.map((f, i) => <option key={i} value={f as string} />)}</datalist>
        <datalist id="lista-cest">{cestUnicos.map((f, i) => <option key={i} value={f as string} />)}</datalist>

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

        {/* lote */}
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

        {/* lista */}
        {modo === "lista" && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            
            {/* acoes rapidas e export */}
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

            <div className="p-4 border-b flex flex-wrap gap-4 bg-white items-center">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Buscar Nome, PartNumber, Família ou Perfil..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-[180px] bg-white z-50"><SelectValue placeholder="Categoria" /></SelectTrigger>
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
                <SelectTrigger className="w-[180px] bg-white z-50"><SelectValue placeholder="Fabricante" /></SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="todos">Todos os Fabricantes</SelectItem>
                  {fabricantesUnicos.map((fab, idx) => (<SelectItem key={idx} value={fab as string}>{fab as string}</SelectItem>))}
                </SelectContent>
              </Select>
              <div className="border-l border-slate-200 h-8 mx-1"></div>
              <Select value={ordenacao} onValueChange={setOrdenacao}>
                <SelectTrigger className="w-[160px] bg-white z-50"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
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
                produtosFiltrados.map(prod => (
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
                        </div>
                        <h3 className="font-semibold text-slate-800">{prod.nome}</h3>
                        <p className="text-sm text-slate-500">
                          {prod.categoria} 
                          {prod.familia && ` • ${prod.familia}`}
                          {prod.perfil && ` • ${prod.perfil}`}
                          {prod.fabricante && ` • ${prod.fabricante}`}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => editarProduto(prod)} className="text-slate-400 hover:text-stone-700"><Edit className="w-4 h-4" /></Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* edicao */}
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

                      {/* autosugest datalist */}
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

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 border-b pb-2">Especificações Técnicas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 flex flex-col justify-center">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={rastreiaSerie} onChange={(e) => setRastreiaSerie(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-stone-600 focus:ring-stone-600" />
                          <div><p className="text-sm font-bold text-slate-800">Rastrear Série</p><p className="text-xs text-slate-500">Bipar serial no estoque</p></div>
                        </label>
                      </div>
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
                  <Button onClick={salvarProduto} className="bg-stone-700 hover:bg-stone-800">Salvar Produto</Button>
                </div>
              </div>
            </Tabs>
          </div>
        )}

      </div>
    </AppLayout>
  );
}