import { OrderFormValues } from "../schemas/orderSchema";

interface OrderPaymentInfoProps {
  payment: OrderFormValues['payment'];
  specialInstructions?: string;
}

export function OrderPaymentInfo({ payment, specialInstructions }: OrderPaymentInfoProps) {
  return (
    <div className="space-y-4 hidden">
      <div className="space-y-2">
        <h3 className="font-semibold">Payment Details</h3>
        <p>Method: {payment.method}</p>
        {payment.notes && <p>Notes: {payment.notes}</p>}
      </div>

      {specialInstructions && (
        <div className="space-y-2">
          <h3 className="font-semibold">Special Instructions</h3>
          <p className="text-sm">{specialInstructions}</p>
        </div>
      )}
    </div>
  );
}