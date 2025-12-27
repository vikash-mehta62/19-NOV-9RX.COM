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
    id: "diwali",
    name: "Diwali",
    nameHindi: "दीपावली",
    icon: "🪔",
    startDate: "10-20",
    endDate: "11-15",
    colors: {
      primary: "#f59e0b",
      secondary: "#dc2626",
      accent: "#fbbf24",
      text: "#ffffff",
      gradient: "from-amber-600 via-orange-500 to-red-600"
    },
    decorations: {
      pattern: "diyas",
      overlay: "sparkles",
      border: "golden"
    },
    bannerDefaults: {
      title: "Diwali Dhamaka Sale! 🪔",
      subtitle: "Light up your health with amazing discounts up to 50% OFF",
      badge: "Festival Special",
      ctaText: "Shop Diwali Offers"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=1920&h=600&fit=crop&auto=format&q=90",
      "https://images.unsplash.com/photo-1574265935498-e5765a6d3e5e?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "christmas",
    name: "Christmas",
    nameHindi: "क्रिसमस",
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
    id: "new-year",
    name: "New Year",
    nameHindi: "नया साल",
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
    id: "holi",
    name: "Holi",
    nameHindi: "होली",
    icon: "🎨",
    startDate: "03-01",
    endDate: "03-20",
    colors: {
      primary: "#ec4899",
      secondary: "#8b5cf6",
      accent: "#22c55e",
      text: "#ffffff",
      gradient: "from-pink-500 via-purple-500 to-green-500"
    },
    decorations: {
      pattern: "colors",
      overlay: "splash",
      border: "rainbow"
    },
    bannerDefaults: {
      title: "Holi Health Bonanza! 🎨",
      subtitle: "Colors of wellness - Splash savings on skincare & more",
      badge: "Rang Barse",
      ctaText: "Shop Holi Offers"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1576398289164-c48dc021b4e1?w=1920&h=600&fit=crop&auto=format&q=90",
      "https://images.unsplash.com/photo-1520962922320-2038eebab146?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "independence-day",
    name: "Independence Day",
    nameHindi: "स्वतंत्रता दिवस",
    icon: "🇮🇳",
    startDate: "08-10",
    endDate: "08-20",
    colors: {
      primary: "#f97316",
      secondary: "#16a34a",
      accent: "#ffffff",
      text: "#ffffff",
      gradient: "from-orange-500 via-white to-green-600"
    },
    decorations: {
      pattern: "tricolor",
      overlay: "flags",
      border: "tricolor"
    },
    bannerDefaults: {
      title: "Freedom Sale! 🇮🇳",
      subtitle: "Celebrate independence with healthy savings - Up to 40% OFF",
      badge: "Jai Hind",
      ctaText: "Shop Freedom Deals"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "republic-day",
    name: "Republic Day",
    nameHindi: "गणतंत्र दिवस",
    icon: "🏛️",
    startDate: "01-20",
    endDate: "01-31",
    colors: {
      primary: "#f97316",
      secondary: "#16a34a",
      accent: "#1e40af",
      text: "#ffffff",
      gradient: "from-orange-500 via-white to-green-600"
    },
    decorations: {
      pattern: "tricolor",
      overlay: "parade",
      border: "tricolor"
    },
    bannerDefaults: {
      title: "Republic Day Sale! 🏛️",
      subtitle: "Proud to serve your health - Special patriotic discounts",
      badge: "Vande Mataram",
      ctaText: "Shop Republic Deals"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "raksha-bandhan",
    name: "Raksha Bandhan",
    nameHindi: "रक्षा बंधन",
    icon: "🎀",
    startDate: "08-15",
    endDate: "08-25",
    colors: {
      primary: "#ec4899",
      secondary: "#f59e0b",
      accent: "#a855f7",
      text: "#ffffff",
      gradient: "from-pink-500 via-amber-400 to-purple-500"
    },
    decorations: {
      pattern: "rakhi",
      overlay: "threads",
      border: "decorative"
    },
    bannerDefaults: {
      title: "Rakhi Special Offers! 🎀",
      subtitle: "Gift health to your siblings - Special combo deals",
      badge: "Sibling Love",
      ctaText: "Shop Rakhi Gifts"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "eid",
    name: "Eid",
    nameHindi: "ईद",
    icon: "🌙",
    startDate: "03-25",
    endDate: "04-15",
    colors: {
      primary: "#16a34a",
      secondary: "#fbbf24",
      accent: "#ffffff",
      text: "#ffffff",
      gradient: "from-green-600 via-emerald-500 to-amber-400"
    },
    decorations: {
      pattern: "crescent",
      overlay: "stars",
      border: "islamic"
    },
    bannerDefaults: {
      title: "Eid Mubarak Sale! 🌙",
      subtitle: "Celebrate with wellness - Special Eid discounts for you",
      badge: "Eid Special",
      ctaText: "Shop Eid Offers"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "navratri",
    name: "Navratri",
    nameHindi: "नवरात्रि",
    icon: "🔱",
    startDate: "09-25",
    endDate: "10-15",
    colors: {
      primary: "#dc2626",
      secondary: "#f59e0b",
      accent: "#16a34a",
      text: "#ffffff",
      gradient: "from-red-600 via-amber-500 to-green-500"
    },
    decorations: {
      pattern: "dandiya",
      overlay: "garba",
      border: "festive"
    },
    bannerDefaults: {
      title: "Navratri Wellness Sale! 🔱",
      subtitle: "9 days of divine discounts - Energy & immunity boosters",
      badge: "Jai Mata Di",
      ctaText: "Shop Navratri Deals"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1601933973783-43cf8a7d4c5f?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "summer-sale",
    name: "Summer Sale",
    nameHindi: "गर्मी सेल",
    icon: "☀️",
    startDate: "04-15",
    endDate: "06-30",
    colors: {
      primary: "#f59e0b",
      secondary: "#0891b2",
      accent: "#fbbf24",
      text: "#ffffff",
      gradient: "from-amber-500 via-orange-400 to-cyan-500"
    },
    decorations: {
      pattern: "sun",
      overlay: "waves",
      border: "tropical"
    },
    bannerDefaults: {
      title: "Summer Health Sale! ☀️",
      subtitle: "Beat the heat with cool savings - Hydration & skincare specials",
      badge: "Hot Deals",
      ctaText: "Shop Summer Essentials"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&h=600&fit=crop&auto=format&q=90"
    ]
  },
  {
    id: "monsoon-sale",
    name: "Monsoon Sale",
    nameHindi: "मानसून सेल",
    icon: "🌧️",
    startDate: "07-01",
    endDate: "08-31",
    colors: {
      primary: "#0891b2",
      secondary: "#16a34a",
      accent: "#6366f1",
      text: "#ffffff",
      gradient: "from-cyan-600 via-teal-500 to-green-500"
    },
    decorations: {
      pattern: "raindrops",
      overlay: "clouds",
      border: "water"
    },
    bannerDefaults: {
      title: "Monsoon Wellness Sale! 🌧️",
      subtitle: "Stay healthy this rainy season - Immunity boosters & more",
      badge: "Rainy Savings",
      ctaText: "Shop Monsoon Deals"
    },
    stockImages: [
      "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=1920&h=600&fit=crop&auto=format&q=90"
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
    target_user_types: ["all"],
    target_devices: ["all"],
    target_locations: [],
    festival_theme: festival.id
  };
};
