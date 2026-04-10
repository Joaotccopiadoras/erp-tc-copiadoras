import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, Loader2 } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Evita que a página recarregue ao apertar Enter
    setIsLoading(true);

    try {
      // Comunicação direta com o Supabase para validar o usuário
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Bem-vindo de volta!",
          description: "Login realizado com sucesso.",
        });
        navigate("/"); // Redireciona para o Dashboard financeiro
      }
    } catch (error: any) {
      toast({
        title: "Erro ao acessar",
        description: error.message === "Invalid login credentials" 
          ? "E-mail ou senha incorretos." 
          : "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 shadow-xl border border-border">
        
        {/* Cabeçalho com a Logo da TC Copiadoras */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/logo.png" 
            alt="TC Copiadoras Logo" 
            className="h-16 w-auto object-contain mb-4 drop-shadow-sm"
            onError={(e) => {
              // Fallback de segurança caso a imagem não carregue
              e.currentTarget.style.display = 'none';
            }}
          />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">TC Copiadoras</h1>
          <p className="text-sm text-muted-foreground mt-1">Acesso ao Painel Financeiro</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type="email" 
                placeholder="gestor@tccopiadoras.com.br" 
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type="password" 
                placeholder="••••••••" 
                className="pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full font-semibold mt-6" 
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Autenticando...</>
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