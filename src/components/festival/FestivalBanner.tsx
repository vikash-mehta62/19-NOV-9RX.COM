import { useFestivalTheme } from "@/hooks/useFestivalTheme";
import { X } from "lucide-react";
import { useState, useEffect } from "react";

interface FestivalBannerProps {
  dismissible?: boolean;
  position?: "top" | "inline";
}

export function FestivalBanner({ dismissible = true, position = "top" }: FestivalBannerProps) {
  const { activeTheme, loading } = useFestivalTheme();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed for this theme
    if (activeTheme) {
      try {
        const dismissedTheme = localStorage.getItem("dismissedFestivalBanner");
        if (dismissedTheme === activeTheme.slug) {
          setDismissed(true);
        } else {
          setDismissed(false);
        }
      } catch (error) {
        // localStorage unavailable, default to showing banner
        setDismissed(false);
      }
    }
  }, [activeTheme]);
  const handleDismiss = () => {
    if (activeTheme) {
      localStorage.setItem("dismissedFestivalBanner", activeTheme.slug);
      setDismissed(true);
    }
  };

  if (loading || !activeTheme || dismissed) return null;

  const bannerStyle = {
    background: `linear-gradient(135deg, ${activeTheme.primary_color}, ${activeTheme.secondary_color})`,
    color: activeTheme.text_color === "#000000" ? "#ffffff" : activeTheme.text_color,
  };

  return (
    <div
      className={`relative overflow-hidden ${
        position === "top" ? "w-full" : "rounded-lg"
      }`}
      style={bannerStyle}
    >
      {/* Animated background effects */}
      <FestivalEffects effects={activeTheme.effects} />

      <div className="relative z-10 px-4 py-3 flex items-center justify-center gap-3">
        <span className="text-2xl animate-bounce">{activeTheme.icon}</span>
        <span className="font-medium text-center">
          {activeTheme.banner_text || `${activeTheme.name} - Special Offers!`}
        </span>
        <span className="text-2xl animate-bounce">{activeTheme.icon}</span>

        {dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Festival Effects Component
function FestivalEffects({ effects }: { effects: string[] }) {
  if (!effects || effects.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {effects.includes("snowflakes") && <SnowflakesEffect />}
      {effects.includes("confetti") && <ConfettiEffect />}
      {effects.includes("hearts") && <HeartsEffect />}
      {effects.includes("stars") && <StarsEffect />}
      {effects.includes("leaves") && <LeavesEffect />}
    </div>
  );
}

// Snowflakes Effect
function SnowflakesEffect() {
  return (
    <div className="absolute inset-0">
      {[...Array(20)].map((_, i) => (
        <span
          key={i}
          className="absolute text-white/60 animate-fall"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            fontSize: `${8 + Math.random() * 12}px`,
          }}
        >
          ❄
        </span>
      ))}
    </div>
  );
}

// Confetti Effect
function ConfettiEffect() {
  const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"];
  return (
    <div className="absolute inset-0">
      {[...Array(30)].map((_, i) => (
        <span
          key={i}
          className="absolute w-2 h-2 animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  );
}

// Hearts Effect
function HeartsEffect() {
  return (
    <div className="absolute inset-0">
      {[...Array(15)].map((_, i) => (
        <span
          key={i}
          className="absolute text-pink-400/60 animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: `-20px`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${4 + Math.random() * 4}s`,
            fontSize: `${12 + Math.random() * 16}px`,
          }}
        >
          ❤
        </span>
      ))}
    </div>
  );
}

// Stars Effect
function StarsEffect() {
  return (
    <div className="absolute inset-0">
      {[...Array(20)].map((_, i) => (
        <span
          key={i}
          className="absolute text-yellow-300/70 animate-twinkle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            fontSize: `${8 + Math.random() * 10}px`,
          }}
        >
          ⭐
        </span>
      ))}
    </div>
  );
}

// Falling Leaves Effect
function LeavesEffect() {
  const leaves = ["🍂", "🍁", "🍃"];
  return (
    <div className="absolute inset-0">
      {[...Array(15)].map((_, i) => (
        <span
          key={i}
          className="absolute animate-fall-rotate"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${4 + Math.random() * 4}s`,
            fontSize: `${14 + Math.random() * 10}px`,
          }}
        >
          {leaves[Math.floor(Math.random() * leaves.length)]}
        </span>
      ))}
    </div>
  );
}

export default FestivalBanner;
