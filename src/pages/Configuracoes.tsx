import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserPlus, Trash2, Settings, Lock, CheckCircle2, User, Briefcase, Fingerprint } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function CentralSeguranca() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [colaboradoresDP, setColaboradoresDP] = useState<any[]>([]);
  const [novoEmail, setNovoEmail] = useState("");
  
  // Estados para Edição (Modal de Permissões)
  const [usuarioEditando, setUsuarioEditando] = useState<any | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetchDados();
  }, []);

  const fetchDados = async () => {
    const [usrRes, colabRes] = await Promise.all([
      supabase.from('ger_usuarios').select('*, rh_colaboradores(nome)').order('email'),
      supabase.from('rh_colaboradores').select('id, nome, cargo').order('nome')
    ]);
    
    if (usrRes.data) setUsuarios(usrRes.data);
    if (colabRes.data) setColaboradoresDP(colabRes.data);
  };

  const convidarUsuario = async () => {
    if (!novoEmail || !novoEmail.includes('@')) return alert("Digite um e-mail válido.");
    
    try {
      const { error } = await supabase.from('ger_usuarios').insert([{ email: novoEmail.toLowerCase().trim() }]);
      if (error) throw error;
      
      alert("Usuário adicionado! Clique em 'Configurar Acessos' para definir as permissões dele.");
      setNovoEmail("");
      fetchDados();
    } catch (e: any) {
      if (e.code === '23505') alert("Este e-mail já está cadastrado.");
      else alert("Erro: " + e.message);
    }
  };

  const removerUsuario = async (id: string, email: string) => {
    if (!confirm(`Tem certeza que deseja revogar totalmente o acesso de ${email}?`)) return;
    await supabase.from('ger_usuarios').delete().eq('id', id);
    fetchDados();
  };

  const abrirConfiguracoes = (usr: any) => {
    // Clona o usuário para o estado de edição para não alterar a tabela antes de salvar
    setUsuarioEditando({ ...usr });
  };

  const salvarConfiguracoes = async () => {
    setSalvando(true);
    try {
      const payload = {
        nome: usuarioEditando.nome,
        departamento: usuarioEditando.departamento,
        perfil_operacional: usuarioEditando.perfil_operacional,
        colaborador_id: usuarioEditando.colaborador_id === "nenhum" ? null : usuarioEditando.colaborador_id,
        is_admin: usuarioEditando.is_admin,
        acesso_financeiro: usuarioEditando.acesso_financeiro,
        pode_editar_os: usuarioEditando.pode_editar_os,
        pode_ver_dp_global: usuarioEditando.pode_ver_dp_global
      };

      const { error } = await supabase.from('ger_usuarios').update(payload).eq('id', usuarioEditando.id);
      if (error) throw error;

      // ATUALIZA O NOME NO SUPABASE AUTH (Opcional, para refletir direto no topo)
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email === usuarioEditando.email) {
          await supabase.auth.updateUser({ data: { nome: usuarioEditando.nome } });
      }

      alert("Permissões e Perfil atualizados com sucesso!");
      setUsuarioEditando(null);
      fetchDados();
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const TogglePermission = ({ label, desc, checked, onChange }: any) => (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
      <div>
        <p className="text-sm font-bold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
      </label>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto mb-12">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Shield className="w-6 h-6 text-slate-800" /> Central de Segurança</h1>
            <p className="text-slate-500">Gerenciamento de usuários, hierarquias, departamentos e permissões.</p>
          </div>
        </div>

        {/* MODAL DE EDIÇÃO DE USUÁRIO (Aparece por cima quando clica no botão) */}
        {usuarioEditando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-600"/> Configurar Perfil e Acessos</h2>
                    <p className="text-xs text-slate-500 font-mono mt-1">{usuarioEditando.email}</p>
                </div>
                <Button variant="ghost" onClick={() => setUsuarioEditando(null)}>Cancelar</Button>
              </div>

              <div className="p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                
                {/* BLOCO 1: IDENTIFICAÇÃO E DEPARTAMENTO */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><User className="w-4 h-4"/> 1. Identidade e Setor</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Nome de Exibição</label><Input value={usuarioEditando.nome || ""} onChange={e => setUsuarioEditando({...usuarioEditando, nome: e.target.value})} placeholder="Ex: João Gaia" /></div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Departamento Principal</label>
                            <Select value={usuarioEditando.departamento || "Geral"} onValueChange={v => setUsuarioEditando({...usuarioEditando, departamento: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent><SelectItem value="Geral">Geral / Sem Setor</SelectItem><SelectItem value="Diretoria">Diretoria</SelectItem><SelectItem value="Administrativo">Administrativo</SelectItem><SelectItem value="Financeiro">Financeiro</SelectItem><SelectItem value="Comercial">Comercial</SelectItem><SelectItem value="Licitações">Licitações</SelectItem><SelectItem value="Técnico">Assistência Técnica</SelectItem><SelectItem value="Gráfica">Produção Gráfica</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* BLOCO 2: VÍNCULOS OPERACIONAIS */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Briefcase className="w-4 h-4"/> 2. Vínculos Operacionais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700" title="Isso permite que ele seja selecionado como Técnico em OS ou Vendedor em Pedidos.">Perfil Operacional (Atuação)</label>
                            <Select value={usuarioEditando.perfil_operacional || "Nenhum"} onValueChange={v => setUsuarioEditando({...usuarioEditando, perfil_operacional: v})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent><SelectItem value="Nenhum">Nenhum / Apenas Administrativo</SelectItem><SelectItem value="Vendedor">Vendedor (Comercial)</SelectItem><SelectItem value="Técnico Externo">Técnico Externo (Rua)</SelectItem><SelectItem value="Técnico Laboratório">Técnico de Laboratório</SelectItem><SelectItem value="Operador Gráfico">Operador Gráfico</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700" title="Liga este login ao cadastro físico no Módulo de Departamento Pessoal.">Vínculo com Ficha do RH (DP)</label>
                            <Select value={usuarioEditando.colaborador_id || "nenhum"} onValueChange={v => setUsuarioEditando({...usuarioEditando, colaborador_id: v})}>
                                <SelectTrigger><SelectValue placeholder="Selecione o funcionário..."/></SelectTrigger>
                                <SelectContent><SelectItem value="nenhum">Sem vínculo com o RH</SelectItem>{colaboradoresDP.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} ({c.cargo})</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* BLOCO 3: CHAVES DE ACESSO (RBAC) */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Lock className="w-4 h-4"/> 3. Restrições e Acessos Modulares</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TogglePermission 
                            label="Acesso de Administrador" desc="Controle total sobre o sistema e esta tela de Segurança." 
                            checked={usuarioEditando.is_admin} onChange={(v:any) => setUsuarioEditando({...usuarioEditando, is_admin: v})} 
                        />
                        <TogglePermission 
                            label="Módulo Financeiro" desc="Permite visualizar caixa, contas a pagar e a receber." 
                            checked={usuarioEditando.acesso_financeiro} onChange={(v:any) => setUsuarioEditando({...usuarioEditando, acesso_financeiro: v})} 
                        />
                        <TogglePermission 
                            label="Editar Ordens de Serviço" desc="Permite alterar peças e status de OS (desligue para área comercial/adm)." 
                            checked={usuarioEditando.pode_editar_os} onChange={(v:any) => setUsuarioEditando({...usuarioEditando, pode_editar_os: v})} 
                        />
                        <TogglePermission 
                            label="Visualizar Todo o DP" desc="Se desligado, ele só verá a própria ficha de salário." 
                            checked={usuarioEditando.pode_ver_dp_global} onChange={(v:any) => setUsuarioEditando({...usuarioEditando, pode_ver_dp_global: v})} 
                        />
                    </div>
                </div>

              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
                <Button onClick={salvarConfiguracoes} disabled={salvando} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8">
                    {salvando ? "Salvando..." : "Salvar Perfil e Permissões"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* CADASTRO SIMPLES DE NOVO EMAIL */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 space-y-2 w-full">
                <label className="text-sm font-bold text-slate-700">Autorizar Novo E-mail de Acesso</label>
                <Input value={novoEmail} onChange={e => setNovoEmail(e.target.value)} placeholder="Ex: tecnica@tccopiadoras.com.br" className="bg-slate-50" />
            </div>
            <Button onClick={convidarUsuario} className="bg-slate-800 hover:bg-slate-900 text-white gap-2 w-full md:w-auto h-10">
                <UserPlus className="w-4 h-4"/> Cadastrar Login
            </Button>
        </div>

        {/* TABELA DE GOVERNANÇA */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                            <th className="p-4 font-semibold border-b">Usuário / Identificação</th>
                            <th className="p-4 font-semibold border-b">Departamento</th>
                            <th className="p-4 font-semibold border-b">Perfil / Vínculo</th>
                            <th className="p-4 font-semibold border-b text-center">Nível Master</th>
                            <th className="p-4 font-semibold border-b text-center w-36">Governança</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {usuarios.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum usuário cadastrado.</td></tr> : (
                            usuarios.map(usr => (
                                <tr key={usr.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <p className="font-bold text-slate-800 text-base">{usr.nome || 'Nome não definido'}</p>
                                        <p className="text-xs text-slate-500 font-mono mt-0.5">{usr.email}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                                            {usr.departamento || 'Geral'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm font-semibold text-slate-700">{usr.perfil_operacional || 'Nenhum'}</p>
                                        {usr.rh_colaboradores?.nome && (
                                            <p className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-1 border border-emerald-100">
                                                <Fingerprint className="w-3 h-3"/> Vínculo DP Ativo
                                            </p>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        {usr.is_admin ? (
                                            <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-slate-800 text-white shadow-sm flex items-center justify-center gap-1 w-max mx-auto"><Shield className="w-3 h-3"/> Administrador</span>
                                        ) : (
                                            <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-500 w-max mx-auto border">Padrão</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => abrirConfiguracoes(usr)} className="h-8 text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 gap-1 shadow-sm">
                                                <Settings className="w-3 h-3"/> Acessos
                                            </Button>
                                            <button onClick={() => removerUsuario(usr.id, usr.email)} className="text-slate-300 hover:text-red-500 transition-colors p-1" title="Excluir Usuário"><Trash2 className="w-4 h-4"/></button>
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
    </AppLayout>
  );
}