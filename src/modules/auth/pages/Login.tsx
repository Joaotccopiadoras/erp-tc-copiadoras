import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/lib/supabase/client";
import { useAuth } from "@/shared/contexts/AuthContext";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/hooks/use-toast";
import { Loader2, Lock, Mail } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    if (!email || !senha) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      });

      if (error) throw error;
      
    } catch (error: any) {
      toast({
        title: "Acesso Negado",
        description: "Credenciais inválidas. Verifique seu e-mail e senha.",
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
            <label className="text-xs font-bold text-slate-600 uppercase">Credencial (E-mail)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                type="email" 
                placeholder="operador@tccopiadoras.com.br" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                type="password" 
                placeholder="••••••••" 
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="pl-9 bg-slate-50"
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 mt-4 shadow-md"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar no Sistema"}
          </Button>
        </form>
        
      </div>
    </div>
  );
}