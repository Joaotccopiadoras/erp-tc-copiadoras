import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Loader2, Plus, Trash2, Database, FolderTree, Settings2 } from "lucide-react";
import { buscarRegistros, adicionarRegistro, deletarRegistro } from "../api/tabelas";

// Dicionário de Arquitetura: Centraliza as parametrizações de todos os módulos
const MAPA_MODULOS = [
  {
    id: "financeiro", nome: "Módulo Financeiro", cor: "text-emerald-600", bg: "bg-emerald-50",
    tabelas: [
      { key: "fin_categorias", nome: "Categorias Financeiras", temTipo: true },
      { key: "fin_contas_bancarias", nome: "Contas Bancárias", temTipo: false },
      { key: "fin_centro_custo", nome: "Centros de Custo", temTipo: false },
      { key: "fin_forma_pagamento", nome: "Formas de Pagamento", temTipo: false },
    ]
  },
  {
    id: "logistica", nome: "Módulo Logística (SRM)", cor: "text-blue-600", bg: "bg-blue-50",
    tabelas: [
      { key: "log_locais_estoque", nome: "Locais de Estoque (Prateleiras)", temTipo: false }
    ]
  },
  {
    id: "comercial", nome: "Módulo Comercial (CRM)", cor: "text-amber-600", bg: "bg-amber-50",
    tabelas: [
      { key: "com_segmento_negocio", nome: "Segmentos de Negócio", temTipo: false }
    ]
  },
  {
    id: "assistencia", nome: "Assistência & Gráfica", cor: "text-indigo-600", bg: "bg-indigo-50",
    tabelas: [
      // Tabelas futuras ou de classificação simples podem ser adicionadas aqui facilmente
      { key: "srv_status_os", nome: "Status de Ordens de Serviço", temTipo: false } 
    ]
  }
];

export default function TabTabelas() {
  const { toast } = useToast();
  
  // Navegação Interna
  const [moduloAtivo, setModuloAtivo] = useState(MAPA_MODULOS[0]);
  const [tabelaAtiva, setTabelaAtiva] = useState(MAPA_MODULOS[0].tabelas[0]);
  
  // Estado dos Dados
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Formulário Dinâmico
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState("Despesa");

  useEffect(() => {
    carregarDados();
  }, [tabelaAtiva]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const res = await buscarRegistros(tabelaAtiva.key);
      setDados(res);
    } catch (error: any) {
      toast({ title: "Erro de Leitura", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;

    setSalvando(true);
    try {
      const payload: any = { nome: novoNome.trim() };
      // Injeta a coluna 'tipo' apenas se a tabela exigir (ex: Categorias Financeiras)
      if (tabelaAtiva.temTipo) payload.tipo = novoTipo;

      await adicionarRegistro(tabelaAtiva.key, payload);
      toast({ title: "Sucesso", description: "Registo adicionado com sucesso." });
      setNovoNome("");
      await carregarDados();
    } catch (error: any) {
      toast({ title: "Erro ao Guardar", description: error.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: string | number) => {
    if (!confirm("Tem certeza que deseja remover este registo? Ele pode quebrar históricos caso esteja em uso.")) return;
    try {
      await deletarRegistro(tabelaAtiva.key, id);
      toast({ title: "Removido", description: "Registo excluído com sucesso." });
      await carregarDados();
    } catch (error: any) {
      toast({ title: "Operação Bloqueada", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-300">
      
      {/* Coluna Esquerda: Navegação por Módulos */}
      <div className="w-full lg:w-64 space-y-6 shrink-0">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <FolderTree className="w-4 h-4" /> Domínios do ERP
          </h2>
          <div className="flex flex-col gap-2">
            {MAPA_MODULOS.map(mod => (
              <button
                key={mod.id}
                onClick={() => {
                  setModuloAtivo(mod);
                  setTabelaAtiva(mod.tabelas[0]);
                }}
                className={`text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  moduloAtivo.id === mod.id 
                    ? `${mod.bg}${mod.cor} border border-current shadow-sm` 
                    : `text-slate-600 hover:bg-slate-50 border border-transparent`
                }`}
              >
                {mod.nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Coluna Direita: Gestão da Tabela Selecionada */}
      <div className="flex-1 space-y-6">
        
        {/* Menu Superior de Tabelas do Módulo */}
        <div className="bg-white p-2 rounded-xl border shadow-sm flex flex-wrap gap-2">
          {moduloAtivo.tabelas.map(tab => (
            <button
              key={tab.key}
              onClick={() => setTabelaAtiva(tab)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                tabelaAtiva.key === tab.key 
                  ? 'bg-slate-800 text-white font-bold shadow-md' 
                  : 'bg-transparent text-slate-600 hover:bg-slate-100 font-medium'
              }`}
            >
              <Database className="w-3 h-3 inline-block mr-2 opacity-70" />
              {tab.nome}
            </button>
          ))}
        </div>

        {/* Área de Ação (CRUD) */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Settings2 className={`w-5 h-5 ${moduloAtivo.cor}`} /> 
                Gestão de {tabelaAtiva.nome}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1">Tabela: {tabelaAtiva.key}</p>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Formulário de Inserção */}
            <div className="col-span-1 space-y-4 bg-slate-50 p-4 rounded-xl border">
              <div>
                <label className="text-sm font-bold text-slate-700">Novo Registo</label>
                <p className="text-xs text-slate-500 mb-3">Adicione um novo parâmetro à lista.</p>
              </div>
              
              <div className="space-y-3">
                <Input 
                  placeholder="Nome/Descrição..." 
                  value={novoNome} 
                  onChange={e => setNovoNome(e.target.value)} 
                  className="bg-white"
                />
                
                {tabelaAtiva.temTipo && (
                  <Select value={novoTipo} onValueChange={setNovoTipo}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Receita">Receita (Entrada)</SelectItem>
                      <SelectItem value="Despesa">Despesa (Saída)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                
                <Button 
                  onClick={handleSalvar} 
                  disabled={salvando || !novoNome.trim()} 
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white"
                >
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Listagem de Dados */}
            <div className="col-span-1 md:col-span-2">
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Descrição / Nome</th>
                      {tabelaAtiva.temTipo && <th className="px-4 py-3">Natureza</th>}
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
                    ) : dados.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-500 text-sm">Nenhum registo encontrado nesta tabela.</td></tr>
                    ) : (
                      dados.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">{String(item.id).slice(0, 4)}...</td>
                          <td className="px-4 py-3 font-bold text-slate-700">{item.nome}</td>
                          {tabelaAtiva.temTipo && (
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${item.tipo === 'Receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {item.tipo}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => handleExcluir(item.id)}
                              className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      </div>
    </div>
  );
}