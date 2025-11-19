import { OrderFormValues } from "../schemas/orderSchema";

interface OrderCustomerInfoProps {
  customerInfo?: OrderFormValues["customerInfo"];
  shippingAddress?: OrderFormValues["shippingAddress"];
  componyName?: string;
  poIs?: boolean;
}

export function OrderCustomerInfo({
  customerInfo,
  shippingAddress,
  componyName,
  poIs
}: OrderCustomerInfoProps) {

  console.log(customerInfo, "customerInfo check")
  if (!customerInfo) {
    return <div>No customer information available</div>;
  }

  console.log(shippingAddress);
  console.log(customerInfo, "info");

  return (
    <div className="space-y-4 p-4 border rounded-lg shadow-md bg-white">
      {/* Billing Information */}
      <h3 className="font-semibold text-lg">Vendor Address</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <p>
          <span className="font-medium">Name:</span>{" "}
          {customerInfo?.name || "N/A"}
        </p>
        <p>
          <span className="font-medium">Email:</span>{" "}
          {customerInfo?.email || "N/A"}
        </p>
        <p>
          <span className="font-medium">Phone:</span>{" "}
          {customerInfo?.phone || "N/A"}
        </p>
        <p>
          <span className="font-medium">Type:</span>{" "}
{poIs ? "Vendor" : (customerInfo?.type || "N/A")}
         
        </p>
        {componyName && (
          <p>
            <span className="font-medium">Company:</span> {componyName}
          </p>
        )}
      </div>
      <div className="text-sm">
        <p> 
          <span className="font-medium">Address:</span>{" "}
          {customerInfo?.address?.street || "N/A"}
        </p>
        <p>
          {customerInfo?.address?.city && customerInfo?.address?.state
            ? `${customerInfo.address.city}, ${customerInfo.address.state} ${
                customerInfo?.address.zip_code || ""
              }`
            : "No address provided"}
        </p>
      </div>

      {/* Shipping Information */}
      <h3 className="font-semibold text-lg">Shipping Information</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <p>
          <span className="font-medium">Name:</span>{" "}
          {shippingAddress?.fullName || "N/A"}
        </p>
        <p>
          <span className="font-medium">Email:</span>{" "}
          {shippingAddress?.email || "N/A"}
        </p>
        <p>
          <span className="font-medium">Phone:</span>{" "}
          {shippingAddress?.phone || "N/A"}
        </p>
        {componyName && (
          <p>
            <span className="font-medium">Company:</span> {componyName}
          </p>
        )}
      </div>
      <div className="text-sm">
        <p>
          <span className="font-medium">Address:</span>{" "}
          {shippingAddress?.address?.street || "N/A"}
        </p>
        <p>
          {shippingAddress?.address?.city && shippingAddress?.address?.state
            ? `${shippingAddress.address.city}, ${
                shippingAddress.address.state
              } ${shippingAddress?.address.zip_code || ""}`
            : "No address provided"}
        </p>
      </div>
    </div>
  );
}
