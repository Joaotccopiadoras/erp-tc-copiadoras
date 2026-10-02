// Adicione no final do arquivo: src/modules/configuracoes/api/usuarios.ts

export const buscarPerfilAtual = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data, error } = await supabase
    .from("permissoes")
    .select("is_admin, nome, email")
    // O filtro .or garante que ele ache seu perfil pelo e-mail real OU pelo pseudo-email
    .or(`email.eq.${user.email},email_auth.eq.${user.email}`)
    .maybeSingle(); // maybeSingle evita o Erro 406 se retornar 0 linhas
    
  if (error) throw new Error("Erro ao validar acessos do usuário.");
  return data;
};