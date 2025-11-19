export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}