import { supabase } from '@/integrations/supabase/client';
import { createNotification } from './notificationService';

// =====================================================
// ALERT SYSTEM
// =====================================================

export interface Alert {
  id: string;
  alert_type_id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'inventory' | 'orders' | 'customers' | 'system';
  entity_type?: string;
  entity_id?: string;
  metadata?: any;
  is_read: boolean;
  is_resolved: boolean;
  resolved_at?: string;
  created_at: string;
  expires_at?: string;
}

export interface AlertStats {
  total: number;
  unread: number;
  critical: number;
  warning: number;
  info: number;
  byCategory: {
    inventory: number;
    orders: number;
    customers: number;
    system: number;
  };
}

/**
 * Get all alerts with optional filters
 */
export async function getAlerts(filters?: {
  severity?: string;
  category?: string;
  isRead?: boolean;
  isResolved?: boolean;
  limit?: number;
}) {
  let query = supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.severity) {
    query = query.eq('severity', filters.severity);
  }
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.isRead !== undefined) {
    query = query.eq('is_read', filters.isRead);
  }
  if (filters?.isResolved !== undefined) {
    query = query.eq('is_resolved', filters.isResolved);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Alert[];
}

/**
 * Get alert statistics
 */
export async function getAlertStats(): Promise<AlertStats> {
  const { data: alerts, error } = await supabase
    .from('alerts')
    .select('severity, category, is_read, is_resolved')
    .eq('is_resolved', false);

  if (error) throw error;

  const stats: AlertStats = {
    total: alerts?.length || 0,
    unread: alerts?.filter(a => !a.is_read).length || 0,
    critical: alerts?.filter(a => a.severity === 'critical').length || 0,
    warning: alerts?.filter(a => a.severity === 'warning').length || 0,
    info: alerts?.filter(a => a.severity === 'info').length || 0,
    byCategory: {
      inventory: alerts?.filter(a => a.category === 'inventory').length || 0,
      orders: alerts?.filter(a => a.category === 'orders').length || 0,
      customers: alerts?.filter(a => a.category === 'customers').length || 0,
      system: alerts?.filter(a => a.category === 'system').length || 0,
    },
  };

  return stats;
}

/**
 * Mark alert as read
 */
export async function markAlertAsRead(alertId: string) {
  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('id', alertId);

  if (error) throw error;
}

/**
 * Mark all alerts as read
 */
export async function markAllAlertsAsRead() {
  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('is_read', false);

  if (error) throw error;
}

/**
 * Resolve alert
 */
export async function resolveAlert(alertId: string, userId: string) {
  const { error } = await supabase
    .from('alerts')
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
    })
    .eq('id', alertId);

  if (error) throw error;

  // Log the action
  await supabase.from('alert_history').insert({
    alert_id: alertId,
    action: 'resolved',
    performed_by: userId,
  });
}

/**
 * Create manual alert
 */
export async function createAlert(alert: {
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'inventory' | 'orders' | 'customers' | 'system';
  entity_type?: string;
  entity_id?: string;
  metadata?: any;
}) {
  const { data, error } = await supabase
    .from('alerts')
    .insert(alert)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// AUTOMATION RULES
// =====================================================

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  trigger_type: string;
  trigger_conditions: any;
  action_type: string;
  action_config: any;
  is_active: boolean;
  priority: number;
  last_triggered_at?: string;
  trigger_count: number;
  created_at: string;
}

/**
 * Get all automation rules
 */
export async function getAutomationRules() {
  const { data, error } = await supabase
    .from('automation_rules')
    .select('*')
    .order('priority', { ascending: false });

  if (error) throw error;
  return data as AutomationRule[];
}

/**
 * Create automation rule
 */
