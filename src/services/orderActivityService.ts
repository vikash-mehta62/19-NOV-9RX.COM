import { supabase } from "@/integrations/supabase/client";
import { OrderActivity, OrderActivityType } from "@/types/orderActivity";

export class OrderActivityService {
  static async logActivity(params: {
    orderId: string;
    activityType: OrderActivityType;
    description: string;
    performedBy?: string;
    performedByName?: string;
    performedByEmail?: string;
    oldData?: any;
    newData?: any;
    metadata?: any;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("🔵 Logging activity:", params);
      
      const { error } = await supabase.from("order_activities").insert({
        order_id: params.orderId,
        activity_type: params.activityType,
        description: params.description,
        performed_by: params.performedBy,
        performed_by_name: params.performedByName,
        performed_by_email: params.performedByEmail,
        old_data: params.oldData,
        new_data: params.newData,
        metadata: params.metadata,
      });

      if (error) {
        console.error("❌ Error logging order activity:", error);
        return { success: false, error: error.message };
      }

      console.log("✅ Activity logged successfully");
      return { success: true };
    } catch (error) {
      console.error("❌ Error in logActivity:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  static async getOrderActivities(
    orderId: string
  ): Promise<{ data: OrderActivity[] | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("order_activities")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching order activities:", error);
        return { data: null, error: error.message };
      }

      return { data: data as OrderActivity[] };
    } catch (error) {
      console.error("Error in getOrderActivities:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Log order creation
   */
  static async logOrderCreation(params: {
    orderId: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    paymentMethod: string;
    performedBy?: string;
    performedByName?: string;
    performedByEmail?: string;
  }) {
    console.log("🔵 Logging order creation:", params);
    return this.logActivity({
      orderId: params.orderId,
      activityType: "created",
      description: `Order #${params.orderNumber} created`,
      performedBy: params.performedBy,
      performedByName: params.performedByName,
      performedByEmail: params.performedByEmail,
      metadata: {
        order_number: params.orderNumber,
        total_amount: params.totalAmount,
        status: params.status,
        payment_method: params.paymentMethod,
      },
    });
  }

  /**
   * Log status change
   */
  static async logStatusChange(params: {
    orderId: string;
    orderNumber: string;
    oldStatus: string;
    newStatus: string;
    performedBy?: string;
    performedByName?: string;
    performedByEmail?: string;
  }) {
    console.log("🔵 Logging status change:", params);
    return this.logActivity({
      orderId: params.orderId,
      activityType: "status_changed",
      description: `Status changed from "${params.oldStatus}" to "${params.newStatus}"`,
      performedBy: params.performedBy,
      performedByName: params.performedByName,
      performedByEmail: params.performedByEmail,
      metadata: {
        order_number: params.orderNumber,
        old_status: params.oldStatus,
        new_status: params.newStatus,
      },
    });
  }

  /**
   * Log payment received
   */
  static async logPaymentReceived(params: {
    orderId: string;
    orderNumber: string;
    amount: number | string;
    paymentMethod: string;
    paymentId?: string;
    performedBy?: string;
    performedByName?: string;
    performedByEmail?: string;
  }) {
    console.log("🔵 Logging payment received:", params);
    const amountNum = typeof params.amount === 'string' ? parseFloat(params.amount) : params.amount;
    return this.logActivity({
      orderId: params.orderId,
      activityType: "payment_received",
      description: `Payment of $${amountNum.toFixed(2)} received via ${params.paymentMethod}`,
      performedBy: params.performedBy,
      performedByName: params.performedByName,
      performedByEmail: params.performedByEmail,
      metadata: {
        order_number: params.orderNumber,
        payment_amount: amountNum,
        payment_method: params.paymentMethod,
        payment_id: params.paymentId,
      },
    });
  }

  /**
   * Log order update
   */
  static async logOrderUpdate(params: {
    orderId: string;
    orderNumber: string;
    description: string;
    oldData?: any;
    newData?: any;
    performedBy?: string;
    performedByName?: string;
    performedByEmail?: string;
  }) {
    console.log("🔵 Logging order update:", params);
    return this.logActivity({
      orderId: params.orderId,
      activityType: "updated",
      description: params.description,
      performedBy: params.performedBy,
      performedByName: params.performedByName,
      performedByEmail: params.performedByEmail,
      oldData: params.oldData,
      newData: params.newData,
      metadata: {
        order_number: params.orderNumber,
      },
    });
  }

  /**
   * Log order void
   */
  static async logOrderVoid(params: {
    orderId: string;
    orderNumber: string;
    reason?: string;
    performedBy?: string;
    performedByName?: string;
    performedByEmail?: string;
  }) {
    console.log("🔵 Logging order void:", params);
    return this.logActivity({
      orderId: params.orderId,
      activityType: "voided",
      description: params.reason
        ? `Order voided: ${params.reason}`
        : "Order voided",
      performedBy: params.performedBy,
      performedByName: params.performedByName,
      performedByEmail: params.performedByEmail,
      metadata: {
        order_number: params.orderNumber,
        reason: params.reason,
      },
    });
  }

  /**
   * Log note added
   */
  static async logNoteAdded(params: {
    orderId: string;
    orderNumber: string;
    note: string;
    performedBy?: string;
    performedByName?: string;
    performedByEmail?: string;
  }) {
    console.log("🔵 Logging note added:", params);
    return this.logActivity({
      orderId: params.orderId,
      activityType: "note_added",
      description: `Note added: ${params.note}`,
      performedBy: params.performedBy,
      performedByName: params.performedByName,
      performedByEmail: params.performedByEmail,
      metadata: {
        order_number: params.orderNumber,
        note: params.note,
      },
    });
  }
}
