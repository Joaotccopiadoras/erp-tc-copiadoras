import { useState } from 'react';
import { supabase } from '@/shared/lib/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';

export interface ExportParams {
  modulo: string;         // Ex: 'Agenda Kanban', 'Programação Técnica'
  tipo: 'pdf' | 'excel';  // Formato desejado
  dados: any[];           // O array de dados já filtrados que a tabela está exibindo
  filtrosAtivos?: any;    // Opcional: para o n8n imprimir no cabeçalho do PDF (Ex: Período)
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
      // 1. Busca a URL do Webhook oficial de exportação cadastrado no seu painel
      const { data: webhook, error: dbError } = await supabase
        .from('sistema_webhooks')
        .select('url')
        .eq('evento', 'exportacao_relatorio')
        .eq('ativo', true)
        .limit(1)
        .single();

      if (dbError || !webhook?.url) {
        throw new Error("Webhook não configurado. Vá em Configurações > Gatilhos e cadastre a URL do n8n para o evento 'Exportação Assíncrona de Relatórios'.");
      }

      toast({ title: "Processando...", description: "A IA está gerando o seu relatório em nuvem." });

      // 2. Envia o pacote de dados limpo para o n8n processar
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!response.ok) throw new Error("O servidor de automação (n8n) recusou a conexão.");

      const resultado = await response.json();
      
      // 3. O n8n deve devolver um JSON simples contendo a URL pública do PDF/Excel finalizado
      if (resultado && resultado.file_url) {
        window.open(resultado.file_url, '_blank');
      } else {
        toast({ title: "Concluído", description: "A solicitação foi processada." });
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