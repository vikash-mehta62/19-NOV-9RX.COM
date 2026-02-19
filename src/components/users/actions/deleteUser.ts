
import { supabase } from "@/supabaseClient";
import { toast } from "@/hooks/use-toast";
import axios from "../../../../axiosconfig";

export const deleteUser = async (userId: string, userName: string): Promise<boolean> => {
  try {
    console.log('Starting delete operation for user:', userId);
    
    // First check if user exists and has dependencies
    const { data: userToDelete, error: deleteCheckError } = await supabase
      .from('profiles')
      .select(`
        id,
        type,
        locations (id),
        documents
      `)
      .eq('id', userId)
      .single();
    
    if (deleteCheckError) {
      console.error('Error checking user:', deleteCheckError);
      throw new Error('Failed to verify user status');
    }

    if (!userToDelete) {
      throw new Error('User not found');
    }

    // Check for orders (critical dependency)
    const { data: userOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('profile_id', userId)
      .limit(5); // Get up to 5 orders to show
    
    if (ordersError) {
      console.error('Error checking orders:', ordersError);
      throw new Error('Failed to check user dependencies');
    }

    if (userOrders && userOrders.length > 0) {
      const orderNumbers = userOrders.map(o => o.order_number).join(', ');
      const moreOrders = userOrders.length === 5 ? ' and more' : '';
      
      throw new Error(
        `Cannot delete ${userName} because they have existing orders (${orderNumbers}${moreOrders}). ` +
        'Users with order history cannot be deleted to maintain data integrity.'
      );
    }

    // Delete associated locations if any
    if (userToDelete.locations && userToDelete.locations.length > 0) {
      console.log(`Deleting ${userToDelete.locations.length} locations...`);
      const { error: locationDeleteError } = await supabase
        .from('locations')
        .delete()
        .in('id', userToDelete.locations.map((loc: any) => loc.id));

      if (locationDeleteError) {
        console.error('Error deleting user locations:', locationDeleteError);
        throw new Error('Failed to remove user locations.');
      }
      console.log('✅ Locations deleted successfully');
    }

    // Delete associated documents if any
    if (userToDelete.documents && Array.isArray(userToDelete.documents) && userToDelete.documents.length > 0) {
      console.log(`Deleting ${userToDelete.documents.length} documents...`);
      const { error: documentsDeleteError } = await supabase
        .from('documents')
        .delete()
        .in('id', userToDelete.documents);

      if (documentsDeleteError) {
        console.error('Error deleting user documents:', documentsDeleteError);
        throw new Error('Failed to remove user documents.');
      }
      console.log('✅ Documents deleted successfully');
    }

    // Attempt to delete the user from profiles
    console.log('Deleting user from profiles table...');
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Delete operation failed:', deleteError);
      
      // Check if it's a foreign key constraint error
      if (deleteError.code === '23503') {
        throw new Error(
          `Cannot delete ${userName} because they have associated data (orders, transactions, etc.). ` +
          'Users with transaction history cannot be deleted to maintain data integrity.'
        );
      }
      
      throw new Error(deleteError.message || 'Failed to delete user');
    }
    console.log('✅ User deleted from profiles table');

    // Delete from Supabase Auth using secure backend API
    console.log('Deleting user from auth.users...');
    try {
      const response = await axios.delete(`/api/users/delete-user/${userId}`);
      
      if (!response.data?.success) {
        console.error("Error deleting auth user:", response.data?.message);
        console.error("Error details:", response.data?.error);
        // Don't throw here - profile is already deleted
        toast({
          title: "Partial Success",
          description: `User profile deleted but auth cleanup failed: ${response.data?.message}`,
          variant: "destructive",
        });
        return true; // Still return true since profile is deleted
      }
      
      // Check if user was already deleted
      if (response.data?.alreadyDeleted || response.data?.note) {
        console.log("✅ Auth user was already deleted:", response.data?.message);
      } else {
        console.log('✅ User deleted from auth.users');
      }
    } catch (authDeleteError: any) {
      console.error("Auth delete error:", authDeleteError);
      console.error("Auth delete error response:", authDeleteError?.response?.data);
      // Profile is already deleted, log but don't fail
      const errorMsg = authDeleteError?.response?.data?.message || authDeleteError.message;
      toast({
        title: "Partial Success",
        description: `User profile deleted but auth cleanup encountered an issue: ${errorMsg}`,
        variant: "destructive",
      });
      return true; // Still return true since profile is deleted
    }

    console.log('✅ User deleted successfully from both profiles and auth');
    toast({
      title: "Success",
      description: `${userName} has been deleted completely`,
    });
    
    return true;
  } catch (error) {
    console.error('Delete error:', error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "An unexpected error occurred",
      variant: "destructive",
    });
    return false;
  }
};
