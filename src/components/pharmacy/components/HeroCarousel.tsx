"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Truck, Percent, Package, Clock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Slide {
  id: number
  title: string
  subtitle: string
  badge: string
  gradient: string
  icon: React.ReactNode
  cta: string
}

const slides: Slide[] = [
  {
    id: 1,
    title: "Free Delivery on All Orders",
    subtitle: "No minimum order required. Fast & reliable shipping to your pharmacy.",
    badge: "🚚 FREE SHIPPING",
    gradient: "from-emerald-600 via-teal-500 to-cyan-500",
    icon: <Truck className="w-16 h-16 text-white/80" />,
    cta: "Shop Now"
  },
  {
    id: 2,
    title: "Bulk Discounts Available",
    subtitle: "Save up to 25% when you order in bulk. Perfect for stocking up!",
    badge: "💰 SAVE MORE",
    gradient: "from-purple-600 via-violet-500 to-indigo-500",
    icon: <Percent className="w-16 h-16 text-white/80" />,
    cta: "View Deals"
  },
  {
    id: 3,
    title: "New Products Added Weekly",
    subtitle: "Discover the latest pharmacy supplies and equipment.",
    badge: "✨ NEW ARRIVALS",
    gradient: "from-rose-500 via-pink-500 to-orange-400",
    icon: <Sparkles className="w-16 h-16 text-white/80" />,
    cta: "Explore"
  },
  {
    id: 4,
    title: "Same Day Processing",
    subtitle: "Orders placed before 2 PM are processed the same day.",
    badge: "⚡ FAST SERVICE",
    gradient: "from-blue-600 via-indigo-500 to-purple-500",
    icon: <Clock className="w-16 h-16 text-white/80" />,
    cta: "Order Now"
  }
]


export const HeroCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [isAutoPlaying])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const nextSlide = () => goToSlide((currentSlide + 1) % slides.length)
  const prevSlide = () => goToSlide((currentSlide - 1 + slides.length) % slides.length)

  const slide = slides[currentSlide]

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-xl">
      {/* Main Slide */}
      <div className={`bg-gradient-to-r ${slide.gradient} p-6 md:p-8 transition-all duration-500`}>
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
        
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Content */}
          <div className="flex-1 text-center md:text-left">
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full mb-4">
              {slide.badge}
            </span>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight">
              {slide.title}
            </h2>
            <p className="text-white/80 text-sm md:text-base mb-6 max-w-md">
              {slide.subtitle}
            </p>
            <Button className="bg-white text-gray-900 hover:bg-gray-100 font-semibold px-6 shadow-lg">
              {slide.cta}
            </Button>
          </div>
          
          {/* Icon */}
          <div className="hidden md:flex items-center justify-center w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm">
            {slide.icon}
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dots Indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSlide ? "bg-white w-6" : "bg-white/50 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export default HeroCarousel
