import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useCsvData = () => {
  const { toast } = useToast();

  return useQuery({
    queryKey: ["csvDataFetch"],
    queryFn: async () => {
      console.log("Iniciando busca de dados no Supabase...");
      
      const { data, error } = await supabase
        .from("csv_uploads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50000); // <--- A MÁGICA ESTÁ AQUI: Pedindo até 50 mil linhas de uma vez

      if (error) {
        console.error("ERRO DO SUPABASE:", error.message, error.details);
        toast({
          title: "Erro ao carregar dados",
          description: error.message,
          variant: "destructive",
        });
        throw new Error(error.message);
      }

      console.log("Dados recebidos com sucesso. Total de linhas:", data?.length);
      
      return {
        records: data || []
      };
    },
    refetchOnWindowFocus: true, 
  });
};