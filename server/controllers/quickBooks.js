const axios = require("axios")
const refreshQuickBooksToken = async () => {
    const clientId = "ABdBUHAWcAozblp7GuIOwZc2kUoHGO7Cbr03dGeFY5qFGpiMks";
    const clientSecret = "3T8JO8M35xETx2wFBJk17QdbCaHDllT1Kj3Ykdtl";
    const refreshToken = "AB11754143853ecx3OSNDtkxeTUhzDroQKZhSb0ISYf2OD8LKS";
  
    const base64Creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  
    try {
      const response = await axios.post(
        "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
        {
          headers: {
            Authorization: `Basic ${base64Creds}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
    
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token, // Optional
      };
     
    } catch (err) {
      console.error("❌ Error refreshing token:", err.response?.data || err.message);
    }
  };

// This code assumes `order` is provided in the request body.
exports.invoicesCtrl = async (req, res) => {
    try {
      const order = req.body;
  console.log(order)
      const user = order.customerInfo;
      const billingAddress = {
        address: user?.address?.street,
        city: user?.address?.city,
        state: user?.address?.state,
        postalCode: user?.address?.zip_code,
        country: "USA",
      };
  
      const items = order.items.map((item) => {
        const lineDesc = item.sizes
          .map(
            (size) =>
              `${size.size_value} ${size.size_unit} (${size?.quantity})`
          )
          .join(", ");
  
        return {
          DetailType: "SalesItemLineDetail",
          Amount: item.price,
          Description: `${item.name} - ${lineDesc}`,
          SalesItemLineDetail: {
            ItemRef: {
              value: "1",
              name: item.name,
            },
            Qty: item.quantity,
            
          },
        };
      });
      if (order?.shipping_cost > 0) {
        items.push({
          DetailType: "SalesItemLineDetail",
          Amount: order.shipping_cost,
          Description: "Shipping Charges",
          SalesItemLineDetail: {
            ItemRef: {
              value: "SHIPPING", // Isko aap actual itemRef value se replace kar sakte ho agar available ho
              name: "Shipping",
            },
            Qty: 1,
          },
        });
      }
      const { accessToken } = await refreshQuickBooksToken();
      const realmId = process.env.QUICK_REAL;
      const customerEndpoint = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/customer`;
      const invoiceEndpoint = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/invoice`;
      const paymentEndpoint = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/payment`;

      const checkCustomerExistence = async (user) => {
        const searchEndpoint = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM Customer`;
        const response = await axios.get(searchEndpoint, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });
        const customers = response.data?.QueryResponse?.Customer || [];
  
        const matchingCustomer = customers.find((customer) => {
        //   const phoneMatch =
        //     customer?.PrimaryPhone?.FreeFormNumber?.replace(/\D/g, "") ===
        //     user?.mobile_phone?.replace(/\D/g, "");
          const emailMatch =
            customer?.PrimaryEmailAddr?.Address?.toLowerCase() ===
            user?.email?.toLowerCase();
          return  emailMatch;
        });
  
        return matchingCustomer
          ? { value: matchingCustomer.Id, name: matchingCustomer.DisplayName }
          : null;
      };
  
      let finalCustomerRef = await checkCustomerExistence(order?.profiles);
  
      if (!finalCustomerRef) {
        const customerRes = await axios.post(
          customerEndpoint,
          {
            DisplayName:
            (order?.profiles?.first_name || order?.profiles?.last_name)
              ? `${order?.profiles?.first_name || ""} ${order?.profiles?.last_name || ""}`.trim()
              : (order?.companyName || order?.name),
          
            PrimaryEmailAddr: { Address: order?.profiles?.email },
            PrimaryPhone: { FreeFormNumber: order?.profiles?.mobile_phone || order?.customerInfo?.phone },
            BillAddr: {
              Line1: billingAddress.address,
              City: billingAddress.city,
              CountrySubDivisionCode: billingAddress.state,
              PostalCode: billingAddress.postalCode,
              Country: billingAddress.country,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );
  
        finalCustomerRef = {
          value: customerRes.data.Customer.Id,
          name: customerRes.data.Customer.DisplayName,
        };
      }
  
      const invoiceData = {
        CustomerRef: finalCustomerRef,
        BillEmail: { Address: user.email },
        Line: items,
        TxnDate: new Date().toISOString().split("T")[0],
        PrivateNote: order.notes || `Order #: ${order.order_number}`,
        ShipAddr: {
          Line1: order.shippingAddress?.address?.street,
          City: order.shippingAddress?.address?.city,
          CountrySubDivisionCode: order.shippingAddress?.address?.state,
          PostalCode: order.shippingAddress?.address?.zip_code,
        },
        
      };
  
      const invoiceRes = await axios.post(invoiceEndpoint, invoiceData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      console.log(invoiceRes.data)
      const createdInvoice = invoiceRes.data.Invoice;
      const invoiceTotal = createdInvoice.TotalAmt;
      const invoiceId = createdInvoice.Id;
      
  if(order.payment_status === "paid"){
    const paymentData = {
      CustomerRef: finalCustomerRef,
      TotalAmt: invoiceTotal,
      Line: [
        {
          Amount: invoiceTotal,
          LinkedTxn: [
            {
              TxnId: invoiceId,
              TxnType: "Invoice",
            },
          ],
        },
      ],
      TxnDate: new Date().toISOString().split("T")[0],
      PrivateNote: `Payment for Order #: ${order.order_number}`,
    };

    const paymentRes = await axios.post(paymentEndpoint, paymentData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  }
  
      res.status(200).json({ success: true, data: invoiceRes.data });
    } catch (error) {
      console.error("Error creating invoice:", error.response?.data || error.message);
      res.status(500).json({ success: false, message: error.response?.data || error.message });
    }
  };
  