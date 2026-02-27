// Festival Themes for Pharmacy Banners
// Auto-applies based on date or can be manually selected

export interface FestivalTheme {
  id: string;
  name: string;
  nameHindi?: string;
  icon: string;
  startDate: string; // MM-DD format
  endDate: string;   // MM-DD format
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    gradient: string;
  };
  decorations: {
    pattern?: string;
    overlay?: string;
    border?: string;
  };
  bannerDefaults: {
    title: string;
    subtitle: string;
    badge: string;
    ctaText: string;
  };
  stockImages: string[];
}

export const festivalThemes: FestivalTheme[] = [
  {
    id: "new-year",
    name: "New Year",
    icon: "🎉",
    startDate: "12-28",
    endDate: "01-07",
    colors: {
      primary: "#7c3aed",
      secondary: "#0d9488",
      accent: "#fbbf24",
      text: "#ffffff",
      gradient: "from-violet-600 via-purple-500 to-teal-500"
    },
    decorations: {
      pattern: "confetti",
      overlay: "fireworks",
      border: "sparkle"
    },
    bannerDefaults: {
      title: "New Year, New Health! 🎉",
      subtitle: "Start 2025 with wellness - Mega discounts on all products",
      badge: "2025 Special",
      ctaText: "Shop New Year Sale"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=1920&h=600&fit=crop&auto=format&q=90",
      "https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "valentines-day",
    name: "Valentine's Day",
    icon: "💝",
    startDate: "02-10",
    endDate: "02-18",
    colors: {
      primary: "#ec4899",
      secondary: "#dc2626",
      accent: "#fbbf24",
      text: "#ffffff",
      gradient: "from-pink-500 via-red-500 to-rose-600"
    },
    decorations: {
      pattern: "hearts",
      overlay: "love",
      border: "romantic"
    },
    bannerDefaults: {
      title: "Love Your Health! 💝",
      subtitle: "Valentine's wellness specials - Gift health to your loved ones",
      badge: "Love & Care",
      ctaText: "Shop Valentine's Gifts"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=1920&h=600&fit=crop&auto=format&q=90",
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "presidents-day",
    name: "Presidents' Day",
    icon: "🇺🇸",
    startDate: "02-15",
    endDate: "02-22",
    colors: {
      primary: "#dc2626",
      secondary: "#1e40af",
      accent: "#ffffff",
      text: "#ffffff",
      gradient: "from-red-600 via-white to-blue-600"
    },
    decorations: {
      pattern: "stars",
      overlay: "patriotic",
      border: "americana"
    },
    bannerDefaults: {
      title: "Presidents' Day Sale! 🇺🇸",
      subtitle: "Presidential savings on health essentials - Up to 40% OFF",
      badge: "Patriotic Deals",
      ctaText: "Shop Presidents' Day"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1484600899469-230e8d1d59c0?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "st-patricks-day",
    name: "St. Patrick's Day",
    icon: "☘️",
    startDate: "03-14",
    endDate: "03-20",
    colors: {
      primary: "#16a34a",
      secondary: "#fbbf24",
      accent: "#ffffff",
      text: "#ffffff",
      gradient: "from-green-600 via-emerald-500 to-lime-500"
    },
    decorations: {
      pattern: "shamrocks",
      overlay: "lucky",
      border: "irish"
    },
    bannerDefaults: {
      title: "Lucky Health Deals! ☘️",
      subtitle: "Get lucky with wellness savings - Irish-inspired discounts",
      badge: "Lucky You",
      ctaText: "Shop St. Patrick's Deals"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1489549132488-d00b7eee80f1?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "easter",
    name: "Easter",
    icon: "🐰",
    startDate: "03-25",
    endDate: "04-10",
    colors: {
      primary: "#a855f7",
      secondary: "#ec4899",
      accent: "#fbbf24",
      text: "#ffffff",
      gradient: "from-purple-500 via-pink-400 to-yellow-400"
    },
    decorations: {
      pattern: "eggs",
      overlay: "spring",
      border: "pastel"
    },
    bannerDefaults: {
      title: "Easter Wellness Sale! 🐰",
      subtitle: "Spring into health - Fresh deals on wellness products",
      badge: "Spring Special",
      ctaText: "Shop Easter Deals"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1522441815192-d9f04eb0615c?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "memorial-day",
    name: "Memorial Day",
    icon: "🎖️",
    startDate: "05-22",
    endDate: "05-31",
    colors: {
      primary: "#dc2626",
      secondary: "#1e40af",
      accent: "#ffffff",
      text: "#ffffff",
      gradient: "from-red-600 via-white to-blue-700"
    },
    decorations: {
      pattern: "stars-stripes",
      overlay: "honor",
      border: "patriotic"
    },
    bannerDefaults: {
      title: "Memorial Day Sale! 🎖️",
      subtitle: "Honor with savings - Special discounts for heroes",
      badge: "Thank You",
      ctaText: "Shop Memorial Day"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "christmas",
    name: "Christmas",
    icon: "🎄",
    startDate: "12-15",
    endDate: "12-31",
    colors: {
      primary: "#dc2626",
      secondary: "#16a34a",
      accent: "#fbbf24",
      text: "#ffffff",
      gradient: "from-red-600 via-red-500 to-green-600"
    },
    decorations: {
      pattern: "snowflakes",
      overlay: "snow",
      border: "candy-cane"
    },
    bannerDefaults: {
      title: "Christmas Health Sale! 🎄",
      subtitle: "Gift of good health - Special discounts on wellness products",
      badge: "Merry Savings",
      ctaText: "Shop Christmas Deals"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=1920&h=600&fit=crop&auto=format&q=90",
      "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "independence-day",
    name: "Independence Day",
    icon: "🎆",
    startDate: "06-28",
    endDate: "07-08",
    colors: {
      primary: "#dc2626",
      secondary: "#1e40af",
      accent: "#ffffff",
      text: "#ffffff",
      gradient: "from-red-600 via-white to-blue-700"
    },
    decorations: {
      pattern: "fireworks",
      overlay: "stars",
      border: "patriotic"
    },
    bannerDefaults: {
      title: "4th of July Sale! 🎆",
      subtitle: "Celebrate freedom with explosive savings - Up to 50% OFF",
      badge: "Independence Special",
      ctaText: "Shop July 4th Deals"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1530982011887-3cc11cc85693?w=1920&h=600&fit=crop&auto=format&q=90",
      "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "labor-day",
    name: "Labor Day",
    icon: "⚒️",
    startDate: "08-28",
    endDate: "09-08",
    colors: {
      primary: "#0891b2",
      secondary: "#f59e0b",
      accent: "#ffffff",
      text: "#ffffff",
      gradient: "from-cyan-600 via-blue-500 to-amber-500"
    },
    decorations: {
      pattern: "tools",
      overlay: "work",
      border: "industrial"
    },
    bannerDefaults: {
      title: "Labor Day Savings! ⚒️",
      subtitle: "Hard work deserves great deals - End of summer specials",
      badge: "Worker's Special",
      ctaText: "Shop Labor Day"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1504805572947-34fad45aed93?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "halloween",
    name: "Halloween",
    icon: "🎃",
    startDate: "10-20",
    endDate: "11-02",
    colors: {
      primary: "#f97316",
      secondary: "#7c3aed",
      accent: "#000000",
      text: "#ffffff",
      gradient: "from-orange-600 via-purple-600 to-black"
    },
    decorations: {
      pattern: "pumpkins",
      overlay: "spooky",
      border: "haunted"
    },
    bannerDefaults: {
      title: "Spooktacular Savings! 🎃",
      subtitle: "Frighteningly good deals on wellness - Trick or treat yourself",
      badge: "Boo-tiful Deals",
      ctaText: "Shop Halloween Specials"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "thanksgiving",
    name: "Thanksgiving",
    icon: "🦃",
    startDate: "11-18",
    endDate: "11-30",
    colors: {
      primary: "#f59e0b",
      secondary: "#dc2626",
      accent: "#16a34a",
      text: "#ffffff",
      gradient: "from-amber-600 via-orange-500 to-red-600"
    },
    decorations: {
      pattern: "autumn",
      overlay: "harvest",
      border: "fall"
    },
    bannerDefaults: {
      title: "Thanksgiving Health Sale! 🦃",
      subtitle: "Grateful for your health - Special holiday savings",
      badge: "Give Thanks",
      ctaText: "Shop Thanksgiving Deals"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "mothers-day",
    name: "Mother's Day",
    icon: "💐",
    startDate: "05-05",
    endDate: "05-15",
    colors: {
      primary: "#ec4899",
      secondary: "#a855f7",
      accent: "#fbbf24",
      text: "#ffffff",
      gradient: "from-pink-500 via-purple-400 to-rose-500"
    },
    decorations: {
      pattern: "flowers",
      overlay: "love",
      border: "floral"
    },
    bannerDefaults: {
      title: "Mother's Day Special! 💐",
      subtitle: "Show mom you care - Wellness gifts for the best mom",
      badge: "For Mom",
      ctaText: "Shop Mother's Day Gifts"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "fathers-day",
    name: "Father's Day",
    icon: "👔",
    startDate: "06-12",
    endDate: "06-22",
    colors: {
      primary: "#1e40af",
      secondary: "#0891b2",
      accent: "#fbbf24",
      text: "#ffffff",
      gradient: "from-blue-700 via-cyan-600 to-blue-500"
    },
    decorations: {
      pattern: "ties",
      overlay: "masculine",
      border: "classic"
    },
    bannerDefaults: {
      title: "Father's Day Sale! 👔",
      subtitle: "Celebrate dad with health - Special gifts for the best dad",
      badge: "For Dad",
      ctaText: "Shop Father's Day Gifts"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1560703650-6e0e5e1b9b3e?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "back-to-school",
    name: "Back to School",
    icon: "🎒",
    startDate: "08-01",
    endDate: "09-15",
    colors: {
      primary: "#f59e0b",
      secondary: "#16a34a",
      accent: "#dc2626",
      text: "#ffffff",
      gradient: "from-amber-500 via-green-500 to-red-500"
    },
    decorations: {
      pattern: "pencils",
      overlay: "school",
      border: "academic"
    },
    bannerDefaults: {
      title: "Back to School Health! 🎒",
      subtitle: "Start the school year healthy - Vitamins & wellness essentials",
      badge: "School Ready",
      ctaText: "Shop School Essentials"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "black-friday",
    name: "Black Friday",
    icon: "🛍️",
    startDate: "11-24",
    endDate: "11-29",
    colors: {
      primary: "#000000",
      secondary: "#dc2626",
      accent: "#fbbf24",
      text: "#ffffff",
      gradient: "from-black via-gray-800 to-red-600"
    },
    decorations: {
      pattern: "shopping",
      overlay: "deals",
      border: "sale"
    },
    bannerDefaults: {
      title: "Black Friday Blowout! 🛍️",
      subtitle: "Biggest savings of the year - Up to 70% OFF wellness products",
      badge: "Mega Sale",
      ctaText: "Shop Black Friday"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  }
];

// Get current active festival based on date
export const getCurrentFestival = (): FestivalTheme | null => {
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentDay = String(now.getDate()).padStart(2, '0');
  const currentMMDD = `${currentMonth}-${currentDay}`;

  for (const festival of festivalThemes) {
    const start = festival.startDate;
    const end = festival.endDate;

    // Handle year wrap (e.g., New Year: 12-28 to 01-07)
    if (start > end) {
      if (currentMMDD >= start || currentMMDD <= end) {
        return festival;
      }
    } else {
      if (currentMMDD >= start && currentMMDD <= end) {
        return festival;
      }
    }
  }

  return null;
};

// Get upcoming festivals (next 3)
export const getUpcomingFestivals = (count: number = 3): FestivalTheme[] => {
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentDay = String(now.getDate()).padStart(2, '0');
  const currentMMDD = `${currentMonth}-${currentDay}`;

  const upcoming = festivalThemes
    .filter(f => f.startDate > currentMMDD)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, count);

  // If not enough, add from beginning of year
  if (upcoming.length < count) {
    const fromStart = festivalThemes
      .filter(f => f.startDate < currentMMDD)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, count - upcoming.length);
    upcoming.push(...fromStart);
  }

  return upcoming;
};

// Generate festival-themed banner data
export const generateFestivalBanner = (festival: FestivalTheme) => {
  return {
    title: festival.bannerDefaults.title,
    subtitle: festival.bannerDefaults.subtitle,
    image_url: festival.stockImages[0] || "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1920&h=600&fit=crop&auto=format&q=90",
    mobile_image_url: festival.stockImages[0]?.replace("w=1920&h=600", "w=768&h=500") || "",
    link_url: "/pharmacy/products",
    link_text: festival.bannerDefaults.ctaText,
    banner_type: "hero",
    background_color: festival.colors.primary,
    text_color: festival.colors.text,
    overlay_opacity: 0.5,
    is_active: true,
    festival_theme: festival.id
  };
};
