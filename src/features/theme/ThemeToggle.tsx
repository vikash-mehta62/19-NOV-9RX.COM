import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { ThemeMode } from '@/types/enhancement-features';

export function ThemeToggle() {
  const { theme, setTheme, isLoading } = useTheme();

  const handleThemeChange = async (mode: ThemeMode) => {
    await setTheme(mode);
  };

  const themeOptions: { mode: ThemeMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
    { mode: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
    { mode: 'auto', icon: <Monitor className="w-4 h-4" />, label: 'Auto' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse">
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors">
      {themeOptions.map(({ mode, icon, label }) => (
        <button
          key={mode}
          onClick={() => handleThemeChange(mode)}
          className={`
            flex items-center justify-center
            w-8 h-8 rounded
            transition-all duration-200
            ${
              theme.mode === mode
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }
          `}
          title={label}
          aria-label={`Switch to ${label} theme`}
          aria-pressed={theme.mode === mode}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

// Mobile-optimized version with labels
export function ThemeToggleMobile() {
  const { theme, setTheme, isLoading } = useTheme();

  const handleThemeChange = async (mode: ThemeMode) => {
    await setTheme(mode);
  };

  const themeOptions: { mode: ThemeMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'light', icon: <Sun className="w-5 h-5" />, label: 'Light' },
    { mode: 'dark', icon: <Moon className="w-5 h-5" />, label: 'Dark' },
    { mode: 'auto', icon: <Monitor className="w-5 h-5" />, label: 'Auto' },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse">
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="flex gap-2">
          <div className="flex-1 h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="flex-1 h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="flex-1 h-12 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Theme
      </label>
      <div className="flex gap-2">
        {themeOptions.map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => handleThemeChange(mode)}
            className={`
              flex-1 flex flex-col items-center justify-center gap-2
              p-3 rounded-lg
              transition-all duration-200
              ${
                theme.mode === mode
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-2 border-blue-500'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
            aria-label={`Switch to ${label} theme`}
            aria-pressed={theme.mode === mode}
          >
            {icon}
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
