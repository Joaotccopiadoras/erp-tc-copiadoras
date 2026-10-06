import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/lib/supabase/client";
import { Loader2, Activity, Database, PlusCircle, Pencil, Trash2 } from "lucide-react";

const carregarLogs = async () => {
  const { data, error } = await supabase.from("sistema_logs").select("*").order("data_hora", { ascending: false }).limit(100);
  if (error) throw new Error("Erro ao carregar logs");
  return data || [];
};

export default function TabLogs() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["auditoria_logs"],
    queryFn: carregarLogs,
    refetchInterval: 30000, // Atualiza a cada 30 segundos sozinho
  });

  const getAcaoBadge = (acao: string) => {
    switch (acao) {
      case 'INSERT': return <span className="bg-emerald-50 text-emerald-600 px-2 py-1 text-[10px] uppercase font-bold rounded flex items-center gap-1"><PlusCircle className="w-3 h-3"/> Criação</span>;
      case 'UPDATE': return <span className="bg-blue-50 text-blue-600 px-2 py-1 text-[10px] uppercase font-bold rounded flex items-center gap-1"><Pencil className="w-3 h-3"/> Edição</span>;
      case 'DELETE': return <span className="bg-rose-50 text-rose-600 px-2 py-1 text-[10px] uppercase font-bold rounded flex items-center gap-1"><Trash2 className="w-3 h-3"/> Exclusão</span>;
      default: return <span className="bg-slate-100 text-slate-600 px-2 py-1 text-[10px] uppercase font-bold rounded">{acao}</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="p-4 border-b flex justify-between items-center bg-slate-50">
        <div>
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-600" /> Logs de Auditoria (Sistema)</h2>
          <p className="text-xs text-slate-500 mt-1">Registo das últimas 100 alterações estruturais no sistema (Criações, Edições e Exclusões).</p>
        </div>
      </div>
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b text-slate-600 text-[10px] uppercase tracking-wider">
              <th className="px-4 py-3 font-semibold w-40">Data e Hora</th>
              <th className="px-4 py-3 font-semibold">Operador (E-mail)</th>
              <th className="px-4 py-3 font-semibold">Ação Executada</th>
              <th className="px-4 py-3 font-semibold">Módulo (Tabela)</th>
              <th className="px-4 py-3 font-semibold">Detalhes Técnicos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /></td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500 text-sm">Nenhum log registado ainda.</td></tr>
            ) : (
              logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50 text-sm">
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(log.data_hora).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{log.usuario_email}</td>
                  <td className="px-4 py-3">{getAcaoBadge(log.acao)}</td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-indigo-600 flex items-center gap-1"><Database className="w-3 h-3"/> {log.tabela}</td>
                  <td className="px-4 py-3 text-[10px] text-slate-400 font-mono break-all max-w-xs truncate" title={JSON.stringify(log.detalhes)}>
                    ID: {log.registro_id}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}