import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useToast } from "@/shared/hooks/use-toast";
import { Mail, Plus, Trash2, Save, Loader2, Workflow, Info } from "lucide-react";
import { buscarGatilhos, salvarNovoGatilho, deletarGatilho } from "../api/automacoes";

export default function TabEmails() {
  const { toast } = useToast();
  const [triggers, setTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // estado form
  const [novoGatilho, setNovoGatilho] = useState({ 
    modulo: 'Grafica', 
    status_gatilho: '', 
    assunto: '', 
    corpo_texto: '' 
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const data = await buscarGatilhos();
      setTriggers(data);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoGatilho.status_gatilho || !novoGatilho.corpo_texto || !novoGatilho.assunto) {
      return toast({ title: "Atenção", description: "Preencha o status, o assunto e o texto do e-mail.", variant: "destructive" });
    }

    setSalvando(true);
    try {
      await salvarNovoGatilho(novoGatilho);
      toast({ title: "Sucesso", description: "Automação de e-mail ativada!" });
      setNovoGatilho({ ...novoGatilho, status_gatilho: '', assunto: '', corpo_texto: '' });
      await carregarDados();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletar = async (id: string) => {
    if (!confirm("Tem certeza que deseja desativar este gatilho de e-mail?")) return;
    try {
      await deletarGatilho(id);
      toast({ title: "Removido", description: "Regra de automação excluída." });
      await carregarDados();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* cabecalho */}
      <div className="bg-gradient-to-r from-slate-800 to-indigo-900 p-6 rounded-xl shadow-md text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Workflow className="w-5 h-5 text-indigo-300"/> Motor de Mensageria (n8n + Resend)</h2>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">Configure as mensagens disparadas aos clientes quando os cards mudarem de coluna. O ERP enviará a ordem para o seu Webhook no n8n processar o disparo em background.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* form nova automacao */}
        <div className="lg:col-span-1 space-y-4 bg-white p-5 rounded-xl border shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Nova Regra de Disparo</h3>
            <p className="text-xs text-slate-500 mb-4">Crie um novo template de e-mail.</p>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Módulo Origem</label>
              <Select value={novoGatilho.modulo} onValueChange={v => setNovoGatilho({...novoGatilho, modulo: v})}>
                <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white z-[99999]">
                  <SelectItem value="Grafica">Produção Gráfica</SelectItem>
                  <SelectItem value="Assistencia">Assistência Técnica</SelectItem>
                  <SelectItem value="CRM">Comercial (CRM)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Gatilho (Status do Card)</label>
              <Select value={novoGatilho.status_gatilho} onValueChange={v => setNovoGatilho({...novoGatilho, status_gatilho: v})}>
                <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Ex: Levantamento de Material"/></SelectTrigger>
                <SelectContent className="bg-white z-[99999]">
                  <SelectItem value="Levantamento de Material">Levantamento de Material (Gráfica)</SelectItem>
                  <SelectItem value="Impressão">Impressão (Gráfica)</SelectItem>
                  <SelectItem value="Pronto para Expedição">Pronto para Expedição</SelectItem>
                  <SelectItem value="Equipamento em Bancada">Equipamento em Bancada (Técnica)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Assunto do E-mail</label>
              <Input 
                placeholder="Ex: Atualização da OSG {numero_osg}" 
                value={novoGatilho.assunto} 
                onChange={e => setNovoGatilho({...novoGatilho, assunto: e.target.value})} 
                className="bg-slate-50 font-medium" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase flex items-center justify-between">
                Corpo do E-mail
                <div className="group relative cursor-help">
                  <Info className="w-4 h-4 text-indigo-400" />
                  <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl z-50">
                    Use variáveis: <br/><b>{'{numero_osg}'}</b><br/><b>{'{solicitante}'}</b><br/><b>{'{status}'}</b>
                  </div>
                </div>
              </label>
              <textarea 
                placeholder="Prezado {solicitante}, sua solicitação acaba de entrar na etapa de {status}..." 
                value={novoGatilho.corpo_texto} 
                onChange={e => setNovoGatilho({...novoGatilho, corpo_texto: e.target.value})} 
                className="w-full min-h-[160px] p-3 border rounded-md text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>

            <Button onClick={handleSalvar} disabled={salvando} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm mt-2">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} 
              Gravar Automação
            </Button>
          </div>
        </div>

        {/* list gatilhos */}
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-800">Regras de Comunicação Ativas</h3>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar max-h-[600px] bg-slate-50/50">
            {loading ? (
              <div className="flex justify-center items-center h-32 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : triggers.length === 0 ? (
              <div className="text-center p-8 text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-lg">Nenhum gatilho de e-mail configurado.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {triggers.map(t => (
                  <div key={t.id} className="p-4 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all group flex flex-col gap-3 relative">
                    <button 
                      onClick={() => handleDeletar(t.id)} 
                      className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors bg-white rounded-full p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="pr-8">
                      <span className="text-[10px] font-bold tracking-wider uppercase bg-indigo-100 text-indigo-700 px-2 py-1 rounded shadow-sm">
                        {t.modulo} • {t.status_gatilho}
                      </span>
                      <p className="font-bold text-slate-800 mt-3">{t.assunto}</p>
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded text-sm text-slate-600 whitespace-pre-wrap border border-slate-100 italic">
                      {t.corpo_texto}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}