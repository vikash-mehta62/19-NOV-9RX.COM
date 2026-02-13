// =====================================================
// ENHANCEMENT FEATURES TYPES
// Week 7-8: Dark Mode, Dashboard, Search
// =====================================================

// =====================================================
// 1. THEME SYSTEM TYPES
// =====================================================

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeState {
  mode: ThemeMode;
  effectiveTheme: 'light' | 'dark';
}

export interface ThemeContextValue {
  theme: ThemeState;
  setTheme: (mode: ThemeMode) => Promise<void>;
  isLoading: boolean;
}

export interface UserPreference {
  id: string;
  user_id: string;
  theme: ThemeMode;
  language: string;
  timezone: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  dashboard_layout: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// =====================================================
// 2. DASHBOARD SYSTEM TYPES
// =====================================================

export type WidgetType = 'chart' | 'stat' | 'table' | 'list' | 'custom';

export interface DashboardWidget {
  id: string;
  widget_type: WidgetType;
  name: string;
  description: string | null;
  config_schema: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
}

export interface CustomDashboard {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  layout: DashboardLayout;
  is_default: boolean;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardLayout {
  i: string; // widget id
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export interface DashboardContextValue {
  dashboards: CustomDashboard[];
  currentDashboard: CustomDashboard | null;
  widgets: DashboardWidget[];
  layout: DashboardLayout[];
  createDashboard: (name: string, description?: string) => Promise<void>;
  deleteDashboard: (id: string) => Promise<void>;
  setDefaultDashboard: (id: string) => Promise<void>;
  switchDashboard: (id: string) => Promise<void>;
  addWidget: (widgetType: WidgetType, config: any) => Promise<void>;
  removeWidget: (widgetId: string) => Promise<void>;
  updateLayout: (newLayout: DashboardLayout[]) => Promise<void>;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  isLoading: boolean;
}

// =====================================================
// 3. SEARCH SYSTEM TYPES
// =====================================================

export type EntityType = 'products' | 'orders' | 'customers';

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in';

export type FilterLogic = 'AND' | 'OR';

export interface SearchFilter {
  field: string;
  operator: FilterOperator;
  value: any;
  logic?: FilterLogic;
}

export interface SearchResult {
  type: EntityType;
  id: string;
  title: string;
  subtitle: string;
  metadata: Record<string, any>;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  entity_type: EntityType;
  search_query: string | null;
  filters: SearchFilter[];
  is_favorite: boolean;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
}

export interface SearchHistory {
  id: string;
  user_id: string;
  search_query: string;
  entity_type: EntityType;
  result_count: number | null;
  created_at: string;
}

export interface SearchContextValue {
  isOpen: boolean;
  query: string;
  results: SearchResult[];
  filters: SearchFilter[];
  savedSearches: SavedSearch[];
  recentSearches: SearchHistory[];
  selectedEntityType: EntityType | 'all';
  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (query: string) => void;
  setEntityType: (type: EntityType | 'all') => void;
  addFilter: (filter: SearchFilter) => void;
  removeFilter: (index: number) => void;
  clearFilters: () => void;
  saveSearch: (name: string) => Promise<void>;
  loadSavedSearch: (searchId: string) => Promise<void>;
  deleteSavedSearch: (searchId: string) => Promise<void>;
  executeSearch: () => Promise<void>;
  isLoading: boolean;
}

// =====================================================
// 4. UTILITY TYPES
// =====================================================

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
