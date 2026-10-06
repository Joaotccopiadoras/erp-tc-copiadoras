import { supabase } from "@/shared/lib/supabase/client";
import { createClient } from "@supabase/supabase-js";

export const carregarPermissoes = async () => {
  const { data, error } = await supabase
    .from("permissoes")
    .select("*, rh_colaboradores(nome)")
    .order("criado_em", { ascending: true });
    
  if (error) throw new Error("Erro ao carregar permissões");
  return data || [];
};

export const carregarColaboradoresDP = async () => {
  const { data, error } = await supabase
    .from("rh_colaboradores")
    .select("id, nome, cargo")
    .order("nome");
    
  if (error) throw new Error("Erro ao carregar colaboradores do DP");
  return data || [];
};

export const buscarPerfilAtual = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data, error } = await supabase
    .from("permissoes")
    .select("is_admin, nome, email, email_auth")
    .or(`email.eq.${user.email},email_auth.eq.${user.email}`)
    .order("is_admin", { ascending: false })
    .limit(1);
    
  if (error) {
    console.warn("Aviso Supabase (Busca Avançada Falhou):", error.message);
    
    const fallback = await supabase
      .from("permissoes")
      .select("is_admin, nome, email")
      .eq("email", user.email)
      .order("is_admin", { ascending: false })
      .limit(1);
      
    if (!fallback.error && fallback.data && fallback.data.length > 0) {
      return fallback.data[0];
    }
    throw new Error("Erro ao validar acessos: " + error.message);
  }
  
  return data && data.length > 0 ? data[0] : null;
};

export const criarNovoUsuario = async (email: string, nomeUsuario: string, senha: string) => {
  const emailAutenticacao = `${nomeUsuario.toLowerCase().trim().replace(/\s+/g, '')}@sistema.local`;
  
  const { error: authError } = await supabase.auth.signUp({
    email: emailAutenticacao,
    password: senha,
  });

  if (authError) throw new Error("Erro no Auth: " + authError.message);

  const { error: dbError } = await supabase.from("permissoes").insert([{ 
    email: email.toLowerCase().trim(), 
    email_auth: emailAutenticacao,
    nome_usuario: nomeUsuario.toLowerCase().trim(),
    acesso_financeiro: false, 
    is_admin: false, 
    departamento: 'Geral', 
    perfil_operacional: 'Nenhum' 
  }]);
  
  if (dbError) throw new Error("Erro ao salvar permissões: " + dbError.message);
};

export const revogarAcessoUsuario = async (id: string) => {
  const { error } = await supabase.from("permissoes").delete().eq("id", id);
  if (error) throw new Error("Erro ao remover utilizador");
};

export const atualizarPermissoesUsuario = async (usuarioEditando: any) => {
  const payload = {
    nome: usuarioEditando.nome, 
    departamento: usuarioEditando.departamento, 
    perfil_operacional: usuarioEditando.perfil_operacional,
    colaborador_id: usuarioEditando.colaborador_id === "nenhum" ? null : usuarioEditando.colaborador_id,
    is_admin: usuarioEditando.is_admin, 
    acesso_financeiro: usuarioEditando.acesso_financeiro,
    pode_editar_os: usuarioEditando.pode_editar_os, 
    pode_ver_dp_global: usuarioEditando.pode_ver_dp_global
  };
  
  const { error } = await supabase.from('permissoes').update(payload).eq('id', usuarioEditando.id);
  if (error) throw new Error("Erro ao atualizar perfil");
  
  const { data: { user } } = await supabase.auth.getUser();
  if (user && user.email === usuarioEditando.email) {
      await supabase.auth.updateUser({ data: { nome: usuarioEditando.nome } });
  }
};