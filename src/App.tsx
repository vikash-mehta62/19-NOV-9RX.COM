import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Products from "./pages/Products";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ShippingInfo from "./pages/ShippingInfo";
import ReturnPolicy from "./pages/ReturnPolicy";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminProducts from "./pages/admin/Products";
import AdminInventory from "./pages/admin/Inventory";
import AdminOrders from "./pages/admin/Orders";
import AdminCreateOrder from "./pages/admin/CreateOrder";
import AdminInvoices from "./pages/admin/Invoices";
import PharmacyInvoices from "./pages/pharmacy/Invoices";
import AdminGroupPricing from "./pages/admin/GroupPricing";
import AdminGroups from "./pages/admin/Groups";
import AdminSettings from "./pages/admin/Settings";
import AdminFestivalThemes from "./pages/admin/FestivalThemes";
import AdminBanners from "./pages/admin/Banners";
import AdminOffers from "./pages/admin/Offers";
import AdminBlogs from "./pages/admin/Blogs";
import AdminAnnouncements from "./pages/admin/Announcements";
import AdminEmailTemplates from "./pages/admin/EmailTemplates";
import AdminEmailCampaigns from "./pages/admin/EmailCampaigns";
import AdminEmailAutomations from "./pages/admin/EmailAutomations";
import AdminEmailSettings from "./pages/admin/EmailSettings";
import AdminAbandonedCarts from "./pages/admin/AbandonedCarts";
import AdminRewards from "./pages/admin/Rewards";
import AdminCreditManagement from "./pages/admin/CreditManagement";
import AdminPaymentTransactions from "./pages/admin/PaymentTransactions";
import PharmacyDashboard from "./pages/pharmacy/Dashboard";
import PharmacyOrder from "./pages/pharmacy/Order";
import PharmacyCreateOrder from "./pages/pharmacy/CreateOrder";
import PharmacyOrders from "./pages/pharmacy/Orders";
import PharmacySettings from "./pages/pharmacy/Settings";
import PharmacyProducts from "./pages/pharmacy/Products";
import CategoryBrowse from "./pages/pharmacy/CategoryBrowse";
import SizeDetail from "./pages/pharmacy/SizeDetail";
import PharmacyOrderHistory from "./pages/pharmacy/OrderHistory";
import PharmacyStatements from "./pages/pharmacy/Statements";
import PharmacyCredit from "./pages/pharmacy/Credit";
import PharmacyRewards from "./pages/pharmacy/Rewards";
import PharmacyWishlist from "./pages/pharmacy/Wishlist";
import PharmacyHelp from "./pages/pharmacy/Help";
import PharmacyPaymentMethods from "./pages/pharmacy/PaymentMethods";
import GroupDashboard from "./pages/group/Dashboard";
import GroupOrder from "./pages/group/Order";
import GroupOrders from "./pages/group/Orders";
import GroupAnalytics from "./pages/group/Analytics";
import GroupReports from "./pages/group/Reports";
import GroupSettings from "./pages/group/Settings";
import GroupLocations from "./pages/group/Locations";
import GroupPricing from "./pages/group/Pricing";
import GroupInvitations from "./pages/group/Invitations";
import JoinGroup from "./pages/JoinGroup";
import HospitalDashboard from "./pages/hospital/Dashboard";
import HospitalOrder from "./pages/hospital/Order";
import HospitalOrders from "./pages/hospital/Orders";
import HospitalSettings from "./pages/hospital/Settings";
import { Staff } from "./pages/group/Staff";
import { useEffect } from "react";
import { useToast } from "./hooks/use-toast";
import { useAuthCheck } from "./useAuthCheck";
import GroupProducts from "./pages/group/GroupProduct";
import ActivationUser from "./components/ActiovationUser";
import PasswordReset from "./components/ResetPassword";
import UserSelfDetails from "./components/UserSelfDetails";
import PayNowOrder from "./components/PayNowOrder";
import CartItemsPricing from "./components/CartItemsPricing";
import { supabase } from "./integrations/supabase/client";
import ResetPasswordPage from "./components/ResetPassowrdPage";
import Expenses from "./pages/admin/Expenses";
import AdminLogs from "./pages/admin/AdminLogs";
import ProductDetails from "./pages/ProductDetails";
import AccessRequests from "./pages/AccessRequests";

export let CATEGORY_CONFIGS: Record<
  string,
  {
    sizeUnits: string[];
    defaultUnit: string;
    hasRolls: boolean;
    requiresCase: boolean;
  }
> = {};
export let PRODUCT_CATEGORIES: string[] = [];

