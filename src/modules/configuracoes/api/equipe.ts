import { supabase } from "@/shared/lib/supabase/client";

// Buscas
export const buscarTecnicos = async () => {
  const { data, error } = await supabase.from('srv_tecnicos').select('*').order('nome');
  if (error) throw new Error("Erro ao carregar técnicos.");
  return data || [];
};

// Como o backend das comissões e gráfica será modular, deixamos o endpoint genérico preparado
export const buscarOperadoresGraficos = async () => {
  // Ajuste para o nome real da sua tabela de operadores gráficos, se for diferente
  const { data, error } = await supabase.from('grafica_operadores').select('*').order('nome');
  if (error && error.code !== '42P01') throw new Error("Erro ao carregar operadores."); // 42P01 = Tabela não existe (previne erro se ainda não foi criada)
  return data || [];
};

// Mutações (Salvar e Deletar)
export const salvarMembroEquipe = async (tabela: string, payload: any, id?: string) => {
  // Converte a string de moeda (ex: "15,50") para decimal de banco de dados[cite: 5]
  if (payload.valor_hora && typeof payload.valor_hora === 'string') {
    payload.valor_hora = parseFloat(payload.valor_hora.replace(',', '.'));
  }

  if (id) {
    const { error } = await supabase.from(tabela).update(payload).eq('id', id);
    if (error) throw new Error("Erro ao atualizar ficha.");
  } else {
    const { error } = await supabase.from(tabela).insert([payload]);
    if (error) throw new Error("Erro ao cadastrar novo membro.");
  }
};

export const deletarMembroEquipe = async (tabela: string, id: string) => {
  const { error } = await supabase.from(tabela).delete().eq('id', id);
  if (error) throw new Error("Não é possível excluir um membro que já possui histórico no sistema.");
};