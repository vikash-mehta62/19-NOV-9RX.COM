import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'order' | 'payment' | 'automation';
  read: boolean;
  link?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

/**
 * Create a notification in the database
 */
export async function createNotification(notification: {
  user_id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'order' | 'payment' | 'automation';
  link?: string;
  metadata?: any;
}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      ...notification,
      type: notification.type || 'info',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Notification;
}

/**
 * Get notifications for current user
 */
export async function getNotifications(filters?: {
  read?: boolean;
  type?: string;
  limit?: number;
}) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false });

  if (filters?.read !== undefined) {
    query = query.eq('read', filters.read);
  }
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Notification[];
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead() {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.user.id)
    .eq('read', false);

  if (error) throw error;
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount() {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.user.id)
    .eq('read', false);

  if (error) throw error;
  return count || 0;
}
