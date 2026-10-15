import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { CheckCircle2, MapPin, X, ArrowLeftRight } from "lucide-react";
import { supabase } from "@/shared/lib/supabase/client";
import { useToast } from "@/shared/hooks/use-toast";

interface ModalInventarioProps {
  produto: any;
  locais: any[];
  usuarioAtual: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalInventario({ produto, locais, usuarioAtual, onClose, onSuccess }: ModalInventarioProps) {
  const [saldosLocais, setSaldosLocais] = useState<any[]>([]);
  const [salvandoSaldos, setSalvandoSaldos] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSaldos = async () => {
      const { data: saldosSalvos } = await supabase.from('log_produto_saldos').select('*').eq('produto_id', produto.id);
      const listaSaldos = locais.map(local => {
        const saldoEncontrado = saldosSalvos?.find(s => s.local_id === local.id);
        return {
          local_id: local.id, nome: local.nome, tipo: local.tipo || 'Físico',
          quantidade: saldoEncontrado ? Number(saldoEncontrado.quantidade) : 0
        };
      });
      setSaldosLocais(listaSaldos);
    };
    fetchSaldos();
  }, [produto.id, locais]);

  const atualizarQuantidadeLocal = (localId: string, novaQtd: number) => {
    setSaldosLocais(prev => prev.map(s => s.local_id === localId ? { ...s, quantidade: novaQtd } : s));
  };

  const salvarSaldosLocais = async () => {
    setSalvandoSaldos(true);
    try {
      const estoqueGlobalRecalculado = saldosLocais.reduce((acc, curr) => acc + Number(curr.quantidade), 0);
      const diferenca = estoqueGlobalRecalculado - (produto.estoque_atual || 0);

      // 1. Atualiza prateleiras
      for (const s of saldosLocais) {
        await supabase.from('log_produto_saldos').upsert({
            produto_id: produto.id, local_id: s.local_id, quantidade: s.quantidade
        }, { onConflict: 'produto_id, local_id' });
      }

      // 2. Atualiza global
      await supabase.from('log_produtos').update({ estoque_atual: estoqueGlobalRecalculado }).eq('id', produto.id);

      // 3. Registra a auditoria de movimentação se houve alteração
      if (diferenca !== 0) {
        await supabase.from('log_movimentacoes').insert({
            produto_id: produto.id, tipo: 'Ajuste', quantidade: diferenca, 
            documento: 'INV-' + new Date().getTime(), fornecedor_cliente: 'Balanço Físico',
            usuario_nome: usuarioAtual, centro_custo: 'Ajuste de Inventário'
        });
      }

      toast({ title: "Inventário concluído", description: "O estoque global e físico foram sincronizados." });
      onSuccess();
      onClose();
    } catch (error: any) { 
      toast({ title: "Erro ao atualizar saldos", description: error.message, variant: "destructive" });
    } finally { 
      setSalvandoSaldos(false); 
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
                <div>
                    <h2 className="text-lg font-black text-emerald-900 flex items-center gap-2"><ArrowLeftRight className="w-5 h-5 text-emerald-600"/> Inventário de Estoque</h2>
                    <p className="text-xs text-emerald-700 font-bold mt-1 uppercase tracking-widest">{produto.sku} - {produto.nome}</p>
                </div>
                <button onClick={onClose} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-full"><X className="w-5 h-5"/></button>
            </div>

            <div className="p-6 bg-slate-50 border-b">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Estoque Global Recalculado</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">Este valor substituirá o valor antigo do catálogo assim que você salvar o balanço.</p>
                    </div>
                    <div className="text-3xl font-black text-slate-800 bg-slate-100 px-6 py-2 rounded-lg border flex flex-col items-end">
                        <div>{saldosLocais.reduce((acc, curr) => acc + Number(curr.quantidade), 0)} <span className="text-base font-medium text-slate-500">un</span></div>
                        <div className="text-[10px] text-slate-400 font-medium">Antigo: {produto.estoque_atual || 0} un</div>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Contagem Física por Locais</h3>
                {saldosLocais.map(local => (
                    <div key={local.local_id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-emerald-300 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded-lg"><MapPin className="w-4 h-4 text-slate-500"/></div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm">{local.nome}</p>
                                <p className="text-[10px] uppercase text-slate-500">{local.tipo}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase mr-2">Físico:</span>
                            <Input type="number" value={local.quantidade} onChange={e => atualizarQuantidadeLocal(local.local_id, parseFloat(e.target.value) || 0)} className="w-24 text-center font-bold text-emerald-700 bg-emerald-50 border-emerald-200 focus-visible:ring-emerald-500" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button onClick={salvarSaldosLocais} disabled={salvandoSaldos} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
                    {salvandoSaldos ? "Sincronizando..." : <><CheckCircle2 className="w-4 h-4"/> Confirmar Balanço e Sincronizar</>}
                </Button>
            </div>
        </div>
    </div>
  );
}