import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/lib/supabase/client";
import { useAuth } from "@/shared/contexts/AuthContext";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/hooks/use-toast";
import { Loader2, Lock, User, Eye, EyeOff } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";

export default function Login() {
  const [credencial, setCredencial] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaValido, setCaptchaValido] = useState(false);
  
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && session) {
      navigate("/interno", { replace: true });
    }
  }, [session, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credencial || !senha) return;
    
    if (!captchaValido) {
      return toast({
        title: "Verificação de Segurança",
        description: "Por favor, marque a caixa 'Não sou um robô'.",
        variant: "destructive",
      });
    }

    setIsSubmitting(true);
    try {
      let emailFinal = credencial.trim().toLowerCase();
      
      // Traduz o Nome de Usuário para o e-mail real cadastrado na base
      const { data: emailTraduzido, error: rpcError } = await supabase.rpc('get_email_by_username', { p_username: emailFinal });
      
      if (!rpcError && emailTraduzido) {
        emailFinal = emailTraduzido;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: emailFinal,
        password: senha,
      });

      if (error) throw error;
      
    } catch (error: any) {
      toast({
        title: "Acesso Negado",
        description: "Credenciais inválidas. Verifique seu usuário e senha.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">TC Copiadoras</h1>
          <p className="text-sm text-slate-500 mt-1">Acesso ao Sistema Integrado (ERP)</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase">Credencial (Usuário ou E-mail)</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              {/* type mudado para "text" para não exigir o @ */}
              <Input 
                type="text" 
                placeholder="Ex: joao.gaia" 
                value={credencial}
                onChange={(e) => setCredencial(e.target.value)}
                className="pl-9 bg-slate-50"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase">Palavra-passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                type={mostrarSenha ? "text" : "password"} 
                placeholder="••••••••" 
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="pl-9 pr-10 bg-slate-50"
                required
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-center py-2">
            {/* Chave de teste pública do Google para localhost/desenvolvimento. Troque pela sua chave real se for para produção */}
            <ReCAPTCHA
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
              onChange={(token) => setCaptchaValido(!!token)}
            />
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 shadow-md"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar no Sistema"}
          </Button>
        </form>
      </div>
    </div>
  );
}