export async function createAutomationRule(rule: {
  name: string;
  description?: string;
  trigger_type: string;
  trigger_conditions: any;
  action_type: string;
  action_config: any;
  priority?: number;
}) {
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('automation_rules')
    .insert({
      ...rule,
      created_by: user.user?.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Create notification for automation rule creation
  if (user.user?.id) {
    try {
      await createNotification({
        user_id: user.user.id,
        title: '🤖 Automation Rule Created',
        message: `"${rule.name}" has been created successfully. The system will monitor and execute this rule automatically.`,
        type: 'automation',
        metadata: {
          rule_id: data.id,
          rule_name: rule.name,
          trigger_type: rule.trigger_type,
          action: 'created',
        },
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }
  }

  return data;
}

/**
 * Update automation rule
 */
export async function updateAutomationRule(ruleId: string, updates: Partial<AutomationRule>) {
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('automation_rules')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ruleId)
    .select()
    .single();

  if (error) throw error;

  // Create notification for automation rule update
  if (user.user?.id) {
    try {
      await createNotification({
        user_id: user.user.id,
        title: '✏️ Automation Rule Updated',
        message: `"${data.name}" has been updated successfully. Changes will take effect immediately.`,
        type: 'automation',
        metadata: {
          rule_id: data.id,
          rule_name: data.name,
          action: 'updated',
        },
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }
  }

  return data;
}

/**
 * Delete automation rule
 */
export async function deleteAutomationRule(ruleId: string) {
  const { data: user } = await supabase.auth.getUser();
  
  // Get rule details before deletion for notification
  const { data: rule } = await supabase
    .from('automation_rules')
    .select('name')
    .eq('id', ruleId)
    .single();

  const { error } = await supabase
    .from('automation_rules')
    .delete()
    .eq('id', ruleId);

  if (error) throw error;

  // Create notification for automation rule deletion
  if (user.user?.id && rule) {
    try {
      await createNotification({
        user_id: user.user.id,
        title: '🗑️ Automation Rule Deleted',
        message: `"${rule.name}" has been deleted successfully. This rule will no longer execute.`,
        type: 'automation',
        metadata: {
          rule_id: ruleId,
          rule_name: rule.name,
          action: 'deleted',
        },
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }
  }
}

/**
 * Toggle automation rule
 */
export async function toggleAutomationRule(ruleId: string, isActive: boolean) {
  const { data: user } = await supabase.auth.getUser();
  
  const result = await updateAutomationRule(ruleId, { is_active: isActive });

  // Create notification for automation rule toggle
  if (user.user?.id && result) {
    try {
      await createNotification({
        user_id: user.user.id,
        title: isActive ? '▶️ Automation Rule Activated' : '⏸️ Automation Rule Paused',
        message: `"${result.name}" has been ${isActive ? 'activated' : 'paused'}. ${isActive ? 'The rule will now execute automatically.' : 'The rule will not execute until reactivated.'}`,
        type: 'automation',
        metadata: {
          rule_id: result.id,
          rule_name: result.name,
          action: isActive ? 'activated' : 'paused',
          is_active: isActive,
        },
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }
  }

  return result;
}

// =====================================================
// AUTO-REORDER CONFIGURATION
// =====================================================

export interface AutoReorderConfig {
  id: string;
  product_id: string;
  is_enabled: boolean;
  reorder_point: number;
  reorder_quantity: number;
  supplier_id?: string;
  lead_time_days: number;
  last_reorder_date?: string;
}

/**
 * Get auto-reorder configurations
 */
export async function getAutoReorderConfigs() {
  const { data, error } = await supabase
    .from('auto_reorder_config')
    .select(`
      *,
      products(id, name, current_stock)
    `);

  if (error) throw error;
  return data;
}

/**
 * Create or update auto-reorder config
 */
export async function upsertAutoReorderConfig(config: {
  product_id: string;
  is_enabled: boolean;
  reorder_point: number;
  reorder_quantity: number;
  supplier_id?: string;
  lead_time_days?: number;
}) {
  const { data, error } = await supabase
    .from('auto_reorder_config')
    .upsert({
      ...config,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete auto-reorder config
 */
export async function deleteAutoReorderConfig(productId: string) {
  const { error } = await supabase
    .from('auto_reorder_config')
    .delete()
    .eq('product_id', productId);

  if (error) throw error;
}

// =====================================================
// AUTOMATION EXECUTION
// =====================================================

/**
 * Execute automation rules manually
 */
export async function executeAutomationRules() {
  // Trigger low stock check
  const { error: stockError } = await supabase.rpc('check_low_stock_alerts');
  if (stockError) console.error('Stock check error:', stockError);

  // Trigger high value order check
  const { error: orderError } = await supabase.rpc('check_high_value_orders');
  if (orderError) console.error('Order check error:', orderError);

  // Trigger auto-reorder
  const { error: reorderError } = await supabase.rpc('trigger_auto_reorder');
  if (reorderError) console.error('Reorder error:', reorderError);
}
