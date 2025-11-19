import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import { User } from "@/components/users/UsersTable";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function fetchUsers() {
  console.log('Starting fetchUsers function...');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('No active session found');
    throw new Error('Not authenticated');
  }

  console.log('Current user session:', {
    id: session.user.id,
    email: session.user.email,
    metadata: session.user.user_metadata
  });

  // First get the user's profile to check role directly
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')  // Select all fields to see complete profile data
    .eq('id', session.user.id)
    .single();

  console.log('Complete user profile:', userProfile);
  console.log('Profile fetch error:', profileError);

  if (profileError) {
    console.error('Error fetching user profile:', profileError);
    throw new Error(`Failed to fetch user profile: ${profileError.message}`);
  }

  if (!userProfile) {
    console.error('No user profile found');
    throw new Error('User profile not found');
  }

  console.log('User role check:', {
    role: userProfile.role,
    isAdmin: userProfile.role === 'admin'
  });

  if (userProfile.role !== 'admin') {
    console.error('Access denied - Current user role:', userProfile.role);
    throw new Error(`Unauthorized: Admin access required. Current role: ${userProfile.role}`);
  }

  console.log('Admin check passed, fetching profiles...');

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase error:', error);
    throw error;
  }

  if (!profiles) {
    console.log('No profiles found');
    return [];
  }

  console.log('Successfully fetched profiles:', profiles);

  return profiles.map(profile => ({
    id: profile.id,
    name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
    email: profile.email || '',
    locations : 10,
    type: profile.type || "Pharmacy",
    status: profile.status || "pending",
    role: profile.role || "user",
    lastActive: profile.last_sign_in_at 
      ? new Date(profile.last_sign_in_at).toISOString().split('T')[0]
      : new Date(profile.created_at).toISOString().split('T')[0],
    phone: profile.mobile_phone || '',
  }));
}

export function useUsers() {
  const { toast } = useToast();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 1000 * 60, // Consider data fresh for 1 minute
    retry: 2,
    meta: {
      onError: (error: Error) => {
        console.error('Error in useUsers query:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch users",
          variant: "destructive",
        });
      },
    },
  });

  // Set up real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          console.log('Profile change detected, invalidating query cache...');
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

const filteredUsers = users.filter((user) => {
  const isNotVendor = user.type.toLowerCase() !== "vendor";
  const matchesSearch =
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesType = filterType === "all" || user.type.toLowerCase() === filterType.toLowerCase();
  const matchesStatus = filterStatus === "all" || user.status.toLowerCase() === filterStatus.toLowerCase();
  return  matchesSearch && matchesType && matchesStatus;
});


  
  // Update User Mutation
  type UserUpdate = {
    id: string;
    name?: string;
    email?: string;
    type?: string;
    status?: string;
    role?: string;
    phone?: string;
  };
  
  const updateUserMutation = useMutation({
    mutationFn: async (updatedUser: UserUpdate) => {
      const { error } = await supabase
        .from("profiles")
        .update(updatedUser)
        .eq("id", updatedUser.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });

    },
  });
  


  return {
    users: filteredUsers,
    isLoading,
    error,
    selectedUsers,
    searchTerm,
    filterType,
    filterStatus,
    setSelectedUsers,
    setSearchTerm,
    setFilterType,
    setFilterStatus,
    updateUserMutation
  };
}
