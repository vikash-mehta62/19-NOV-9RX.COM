import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useToast } from "./hooks/use-toast";
import { useAuthCheck } from "./useAuthCheck";
import { supabase } from "./integrations/supabase/client";
import { CartSync } from "./components/CartSync";
import MaintenanceBanner from "./components/MaintenanceBanner";
import MaintenanceModal from "./components/MaintenanceModal";
import { Loader2 } from "lucide-react";
import { AdminPermission, hasEveryAdminPermission, isInternalAdminType } from "@/lib/adminAccess";
import { AppRouteSeo } from "@/components/seo/AppRouteSeo";

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
const BlogDetail = lazy(() => import("./pages/BlogDetail"));
const Contact = lazy(() => import("./pages/Contact"));
const Newsletter = lazy(() => import("./pages/Newsletter"));
const Sitemap = lazy(() => import("./pages/Sitemap"));
const JoinGroup = lazy(() => import("./pages/JoinGroup"));
const AccessRequests = lazy(() => import("./pages/AccessRequests"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy loaded auth/utility pages
const ActivationUser = lazy(() => import("./components/ActiovationUser"));
const PasswordReset = lazy(() => import("./components/ResetPassword"));
const LaunchPasswordReset = lazy(() => import("./pages/LaunchPasswordReset"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPasswordNew = lazy(() => import("./pages/auth/ResetPassword"));
const AcceptTerms = lazy(() => import("./pages/AcceptTerms"));
const UserSelfDetails = lazy(() => import("./components/UserSelfDetails"));
const PayNowOrder = lazy(() => import("./components/PayNowOrder"));
const CartItemsPricing = lazy(() => import("./components/CartItemsPricing"));
const ResetPasswordPage = lazy(() => import("./components/ResetPassowrdPage"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const PaymentLaunch = lazy(() => import("./pages/PaymentLaunch"));

// Lazy loaded Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminCategoryManagement = lazy(() => import("./pages/admin/CategoryManagement"));
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
const AdminPaymentReconciliation = lazy(() => import("./pages/admin/PaymentReconciliation"));
const AdminTermsManagement = lazy(() => import("./pages/admin/TermsManagement"));
const Expenses = lazy(() => import("./pages/admin/Expenses"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const LoginLogsPage = lazy(() => import("./pages/admin/LoginLogsPage"));
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
const Staff = lazy(() => import("./pages/group/Staff"));

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

// Protected route wrapper component - Optimized for instant session check
const ProtectedRoute = ({
  children,
  allowedRoles,
  allowedPermissions = [],
  fallbackPath = "/",
}: {
  children: React.ReactNode;
  allowedRoles: string[];
  allowedPermissions?: AdminPermission[];
  fallbackPath?: string;
}) => {
  const location = useLocation();
  const allowedRolesKey = allowedRoles.join("|");
  const allowedPermissionsKey = allowedPermissions.join("|");
  const allowedRolesSet = useMemo(
    () => new Set(allowedRolesKey.split("|").filter(Boolean).map((role) => role.toLowerCase())),
    [allowedRolesKey]
  );
  
  // Check if session exists in localStorage (instant check, no API call)
  const hasSupabaseSession = useMemo(() => {
    const keys = Object.keys(localStorage);
    return keys.some(key => key.startsWith('sb-') && key.includes('auth-token'));
  }, []);
  
  // Check sessionStorage for cached user data
  const cachedIsLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
  const cachedUserType = sessionStorage.getItem("userType")?.toLowerCase();
  const cachedUserRole = sessionStorage.getItem("userRole")?.toLowerCase();
  
  // If no Supabase session in localStorage, immediately redirect to login (no blinking)
  if (!hasSupabaseSession) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Start with cached state to avoid blinking
  const [isChecking, setIsChecking] = useState(!cachedIsLoggedIn);
  const [isLoggedIn, setIsLoggedIn] = useState(cachedIsLoggedIn);
  const [isAllowed, setIsAllowed] = useState(() => {
    // Quick check with cached data
    if (!cachedIsLoggedIn) return false;
    const roleCandidates = new Set<string>();
    if (cachedUserType) roleCandidates.add(cachedUserType);
    if (cachedUserRole) {
      roleCandidates.add(cachedUserRole);
      if (cachedUserRole === "superadmin") roleCandidates.add("admin");
    }
    return [...roleCandidates].some((role) => allowedRolesSet.has(role));
  });

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          if (!isMounted) return;
          setIsLoggedIn(false);
          setIsAllowed(false);
          setIsChecking(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role,type,admin_permissions")
          .eq("id", session.user.id)
          .maybeSingle();

        const roleCandidates = new Set<string>();
        if (profile?.type) roleCandidates.add(String(profile.type).toLowerCase());
        if (profile?.role) {
          const normalizedRole = String(profile.role).toLowerCase();
          roleCandidates.add(normalizedRole);
          if (normalizedRole === "superadmin") {
            roleCandidates.add("admin");
          }
        }

        let allowed = [...roleCandidates].some((role) => allowedRolesSet.has(role));

        if (allowed && allowedPermissions.length > 0 && isInternalAdminType(profile?.type)) {
          allowed = hasEveryAdminPermission(profile, allowedPermissions);
        }

        if (!isMounted) return;
        setIsLoggedIn(true);
        setIsAllowed(allowed);
      } catch (error) {
        if (!isMounted) return;
        setIsLoggedIn(false);
        setIsAllowed(false);
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    // Only check if we don't have cached data or need to verify
    if (!cachedIsLoggedIn) {
      checkAccess();
    } else {
      // Verify in background but don't block UI
      checkAccess();
    }

    return () => {
      isMounted = false;
    };
  }, [allowedPermissionsKey, allowedPermissions, allowedRolesKey, allowedRolesSet, cachedIsLoggedIn]);

  // Only show loader if we're checking AND don't have cached data
  if (isChecking && !cachedIsLoggedIn) {
    return <PageLoader />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAllowed) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

function App() {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  useAuthCheck();

  // Global magic link redirect handler - redirect to /update-profile if magic link detected
  useEffect(() => {
    const hash = window.location.hash;
    const currentPath = location.pathname;
    
    // Check if we have a magic link hash and we're NOT already on update-profile
    if (hash && hash.includes('access_token') && hash.includes('type=magiclink') && currentPath !== '/update-profile') {
      console.log('🔗 Magic link detected, redirecting to /update-profile');
      console.log('Current path:', currentPath);
      console.log('Hash:', hash);
      
      // Redirect to update-profile with the hash preserved
      window.location.href = '/update-profile' + hash;
    }
  }, [location.pathname]);

  // Session management: Tab/Browser close + 5 min inactivity with warning
  useEffect(() => {
    const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    const WARNING_BEFORE_LOGOUT = 20 * 1000; // 20 seconds before logout
    const SESSION_CHECK_KEY = 'session_check_timestamp';
    const TAB_ID_KEY = 'active_tab_id';
    
    // Generate unique tab ID
    const tabId = `tab_${Date.now()}_${Math.random()}`;
    sessionStorage.setItem(TAB_ID_KEY, tabId);
    
    // Initialize session check timestamp
    const initSession = () => {
      const now = Date.now();
      localStorage.setItem(SESSION_CHECK_KEY, now.toString());
      localStorage.setItem('lastActivity', now.toString());
      localStorage.setItem('activeTabId', tabId);
    };
    
    // Check if session should be cleared (tab/browser was closed)
    const checkSessionValidity = () => {
      const lastCheck = localStorage.getItem(SESSION_CHECK_KEY);
      const lastActivity = localStorage.getItem('lastActivity');
      const activeTabId = localStorage.getItem('activeTabId');
      
      if (!lastCheck || !lastActivity) {
        initSession();
        return true;
      }
      
      const now = Date.now();
      const timeSinceCheck = now - parseInt(lastCheck);
      
      // If more than 10 seconds since last check, tab/browser was closed
      if (timeSinceCheck > 10000) {
        console.log('🚪 Tab/Browser was closed - Clearing session');
        clearSession();
        return false;
      }
      
      return true;
    };
    
    const clearSession = () => {
      // Clear Supabase session
      const authKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || key.includes('supabase')
      );
      authKeys.forEach(key => localStorage.removeItem(key));
      
      // Clear tracking data
      localStorage.removeItem(SESSION_CHECK_KEY);
      localStorage.removeItem('lastActivity');
      localStorage.removeItem('activeTabId');
      localStorage.removeItem('inactivityWarningShown');
      sessionStorage.clear();
    };
    
    // Check session validity on mount
    const isValid = checkSessionValidity();
    if (!isValid) {
      window.location.href = '/login';
      return;
    }
    
    // Show inactivity warning
    const showInactivityWarning = () => {
      const warningShown = localStorage.getItem('inactivityWarningShown');
      if (warningShown === 'true') return; // Already shown
      
      localStorage.setItem('inactivityWarningShown', 'true');
      
      // Show warning toast with countdown
      let countdown = 20;
      const toastId = toast({
        title: "⚠️ Session Expiring Soon",
        description: `You will be logged out in ${countdown} seconds due to inactivity. Move your mouse or click anywhere to stay logged in.`,
        duration: 20000,
        variant: "destructive",
      });
      
      // Update countdown every second
      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);
      
      // Listen for any user activity to cancel warning
      const cancelWarning = () => {
        clearInterval(countdownInterval);
        localStorage.setItem('lastActivity', Date.now().toString());
        localStorage.removeItem('inactivityWarningShown');
        toast({
          title: "✅ Session Extended",
          description: "Your session has been extended.",
        });
        // Remove listeners
        window.removeEventListener('mousemove', cancelWarning);
        window.removeEventListener('keydown', cancelWarning);
        window.removeEventListener('click', cancelWarning);
      };
      
      window.addEventListener('mousemove', cancelWarning, { once: true });
      window.addEventListener('keydown', cancelWarning, { once: true });
      window.addEventListener('click', cancelWarning, { once: true });
    };
    
    // Update session check timestamp every 2 seconds
    const updateInterval = setInterval(() => {
      const now = Date.now();
      localStorage.setItem(SESSION_CHECK_KEY, now.toString());
      localStorage.setItem('activeTabId', tabId);
      
      // Check inactivity
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity) {
        const timeSinceActivity = now - parseInt(lastActivity);
        
        // Show warning 20 seconds before logout
        if (timeSinceActivity > INACTIVITY_TIMEOUT - WARNING_BEFORE_LOGOUT && 
            timeSinceActivity < INACTIVITY_TIMEOUT) {
          showInactivityWarning();
        }
        
        // Logout after 5 minutes
        if (timeSinceActivity > INACTIVITY_TIMEOUT) {
          console.log('⏰ 5 minutes inactivity - Logging out');
          clearSession();
          window.location.href = '/login';
        }
      }
    }, 2000);
    
    // Track user activity
    const updateActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString());
      localStorage.removeItem('inactivityWarningShown'); // Reset warning
    };
    
    // Throttle activity updates (max once per second)
    let activityTimeout: NodeJS.Timeout | null = null;
    const throttledUpdateActivity = () => {
      if (!activityTimeout) {
        updateActivity();
        activityTimeout = setTimeout(() => {
          activityTimeout = null;
        }, 1000);
      }
    };
    
    window.addEventListener('mousemove', throttledUpdateActivity);
    window.addEventListener('keydown', throttledUpdateActivity);
    window.addEventListener('scroll', throttledUpdateActivity);
    window.addEventListener('touchstart', throttledUpdateActivity);
    window.addEventListener('click', throttledUpdateActivity);
    
    // Handle tab close
    const handleBeforeUnload = () => {
      // Stop updating timestamp so next tab open will detect closure
      clearInterval(updateInterval);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(updateInterval);
      if (activityTimeout) clearTimeout(activityTimeout);
      window.removeEventListener('mousemove', throttledUpdateActivity);
      window.removeEventListener('keydown', throttledUpdateActivity);
      window.removeEventListener('scroll', throttledUpdateActivity);
      window.removeEventListener('touchstart', throttledUpdateActivity);
      window.removeEventListener('click', throttledUpdateActivity);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [toast]);

  useEffect(() => {
    let isMounted = true;

    const clearAuthSessionStorage = () => {
      sessionStorage.removeItem("isLoggedIn");
      sessionStorage.removeItem("userType");
      sessionStorage.removeItem("userRole");
      sessionStorage.removeItem("userEmail");
      sessionStorage.removeItem("userId");
      sessionStorage.removeItem("shipping");
      sessionStorage.removeItem("taxper");
      sessionStorage.removeItem("order_pay");
    };

    const syncTrustedAuthState = async () => {
      try {
        // First check if localStorage has any Supabase session
        const hasLocalSession = Object.keys(localStorage).some(key => 
          key.startsWith('sb-') && key.includes('auth-token')
        );
        
        if (!hasLocalSession) {
          // No session in localStorage, clear everything
          clearAuthSessionStorage();
          return;
        }
        
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          clearAuthSessionStorage();
          return;
        }

        const userId = session.user.id;
        const userEmail = session.user.email || "";
        const { data: profile } = await supabase
          .from("profiles")
          .select("type, role, email, freeShipping, taxPercantage, order_pay")
          .eq("id", userId)
          .maybeSingle();

        if (!isMounted) return;

        // sessionStorage is a cache for UI convenience only.
        // Security decisions must rely on Supabase session/profile validation.
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userId", userId);
        sessionStorage.setItem("userEmail", profile?.email || userEmail);
        if (profile?.type) sessionStorage.setItem("userType", String(profile.type));
        if (profile?.role) sessionStorage.setItem("userRole", String(profile.role));
        if (profile?.freeShipping !== undefined && profile?.freeShipping !== null) {
          sessionStorage.setItem("shipping", String(profile.freeShipping));
        }
        if (profile?.taxPercantage !== undefined && profile?.taxPercantage !== null) {
          sessionStorage.setItem("taxper", String(profile.taxPercantage));
        }
        if (profile?.order_pay !== undefined && profile?.order_pay !== null) {
          sessionStorage.setItem("order_pay", String(profile.order_pay));
        }
      } catch (error) {
        clearAuthSessionStorage();
      }
    };

    void syncTrustedAuthState();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void syncTrustedAuthState();
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

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
      {/* <MaintenanceBanner /> */}
      {/* <MaintenanceModal /> */}
      <CartSync />
      <AppRouteSeo />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/products/:slug" element={<ProductDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPasswordNew />} />
          <Route path="/accept-terms" element={<AcceptTerms />} />
          <Route path="/activation" element={<ActivationUser />} />
          <Route path="/update-profile" element={<UserSelfDetails />} />
          <Route path="/launch-password-reset" element={<LaunchPasswordReset />} />
          <Route path="/reset-password-page" element={<ResetPasswordPage />} />
          <Route path="/pay-now" element={<PayNowOrder />} />
          <Route path="/products" element={<Products />} />
          <Route path="/categories/:categorySlug" element={<Products />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/shipping-info" element={<ShippingInfo />} />
          <Route path="/return-policy" element={<ReturnPolicy />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/newsletter" element={<Newsletter />} />
          <Route path="/sitemap" element={<Sitemap />} />
          <Route path="/cart-price" element={<CartItemsPricing />} />
          <Route path="/join-group" element={<JoinGroup />} />
          <Route path="/payment/callback" element={<PaymentCallback />} />
          <Route path="/payment/cancel" element={<PaymentCallback />} />
          <Route path="/payment/launch" element={<PaymentLaunch />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['dashboard']} fallbackPath="/admin/dashboard">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['users']} fallbackPath="/admin/dashboard">
              <AdminUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/products" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['products']} fallbackPath="/admin/dashboard">
              <AdminProducts />
            </ProtectedRoute>
          } />
          <Route path="/admin/categories" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['categories']} fallbackPath="/admin/dashboard">
              <AdminCategoryManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/product/:productId" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['products']} fallbackPath="/admin/dashboard">
              <ProductDetails />
            </ProtectedRoute>
          } />
          <Route path="/admin/inventory" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['inventory']} fallbackPath="/admin/dashboard">
              <AdminInventory />
            </ProtectedRoute>
          } />
          <Route path="/admin/inventory-phase2" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['inventory']} fallbackPath="/admin/dashboard">
              <AdminInventoryPhase2 />
            </ProtectedRoute>
          } />
          <Route path="/admin/expenses" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['expenses']} fallbackPath="/admin/dashboard">
              <Expenses />
            </ProtectedRoute>
          } />
          <Route path="/admin/analytics" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['analytics']} fallbackPath="/admin/dashboard">
              <AdminAnalytics />
            </ProtectedRoute>
          } />
          <Route path="/admin/intelligence" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['intelligence']} fallbackPath="/admin/dashboard">
              <AdminIntelligence />
            </ProtectedRoute>
          } />
          <Route path="/admin/alerts" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['alerts']} fallbackPath="/admin/dashboard">
              <AdminAlerts />
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['reports']} fallbackPath="/admin/dashboard">
              <AdminReports />
            </ProtectedRoute>
          } />
          <Route path="/admin/suppliers" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['suppliers']} fallbackPath="/admin/dashboard">
              <AdminSuppliers />
            </ProtectedRoute>
          } />
          <Route path="/admin/cost-tracking" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['expenses']} fallbackPath="/admin/dashboard">
              <AdminCostTracking />
            </ProtectedRoute>
          } />
          <Route path="/admin/automation" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['automation']} fallbackPath="/admin/dashboard">
              <AdminAutomation />
            </ProtectedRoute>
          } />
          <Route path="/admin/orders" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['orders']} fallbackPath="/admin/dashboard">
              <AdminOrders />
            </ProtectedRoute>
          } />
          <Route path="/admin/orders/create" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['orders']} fallbackPath="/admin/dashboard">
              <AdminCreateOrder />
            </ProtectedRoute>
          } />
          <Route path="/admin/orders/quick" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['orders']} fallbackPath="/admin/dashboard">
              <AdminQuickOrder />
            </ProtectedRoute>
          } />
          <Route path="/admin/access-requests" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['users']} fallbackPath="/admin/dashboard">
              <AccessRequests />
            </ProtectedRoute>
          } />
          <Route path="/admin/orders/edit/:orderId" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['orders']} fallbackPath="/admin/dashboard">
              <AdminCreateOrder />
            </ProtectedRoute>
          } />
          <Route path="/admin/po/edit/:orderId" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['purchase_orders']} fallbackPath="/admin/dashboard">
              <AdminCreateOrder />
            </ProtectedRoute>
          } />
          <Route path="/admin/po/create" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['purchase_orders']} fallbackPath="/admin/dashboard">
              <AdminCreatePurchaseOrder />
            </ProtectedRoute>
          } />
          <Route path="/admin/logs" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['logs']} fallbackPath="/admin/dashboard">
              <AdminLogs />
            </ProtectedRoute>
          } />
          <Route path="/admin/login-logs" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['logs']} fallbackPath="/admin/dashboard">
              <LoginLogsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/po" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['purchase_orders']} fallbackPath="/admin/dashboard">
              <AdminOrders />
            </ProtectedRoute>
          } />
          <Route path="/admin/invoices" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['invoices']} fallbackPath="/admin/dashboard">
              <AdminInvoices />
            </ProtectedRoute>
          } />
          <Route path="/admin/group-pricing" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['special_pricing']} fallbackPath="/admin/dashboard">
              <AdminGroupPricing />
            </ProtectedRoute>
          } />
          <Route path="/admin/groups" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['users']} fallbackPath="/admin/dashboard">
              <AdminGroups />
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['settings']} fallbackPath="/admin/dashboard">
              <AdminSettings />
            </ProtectedRoute>
          } />
          <Route path="/admin/launch-password-reset" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['users']} fallbackPath="/admin/dashboard">
              <AdminLaunchPasswordReset />
            </ProtectedRoute>
          } />
          <Route path="/admin/payment-transactions" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['payments']} fallbackPath="/admin/dashboard">
              <AdminPaymentTransactions />
            </ProtectedRoute>
          } />
          <Route path="/admin/payment-reconciliation" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['payments']} fallbackPath="/admin/dashboard">
              <AdminPaymentReconciliation />
            </ProtectedRoute>
          } />
          <Route path="/admin/banners" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['marketing']} fallbackPath="/admin/dashboard">
              <AdminBanners />
            </ProtectedRoute>
          } />
          <Route path="/admin/offers" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['marketing']} fallbackPath="/admin/dashboard">
              <AdminOffers />
            </ProtectedRoute>
          } />
          <Route path="/admin/blogs" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['marketing']} fallbackPath="/admin/dashboard">
              <AdminBlogs />
            </ProtectedRoute>
          } />
          <Route path="/admin/announcements" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['marketing']} fallbackPath="/admin/dashboard">
              <AdminAnnouncements />
            </ProtectedRoute>
          } />
          <Route path="/admin/email-templates" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['email']} fallbackPath="/admin/dashboard">
              <AdminEmailTemplates />
            </ProtectedRoute>
          } />
          <Route path="/admin/email-campaigns" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['email']} fallbackPath="/admin/dashboard">
              <AdminEmailCampaigns />
            </ProtectedRoute>
          } />
          <Route path="/admin/email-automations" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['email']} fallbackPath="/admin/dashboard">
              <AdminEmailAutomations />
            </ProtectedRoute>
          } />
          <Route path="/admin/email-settings" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['email']} fallbackPath="/admin/dashboard">
              <AdminEmailSettings />
            </ProtectedRoute>
          } />
          <Route path="/admin/abandoned-carts" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['marketing']} fallbackPath="/admin/dashboard">
              <AdminAbandonedCarts />
            </ProtectedRoute>
          } />
          <Route path="/admin/rewards" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['rewards']} fallbackPath="/admin/dashboard">
              <AdminRewards />
            </ProtectedRoute>
          } />
          <Route path="/admin/credit-management" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['credit_management']} fallbackPath="/admin/dashboard">
              <AdminCreditManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/terms-management" element={
            <ProtectedRoute allowedRoles={['admin']} allowedPermissions={['settings']} fallbackPath="/admin/dashboard">
              <AdminTermsManagement />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
