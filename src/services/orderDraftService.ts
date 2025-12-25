/**
 * Order Draft Service
 * Saves and loads order wizard drafts to/from localStorage
 * Provides auto-save functionality and draft recovery
 */

const DRAFT_KEY_PREFIX = "order_draft_";
const DRAFT_LIST_KEY = "order_drafts_list";
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export interface OrderDraft {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  currentStep: number;
  data: {
    customer?: any;
    customerId?: string;
    billingAddress?: any;
    shippingAddress?: any;
    cartItems?: any[];
    paymentMethod?: string;
    specialInstructions?: string;
    poNumber?: string;
    appliedDiscounts?: any[];
    totalDiscount?: number;
  };
  isPharmacyMode: boolean;
  name?: string;
}

export interface DraftListItem {
  id: string;
  name: string;
  updatedAt: string;
  customerName?: string;
  itemCount: number;
  total: number;
}

/**
 * Generate a unique draft ID
 */
function generateDraftId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get the current user ID from session
 */
function getCurrentUserId(): string {
  return sessionStorage.getItem("userId") || "anonymous";
}

/**
 * Save a draft to localStorage
 */
export function saveDraft(
  data: OrderDraft["data"],
  currentStep: number,
  isPharmacyMode: boolean,
  draftId?: string,
  name?: string
): string {
  const userId = getCurrentUserId();
  const id = draftId || generateDraftId();
  const now = new Date().toISOString();

  const draft: OrderDraft = {
    id,
    userId,
    createdAt: draftId ? getDraft(draftId)?.createdAt || now : now,
    updatedAt: now,
    currentStep,
    data,
    isPharmacyMode,
    name: name || `Draft ${new Date().toLocaleDateString()}`,
  };

  // Save the draft
  localStorage.setItem(`${DRAFT_KEY_PREFIX}${id}`, JSON.stringify(draft));

  // Update the drafts list
  updateDraftsList(id, draft);

  console.log("📝 Draft saved:", id);
  return id;
}

/**
 * Load a draft from localStorage
 */
export function getDraft(draftId: string): OrderDraft | null {
  try {
    const data = localStorage.getItem(`${DRAFT_KEY_PREFIX}${draftId}`);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading draft:", error);
    return null;
  }
}

/**
 * Delete a draft from localStorage
 */
export function deleteDraft(draftId: string): boolean {
  try {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}${draftId}`);
    
    // Update the drafts list
    const list = getDraftsList();
    const updatedList = list.filter((item) => item.id !== draftId);
    localStorage.setItem(DRAFT_LIST_KEY, JSON.stringify(updatedList));
    
    console.log("🗑️ Draft deleted:", draftId);
    return true;
  } catch (error) {
    console.error("Error deleting draft:", error);
    return false;
  }
}

/**
 * Get list of all drafts for current user
 */
export function getDraftsList(): DraftListItem[] {
  try {
    const userId = getCurrentUserId();
    const data = localStorage.getItem(DRAFT_LIST_KEY);
    if (!data) return [];
    
    const list: DraftListItem[] = JSON.parse(data);
    
    // Filter by current user and validate each draft still exists
    return list.filter((item) => {
      const draft = getDraft(item.id);
      return draft && draft.userId === userId;
    });
  } catch (error) {
    console.error("Error loading drafts list:", error);
    return [];
  }
}

/**
 * Update the drafts list with a new/updated draft
 */
function updateDraftsList(draftId: string, draft: OrderDraft): void {
  const list = getDraftsList();
  
  // Calculate total from cart items
  const total = draft.data.cartItems?.reduce((sum, item) => {
    return sum + (item.price || 0);
  }, 0) || 0;

  const listItem: DraftListItem = {
    id: draftId,
    name: draft.name || `Draft ${new Date(draft.createdAt).toLocaleDateString()}`,
    updatedAt: draft.updatedAt,
    customerName: draft.data.customer?.name || draft.data.customer?.company_name,
    itemCount: draft.data.cartItems?.length || 0,
    total,
  };

  // Update or add the item
  const existingIndex = list.findIndex((item) => item.id === draftId);
  if (existingIndex >= 0) {
    list[existingIndex] = listItem;
  } else {
    list.unshift(listItem); // Add to beginning
  }

  // Keep only the last 10 drafts
  const trimmedList = list.slice(0, 10);
  
  localStorage.setItem(DRAFT_LIST_KEY, JSON.stringify(trimmedList));
}

/**
 * Get the most recent draft for current user
 */
export function getMostRecentDraft(): OrderDraft | null {
  const list = getDraftsList();
  if (list.length === 0) return null;
  
  // Sort by updatedAt descending
  const sorted = [...list].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  
  return getDraft(sorted[0].id);
}

/**
 * Check if there's a recent unsaved draft (within last 24 hours)
 */
export function hasRecentDraft(): boolean {
  const draft = getMostRecentDraft();
  if (!draft) return false;
  
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return new Date(draft.updatedAt).getTime() > dayAgo;
}

/**
 * Clear all drafts for current user
 */
export function clearAllDrafts(): void {
  const list = getDraftsList();
  list.forEach((item) => {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}${item.id}`);
  });
  localStorage.removeItem(DRAFT_LIST_KEY);
  console.log("🗑️ All drafts cleared");
}

/**
 * Auto-save hook for order wizard
 * Returns functions to start/stop auto-save and manually save
 */
export function createAutoSave(
  getData: () => OrderDraft["data"],
  getCurrentStep: () => number,
  isPharmacyMode: boolean
) {
  let intervalId: NodeJS.Timeout | null = null;
  let currentDraftId: string | null = null;

  const save = () => {
    const data = getData();
    const step = getCurrentStep();
    
    // Only save if there's meaningful data
    if (data.customer || data.billingAddress?.street || (data.cartItems && data.cartItems.length > 0)) {
      currentDraftId = saveDraft(data, step, isPharmacyMode, currentDraftId || undefined);
    }
  };

  const start = (existingDraftId?: string) => {
    if (existingDraftId) {
      currentDraftId = existingDraftId;
    }
    
    // Save immediately
    save();
    
    // Start interval
    intervalId = setInterval(save, AUTO_SAVE_INTERVAL);
    console.log("🔄 Auto-save started");
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    console.log("⏹️ Auto-save stopped");
  };

  const discard = () => {
    stop();
    if (currentDraftId) {
      deleteDraft(currentDraftId);
      currentDraftId = null;
    }
  };

  const getDraftId = () => currentDraftId;

  return {
    start,
    stop,
    save,
    discard,
    getDraftId,
  };
}

/**
 * Format draft date for display
 */
export function formatDraftDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  
  return date.toLocaleDateString();
}
