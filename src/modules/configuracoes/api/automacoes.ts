import { supabase } from "@/shared/lib/supabase/client";

export const buscarGatilhos = async () => {
  const { data, error } = await supabase
    .from('cfg_email_triggers')
    .select('*')
    .order('modulo', { ascending: true });
    
  if (error) throw new Error("Erro ao carregar as automações de e-mail.");
  return data || [];
};

export const salvarNovoGatilho = async (payload: any) => {
  const { error } = await supabase.from('cfg_email_triggers').insert([payload]);
  if (error) throw new Error("Erro ao salvar o gatilho. Verifique sua conexão.");
};

export const deletarGatilho = async (id: string) => {
  const { error } = await supabase.from('cfg_email_triggers').delete().eq('id', id);
  if (error) throw new Error("Erro ao excluir esta automação.");
};