import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  fallback?: string;
  label?: string;
}

export default function BackButton({ fallback, label = "Back" }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => {
        if (window.history.length > 2) {
          navigate(-1);
        } else {
          navigate(fallback ?? "/");
        }
      }}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 active:scale-[0.97]"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
