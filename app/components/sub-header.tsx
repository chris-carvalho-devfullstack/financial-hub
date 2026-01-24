// app/components/sub-header.tsx
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";

interface SubHeaderProps {
  title: string;
  backTo?: string;
}

export function SubHeader({ title, backTo = "/perfil" }: SubHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-4 p-4 mb-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-30">
      <button 
        onClick={() => navigate(backTo)}
        className="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
      >
        <ArrowLeft size={24} />
      </button>
      <h1 className="text-lg font-bold text-gray-100 tracking-tight">{title}</h1>
    </div>
  );
}