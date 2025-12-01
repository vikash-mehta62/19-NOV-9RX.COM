import { describe, it, expect } from "vitest";
import {
  validateCustomerSelection,
  validateAddressInformation,
  validateProductSelection,
  validateReviewOrder,
  validatePaymentConfirmation,
  validateStep,
} from "../validation";
import type { Customer, BillingAddress, ShippingAddress, PaymentMethod } from "../types";
import type { CartItem } from "@/store/types/cartTypes";

describe("Wizard Validation", () => {
  describe("validateCustomerSelection", () => {
    it("should pass validation when customer is selected", () => {
      const customer: Customer = {
        id: "123",
        name: "John Doe",
        email: "john@example.com",
        phone: "555-1234",
        type: "Pharmacy",
      };

      const result = validateCustomerSelection(customer);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail validation when customer is null", () => {
      const result = validateCustomerSelection(null);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe("customer");
    });

    it("should fail validation when customer is missing ID", () => {
      const customer = {
        id: "",
        name: "John Doe",
        email: "john@example.com",
        phone: "555-1234",
        type: "Pharmacy" as const,
      };

      const result = validateCustomerSelection(customer);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "customer.id")).toBe(true);
    });

    it("should fail validation when customer is missing email", () => {
      const customer = {
        id: "123",
        name: "John Doe",
        email: "",
        phone: "555-1234",
        type: "Pharmacy" as const,
      };

      const result = validateCustomerSelection(customer);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "customer.email")).toBe(true);
    });
  });

  describe("validateAddressInformation", () => {
    const validBillingAddress: BillingAddress = {
      street: "123 Main St",
      city: "Springfield",
      state: "IL",
      zip_code: "62701",
    };

    const validShippingAddress: ShippingAddress = {
      fullName: "John Doe",
      email: "john@example.com",
      phone: "555-1234",
      street: "456 Oak Ave",
      city: "Springfield",
      state: "IL",
      zip_code: "62702",
    };

    it("should pass validation with valid addresses", () => {
      const result = validateAddressInformation(
        validBillingAddress,
        validShippingAddress
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail validation when billing address is missing", () => {
      const result = validateAddressInformation(undefined, validShippingAddress);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "billingAddress")).toBe(true);
    });

    it("should fail validation when shipping address is missing", () => {
      const result = validateAddressInformation(validBillingAddress, undefined);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "shippingAddress")).toBe(true);
    });

    it("should fail validation with invalid billing ZIP code", () => {
      const invalidBilling = { ...validBillingAddress, zip_code: "invalid" };
      const result = validateAddressInformation(invalidBilling, validShippingAddress);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "billingAddress.zip_code")).toBe(true);
    });

    it("should fail validation with invalid shipping email", () => {
      const invalidShipping = { ...validShippingAddress, email: "invalid-email" };
      const result = validateAddressInformation(validBillingAddress, invalidShipping);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "shippingAddress.email")).toBe(true);
    });

    it("should accept ZIP code with extended format", () => {
      const extendedZip = { ...validBillingAddress, zip_code: "62701-1234" };
      const result = validateAddressInformation(extendedZip, validShippingAddress);
      expect(result.isValid).toBe(true);
    });

    it("should fail validation when billing street is empty", () => {
      const emptyStreet = { ...validBillingAddress, street: "" };
      const result = validateAddressInformation(emptyStreet, validShippingAddress);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "billingAddress.street")).toBe(true);
    });

    it("should fail validation when shipping phone is missing", () => {
      const noPhone = { ...validShippingAddress, phone: "" };
      const result = validateAddressInformation(validBillingAddress, noPhone);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "shippingAddress.phone")).toBe(true);
    });
  });

  describe("validateProductSelection", () => {
    const validCartItem: CartItem = {
      productId: "prod-1",
      name: "Test Product",
      quantity: 2,
      price: 10.99,
      image: "/test.jpg",
      shipping_cost: 5.0,
      sizes: [],
    };

    it("should pass validation with valid cart items", () => {
      const result = validateProductSelection([validCartItem]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail validation when cart is empty", () => {
      const result = validateProductSelection([]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "cartItems")).toBe(true);
    });

    it("should fail validation when item has no productId", () => {
      const invalidItem = { ...validCartItem, productId: "" };
      const result = validateProductSelection([invalidItem]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field.includes("productId"))).toBe(true);
    });

    it("should fail validation when item has zero quantity", () => {
      const invalidItem = { ...validCartItem, quantity: 0 };
      const result = validateProductSelection([invalidItem]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field.includes("quantity"))).toBe(true);
    });

    it("should fail validation when item has negative price", () => {
      const invalidItem = { ...validCartItem, price: -5 };
      const result = validateProductSelection([invalidItem]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field.includes("price"))).toBe(true);
    });

    it("should pass validation with multiple valid items", () => {
      const items = [
        validCartItem,
        { ...validCartItem, productId: "prod-2" },
        { ...validCartItem, productId: "prod-3" },
      ];
      const result = validateProductSelection(items);
      expect(result.isValid).toBe(true);
    });
  });

  describe("validateReviewOrder", () => {
    const validCustomer: Customer = {
      id: "123",
      name: "John Doe",
      email: "john@example.com",
      phone: "555-1234",
      type: "Pharmacy",
    };

    const validBillingAddress: BillingAddress = {
      street: "123 Main St",
      city: "Springfield",
      state: "IL",
      zip_code: "62701",
    };

    const validShippingAddress: ShippingAddress = {
      fullName: "John Doe",
      email: "john@example.com",
      phone: "555-1234",
      street: "456 Oak Ave",
      city: "Springfield",
      state: "IL",
      zip_code: "62702",
    };

    const validCartItem: CartItem = {
      productId: "prod-1",
      name: "Test Product",
      quantity: 2,
      price: 10.99,
      image: "/test.jpg",
      shipping_cost: 5.0,
      sizes: [],
    };

    it("should pass validation when all data is valid", () => {
      const result = validateReviewOrder(
        validCustomer,
        validBillingAddress,
        validShippingAddress,
        [validCartItem]
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail validation when customer is missing", () => {
      const result = validateReviewOrder(
        null,
        validBillingAddress,
        validShippingAddress,
        [validCartItem]
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should fail validation when addresses are missing", () => {
      const result = validateReviewOrder(
        validCustomer,
        undefined,
        undefined,
        [validCartItem]
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should fail validation when cart is empty", () => {
      const result = validateReviewOrder(
        validCustomer,
        validBillingAddress,
        validShippingAddress,
        []
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "cartItems")).toBe(true);
    });
  });

  describe("validatePaymentConfirmation", () => {
    it("should pass validation when all requirements are met", () => {
      const result = validatePaymentConfirmation("credit_card", true, true);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail validation when payment method is missing", () => {
      const result = validatePaymentConfirmation(undefined, true, true);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "paymentMethod")).toBe(true);
    });

    it("should fail validation when terms are not accepted", () => {
      const result = validatePaymentConfirmation("credit_card", false, true);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "termsAccepted")).toBe(true);
    });

    it("should fail validation when accuracy is not confirmed", () => {
      const result = validatePaymentConfirmation("credit_card", true, false);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "accuracyConfirmed")).toBe(true);
    });

    it("should fail validation when both confirmations are missing", () => {
      const result = validatePaymentConfirmation("credit_card", false, false);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it("should accept all valid payment methods", () => {
      const methods: PaymentMethod[] = ["credit_card", "ach", "net_terms", "invoice"];
      methods.forEach((method) => {
        const result = validatePaymentConfirmation(method, true, true);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe("validateStep", () => {
    const validCustomer: Customer = {
      id: "123",
      name: "John Doe",
      email: "john@example.com",
      phone: "555-1234",
      type: "Pharmacy",
    };

    const validBillingAddress: BillingAddress = {
      street: "123 Main St",
      city: "Springfield",
      state: "IL",
      zip_code: "62701",
    };

    const validShippingAddress: ShippingAddress = {
      fullName: "John Doe",
      email: "john@example.com",
      phone: "555-1234",
      street: "456 Oak Ave",
      city: "Springfield",
      state: "IL",
      zip_code: "62702",
    };

    const validCartItem: CartItem = {
      productId: "prod-1",
      name: "Test Product",
      quantity: 2,
      price: 10.99,
      image: "/test.jpg",
      shipping_cost: 5.0,
      sizes: [],
    };

    it("should validate step 1 correctly", async () => {
      const result = await validateStep(1, { customer: validCustomer });
      expect(result.isValid).toBe(true);
    });

    it("should validate step 2 correctly", async () => {
      const result = await validateStep(2, {
        billingAddress: validBillingAddress,
        shippingAddress: validShippingAddress,
      });
      expect(result.isValid).toBe(true);
    });

    it("should validate step 3 correctly", async () => {
      const result = await validateStep(3, { cartItems: [validCartItem] });
      expect(result.isValid).toBe(true);
    });

    it("should validate step 4 correctly", async () => {
      const result = await validateStep(4, {
        customer: validCustomer,
        billingAddress: validBillingAddress,
        shippingAddress: validShippingAddress,
        cartItems: [validCartItem],
      });
      expect(result.isValid).toBe(true);
    });

    it("should validate step 5 correctly", async () => {
      const result = await validateStep(5, {
        paymentMethod: "credit_card",
        termsAccepted: true,
        accuracyConfirmed: true,
      });
      expect(result.isValid).toBe(true);
    });

    it("should return valid for invalid step numbers", async () => {
      const result = await validateStep(99, {});
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
