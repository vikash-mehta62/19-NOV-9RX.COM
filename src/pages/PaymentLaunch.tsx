import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function PaymentLaunch() {
  const navigate = useNavigate();

  useEffect(() => {
    const paymentUrl = sessionStorage.getItem("pending_payment_redirect_url");

    if (!paymentUrl) {
      navigate("/", { replace: true });
      return;
    }

    const redirect = window.setTimeout(() => {
      window.location.replace(paymentUrl);
    }, 50);

    return () => window.clearTimeout(redirect);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-blue-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
        <h1 className="mt-6 text-xl font-semibold text-slate-900">Redirecting to Secure Checkout</h1>
        <p className="mt-2 text-sm text-slate-600">
          Please wait while we open the hosted iPOSPay payment page.
        </p>
      </div>
    </div>
  );
}
