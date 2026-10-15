import { useState, useEffect } from "react";
import { FileText, MapPin, X, Activity, Database, Loader2 } from "lucide-react";
import { supabase } from "@/shared/lib/supabase/client";

interface ModalExtratoProps {
  produto: any;
  locais: any[];
  onClose: () => void;
}

export default function ModalExtrato({ produto, locais, onClose }: ModalExtratoProps) {
  const [saldosAtuaisProduto, setSaldosAtuaisProduto] = useState<any[]>([]);
  const [movimentacoesProduto, setMovimentacoesProduto] = useState<any[]>([]);
  const [carregandoExtrato, setCarregandoExtrato] = useState(true);

  useEffect(() => {
    const carregarExtrato = async () => {
      try {
        // Busca onde os saldos físicos desse produto estão armazenados
        const { data: saldosSalvos } = await supabase.from('log_produto_saldos').select('*').eq('produto_id', produto.id).gt('quantidade', 0);
        const saldosMapeados = (saldosSalvos || []).map(s => {
            const localEncontrado = locais.find(l => l.id === s.local_id);
            return { nome: localEncontrado?.nome || 'Local Desconhecido', quantidade: s.quantidade };
        });
        setSaldosAtuaisProduto(saldosMapeados);

        // Busca o extrato de auditoria
        const { data: movs } = await supabase.from('log_movimentacoes').select('*').eq('produto_id', produto.id).order('data_movimentacao', { ascending: false }).limit(50);
        if (movs) setMovimentacoesProduto(movs);
      } catch(e) { 
        console.error(e); 
      } finally { 
        setCarregandoExtrato(false); 
      }
    };
    carregarExtrato();
  }, [produto.id, locais]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[90vh]">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50 shrink-0">
                <div>
                    <h2 className="text-xl font-black text-indigo-900 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600"/> Ficha do Produto</h2>
                    <p className="text-xs text-indigo-700 font-bold mt-1 uppercase tracking-widest">{produto.sku} - {produto.nome}</p>
                </div>
                <button onClick={onClose} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full"><X className="w-5 h-5"/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin className="w-4 h-4"/> Onde está guardado? (Saldos Físicos)</h3>
                    <div className="flex gap-3 flex-wrap">
                        {carregandoExtrato ? <Loader2 className="w-5 h-5 animate-spin text-slate-400"/> : saldosAtuaisProduto.length === 0 ? (
                            <p className="text-sm text-slate-500 italic bg-slate-50 px-4 py-2 rounded-md border border-slate-200">Nenhum saldo distribuído. Faça o Inventário.</p>
                        ) : (
                            saldosAtuaisProduto.map((s, i) => (
                                <div key={i} className="bg-white border border-slate-200 shadow-sm rounded-lg px-4 py-3 flex flex-col items-center justify-center min-w-[120px]">
                                    <span className="text-2xl font-black text-emerald-600">{s.quantidade}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase mt-1 text-center leading-tight">{s.nome}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Activity className="w-4 h-4"/> Extrato de Movimentações (Auditoria)</h3>
                    
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider">
                                    <th className="p-3 font-semibold border-b">Data / Responsável</th>
                                    <th className="p-3 font-semibold border-b">Natureza / Origem</th>
                                    <th className="p-3 font-semibold border-b">Documento</th>
                                    <th className="p-3 font-semibold border-b text-right">Movimentação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {carregandoExtrato ? <tr><td colSpan={4} className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr> : movimentacoesProduto.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">Nenhuma movimentação registrada.</td></tr>
                                ) : movimentacoesProduto.map((mov, i) => {
                                    const isEntrada = mov.tipo === 'Entrada' || (mov.tipo === 'Ajuste' && mov.quantidade > 0);
                                    const isSaida = mov.tipo === 'Saída' || (mov.tipo === 'Ajuste' && mov.quantidade < 0);
                                    
                                    return (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3">
                                                <p className="font-bold text-slate-800">{new Date(mov.data_movimentacao).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5"><Database className="w-3 h-3"/> {mov.usuario_nome || 'Sistema'}</p>
                                            </td>
                                            <td className="p-3">
                                                <p className="font-semibold text-slate-700 text-sm">{mov.fornecedor_cliente || 'Ajuste Interno'}</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5 bg-slate-100 inline-block px-1.5 rounded">C.C: {mov.centro_custo || 'Geral'}</p>
                                            </td>
                                            <td className="p-3">
                                                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{mov.documento || 'Sem Ref'}</span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <p className={`font-black text-base ${isEntrada ? 'text-emerald-600' : isSaida ? 'text-rose-600' : 'text-slate-600'}`}>
                                                    {mov.quantidade > 0 ? '+' : ''}{mov.quantidade}
                                                </p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{mov.tipo}</p>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
}