/**
 * 9RX Design System v2.0 - Comprehensive UI/UX Standards
 * 
 * This design system ensures consistency, accessibility, and responsiveness
 * across all devices: mobile (320px-425px), tablet (768px), laptop (1024px-1440px),
 * desktop (1920px+), and large screens.
 * 
 * Key Principles:
 * - Mobile-first responsive design
 * - WCAG 2.1 AA accessibility compliance
 * - Consistent spacing, typography, and colors
 * - Touch-friendly targets (minimum 44px)
 * - Performance-optimized animations
 */

// ============================================
// BREAKPOINTS - Mobile-first approach
// ============================================
export const breakpoints = {
  xs: '320px',   // Small mobile
  sm: '375px',   // Mobile
  md: '425px',   // Large mobile
  lg: '768px',   // Tablet
  xl: '1024px',  // Laptop
  '2xl': '1280px', // Desktop
  '3xl': '1440px', // Large desktop
  '4xl': '1920px', // Extra large screens
} as const;

// ============================================
// COLOR PALETTE - Emerald/Teal Primary Theme
// ============================================
export const colors = {
  // Primary - Emerald (main brand color)
  primary: {
    50: 'emerald-50',
    100: 'emerald-100',
    200: 'emerald-200',
    300: 'emerald-300',
    400: 'emerald-400',
    500: 'emerald-500',
    600: 'emerald-600', // Primary action color
    700: 'emerald-700',
    800: 'emerald-800',
    900: 'emerald-900',
  },
  // Secondary - Teal (complementary)
  secondary: {
    50: 'teal-50',
    100: 'teal-100',
    500: 'teal-500',
    600: 'teal-600',
    700: 'teal-700',
  },
  // Accent - Blue (for highlights and CTAs)
  accent: {
    50: 'blue-50',
    100: 'blue-100',
    500: 'blue-500',
    600: 'blue-600',
    700: 'blue-700',
  },
  // Neutral - Gray scale
  neutral: {
    50: 'gray-50',
    100: 'gray-100',
    200: 'gray-200',
    300: 'gray-300',
    400: 'gray-400',
    500: 'gray-500',
    600: 'gray-600',
    700: 'gray-700',
    800: 'gray-800',
    900: 'gray-900',
  },
  // Status colors - WCAG compliant contrast
  success: {
    light: 'green-50',
    main: 'green-600',
    dark: 'green-700',
    text: 'green-800',
  },
  warning: {
    light: 'amber-50',
    main: 'amber-500',
    dark: 'amber-600',
    text: 'amber-800',
  },
  error: {
    light: 'red-50',
    main: 'red-600',
    dark: 'red-700',
    text: 'red-800',
  },
  info: {
    light: 'blue-50',
    main: 'blue-600',
    dark: 'blue-700',
    text: 'blue-800',
  },
} as const;

// ============================================
// SPACING SCALE - Consistent padding/margins
// ============================================
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px - Touch target minimum
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
} as const;

// Responsive spacing utilities
export const responsiveSpacing = {
  // Page padding
  pagePadding: 'px-4 sm:px-6 lg:px-8',
  // Section spacing
  sectionY: 'py-8 sm:py-12 lg:py-16 xl:py-20',
  // Card padding
  cardPadding: 'p-4 sm:p-5 lg:p-6',
  // Gap utilities
  gridGap: 'gap-4 sm:gap-5 lg:gap-6',
  stackGap: 'space-y-4 sm:space-y-5 lg:space-y-6',
} as const;

// ============================================
// BORDER RADIUS - Standardized rounding
// ============================================
export const radius = {
  none: 'rounded-none',
  sm: 'rounded',           // 4px
  DEFAULT: 'rounded-md',   // 6px
  md: 'rounded-lg',        // 8px
  lg: 'rounded-xl',        // 12px
  xl: 'rounded-2xl',       // 16px
  '2xl': 'rounded-3xl',    // 24px
  full: 'rounded-full',    // Pills, avatars
} as const;

// ============================================
// SHADOWS - Consistent elevation
// ============================================
export const shadows = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  DEFAULT: 'shadow',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  inner: 'shadow-inner',
  // Colored shadows for emphasis
  primary: 'shadow-lg shadow-emerald-500/25',
  accent: 'shadow-lg shadow-blue-500/25',
  error: 'shadow-lg shadow-red-500/25',
} as const;

// ============================================
// TOUCH TARGETS - Accessibility (min 44px)
// ============================================
export const touchTargets = {
  button: 'min-h-[44px] min-w-[44px]',
  iconButton: 'h-11 w-11', // 44px
  input: 'h-11',           // 44px
  listItem: 'min-h-[44px]',
  menuItem: 'min-h-[44px] py-3',
  link: 'min-h-[44px] inline-flex items-center',
  checkbox: 'h-5 w-5',     // With padding for touch
  radio: 'h-5 w-5',
} as const;

