import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Products from "./pages/Products";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminProducts from "./pages/admin/Products";
import AdminInventory from "./pages/admin/Inventory";
import AdminOrders from "./pages/admin/Orders";
import AdminInvoices from "./pages/admin/Invoices";
import PharmacyInvoices from "./pages/pharmacy/Invoices";
import AdminGroupPricing from "./pages/admin/GroupPricing";
import AdminSettings from "./pages/admin/Settings";
import PharmacyDashboard from "./pages/pharmacy/Dashboard";
import PharmacyOrder from "./pages/pharmacy/Order";
import PharmacyOrders from "./pages/pharmacy/Orders";
import PharmacySettings from "./pages/pharmacy/Settings";
import PharmacyProducts from "./pages/pharmacy/Products";
import GroupDashboard from "./pages/group/Dashboard";
import GroupOrder from "./pages/group/Order";
import GroupOrders from "./pages/group/Orders";
import GroupAnalytics from "./pages/group/Analytics";
import GroupReports from "./pages/group/Reports";
import GroupSettings from "./pages/group/Settings";
import GroupLocations from "./pages/group/Locations";
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

    console.log(data,"DATA")
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
      <Route path="/admin/settings" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminSettings />
        </ProtectedRoute>
      } />

      {/* Pharmacy Routes */}
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
      <Route path="/pharmacy/order" element={
        <ProtectedRoute allowedRoles={['pharmacy']}>
          <PharmacyOrder />
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