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

    const novaAba = window.open('', '_blank');
    if (novaAba) {
      novaAba.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Gerando Relatório...</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #334155; }
            .spinner { animation: spin 1s linear infinite; width: 50px; height: 50px; color: #4f46e5; margin-bottom: 24px; }
            @keyframes spin { 100% { transform: rotate(360deg); } }
            h2 { margin: 0 0 8px 0; font-size: 24px; color: #0f172a; }
            p { margin: 0; font-size: 15px; color: #64748b; }
          </style>
        </head>
        <body>
          <svg class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75"></path></svg>
          <h2>A processar o seu documento...</h2>
          <p>A Inteligência do Servidor está a montar o ficheiro. Aguarde um instante.</p>
        </body>
        </html>
      `);
    }

    setExportando(true);
    try {
      const { data: webhook, error: dbError } = await supabase.from('sistema_webhooks').select('url').eq('evento', 'exportacao_relatorio').eq('ativo', true).limit(1).single();

      if (dbError || !webhook?.url) throw new Error("Webhook não configurado. Vá a Configurações > Gatilhos e cadastre a URL.");

      toast({ title: "Processando...", description: "A IA está a gerar o seu relatório na nuvem." });

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!response.ok) throw new Error(`O servidor (n8n) recusou o pedido (${response.status}).`);

      const textoResposta = await response.text();
      if (!textoResposta || textoResposta.trim() === "") throw new Error("O n8n não devolveu o link.");

      let resultado;
      try {
        resultado = JSON.parse(textoResposta);
      } catch (e) {
        throw new Error(`O n8n devolveu um formato inválido. Garanta que ativou o "fx" (Expressão) no Response Body.`);
      }
      
      if (resultado && resultado.file_url) {
        if (novaAba) {
          // Injeta um script na aba para iniciar o download e fechar-se a si mesma após 2 segundos
          novaAba.document.write(`
            <script>
              window.location.href = "${resultado.file_url}";
              setTimeout(() => { window.close(); }, 2000);
            </script>
          `);
        } else {
          window.open(resultado.file_url, '_blank');
        }
        toast({ title: "Concluído", description: "Relatório gerado com sucesso!" });
      } else {
        throw new Error("O n8n não devolveu a propriedade 'file_url'.");
      }
    } catch (error: any) {
      if (novaAba) novaAba.close();
      toast({ title: "Falha na Exportação", description: error.message, variant: "destructive" });
    } finally {
      setExportando(false);
    }
  };

  return { dispararExportacao, exportando };
}