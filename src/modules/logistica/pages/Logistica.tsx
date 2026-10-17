import { useState, useEffect } from "react";
import AppLayout from "@/shared/components/layout/AppLayout";
import { supabase } from "@/shared/lib/supabase/client";

// Importações dos nossos subcomponentes (vamos criá-los a seguir)
import ListaProdutos from "../components/ListaProdutos";
import FormProduto from "../components/FormProdutos";
import ModalInventario from "../components/ModalInventario";
import ModalExtrato from "../components/ModalExtrato";

export default function Logistica() {
  const [modo, setModo] = useState<"lista" | "editar">("lista");
  const [usuarioAtual, setUsuarioAtual] = useState("Sistema");

  // Dados Globais do Módulo
  const [produtos, setProdutos] = useState<any[]>([]);
  const [locaisEstoque, setLocaisEstoque] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Controle de Edição e Modais
  const [produtoAlvo, setProdutoAlvo] = useState<any | null>(null);
  const [modalInventarioAberto, setModalInventarioAberto] = useState(false);
  const [modalExtratoAberto, setModalExtratoAberto] = useState(false);

  useEffect(() => {
    fetchUsuario();
    fetchDadosBasicos();
  }, []);

  const fetchUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const { data } = await supabase.from('permissoes').select('nome').eq('email', user.email).single();
      setUsuarioAtual(data?.nome || user.email);
    }
  };

  const fetchDadosBasicos = async () => {
    setCarregando(true);
    const [prodRes, locaisRes] = await Promise.all([
      supabase.from('log_produtos').select('*').order('nome', { ascending: true }),
      supabase.from('log_locais').select('*').order('nome')
    ]);
    if (prodRes.data) setProdutos(prodRes.data);
    if (locaisRes.data) setLocaisEstoque(locaisRes.data);
    setCarregando(false);
  };

  // Funções de Navegação e Gatilhos
  const handleNovo = () => {
    setProdutoAlvo(null);
    setModo("editar");
  };

  const handleEditar = (prod: any) => {
    setProdutoAlvo(prod);
    setModo("editar");
  };

  const handleAbrirInventario = (prod: any) => {
    setProdutoAlvo(prod);
    setModalInventarioAberto(true);
  };

  const handleAbrirExtrato = (prod: any) => {
    setProdutoAlvo(prod);
    setModalExtratoAberto(true);
  };

  const handleVoltar = () => {
    setProdutoAlvo(null);
    setModo("lista");
    fetchDadosBasicos(); // Recarrega ao voltar para garantir dados frescos
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto mb-12">
        {modo === "lista" && (
          <ListaProdutos 
            produtos={produtos} 
            carregando={carregando}
            onNovo={handleNovo}
            onEditar={handleEditar}
            onInventario={handleAbrirInventario}
            onExtrato={handleAbrirExtrato}
            refreshProdutos={fetchDadosBasicos}
          />
        )}

        {modo === "editar" && (
          <FormProduto 
            produtoInicial={produtoAlvo} 
            onVoltar={handleVoltar} 
          />
        )}

        {modalInventarioAberto && produtoAlvo && (
          <ModalInventario 
            produto={produtoAlvo}
            locais={locaisEstoque}
            usuarioAtual={usuarioAtual}
            onClose={() => setModalInventarioAberto(false)}
            onSuccess={fetchDadosBasicos}
          />
        )}

        {modalExtratoAberto && produtoAlvo && (
          <ModalExtrato 
            produto={produtoAlvo}
            locais={locaisEstoque}
            onClose={() => setModalExtratoAberto(false)}
          />
        )}
      </div>
    </AppLayout>
  );
}