/**
 * Storage utility functions
 * Provides safe localStorage access with fallback handling
 */

/**
 * Safely get an item from localStorage
 * Returns null if localStorage is unavailable or item doesn't exist
 */
export function getStorageItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return null;
  }
}

/**
 * Safely set an item in localStorage
 * Returns true if successful, false otherwise
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Safely remove an item from localStorage
 * Returns true if successful, false otherwise
 */
export function removeStorageItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all items from localStorage
 */
export function clearStorage(): boolean {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
}
