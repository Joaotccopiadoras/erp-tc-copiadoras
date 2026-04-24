import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, Search, Plus, ArrowLeft, Save, Globe, Key, 
  Clock, MapPin, Phone, Mail, Building, Eye, EyeOff, Loader2, Truck, Activity, Receipt, Edit, Calculator
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Fornecedores() {
  const [modo, setModo] = useState<"lista" | "formulario" | "dossie">("lista");
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [busca, setBusca] = useState("");

  // ==========================================
  // ESTADOS: DOSSIÊ DO FORNECEDOR
  // ==========================================
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<any | null>(null);
  const [notasFiscais, setNotasFiscais] = useState<any[]>([]);

  // ==========================================
  // ESTADOS: FORMULÁRIO
  // ==========================================
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
  const [isTransportadora, setIsTransportadora] = useState(false);

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
          setIsTransportadora(draft.isTransportadora || false);
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
        email, telefone, contatoNome, endereco, portalLink, portalLogin, portalSenha, prazoMedio, isTransportadora
      };
      sessionStorage.setItem("fornecedores_rascunho", JSON.stringify(draft));
    } else {
      sessionStorage.removeItem("fornecedores_rascunho");
    }
  }, [modo, id, razaoSocial, nomeFantasia, cnpjCpf, inscricaoEstadual, tipo, segmento, email, telefone, contatoNome, endereco, portalLink, portalLogin, portalSenha, prazoMedio, isTransportadora]);

  // ==========================================

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

  // --- AÇÕES DO DOSSIÊ ---
  const abrirDossie = async (forn: any) => {
    setFornecedorSelecionado(forn);
    setModo("dossie");

    // Busca o histórico de notas fiscais de entrada deste fornecedor
    const { data } = await supabase
        .from('log_documentos_entrada')
        .select('*')
        .eq('fornecedor_id', forn.id)
        .order('data_emissao', { ascending: false });
        
    if (data) setNotasFiscais(data);
  };

  const novoFornecedor = () => {
    setId(null); setRazaoSocial(""); setNomeFantasia(""); setCnpjCpf(""); setInscricaoEstadual("");
    setTipo(""); setSegmento(""); setEmail(""); setTelefone(""); setContatoNome("");
    setEndereco(""); setPortalLink(""); setPortalLogin(""); setPortalSenha(""); setPrazoMedio("");
    setIsTransportadora(false);
    setModo("formulario");
  };

  const editarFornecedor = (forn: any) => {
    setId(forn.id); setRazaoSocial(forn.razao_social || ""); setNomeFantasia(forn.nome_fantasia || "");
    setCnpjCpf(forn.cnpj_cpf || ""); setInscricaoEstadual(forn.inscricao_estadual || "");
    setTipo(forn.tipo || ""); setSegmento(forn.segmento || ""); setEmail(forn.email || "");
    setTelefone(forn.telefone || ""); setContatoNome(forn.contato_nome || ""); setEndereco(forn.endereco || "");
    setPortalLink(forn.portal_link || ""); setPortalLogin(forn.portal_login || ""); 
    setPortalSenha(forn.portal_senha || ""); setPrazoMedio(forn.prazo_medio_entrega_dias?.toString() || "");
    setIsTransportadora(forn.is_transportadora || false);
    setModo("formulario");
  };

  // ==========================================
  // BRASIL API E CNPJa
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
      console.error(error); alert("Erro ao buscar CNPJ. Verifique se o número está correto.");
    } finally { setBuscandoCnpj(false); }
  };

  const buscarIEeEmail = async () => {
    const cnpjLimpo = cnpjCpf.replace(/\D/g, ''); 
    if (cnpjLimpo.length !== 14) return alert("Por favor, informe o CNPJ antes de buscar a Inscrição Estadual.");
    setBuscandoIe(true);
    try {
      const resposta = await fetch(`https://open.cnpja.com/office/${cnpjLimpo}`);
      if (!resposta.ok) throw new Error("Falha ao comunicar com a API do CNPJa");
      const dados = await resposta.json();
      let encontrouAlgo = false;

      if (dados.registrations && Array.isArray(dados.registrations) && dados.registrations.length > 0) {
        let iePrincipal = dados.registrations.find((r: any) => r.type?.text?.includes("Normal"));
        if (!iePrincipal && dados.address && dados.address.state) iePrincipal = dados.registrations.find((r: any) => r.state === dados.address.state);
        if (!iePrincipal) iePrincipal = dados.registrations[0];
        if (iePrincipal && iePrincipal.number) {
          setInscricaoEstadual(iePrincipal.number.replace(/[^\w\s]/gi, ''));
          encontrouAlgo = true;
        }
      }
      if (dados.emails && Array.isArray(dados.emails) && dados.emails.length > 0) {
        setEmail(dados.emails[0].address); encontrouAlgo = true;
      }
      if (!encontrouAlgo) alert("A API não retornou Inscrição Estadual ou E-mail para este CNPJ.");
    } catch (error) {
      console.error(error); alert("Não foi possível buscar a Inscrição Estadual no momento. Tente novamente.");
    } finally { setBuscandoIe(false); }
  };

  const salvarFornecedor = async () => {
    if (!razaoSocial) return alert("A Razão Social é obrigatória!");
    setSalvando(true);
    
    const payload = {
      razao_social: razaoSocial, nome_fantasia: nomeFantasia, cnpj_cpf: cnpjCpf,
      inscricao_estadual: inscricaoEstadual, tipo, segmento, email, telefone,
      contato_nome: contatoNome, endereco, portal_link: portalLink, portal_login: portalLogin,
      portal_senha: portalSenha, prazo_medio_entrega_dias: parseInt(prazoMedio) || null,
      is_transportadora: isTransportadora
    };

    let erro;
    if (id) {
      const { error } = await supabase.from('log_fornecedores').update(payload).eq('id', id); erro = error;
    } else {
      const { error } = await supabase.from('log_fornecedores').insert([payload]); erro = error;
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
      <div className="space-y-6 max-w-6xl mx-auto mb-12">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <Building2 className="w-6 h-6 text-indigo-600" /> Gestão de Fornecedores
            </h1>
            <p className="text-slate-500">Cadastros, portais B2B, histórico financeiro e de compras (SRM).</p>
          </div>
          {modo === "lista" ? (
            <Button onClick={novoFornecedor} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Novo Fornecedor
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setModo("lista")} className="gap-2 text-slate-600">
              <ArrowLeft className="w-4 h-4"/> Voltar à Lista
            </Button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODO: LISTA DE FORNECEDORES */}
        {/* ========================================================================= */}
        {modo === "lista" && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b flex flex-wrap gap-4 bg-slate-50">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Buscar por Nome, CNPJ ou Segmento..." className="pl-9 bg-white" value={busca} onChange={e => setBusca(e.target.value)} />
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
                  <div key={forn.id} onClick={() => abrirDossie(forn)} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        {forn.is_transportadora ? <Truck className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-800 text-lg leading-none">{forn.nome_fantasia || forn.razao_social}</h3>
                          {forn.codigo_sequencial && <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">#{forn.codigo_sequencial}</span>}
                          {forn.is_transportadora && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1"><Truck className="w-3 h-3"/> Transportadora</span>}
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
                          <p className={`text-sm font-bold ${forn.prazo_medio_entrega_dias <= 5 ? 'text-emerald-600' : forn.prazo_medio_entrega_dias <= 15 ? 'text-amber-600' : 'text-red-600'}`}>{forn.prazo_medio_entrega_dias} dias</p>
                        ) : (<p className="text-sm text-slate-400 font-medium">N/A</p>)}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 group-hover:bg-indigo-50 gap-2"><Activity className="w-4 h-4"/> Dossiê</Button>
                        <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); editarFornecedor(forn); }} className="h-9 w-9 text-slate-400 hover:text-indigo-600" title="Editar"><Edit className="w-4 h-4"/></Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODO: DOSSIÊ DO FORNECEDOR (VISÃO 360) */}
        {/* ========================================================================= */}
        {modo === "dossie" && fornecedorSelecionado && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-200">
            
            {/* Cabeçalho do Fornecedor */}
            <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-t-4 border-t-indigo-600">
              <div>
                  <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">{fornecedorSelecionado.nome_fantasia || fornecedorSelecionado.razao_social}</h2>
                      {fornecedorSelecionado.is_transportadora && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase flex items-center gap-1"><Truck className="w-3 h-3"/> Transportadora</span>}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-indigo-600" onClick={() => editarFornecedor(fornecedorSelecionado)} title="Editar Dados"><Edit className="w-3 h-3"/></Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                      <span className="flex items-center gap-1 font-mono font-semibold bg-slate-100 px-2 py-0.5 rounded"><Building2 className="w-4 h-4 text-slate-400"/> {fornecedorSelecionado.cnpj_cpf || 'S/ CNPJ'}</span>
                      <span className="flex items-center gap-1"><Phone className="w-4 h-4 text-slate-400"/> {fornecedorSelecionado.telefone || 'S/ Tel'}</span>
                      <span className="flex items-center gap-1"><Mail className="w-4 h-4 text-slate-400"/> {fornecedorSelecionado.email || 'S/ Email'}</span>
                  </div>
              </div>
              <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Comprado (Histórico)</p>
                  <p className="text-3xl font-black text-emerald-600">R$ {notasFiscais.reduce((a, b) => a + (Number(b.valor_total) || 0), 0).toFixed(2).replace('.',',')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Lado Esquerdo: Info de Contato e Portal B2B */}
                <div className="space-y-6">
                    <div className="bg-white p-5 rounded-xl border shadow-sm">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2"><MapPin className="w-4 h-4 text-indigo-500"/> Localização e Contato</h3>
                        <div className="space-y-3">
                            <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Endereço Completo</p><p className="text-sm font-medium text-slate-800">{fornecedorSelecionado.endereco || 'Não informado'}</p></div>
                            <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Contato Responsável (Vendedor)</p><p className="text-sm font-medium text-slate-800">{fornecedorSelecionado.contato_nome || 'Não informado'}</p></div>
                        </div>
                    </div>

                    <div className="bg-slate-800 p-5 rounded-xl shadow-md text-white border border-slate-700">
                        <h3 className="font-bold flex items-center gap-2 mb-4 border-b border-slate-600 pb-2"><Globe className="w-4 h-4 text-indigo-400"/> Credenciais do Portal B2B</h3>
                        {fornecedorSelecionado.portal_link ? (
                            <div className="space-y-3">
                                <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Acesso Web</p><a href={fornecedorSelecionado.portal_link.startsWith('http') ? fornecedorSelecionado.portal_link : `https://${fornecedorSelecionado.portal_link}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-300 hover:text-indigo-200 underline break-all">{fornecedorSelecionado.portal_link}</a></div>
                                <div className="grid grid-cols-2 gap-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 mt-2">
                                    <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Login</p><p className="text-sm font-mono bg-slate-900 px-2 py-1 rounded select-all">{fornecedorSelecionado.portal_login || 'N/A'}</p></div>
                                    <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Senha</p><p className="text-sm font-mono bg-slate-900 px-2 py-1 rounded select-all">{fornecedorSelecionado.portal_senha || 'N/A'}</p></div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">Nenhum portal de compras configurado para este fornecedor.</p>
                        )}
                    </div>
                </div>

                {/* Lado Direito: Histórico de NFs de Entrada */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden h-full flex flex-col">
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Receipt className="w-5 h-5 text-emerald-600"/> Histórico de Notas Fiscais (Entradas)</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Todas as aquisições processadas no estoque referentes a este CNPJ.</p>
                            </div>
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">{notasFiscais.length} Documentos</span>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider">
                                        <th className="p-3 font-semibold border-b text-center w-28">Nº da NF</th>
                                        <th className="p-3 font-semibold border-b text-center">Emissão</th>
                                        <th className="p-3 font-semibold border-b">Frete Atribuído</th>
                                        <th className="p-3 font-semibold border-b text-right">Impostos</th>
                                        <th className="p-3 font-semibold border-b text-right">Total da Nota</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {notasFiscais.length === 0 ? (
                                        <tr><td colSpan={5} className="p-12 text-center text-slate-400"><Receipt className="w-8 h-8 mx-auto mb-2 opacity-30"/> Nenhuma Nota Fiscal registrada para este fornecedor.</td></tr>
                                    ) : (
                                        notasFiscais.map(nf => (
                                            <tr key={nf.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 text-center">
                                                    <p className="font-bold text-slate-800 font-mono">{nf.documento}</p>
                                                    <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">{nf.tipo_documento}</span>
                                                </td>
                                                <td className="p-3 text-center text-sm font-medium text-slate-600">{nf.data_emissao ? new Date(nf.data_emissao).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '—'}</td>
                                                <td className="p-3">
                                                    <p className="text-xs font-medium text-slate-700">{nf.modalidade_frete}</p>
                                                    {Number(nf.valor_frete) > 0 && <p className="text-[10px] font-bold text-amber-600 mt-0.5">+ R$ {Number(nf.valor_frete).toFixed(2).replace('.',',')}</p>}
                                                </td>
                                                <td className="p-3 text-right text-xs font-medium text-slate-500">R$ {Number(nf.valor_impostos || 0).toFixed(2).replace('.',',')}</td>
                                                <td className="p-3 text-right font-bold text-emerald-700">R$ {Number(nf.valor_total).toFixed(2).replace('.',',')}</td>
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
        )}

        {/* ========================================================================= */}
        {/* MODO: FORMULÁRIO (NOVO / EDITAR) */}
        {/* ========================================================================= */}
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
                  <Input value={cnpjCpf} onChange={e => setCnpjCpf(e.target.value)} placeholder="Digite apenas os números do CNPJ..." className="max-w-xs bg-white border-indigo-200 focus-visible:ring-indigo-500" onKeyDown={e => { if(e.key === 'Enter') buscarDadosCNPJ() }} />
                  <Button onClick={buscarDadosCNPJ} disabled={buscandoCnpj} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">{buscandoCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Consultar Receita Federal</Button>
                </div>
                <p className="text-xs text-indigo-600/70 mt-2 flex items-center gap-1">Puxa Razão Social, Nome Fantasia e Endereço automaticamente.</p>
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
                  <label className="text-sm font-medium flex items-center gap-2">Inscrição Estadual (IE)</label>
                  <div className="flex gap-2">
                    <Input value={inscricaoEstadual} onChange={e => setInscricaoEstadual(e.target.value)} placeholder="Ex: 123.456.789.000" className="flex-1" />
                    <Button variant="outline" onClick={buscarIEeEmail} disabled={buscandoIe} className="shrink-0 gap-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50" title="Preencher IE e E-mail">{buscandoIe ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Preencher</Button>
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

                {/* CAIXA DE SELEÇÃO: É TRANSPORTADORA? */}
                <div 
                  className={`md:col-span-2 mt-2 border rounded-lg p-4 flex items-start gap-4 cursor-pointer transition-colors ${isTransportadora ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                  onClick={() => setIsTransportadora(!isTransportadora)}
                >
                  <button 
                    type="button" 
                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors mt-0.5 ${isTransportadora ? 'bg-amber-500' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isTransportadora ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <div>
                    <label className="text-sm font-bold flex items-center gap-2 cursor-pointer mb-1 text-slate-800">
                      <Truck className={`w-4 h-4 ${isTransportadora ? 'text-amber-600' : 'text-slate-400'}`} /> 
                      Este Fornecedor também é uma Transportadora?
                    </label>
                    <p className="text-xs text-slate-500">Ao ativar esta chave, esta empresa aparecerá na lista de transportadoras para vínculos de Frete FOB e CT-e no momento do Lançamento de Notas Fiscais.</p>
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
                <div className="space-y-2"><label className="text-sm font-medium flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400"/> E-mail Comercial</label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vendas@empresa.com" /></div>
                <div className="space-y-2"><label className="text-sm font-medium flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400"/> Telefone / WhatsApp</label><Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999" /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Nome do Vendedor / Contato</label><Input value={contatoNome} onChange={e => setContatoNome(e.target.value)} placeholder="Ex: Carlos Silva" /></div>
                <div className="space-y-2 md:col-span-3"><label className="text-sm font-medium flex items-center gap-2">Endereço Completo</label><Input value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua, Número, Bairro, Cidade - UF, CEP" /></div>
              </div>
            </div>

            <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 border-b pb-2 mb-4">
                <Globe className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-800">Portal B2B e Logística</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Link do Portal de Compras (B2B)</label><Input value={portalLink} onChange={e => setPortalLink(e.target.value)} placeholder="https://b2b.fornecedor.com.br" className="bg-white" /></div>
                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1"><label className="text-sm font-medium text-slate-700">Usuário do Portal</label><Input value={portalLogin} onChange={e => setPortalLogin(e.target.value)} placeholder="Seu email ou CNPJ" className="bg-white" /></div>
                    <div className="space-y-2 flex-1"><label className="text-sm font-medium text-slate-700">Senha</label><div className="relative"><Input type={mostrarSenha ? "text" : "password"} value={portalSenha} onChange={e => setPortalSenha(e.target.value)} placeholder="••••••••" className="bg-white pr-10" /><button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">{mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
                  </div>
                </div>
                <div className="space-y-4 border-l pl-6 border-slate-200">
                  <div className="space-y-2"><label className="text-sm font-medium flex items-center gap-2 text-slate-700"><Clock className="w-4 h-4 text-amber-500"/> Prazo Médio de Entrega Previsto (Dias)</label><Input type="number" min="0" value={prazoMedio} onChange={e => setPrazoMedio(e.target.value)} placeholder="Ex: 5" className="bg-white max-w-[150px]" /><p className="text-xs text-slate-500 mt-1">Este dado ajudará o sistema a sugerir o melhor dia para fechar pedidos.</p></div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => { sessionStorage.removeItem("fornecedores_rascunho"); setModo("lista"); }}>Cancelar</Button>
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