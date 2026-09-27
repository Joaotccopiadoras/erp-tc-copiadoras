import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock, User, Loader2, Eye, EyeOff } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!captchaToken) {
      toast({
        title: "Verificação de Segurança",
        description: "Por favor, confirme o reCAPTCHA para provar que não é um robô.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: userEmail, error: rpcError } = await supabase.rpc('get_email_by_username', { 
        p_username: username.toLowerCase().trim() 
      });

      if (rpcError || !userEmail) {
        throw new Error("Nome de utilizador ou palavra-passe incorretos.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password,
      });

      if (error) throw new Error("Nome de utilizador ou palavra-passe incorretos.");

      if (data.user) {
        toast({
          title: "Bem-vindo de volta!",
          description: "Autenticação realizada com sucesso.",
        });
        navigate("/interno");
      }
    } catch (error: any) {
      toast({
        title: "Acesso Negado",
        description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 shadow-xl border border-border">
        
        <div className="flex flex-col items-center mb-6">
          <img 
            src="/logo.png" 
            alt="TC Copiadoras Logo" 
            className="h-16 w-auto object-contain mb-4 drop-shadow-sm"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">TC Copiadoras</h1>
          <p className="text-sm text-muted-foreground mt-1">Acesso ao ERP interno</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nome de Utilizador ou E-mail</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type="text" 
                placeholder="ex: joao.gaia" 
                className="pl-10"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Palavra-passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type={mostrarSenha ? "text" : "password"} 
                placeholder="••••••••" 
                className="pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <ReCAPTCHA
              sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
              onChange={(token) => setCaptchaToken(token)}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full font-semibold mt-4" 
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> A autenticar...</>
            ) : (
              "Entrar no Sistema"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;