import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { useToast } from "./hooks/use-toast";
import { useAuthCheck } from "./useAuthCheck";
import { supabase } from "./integrations/supabase/client";
import { CartSync } from "./components/CartSync";
import BannerSeeder from "./components/BannerSeeder";
import MaintenanceBanner from "./components/MaintenanceBanner";
import MaintenanceModal from "./components/MaintenanceModal";
import { Loader2 } from "lucide-react";

// Loading component for lazy loaded routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
  </div>
);

// Eagerly loaded pages (critical path)
import Index from "./pages/Index";
import Login from "./pages/Login";

// Lazy loaded public pages
const Products = lazy(() => import("./pages/Products"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const ShippingInfo = lazy(() => import("./pages/ShippingInfo"));
const ReturnPolicy = lazy(() => import("./pages/ReturnPolicy"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Blog = lazy(() => import("./pages/Blog"));
const Contact = lazy(() => import("./pages/Contact"));
const Newsletter = lazy(() => import("./pages/Newsletter"));
const Sitemap = lazy(() => import("./pages/Sitemap"));
const JoinGroup = lazy(() => import("./pages/JoinGroup"));
const AccessRequests = lazy(() => import("./pages/AccessRequests"));

// Lazy loaded auth/utility pages
const ActivationUser = lazy(() => import("./components/ActiovationUser"));
const PasswordReset = lazy(() => import("./components/ResetPassword"));
const LaunchPasswordReset = lazy(() => import("./pages/LaunchPasswordReset"));
const UserSelfDetails = lazy(() => import("./components/UserSelfDetails"));
const PayNowOrder = lazy(() => import("./components/PayNowOrder"));
const CartItemsPricing = lazy(() => import("./components/CartItemsPricing"));
const ResetPasswordPage = lazy(() => import("./components/ResetPassowrdPage"));

// Lazy loaded Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminInventory = lazy(() => import("./pages/admin/Inventory"));
const AdminInventoryPhase2 = lazy(() => import("./pages/admin/InventoryPhase2"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminCreateOrder = lazy(() => import("./pages/admin/CreateOrder"));
const AdminCreatePurchaseOrder = lazy(() => import("./pages/admin/CreatePurchaseOrder"));
const AdminQuickOrder = lazy(() => import("./pages/admin/QuickOrder"));
const AdminInvoices = lazy(() => import("./pages/admin/Invoices"));
const AdminGroupPricing = lazy(() => import("./pages/admin/GroupPricing"));
const AdminGroups = lazy(() => import("./pages/admin/Groups"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminFestivalThemes = lazy(() => import("./pages/admin/FestivalThemes"));
const AdminBanners = lazy(() => import("./pages/admin/Banners"));
const AdminOffers = lazy(() => import("./pages/admin/Offers"));
const AdminBlogs = lazy(() => import("./pages/admin/Blogs"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const AdminAnnouncements = lazy(() => import("./pages/admin/Announcements"));
const AdminEmailTemplates = lazy(() => import("./pages/admin/EmailTemplates"));
const AdminEmailCampaigns = lazy(() => import("./pages/admin/EmailCampaigns"));
const AdminEmailAutomations = lazy(() => import("./pages/admin/EmailAutomations"));
const AdminEmailSettings = lazy(() => import("./pages/admin/EmailSettings"));
const AdminAbandonedCarts = lazy(() => import("./pages/admin/AbandonedCarts"));
const AdminIntelligence = lazy(() => import("./pages/admin/Intelligence"));
const AdminAlerts = lazy(() => import("./pages/admin/Alerts"));
const AdminAutomation = lazy(() => import("./pages/admin/Automation"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const AdminSuppliers = lazy(() => import("./pages/admin/Suppliers"));
const AdminCostTracking = lazy(() => import("./pages/admin/CostTracking"));
const AdminRewards = lazy(() => import("./pages/admin/Rewards"));
const AdminCreditManagement = lazy(() => import("./pages/admin/CreditManagement"));
const AdminPaymentTransactions = lazy(() => import("./pages/admin/PaymentTransactions"));
const Expenses = lazy(() => import("./pages/admin/Expenses"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AdminLaunchPasswordReset = lazy(() => import("./pages/admin/LaunchPasswordReset"));

// Lazy loaded Pharmacy pages
const PharmacyDashboard = lazy(() => import("./pages/pharmacy/Dashboard"));
const PharmacyOrder = lazy(() => import("./pages/pharmacy/Order"));
const PharmacyCreateOrder = lazy(() => import("./pages/pharmacy/CreateOrder"));
const PharmacyOrders = lazy(() => import("./pages/pharmacy/Orders"));
const PharmacyOrderDetail = lazy(() => import("./pages/pharmacy/OrderDetail"));
const PharmacySettings = lazy(() => import("./pages/pharmacy/Settings"));
const PharmacyProducts = lazy(() => import("./pages/pharmacy/Products"));
const CategoryBrowse = lazy(() => import("./pages/pharmacy/CategoryBrowse"));
const SizeDetail = lazy(() => import("./pages/pharmacy/SizeDetail"));
const PharmacyOrderHistory = lazy(() => import("./pages/pharmacy/OrderHistory"));
const PharmacyStatements = lazy(() => import("./pages/pharmacy/Statements"));
const PharmacyCredit = lazy(() => import("./pages/pharmacy/Credit"));
const PharmacyRewards = lazy(() => import("./pages/pharmacy/Rewards"));
const PharmacyWishlist = lazy(() => import("./pages/pharmacy/Wishlist"));
const PharmacyHelp = lazy(() => import("./pages/pharmacy/Help"));
const PharmacyPaymentMethods = lazy(() => import("./pages/pharmacy/PaymentMethods"));
const PharmacyNotifications = lazy(() => import("./pages/pharmacy/Notifications"));
const PharmacyInvoices = lazy(() => import("./pages/pharmacy/Invoices"));
const PharmacyBuyAgain = lazy(() => import("./pages/pharmacy/BuyAgain"));
const PharmacyDeals = lazy(() => import("./pages/pharmacy/Deals"));

// Lazy loaded Group pages
const GroupDashboard = lazy(() => import("./pages/group/Dashboard"));
const GroupOrder = lazy(() => import("./pages/group/Order"));
const GroupOrders = lazy(() => import("./pages/group/Orders"));
const GroupAnalytics = lazy(() => import("./pages/group/Analytics"));
const GroupReports = lazy(() => import("./pages/group/Reports"));
const GroupSettings = lazy(() => import("./pages/group/Settings"));
const GroupLocations = lazy(() => import("./pages/group/Locations"));
const GroupPricing = lazy(() => import("./pages/group/Pricing"));
const GroupInvitations = lazy(() => import("./pages/group/Invitations"));
const GroupProducts = lazy(() => import("./pages/group/GroupProduct"));
const Staff = lazy(() => import("./pages/group/Staff").then(m => ({ default: m.Staff })));

// Lazy loaded Hospital pages
const HospitalDashboard = lazy(() => import("./pages/hospital/Dashboard"));
const HospitalOrder = lazy(() => import("./pages/hospital/Order"));
const HospitalOrders = lazy(() => import("./pages/hospital/Orders"));
const HospitalSettings = lazy(() => import("./pages/hospital/Settings"));

// Email cron is handled by backend server only - see server/cron/emailCron.js

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
    <>
      <MaintenanceBanner />
      <MaintenanceModal />
      <CartSync />
      <BannerSeeder />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/activation" element={<ActivationUser />} />
          <Route path="/update-profile" element={<UserSelfDetails />} />
          <Route path="/reset-password" element={<LaunchPasswordReset />} />
          <Route path="/launch-password-reset" element={<LaunchPasswordReset />} />
          <Route path="/reset-password-page" element={<ResetPasswordPage />} />
          <Route path="/pay-now" element={<PayNowOrder />} />
          <Route path="/products" element={<Products />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/shipping-info" element={<ShippingInfo />} />
          <Route path="/return-policy" element={<ReturnPolicy />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/newsletter" element={<Newsletter />} />
          <Route path="/sitemap" element={<Sitemap />} />
          <Route path="/cart-price" element={<CartItemsPricing />} />
          <Route path="/join-group" element={<JoinGroup />} />

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
          <Route path="/admin/product/:productId" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ProductDetails />
            </ProtectedRoute>
          } />
          <Route path="/admin/inventory" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminInventory />
            </ProtectedRoute>
          } />
          <Route path="/admin/inventory-phase2" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminInventoryPhase2 />
            </ProtectedRoute>
          } />
          <Route path="/admin/expenses" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Expenses />
            </ProtectedRoute>
          } />
          <Route path="/admin/analytics" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAnalytics />
            </ProtectedRoute>
          } />
          <Route path="/admin/intelligence" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminIntelligence />
            </ProtectedRoute>
          } />
          <Route path="/admin/alerts" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAlerts />
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminReports />
            </ProtectedRoute>
          } />
          <Route path="/admin/suppliers" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminSuppliers />
            </ProtectedRoute>
          } />
          <Route path="/admin/cost-tracking" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminCostTracking />
            </ProtectedRoute>
          } />
          <Route path="/admin/automation" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAutomation />
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
          <Route path="/admin/orders/quick" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminQuickOrder />
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
          <Route path="/admin/po/create" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminCreatePurchaseOrder />
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
          <Route path="/admin/launch-password-reset" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLaunchPasswordReset />
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
          <Route path="/pharmacy" element={<Navigate to="/pharmacy/products" replace />} />
          {/* <Route path="/pharmacy/categories" element={
            <ProtectedRoute allowedRoles={['pharmacy']}>
              <CategoryBrowse />
            </ProtectedRoute>
          } /> */}
          <Route path="/pharmacy/deals" element={
            <ProtectedRoute allowedRoles={['pharmacy']}>
              <PharmacyDeals />
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
          <Route path="/pharmacy/product" element={<Navigate to="/pharmacy/products" replace />} />
          <Route path="/pharmacy/product/:productId/:sizeId" element={
            <ProtectedRoute allowedRoles={['pharmacy']}>
              <SizeDetail />
            </ProtectedRoute>
          } />
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
          <Route path="/pharmacy/orders/:orderId" element={
            <ProtectedRoute allowedRoles={['pharmacy']}>
              <PharmacyOrderDetail />
            </ProtectedRoute>
          } />
          <Route path="/pharmacy/settings" element={
            <ProtectedRoute allowedRoles={['pharmacy']}>
              <PharmacySettings />
            </ProtectedRoute>
          } />
          <Route path="/pharmacy/settings/update-profile" element={
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
          <Route path="/pharmacy/notifications" element={
            <ProtectedRoute allowedRoles={['pharmacy']}>
              <PharmacyNotifications />
            </ProtectedRoute>
          } />
          <Route path="/pharmacy/buy-again" element={
            <ProtectedRoute allowedRoles={['pharmacy']}>
              <PharmacyBuyAgain />
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
          <Route path="/group/product/:productId/:sizeId" element={
            <ProtectedRoute allowedRoles={['group']}>
              <SizeDetail />
            </ProtectedRoute>
          } />
          <Route path="/group/product/:productId" element={
            <ProtectedRoute allowedRoles={['group']}>
              <ProductDetails />
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
          <Route path="/group/settings/update-profile" element={
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
      </Suspense>
    </>
  );
}

export default App;
