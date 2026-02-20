import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap" data-testid="page-header">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="page-title">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground" data-testid="page-description">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap" data-testid="page-actions">
          {actions}
        </div>
      )}
    </div>
  );
}
