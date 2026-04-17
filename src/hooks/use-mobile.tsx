import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024
const LAPTOP_BREAKPOINT = 1280

export function useIsMobile() {
  return useIsMobileBreakpoint(MOBILE_BREAKPOINT)
}

export function useIsMobileBreakpoint(breakpoint: number) {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < breakpoint)
    return () => mql.removeEventListener("change", onChange)
  }, [breakpoint])

  return !!isMobile
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const onChange = () => {
      const width = window.innerWidth
      setIsTablet(width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT)
    }
    window.addEventListener("resize", onChange)
    onChange()
    return () => window.removeEventListener("resize", onChange)
  }, [])

  return !!isTablet
}

export function useScreenSize() {
  const [screenSize, setScreenSize] = React.useState<'mobile' | 'tablet' | 'laptop' | 'desktop'>('desktop')

  React.useEffect(() => {
    const onChange = () => {
      const width = window.innerWidth
      if (width < MOBILE_BREAKPOINT) {
        setScreenSize('mobile')
      } else if (width < TABLET_BREAKPOINT) {
        setScreenSize('tablet')
      } else if (width < LAPTOP_BREAKPOINT) {
        setScreenSize('laptop')
      } else {
        setScreenSize('desktop')
      }
    }
    window.addEventListener("resize", onChange)
    onChange()
    return () => window.removeEventListener("resize", onChange)
  }, [])

  return screenSize
}
