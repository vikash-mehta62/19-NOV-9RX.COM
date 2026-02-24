import { supabase } from "@/supabaseClient";

export interface CategoryConfig {
  id: string;
  category_name: string;
  display_order: number;
  image_url?: string;
}

/**
 * Fetch categories from database ordered by display_order
 * New categories will appear at the end (display_order = 999)
 */
export const fetchCategories = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('category_configs')
      .select('category_name, display_order')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return data?.map(item => item.category_name) || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

/**
 * Fetch full category configs including display_order
 */
export const fetchCategoryConfigs = async (): Promise<CategoryConfig[]> => {
  try {
    const { data, error } = await supabase
      .from('category_configs')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching category configs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching category configs:', error);
    return [];
  }
};

/**
 * Update category display order
 */
export const updateCategoryOrder = async (categoryId: string, newOrder: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('category_configs')
      .update({ display_order: newOrder })
      .eq('id', categoryId);

    if (error) {
      console.error('Error updating category order:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating category order:', error);
    return false;
  }
};

/**
 * Bulk update category orders (for drag-and-drop reordering)
 */
export const bulkUpdateCategoryOrders = async (updates: { id: string; display_order: number }[]): Promise<boolean> => {
  try {
    console.log('Starting bulk update with:', updates);
    
    const promises = updates.map(({ id, display_order }) =>
      supabase
        .from('category_configs')
        .update({ display_order })
        .eq('id', id)
    );

    const results = await Promise.all(promises);
    
    // Check each result for errors
    const errors = results.filter(result => result.error);
    
    if (errors.length > 0) {
      console.error('Errors in bulk update:', errors);
      errors.forEach((err, idx) => {
        console.error(`Update ${idx} failed:`, err.error);
      });
      return false;
    }

    // Log successful updates
    console.log('All updates successful:', results.map(r => r.data));
    return true;
  } catch (error) {
    console.error('Error bulk updating category orders:', error);
    return false;
  }
};
