import React, { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Button } from "./button";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  placeholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  children: React.ReactNode; // A lista de resultados renderizada pela página mãe
}

export function SearchModal({
  isOpen,
  onClose,
  title,
  icon,
  placeholder = "Pesquisar...",
  searchValue,
  onSearchChange,
  children,
}: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Foca o input automaticamente ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Fecha o modal ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 pt-[10vh] animate-in fade-in duration-200">
      <div 
        className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[75vh] overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho de Pesquisa (Sem Bordas Vazando) */}
        <div className="bg-white p-2 flex items-center gap-3 border-b border-slate-100 shrink-0">
          <div className="text-slate-400 ml-3 shrink-0">{icon || <Search className="w-5 h-5" />}</div>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent border-0 focus:ring-0 text-slate-800 placeholder:text-slate-400 outline-none text-base h-10 w-full"
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-full shrink-0 mr-1"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Corpo de Resultados */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
            {title}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// Sub-componente para os itens da lista
export function SearchModalItem({ 
  title, 
  subtitle, 
  icon, 
  onClick, 
  colorClass = "purple" 
}: { 
  title: string; 
  subtitle?: React.ReactNode; 
  icon?: React.ReactNode; 
  onClick: () => void;
  colorClass?: "purple" | "indigo" | "blue" | "emerald" | "slate";
}) {
  
  const colors = {
    purple: "text-purple-600 bg-purple-50 hover:border-purple-300 hover:ring-purple-100 group-hover:text-purple-700",
    indigo: "text-indigo-600 bg-indigo-50 hover:border-indigo-300 hover:ring-indigo-100 group-hover:text-indigo-700",
    blue: "text-blue-600 bg-blue-50 hover:border-blue-300 hover:ring-blue-100 group-hover:text-blue-700",
    emerald: "text-emerald-600 bg-emerald-50 hover:border-emerald-300 hover:ring-emerald-100 group-hover:text-emerald-700",
    slate: "text-slate-600 bg-slate-50 hover:border-slate-300 hover:ring-slate-100 group-hover:text-slate-700",
  };

  const selectedColor = colors[colorClass] || colors.slate;
  const badgeColor = selectedColor.split(' ')[0] + " " + selectedColor.split(' ')[1]; // Pega as duas primeiras classes

  return (
    <div
      onClick={onClick}
      className={`bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer transition-all hover:ring-1 group ${selectedColor.split('hover:')[1]} ${selectedColor.split('hover:')[2]}`}
    >
      <div className="flex items-center gap-4">
        {icon && (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${badgeColor}`}>
            {icon}
          </div>
        )}
        <div>
          <p className={`font-bold text-slate-800 transition-colors ${selectedColor.split('group-hover:')[1]}`}>
            {title}
          </p>
          {subtitle && (
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${badgeColor}`}>
          Selecionar
        </span>
      </div>
    </div>
  );
}