import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface EmptyStateProps {
  emoji: string;
  title: string;
  description: string;
  actionLabel?: string | null;
  actionHref?: string | null;
  onAction?: () => void;
}

export default function EmptyState({ emoji, title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-card p-10 flex flex-col items-center text-center">
      <span className="text-[40px] leading-none mb-4" role="img">{emoji}</span>
      <h3 className="font-syne text-lg font-bold text-foreground mb-1.5">{title}</h3>
      <p className="text-[13px] text-muted-foreground max-w-xs mb-5">{description}</p>
      {actionLabel && (actionHref || onAction) && (
        actionHref ? (
          <Link to={actionHref}>
            <Button
              size="sm"
              className="h-9 text-xs font-semibold active:scale-[0.97] transition-transform bg-primary text-primary-foreground"
            >
              {actionLabel} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        ) : (
          <Button
            size="sm"
            onClick={onAction}
            className="h-9 text-xs font-semibold active:scale-[0.97] transition-transform bg-primary text-primary-foreground"
          >
            {actionLabel} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        )
      )}
    </div>
  );
}
