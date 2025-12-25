/**
 * Micro-Interactions Components
 * Reusable animation components for better UX feedback
 */
import { useState, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Check, ShoppingCart, Sparkles, Heart } from "lucide-react";

// ============================================
// CART ADD ANIMATION
// ============================================
interface CartAddAnimationProps {
  isActive: boolean;
  onComplete?: () => void;
  children: ReactNode;
}

export function CartAddAnimation({ isActive, onComplete, children }: CartAddAnimationProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isActive) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
        onComplete?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  return (
    <div className="relative">
      {children}
      
      {/* Success overlay */}
      {showSuccess && (
        <div className="absolute inset-0 flex items-center justify-center bg-emerald-500 rounded-xl animate-cart-success z-10">
          <div className="flex items-center gap-2 text-white font-medium">
            <Check className="w-5 h-5 animate-bounce-in" />
            <span className="animate-fade-in">Added!</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// PULSE ON HOVER
// ============================================
interface PulseOnHoverProps {
  children: ReactNode;
  className?: string;
}

export function PulseOnHover({ children, className }: PulseOnHoverProps) {
  return (
    <div className={cn("group relative", className)}>
      <div className="absolute inset-0 bg-emerald-500/20 rounded-xl opacity-0 group-hover:opacity-100 group-hover:animate-pulse-once transition-opacity" />
      {children}
    </div>
  );
}

// ============================================
// SCALE ON TAP
// ============================================
interface ScaleOnTapProps {
  children: ReactNode;
  className?: string;
  scale?: number;
}

export function ScaleOnTap({ children, className, scale = 0.95 }: ScaleOnTapProps) {
  return (
    <div 
      className={cn(
        "transition-transform duration-150 active:scale-[var(--scale)]",
        className
      )}
      style={{ "--scale": scale } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

// ============================================
// RIPPLE EFFECT
// ============================================
interface RippleProps {
  className?: string;
}

export function useRipple() {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const addRipple = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  };

  const RippleContainer = ({ className }: RippleProps) => (
    <span className={cn("absolute inset-0 overflow-hidden rounded-inherit pointer-events-none", className)}>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </span>
  );

  return { addRipple, RippleContainer };
}

// ============================================
// SUCCESS CHECKMARK
// ============================================
interface SuccessCheckmarkProps {
  show: boolean;
  size?: "sm" | "md" | "lg";
}

export function SuccessCheckmark({ show, size = "md" }: SuccessCheckmarkProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  if (!show) return null;

  return (
    <div className={cn("relative", sizeClasses[size])}>
      <svg className="w-full h-full" viewBox="0 0 52 52">
        <circle
          className="stroke-emerald-500 fill-none animate-circle-draw"
          cx="26"
          cy="26"
          r="24"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          className="stroke-emerald-500 fill-none animate-check-draw"
          d="M14 27l7 7 16-16"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ============================================
// CONFETTI BURST (for order success)
// ============================================
interface ConfettiBurstProps {
  isActive: boolean;
  particleCount?: number;
}

export function ConfettiBurst({ isActive, particleCount = 30 }: ConfettiBurstProps) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
    rotation: number;
    scale: number;
  }>>([]);

  useEffect(() => {
    if (isActive) {
      const colors = ["#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6"];
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => setParticles([]), 2000);
      return () => clearTimeout(timer);
    }
  }, [isActive, particleCount]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-3 h-3 animate-confetti"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
            animationDelay: `${Math.random() * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// HEART LIKE ANIMATION
// ============================================
interface HeartLikeProps {
  isLiked: boolean;
  onToggle: () => void;
  className?: string;
}

export function HeartLike({ isLiked, onToggle, className }: HeartLikeProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (!isLiked) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
    }
    onToggle();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative p-2 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center",
        isLiked ? "text-red-500" : "text-gray-400 hover:text-red-400",
        className
      )}
      aria-label={isLiked ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={isLiked}
    >
      <Heart
        className={cn(
          "w-6 h-6 transition-transform",
          isLiked && "fill-current",
          isAnimating && "animate-heart-pop"
        )}
      />
      {isAnimating && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="absolute w-8 h-8 bg-red-500/20 rounded-full animate-ping" />
        </span>
      )}
    </button>
  );
}

// ============================================
// NUMBER COUNTER ANIMATION
// ============================================
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1000,
  prefix = "",
  suffix = "",
  className,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const diff = value - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + diff * easeOut;
      
      setDisplayValue(Math.round(current * 100) / 100);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

// ============================================
// SKELETON PULSE
// ============================================
interface SkeletonPulseProps {
  className?: string;
  children?: ReactNode;
}

export function SkeletonPulse({ className, children }: SkeletonPulseProps) {
  return (
    <div className={cn("animate-pulse bg-gray-200 rounded", className)}>
      {children}
    </div>
  );
}

// ============================================
// GLOBAL ANIMATION STYLES
// ============================================
const animationStyles = `
@keyframes cart-success {
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes bounce-in {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-once {
  0%, 100% { opacity: 0; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

@keyframes ripple {
  0% { width: 0; height: 0; opacity: 0.5; }
  100% { width: 200px; height: 200px; opacity: 0; }
}

@keyframes circle-draw {
  0% { stroke-dasharray: 0 150; stroke-dashoffset: 0; }
  100% { stroke-dasharray: 150 150; stroke-dashoffset: 0; }
}

@keyframes check-draw {
  0% { stroke-dasharray: 0 50; stroke-dashoffset: 0; }
  100% { stroke-dasharray: 50 50; stroke-dashoffset: 0; }
}

@keyframes confetti {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

@keyframes heart-pop {
  0% { transform: scale(1); }
  25% { transform: scale(1.3); }
  50% { transform: scale(0.9); }
  100% { transform: scale(1); }
}

.animate-cart-success { animation: cart-success 0.3s ease-out forwards; }
.animate-bounce-in { animation: bounce-in 0.4s ease-out forwards; }
.animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
.animate-pulse-once { animation: pulse-once 0.6s ease-out; }
.animate-ripple { animation: ripple 0.6s ease-out forwards; }
.animate-circle-draw { animation: circle-draw 0.6s ease-out forwards; stroke-dasharray: 0 150; }
.animate-check-draw { animation: check-draw 0.3s ease-out 0.4s forwards; stroke-dasharray: 0 50; }
.animate-confetti { animation: confetti 2s ease-out forwards; }
.animate-heart-pop { animation: heart-pop 0.4s ease-out; }
`;

// Inject animation styles
if (typeof document !== "undefined") {
  const styleId = "micro-interaction-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = animationStyles;
    document.head.appendChild(style);
  }
}
