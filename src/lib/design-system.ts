/**
 * 9RX Design System - Standardized UI Constants
 * Use these throughout the app for consistency
 */

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
  // Accent - Purple (rewards, special features)
  accent: {
    50: 'purple-50',
    100: 'purple-100',
    500: 'purple-500',
    600: 'purple-600',
    700: 'purple-700',
  },
  // Status colors
  success: 'green-600',
  warning: 'amber-500',
  error: 'red-600',
  info: 'blue-600',
} as const;

// ============================================
// SPACING - Consistent padding/margins
// ============================================
export const spacing = {
  xs: '2',   // 8px
  sm: '3',   // 12px
  md: '4',   // 16px
  lg: '6',   // 24px
  xl: '8',   // 32px
  '2xl': '12', // 48px
} as const;

// ============================================
// BORDER RADIUS - Standardized rounding
// ============================================
export const radius = {
  sm: 'rounded-lg',      // 8px - small elements
  md: 'rounded-xl',      // 12px - buttons, cards
  lg: 'rounded-2xl',     // 16px - modals, large cards
  full: 'rounded-full',  // pills, avatars
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
} as const;

// ============================================
// TYPOGRAPHY - Consistent text styles
// ============================================
export const typography = {
  h1: 'text-3xl font-bold text-gray-900',
  h2: 'text-2xl font-semibold text-gray-900',
  h3: 'text-xl font-semibold text-gray-900',
  h4: 'text-lg font-medium text-gray-900',
  body: 'text-base text-gray-700',
  bodySmall: 'text-sm text-gray-600',
  caption: 'text-xs text-gray-500',
  label: 'text-sm font-medium text-gray-700',
} as const;

// ============================================
// FOCUS STATES - Accessibility
// ============================================
export const focusRing = {
  primary: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
  error: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
  white: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-600',
} as const;

// ============================================
// BUTTON VARIANTS - Standardized buttons
// ============================================
export const buttonStyles = {
  primary: `
    bg-emerald-600 hover:bg-emerald-700 
    text-white font-medium 
    ${radius.md} ${touchTargets.button}
    ${focusRing.primary}
    transition-colors duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  secondary: `
    bg-white border border-gray-300 
    hover:bg-gray-50 text-gray-700 font-medium
    ${radius.md} ${touchTargets.button}
    ${focusRing.primary}
    transition-colors duration-200
  `,
  ghost: `
    bg-transparent hover:bg-gray-100 
    text-gray-700 font-medium
    ${radius.md} ${touchTargets.button}
    ${focusRing.primary}
    transition-colors duration-200
  `,
  danger: `
    bg-red-600 hover:bg-red-700 
    text-white font-medium
    ${radius.md} ${touchTargets.button}
    focus-visible:ring-red-500
    transition-colors duration-200
  `,
} as const;

// ============================================
// CARD STYLES - Consistent cards
// ============================================
export const cardStyles = {
  base: `bg-white border border-gray-200 ${radius.lg} shadow-sm`,
  elevated: `bg-white border border-gray-200 ${radius.lg} shadow-lg`,
  interactive: `bg-white border border-gray-200 ${radius.lg} shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200 cursor-pointer`,
} as const;

// ============================================
// INPUT STYLES - Form elements
// ============================================
export const inputStyles = {
  base: `
    ${touchTargets.input} w-full px-4
    border border-gray-300 ${radius.md}
    text-gray-900 placeholder:text-gray-400
    ${focusRing.primary}
    disabled:bg-gray-100 disabled:cursor-not-allowed
  `,
  error: `
    ${touchTargets.input} w-full px-4
    border border-red-300 ${radius.md}
    text-gray-900 placeholder:text-gray-400
    focus-visible:ring-red-500
  `,
} as const;

// ============================================
// BADGE STYLES - Status indicators
// ============================================
export const badgeStyles = {
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  neutral: 'bg-gray-100 text-gray-800 border-gray-200',
  primary: 'bg-emerald-100 text-emerald-800 border-emerald-200',
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
} as const;

// ============================================
// SKELETON STYLES - Loading states
// ============================================
export const skeletonStyles = {
  base: 'animate-pulse bg-gray-200 rounded',
  text: 'animate-pulse bg-gray-200 rounded h-4',
  heading: 'animate-pulse bg-gray-200 rounded h-6',
  image: 'animate-pulse bg-gray-200 rounded-xl aspect-square',
  card: 'animate-pulse bg-gray-200 rounded-xl h-48',
  button: 'animate-pulse bg-gray-200 rounded-xl h-11 w-24',
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
    description: 'We couldn\'t find anything matching your search',
    action: 'Clear search',
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
    description: 'The page or resource you\'re looking for doesn\'t exist',
    action: 'Go Home',
  },
  unauthorized: {
    title: 'Access Denied',
    description: 'You don\'t have permission to view this content',
    action: 'Login',
  },
  generic: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
    action: 'Retry',
  },
} as const;