// ============================================
// TYPOGRAPHY - Consistent text styles
// ============================================
export const typography = {
  // Headings - Responsive sizes
  h1: 'text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 dark:text-gray-100 leading-tight tracking-tight',
  h2: 'text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight',
  h3: 'text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100',
  h4: 'text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100',
  h5: 'text-sm sm:text-base lg:text-lg font-medium text-gray-900 dark:text-gray-100',
  h6: 'text-sm font-medium text-gray-900 dark:text-gray-100',
  
  // Body text
  bodyLarge: 'text-base sm:text-lg text-gray-700 dark:text-gray-300 leading-relaxed',
  body: 'text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed',
  bodySmall: 'text-xs sm:text-sm text-gray-600 dark:text-gray-400',
  
  // Utility text
  caption: 'text-xs text-gray-500 dark:text-gray-500',
  label: 'text-sm font-medium text-gray-700 dark:text-gray-300',
  overline: 'text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400',
  
  // Special text
  price: 'text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600 dark:text-emerald-400',
  priceSmall: 'text-base sm:text-lg font-semibold text-emerald-600 dark:text-emerald-400',
  strikethrough: 'text-sm text-gray-400 line-through',
} as const;

// Font families (max 2 fonts)
export const fontFamily = {
  sans: 'font-sans', // Inter - Primary
  mono: 'font-mono', // For code/SKUs
} as const;

// ============================================
// FOCUS STATES - Accessibility
// ============================================
export const focusRing = {
  primary: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
  secondary: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2',
  error: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
  white: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-600',
  inset: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset',
} as const;

// ============================================
// BUTTON VARIANTS - Standardized buttons
// ============================================
export const buttonStyles = {
  // Base styles applied to all buttons
  base: `
    inline-flex items-center justify-center gap-2 
    whitespace-nowrap font-medium 
    transition-all duration-200 
    disabled:pointer-events-none disabled:opacity-50
    active:scale-[0.98]
  `,
  
  // Size variants
  sizes: {
    sm: 'h-9 px-3 text-sm rounded-lg min-h-[36px]',
    default: 'h-11 px-5 text-sm rounded-xl min-h-[44px]',
    lg: 'h-12 px-6 text-base rounded-xl min-h-[48px]',
    xl: 'h-14 px-8 text-base rounded-2xl min-h-[56px]',
    icon: 'h-11 w-11 rounded-xl min-h-[44px] min-w-[44px]',
    iconSm: 'h-9 w-9 rounded-lg min-h-[36px] min-w-[36px]',
  },
  
  // Color variants
  variants: {
    primary: `
      bg-emerald-600 text-white 
      hover:bg-emerald-700 
      focus-visible:ring-emerald-500
      shadow-sm hover:shadow-md
    `,
    secondary: `
      bg-white border border-gray-300 text-gray-700
      hover:bg-gray-50 hover:border-gray-400
      focus-visible:ring-gray-400
    `,
    ghost: `
      bg-transparent text-gray-700
      hover:bg-gray-100
      focus-visible:ring-gray-400
    `,
    danger: `
      bg-red-600 text-white
      hover:bg-red-700
      focus-visible:ring-red-500
      shadow-sm hover:shadow-md
    `,
    success: `
      bg-green-600 text-white
      hover:bg-green-700
      focus-visible:ring-green-500
      shadow-sm hover:shadow-md
    `,
    outline: `
      bg-transparent border-2 border-emerald-600 text-emerald-600
      hover:bg-emerald-50
      focus-visible:ring-emerald-500
    `,
    link: `
      bg-transparent text-emerald-600 underline-offset-4
      hover:underline
      focus-visible:ring-emerald-500
      p-0 h-auto min-h-0
    `,
  },
} as const;

// ============================================
// CARD STYLES - Consistent cards
// ============================================
export const cardStyles = {
  base: `
    bg-white dark:bg-gray-800 
    border border-gray-200 dark:border-gray-700 
    rounded-xl 
    shadow-sm
  `,
  elevated: `
    bg-white dark:bg-gray-800 
    border border-gray-200 dark:border-gray-700 
    rounded-xl 
    shadow-lg
  `,
  interactive: `
    bg-white dark:bg-gray-800 
    border border-gray-200 dark:border-gray-700 
    rounded-xl 
    shadow-sm 
    hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-600
    transition-all duration-200 
    cursor-pointer
  `,
  selected: `
    bg-emerald-50 dark:bg-emerald-900/20 
    border-2 border-emerald-500 
    rounded-xl 
    shadow-md
  `,
  // Responsive padding
  padding: {
    sm: 'p-3 sm:p-4',
    default: 'p-4 sm:p-5 lg:p-6',
    lg: 'p-5 sm:p-6 lg:p-8',
  },
} as const;

