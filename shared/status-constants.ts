export const ENTITY_STATUSES = ["NEW", "SCHEDULED", "COMPLETED", "NOT_CONNECTED"] as const;
export type EntityStatus = typeof ENTITY_STATUSES[number];

export const STATUS_DB_MAP: Record<string, string> = {
  NEW: "NEW",
  SCHEDULED: "SCHEDULED",
  COMPLETED: "CONNECTED",
  NOT_CONNECTED: "NOT_COMPLETED",
};

export const DB_STATUS_TO_DISPLAY: Record<string, string> = {
  NEW: "NEW",
  SCHEDULED: "SCHEDULED",
  CONNECTED: "COMPLETED",
  ACTIVE: "COMPLETED",
  IN_PROGRESS: "SCHEDULED",
  NO_RESPONSE: "NOT_CONNECTED",
  NEEDS_PRAYER: "NOT_CONNECTED",
  REFERRED: "NOT_CONNECTED",
  NOT_COMPLETED: "NOT_CONNECTED",
  NEVER_CONTACTED: "NOT_CONNECTED",
  INACTIVE: "NOT_CONNECTED",
};

export const OUTCOME_TO_STATUS: Record<string, string> = {
  CONNECTED: "CONNECTED",
  NO_RESPONSE: "NOT_COMPLETED",
  NEEDS_FOLLOWUP: "SCHEDULED",
  NEEDS_PRAYER: "NOT_COMPLETED",
  REFERRED: "NOT_COMPLETED",
  SCHEDULED_VISIT: "SCHEDULED",
  NOT_COMPLETED: "NOT_COMPLETED",
  OTHER: "NOT_COMPLETED",
};

export const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-muted text-muted-foreground border-muted",
  SCHEDULED: "bg-primary/10 text-primary border-primary/20",
  CONNECTED: "bg-success/10 text-success border-success/20",
  NOT_COMPLETED: "bg-coral/10 text-coral border-coral/20",
  COMPLETED: "bg-success/10 text-success border-success/20",
  NOT_CONNECTED: "bg-coral/10 text-coral border-coral/20",
};

export const STATUS_DISPLAY_LABELS: Record<string, string> = {
  NEW: "statusLabels.new",
  SCHEDULED: "statusLabels.scheduled",
  COMPLETED: "statusLabels.completed",
  NOT_CONNECTED: "statusLabels.notConnected",
  CONNECTED: "statusLabels.completed",
  NOT_COMPLETED: "statusLabels.notConnected",
};

export const EXPORT_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  SCHEDULED: "Scheduled",
  CONNECTED: "Completed",
  NOT_COMPLETED: "Not Connected",
  ACTIVE: "Completed",
  IN_PROGRESS: "Scheduled",
  NO_RESPONSE: "Not Connected",
  NEEDS_PRAYER: "Not Connected",
  REFERRED: "Not Connected",
  NEVER_CONTACTED: "Not Connected",
  INACTIVE: "Not Connected",
};
