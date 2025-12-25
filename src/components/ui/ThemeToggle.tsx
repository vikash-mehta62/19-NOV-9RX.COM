/**
 * Theme Toggle Component
 * Button to toggle between light/dark/system themes
 * Works with next-themes provider
 */
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  variant?: "default" | "icon" | "dropdown";
  className?: string;
}

export function ThemeToggle({ variant = "dropdown", className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("min-h-[44px] min-w-[44px] rounded-xl", className)}
        disabled
      >
        <Sun className="h-5 w-5 text-gray-400" />
      </Button>
    );
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  };

  // Simple icon toggle (light/dark only)
  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className={cn("min-h-[44px] min-w-[44px] rounded-xl", className)}
        aria-label={`Switch to ${resolvedTheme === "light" ? "dark" : "light"} mode`}
      >
        {resolvedTheme === "light" ? (
          <Moon className="h-5 w-5 text-gray-600 hover:text-gray-900 transition-colors" />
        ) : (
          <Sun className="h-5 w-5 text-yellow-500 hover:text-yellow-400 transition-colors" />
        )}
      </Button>
    );
  }

  // Dropdown with all options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("min-h-[44px] min-w-[44px] rounded-xl", className)}
          aria-label="Toggle theme"
        >
          {resolvedTheme === "light" ? (
            <Sun className="h-5 w-5 text-amber-500" />
          ) : (
            <Moon className="h-5 w-5 text-blue-400" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={cn(
            "flex items-center gap-2 cursor-pointer",
            theme === "light" && "bg-emerald-50 text-emerald-700"
          )}
        >
          <Sun className="h-4 w-4" />
          <span>Light</span>
          {theme === "light" && (
            <span className="ml-auto text-emerald-600">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={cn(
            "flex items-center gap-2 cursor-pointer",
            theme === "dark" && "bg-emerald-50 text-emerald-700"
          )}
        >
          <Moon className="h-4 w-4" />
          <span>Dark</span>
          {theme === "dark" && (
            <span className="ml-auto text-emerald-600">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={cn(
            "flex items-center gap-2 cursor-pointer",
            theme === "system" && "bg-emerald-50 text-emerald-700"
          )}
        >
          <Monitor className="h-4 w-4" />
          <span>System</span>
          {theme === "system" && (
            <span className="ml-auto text-emerald-600">✓</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Theme Toggle with Label
 * For settings pages
 */
interface ThemeToggleWithLabelProps {
  className?: string;
}

export function ThemeToggleWithLabel({ className }: ThemeToggleWithLabelProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  if (!mounted) {
    return (
      <div className={cn("space-y-2", className)}>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Theme
        </label>
        <div className="flex gap-2">
          {options.map((option) => (
            <div
              key={option.value}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 min-h-[44px] opacity-50"
            >
              <option.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{option.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Theme
      </label>
      <div className="flex gap-2">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = theme === option.value;
          
          return (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all min-h-[44px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                isSelected
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "border-gray-200 hover:border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600"
              )}
              aria-pressed={isSelected}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
