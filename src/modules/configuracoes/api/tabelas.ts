import { supabase } from "@/shared/lib/supabase/client";

// aceita qualquer tabela auxiliar
export const buscarRegistros = async (tabela: string) => {
  const { data, error } = await supabase
    .from(tabela)
    .select('*')
    .order('id', { ascending: true });
    
  if (error) throw new Error(`Erro ao carregar dados da tabela: ${tabela}`);
  return data || [];
};

// insert dinam
export const adicionarRegistro = async (tabela: string, payload: any) => {
  const { error } = await supabase.from(tabela).insert([payload]);
  if (error) throw new Error(`Erro ao gravar na tabela: ${tabela}. Verifique se o item já existe.`);
};

// del dinam
export const deletarRegistro = async (tabela: string, id: string | number) => {
  const { error } = await supabase.from(tabela).delete().eq('id', id);
  if (error) throw new Error(`Erro ao remover. Este item pode estar a ser utilizado noutro módulo.`);
};