
import { supabase } from "@/supabaseClient";
import { toast } from "@/hooks/use-toast";
import axios from "../../../../axiosconfig";

export const deleteUser = async (userId: string, userName: string): Promise<boolean> => {
  try {
    console.log('Starting delete operation for user:', userId);
    

   
    // First check if user exists and has no dependencies
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


        // Delete associated locations if any
        if (userToDelete.locations && userToDelete.locations.length > 0) {
          const { error: locationDeleteError } = await supabase
            .from('locations')
            .delete()
            .in('id', userToDelete.locations.map((loc: any) => loc.id));
    
          if (locationDeleteError) {
            console.error('Error deleting user locations:', locationDeleteError);
            throw new Error('Failed to remove user locations.');
          }
        }
    
        // Delete associated documents if any
        if (userToDelete.documents && Array.isArray(userToDelete.documents) && userToDelete.documents.length > 0) {
          const { error: documentsDeleteError } = await supabase
            .from('documents')
            .delete()
            .in('id', userToDelete.documents);
    
          if (documentsDeleteError) {
            console.error('Error deleting user documents:', documentsDeleteError);
            throw new Error('Failed to remove user documents.');
          }
        }

        
    // Check for dependencies
    const hasLocations = userToDelete.locations && userToDelete.locations.length > 0;
    const hasDocuments = userToDelete.documents && Array.isArray(userToDelete.documents) && userToDelete.documents.length > 0;

    if (hasLocations || hasDocuments) {
      throw new Error(
        'Cannot delete user with existing locations or documents. ' +
        'Please remove associated data first.'
      );
    }

    // Attempt to delete the user from profiles
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Delete operation failed:', deleteError);
      throw new Error(deleteError.message || 'Failed to delete user');
    }

    // Delete from Supabase Auth using secure backend API
    try {
      const response = await axios.delete(`/api/users/delete-user/${userId}`);
      
      if (!response.data?.success) {
        console.error("Error deleting auth user:", response.data?.message);
        // Don't throw here - profile is already deleted
      }
    } catch (authDeleteError) {
      console.error("Auth delete error:", authDeleteError);
      // Profile is already deleted, log but don't fail
    }

    console.log('User deleted successfully:', userId);
    toast({
      title: "Success",
      description: `${userName} has been deleted`,
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
