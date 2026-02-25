// Default pharmacy banners with professional designs - Premium Quality
export const defaultBanners = [
  {
    id: "banner-1",
    title: "Your Health, Our Priority",
    subtitle: "Premium pharmaceutical supplies trusted by 10,000+ healthcare professionals",
    image_url: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1920&h=600&fit=crop&auto=format&q=90",
    mobile_image_url: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=768&h=500&fit=crop&auto=format&q=90",
    link_url: "/pharmacy/products",
    link_text: "Shop Now",
    banner_type: "hero",
    background_color: "#0d9488",
    text_color: "#ffffff",
    overlay_opacity: 0.55,
    display_order: 1,
    is_active: false, // Banners are inactive by default - admin must activate them
    target_user_types: ["all"],
    target_devices: ["all"],
    target_locations: [],
    description: "Premium healthcare banner with modern medical aesthetic"
  },
  {
    id: "banner-2", 
    title: "Lightning Fast Delivery",
    subtitle: "Same-day dispatch • Free shipping on orders ₹500+ • Track in real-time",
    image_url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1920&h=600&fit=crop&auto=format&q=90",
    mobile_image_url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=768&h=500&fit=crop&auto=format&q=90",
    link_url: "/pharmacy/products",
    link_text: "Order Now",
    banner_type: "hero",
    background_color: "#0891b2",
    text_color: "#ffffff", 
    overlay_opacity: 0.5,
    display_order: 2,
    is_active: false, // Banners are inactive by default - admin must activate them
    target_user_types: ["pharmacy", "hospital"],
    target_devices: ["all"],
    target_locations: [],
    description: "Fast delivery banner highlighting logistics excellence"
  },
  {
    id: "banner-3",
    title: "Mega Sale - Up to 40% OFF",
    subtitle: "Limited time offer on essential medicines & healthcare products",
    image_url: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=1920&h=600&fit=crop&auto=format&q=90",
    mobile_image_url: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=768&h=500&fit=crop&auto=format&q=90",
    link_url: "/pharmacy/products",
    link_text: "Grab Deals",
    banner_type: "hero",
    background_color: "#14b8a6",
    text_color: "#ffffff",
    overlay_opacity: 0.45,
    display_order: 3,
    is_active: false, // Banners are inactive by default - admin must activate them
    target_user_types: ["all"],
    target_devices: ["all"],
    target_locations: [],
    description: "Promotional sale banner with vibrant colors"
  }
];

// Banner design templates for easy customization
export const bannerDesignTemplates = [
  {
    id: "medical-professional",
    name: "Medical Professional",
    category: "Healthcare",
    preview: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=200&fit=crop&auto=format",
    colors: {
      primary: "#0d9488",
      secondary: "#14b8a6", 
      text: "#ffffff",
      accent: "#5eead4"
    },
    fonts: {
      heading: "font-bold text-4xl md:text-5xl",
      subtitle: "font-medium text-lg md:text-xl"
    },
    layout: "center",
    overlay: 0.55
  },
  {
    id: "delivery-express",
    name: "Express Delivery",
    category: "Logistics",
    preview: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=200&fit=crop&auto=format",
    colors: {
      primary: "#0891b2",
      secondary: "#06b6d4",
      text: "#ffffff", 
      accent: "#67e8f9"
    },
    fonts: {
      heading: "font-bold text-3xl md:text-4xl",
      subtitle: "font-normal text-base md:text-lg"
    },
    layout: "left",
    overlay: 0.5
  },
  {
    id: "promotional-sale",
    name: "Sale & Offers",
    category: "Promotions",
    preview: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400&h=200&fit=crop&auto=format",
    colors: {
      primary: "#14b8a6",
      secondary: "#2dd4bf",
      text: "#ffffff",
      accent: "#99f6e4"
    },
    fonts: {
      heading: "font-extrabold text-4xl md:text-6xl",
      subtitle: "font-semibold text-lg md:text-2xl"
    },
    layout: "center",
    overlay: 0.45
  },
  {
    id: "wellness-calm",
    name: "Wellness & Care",
    category: "Healthcare",
    preview: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=200&fit=crop&auto=format",
    colors: {
      primary: "#0f766e",
      secondary: "#0d9488",
      text: "#ffffff",
      accent: "#5eead4"
    },
    fonts: {
      heading: "font-semibold text-3xl md:text-5xl",
      subtitle: "font-light text-lg md:text-xl"
    },
    layout: "center",
    overlay: 0.4
  }
];

// Pharmacy-specific stock images - High Quality
export const pharmacyStockImages = [
  {
    category: "Medical & Healthcare",
    images: [
      {
        url: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1920&h=600&fit=crop&auto=format&q=90",
        mobile: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=768&h=500&fit=crop&auto=format&q=90",
        description: "Colorful medicine capsules"
      },
      {
        url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1920&h=600&fit=crop&auto=format&q=90", 
        mobile: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=768&h=500&fit=crop&auto=format&q=90",
        description: "Doctor with stethoscope"
      },
      {
        url: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=1920&h=600&fit=crop&auto=format&q=90",
        mobile: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=768&h=500&fit=crop&auto=format&q=90",
        description: "Medical pills and tablets"
      }
    ]
  },
  {
    category: "Delivery & Logistics",
    images: [
      {
        url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1920&h=600&fit=crop&auto=format&q=90",
        mobile: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=768&h=500&fit=crop&auto=format&q=90", 
        description: "Package delivery boxes"
      },
      {
        url: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=1920&h=600&fit=crop&auto=format&q=90",
        mobile: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=768&h=500&fit=crop&auto=format&q=90",
        description: "Delivery truck logistics"
      }
    ]
  },
  {
    category: "Pharmacy & Products",
    images: [
      {
        url: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=1920&h=600&fit=crop&auto=format&q=90",
        mobile: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=768&h=500&fit=crop&auto=format&q=90",
        description: "Medical supplies arrangement"
      },
      {
        url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1920&h=600&fit=crop&auto=format&q=90",
        mobile: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=768&h=500&fit=crop&auto=format&q=90",
        description: "Pharmacy medicine bottles"
      },
      {
        url: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=1920&h=600&fit=crop&auto=format&q=90",
        mobile: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=768&h=500&fit=crop&auto=format&q=90",
        description: "Healthcare products display"
      }
    ]
  }
];
