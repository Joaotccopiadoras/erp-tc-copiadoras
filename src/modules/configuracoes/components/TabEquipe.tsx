import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useToast } from "@/shared/hooks/use-toast";
import { Wrench, Printer, Plus, Trash2, Edit, Loader2, DollarSign, UserSquare2 } from "lucide-react";
import { buscarTecnicos, buscarOperadoresGraficos, salvarMembroEquipe, deletarMembroEquipe } from "../api/equipe";

export default function TabEquipe() {
  const { toast } = useToast();
  
  // controle abas internas
  const [setorAtivo, setSetorAtivo] = useState<"tecnica" | "grafica">("tecnica");
  const tabelaAlvo = setorAtivo === "tecnica" ? "srv_tecnicos" : "grafica_operadores";

  // estados
  const [equipe, setEquipe] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  
  // form
  const formVazio = { nome: "", cpf: "", idade: "", endereco: "", formacao: "", data_admissao: "", tipo_cnh: "Nenhuma", valor_hora: "" };
  const [form, setForm] = useState<any>(formVazio);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, [setorAtivo]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const data = setorAtivo === "tecnica" ? await buscarTecnicos() : await buscarOperadoresGraficos();
      setEquipe(data);
    } catch (error: any) {
      toast({ title: "Aviso", description: error.message, variant: "destructive" });
      setEquipe([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return toast({ title: "Atenção", description: "O nome é obrigatório.", variant: "destructive" });

    setSalvando(true);
    try {
      // limpeza baseado setor
      const payload: any = { 
        nome: form.nome, cpf: form.cpf, 
        valor_hora: form.valor_hora, data_admissao: form.data_admissao || null 
      };

      // campos exclus tecnicos
      if (setorAtivo === "tecnica") {
        payload.idade = form.idade ? parseInt(form.idade) : null;
        payload.endereco = form.endereco;
        payload.formacao = form.formacao;
        payload.tipo_cnh = form.tipo_cnh;
      }

      await salvarMembroEquipe(tabelaAlvo, payload, editandoId || undefined);
      
      toast({ title: "Sucesso", description: `Ficha salva com sucesso!` });
      setForm(formVazio);
      setEditandoId(null);
      await carregarDados();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletar = async (id: string) => {
    if (!confirm("Tem certeza? Isso pode quebrar relatórios se a pessoa tiver OS ou Cards vinculados.")) return;
    try {
      await deletarMembroEquipe(tabelaAlvo, id);
      toast({ title: "Removido", description: "Colaborador excluído." });
      await carregarDados();
    } catch (error: any) {
      toast({ title: "Bloqueado", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* nav interna */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button 
          onClick={() => { setSetorAtivo("tecnica"); setForm(formVazio); setEditandoId(null); }}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${setorAtivo === "tecnica" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Wrench className="w-4 h-4" /> Assistência Técnica
        </button>
        <button 
          onClick={() => { setSetorAtivo("grafica"); setForm(formVazio); setEditandoId(null); }}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${setorAtivo === "grafica" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Printer className="w-4 h-4" /> Produção Gráfica
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* form intel */}
        <div className="lg:col-span-1 space-y-4 bg-white p-5 rounded-xl border shadow-sm border-t-4 border-t-indigo-500 h-fit">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><UserSquare2 className="w-4 h-4 text-indigo-500"/> {editandoId ? "Editar Ficha" : "Novo Cadastro"}</h3>
            <p className="text-xs text-slate-500 mb-4">Parâmetros operacionais para cálculo de custos e chamados.</p>
          </div>
          
          <div className="space-y-3">
            <Input placeholder="Nome Completo *" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="bg-slate-50 font-bold" />
            
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="CPF" value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} className="bg-slate-50" />
              <Input type="date" value={form.data_admissao} onChange={e => setForm({...form, data_admissao: e.target.value})} className="bg-slate-50" title="Data Admissão" />
            </div>

            {/* campos exclus assis tec */}
            {setorAtivo === "tecnica" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Idade" value={form.idade} onChange={e => setForm({...form, idade: e.target.value})} className="bg-slate-50" />
                  <Select value={form.tipo_cnh} onValueChange={v => setForm({...form, tipo_cnh: v})}>
                    <SelectTrigger className="bg-slate-50"><SelectValue placeholder="CNH" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nenhuma">Sem CNH</SelectItem>
                      <SelectItem value="A">Moto (A)</SelectItem>
                      <SelectItem value="B">Carro (B)</SelectItem>
                      <SelectItem value="AB">Carro/Moto (AB)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input placeholder="Endereço (Bairro/Cidade)" value={form.endereco} onChange={e => setForm({...form, endereco: e.target.value})} className="bg-slate-50" />
                <Input placeholder="Formação (Ex: Eletrotécnica)" value={form.formacao} onChange={e => setForm({...form, formacao: e.target.value})} className="bg-slate-50" />
              </>
            )}

            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input placeholder="Valor da Hora (Ex: 15,50)" value={form.valor_hora} onChange={e => setForm({...form, valor_hora: e.target.value})} className="bg-slate-50 pl-9 border-indigo-200" />
            </div>

            <div className="flex gap-2 pt-2">
              {editandoId && <Button variant="outline" onClick={() => {setForm(formVazio); setEditandoId(null);}} className="w-full">Cancelar</Button>}
              <Button onClick={handleSalvar} disabled={salvando} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} {editandoId ? "Atualizar" : "Salvar"}
              </Button>
            </div>
          </div>
        </div>

        {/* tabela equipe */}
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="p-4 font-semibold">Identificação</th>
                  {setorAtivo === "tecnica" && <th className="p-4 font-semibold">Qualificação</th>}
                  <th className="p-4 font-semibold text-right">Valor/Hora</th>
                  <th className="p-4 font-semibold text-center w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></td></tr>
                ) : equipe.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
                ) : (
                  equipe.map(pessoa => (
                    <tr key={pessoa.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{pessoa.nome}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">CPF: {pessoa.cpf || 'Não informado'} {pessoa.data_admissao && `• Adm: ${new Date(pessoa.data_admissao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`}</p>
                      </td>
                      
                      {setorAtivo === "tecnica" && (
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded mr-2 ${pessoa.tipo_cnh !== 'Nenhuma' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>CNH: {pessoa.tipo_cnh || 'N/A'}</span>
                          <span className="text-xs text-slate-600 truncate max-w-[150px] inline-block align-bottom">{pessoa.formacao || 'Sem formação reg.'}</span>
                        </td>
                      )}
                      
                      <td className="p-4 text-right">
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                          R$ {Number(pessoa.valor_hora || 0).toFixed(2).replace('.', ',')}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => {setForm(pessoa); setEditandoId(pessoa.id);}} className="text-slate-400 hover:text-indigo-600 p-1.5"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeletar(pessoa.id)} className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}