// ============================================
// INPUT STYLES - Form elements
// ============================================
export const inputStyles = {
  base: `
    h-11 w-full px-4
    bg-white dark:bg-gray-800
    border border-gray-300 dark:border-gray-600 
    rounded-xl
    text-gray-900 dark:text-gray-100 
    placeholder:text-gray-400 dark:placeholder:text-gray-500
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-0 focus-visible:border-emerald-500
    disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700
    transition-colors duration-200
    min-h-[44px]
    text-base sm:text-sm
  `,
  error: `
    h-11 w-full px-4
    bg-white dark:bg-gray-800
    border-2 border-red-300 dark:border-red-600 
    rounded-xl
    text-gray-900 dark:text-gray-100 
    placeholder:text-gray-400
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0
    min-h-[44px]
    text-base sm:text-sm
  `,
  // With icon
  withIcon: 'pl-11',
  // Sizes
  sizes: {
    sm: 'h-9 px-3 text-sm min-h-[36px]',
    default: 'h-11 px-4 text-base sm:text-sm min-h-[44px]',
    lg: 'h-12 px-5 text-base min-h-[48px]',
  },
} as const;

// ============================================
// BADGE STYLES - Status indicators
// ============================================
export const badgeStyles = {
  base: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  variants: {
    default: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    outline: 'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
  },
  sizes: {
    sm: 'px-2 py-0.5 text-[10px]',
    default: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  },
} as const;

// ============================================
// TABLE STYLES - Responsive tables
// ============================================
export const tableStyles = {
  wrapper: 'w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700',
  table: 'w-full min-w-[600px]',
  header: 'bg-gray-50 dark:bg-gray-800',
  headerCell: `
    px-4 py-3 
    text-left text-xs font-semibold uppercase tracking-wider 
    text-gray-600 dark:text-gray-400
    border-b border-gray-200 dark:border-gray-700
  `,
  row: `
    border-b border-gray-100 dark:border-gray-700 
    hover:bg-gray-50 dark:hover:bg-gray-800/50 
    transition-colors
  `,
  cell: 'px-4 py-3 text-sm text-gray-700 dark:text-gray-300',
  // Mobile card view
  mobileCard: `
    block sm:hidden 
    bg-white dark:bg-gray-800 
    rounded-xl border border-gray-200 dark:border-gray-700 
    p-4 mb-3
    shadow-sm
  `,
} as const;

// ============================================
// MODAL/DIALOG STYLES
// ============================================
export const modalStyles = {
  overlay: 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50',
  container: `
    fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
    w-[calc(100%-2rem)] max-w-lg 
    max-h-[calc(100vh-4rem)] overflow-y-auto
    bg-white dark:bg-gray-800 
    rounded-2xl 
    shadow-2xl 
    z-50
    p-6
  `,
  header: 'flex items-center justify-between mb-4',
  title: 'text-lg font-semibold text-gray-900 dark:text-gray-100',
  closeButton: `
    h-10 w-10 rounded-lg 
    flex items-center justify-center 
    text-gray-400 hover:text-gray-600 hover:bg-gray-100
    dark:hover:text-gray-300 dark:hover:bg-gray-700
    transition-colors
  `,
  footer: 'flex flex-col-reverse sm:flex-row gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700',
} as const;

// ============================================
// NAVIGATION STYLES
// ============================================
export const navStyles = {
  // Top navigation bar
  topBar: `
    fixed top-0 left-0 right-0 z-40
    bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl
    border-b border-gray-200 dark:border-gray-800
    h-16
  `,
  // Sidebar
  sidebar: `
    fixed left-0 top-0 bottom-0 z-30
    w-64 lg:w-72
    bg-white dark:bg-gray-900
    border-r border-gray-200 dark:border-gray-800
    overflow-y-auto
  `,
  // Nav item
  navItem: `
    flex items-center gap-3 
    px-4 py-3 
    rounded-xl 
    text-gray-600 dark:text-gray-400 
    hover:bg-gray-100 dark:hover:bg-gray-800 
    hover:text-gray-900 dark:hover:text-gray-100
    transition-colors
    min-h-[44px]
  `,
  navItemActive: `
    flex items-center gap-3 
    px-4 py-3 
    rounded-xl 
    bg-emerald-50 dark:bg-emerald-900/20 
    text-emerald-700 dark:text-emerald-400 
    font-medium
    min-h-[44px]
  `,
  // Breadcrumb
  breadcrumb: 'flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400',
  breadcrumbLink: 'hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors',
  breadcrumbCurrent: 'text-gray-900 dark:text-gray-100 font-medium',
} as const;

