import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/shared/components/ui/toast"
import { useToast } from "@/shared/hooks/use-toast"
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        
        // Lógica inteligente para definir cores e ícones baseados no conteúdo e variante
        const isDestructive = variant === "destructive";
        const titleStr = title?.toString().toLowerCase() || "";
        const isSuccess = titleStr.includes("sucesso") || titleStr.includes("concluíd");
        const isWarning = titleStr.includes("atenção") || titleStr.includes("aviso");

        // Define as cores seguindo a paleta do seu ERP
        const iconColor = isDestructive ? "text-rose-500" : isSuccess ? "text-emerald-500" : isWarning ? "text-amber-500" : "text-indigo-600";
        const borderColor = isDestructive ? "bg-rose-500" : isSuccess ? "bg-emerald-500" : isWarning ? "bg-amber-500" : "bg-indigo-600";

        return (
          <Toast
            key={id}
            variant={variant}
            {...props}
            // O uso do !bg-white e !text-slate-800 impede que o shadcn pinte o card inteiro de vermelho em caso de erro, mantendo o padrão "Clean"
            className={`group flex items-start gap-4 p-4 rounded-xl shadow-xl border border-slate-200 overflow-hidden relative !bg-white !text-slate-800 transition-all duration-300`}
          >
            {/* Filete lateral corporativo (Identidade visual das suas outras tabelas/cards) */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${borderColor}`} />

            {/* Ícone Dinâmico */}
            <div className={`mt-0.5 shrink-0 ${iconColor}`}>
              {isDestructive ? <AlertCircle className="w-5 h-5" /> :
               isSuccess ? <CheckCircle2 className="w-5 h-5" /> :
               isWarning ? <AlertTriangle className="w-5 h-5" /> :
               <Info className="w-5 h-5" />}
            </div>

            {/* Conteúdo Textual */}
            <div className="grid gap-1 flex-1 pr-6">
              {title && <ToastTitle className="font-bold text-sm text-slate-800">{title}</ToastTitle>}
              {description && (
                <ToastDescription className="text-xs text-slate-500 font-medium">
                  {description}
                </ToastDescription>
              )}
            </div>

            {action}
            <ToastClose className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 transition-colors focus:ring-0" />
          </Toast>
        )
      })}
      
      {/* Posicionamento no canto inferior direito (padrão em ERPs modernos) e sobrepondo qualquer modal com z-[99999] */}
      <ToastViewport className="sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[400px] p-6 gap-3 z-[99999]" />
    </ToastProvider>
  )
}