import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, Search, Plus, ArrowLeft, Save, Globe, Key, 
  Clock, MapPin, Phone, Mail, Building, Eye, EyeOff, Loader2 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Fornecedores() {
  const [modo, setModo] = useState<"lista" | "formulario">("lista");
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [busca, setBusca] = useState("");

  // Estados do Formulário
  const [id, setId] = useState<string | null>(null);
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpjCpf, setCnpjCpf] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [tipo, setTipo] = useState("");
  const [segmento, setSegmento] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [contatoNome, setContatoNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [portalLink, setPortalLink] = useState("");
  const [portalLogin, setPortalLogin] = useState("");
  const [portalSenha, setPortalSenha] = useState("");
  const [prazoMedio, setPrazoMedio] = useState("");

  // Controles de UI
  const [salvando, setSalvando] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [buscandoIe, setBuscandoIe] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // ==========================================
  // AUTO-SAVE (RASCUNHO BLINDADO)
  // ==========================================
  useEffect(() => {
    const rascunhoSalvo = sessionStorage.getItem("fornecedores_rascunho");
    if (rascunhoSalvo) {
      try {
        const draft = JSON.parse(rascunhoSalvo);
        if (draft.modo === "formulario") {
          setId(draft.id || null); setRazaoSocial(draft.razaoSocial || ""); setNomeFantasia(draft.nomeFantasia || "");
          setCnpjCpf(draft.cnpjCpf || ""); setInscricaoEstadual(draft.inscricaoEstadual || "");
          setTipo(draft.tipo || ""); setSegmento(draft.segmento || ""); setEmail(draft.email || "");
          setTelefone(draft.telefone || ""); setContatoNome(draft.contatoNome || ""); setEndereco(draft.endereco || "");
          setPortalLink(draft.portalLink || ""); setPortalLogin(draft.portalLogin || ""); 
          setPortalSenha(draft.portalSenha || ""); setPrazoMedio(draft.prazoMedio || "");
          setModo("formulario");
        }
      } catch (e) {
        console.error("Erro ao recuperar rascunho", e);
      }
    }
  }, []);

  useEffect(() => {
    if (modo === "formulario") {
      const draft = {
        modo, id, razaoSocial, nomeFantasia, cnpjCpf, inscricaoEstadual, tipo, segmento,
        email, telefone, contatoNome, endereco, portalLink, portalLogin, portalSenha, prazoMedio
      };
      sessionStorage.setItem("fornecedores_rascunho", JSON.stringify(draft));
    } else {
      sessionStorage.removeItem("fornecedores_rascunho");
    }
  }, [modo, id, razaoSocial, nomeFantasia, cnpjCpf, inscricaoEstadual, tipo, segmento, email, telefone, contatoNome, endereco, portalLink, portalLogin, portalSenha, prazoMedio]);

  useEffect(() => {
    if (modo === "lista") fetchFornecedores();
  }, [modo]);

  const fetchFornecedores = async () => {
    const { data, error } = await supabase
      .from('log_fornecedores')
      .select('*')
      .order('nome_fantasia', { ascending: true });
      
    if (data) setFornecedores(data);
    if (error) console.error("Erro ao buscar fornecedores:", error);
  };

  const novoFornecedor = () => {
    setId(null); setRazaoSocial(""); setNomeFantasia(""); setCnpjCpf(""); setInscricaoEstadual("");
    setTipo(""); setSegmento(""); setEmail(""); setTelefone(""); setContatoNome("");
    setEndereco(""); setPortalLink(""); setPortalLogin(""); setPortalSenha(""); setPrazoMedio("");
    setModo("formulario");
  };

  const editarFornecedor = (forn: any) => {
    setId(forn.id); setRazaoSocial(forn.razao_social || ""); setNomeFantasia(forn.nome_fantasia || "");
    setCnpjCpf(forn.cnpj_cpf || ""); setInscricaoEstadual(forn.inscricao_estadual || "");
    setTipo(forn.tipo || ""); setSegmento(forn.segmento || ""); setEmail(forn.email || "");
    setTelefone(forn.telefone || ""); setContatoNome(forn.contato_nome || ""); setEndereco(forn.endereco || "");
    setPortalLink(forn.portal_link || ""); setPortalLogin(forn.portal_login || ""); 
    setPortalSenha(forn.portal_senha || ""); setPrazoMedio(forn.prazo_medio_entrega_dias?.toString() || "");
    setModo("formulario");
  };

  // ==========================================
  // BRASIL API (DADOS GERAIS)
  // ==========================================
  const buscarDadosCNPJ = async () => {
    const cnpjLimpo = cnpjCpf.replace(/\D/g, ''); 
    
    if (cnpjLimpo.length !== 14) return alert("Por favor, digite um CNPJ válido com 14 dígitos.");

    setBuscandoCnpj(true);
    try {
      const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (!resposta.ok) throw new Error("CNPJ não encontrado na Receita Federal");
      
      const dados = await resposta.json();
      
      setRazaoSocial(dados.razao_social || "");
      setNomeFantasia(dados.nome_fantasia || dados.razao_social || ""); 
      setTelefone(dados.ddd_telefone_1 || "");
      if (!email && dados.email) setEmail(dados.email);
      
      const enderecoCompleto = `${dados.logradouro}, ${dados.numero}${dados.complemento ? ' - ' + dados.complemento : ''}, ${dados.bairro}, ${dados.municipio} - ${dados.uf}, CEP: ${dados.cep}`;
      setEndereco(enderecoCompleto);

      alert("Dados gerais importados da Receita Federal com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao buscar CNPJ. Verifique se o número está correto.");
    } finally {
      setBuscandoCnpj(false);
    }
  };

  // ==========================================
  // CNPJa API (INSCRIÇÃO ESTADUAL E EMAIL)
  // ==========================================
  const buscarIEeEmail = async () => {
    const cnpjLimpo = cnpjCpf.replace(/\D/g, ''); 
    
    if (cnpjLimpo.length !== 14) return alert("Por favor, informe o CNPJ antes de buscar a Inscrição Estadual.");

    setBuscandoIe(true);
    try {
      const resposta = await fetch(`https://open.cnpja.com/office/${cnpjLimpo}`);
      if (!resposta.ok) throw new Error("Falha ao comunicar com a API do CNPJa");
      
      const dados = await resposta.json();
      let encontrouAlgo = false;

      // 1. Extraindo a Inscrição Estadual com lógica mais "abrangente"
      if (dados.registrations && dados.registrations.length > 0) {
        // Tenta achar qualquer indício de IE, ou pega o primeiro registro que tiver um número
        const ieObj = dados.registrations.find((r: any) => 
          (r.jurisdiction && r.jurisdiction.includes('states')) ||
          (r.type && r.type.toUpperCase().includes('ESTADUAL')) ||
          (r.type && r.type.toUpperCase().includes('SINTEGRA')) ||
          (r.type && r.type === 'STATE')
        ) || dados.registrations[0]; 

        if (ieObj && ieObj.number) {
          setInscricaoEstadual(ieObj.number);
          encontrouAlgo = true;
        }
      }

      // 2. Extraindo o Email Comercial
      if (dados.emails && dados.emails.length > 0) {
        setEmail(dados.emails[0].address);
        encontrouAlgo = true;
      }

      if (encontrouAlgo) {
        // Silencioso ou com alerta discreto para não poluir
      } else {
        alert("A API não retornou Inscrição Estadual para este CNPJ.");
      }

    } catch (error) {
      console.error("Erro na API CNPJa:", error);
      alert("Não foi possível buscar a Inscrição Estadual no momento. Tente novamente.");
    } finally {
      setBuscandoIe(false);
    }
  };

  const salvarFornecedor = async () => {
    if (!razaoSocial) return alert("A Razão Social é obrigatória!");

    setSalvando(true);
    const payload = {
      razao_social: razaoSocial,
      nome_fantasia: nomeFantasia,
      cnpj_cpf: cnpjCpf,
      inscricao_estadual: inscricaoEstadual,
      tipo,
      segmento,
      email,
      telefone,
      contato_nome: contatoNome,
      endereco,
      portal_link: portalLink,
      portal_login: portalLogin,
      portal_senha: portalSenha,
      prazo_medio_entrega_dias: parseInt(prazoMedio) || null
    };

    let erro;
    if (id) {
      const { error } = await supabase.from('log_fornecedores').update(payload).eq('id', id);
      erro = error;
    } else {
      const { error } = await supabase.from('log_fornecedores').insert([payload]);
      erro = error;
    }

    setSalvando(false);

    if (erro) {
      if (erro.code === '23505') return alert("Este CNPJ já está cadastrado no sistema!");
      return alert("Erro ao salvar: " + erro.message);
    }

    alert("Fornecedor salvo com sucesso!");
    sessionStorage.removeItem("fornecedores_rascunho");
    setModo("lista");
  };

  const fornecedoresFiltrados = fornecedores.filter(f => {
    const termo = busca.toLowerCase();
    return (f.nome_fantasia?.toLowerCase() || "").includes(termo) || 
           (f.razao_social?.toLowerCase() || "").includes(termo) || 
           (f.cnpj_cpf?.toLowerCase() || "").includes(termo) ||
           (f.segmento?.toLowerCase() || "").includes(termo);
  });

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <Building2 className="w-6 h-6 text-indigo-600" /> 
              Gestão de Fornecedores
            </h1>
            <p className="text-slate-500">Cadastros, portais B2B e relacionamento com parceiros (SRM).</p>
          </div>
          {modo === "lista" ? (
            <Button onClick={novoFornecedor} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Novo Fornecedor
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setModo("lista")} className="gap-2">
              <ArrowLeft className="w-4 h-4"/> Voltar à Lista
            </Button>
          )}
        </div>

        {/* MODO LISTA */}
        {modo === "lista" && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b flex flex-wrap gap-4 bg-slate-50">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Buscar por Nome, CNPJ ou Segmento..." 
                  className="pl-9 bg-white" 
                  value={busca} 
                  onChange={e => setBusca(e.target.value)} 
                />
              </div>
            </div>

            <div className="divide-y">
              {fornecedoresFiltrados.length === 0 ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                  <Building className="w-12 h-12 text-slate-300 mb-3" />
                  <p>Nenhum fornecedor encontrado.</p>
                </div>
              ) : (
                fornecedoresFiltrados.map(forn => (
                  <div key={forn.id} onClick={() => editarFornecedor(forn)} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-800 text-lg leading-none">{forn.nome_fantasia || forn.razao_social}</h3>
                          {forn.tipo && <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{forn.tipo}</span>}
                        </div>
                        <p className="text-sm text-slate-500 flex items-center gap-2">
                          <span className="font-mono text-xs">{forn.cnpj_cpf || "Sem CNPJ"}</span>
                          <span>•</span>
                          <span>{forn.segmento || "Segmento não informado"}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5 flex items-center justify-end gap-1"><Clock className="w-3 h-3"/> Prazo Médio</p>
                        {forn.prazo_medio_entrega_dias ? (
                          <p className={`text-sm font-bold ${forn.prazo_medio_entrega_dias <= 5 ? 'text-emerald-600' : forn.prazo_medio_entrega_dias <= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                            {forn.prazo_medio_entrega_dias} dias
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400 font-medium">N/A</p>
                        )}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-slate-400 group-hover:border-indigo-300 group-hover:text-indigo-600 transition-colors">
                        <ArrowLeft className="w-4 h-4 rotate-180" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* MODO FORMULÁRIO */}
        {modo === "formulario" && (
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-8 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2 mb-4">
                <Building className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-800">Dados da Empresa</h2>
              </div>
              
              <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 mb-6">
                <label className="text-sm font-bold text-indigo-900 block mb-2">Busca Automática por CNPJ (Dados Gerais)</label>
                <div className="flex gap-3">
                  <Input 
                    value={cnpjCpf} 
                    onChange={e => setCnpjCpf(e.target.value)} 
                    placeholder="Digite apenas os números do CNPJ..." 
                    className="max-w-xs bg-white border-indigo-200 focus-visible:ring-indigo-500"
                    onKeyDown={e => { if(e.key === 'Enter') buscarDadosCNPJ() }}
                  />
                  <Button onClick={buscarDadosCNPJ} disabled={buscandoCnpj} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                    {buscandoCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Consultar Receita Federal
                  </Button>
                </div>
                <p className="text-xs text-indigo-600/70 mt-2 flex items-center gap-1">
                  Puxa Razão Social, Nome Fantasia e Endereço automaticamente.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Razão Social <span className="text-red-500">*</span></label>
                  <Input value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} placeholder="Ex: BROTHER INDUSTRIES LTDA" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome Fantasia</label>
                  <Input value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)} placeholder="Ex: Brother Brasil" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    Inscrição Estadual (IE)
                  </label>
                  <div className="flex gap-2">
                    <Input value={inscricaoEstadual} onChange={e => setInscricaoEstadual(e.target.value)} placeholder="Ex: 123.456.789.000" className="flex-1" />
                    <Button 
                      variant="outline" 
                      onClick={buscarIEeEmail} 
                      disabled={buscandoIe} 
                      className="shrink-0 gap-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                      title="Preencher IE e E-mail"
                    >
                      {buscandoIe ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Preencher
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Parceiro</label>
                    <Select value={tipo} onValueChange={setTipo}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fabricante">Fabricante</SelectItem>
                        <SelectItem value="Distribuidor">Distribuidor</SelectItem>
                        <SelectItem value="Revenda">Revenda</SelectItem>
                        <SelectItem value="Prestador de Serviço">Serviços</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Segmento</label>
                    <Input value={segmento} onChange={e => setSegmento(e.target.value)} placeholder="Ex: Peças e Insumos" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2 mb-4 mt-6">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-800">Contato e Localização</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400"/> E-mail Comercial</label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vendas@empresa.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400"/> Telefone / WhatsApp</label>
                  <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do Vendedor / Contato</label>
                  <Input value={contatoNome} onChange={e => setContatoNome(e.target.value)} placeholder="Ex: Carlos Silva" />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <label className="text-sm font-medium flex items-center gap-2">Endereço Completo</label>
                  <Input value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua, Número, Bairro, Cidade - UF, CEP" />
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 border-b pb-2 mb-4">
                <Globe className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-800">Portal B2B e Logística</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Link do Portal de Compras (B2B)</label>
                    <Input value={portalLink} onChange={e => setPortalLink(e.target.value)} placeholder="https://b2b.fornecedor.com.br" className="bg-white" />
                  </div>
                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <label className="text-sm font-medium text-slate-700">Usuário do Portal</label>
                      <Input value={portalLogin} onChange={e => setPortalLogin(e.target.value)} placeholder="Seu email ou CNPJ" className="bg-white" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <label className="text-sm font-medium text-slate-700">Senha</label>
                      <div className="relative">
                        <Input 
                          type={mostrarSenha ? "text" : "password"} 
                          value={portalSenha} 
                          onChange={e => setPortalSenha(e.target.value)} 
                          placeholder="••••••••" 
                          className="bg-white pr-10" 
                        />
                        <button 
                          type="button"
                          onClick={() => setMostrarSenha(!mostrarSenha)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-l pl-6 border-slate-200">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2 text-slate-700"><Clock className="w-4 h-4 text-amber-500"/> Prazo Médio de Entrega Previsto (Dias)</label>
                    <Input type="number" min="0" value={prazoMedio} onChange={e => setPrazoMedio(e.target.value)} placeholder="Ex: 5" className="bg-white max-w-[150px]" />
                    <p className="text-xs text-slate-500 mt-1">Este dado ajudará o sistema a sugerir o melhor dia para fechar pedidos.</p>
                  </div>
                </div>

              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => setModo("lista")}>Cancelar</Button>
              <Button onClick={salvarFornecedor} disabled={salvando} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-8">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Fornecedor
              </Button>
            </div>
            
          </div>
        )}

      </div>
    </AppLayout>
  );
}