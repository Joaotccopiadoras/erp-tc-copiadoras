import { useState } from 'react';
import { supabase } from '@/shared/lib/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';

export interface ExportParams {
  modulo: string;
  tipo: 'pdf' | 'excel';
  dados: any[];
  filtrosAtivos?: any;
}

export function useExportacaoN8N() {
  const [exportando, setExportando] = useState(false);
  const { toast } = useToast();

  const dispararExportacao = async (params: ExportParams) => {
    if (params.dados.length === 0) {
      toast({ title: "Atenção", description: "Não há dados para exportar.", variant: "destructive" });
      return;
    }

    setExportando(true);
    try {
      // 1. Busca a URL do Webhook
      const { data: webhook, error: dbError } = await supabase
        .from('sistema_webhooks')
        .select('url')
        .eq('evento', 'exportacao_relatorio')
        .eq('ativo', true)
        .limit(1)
        .single();

      if (dbError || !webhook?.url) {
        throw new Error("Webhook não configurado. Vá a Configurações > Gatilhos e cadastre a URL do n8n.");
      }

      toast({ title: "Processando...", description: "A IA está a gerar o seu relatório na nuvem." });

      // 2. Envia os dados
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`O servidor (n8n) recusou o pedido (${response.status}). Verifique os erros no n8n.`);
      }

      // 3. Captura o texto da resposta primeiro (para evitar o erro "Unexpected end of JSON")
      const textoResposta = await response.text();
      
      if (!textoResposta || textoResposta.trim() === "") {
        throw new Error("O n8n não devolveu o link. O fluxo pode ter parado a meio. Verifique a aba Executions do n8n.");
      }

      // 4. Tenta converter para JSON
      let resultado;
      try {
        resultado = JSON.parse(textoResposta);
      } catch (e) {
        throw new Error(`O n8n devolveu texto inválido em vez de JSON: ${textoResposta.substring(0, 40)}...`);
      }
      
      // 5. Conclui abrindo o ficheiro
      if (resultado && resultado.file_url) {
        window.open(resultado.file_url, '_blank');
        toast({ title: "Concluído", description: "Relatório gerado com sucesso!" });
      } else {
        throw new Error("O n8n não devolveu a propriedade 'file_url' no formato JSON esperado.");
      }

    } catch (error: any) {
      console.error(error);
      toast({ title: "Falha na Exportação", description: error.message, variant: "destructive" });
    } finally {
      setExportando(false);
    }
  };

  return { dispararExportacao, exportando };
}