// ============================================
// LOADING STATES
// ============================================
export const loadingStyles = {
  // Skeleton
  skeleton: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded',
  skeletonText: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-full',
  skeletonHeading: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6 w-3/4',
  skeletonImage: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl aspect-square',
  skeletonCard: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-48',
  skeletonButton: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-11 w-24',
  
  // Spinner
  spinner: 'animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600',
  spinnerSizes: {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  },
  
  // Full page loader
  pageLoader: `
    fixed inset-0 z-50 
    flex items-center justify-center 
    bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm
  `,
} as const;

// ============================================
// ANIMATION UTILITIES
// ============================================
export const animations = {
  // Transitions
  transition: {
    fast: 'transition-all duration-150 ease-out',
    default: 'transition-all duration-200 ease-out',
    slow: 'transition-all duration-300 ease-out',
  },
  // Hover effects
  hover: {
    lift: 'hover:-translate-y-0.5 hover:shadow-lg',
    scale: 'hover:scale-[1.02]',
    glow: 'hover:shadow-lg hover:shadow-emerald-500/25',
  },
  // Enter animations
  enter: {
    fadeIn: 'animate-fade-in',
    slideUp: 'animate-slide-up',
    scaleIn: 'animate-scale-in',
  },
} as const;

// ============================================
// ARIA LABELS - Common accessibility labels
// ============================================
export const ariaLabels = {
  loading: 'Loading, please wait',
  close: 'Close dialog',
  menu: 'Open menu',
  cart: 'Shopping cart',
  search: 'Search products',
  filter: 'Filter options',
  sort: 'Sort options',
  pagination: {
    prev: 'Go to previous page',
    next: 'Go to next page',
    page: (n: number) => `Go to page ${n}`,
  },
  product: {
    addToCart: (name: string) => `Add ${name} to cart`,
    viewDetails: (name: string) => `View details for ${name}`,
    selectSize: (size: string) => `Select size ${size}`,
    quantity: (name: string) => `Quantity for ${name}`,
  },
  form: {
    required: 'This field is required',
    error: (field: string) => `Error in ${field}`,
    success: 'Form submitted successfully',
  },
} as const;

// ============================================
// EMPTY STATE MESSAGES
// ============================================
export const emptyStates = {
  products: {
    title: 'No products found',
    description: 'Try adjusting your search or filters',
    action: 'Clear filters',
  },
  cart: {
    title: 'Your cart is empty',
    description: 'Browse our products and add items to get started',
    action: 'Browse Products',
  },
  orders: {
    title: 'No orders yet',
    description: 'Your order history will appear here',
    action: 'Start Shopping',
  },
  search: {
    title: 'No results found',
    description: "We couldn't find anything matching your search",
    action: 'Clear search',
  },
  notifications: {
    title: 'No notifications',
    description: "You're all caught up!",
    action: null,
  },
} as const;

// ============================================
// ERROR MESSAGES
// ============================================
export const errorMessages = {
  network: {
    title: 'Connection Error',
    description: 'Please check your internet connection and try again',
    action: 'Retry',
  },
  notFound: {
    title: 'Not Found',
    description: "The page or resource you're looking for doesn't exist",
    action: 'Go Home',
  },
  unauthorized: {
    title: 'Access Denied',
    description: "You don't have permission to view this content",
    action: 'Login',
  },
  generic: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
    action: 'Retry',
  },
  validation: {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    phone: 'Please enter a valid phone number',
    minLength: (min: number) => `Must be at least ${min} characters`,
    maxLength: (max: number) => `Must be no more than ${max} characters`,
  },
} as const;

// ============================================
// RESPONSIVE GRID LAYOUTS
// ============================================
export const gridLayouts = {
  // Product grids
  products: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6',
  productsCompact: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4',
  
  // Dashboard grids
  stats: 'grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6',
  dashboard: 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6',
  
  // Form layouts
  form: 'grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5',
  formFull: 'grid grid-cols-1 gap-4 sm:gap-5',
} as const;

// ============================================
// Z-INDEX SCALE
// ============================================
export const zIndex = {
  dropdown: 'z-10',
  sticky: 'z-20',
  fixed: 'z-30',
  modalBackdrop: 'z-40',
  modal: 'z-50',
  popover: 'z-60',
  tooltip: 'z-70',
  toast: 'z-80',
} as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Combines multiple class names, filtering out falsy values
 */
export const cx = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Returns responsive class based on breakpoint
 */
export const responsive = (
  base: string,
  sm?: string,
  md?: string,
  lg?: string,
  xl?: string
): string => {
  return cx(
    base,
    sm && `sm:${sm}`,
    md && `md:${md}`,
    lg && `lg:${lg}`,
    xl && `xl:${xl}`
  );
};
