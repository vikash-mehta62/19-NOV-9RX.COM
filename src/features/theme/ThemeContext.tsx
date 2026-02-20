import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ThemeMode, ThemeState, ThemeContextValue } from '@/types/enhancement-features';
import { getStorageItem, setStorageItem } from '@/utils/storage';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'app-theme-preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeState>({
    mode: 'light',
    effectiveTheme: 'light',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Detect system theme preference
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // Calculate effective theme based on mode
  const calculateEffectiveTheme = useCallback((mode: ThemeMode): 'light' | 'dark' => {
    if (mode === 'auto') {
      return getSystemTheme();
    }
    return mode;
  }, [getSystemTheme]);

  // Apply theme to document
  const applyTheme = useCallback((effectiveTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(effectiveTheme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        effectiveTheme === 'dark' ? '#1a1a1a' : '#ffffff'
      );
    }
  }, []);

  // Load theme preference from Supabase
  const loadThemePreference = useCallback(async (): Promise<ThemeMode> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Not authenticated, use localStorage
        const stored = getStorageItem<{ mode: ThemeMode }>(THEME_STORAGE_KEY);
        return stored?.mode || 'light';
      }

      // Load from Supabase
      const { data, error } = await supabase
        .from('user_preferences')
        .select('theme')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) {
        // No preference found, use localStorage fallback
        const stored = getStorageItem<{ mode: ThemeMode }>(THEME_STORAGE_KEY);
        return stored?.mode || 'light';
      }

      return data.theme as ThemeMode;
    } catch (error) {
      console.error('Error loading theme preference:', error);
      // Fallback to localStorage
      const stored = getStorageItem<{ mode: ThemeMode }>(THEME_STORAGE_KEY);
      return stored?.mode || 'light';
    }
  }, []);

  // Save theme preference to Supabase
  const saveThemePreference = useCallback(async (mode: ThemeMode): Promise<void> => {
    try {
      // Always save to localStorage first (optimistic update)
      setStorageItem(THEME_STORAGE_KEY, { mode });

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Not authenticated, localStorage is enough
        return;
      }

      // Save to Supabase
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          theme: mode,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error saving theme preference:', error);
        // Don't throw - localStorage update already succeeded
      }
    } catch (error) {
      console.error('Error saving theme preference:', error);
      // Don't throw - localStorage update already succeeded
    }
  }, []);

  // Set theme with persistence
  const setTheme = useCallback(async (mode: ThemeMode): Promise<void> => {
    const effectiveTheme = calculateEffectiveTheme(mode);
    
    // Optimistic update
    setThemeState({ mode, effectiveTheme });
    applyTheme(effectiveTheme);
    
    // Persist to storage
    await saveThemePreference(mode);
  }, [calculateEffectiveTheme, applyTheme, saveThemePreference]);

  // Initialize theme on mount
  useEffect(() => {
    const initTheme = async () => {
      setIsLoading(true);
      const mode = await loadThemePreference();
      const effectiveTheme = calculateEffectiveTheme(mode);
      
      setThemeState({ mode, effectiveTheme });
      applyTheme(effectiveTheme);
      setIsLoading(false);
    };

    initTheme();
  }, [loadThemePreference, calculateEffectiveTheme, applyTheme]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (theme.mode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const newEffectiveTheme = e.matches ? 'dark' : 'light';
      setThemeState(prev => ({ ...prev, effectiveTheme: newEffectiveTheme }));
      applyTheme(newEffectiveTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme.mode, applyTheme]);

  const value: ThemeContextValue = {
    theme,
    setTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
