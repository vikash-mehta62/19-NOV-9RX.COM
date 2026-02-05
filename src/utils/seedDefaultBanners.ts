import { supabase } from "@/integrations/supabase/client";
import { defaultBanners } from "@/data/defaultBanners";

export const seedDefaultBanners = async (forceReseed = false) => {
  try {
    // Check if banners already exist
    const { data: existingBanners, error: checkError } = await supabase
      .from("banners")
      .select("id")
      .limit(1);

    if (checkError) {
      console.error("Error checking existing banners:", checkError);
      return { success: false, error: checkError.message };
    }

    // If banners already exist and not forcing reseed, skip
    if (existingBanners && existingBanners.length > 0 && !forceReseed) {
      console.log("Banners already exist, skipping seed");
      return { success: true, message: "Banners already exist", skipped: true };
    }

    // If forcing reseed, delete existing banners first
    if (forceReseed && existingBanners && existingBanners.length > 0) {
      const { error: deleteError } = await supabase
        .from("banners")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
      
      if (deleteError) {
        console.warn("Could not delete existing banners:", deleteError);
      }
    }

    // Prepare banner data for insertion
    const bannersToInsert = defaultBanners.map((banner) => ({
      title: banner.title,
      subtitle: banner.subtitle,
      image_url: banner.image_url,
      link_url: banner.link_url,
      link_text: banner.link_text,
      display_order: banner.display_order,
      is_active: banner.is_active
    }));

    // Insert default banners
    const { data, error } = await supabase
      .from("banners")
      .insert(bannersToInsert)
      .select();

    if (error) {
      console.error("Error seeding banners:", error);
      return { success: false, error: error.message };
    }

    console.log("Successfully seeded default banners:", data);
    return { 
      success: true, 
      message: `Successfully created ${data?.length || 0} professional banners!`,
      data 
    };

  } catch (error: any) {
    console.error("Unexpected error seeding banners:", error);
    return { success: false, error: error.message };
  }
};

export const createSampleBanner = async (bannerData: any) => {
  try {
    const { data, error } = await supabase
      .from("banners")
      .insert([bannerData])
      .select()
      .single();

    if (error) {
      console.error("Error creating banner:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Unexpected error creating banner:", error);
    return { success: false, error: error.message };
  }
};

export const updateBannerImages = async () => {
  // Update existing banners with new high-quality images
  try {
    for (const banner of defaultBanners) {
      await supabase
        .from("banners")
        .update({
          image_url: banner.image_url,
          mobile_image_url: banner.mobile_image_url,
          overlay_opacity: banner.overlay_opacity,
          background_color: banner.background_color
        })
        .ilike("title", `%${banner.title.split(' ')[0]}%`);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
