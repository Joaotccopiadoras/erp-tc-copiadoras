export const buscarPerfilAtual = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  // Tentativa 1: Busca avançada (suporta o recurso de login por Nome de Usuário / Pseudo-email)
  const { data, error } = await supabase
    .from("permissoes")
    .select("is_admin, nome, email, email_auth")
    .or(`email.eq.${user.email},email_auth.eq.${user.email}`)
    .order("is_admin", { ascending: false })
    .limit(1);
    
  if (error) {
    console.warn("Aviso Supabase (Busca Avançada Falhou):", error.message);
    
    // Tentativa 2 (Fallback de Emergência): Busca simples apenas pelo e-mail padrão
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