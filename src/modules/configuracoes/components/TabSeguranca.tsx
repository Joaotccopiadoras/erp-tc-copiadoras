import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import {
  Briefcase, Lock, Settings, Shield,
  ShieldAlert, Trash2, User, UserPlus,
  X, Loader2, Eye, EyeOff
} from "lucide-react";

import {
  carregarPermissoes,
  carregarColaboradoresDP,
  criarNovoUsuario,
  revogarAcessoUsuario,
  atualizarPermissoesUsuario
} from "../api/usuarios";

export default function TabSeguranca({ isCurrentUserAdmin }: { isCurrentUserAdmin: boolean | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estados Locais de Formulário (O que o usuário digita ainda fica no useState)
  const [novoNomeUsuario, setNovoNomeUsuario] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [mostrarSenhaCadastro, setMostrarSenhaCadastro] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<any | null>(null);

  // 1. O MOTOR DE LEITURA (React Query)
  // Substitui o useEffect e gerencia cache, loading e tentativas de reconexão automaticamente.
  const { data: permissoes = [], isLoading: carregandoPermissoes } = useQuery({
    queryKey: ["permissoes"],
    queryFn: carregarPermissoes,
    enabled: !!isCurrentUserAdmin, // Regra de Ouro: Só faz o fetch se o usuário for Admin
  });

  const { data: colaboradoresDP = [] } = useQuery({
    queryKey: ["colaboradoresDP"],
    queryFn: carregarColaboradoresDP,
    enabled: !!isCurrentUserAdmin,
  });

  // 2. OS MOTORES DE ESCRITA (Mutations)
  // Substituem as funções try/catch gigantes e gerenciam o estado de "salvando" nativamente.
  const criarUsuarioMut = useMutation({
    mutationFn: (dados: any) => criarNovoUsuario(dados.email, dados.nomeUsuario, dados.senha),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissoes"] }); // Recarrega a tabela magicamente
      toast({ title: "Sucesso", description: "Utilizador criado com sucesso!" });
      setNovoEmail(""); setNovoNomeUsuario(""); setNovaSenha("");
    },
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" })
  });

  const revogarUsuarioMut = useMutation({
    mutationFn: revogarAcessoUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissoes"] });
      toast({ title: "Removido", description: "Acesso revogado com sucesso." });
    },
    onError: () => toast({ title: "Erro", description: "Falha ao revogar acesso.", variant: "destructive" })
  });

  const atualizarUsuarioMut = useMutation({
    mutationFn: atualizarPermissoesUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissoes"] });
      toast({ title: "Sucesso", description: "Perfil e Permissões atualizados!" });
      setUsuarioEditando(null);
    },
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" })
  });

  // Disparadores de Ação (Validação limpa na ponta cliente)
  const handleAdicionarUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoEmail.includes("@") || !novoNomeUsuario.trim() || !novaSenha.trim()) {
      return toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
    }
    if (novaSenha.length < 6) {
      return toast({ title: "Erro", description: "A palavra-passe deve ter pelo menos 6 caracteres.", variant: "destructive" });
    }
    criarUsuarioMut.mutate({ email: novoEmail, nomeUsuario: novoNomeUsuario, senha: novaSenha });
  };

  const TogglePermission = ({ label, desc, checked, onChange }: any) => (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
      <div><p className="text-sm font-bold text-slate-800">{label}</p><p className="text-xs text-slate-500">{desc}</p></div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={checked || false} onChange={e => onChange(e.target.checked)} />
        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500"></div>
      </label>
    </div>
  );

  // Blindagem de Segurança (UI)
  if (isCurrentUserAdmin === false) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] max-w-md mx-auto text-center space-y-4 animate-in fade-in">
        <div className="bg-red-50 p-4 rounded-full"><ShieldAlert className="w-16 h-16 text-red-500" /></div>
        <h1 className="text-2xl font-bold text-slate-800">Acesso Restrito</h1>
        <p className="text-slate-600">Não possui permissões de Administrador para visualizar estas configurações.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      
      {/* Bloco de Cadastro */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4 border-l-4 border-l-indigo-600">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Cadastrar Novo Utilizador</h2>
          <p className="text-xs text-slate-500">Defina o nome de utilizador, o e-mail associado e a palavra-passe inicial do colaborador.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input placeholder="Nome de Utilizador (ex: joao.silva)" value={novoNomeUsuario} onChange={(e) => setNovoNomeUsuario(e.target.value)} className="bg-slate-50 font-medium text-indigo-700" />
          <Input type="email" placeholder="E-mail (ex: joao@empresa.com)" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} className="bg-slate-50" />
          <div className="relative">
            <Input type={mostrarSenhaCadastro ? "text" : "password"} placeholder="Palavra-passe (Mín. 6 carateres)" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} className="bg-slate-50 pr-10" />
            <button type="button" onClick={() => setMostrarSenhaCadastro(!mostrarSenhaCadastro)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {mostrarSenhaCadastro ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleAdicionarUsuario} disabled={criarUsuarioMut.isPending} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer">
            {criarUsuarioMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Cadastrar Sistema
          </Button>
        </div>
      </div>

      {/* Tabela de Governança */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-600" /> Governança e Hierarquia</h2>
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b text-slate-600 text-[11px] uppercase tracking-wider">
                <th className="px-4 py-4 font-semibold">Utilizador</th>
                <th className="px-4 py-4 font-semibold">Departamento</th>
                <th className="px-4 py-4 font-semibold text-center">Acesso</th>
                <th className="px-4 py-4 font-semibold text-center w-36">Configurar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregandoPermissoes ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /></td></tr>
              ) : permissoes.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 align-top">
                    <p className="font-bold text-slate-800 text-sm">{p.nome || 'Não definido'}</p>
                    <p className="text-xs font-mono text-indigo-600 font-semibold mt-0.5">@{p.nome_usuario || 'legado'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{p.email}</p>
                  </td>
                  <td className="px-4 py-4 align-top"><span className="text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">{p.departamento || 'Geral'}</span></td>
                  <td className="px-4 py-4 text-center align-top">{p.is_admin ? <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-slate-800 text-white shadow-sm inline-flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span> : <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-500 border">Padrão</span>}</td>
                  <td className="px-4 py-4 text-center align-top">
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setUsuarioEditando({ ...p })} className="h-8 text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 gap-1 shadow-sm"><Settings className="w-3 h-3" /> Acessos</Button>
                      <button onClick={() => { if(confirm("Revogar acesso?")) revogarUsuarioMut.mutate(p.id) }} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* modal config avanc */}
      {usuarioEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-600" /> Configurar Perfil e Acessos</h2>
                <p className="text-xs text-slate-500 font-mono mt-1">Utilizador: {usuarioEditando.nome_usuario || usuarioEditando.email}</p>
              </div>
              <Button variant="ghost" onClick={() => setUsuarioEditando(null)}><X className="w-5 h-5" /></Button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><User className="w-4 h-4" /> 1. Identidade e Setor</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Nome de Exibição</label><Input value={usuarioEditando.nome || ""} onChange={e => setUsuarioEditando({ ...usuarioEditando, nome: e.target.value })} placeholder="Ex: João Gaia" /></div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Departamento Principal</label>
                    <Select value={usuarioEditando.departamento || "Geral"} onValueChange={v => setUsuarioEditando({ ...usuarioEditando, departamento: v })}>
                      <SelectTrigger className="bg-white z-[99999]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white z-[99999]">
                        <SelectItem value="Geral">Geral / Sem Setor</SelectItem><SelectItem value="Diretoria">Diretoria</SelectItem><SelectItem value="Administrativo">Administrativo</SelectItem><SelectItem value="Financeiro">Financeiro</SelectItem><SelectItem value="Comercial">Comercial</SelectItem><SelectItem value="Licitações">Licitações</SelectItem><SelectItem value="Técnico">Assistência Técnica</SelectItem><SelectItem value="Gráfica">Produção Gráfica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Briefcase className="w-4 h-4" /> 2. Vínculos Operacionais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Perfil Operacional (Atuação)</label>
                    <Select value={usuarioEditando.perfil_operacional || "Nenhum"} onValueChange={v => setUsuarioEditando({ ...usuarioEditando, perfil_operacional: v })}>
                      <SelectTrigger className="bg-white z-[99999]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white z-[99999]"><SelectItem value="Nenhum">Nenhum / Apenas Administrativo</SelectItem><SelectItem value="Vendedor">Vendedor (Comercial)</SelectItem><SelectItem value="Técnico Externo">Técnico Externo (Rua)</SelectItem><SelectItem value="Técnico Laboratório">Técnico de Laboratório</SelectItem><SelectItem value="Operador Gráfico">Operador Gráfico</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Vínculo com Ficha do RH (DP)</label>
                    <Select value={usuarioEditando.colaborador_id || "nenhum"} onValueChange={v => setUsuarioEditando({ ...usuarioEditando, colaborador_id: v })}>
                      <SelectTrigger className="bg-white z-[99999]"><SelectValue placeholder="Selecione o funcionário..." /></SelectTrigger>
                      <SelectContent className="bg-white z-[99999]">
                        <SelectItem value="nenhum">Sem vínculo com o RH</SelectItem>
                        {colaboradoresDP.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome} ({c.cargo})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Lock className="w-4 h-4" /> 3. Restrições e Acessos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TogglePermission label="Acesso de Administrador" desc="Controlo total sobre o sistema." checked={usuarioEditando.is_admin} onChange={(v: any) => setUsuarioEditando({ ...usuarioEditando, is_admin: v })} />
                  <TogglePermission label="Módulo Financeiro" desc="Permite visualizar caixa e contas." checked={usuarioEditando.acesso_financeiro} onChange={(v: any) => setUsuarioEditando({ ...usuarioEditando, acesso_financeiro: v })} />
                  <TogglePermission label="Editar Ordens de Serviço" desc="Permite alterar peças e status de OS." checked={usuarioEditando.pode_editar_os} onChange={(v: any) => setUsuarioEditando({ ...usuarioEditando, pode_editar_os: v })} />
                  <TogglePermission label="Visualizar Todo o DP" desc="Se desligado, verá apenas a própria ficha." checked={usuarioEditando.pode_ver_dp_global} onChange={(v: any) => setUsuarioEditando({ ...usuarioEditando, pode_ver_dp_global: v })} />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button onClick={() => atualizarUsuarioMut.mutate(usuarioEditando)} disabled={atualizarUsuarioMut.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 shadow-md">
                {atualizarUsuarioMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar Perfil e Permissões"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}