import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Section({ title, description, actions, children, className, noPadding }: SectionProps) {
  return (
    <div className={cn("rounded-md border bg-card", className)} data-testid="section">
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 flex-wrap border-b px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-medium">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
      )}
      <div className={cn(!noPadding && "p-4")}>
        {children}
      </div>
    </div>
  );
}
