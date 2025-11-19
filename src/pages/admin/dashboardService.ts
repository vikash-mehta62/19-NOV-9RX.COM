import { supabase } from "@/supabaseClient";

export const fetchDashboardData = async () => {
  try {
    // Fetch total revenue (using 'shipped' status instead of 'completed')
    const { data: revenueData, error: revenueError } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("status", "shipped")
  .or("void.eq.false,void.is.null"); // ✅ include void = false or null

    const totalRevenue = revenueData?.reduce(
      (acc: number, order: any) => acc + parseFloat(order.total_amount),
      0
    ).toFixed(2) || "0.00";

    // Fetch order count by status
    const { data: activeOrdersData, error } = await supabase
    .from("orders")
    .select("*")
    .eq("status", "processing")
    .eq("poAccept", true)
.eq("void", false)
   
  if (error) {
    console.error("Error fetching data:", error);
  } else {
    console.log("Fetched data:", activeOrdersData);
  }
  
    // Fetch pending invoices
    const { data: pendingInvoicesData } = await supabase
      .from("invoices")
      .select("*")
      .eq("payment_status", "unpaid")
.eq("void", false)

    // Fix the low stock query using a proper comparison
    const { data: lowStockProducts } = await supabase
      .rpc('get_low_stock_products');

    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("id", { count: "exact" });

    return {
      totalRevenue,
      activeOrdersCount: activeOrdersData?.length || 0,
      pendingInvoicesCount: pendingInvoicesData?.length || 0,
      stockAlertCount: lowStockProducts?.length || 0,
      productCount: productData ? productData.length : 0,
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return {
      totalRevenue: "0.00",
      activeOrdersCount: 0,
      pendingInvoicesCount: 0,
      stockAlertCount: 0,
      productCount: 0,
    };
  }
};