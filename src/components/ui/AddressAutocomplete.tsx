/**
 * Address Autocomplete Component
 * Uses browser's native autocomplete with enhanced UX
 * Falls back gracefully when Google Places API is not available
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AddressComponents {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country?: string;
}

interface AddressAutocompleteProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (address: AddressComponents) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
  disabled?: boolean;
}

// US States for validation and autocomplete
const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

export function AddressAutocomplete({
  id,
  label,
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing an address...",
  required = false,
  error,
  className,
  disabled = false,
}: AddressAutocompleteProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Simple address suggestions based on common patterns
  const generateSuggestions = useCallback((input: string) => {
    if (input.length < 3) {
      setSuggestions([]);
      return;
    }

    // This is a placeholder - in production, you'd integrate with Google Places API
    // For now, we provide helpful formatting hints
    const hints: string[] = [];
    
    // Check if input looks like a street address
    const hasNumber = /^\d+/.test(input);
    if (hasNumber && !input.includes(",")) {
      hints.push(`${input}, City, State ZIP`);
    }

    setSuggestions(hints);
  }, []);

  // Debounced input handler
  useEffect(() => {
    const timer = setTimeout(() => {
      generateSuggestions(value);
    }, 300);

    return () => clearTimeout(timer);
  }, [value, generateSuggestions]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);

    // Try to parse the address
    const parsed = parseAddress(suggestion);
    if (parsed && onAddressSelect) {
      onAddressSelect(parsed);
    }
  };

  // Simple address parser
  const parseAddress = (address: string): AddressComponents | null => {
    // Try to parse "Street, City, State ZIP" format
    const parts = address.split(",").map((p) => p.trim());
    
    if (parts.length >= 3) {
      const street = parts[0];
      const city = parts[1];
      const stateZip = parts[2].split(" ");
      
      if (stateZip.length >= 2) {
        const state = stateZip[0];
        const zip_code = stateZip.slice(1).join(" ");
        
        return { street, city, state, zip_code };
      }
    }
    
    return null;
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("space-y-2 relative", className)}>
      <Label htmlFor={id} className="flex items-center gap-1">
        <MapPin className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="street-address"
          className={cn(
            "pr-10 min-h-[44px]",
            error && "border-red-500 focus-visible:ring-red-500"
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-autocomplete="list"
          aria-controls={`${id}-suggestions`}
          aria-expanded={showSuggestions && suggestions.length > 0}
        />
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="w-4 h-4" aria-hidden="true" />
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            id={`${id}-suggestions`}
            role="listbox"
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                className={cn(
                  "w-full px-4 py-3 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors",
                  index === selectedIndex && "bg-emerald-50 text-emerald-700",
                  index === 0 && "rounded-t-xl",
                  index === suggestions.length - 1 && "rounded-b-xl"
                )}
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
                  <span>{suggestion}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p id={`${id}-error`} className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      {/* Helper text */}
      <p className="text-xs text-gray-500">
        Enter address in format: Street, City, State ZIP
      </p>
    </div>
  );
}

/**
 * State Select Component
 * Dropdown for US states with search
 */
interface StateSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function StateSelect({
  id,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
}: StateSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        State {required && <span className="text-red-500">*</span>}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500"
        )}
        aria-invalid={!!error}
      >
        <option value="">Select state...</option>
        {Object.entries(US_STATES).map(([abbr, name]) => (
          <option key={abbr} value={abbr}>
            {name} ({abbr})
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export { US_STATES };
