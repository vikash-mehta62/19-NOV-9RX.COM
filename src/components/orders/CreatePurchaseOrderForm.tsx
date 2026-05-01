import { useState, useEffect, useMemo, useRef } from "react";
import { FieldErrors, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { OrderFormValues, orderFormSchema } from "./schemas/orderSchema";
import { OrderItemsSection } from "./sections/OrderItemsSection";
import { ShippingSection } from "./sections/ShippingSection";
import { OrderFormActions } from "./form/OrderFormActions";
import { useLocation, useNavigate } from "react-router-dom";
import { generatePurchaseOrderId } from "./utils/orderUtils";
import { supabase } from "@/supabaseClient";
import { useSelector, useDispatch } from "react-redux";
import { selectUserProfile } from "../../store/selectors/userSelectors";
import { useCart } from "@/hooks/use-cart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Package, User, Plus, ShoppingCart, X, Edit2, Save, ClipboardList, Truck, Receipt, Sparkles, ScanLine, Trash2, AlertTriangle } from "lucide-react";
import { OrderActivityService } from "@/services/orderActivityService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { clearCart as clearCartAction, updateCartPrice } from "@/store/actions/cartActions";
import { Textarea } from "@/components/ui/textarea";
import { v4 as uuidv4 } from "uuid";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AdminDocumentSettings,
  DEFAULT_ADMIN_DOCUMENT_SETTINGS,
  fetchAdminDocumentSettings,
} from "@/lib/documentSettings";
import { sendPurchaseOrderEmail } from "@/services/purchaseOrderEmail";
import { fetchOrderedCategories, fetchOrderedSubcategories } from "@/services/productTreeService";
import { getAddressPredictions, getPlaceDetails } from "@/utils/googleAddressHelper";

const ADD_NEW_SUBCATEGORY_VALUE = "__add_new_subcategory__";
const MANUAL_NO_UNIT_VALUE = "__no_unit__";

interface CreatePurchaseOrderFormProps {
  vendorId: string;
}

type WarehouseAddressErrors = Partial<Record<
  "name" | "email" | "phone" | "street" | "city" | "state" | "zipCode" | "country",
  string
>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEN_DIGIT_PHONE_PATTERN = /^\d{10}$/;
const FIVE_DIGIT_ZIP_PATTERN = /^\d{5}$/;

const isUuid = (value: string | null | undefined) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );

const purchaseOrderFormSchema = orderFormSchema.extend({
  customerInfo: z.object({
    cusid: z.string().optional(),
    name: z.string().optional().default(""),
    email: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    type: z.enum(["Hospital", "Pharmacy", "Clinic"]).default("Pharmacy"),
    address: z.object({
      street: z.string().optional().default(""),
      city: z.string().optional().default(""),
      state: z.string().optional().default(""),
      zip_code: z.string().optional().default(""),
    }),
  }),
  shippingAddress: z
    .object({
      fullName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zip_code: z.string().optional(),
        })
        .optional(),
      billing: z.any().optional(),
      shipping: z.any().optional(),
    })
    .optional(),
  // PO manual items can intentionally be unitless; allow empty size_unit here.
  items: z.array(
    z.object({
      productId: z.string().min(1),
      name: z.string().min(1),
      quantity: z.number().min(1),
      price: z.number().min(0),
      sizes: z
        .array(
          z
            .object({
              id: z.string().min(1),
              size_value: z.string().min(1),
              size_unit: z.string(),
              quantity: z.number().min(0),
              price: z.number().min(0),
            })
            .passthrough()
        )
        .optional(),
    }).passthrough()
  ),
});

