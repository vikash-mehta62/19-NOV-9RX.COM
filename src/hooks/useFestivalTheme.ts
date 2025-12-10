import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isWithinInterval, parseISO } from "date-fns";

export interface FestivalTheme {
  id: string;
  name: string;
  slug: string;
  description: string;
  start_date: string;
  end_date: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  icon: string;
  banner_image_url: string;
  banner_text: string;
  effects: string[];
  is_active: boolean;
  auto_activate: boolean;
  priority: number;
}

export function useFestivalTheme() {
  const [activeTheme, setActiveTheme] = useState<FestivalTheme | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveTheme = useCallback(async () => {
    try {
      const today = new Date();
      
      // First check for manually activated themes
      const { data: manualThemes, error: manualError } = await supabase
        .from("festival_themes")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .limit(1);

      if (manualError) throw manualError;

      if (manualThemes && manualThemes.length > 0) {
        setActiveTheme(manualThemes[0]);
        return;
      }

      // Then check for auto-activate themes within date range
      const { data: autoThemes, error: autoError } = await supabase
        .from("festival_themes")
        .select("*")
        .eq("auto_activate", true)
        .order("priority", { ascending: false });

      if (autoError) throw autoError;

      if (autoThemes) {
        const currentTheme = autoThemes.find((theme) =>
          isWithinInterval(today, {
            start: parseISO(theme.start_date),
            end: parseISO(theme.end_date),
          })
        );
        setActiveTheme(currentTheme || null);
      }
    } catch (error) {
      console.error("Error fetching festival theme:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveTheme();

    // Subscribe to changes
    const channel = supabase
      .channel("festival_themes_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "festival_themes" },
        () => {
          fetchActiveTheme();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActiveTheme]);

  return { activeTheme, loading, refetch: fetchActiveTheme };
}

// CSS variables generator for theme
export function getThemeCSSVariables(theme: FestivalTheme | null) {
  if (!theme) return {};
  
  return {
    "--festival-primary": theme.primary_color,
    "--festival-secondary": theme.secondary_color,
    "--festival-accent": theme.accent_color,
    "--festival-background": theme.background_color,
    "--festival-text": theme.text_color,
  } as React.CSSProperties;
}
