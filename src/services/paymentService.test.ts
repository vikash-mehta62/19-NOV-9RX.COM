import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/supabaseClient", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from "@/supabaseClient";
import { processACHPaymentFortisPay } from "./paymentService";

describe("processACHPaymentFortisPay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes Fortis ACH through the shared edge function and normalizes business checking accounts", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        success: true,
        transactionId: "txn_123",
        authCode: "auth_456",
        statusId: 131,
        processor: "fortispay",
        gatewayTransactionStatus: "Pending Origination",
        rawResponse: { id: "txn_123", status_id: 131 },
        message: "ACH payment initiated successfully",
      },
      error: null,
    });

    const result = await processACHPaymentFortisPay(
      {
        accountType: "businessChecking",
        routingNumber: "021000021",
        accountNumber: "1234567890",
        nameOnAccount: "Acme Pharmacy",
      },
      {
        firstName: "Acme",
        lastName: "Pharmacy",
        address: "123 Main St",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "USA",
      },
      125.75,
      "order_123",
      "Order Payment - 1001"
    );

    expect(result).toEqual({
      success: true,
      transactionId: "txn_123",
      authCode: "auth_456",
      message: "ACH payment initiated successfully",
      status: "pending",
      processor: "fortispay",
      gatewayStatusId: 131,
      gatewayTransactionStatus: "Pending Origination",
      rawResponse: { id: "txn_123", status_id: 131 },
    });

    expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
    const [fnName, options] = vi.mocked(supabase.functions.invoke).mock.calls[0];
    expect(fnName).toBe("process-payment");
    expect(options.body.payment.processor).toBe("fortispay");
    expect(options.body.payment.accountType).toBe("checking");
    expect(options.body.orderId).toBe("order_123");
  });

  it("returns edge function errors when Fortis processing fails", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: {
        message: "Edge function failed",
      },
    });

    const result = await processACHPaymentFortisPay(
      {
        accountType: "checking",
        routingNumber: "021000021",
        accountNumber: "1234567890",
        nameOnAccount: "Acme Pharmacy",
      },
      {
        firstName: "Acme",
        lastName: "Pharmacy",
        address: "123 Main St",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "USA",
      },
      125.75
    );

    expect(result).toEqual({
      success: false,
      message: "FortisPay processing error",
      errorMessage: "Edge function failed",
    });
  });
});
