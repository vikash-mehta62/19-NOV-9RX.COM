/**
 * Lazy Loading Image Component
 * - Intersection Observer for lazy loading
 * - Blur placeholder while loading
 * - Error fallback
 * - Smooth fade-in animation
 */
import { useState, useRef, useEffect, memo } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  fallbackSrc?: string;
  aspectRatio?: "square" | "video" | "auto";
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImageComponent = ({
  src,
  alt,
  className,
  placeholderClassName,
  fallbackSrc = "/placeholder.svg",
  aspectRatio = "auto",
  onLoad,
  onError,
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "100px", // Start loading 100px before entering viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "",
  };

  return (
    <div
      ref={imgRef}
      className={cn(
        "relative overflow-hidden bg-gray-100",
        aspectClasses[aspectRatio],
        placeholderClassName
      )}
    >
      {/* Skeleton placeholder */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-shimmer"
          style={{
            backgroundSize: "200% 100%",
          }}
          aria-hidden="true"
        />
      )}

      {/* Actual image - only render when in view */}
      {isInView && (
        <img
          src={hasError ? fallbackSrc : src}
          alt={alt}
          className={cn(
            "transition-opacity duration-500 ease-out",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export const LazyImage = memo(LazyImageComponent);

// Add shimmer animation to global styles
const shimmerStyles = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.animate-shimmer {
  animation: shimmer 1.5s ease-in-out infinite;
}
`;

// Inject styles if not already present
if (typeof document !== "undefined") {
  const styleId = "lazy-image-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = shimmerStyles;
    document.head.appendChild(style);
  }
}
