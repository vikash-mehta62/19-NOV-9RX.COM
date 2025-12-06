export type OrderActivityType = 
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'payment_received'
  | 'payment_updated'
  | 'cancelled'
  | 'voided'
  | 'note_added'
  | 'items_updated';

export interface OrderActivity {
  id: string;
  order_id: string;
  activity_type: OrderActivityType;
  description: string;
  performed_by?: string;
  performed_by_name?: string;
  performed_by_email?: string;
  old_data?: any;
  new_data?: any;
  metadata?: {
    order_number?: string;
    total_amount?: number;
    status?: string;
    payment_method?: string;
    old_status?: string;
    new_status?: string;
    old_payment_status?: string;
    new_payment_status?: string;
    payment_amount?: number;
    payment_id?: string;
    note?: string;
    reason?: string;
    [key: string]: any;
  };
  created_at: string;
}
