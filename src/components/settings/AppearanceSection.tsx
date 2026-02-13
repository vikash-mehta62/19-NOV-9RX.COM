import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/features/theme";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppearanceSection() {
  const { theme, setTheme, isLoading } = useTheme();

  const themeOptions = [
    {
      value: 'light' as const,
      label: 'Light',
      description: 'Light theme for daytime use',
      icon: Sun,
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      description: 'Dark theme for nighttime use',
      icon: Moon,
    },
    {
      value: 'auto' as const,
      label: 'Auto',
      description: 'Follows your system preference',
      icon: Monitor,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize how the application looks and feels
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Selection */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-1">Theme</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Select your preferred theme or let it follow your system settings
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme.mode === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  disabled={isLoading}
                  className={`
                    relative flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all
                    ${isSelected
                      ? 'border-teal-600 bg-teal-50 dark:bg-teal-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-teal-600 flex items-center justify-center">
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  <div className={`
                    p-3 rounded-full
                    ${isSelected
                      ? 'bg-teal-100 dark:bg-teal-900'
                      : 'bg-gray-100 dark:bg-gray-800'
                    }
                  `}>
                    <Icon className={`h-6 w-6 ${isSelected ? 'text-teal-600' : 'text-gray-600 dark:text-gray-400'}`} />
                  </div>

                  <div className="text-center">
                    <p className={`font-medium ${isSelected ? 'text-teal-600' : 'text-gray-900 dark:text-white'}`}>
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Current Theme Info */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Current Theme
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {theme.mode === 'auto'
                    ? `Auto (currently ${theme.effectiveTheme})`
                    : theme.effectiveTheme.charAt(0).toUpperCase() + theme.effectiveTheme.slice(1)
                  }
                </p>
              </div>
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="h-4 w-4 border-2 border-gray-300 border-t-teal-600 rounded-full animate-spin" />
                  Saving...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium mb-2">About Themes</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Your theme preference is saved and synced across devices</li>
            <li>• Auto mode switches between light and dark based on your system settings</li>
            <li>• Theme changes apply instantly across the entire application</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
