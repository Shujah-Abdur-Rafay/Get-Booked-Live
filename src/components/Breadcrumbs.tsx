import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; to?: string };

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 flex-wrap">
      {items.map((crumb, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="inline-flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3 shrink-0 opacity-40" />}
            {isLast || !crumb.to ? (
              <span className={isLast ? "text-foreground font-medium" : ""}>{crumb.label}</span>
            ) : (
              <Link to={crumb.to} className="hover:text-foreground transition-colors">{crumb.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