// Function to fetch and set CATEGORY_CONFIGS
export async function fetchCategoryConfigs() {
  const { data, error } = await supabase
    .from('category_configs')
    .select('*');

  console.log(data, "DATA")
  if (error) {
    console.error('❌ Failed to load CATEGORY_CONFIGS:', error.message);
    return;
  }
  PRODUCT_CATEGORIES = data.map((row) => row.category_name);

  CATEGORY_CONFIGS = data.reduce((acc, row) => {
    acc[row.category_name] = {
      sizeUnits: row.size_units,
      defaultUnit: row.default_unit,
      hasRolls: row.has_rolls,
      requiresCase: row.requires_case
    };
    return acc;
  }, {} as typeof CATEGORY_CONFIGS);

  console.log('✅ CATEGORY_CONFIGS loaded:', CATEGORY_CONFIGS);
}
// Protected route wrapper component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const location = useLocation();
  const userType = sessionStorage.getItem('userType');
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(userType || '')) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { toast } = useToast();
  const location = useLocation();
  useAuthCheck();


  useEffect(() => {


    fetchCategoryConfigs();


    // Clear any expired sessions
    const lastActivity = sessionStorage.getItem('lastActivity');
    if (lastActivity && Date.now() - parseInt(lastActivity) > 24 * 60 * 60 * 1000) {
      sessionStorage.clear();
      toast({
        title: "Session Expired",
        description: "Please log in again to continue.",
        variant: "destructive",
      });
    } else {
      sessionStorage.setItem('lastActivity', Date.now().toString());
    }
  }, [location.pathname, toast]);




  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />

      <Route path="/product/:id" element={<ProductDetails />} />

      <Route path="/login" element={<Login />} />
      <Route path="/activation" element={<ActivationUser />} />
      <Route path="/update-profile" element={<UserSelfDetails />} />
      <Route path="/reset-password" element={<PasswordReset />} />
      <Route path="/reset-password-page" element={<ResetPasswordPage />} />
      <Route path="/pay-now" element={<PayNowOrder />} />
      <Route path="/products" element={<Products />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/shipping-info" element={<ShippingInfo />} />
      <Route path="/return-policy" element={<ReturnPolicy />} />
      <Route path="/cart-price" element={<CartItemsPricing />} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminUsers />
        </ProtectedRoute>
      } />
      <Route path="/admin/products" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminProducts />
        </ProtectedRoute>
      } />
      <Route path="/admin/inventory" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminInventory />
        </ProtectedRoute>
      } />
      <Route path="/admin/expenses" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Expenses />
        </ProtectedRoute>
      } />
      <Route path="/admin/orders" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminOrders />
        </ProtectedRoute>
      } />
      <Route path="/admin/orders/create" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminCreateOrder />
        </ProtectedRoute>
      } />

      <Route path="/admin/access-requests" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AccessRequests />
        </ProtectedRoute>
      } />
      <Route path="/admin/orders/edit/:orderId" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminCreateOrder />
        </ProtectedRoute>
      } />
      <Route path="/admin/po/edit/:orderId" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminCreateOrder />
        </ProtectedRoute>
      } />
      <Route path="/admin/logs" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLogs />
        </ProtectedRoute>
      } />


      <Route path="/admin/po" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminOrders />
        </ProtectedRoute>
      } />

      <Route path="/admin/invoices" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminInvoices />
        </ProtectedRoute>
      } />
      <Route path="/admin/group-pricing" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminGroupPricing />
        </ProtectedRoute>
      } />
      <Route path="/admin/groups" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminGroups />
        </ProtectedRoute>
      } />
      <Route path="/admin/settings" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminSettings />
        </ProtectedRoute>
      } />
      <Route path="/admin/payment-transactions" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminPaymentTransactions />
        </ProtectedRoute>
      } />
      <Route path="/admin/festival-themes" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminFestivalThemes />
        </ProtectedRoute>
      } />
      <Route path="/admin/banners" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminBanners />
        </ProtectedRoute>
      } />
      <Route path="/admin/offers" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminOffers />
        </ProtectedRoute>
      } />
      <Route path="/admin/blogs" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminBlogs />
        </ProtectedRoute>
      } />
      <Route path="/admin/announcements" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminAnnouncements />
        </ProtectedRoute>
      } />
      <Route path="/admin/email-templates" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminEmailTemplates />
        </ProtectedRoute>
      } />
      <Route path="/admin/email-campaigns" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminEmailCampaigns />
        </ProtectedRoute>
      } />
      <Route path="/admin/email-automations" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminEmailAutomations />
        </ProtectedRoute>
      } />
      <Route path="/admin/email-settings" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminEmailSettings />
        </ProtectedRoute>
      } />
      <Route path="/admin/abandoned-carts" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminAbandonedCarts />
        </ProtectedRoute>
      } />
      <Route path="/admin/rewards" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminRewards />
        </ProtectedRoute>
      } />
      <Route path="/admin/credit-management" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminCreditManagement />
        </ProtectedRoute>
      } />

      {/* Pharmacy Routes */}
      <Route path="/pharmacy" element={<Navigate to="/pharmacy/categories" replace />} />
      <Route path="/pharmacy/categories" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <CategoryBrowse />
        </ProtectedRoute>
      } />
      <Route path="/pharmacy/dashboard" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <PharmacyDashboard />
        </ProtectedRoute>
      } />
      <Route path="/pharmacy/products" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <PharmacyProducts />
        </ProtectedRoute>
      } />
      {/* Redirect /pharmacy/product/ to products list */}
      <Route path="/pharmacy/product" element={<Navigate to="/pharmacy/products" replace />} />
      {/* More specific route with two params must come BEFORE single param route */}
      <Route path="/pharmacy/product/:productId/:sizeId" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <SizeDetail />
        </ProtectedRoute>
      } />
      {/* Single param route - shows product details page */}
      <Route path="/pharmacy/product/:productId" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <ProductDetails />
        </ProtectedRoute>
      } />
   
      <Route path="/pharmacy/order" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <PharmacyOrder />
        </ProtectedRoute>
      } />
      <Route path="/pharmacy/order/create" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <PharmacyCreateOrder />
        </ProtectedRoute>
      } />
      <Route path="/pharmacy/orders" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <PharmacyOrders />
        </ProtectedRoute>
      } />
      {/* <Route path="/pharmacy/po" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <PharmacyOrders />
        </ProtectedRoute>
      } /> */}
      <Route path="/pharmacy/settings" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <PharmacySettings />
        </ProtectedRoute>
      } />

      <Route path="/pharmacy/invoices" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <PharmacyInvoices />
        </ProtectedRoute>
      } />
      <Route path="/pharmacy/order-history" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <PharmacyOrderHistory />
        </ProtectedRoute>
      } />
      <Route path="/pharmacy/statements" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <PharmacyStatements />
        </ProtectedRoute>
      } />
      <Route path="/pharmacy/credit" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <PharmacyCredit />
        </ProtectedRoute>
      } />
      <Route path="/pharmacy/rewards" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <PharmacyRewards />
        </ProtectedRoute>
      } />
      <Route path="/pharmacy/wishlist" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <PharmacyWishlist />
        </ProtectedRoute>
      } />
      <Route path="/pharmacy/help" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <PharmacyHelp />
        </ProtectedRoute>
      } />
      <Route path="/pharmacy/payment-methods" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <PharmacyPaymentMethods />
        </ProtectedRoute>
      } />
      {/* Group Routes */}
      <Route path="/group/dashboard" element={
        <ProtectedRoute allowedRoles={['group']}>
          <GroupDashboard />
        </ProtectedRoute>
      } />
      <Route path="/group/locations" element={
        <ProtectedRoute allowedRoles={['group']}>
          <GroupLocations />
        </ProtectedRoute>
      } />
      <Route path="/group/order" element={
        <ProtectedRoute allowedRoles={['group']}>
          <GroupOrder />
        </ProtectedRoute>
      } />


      <Route path="/group/invoices" element={
        <ProtectedRoute allowedRoles={['group']}>
          <PharmacyInvoices />
        </ProtectedRoute>
      } />
      <Route path="/group/orders" element={
        <ProtectedRoute allowedRoles={['group']}>
          <GroupOrders />
        </ProtectedRoute>
      } />
      <Route path="/group/products" element={
        <ProtectedRoute allowedRoles={['group']}>
          <GroupProducts />
        </ProtectedRoute>
      } />
      <Route path="/group/analytics" element={
        <ProtectedRoute allowedRoles={['group']}>
          <GroupAnalytics />
        </ProtectedRoute>
      } />
      <Route path="/group/reports" element={
        <ProtectedRoute allowedRoles={['group']}>
          <GroupReports />
        </ProtectedRoute>
      } />
      <Route path="/group/settings" element={
        <ProtectedRoute allowedRoles={['group']}>
          <GroupSettings />
        </ProtectedRoute>
      } />
      <Route path="/group/staff" element={
        <ProtectedRoute allowedRoles={['group']}>
          <Staff />
        </ProtectedRoute>
      } />
      <Route path="/group/pricing" element={
        <ProtectedRoute allowedRoles={['group']}>
          <GroupPricing />
        </ProtectedRoute>
      } />
      <Route path="/group/invitations" element={
        <ProtectedRoute allowedRoles={['group']}>
          <GroupInvitations />
        </ProtectedRoute>
      } />

      {/* Public Routes */}
      <Route path="/join-group" element={<JoinGroup />} />

      {/* Hospital Routes */}
      <Route path="/hospital/dashboard" element={
        <ProtectedRoute allowedRoles={['hospital']}>
          <HospitalDashboard />
        </ProtectedRoute>
      } />
      <Route path="/hospital/order" element={
        <ProtectedRoute allowedRoles={['hospital']}>
          <HospitalOrder />
        </ProtectedRoute>
      } />
      <Route path="/hospital/orders" element={
        <ProtectedRoute allowedRoles={['hospital']}>
          <HospitalOrders />
        </ProtectedRoute>
      } />
      <Route path="/hospital/settings" element={
        <ProtectedRoute allowedRoles={['hospital']}>
          <HospitalSettings />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;