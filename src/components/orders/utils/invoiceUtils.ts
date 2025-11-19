
import { Invoice } from "../../invoices/types/invoice.types";
import { OrderFormValues } from "../schemas/orderSchema";
import { v4 as uuidv4 } from 'uuid';

export const createInvoiceFromOrder = (orderData: OrderFormValues): Invoice => {
  console.log('Creating invoice from order:', orderData);
  
  const subtotal = orderData.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
  const tax_amount = subtotal * 0.06; // 6% tax rate
  const total_amount = subtotal + tax_amount;

  const invoice: Invoice = {
    id: uuidv4(),
    invoice_number: `INV-${uuidv4().slice(0, 8)}`,
    order_id: orderData.id,
    profile_id: null,
    status: "pending",
    amount: total_amount,
    tax_amount,
    total_amount,
    payment_status:orderData.payment_status,

    payment_method: null,
    payment_notes: null,
    due_date: new Date().toISOString().split('T')[0],
    items: orderData.items?.map((item) => ({
      id: uuidv4(),
      description: `Product ${item.productId}`,
      quantity: item.quantity,
      rate: item.price,
      amount: item.price * item.quantity
    })) || [],
    customer_info: {
      name: orderData.customerInfo?.name || '',
      phone: orderData.customerInfo?.phone || '',
      email: orderData.customerInfo?.email || ''
    },
    shipping_info: {
      name: orderData.shippingAddress?.fullName || orderData.customerInfo?.name || '',
      phone: orderData.customerInfo?.phone || '',
      email: orderData.customerInfo?.email || ''
    },
    subtotal,
  };

  console.log('Created invoice:', invoice);
  return invoice;
};
