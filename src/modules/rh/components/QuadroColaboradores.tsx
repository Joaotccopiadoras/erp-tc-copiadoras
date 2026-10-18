import { useState, useEffect } from "react";
import { supabase } from "@/shared/lib/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useToast } from "@/shared/hooks/use-toast";
import { Search, UserPlus, Edit, Trash2, Loader2, Save } from "lucide-react";

export default function QuadroColaboradores() {
  const { toast } = useToast();
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Estados do Formulário
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState(""); // Sem texto fixo de máscara no state
  const [cargo, setCargo] = useState("");
  const [setor, setSetor] = useState("");
  const [dataAdmissao, setDataAdmissao] = useState("");
  const [salarioBase, setSalarioBase] = useState("");
  const [statusColab, setStatusColab] = useState("Ativo");
  const [tipoContrato, setTipoContrato] = useState("CLT");
  const [perfilOperacional, setPerfilOperacional] = useState("Geral");
  
  // Atributos Gerais (CNH e Valor Hora)
  const [valorHora, setValorHora] = useState("");
  const [tipoCnh, setTipoCnh] = useState("Nenhuma");
  const [formacao, setFormacao] = useState("");

  const fetchColaboradores = async () => {
    setLoading(true);
    const { data } = await supabase.from('rh_colaboradores').select('*').order('nome');
    if (data) setColaboradores(data);
    setLoading(false);
  };

  useEffect(() => { fetchColaboradores(); }, []);

  // Lógica de cálculo automático do Valor da Hora baseado no Salário Base (Cálculo CLT 220h)
  useEffect(() => {
      if(salarioBase && !editandoId) {
          const salarioNum = parseFloat(salarioBase.replace(',', '.'));
          if(!isNaN(salarioNum)) {
             const calculoHora = (salarioNum / 220).toFixed(2);
             setValorHora(calculoHora.replace('.', ','));
          }
      }
  }, [salarioBase, editandoId]);


  const limparForm = () => {
    setEditandoId(null); setNome(""); setCpf(""); setCargo(""); setSetor("");
    setDataAdmissao(""); setSalarioBase(""); setStatusColab("Ativo"); setTipoContrato("CLT"); 
    setPerfilOperacional("Geral"); setValorHora(""); setTipoCnh("Nenhuma"); setFormacao("");
    setMostrarForm(false);
  };

  const editarColaborador = (c: any) => {
    setEditandoId(c.id);
    setNome(c.nome); setCpf(c.cpf || ""); setCargo(c.cargo || ""); setSetor(c.setor || "");
    setDataAdmissao(c.data_admissao || ""); setSalarioBase(c.salario_base?.toString() || "");
    setStatusColab(c.status || "Ativo"); setTipoContrato(c.tipo_contrato || "CLT");
    setPerfilOperacional(c.perfil_operacional || "Geral");
    setValorHora(c.valor_hora?.toString() || "");
    setTipoCnh(c.tipo_cnh || "Nenhuma"); setFormacao(c.formacao || "");
    setMostrarForm(true);
  };

  const salvarColaborador = async () => {
    if (!nome || !cargo || !setor || !dataAdmissao) {
      return toast({ title: "Atenção", description: "Preencha os campos obrigatórios (*).", variant: "warning" });
    }
    setSalvando(true);
    
    // Tratamento de CPF: se estiver em branco ou for a máscara, envia null para não gerar conflito de unique
    const cpfLimpo = cpf.trim() === "" || cpf.includes("xxx") ? null : cpf.trim();

    const payload = {
      nome, 
      cpf: cpfLimpo, 
      cargo, setor, status: statusColab, data_admissao: dataAdmissao,
      salario_base: parseFloat(salarioBase.replace(',', '.')) || 0, 
      tipo_contrato: tipoContrato,
      perfil_operacional: perfilOperacional,
      valor_hora: parseFloat(valorHora?.replace(',','.')) || 0,
      tipo_cnh: tipoCnh, formacao
    };

    if (editandoId) {
      const { error } = await supabase.from('rh_colaboradores').update(payload).eq('id', editandoId);
      if (error) {
         if (error.code === '23505') toast({ title: "Atenção", description: "Este CPF já está cadastrado no sistema para outro colaborador.", variant: "destructive" });
         else toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
         toast({ title: "Sucesso", description: "Colaborador atualizado!" });
         limparForm(); 
         fetchColaboradores();
      }
    } else {
      const { error } = await supabase.from('rh_colaboradores').insert([payload]);
      if (error) {
         if (error.code === '23505') toast({ title: "Atenção", description: "Este CPF já está cadastrado no sistema.", variant: "destructive" });
         else toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
         toast({ title: "Sucesso", description: "Novo colaborador cadastrado!" });
         limparForm(); 
         fetchColaboradores();
      }
    }
    setSalvando(false);
  };

  const excluirColaborador = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este colaborador da base?")) return;
    await supabase.from('rh_colaboradores').delete().eq('id', id);
    toast({ title: "Removido", description: "Colaborador excluído." });
    fetchColaboradores();
  };

  const filtrados = colaboradores.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase()) || 
    c.cargo?.toLowerCase().includes(busca.toLowerCase()) ||
    c.perfil_operacional?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="p-4 border-b flex flex-wrap items-center gap-4 bg-slate-50 justify-between">
        <div className="relative w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nome ou perfil..." className="pl-9 bg-white" />
        </div>
        <Button onClick={() => { limparForm(); setMostrarForm(true); }} className="bg-sky-600 hover:bg-sky-700 text-white gap-2">
          <UserPlus className="w-4 h-4"/> Novo Colaborador
        </Button>
      </div>

      {mostrarForm && (
        <div className="p-6 bg-sky-50/50 border-b border-sky-100 space-y-6 relative z-10">
          <h3 className="font-bold text-sky-800 flex items-center gap-2 border-b border-sky-100 pb-2">
            <UserPlus className="w-5 h-5"/> {editandoId ? 'Editar Ficha do Colaborador' : 'Nova Ficha de Admissão'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Nome Completo *</label><Input value={nome} onChange={e => setNome(e.target.value)} className="bg-white" /></div>
            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">CPF</label><Input value={cpf} onChange={e => setCpf(e.target.value)} className="bg-white" placeholder="000.000.000-00" /></div>
            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Data de Admissão *</label><Input type="date" value={dataAdmissao} onChange={e => setDataAdmissao(e.target.value)} className="bg-white" /></div>

            {/* Vínculo com Select Shadcn */}
            <div className="space-y-2 md:col-span-1 relative z-50">
              <label className="text-xs font-bold text-slate-500 uppercase">Vínculo / Contrato *</label>
              <Select value={tipoContrato} onValueChange={setTipoContrato}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione o vínculo"/></SelectTrigger>
                <SelectContent className="bg-white z-[99999]">
                  <SelectItem value="CLT">CLT (Registro)</SelectItem>
                  <SelectItem value="PJ">PJ / Prestador</SelectItem>
                  <SelectItem value="Estagiário">Estagiário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase">Setor Interno *</label><Input value={setor} onChange={e => setSetor(e.target.value)} placeholder="Ex: Comercial" className="bg-white" /></div>
            <div className="space-y-2 md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase">Cargo Interno *</label><Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Analista N1" className="bg-white" /></div>
            
            <div className="space-y-2 md:col-span-1 relative z-50">
              <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
              <Select value={statusColab} onValueChange={setStatusColab}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Status"/></SelectTrigger>
                <SelectContent className="bg-white z-[99999]">
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Férias">Férias</SelectItem>
                  <SelectItem value="Desligado">Desligado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Perfil Operacional no ERP com Select Shadcn */}
            <div className="space-y-2 md:col-span-1 relative z-50">
              <label className="text-xs font-bold text-indigo-600 uppercase" title="Define em quais telas este colaborador aparecerá">Perfil Operacional *</label>
              <Select value={perfilOperacional} onValueChange={setPerfilOperacional}>
                <SelectTrigger className="bg-white border-indigo-200"><SelectValue placeholder="Selecione o perfil"/></SelectTrigger>
                <SelectContent className="bg-white z-[99999]">
                  <SelectItem value="Geral">Geral (Administrativo)</SelectItem>
                  <SelectItem value="Técnico">Técnico</SelectItem>
                  <SelectItem value="Operador Gráfico">Operador Gráfico</SelectItem>
                  <SelectItem value="Vendedor">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Atributos Gerais */}
            <div className="space-y-2 md:col-span-1">
              <label className="text-xs font-bold text-emerald-600 uppercase">Salário Base (R$)</label>
              <Input value={salarioBase} onChange={e => setSalarioBase(e.target.value)} placeholder="Ex: 1500,00" className="bg-white border-emerald-100" />
            </div>
            <div className="space-y-2 md:col-span-1">
              <label className="text-xs font-bold text-indigo-500 uppercase" title="Calculado aut. via 220h mensais.">Valor Hora / Custo (R$)</label>
              <Input value={valorHora} onChange={e => setValorHora(e.target.value)} placeholder="Ex: 6,82" className="bg-white border-indigo-100 font-bold text-indigo-700" />
            </div>
            
            <div className="space-y-2 md:col-span-1 relative z-50">
                <label className="text-xs font-bold text-slate-500 uppercase">Tipo CNH</label>
                <Select value={tipoCnh} onValueChange={setTipoCnh}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="CNH"/></SelectTrigger>
                <SelectContent className="bg-white z-[99999]">
                    <SelectItem value="A">A (Moto)</SelectItem>
                    <SelectItem value="B">B (Carro)</SelectItem>
                    <SelectItem value="AB">AB</SelectItem>
                    <SelectItem value="Nenhuma">Nenhuma</SelectItem>
                </SelectContent>
                </Select>
            </div>
             <div className="space-y-2 md:col-span-4">
                 <label className="text-xs font-bold text-slate-500 uppercase">Formação / Especialidade (Opcional)</label>
                 <Input value={formacao} onChange={e => setFormacao(e.target.value)} className="bg-white" />
             </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-sky-100">
            <Button variant="outline" onClick={limparForm}>Cancelar</Button>
            <Button onClick={salvarColaborador} disabled={salvando} className="bg-sky-600 hover:bg-sky-700 text-white gap-2">{salvando ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Salvar Ficha</Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider">
              <th className="p-4 font-semibold border-b">Colaborador</th>
              <th className="p-4 font-semibold border-b text-center">Vínculo</th>
              <th className="p-4 font-semibold border-b text-center">Perfil (ERP)</th>
              <th className="p-4 font-semibold border-b text-center">Setor / Função</th>
              <th className="p-4 font-semibold border-b text-center">Status</th>
              <th className="p-4 font-semibold border-b text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (<tr><td colSpan={6} className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400"/></td></tr>) 
            : filtrados.length === 0 ? (<tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhum colaborador registado.</td></tr>) 
            : (
              filtrados.map(c => {
                const corStatus = c.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : c.status === 'Férias' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                const corPerfil = c.perfil_operacional === 'Técnico' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : c.perfil_operacional === 'Operador Gráfico' ? 'bg-purple-100 text-purple-700 border-purple-200' : c.perfil_operacional === 'Vendedor' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-200';
                const corVinculo = c.tipo_contrato === 'CLT' ? 'text-sky-700 font-bold' : c.tipo_contrato === 'PJ' ? 'text-purple-700 font-bold' : 'text-amber-700 font-bold';
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4"><p className="font-bold text-slate-800">{c.nome}</p><p className="text-xs text-slate-500 font-mono mt-0.5">CPF: {c.cpf || 'Não informado'}</p></td>
                    <td className="p-4 text-center text-xs"><span className={corVinculo}>{c.tipo_contrato || 'CLT'}</span></td>
                    <td className="p-4 text-center"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border shadow-sm ${corPerfil}`}>{c.perfil_operacional || 'Geral'}</span></td>
                    <td className="p-4 text-center"><p className="text-sm font-semibold text-slate-700">{c.cargo}</p><p className="text-[10px] text-slate-500 uppercase mt-0.5">{c.setor}</p></td>
                    <td className="p-4 text-center"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${corStatus}`}>{c.status}</span></td>
                    <td className="p-4 text-center"><div className="flex justify-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" onClick={() => editarColaborador(c)} className="h-8 w-8 text-slate-400 hover:text-sky-600"><Edit className="w-4 h-4"/></Button><Button variant="ghost" size="icon" onClick={() => excluirColaborador(c.id)} className="h-8 w-8 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></Button></div></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}