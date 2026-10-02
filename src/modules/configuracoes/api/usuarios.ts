import { supabase } from "@/shared/lib/supabase/client";
import { createClient } from "@supabase/supabase-js";

// busca list permissoes
export const carregarPermissoes = async () => {
  const { data, error } = await supabase
    .from("permissoes")
    .select("*, rh_colaboradores(nome)")
    .order("criado_em", { ascending: true });
    
  if (error) throw new Error("Erro ao carregar permissões");
  return data || [];
};

// busca colaboradores
export const carregarColaboradoresDP = async () => {
  const { data, error } = await supabase
    .from("rh_colaboradores")
    .select("id, nome, cargo")
    .order("nome");
    
  if (error) throw new Error("Erro ao carregar colaboradores do DP");
  return data || [];
};

export const criarNovoUsuario = async (email: string, nomeUsuario: string, senha: string) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const authGhost = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { error: authError } = await authGhost.auth.signUp({
    email: email.toLowerCase().trim(),
    password: senha,
  });

  if (authError) throw new Error("Erro no Auth: " + authError.message);

  const { error: dbError } = await supabase.from("permissoes").insert([{ 
    email: email.toLowerCase().trim(), 
    nome_usuario: nomeUsuario.toLowerCase().trim(),
    acesso_financeiro: false, 
    is_admin: false, 
    departamento: 'Geral', 
    perfil_operacional: 'Nenhum' 
  }]);
  
  if (dbError) throw new Error("Erro ao salvar permissões: O nome de utilizador ou e-mail já pode estar em uso.");
};

export const revogarAcessoUsuario = async (id: string) => {
  const { error } = await supabase.from("permissoes").delete().eq("id", id);
  if (error) throw new Error("Erro ao remover usuário");
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
  
  // atentar concorrencia
  const { data: { user } } = await supabase.auth.getUser();
  if (user && user.email === usuarioEditando.email) {
      await supabase.auth.updateUser({ data: { nome: usuarioEditando.nome } });
  }
};