export function CreatePurchaseOrderForm({ vendorId }: CreatePurchaseOrderFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const poSubmitModeRef = useRef<"save_only" | "save_and_email">("save_and_email");
  const [isPoCartInitialized, setIsPoCartInitialized] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isCus, setIsCus] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const userProfile = useSelector(selectUserProfile);
  const { cartItems, clearCart, addToCart, removeFromCart } = useCart();
  const [vendorInfo, setVendorInfo] = useState<any>(null);
  const [loadingVendor, setLoadingVendor] = useState(true);
  const [documentSettings, setDocumentSettings] = useState<AdminDocumentSettings>(DEFAULT_ADMIN_DOCUMENT_SETTINGS);
  const [isEditingWarehouseAddress, setIsEditingWarehouseAddress] = useState(false);
  const [isSavingWarehouseAddress, setIsSavingWarehouseAddress] = useState(false);
  const [editableWarehouseAddress, setEditableWarehouseAddress] = useState({
    name: "",
    email: "",
    phone: "",
    street: "",
    suite: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });
  const [warehouseAddressErrors, setWarehouseAddressErrors] = useState<WarehouseAddressErrors>({});
  const [warehouseStreetSuggestions, setWarehouseStreetSuggestions] = useState<any[]>([]);
  const [editingPriceFor, setEditingPriceFor] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>("");
  const [originalPrices, setOriginalPrices] = useState<Record<string, number>>({});
  const [productPickerMode, setProductPickerMode] = useState<"catalog" | "manual">("catalog");
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("all");
  const [manualCategories, setManualCategories] = useState<string[]>([]);
  const [manualSubcategories, setManualSubcategories] = useState<string[]>([]);
  const [manualSessionSubcategories, setManualSessionSubcategories] = useState<Record<string, string[]>>({});
  const [isAddSubcategoryDialogOpen, setIsAddSubcategoryDialogOpen] = useState(false);
  const [pendingSubcategoryName, setPendingSubcategoryName] = useState("");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [sizeSelections, setSizeSelections] = useState<Record<string, number>>({});
  const [sizePriceOverrides, setSizePriceOverrides] = useState<Record<string, string>>({});
  const hasInitializedPoCartRef = useRef(false);
  const updatePoSubmitMode = (mode: "save_only" | "save_and_email") => {
    poSubmitModeRef.current = mode;
  };
  const [manualProduct, setManualProduct] = useState({
    category: "",
    subcategory: "",
    pendingNewSubcategory: "",
    name: "",
    stock: "1",
    quantityPerCase: "100",
    sku: "",
    size: "",
    unit: MANUAL_NO_UNIT_VALUE,
    price: "",
    shippingCost: "0",
    sequence: "0",
    sellByUnit: false,
    sellByCase: true,
    ndcCode: "",
    upcCode: "",
    lotNumber: "",
    expiryDate: "",
    notes: "",
  });

  // Fetch vendor information
  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", vendorId)
          .eq("type", "vendor")
          .single();

        if (error) throw error;
        setVendorInfo(data);
      } catch (error) {
        console.error("Error fetching vendor:", error);
        toast({
          title: "Error",
          description: "Failed to load vendor information",
          variant: "destructive",
        });
        navigate("/admin/po");
      } finally {
        setLoadingVendor(false);
      }
    };

    if (vendorId) {
      fetchVendor();
    }
  }, [vendorId]);

  useEffect(() => {
    const loadManualCategories = async () => {
      try {
        const categories = await fetchOrderedCategories();
        setManualCategories(categories.map((item) => item.category_name));
      } catch (error) {
        console.error("Error loading manual PO categories:", error);
        setManualCategories([]);
      }
    };

    loadManualCategories();
  }, []);

  useEffect(() => {
    const loadManualSubcategories = async () => {
      if (!manualProduct.category) {
        setManualSubcategories([]);
        return;
      }

      try {
        const subcategories = await fetchOrderedSubcategories(manualProduct.category);
        const serverSubcategories = subcategories.map((item) => item.subcategory_name);
        const sessionSubcategories = manualSessionSubcategories[manualProduct.category] || [];
        setManualSubcategories(Array.from(new Set([...serverSubcategories, ...sessionSubcategories])));
      } catch (error) {
        console.error("Error loading manual PO subcategories:", error);
        setManualSubcategories(manualSessionSubcategories[manualProduct.category] || []);
      }
    };

    loadManualSubcategories();
  }, [manualProduct.category, manualSessionSubcategories]);

  const isAdmin = userProfile?.type === "admin" || userProfile?.role === "admin";

  const handleOpenAddSubcategoryDialog = () => {
    if (!manualProduct.category) {
      toast({
        title: "Category required",
        description: "Select a category before adding a new subcategory.",
        variant: "destructive",
      });
      return;
    }

    setPendingSubcategoryName("");
    setIsAddSubcategoryDialogOpen(true);
  };

  const handleConfirmPendingSubcategory = () => {
    const normalizedSubcategory = pendingSubcategoryName.trim();

    if (!normalizedSubcategory) {
      toast({
        title: "Subcategory required",
        description: "Enter a new subcategory name.",
        variant: "destructive",
      });
      return;
    }

    const alreadyExists = manualSubcategories.some(
      (subcategory) => subcategory.toLowerCase() === normalizedSubcategory.toLowerCase()
    );

    if (!alreadyExists && manualProduct.category) {
      setManualSessionSubcategories((prev) => {
        const existing = prev[manualProduct.category] || [];
        if (existing.some((subcategory) => subcategory.toLowerCase() === normalizedSubcategory.toLowerCase())) {
          return prev;
        }

        return {
          ...prev,
          [manualProduct.category]: [...existing, normalizedSubcategory],
        };
      });
    }

    setManualProduct((prev) => ({
      ...prev,
      subcategory: normalizedSubcategory,
      pendingNewSubcategory: alreadyExists ? "" : normalizedSubcategory,
    }));
    setIsAddSubcategoryDialogOpen(false);
  };

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      id: "",
      customer: vendorId,
      date: new Date().toISOString(),
      total: "0",
      status: "new",
      payment_status: "unpaid",
      customization: false,
      poAccept: false, // This is a PO

      customerInfo: {
        cusid: vendorId,
        name: "",
        email: "",
        phone: "",
        type: "Pharmacy",
        address: {
          street: "",
          city: "",
          state: "",
          zip_code: "",
        },
      },

      // Default warehouse delivery address for purchase orders
      shippingAddress: {
        fullName: "",
        email: "",
        phone: "",
        address: {
          street: "",
          city: "",
          state: "",
          zip_code: "",
        },
      },

      order_number: "",
      items: [],
      shipping: {
        method: "FedEx",
        cost: 0,
        trackingNumber: "",
        estimatedDelivery: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      },
      payment: {
        method: "manual",
        notes: "",
        includePricingInPdf: true,
      },
      purchase_number_external: "",
      specialInstructions: "",
    },
  });

  useEffect(() => {
    if (hasInitializedPoCartRef.current) return;
    hasInitializedPoCartRef.current = true;

    let isActive = true;

    const resetPurchaseOrderCart = async () => {
      dispatch(clearCartAction());
      localStorage.removeItem("cart");
      localStorage.removeItem("cartItems");

      if (!isActive) return;

      form.setValue("items", []);
      setIsPoCartInitialized(true);
    };

    void resetPurchaseOrderCart();

    return () => {
      isActive = false;
    };
  }, [dispatch, form]);

  useEffect(() => {
    form.setValue("payment.method", "manual");

    const estimatedDelivery = form.getValues("shipping.estimatedDelivery");
    if (!estimatedDelivery) {
      form.setValue(
        "shipping.estimatedDelivery",
        new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      );
    }
  }, [form]);

  useEffect(() => {
    const loadDocumentSettings = async () => {
      try {
        const settings = await fetchAdminDocumentSettings();
        setDocumentSettings(settings);
        const warehouse = settings.warehouse;
        setEditableWarehouseAddress(warehouse);
        applyWarehouseAddressToForm(warehouse);
      } catch (error) {
        console.error("Failed to load admin document settings for PO:", error);
      }
    };

    void loadDocumentSettings();
  }, [form]);

  const warehouseAddress = documentSettings.warehouse;
  const warehouseAddressLine = [
    warehouseAddress.street,
    warehouseAddress.suite,
    [warehouseAddress.city, warehouseAddress.state, warehouseAddress.zipCode].filter(Boolean).join(", "),
    warehouseAddress.country,
  ]
    .filter(Boolean)
    .join(", ");

  function applyWarehouseAddressToForm(warehouse: AdminDocumentSettings["warehouse"]) {
    form.setValue("shippingAddress", {
      fullName: warehouse.name,
      email: warehouse.email,
      phone: warehouse.phone,
      address: {
        street: [warehouse.street, warehouse.suite].filter(Boolean).join(", "),
        city: warehouse.city,
        state: warehouse.state,
        zip_code: warehouse.zipCode,
      },
    });
  }

  function validateWarehouseAddress() {
    const nextErrors: WarehouseAddressErrors = {};
    const values = {
      name: editableWarehouseAddress.name.trim(),
      email: editableWarehouseAddress.email.trim(),
      phone: editableWarehouseAddress.phone.trim(),
      street: editableWarehouseAddress.street.trim(),
      city: editableWarehouseAddress.city.trim(),
      state: editableWarehouseAddress.state.trim(),
      zipCode: editableWarehouseAddress.zipCode.trim(),
      country: editableWarehouseAddress.country.trim(),
    };

    if (!values.name) nextErrors.name = "Company / Name is required.";
    if (!values.phone) {
      nextErrors.phone = "Phone is required.";
    } else if (!TEN_DIGIT_PHONE_PATTERN.test(values.phone)) {
      nextErrors.phone = "Phone must contain exactly 10 digits.";
    }
    if (!values.email) {
      nextErrors.email = "Email is required.";
    } else if (!EMAIL_PATTERN.test(values.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!values.street) nextErrors.street = "Street address is required.";
    if (!values.country) nextErrors.country = "Country is required.";
    if (!values.city) nextErrors.city = "City is required.";
    if (!values.state) nextErrors.state = "State is required.";
    if (!values.zipCode) {
      nextErrors.zipCode = "ZIP code is required.";
    } else if (!FIVE_DIGIT_ZIP_PATTERN.test(values.zipCode)) {
      nextErrors.zipCode = "ZIP code must contain exactly 5 digits.";
    }

    setWarehouseAddressErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function updateWarehouseAddressField(
    field: keyof typeof editableWarehouseAddress,
    value: string
  ) {
    setEditableWarehouseAddress((current) => ({
      ...current,
      [field]: value,
    }));

    if (field in warehouseAddressErrors) {
      setWarehouseAddressErrors((current) => {
        const next = { ...current };
        delete next[field as keyof WarehouseAddressErrors];
        return next;
      });
    }
  }

  const handleWarehouseStreetChange = (value: string) => {
    updateWarehouseAddressField("street", value);
    getAddressPredictions(value, setWarehouseStreetSuggestions);
  };

  const handleWarehouseStreetSuggestionSelect = (placeId: string) => {
    getPlaceDetails(placeId, (address) => {
      if (!address) return;

      updateWarehouseAddressField("street", address.street);
      if (address.city) updateWarehouseAddressField("city", address.city);
      if (address.state) updateWarehouseAddressField("state", address.state);
      if (address.zip_code) updateWarehouseAddressField("zipCode", address.zip_code);
      if (address.country) updateWarehouseAddressField("country", address.country);
    });
    setWarehouseStreetSuggestions([]);
  };

  const handleWarehouseAddressEdit = async () => {
    if (!isEditingWarehouseAddress) {
      setEditableWarehouseAddress(warehouseAddress);
      setWarehouseAddressErrors({});
      setIsEditingWarehouseAddress(true);
      return;
    }

    if (!validateWarehouseAddress()) {
      toast({
        title: "Delivery address not saved",
        description: "Fix the highlighted fields and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingWarehouseAddress(true);

    try {
      const updatedWarehouse = {
        ...warehouseAddress,
        ...editableWarehouseAddress,
        name: editableWarehouseAddress.name.trim(),
        email: editableWarehouseAddress.email.trim(),
        phone: editableWarehouseAddress.phone.trim(),
        street: editableWarehouseAddress.street.trim(),
        suite: editableWarehouseAddress.suite.trim(),
        city: editableWarehouseAddress.city.trim(),
        state: editableWarehouseAddress.state.trim(),
        zipCode: editableWarehouseAddress.zipCode.trim(),
        country: editableWarehouseAddress.country.trim(),
      };

      const nextSettings = {
        ...documentSettings,
        warehouse: updatedWarehouse,
      };

      setDocumentSettings(nextSettings);
      setEditableWarehouseAddress(updatedWarehouse);
      setWarehouseAddressErrors({});
      applyWarehouseAddressToForm(updatedWarehouse);
      setIsEditingWarehouseAddress(false);

      toast({
        title: "Delivery Address Updated",
        description: "This delivery address will be used only for the current purchase order.",
      });
    } catch (error) {
      console.error("Error updating warehouse delivery address:", error);
      toast({
        title: "Error",
        description: "Failed to update delivery address. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingWarehouseAddress(false);
    }
  };

  // Update vendor info in form when loaded
  useEffect(() => {
    if (vendorInfo) {
      form.setValue("customerInfo", {
        cusid: vendorInfo.id,
        name: `${vendorInfo.first_name} ${vendorInfo.last_name}`,
        email: vendorInfo.email || "",
        phone: vendorInfo.billing_address?.phone || vendorInfo.mobile_phone || "",
        type: "Pharmacy",
        address: {
          street: vendorInfo.billing_address?.street1 || "",
          city: vendorInfo.billing_address?.city || "",
          state: vendorInfo.billing_address?.state || "",
          zip_code: vendorInfo.billing_address?.zip_code || "",
        },
      });
    }
  }, [vendorInfo, form]);

  useEffect(() => {
    const fetchCatalogProducts = async () => {
      if (!showProductSelector || productPickerMode !== "catalog") return;

      setCatalogLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, sku, category, description, image_url, images, product_sizes(*)")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (error) throw error;
        setCatalogProducts(data || []);
      } catch (error) {
        console.error("Error loading PO catalog:", error);
        toast({
          title: "Catalog unavailable",
          description: "Failed to load products for purchase order selection.",
          variant: "destructive",
        });
      } finally {
        setCatalogLoading(false);
      }
    };

    fetchCatalogProducts();
  }, [showProductSelector, productPickerMode]);

  // Sync cart items with form
  useEffect(() => {
    if (!isPoCartInitialized) return;
    form.setValue("items", cartItems);
    console.log("📦 Cart items synced to form:", cartItems);
  }, [cartItems, form, isPoCartInitialized]);

  const calculateOrderTotal = (items: any[]) => {
    const itemsTotal = items.reduce((total, item) => {
      const itemTotal = item.sizes?.reduce(
        (sum: number, size: any) => sum + size.quantity * size.price,
        0
      ) || 0;
      return total + itemTotal;
    }, 0);
    return itemsTotal;
  };

  // Handle price editing for a specific size
  const handleEditPrice = (itemIndex: number, sizeIndex: number, currentPrice: number) => {
    const key = `${itemIndex}-${sizeIndex}`;
    setEditingPriceFor(key);
    setTempPrice(currentPrice.toFixed(2));
  };

  // Save edited price
  const handleSavePrice = (itemIndex: number, sizeIndex: number) => {
    const newPrice = parseFloat(tempPrice);
    
    if (isNaN(newPrice) || newPrice <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0",
        variant: "destructive",
      });
      return;
    }

    const item = cartItems[itemIndex];
    
    if (!item || !item.sizes || !item.sizes[sizeIndex]) {
      toast({
        title: "Error",
        description: "Invalid item or size",
        variant: "destructive",
      });
      return;
    }
    
    const size = item.sizes[sizeIndex];
    const priceKey = `${item.productId}-${size.id}`;
    
    // Store original price if not already stored
    if (!originalPrices[priceKey]) {
      setOriginalPrices(prev => ({
        ...prev,
        [priceKey]: size.price
      }));
    }
    
    // Update price in Redux store using the action
    dispatch(updateCartPrice(item.productId, size.id, newPrice));
    
    toast({
      title: "Price Updated",
      description: `Price updated to $${newPrice.toFixed(2)}`,
    });
    
    setEditingPriceFor(null);
    setTempPrice("");
  };

  // Cancel price editing
  const handleCancelPriceEdit = () => {
    setEditingPriceFor(null);
    setTempPrice("");
  };

  const handleManualProductAdd = async () => {
    const quantity = Number(manualProduct.stock);
    const price = Number(manualProduct.price);

    if (!manualProduct.name.trim()) {
      toast({
        title: "Product name required",
        description: "Enter a product name for the manual PO item.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Quantity must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      toast({
        title: "Invalid price",
        description: "Unit price must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    const productId = `manual-po-${uuidv4()}`;
    const sizeId = `${productId}-size`;

    await addToCart({
      productId,
      name: manualProduct.name.trim(),
      sku: manualProduct.sku.trim() || `MANUAL-${Date.now()}`,
      price: quantity * price,
      image: "",
      description: manualProduct.notes.trim(),
      category: manualProduct.category || "Manual Item",
      subcategory: manualProduct.subcategory || "",
      pendingNewSubcategory: manualProduct.pendingNewSubcategory || "",
      quantity,
      sizes: [
        {
          id: sizeId,
          size_name: manualProduct.name.trim(),
          size_value: manualProduct.size.trim() || "Standard",
          size_unit:
            manualProduct.unit === MANUAL_NO_UNIT_VALUE
              ? ""
              : manualProduct.unit.trim() || "unit",
          price,
          quantity,
          sku: manualProduct.sku.trim() || "",
          type: "manual",
          quantity_per_case: Number(manualProduct.quantityPerCase) || 0,
          shipping_cost: Number(manualProduct.shippingCost) || 0,
          sizeSquanence: Number(manualProduct.sequence) || 0,
          unit: manualProduct.sellByUnit,
          case: manualProduct.sellByCase,
          ndcCode: manualProduct.ndcCode.trim(),
          upcCode: manualProduct.upcCode.trim(),
          lotNumber: manualProduct.lotNumber.trim(),
          exipry: manualProduct.expiryDate,
        },
      ],
      customizations: {},
      notes: manualProduct.notes.trim(),
      shipping_cost: Number(manualProduct.shippingCost) || 0,
    });

    setManualProduct({
      category: "",
      subcategory: "",
      pendingNewSubcategory: "",
      name: "",
      stock: "1",
      quantityPerCase: "100",
      sku: "",
      size: "",
      unit: MANUAL_NO_UNIT_VALUE,
      price: "",
      shippingCost: "0",
      sequence: "0",
      sellByUnit: false,
      sellByCase: true,
      ndcCode: "",
      upcCode: "",
      lotNumber: "",
      expiryDate: "",
      notes: "",
    });

    toast({
      title: "Manual item added",
      description: "The custom product was added to this purchase order.",
    });
  };

  const catalogCategories = useMemo(() => {
    const categories = Array.from(
      new Set(catalogProducts.map((product) => product.category).filter(Boolean))
    ) as string[];

    return categories.sort((a, b) => a.localeCompare(b));
  }, [catalogProducts]);

  const filteredCatalogProducts = useMemo(() => {
    return catalogProducts.filter((product) => {
      const matchesCategory =
        catalogCategory === "all" ||
        String(product.category || "").toLowerCase() === catalogCategory.toLowerCase();

      const query = catalogSearch.trim().toLowerCase();
      const matchesSearch =
        !query ||
        String(product.name || "").toLowerCase().includes(query) ||
        String(product.sku || "").toLowerCase().includes(query) ||
        String(product.description || "").toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [catalogProducts, catalogCategory, catalogSearch]);

  const addedManualItems = useMemo(
    () => cartItems.filter((item: any) => String(item.productId || "").startsWith("manual-po-")),
    [cartItems]
  );

  const handleCatalogAdd = async (product: any, size: any) => {
    const quantity = Math.max(1, Number(sizeSelections[size.id] || 1));
    const price = Number(sizePriceOverrides[size.id] ?? size.price ?? 0);

    if (!price || price <= 0) {
      toast({
        title: "Invalid price",
        description: "Enter a valid vendor cost before adding this item.",
        variant: "destructive",
      });
      return;
    }

    await addToCart({
      productId: String(product.id),
      name: product.name,
      sku: product.sku || size.sku || "",
      price: quantity * price,
      image: product.image_url || product.images?.[0] || "",
      description: product.description || "",
      quantity,
      sizes: [
        {
          id: size.id,
          size_name: size.size_name || "",
          size_value: size.size_value,
          size_unit: size.size_unit,
          price,
          quantity,
          sku: size.sku || "",
          type: "case",
          shipping_cost: Number(size.shipping_cost || 0),
        },
      ],
      customizations: {},
      notes: "",
      shipping_cost: Number(size.shipping_cost || 0),
    });

    setSizeSelections((prev) => ({ ...prev, [size.id]: 1 }));
    setSizePriceOverrides((prev) => ({
      ...prev,
      [size.id]: String(Number(size.price || 0).toFixed(2)),
    }));
    toast({
      title: "Product added",
      description: `${size.size_name || size.size_value + size.size_unit} added to purchase order.`,
      // description: `${product.name} ${size.size_value} ${size.size_unit} added to purchase order.`,
    });
  };

  const onSubmit = async (data: OrderFormValues) => {
    try {
      setIsSubmitting(true);

      if (!userProfile?.id) {
        toast({
          title: "Authentication Error",
          description: "Please log in to create a purchase order.",
          variant: "destructive",
        });
        return;
      }

      if (cartItems.length === 0) {
        toast({
          title: "No Products",
          description: "Please add products to create a purchase order.",
          variant: "destructive",
        });
        return;
      }

      // Calculate totals
      const totalAmount = calculateOrderTotal(cartItems);

      const effectiveWarehouseAddress = isEditingWarehouseAddress
        ? {
            ...editableWarehouseAddress,
            name: editableWarehouseAddress.name.trim(),
            email: editableWarehouseAddress.email.trim(),
            phone: editableWarehouseAddress.phone.trim(),
            street: editableWarehouseAddress.street.trim(),
            suite: editableWarehouseAddress.suite.trim(),
            city: editableWarehouseAddress.city.trim(),
            state: editableWarehouseAddress.state.trim(),
            zipCode: editableWarehouseAddress.zipCode.trim(),
            country: editableWarehouseAddress.country.trim(),
          }
        : warehouseAddress;

      const orderShippingAddress = {
        fullName: effectiveWarehouseAddress.name,
        email: effectiveWarehouseAddress.email,
        phone: effectiveWarehouseAddress.phone,
        address: {
          street: [effectiveWarehouseAddress.street, effectiveWarehouseAddress.suite].filter(Boolean).join(", "),
          city: effectiveWarehouseAddress.city,
          state: effectiveWarehouseAddress.state,
          zip_code: effectiveWarehouseAddress.zipCode,
          country: effectiveWarehouseAddress.country,
        },
      };

      // Generate PO number
      let poNumber = await generatePurchaseOrderId();

      if (!poNumber) {
        throw new Error("Failed to generate purchase order number. Please try again.");
      }

      // Prepare PO data
      const manualShippingMethod = (data.purchase_number_external || "").trim();
      const expectedDelivery =
        data.shipping?.estimatedDelivery ||
        new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const poData: any = {
        order_number: poNumber,
        profile_id: vendorId, // Vendor is the "customer" for PO
        status: data.status,
        total_amount: totalAmount,
        shipping_cost: 0,
        tax_amount: 0, // No tax on PO
        customization: false,
        items: cartItems,
        notes: data.specialInstructions,
        customerInfo: {
          ...data.customerInfo,
          address: {
            street: vendorInfo?.billing_address?.street1 || "",
            street2: vendorInfo?.billing_address?.street2 || "",
            city: vendorInfo?.billing_address?.city || "",
            state: vendorInfo?.billing_address?.state || "",
            zip_code: vendorInfo?.billing_address?.zip_code || "",
            country: vendorInfo?.billing_address?.country || vendorInfo?.billing_address?.countryRegion || "",
          },
        },
        shippingAddress: orderShippingAddress,
        shipping: {
          ...(data.shipping || {}),
          estimatedDelivery: expectedDelivery,
        },
        purchase_number_external: manualShippingMethod || null,
        shipping_method: manualShippingMethod || null,
        estimated_delivery: expectedDelivery,
        location_id: vendorId,
        poAccept: false, // Mark as PO
        payment_status: "unpaid",
        payment_method: data.payment?.method || "manual",
        payment_notes: data.payment?.notes || null,
      };

      // Create PO in database with retry logic for duplicate order numbers
      let poResponse: any = null;
      const MAX_PO_RETRIES = 5;

      for (let attempt = 0; attempt < MAX_PO_RETRIES; attempt++) {
        const { data: insertResult, error: poError } = await supabase
          .from("orders")
          .insert(poData)
          .select()
          .single();

        if (!poError) {
          poResponse = insertResult;
          break;
        }

        // If duplicate order number, generate a new one and retry
        if (poError.code === '23505' && poError.message.includes('orders_order_number_key')) {
          console.warn(`⚠️ Duplicate PO number detected (attempt ${attempt + 1}/${MAX_PO_RETRIES}), generating new one...`);
          const newPoNumber = await generatePurchaseOrderId();
          if (!newPoNumber) {
            // Fallback: timestamp-based PO number
            const fallback = `PO-9RX${Date.now().toString().slice(-8)}`;
            console.warn(`⚠️ RPC failed, using fallback PO number: ${fallback}`);
            poData.order_number = fallback;
            poNumber = fallback;
          } else {
            poData.order_number = newPoNumber;
            poNumber = newPoNumber;
          }
        } else {
          throw new Error(poError.message);
        }
      }

      if (!poResponse) {
        // Final emergency fallback
        const uuid = crypto.randomUUID().split('-')[0];
        const emergencyPO = `PO-9RX${uuid.toUpperCase()}`;
        poData.order_number = emergencyPO;
        poNumber = emergencyPO;
        const { data: emergencyResult, error: emergencyError } = await supabase
          .from("orders")
          .insert(poData)
          .select()
          .single();
        if (emergencyError) throw new Error(emergencyError.message);
        poResponse = emergencyResult;
      }

      // Insert order items into order_items table (for analytics and reporting)
      const orderItemsData = cartItems.flatMap((item: any) => {
        if (item.sizes && item.sizes.length > 0) {
          // For items with sizes, create separate entries for each size
          return item.sizes.flatMap((size: any) => {
            if (!isUuid(item.productId) || !isUuid(size.id)) {
              return [];
            }

            return [{
              order_id: poResponse.id,
              product_id: item.productId,
              quantity: size.quantity,
              unit_price: size.price,
              total_price: size.quantity * size.price,
              product_size_id: size.id,
              notes: `Size: ${size.size_value} ${size.size_unit}`,
            }];
          });
        } else {
          // For items without sizes
          if (!isUuid(item.productId)) {
            return [];
          }

          return [{
            order_id: poResponse.id,
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.quantity * item.price,
            notes: item.notes || null,
          }];
        }
      });

      let insertedItems = null;
      let itemsError = null;

      if (orderItemsData.length > 0) {
        const result = await supabase
          .from("order_items")
          .insert(orderItemsData)
          .select();
        insertedItems = result.data;
        itemsError = result.error;
      }

      if (itemsError) {
        console.error("❌ PO CREATION - Failed to insert order items:", itemsError);
        // Don't throw error - PO is already created, just log the issue
        toast({
          title: "Warning",
          description: "PO created but some analytics data may be incomplete.",
          variant: "default",
        });
      } else {
        console.log('✅ PO CREATION - Order Items Inserted Successfully:', insertedItems?.length);
      }

      // Log PO creation activity
      try {
        await OrderActivityService.logOrderCreation({
          orderId: poResponse.id,
          orderNumber: poNumber,
          totalAmount: totalAmount,
          status: data.status,
          paymentMethod: "manual",
          performedBy: userProfile?.id,
          performedByName: `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim() || "Admin",
          performedByEmail: userProfile?.email,
        });
      } catch (activityError) {
        console.error("Failed to log PO creation activity:", activityError);
      }

      if (poSubmitModeRef.current === "save_and_email") {
        try {
          await sendPurchaseOrderEmail(poResponse.id, "created", data.payment?.includePricingInPdf !== false);
        } catch (emailError) {
          console.error("Failed to send PO email to vendor:", emailError);
          toast({
            title: "PO created, email not sent",
            description: "The purchase order was saved, but the vendor email could not be delivered.",
            variant: "destructive",
          });
        }
      }

      // Clear cart and navigate
      localStorage.removeItem("cart");
      localStorage.removeItem("cartItems");
      await clearCart();

      toast({
        title: "Purchase Order Created",
        description:
          poSubmitModeRef.current === "save_and_email"
            ? `PO ${poNumber} has been created and emailed to vendor.`
            : `PO ${poNumber} has been saved successfully.`,
      });

      navigate("/admin/po");
    } catch (error) {
      console.error("PO creation error:", error);
      toast({
        title: "Error Creating Purchase Order",
        description:
          error instanceof Error
            ? error.message
            : "There was a problem creating the purchase order.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalidSubmit = (errors: FieldErrors<OrderFormValues>) => {
    const errorMessages = [
      errors.shipping?.method?.message,
      errors.shipping?.estimatedDelivery?.message,
      errors.items?.message,
      errors.customerInfo?.message,
    ].filter(Boolean);

    toast({
      title: "Purchase order not created",
      description:
        typeof errorMessages[0] === "string"
          ? errorMessages[0]
          : "Please fix the highlighted purchase order fields and try again.",
      variant: "destructive",
    });
  };


  const handlePoSaveOnlySubmit = () => {
    updatePoSubmitMode("save_only");
    void form.handleSubmit(onSubmit, onInvalidSubmit)();
  };

  const handlePoSaveAndEmailSubmit = () => {
    updatePoSubmitMode("save_and_email");
    void form.handleSubmit(onSubmit, onInvalidSubmit)();
  };

  if (loadingVendor || !isPoCartInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {loadingVendor ? "Loading vendor information..." : "Preparing purchase order workspace..."}
          </p>
        </div>
      </div>
    );
  }

  const subtotal = cartItems.reduce((sum, item) => {
    const itemTotal =
      item.sizes?.reduce((sizeSum: number, size: any) => sizeSum + size.quantity * size.price, 0) ||
      item.price * item.quantity;
    return sum + itemTotal;
  }, 0);

  const totalQuantity = cartItems.reduce(
    (sum, item) =>
      sum +
      (item.sizes?.reduce((sizeSum: number, size: any) => sizeSum + size.quantity, 0) || item.quantity || 0),
    0
  );

  return (
    <div className="container mx-auto space-y-6 py-6">
      <Dialog open={isAddSubcategoryDialogOpen} onOpenChange={setIsAddSubcategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Subcategory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Input value={manualProduct.category} readOnly className="mt-1 bg-gray-100" />
            </div>
            <div>
              <Label htmlFor="pending-subcategory-name">Subcategory name</Label>
              <Input
                id="pending-subcategory-name"
                value={pendingSubcategoryName}
                onChange={(e) => setPendingSubcategoryName(e.target.value)}
                placeholder="Enter new subcategory"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSubcategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPendingSubcategory}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card className="overflow-hidden border-0 bg-blue-600 text-white shadow-xl">
        <CardContent className="grid gap-5 p-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-blue-100">Purchase Order Workspace</p>
            <h1 className="mt-2 text-3xl font-semibold">Create vendor PO with pricing and delivery control</h1>
            <p className="mt-3 max-w-2xl text-sm text-blue-100/90">
              Select catalog items, adjust vendor cost before submission, and add the shipping method that should print on the PO.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-blue-100">Items</p>
              <p className="mt-2 text-2xl font-semibold">{cartItems.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-blue-100">Units</p>
              <p className="mt-2 text-2xl font-semibold">{totalQuantity}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-blue-100">Estimated Total</p>
              <p className="mt-2 text-2xl font-semibold">${subtotal.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Building2 className="h-5 w-5" />
            Purchase Order - Vendor Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-blue-600 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-700">Vendor Name</p>
                <p className="text-base font-semibold text-gray-900">
                  {`${vendorInfo?.first_name} ${vendorInfo?.last_name}`}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Email</p>
              <p className="text-base text-gray-900">{vendorInfo?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Phone</p>
              <p className="text-base text-gray-900">
                {vendorInfo?.billing_address?.phone || vendorInfo?.mobile_phone || "N/A"}
              </p>
            </div>
          </div>
          
          {/* Vendor Address Section */}
          <div className="pt-4 border-t border-blue-200">
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-700">Vendor Address</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              {vendorInfo?.billing_address?.street1 ||
              vendorInfo?.billing_address?.city ||
              vendorInfo?.billing_address?.state ||
              vendorInfo?.billing_address?.zip_code ? (
                <div className="space-y-1 text-gray-900">
                  {vendorInfo?.billing_address?.street1 && <p>{vendorInfo.billing_address.street1}</p>}
                  {vendorInfo?.billing_address?.street2 && <p>{vendorInfo.billing_address.street2}</p>}
                  <p>
                    {[
                      vendorInfo?.billing_address?.city,
                      vendorInfo?.billing_address?.state,
                      vendorInfo?.billing_address?.zip_code,
                    ].filter(Boolean).join(", ")}
                  </p>
                  {(vendorInfo?.billing_address?.country || vendorInfo?.billing_address?.countryRegion) && (
                    <p>{vendorInfo?.billing_address?.country || vendorInfo?.billing_address?.countryRegion}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 italic">No vendor address available.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Package className="h-5 w-5" />
              Delivery Address
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleWarehouseAddressEdit}
              disabled={isSavingWarehouseAddress}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
            >
              {isEditingWarehouseAddress ? (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  {isSavingWarehouseAddress ? "Saving..." : "Save"}
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditingWarehouseAddress ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="warehouse_name" className="text-sm">Company / Name <span className="text-red-500">*</span></Label>
                <Input
                  id="warehouse_name"
                  value={editableWarehouseAddress.name}
                  onChange={(e) => updateWarehouseAddressField("name", e.target.value)}
                  className="mt-1"
                />
                {warehouseAddressErrors.name ? <p className="mt-1 text-sm text-red-600">{warehouseAddressErrors.name}</p> : null}
              </div>
              <div>
                <Label htmlFor="warehouse_phone" className="text-sm">Phone <span className="text-red-500">*</span></Label>
                <Input
                  id="warehouse_phone"
                  value={editableWarehouseAddress.phone}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(e) => updateWarehouseAddressField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="mt-1"
                />
                {warehouseAddressErrors.phone ? <p className="mt-1 text-sm text-red-600">{warehouseAddressErrors.phone}</p> : null}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="warehouse_email" className="text-sm">Email <span className="text-red-500">*</span></Label>
                <Input
                  id="warehouse_email"
                  type="email"
                  value={editableWarehouseAddress.email}
                  onChange={(e) => updateWarehouseAddressField("email", e.target.value)}
                  className="mt-1"
                />
                {warehouseAddressErrors.email ? <p className="mt-1 text-sm text-red-600">{warehouseAddressErrors.email}</p> : null}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="warehouse_street" className="text-sm">Street Address <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="warehouse_street"
                    value={editableWarehouseAddress.street}
                    onChange={(e) => handleWarehouseStreetChange(e.target.value)}
                    className="mt-1"
                    autoComplete="off"
                  />
                  {warehouseStreetSuggestions.length > 0 && (
                    <ul className="absolute left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
                      {warehouseStreetSuggestions.map((suggestion) => (
                        <li
                          key={suggestion.place_id}
                          className="cursor-pointer px-4 py-2 text-sm hover:bg-blue-50"
                          onClick={() => handleWarehouseStreetSuggestionSelect(suggestion.place_id)}
                        >
                          {suggestion.description}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {warehouseAddressErrors.street ? <p className="mt-1 text-sm text-red-600">{warehouseAddressErrors.street}</p> : null}
              </div>
              <div>
                <Label htmlFor="warehouse_suite" className="text-sm">Suite / Unit</Label>
                <Input
                  id="warehouse_suite"
                  value={editableWarehouseAddress.suite}
                  onChange={(e) => updateWarehouseAddressField("suite", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="warehouse_country" className="text-sm">Country <span className="text-red-500">*</span></Label>
                <Input
                  id="warehouse_country"
                  value={editableWarehouseAddress.country}
                  onChange={(e) => updateWarehouseAddressField("country", e.target.value)}
                  className="mt-1"
                />
                {warehouseAddressErrors.country ? <p className="mt-1 text-sm text-red-600">{warehouseAddressErrors.country}</p> : null}
              </div>
              <div>
                <Label htmlFor="warehouse_city" className="text-sm">City <span className="text-red-500">*</span></Label>
                <Input
                  id="warehouse_city"
                  value={editableWarehouseAddress.city}
                  onChange={(e) => updateWarehouseAddressField("city", e.target.value)}
                  className="mt-1"
                />
                {warehouseAddressErrors.city ? <p className="mt-1 text-sm text-red-600">{warehouseAddressErrors.city}</p> : null}
              </div>
              <div>
                <Label htmlFor="warehouse_state" className="text-sm">State <span className="text-red-500">*</span></Label>
                <Input
                  id="warehouse_state"
                  value={editableWarehouseAddress.state}
                  onChange={(e) => updateWarehouseAddressField("state", e.target.value)}
                  className="mt-1"
                />
                {warehouseAddressErrors.state ? <p className="mt-1 text-sm text-red-600">{warehouseAddressErrors.state}</p> : null}
              </div>
              <div>
                <Label htmlFor="warehouse_zip_code" className="text-sm">ZIP Code <span className="text-red-500">*</span></Label>
                <Input
                  id="warehouse_zip_code"
                  value={editableWarehouseAddress.zipCode}
                  inputMode="numeric"
                  maxLength={5}
                  onChange={(e) => updateWarehouseAddressField("zipCode", e.target.value.replace(/\D/g, "").slice(0, 5))}
                  className="mt-1"
                />
                {warehouseAddressErrors.zipCode ? <p className="mt-1 text-sm text-red-600">{warehouseAddressErrors.zipCode}</p> : null}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="font-semibold text-gray-900">{warehouseAddress.name}</p>
              <p className="text-gray-700">{warehouseAddressLine}</p>
              {warehouseAddress.phone && <p className="text-gray-700">{warehouseAddress.phone}</p>}
              {warehouseAddress.email && <p className="text-gray-700">{warehouseAddress.email}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Receipt className="h-5 w-5 text-blue-600" />
                PO Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="shipping.estimatedDelivery"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Delivery Date</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchase_number_external"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping Method</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="Enter shipping method"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment.includePricingInPdf"
                render={({ field }) => (
                  <FormItem className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <FormLabel>Include pricing on PO PDF</FormLabel>
                        <p className="mt-1 text-sm text-slate-500">
                          Turn this off for quantity-only purchase orders sent to vendors without cost visibility.
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="specialInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes for this purchase order</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={4}
                          placeholder="Add vendor notes, receiving instructions, expected lead time, or special handling details."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Order Items
          </CardTitle>
          <Button
            type="button"
            onClick={() => setShowProductSelector(true)}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Products
          </Button>
        </CardHeader>
        <CardContent>
          {cartItems.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No products added yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Click "Add Products" to select items for this purchase order
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item, index) => {
                // Calculate item total from sizes
                const itemTotal = item.sizes?.reduce(
                  (sum: number, size: any) => sum + (size.quantity * size.price),
                  0
                ) || (item.price * item.quantity);
                
                return (
                  <div
                    key={index}
                    className="flex items-start justify-between p-4 border rounded-lg bg-gray-50"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.subcategory || item.name}</h4>
                      {item.sizes && item.sizes.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {item.sizes.map((size: any, sizeIndex: number) => {
                            const editKey = `${index}-${sizeIndex}`;
                            const isEditing = editingPriceFor === editKey;
                            const priceKey = `${item.productId}-${size.id}`;
                            const originalPrice = originalPrices[priceKey];
                            const hasModifiedPrice = originalPrice && originalPrice !== size.price;
                            
                            return (
                              <div key={sizeIndex} className="bg-white p-3 rounded border">
                                <div className="flex flex-col justify-between items-start text-sm mb-2">
                                  {size.size_name && (
                                    <span className="text-gray-600 font-bold">
                                      Product name: {size.size_name}
                                    </span>
                                  )}
                                  <span className="text-gray-600 font-medium">
                                    Size: {size.size_value} {size.size_unit}
                                  </span>
                                  <span className="text-gray-500">Qty: {size.quantity}</span>
                                </div>
                                
                                {/* Price Editing Section */}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs text-gray-500">Price per unit:</span>
                                  {isEditing ? (
                                    <>
                                      <div className="flex items-center gap-1">
                                        <span className="text-sm">$</span>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0.01"
                                          value={tempPrice}
                                          onChange={(e) => setTempPrice(e.target.value)}
                                          className="w-24 h-7 text-sm"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleSavePrice(index, sizeIndex);
                                            } else if (e.key === 'Escape') {
                                              handleCancelPriceEdit();
                                            }
                                          }}
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleSavePrice(index, sizeIndex)}
                                        className="h-7 px-2 bg-green-600 hover:bg-green-700"
                                      >
                                        <Save className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleCancelPriceEdit}
                                        className="h-7 px-2"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-sm font-semibold text-gray-900">
                                        ${size.price.toFixed(2)}
                                      </span>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditPrice(index, sizeIndex, size.price)}
                                        className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                                
                                {/* Show original price if modified */}
                                {hasModifiedPrice && !isEditing && (
                                  <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                                    <span>Original: ${originalPrice.toFixed(2)}</span>
                                    <span className="font-medium">(Modified ✓)</span>
                                  </div>
                                )}
                                
                                {/* Line total */}
                                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                  <span className="text-xs text-gray-500">Line Total:</span>
                                  <span className="text-sm font-bold text-gray-900">
                                    ${(size.quantity * size.price).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-6 min-w-[100px]">
                      <p className="font-semibold text-gray-900">
                        ${itemTotal.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Total Qty: {item.sizes?.reduce((sum: number, s: any) => sum + s.quantity, 0) || item.quantity}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Subtotal:</span>
                  <span className="text-purple-600">
                    ${cartItems.reduce((sum, item) => {
                      const itemTotal = item.sizes?.reduce(
                        (s: number, size: any) => s + (size.quantity * size.price),
                        0
                      ) || (item.price * item.quantity);
                      return sum + itemTotal;
                    }, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

          <ShippingSection form={form} />

          <OrderFormActions
            orderData={form.getValues()}
            form={form}
            isSubmitting={isSubmitting}
            isValidating={isValidating}
            isEditing={false}
            setModalIsOpen={setModalIsOpen}
            setIsCus={setIsCus}
            isCus={isCus}
            poIs={true}
            onPoSaveOnlyClick={handlePoSaveOnlySubmit}
            onPoSaveAndEmailClick={handlePoSaveAndEmailSubmit}
          />
        </form>
      </Form>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-6 border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <ClipboardList className="h-5 w-5 text-blue-600" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Vendor</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {vendorInfo?.company_name || `${vendorInfo?.first_name} ${vendorInfo?.last_name}`}
                </p>
                <p className="text-sm text-slate-500">{vendorInfo?.email}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-slate-900">Delivery to {warehouseAddress.name}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">{warehouseAddressLine}</p>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Product lines</span>
                  <span>{cartItems.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Total units</span>
                  <span>{totalQuantity}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-3 text-base font-semibold text-slate-900">
                  <span>Total</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product Selection Modal */}
      {showProductSelector && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-xl w-[95%] md:w-[90%] lg:w-[85%] xl:w-[80%] max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-blue-50">
              <h2 className="text-xl font-semibold text-blue-900 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Select Products for Purchase Order
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProductSelector(false)}
                className="hover:bg-purple-100"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="border-b bg-white px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Add from catalog or enter manually</p>
                  <p className="text-sm text-slate-500">
                    Use catalog products when available. Use manual entry for one-off vendor items, freight lines, or non-catalog purchases.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setProductPickerMode("catalog")}
                    className={productPickerMode === "catalog" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}
                  >
                    <ScanLine className="mr-2 h-4 w-4" />
                    Catalog
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setProductPickerMode("manual")}
                    className={productPickerMode === "manual" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Manual Item
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {productPickerMode === "catalog" ? (
                <div className="space-y-4">
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_220px_auto]">
                    <Input
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Search by product name, SKU, or description"
                    />
                    <select
                      value={catalogCategory}
                      onChange={(e) => setCatalogCategory(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="all">All categories</option>
                      {catalogCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setProductPickerMode("manual")}
                      className="whitespace-nowrap"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Manual Item
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Catalog results</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{filteredCatalogProducts.length}</p>
                      <p className="text-sm text-slate-500">Filter products and add directly to this PO.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Current PO lines</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{cartItems.length}</p>
                      <p className="text-sm text-slate-500">Existing items already added to this order.</p>
                    </div>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-600">Quick add flow</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">Expand a product, pick a size, set qty, add.</p>
                      <p className="text-sm text-slate-500">No page change, no separate product screen.</p>
                    </div>
                  </div>

                  <ScrollArea className="h-[52vh] rounded-2xl border border-slate-200">
                    <div className="space-y-3 p-4">
                      {catalogLoading ? (
                        <div className="py-10 text-center text-slate-500">Loading products...</div>
                      ) : filteredCatalogProducts.length === 0 ? (
                        <div className="py-10 text-center text-slate-500">
                          No matching products found. Try a different search or use Manual Item.
                        </div>
                      ) : (
                        filteredCatalogProducts.map((product) => {
                          const isExpanded = expandedProductId === product.id;
                          const sizes = (product.product_sizes || []).filter((size: any) => Number(size.stock || 0) >= 0);
                          const existingLine = cartItems.find(
                            (item: any) => String(item.productId) === String(product.id)
                          );
                          const existingUnits = existingLine?.sizes?.reduce(
                            (sum: number, size: any) => sum + Number(size.quantity || 0),
                            0
                          ) || 0;

                          return (
                            <div key={product.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                              <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-base font-semibold text-slate-900">{product.name}</p>
                                    <Badge variant="outline">{sizes.length} sizes</Badge>
                                    {existingUnits > 0 && (
                                      <Badge className="border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                        {existingUnits} already on PO
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                    <span>{product.category || "Uncategorized"}</span>
                                    {product.sku && <span>SKU: {product.sku}</span>}
                                    <span>{sizes.length ? `${sizes.length} purchasable sizes` : "No sizes configured"}</span>
                                  </div>
                                  <p className="mt-3 max-w-3xl text-sm text-slate-600">
                                    {product.description || "No description available."}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant={isExpanded ? "default" : "outline"}
                                    className={isExpanded ? "bg-blue-600 hover:bg-blue-700" : ""}
                                    onClick={() =>
                                      setExpandedProductId((prev) => (prev === product.id ? null : product.id))
                                    }
                                  >
                                    {isExpanded ? "Hide sizes" : "Select size and add"}
                                  </Button>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
                                  {sizes.length === 0 ? (
                                    <p className="text-sm text-slate-500">No sizes configured for this product.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="hidden rounded-2xl bg-slate-100 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 lg:grid lg:grid-cols-[minmax(0,1.35fr)_130px_140px_90px_100px_140px]">
                                        <span>Size</span>
                                        <span>Pack</span>
                                        <span>PO cost</span>
                                        <span>Stock</span>
                                        <span>Qty</span>
                                        <span>Add</span>
                                      </div>
                                      {sizes.map((size: any) => (
                                        <div
                                          key={size.id}
                                          className="grid gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 lg:grid-cols-[minmax(0,1.35fr)_130px_140px_90px_100px_140px] lg:items-center"
                                        >
                                          <div>
                                            {size.size_name && (
                                              <p className=" text-semibold text-slate-900">
                                                <strong> Product Name: </strong> {size.size_name}
                                              </p>
                                            )}
                                            <p className="font-medium text-slate-900">
                                              <strong> Size: </strong> {size.size_value} {size.size_unit}
                                            </p>
                                            {size.sku && <p className="text-xs text-slate-500">SKU: {size.sku}</p>}
                                          </div>
                                          <div className="text-sm text-slate-600">
                                            {size.quantity_per_case
                                              ? `${size.quantity_per_case} units/case`
                                              : "Pack not set"}
                                          </div>
                                          <div>
                                            <Label className="text-xs text-slate-500 lg:sr-only">PO cost</Label>
                                            <Input
                                              type="number"
                                              min="0.01"
                                              step="0.01"
                                              value={sizePriceOverrides[size.id] ?? String(Number(size.price || 0).toFixed(2))}
                                              onChange={(e) =>
                                                setSizePriceOverrides((prev) => ({
                                                  ...prev,
                                                  [size.id]: e.target.value,
                                                }))
                                              }
                                              className="h-10"
                                            />
                                            <p className="mt-1 text-xs text-slate-500">
                                              Catalog: ${Number(size.price || 0).toFixed(2)}
                                            </p>
                                          </div>
                                          <div className="text-sm text-slate-600">
                                            {Number(size.stock || 0)}
                                          </div>
                                          <div>
                                            <Label className="text-xs text-slate-500 lg:sr-only">Qty</Label>
                                            <Input
                                              type="number"
                                              min="1"
                                              value={sizeSelections[size.id] || 1}
                                              onChange={(e) =>
                                                setSizeSelections((prev) => ({
                                                  ...prev,
                                                  [size.id]: Math.max(1, Number(e.target.value) || 1),
                                                }))
                                              }
                                              className="h-10"
                                            />
                                          </div>
                                          <Button
                                            type="button"
                                            className="bg-blue-600 hover:bg-blue-700"
                                            onClick={() => handleCatalogAdd(product, size)}
                                          >
                                            Add to PO
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="mx-auto max-w-5xl space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:p-5">
                    <h3 className="text-lg font-semibold text-slate-900">Manual purchase order item</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Add vendor-specific products or charges that are not in the product catalog.
                    </p>

                    <div className="mt-4 space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-slate-900">Classification</p>
                          <p className="text-xs text-slate-500">Choose where this manual item belongs before receiving it.</p>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-4">
                          <div className="lg:col-span-2">
                            <Label>Category</Label>
                            <Select
                              value={manualProduct.category || undefined}
                              onValueChange={(value) =>
                                setManualProduct((prev) => ({
                                  ...prev,
                                  category: value,
                                  subcategory: "",
                                  pendingNewSubcategory: "",
                                }))
                              }
                            >
                              <SelectTrigger className="mt-1 h-10">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {manualCategories.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="lg:col-span-2">
                            <Label>Subcategory</Label>
                            <Select
                              value={manualProduct.subcategory || undefined}
                              onValueChange={(value) => {
                                if (value === ADD_NEW_SUBCATEGORY_VALUE) {
                                  handleOpenAddSubcategoryDialog();
                                  return;
                                }

                                setManualProduct((prev) => ({
                                  ...prev,
                                  subcategory: value,
                                  pendingNewSubcategory: "",
                                }));
                              }}
                              disabled={!manualProduct.category || manualSubcategories.length === 0}
                            >
                              <SelectTrigger className="mt-1 h-10">
                                <SelectValue
                                  placeholder={
                                    manualProduct.category
                                      ? manualSubcategories.length > 0
                                        ? "Select subcategory"
                                        : "No subcategories available"
                                      : "Select category first"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {[
                                  ...manualSubcategories,
                                  ...(manualProduct.pendingNewSubcategory &&
                                  !manualSubcategories.some(
                                    (subcategory) =>
                                      subcategory.toLowerCase() === manualProduct.pendingNewSubcategory.toLowerCase()
                                  )
                                    ? [manualProduct.pendingNewSubcategory]
                                    : []),
                                ].map((subcategory) => (
                                  <SelectItem key={subcategory} value={subcategory}>
                                    {subcategory}
                                  </SelectItem>
                                ))}
                                {isAdmin && (
                                  <SelectItem value={ADD_NEW_SUBCATEGORY_VALUE} className="bg-blue-600 text-white hover:bg-blue-700">
                                    + Add New Subcategory
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 shadow-sm">
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-slate-900">Size and inventory details</p>
                          <p className="text-xs text-slate-500">These values will be used to create the manual product size when stock is received.</p>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-6">
                          <div className="lg:col-span-6">
                            <Label htmlFor="manual-name">Product name</Label>
                            <Input
                              id="manual-name"
                              value={manualProduct.name}
                              onChange={(e) => setManualProduct((prev) => ({ ...prev, name: e.target.value }))}
                              placeholder="Enter item name"
                              className="mt-1 h-10"
                            />
                          </div>

                          <div className="lg:col-span-2">
                            <Label htmlFor="manual-sku">SKU</Label>
                            <Input
                              id="manual-sku"
                              value={manualProduct.sku}
                              onChange={(e) => setManualProduct((prev) => ({ ...prev, sku: e.target.value }))}
                              placeholder="SKU-001"
                              className="mt-1 h-10"
                            />
                          </div>

                          <div className="lg:col-span-4">
                            <Label htmlFor="manual-size">Size</Label>
                            <Input
                              id="manual-size"
                              value={manualProduct.size}
                              onChange={(e) => setManualProduct((prev) => ({ ...prev, size: e.target.value }))}
                              placeholder="500"
                              className="mt-1 h-10"
                            />
                          </div>

                          <div className="lg:col-span-2">
                            <Label htmlFor="manual-unit">Unit</Label>
                            <Select
                              value={manualProduct.unit}
                              onValueChange={(value) => setManualProduct((prev) => ({ ...prev, unit: value }))}
                            >
                              <SelectTrigger id="manual-unit" className="mt-1 h-10">
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={MANUAL_NO_UNIT_VALUE}>No Unit Selected</SelectItem>
                                {["unit", "case", "box", "pack", "roll", "pallet"].map((unit) => (
                                  <SelectItem key={unit} value={unit}>
                                    {unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="mt-1 flex items-start gap-1 text-xs text-amber-700">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                              <span>Leave as No Unit Selected when this item does not require a measurement unit.</span>
                            </p>
                          </div>

                          <div className="lg:col-span-1">
                            <Label htmlFor="manual-stock">Stock</Label>
                            <Input
                              id="manual-stock"
                              type="number"
                              min="1"
                              value={manualProduct.stock}
                              onChange={(e) => setManualProduct((prev) => ({ ...prev, stock: e.target.value }))}
                              className="mt-1 h-10"
                            />
                          </div>

                          <div className="lg:col-span-1">
                            <Label htmlFor="manual-qpercase">Q.Per Case</Label>
                            <Input
                              id="manual-qpercase"
                              type="number"
                              min="1"
                              value={manualProduct.quantityPerCase}
                              onChange={(e) => setManualProduct((prev) => ({ ...prev, quantityPerCase: e.target.value }))}
                              className="mt-1 h-10 bg-yellow-50 border-yellow-200"
                            />
                          </div>

                          <div className="lg:col-span-2">
                            <Label htmlFor="manual-price">$/CS</Label>
                            <Input
                              id="manual-price"
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={manualProduct.price}
                              onChange={(e) => setManualProduct((prev) => ({ ...prev, price: e.target.value }))}
                              placeholder="0.00"
                              className="mt-1 h-10"
                            />
                          </div>

                          <div className="lg:col-span-1">
                            <Label htmlFor="manual-unit-price">$/Unit (Auto)</Label>
                            <Input
                              id="manual-unit-price"
                              value={(
                                (Number(manualProduct.price) || 0) /
                                Math.max(Number(manualProduct.quantityPerCase) || 0, 1)
                              ).toFixed(2)}
                              readOnly
                              disabled
                              className="mt-1 h-10 bg-gray-100 text-slate-500 cursor-not-allowed"
                            />
                          </div>

                          <div className="lg:col-span-1">
                            <Label htmlFor="manual-shipcs">Ship/CS</Label>
                            <Input
                              id="manual-shipcs"
                              type="number"
                              min="0"
                              step="0.01"
                              value={manualProduct.shippingCost}
                              onChange={(e) => setManualProduct((prev) => ({ ...prev, shippingCost: e.target.value }))}
                              className="mt-1 h-10"
                            />
                          </div>

                          <div className="lg:col-span-1">
                            <Label htmlFor="manual-sequence">Sequence</Label>
                            <Input
                              id="manual-sequence"
                              type="number"
                              min="0"
                              value={manualProduct.sequence}
                              onChange={(e) => setManualProduct((prev) => ({ ...prev, sequence: e.target.value }))}
                              className="mt-1 h-10"
                            />
                          </div>

                          <div className="lg:col-span-2">
                            <Label>Sell Type</Label>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-700">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={manualProduct.sellByUnit}
                                  onChange={(e) => setManualProduct((prev) => ({ ...prev, sellByUnit: e.target.checked }))}
                                />
                                Sell by Unit
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={manualProduct.sellByCase}
                                  onChange={(e) => setManualProduct((prev) => ({ ...prev, sellByCase: e.target.checked }))}
                                />
                                Sell by Case
                              </label>
                            </div>
                          </div>

                          <div className="lg:col-start-1 lg:col-span-1">
                            <Label htmlFor="manual-ndc">NDC Code</Label>
                            <Input
                              id="manual-ndc"
                              value={manualProduct.ndcCode}
                              onChange={(e) => setManualProduct((prev) => ({ ...prev, ndcCode: e.target.value }))}
                              placeholder="12345-678-90"
                              className="mt-1 h-10"
                            />
                          </div>

                          <div className="lg:col-span-1">
                            <Label htmlFor="manual-upc">UPC Code</Label>
                            <Input
                              id="manual-upc"
                              value={manualProduct.upcCode}
                              onChange={(e) => setManualProduct((prev) => ({ ...prev, upcCode: e.target.value }))}
                              placeholder="012345678901"
                              className="mt-1 h-10"
                            />
                          </div>

                          <div className="lg:col-span-1">
                            <Label htmlFor="manual-lot">Lot Number</Label>
                            <Input
                              id="manual-lot"
                              value={manualProduct.lotNumber}
                              onChange={(e) => setManualProduct((prev) => ({ ...prev, lotNumber: e.target.value }))}
                              placeholder="LOT-2024-001"
                              className="mt-1 h-10"
                            />
                          </div>

                          <div className="lg:col-span-1">
                            <Label htmlFor="manual-expiry">Expiry Date</Label>
                            <Input
                              id="manual-expiry"
                              type="date"
                              value={manualProduct.expiryDate}
                              onChange={(e) => setManualProduct((prev) => ({ ...prev, expiryDate: e.target.value }))}
                              className="mt-1 h-10"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-blue-100 bg-white p-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Estimated line total</p>
                        <p className="text-2xl font-semibold text-blue-700">
                          ${((Number(manualProduct.stock) || 0) * (Number(manualProduct.price) || 0)).toFixed(2)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleManualProductAdd}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Add Manual Item to PO
                      </Button>
                    </div>

                    {addedManualItems.length > 0 && (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">
                            Added manual items
                          </p>
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                            {addedManualItems.length} item{addedManualItems.length > 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <div className="grid gap-2">
                          {addedManualItems.map((item: any) => {
                            const firstSize = item.sizes?.[0];
                            return (
                              <div
                                key={item.productId}
                                className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm lg:grid-cols-[minmax(0,2fr)_120px_90px_120px_40px]"
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-slate-900">{item.name}</p>
                                  <p className="truncate text-xs text-slate-500">
                                    {item.category || "Manual Item"}
                                    {item.subcategory ? ` / ${item.subcategory}` : ""}
                                    {firstSize?.size_value ? ` • ${firstSize.size_value} ${firstSize.size_unit || ""}` : ""}
                                  </p>
                                </div>
                                <div className="text-slate-600">
                                  Qty: {item.quantity || firstSize?.quantity || 0}
                                </div>
                                <div className="text-slate-600">
                                  ${Number(firstSize?.price || 0).toFixed(2)}
                                </div>
                                <div className="font-semibold text-blue-700">
                                  ${Number(item.price || 0).toFixed(2)}
                                </div>
                                <div className="flex justify-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                                    onClick={async () => {
                                      const removed = await removeFromCart(item.productId);

                                      if (removed) {
                                        toast({
                                          title: "Manual item removed",
                                          description: `${item.name} was removed from this purchase order.`,
                                        });
                                      } else {
                                        toast({
                                          title: "Remove failed",
                                          description: "Unable to remove this manual item.",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowProductSelector(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowProductSelector(false);
                  toast({
                    title: "Products Added",
                    description: `${cartItems.length} product(s) added to purchase order`,
                  });
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Done - Add to PO
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
